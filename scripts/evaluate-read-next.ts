import fs from 'node:fs';
import path from 'node:path';

import {
  buildConversationHistory,
  evaluateHistoricalReadNextRow,
  type HistoricalReadNextRow,
  type ReadNextCaseResult,
  type ReviewCase,
} from './lib/read-next-evaluation';

const DEFAULT_INPUT = path.join(process.cwd(), 'reports', 'brobot-conversation-quality-audit', 'scored-turns.json');
const DEFAULT_OUTPUT = path.join(process.cwd(), 'reports', 'read-next-evaluation', 'historical-v1');

function option(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 1000) / 1000 : 0;
}

function aggregate(results: ReadNextCaseResult[]) {
  const winners = { current: 0, v2: 0, tie: 0 };
  const rejections: Record<string, number> = {};
  const byMode: Record<string, { cases: number; current: number; v2: number; tie: number }> = {};
  for (const result of results) {
    winners[result.winner] += 1;
    byMode[result.mode] ??= { cases: 0, current: 0, v2: 0, tie: 0 };
    byMode[result.mode].cases += 1;
    byMode[result.mode][result.winner] += 1;
    for (const [code, count] of Object.entries(result.rejectionCounts)) rejections[code] = (rejections[code] ?? 0) + (count ?? 0);
  }
  const currentEligible = results.filter((result) => result.winner !== 'tie').length;
  return {
    schemaVersion: 1,
    evaluatorVersion: 'historical_read_next_v1',
    sourceCompleteness: 'displayed_set_only',
    cases: results.length,
    winners,
    v2NonTieWinRate: currentEligible ? Math.round(winners.v2 / currentEligible * 1000) / 1000 : 0,
    currentAverageComposite: average(results.map((result) => result.original.composite)),
    v2AverageComposite: average(results.map((result) => result.v2.composite)),
    currentDuplicatePairs: results.reduce((sum, result) => sum + result.original.duplicatePairs, 0),
    v2DuplicatePairs: results.reduce((sum, result) => sum + result.v2.duplicatePairs, 0),
    currentRepeatedOrAnswered: results.reduce((sum, result) => sum + result.original.repeatsLatestRequest + result.original.alreadyAnswered, 0),
    v2RepeatedOrAnswered: results.reduce((sum, result) => sum + result.v2.repeatsLatestRequest + result.v2.alreadyAnswered, 0),
    emptyV2Sets: results.filter((result) => result.originalCount > 0 && result.selectedCount === 0).length,
    unstableCases: results.filter((result) => !result.stableAcrossInputOrder).length,
    urgentCases: results.filter((result) => result.warningCodes.includes('urgent_context')).length,
    patientSpecificCases: results.filter((result) => result.warningCodes.includes('patient_specific_context')).length,
    rejections,
    byMode,
    limitations: [
      'The historical corpus contains displayed recommendation sets, not the complete generated candidate pool.',
      'This deterministic evaluation measures filtering and ranking only; it does not measure candidate-generation recall.',
      'The winner heuristic is a triage signal and requires blinded clinician review before production promotion.',
    ],
    productionReads: 0,
    productionWrites: 0,
  };
}

function markdown(summary: ReturnType<typeof aggregate>): string {
  const modes = Object.entries(summary.byMode).map(([mode, value]) => `| ${mode} | ${value.cases} | ${value.v2} | ${value.tie} | ${value.current} |`).join('\n');
  return `# Historical Read Next Evaluation\n\n` +
    `- Cases: ${summary.cases}\n- V2/current/tie: ${summary.winners.v2}/${summary.winners.current}/${summary.winners.tie}\n` +
    `- V2 non-tie win rate: ${(summary.v2NonTieWinRate * 100).toFixed(1)}%\n` +
    `- Composite score, current → v2: ${summary.currentAverageComposite} → ${summary.v2AverageComposite}\n` +
    `- Duplicate pairs, current → v2: ${summary.currentDuplicatePairs} → ${summary.v2DuplicatePairs}\n` +
    `- Repeated/already-answered, current → v2: ${summary.currentRepeatedOrAnswered} → ${summary.v2RepeatedOrAnswered}\n` +
    `- Empty v2 sets: ${summary.emptyV2Sets}\n- Unstable cases: ${summary.unstableCases}\n` +
    `- Production reads/writes: 0/0\n\n## Results by mode\n\n| Mode | Cases | V2 wins | Ties | Current wins |\n|---|---:|---:|---:|---:|\n${modes}\n\n` +
    `## Limitations\n\n${summary.limitations.map((item) => `- ${item}`).join('\n')}\n`;
}

function main() {
  const input = path.resolve(option('input') ?? DEFAULT_INPUT);
  const output = path.resolve(option('output') ?? DEFAULT_OUTPUT);
  const limit = Number(option('limit') ?? 0);
  if (!fs.existsSync(input)) throw new Error(`Historical input not found: ${input}`);
  const rows = JSON.parse(fs.readFileSync(input, 'utf8')) as HistoricalReadNextRow[];
  const history = buildConversationHistory(rows);
  const eligible = (limit > 0 ? rows.slice(0, limit) : rows)
    .map((row) => evaluateHistoricalReadNextRow({ row, history: history.get(row.auditId) ?? [] }))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  const results = eligible.map((value) => value.result);
  const reviewCases = eligible
    .filter((value, index) => value.result.winner === 'current' || value.result.warningCodes.length > 0 || index % 10 === 0)
    .map((value) => value.review);
  const blindedReviewCases = reviewCases.map(({ assignmentKey: _assignmentKey, deterministicWinner: _winner, warningCodes: _warnings, ...reviewCase }) => reviewCase);
  const reviewKey = reviewCases.map((reviewCase) => ({
    caseId: reviewCase.caseId,
    assignmentKey: reviewCase.assignmentKey,
    deterministicWinner: reviewCase.deterministicWinner,
    warningCodes: reviewCase.warningCodes,
  }));
  const summary = aggregate(results);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(output, 'case-results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(output, 'review-packet.json'), JSON.stringify({ schemaVersion: 1, blinded: true, cases: blindedReviewCases }, null, 2));
  fs.writeFileSync(path.join(output, 'review-key.json'), JSON.stringify({ schemaVersion: 1, keepSeparateFromReviewers: true, cases: reviewKey }, null, 2));
  fs.writeFileSync(path.join(output, 'aggregate.md'), markdown(summary));
  console.log(JSON.stringify({ input, output, ...summary, reviewCases: reviewCases.length }, null, 2));
}

main();
