/**
 * v5 claim-extraction pilot runner. LOCAL ONLY: reads question packets from a
 * JSON file, runs extractClaimsV5 per question, and writes versioned
 * artifacts. Never touches Supabase, never merges claims, never links cards.
 *
 * Usage:
 *   node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs \
 *     scripts/run-ob-claim-extraction-pilot.ts --input=packets.json [--out=dir] \
 *     [--limit=N] [--offset=M] [--delay-ms=1500] [--generator-only]
 *
 * Packet file: [{ nativeQuestionId, specialty?, topic?, packet: {
 *   stem, answerChoices: [{key,text}], correctAnswer?, explanationText?,
 *   topicHints?: [] } }]
 *
 * Artifacts in out dir: packets.json, extractions.json, review-packet.md,
 * eval-report.json, eval-report.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import {
  extractClaimsV5,
  flagWithinQuestionDuplicates,
  OB_CLAIMS_ALGORITHM_V5,
  OB_CLAIMS_CRITIC_PROMPT_V5,
  OB_CLAIMS_GENERATOR_PROMPT_V5,
  OB_CLAIMS_QREVIEW_PROMPT_V5,
  OB_CLAIMS_V5_MAX_GENERATED,
  OB_CLAIMS_V5_SOFT_SET_CAP,
  type ObExtractionResultV5,
  type ObSourcePacketV5,
} from '../src/lib/brobot/orthobullets/claim-extractor-v5';

type PacketRow = {
  nativeQuestionId: string;
  specialty?: string;
  topic?: string;
  packet: ObSourcePacketV5;
};

function parseArgs(values: string[]): Map<string, string> {
  const args = new Map<string, string>();
  for (const value of values) {
    if (!value.startsWith('--')) continue;
    const at = value.indexOf('=');
    args.set(at < 0 ? value : value.slice(0, at), at < 0 ? 'true' : value.slice(at + 1));
  }
  return args;
}

function loadEnv(file: string): Record<string, string> {
  const values: Record<string, string> = {};
  if (!existsSync(file)) return values;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#') || !clean.includes('=')) continue;
    const at = clean.indexOf('=');
    values[clean.slice(0, at).trim()] = clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return values;
}

function validPacket(row: unknown): row is PacketRow {
  if (!row || typeof row !== 'object') return false;
  const candidate = row as Record<string, unknown>;
  const packet = candidate.packet as Record<string, unknown> | undefined;
  if (typeof candidate.nativeQuestionId !== 'string' || !packet) return false;
  if (typeof packet.stem !== 'string' || !packet.stem.trim()) return false;
  if (!Array.isArray(packet.answerChoices) || packet.answerChoices.length < 2) return false;
  return packet.answerChoices.every(
    (choice) => !!choice && typeof choice === 'object'
      && typeof (choice as Record<string, unknown>).key === 'string'
      && typeof (choice as Record<string, unknown>).text === 'string',
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function mdEscape(value: string): string {
  return value.replace(/\r/g, '');
}

function buildReviewPacket(rows: PacketRow[], results: Map<string, ObExtractionResultV5>): string {
  const lines: string[] = [
    `# v5 Claim Extraction Review Packet`,
    ``,
    `Algorithm: ${OB_CLAIMS_ALGORITHM_V5} | Generator prompt: ${OB_CLAIMS_GENERATOR_PROMPT_V5} | Critic prompt: ${OB_CLAIMS_CRITIC_PROMPT_V5} | QReview prompt: ${OB_CLAIMS_QREVIEW_PROMPT_V5}`,
    `Generated: ${new Date().toISOString()} | Questions: ${rows.length}`,
    ``,
    `---`,
  ];
  rows.forEach((row, ordinal) => {
    const result = results.get(row.nativeQuestionId);
    lines.push(``, `## Q${ordinal + 1} — ${row.nativeQuestionId}${row.specialty ? ` — ${row.specialty}` : ''}${row.topic ? ` / ${row.topic}` : ''}`);
    lines.push(``);
    lines.push(`**STEM:** ${mdEscape(row.packet.stem)}`);
    lines.push(``);
    lines.push(`**CHOICES:**`);
    for (const choice of row.packet.answerChoices) {
      const correct = row.packet.correctAnswer
        && choice.text.trim().toLowerCase() === row.packet.correctAnswer.trim().toLowerCase();
      lines.push(`- ${choice.key}. ${mdEscape(choice.text)}${correct ? ' ✅' : ''}`);
    }
    lines.push(``);
    lines.push(`**CORRECT ANSWER:** ${mdEscape(row.packet.correctAnswer ?? '(unknown)')}`);
    lines.push(``);
    lines.push(`**EXPLANATION:** ${mdEscape(row.packet.explanationText ?? '(none provided)')}`);
    if (row.packet.topicHints.length) {
      lines.push(``);
      lines.push(`**TOPIC HINTS:** ${row.packet.topicHints.map(mdEscape).join(' | ')}`);
    }
    lines.push(``);
    if (!result || result.error) {
      lines.push(`**EXTRACTION ERROR:** ${result?.error ?? 'no result'}`);
      lines.push(``, `---`);
      return;
    }
    lines.push(`**EXTRACTION:** drafts=${result.drafts.length} final=${result.claims.length} negative_framing=${result.negativeFraming} models=${result.models.generator}/${result.models.critic}/${result.models.questionReview}`);
    const primaries = result.claims.filter((claim) => claim.importance === 'primary');
    const secondaries = result.claims.filter((claim) => claim.importance === 'secondary');
    lines.push(``);
    lines.push(`**PRIMARY CLAIMS (${primaries.length}):**`);
    primaries.forEach((claim, index) => {
      lines.push(`P${index + 1}. ${mdEscape(claim.text)}`);
      lines.push(`    type=${claim.claimType} support=${claim.provenance.supportedBy.join('+')} critic=${claim.provenance.criticAction} gen_conf=${claim.confidence.toFixed(2)}${claim.provenance.autoFlags.length ? ` FLAGS=${claim.provenance.autoFlags.join(',')}` : ''}`);
      lines.push(`    critic_note: ${mdEscape(claim.provenance.criticReason)}`);
    });
    if (!primaries.length) lines.push(`(none)`);
    lines.push(``);
    lines.push(`**SECONDARY CLAIMS (${secondaries.length}):**`);
    secondaries.forEach((claim, index) => {
      lines.push(`S${index + 1}. ${mdEscape(claim.text)}`);
      lines.push(`    type=${claim.claimType} support=${claim.provenance.supportedBy.join('+')} critic=${claim.provenance.criticAction} gen_conf=${claim.confidence.toFixed(2)}${claim.provenance.autoFlags.length ? ` FLAGS=${claim.provenance.autoFlags.join(',')}` : ''}`);
      lines.push(`    critic_note: ${mdEscape(claim.provenance.criticReason)}`);
    });
    if (!secondaries.length) lines.push(`(none)`);
    lines.push(``);
    lines.push(`**CRITIC OPS:** ${result.criticDecisions.map((decision) => `#${decision.claimIndex}:${decision.action}${decision.importanceOverride !== 'keep' ? `=>${decision.importanceOverride}` : ''}`).join(' ') || '(none — zero drafts or generator-only)'}`);
    if (result.criticErrors.length) lines.push(`**CRITIC ERRORS:** ${result.criticErrors.join('; ')}`);
    if (result.questionReview) {
      lines.push(`**QREVIEW:** drops=[${result.questionReview.dropIndices.join(',')}] importance=${result.questionReview.importanceChanges.map((change) => `#${change.index}=>${change.importance}`).join(' ') || 'none'} over_extraction=${result.questionReview.overExtraction} secondary_overproduction=${result.questionReview.secondaryOverproduction}`);
      if (result.questionReview.missingConcepts.length) {
        lines.push(`**QREVIEW MISSING:** ${result.questionReview.missingConcepts.map(mdEscape).join(' | ')}`);
      }
      lines.push(`**QREVIEW NOTES:** ${mdEscape(result.questionReview.notes)}`);
    } else if (result.questionReviewError) {
      lines.push(`**QREVIEW ERROR:** ${result.questionReviewError}`);
    }
    lines.push(``, `---`);
  });
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.get('--input');
  if (!inputPath) throw new Error('missing --input=packets.json');
  const limit = Number(args.get('--limit') ?? '0');
  const offset = Number(args.get('--offset') ?? '0');
  const delayMs = Number(args.get('--delay-ms') ?? '1500');
  const generatorOnly = args.get('--generator-only') === 'true';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = args.get('--out') ?? path.join('tmp', 'ob-claims-v5-pilot', stamp);

  const env = { ...loadEnv(path.resolve('.env.local')), ...process.env };
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured (.env.local or env)');
  const strong = env.BROBOT_STRONG_MODEL?.trim() || 'gpt-4o';
  const generatorModel = env.BROBOT_OB_CLAIMS_GENERATOR_MODEL?.trim() || strong;
  const criticModel = env.BROBOT_OB_CLAIMS_CRITIC_MODEL?.trim() || strong;
  const reviewModel = env.BROBOT_OB_CLAIMS_REVIEW_MODEL?.trim() || strong;
  const client = new OpenAI({ apiKey });

  const raw = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown;
  if (!Array.isArray(raw)) throw new Error('packet file must be a JSON array');
  const invalid = raw.findIndex((row) => !validPacket(row));
  if (invalid >= 0) throw new Error(`invalid packet at index ${invalid}`);
  const sliced = (raw as PacketRow[]).slice(offset, limit > 0 ? offset + limit : undefined);
  if (!sliced.length) throw new Error('no packets selected');

  mkdirSync(outDir, { recursive: true });
  const results = new Map<string, ObExtractionResultV5>();
  let processed = 0;
  for (const row of sliced) {
    processed += 1;
    if (processed > 1 && delayMs > 0) await sleep(delayMs);
    const started = Date.now();
    const result = await extractClaimsV5(row.packet, row.nativeQuestionId, {
      client: client as never,
      generatorModel,
      criticModel,
      reviewModel,
      generatorOnly,
    });
    results.set(row.nativeQuestionId, result);
    console.log(JSON.stringify({
      progress: `${processed}/${sliced.length}`,
      qid: row.nativeQuestionId,
      error: result.error,
      drafts: result.drafts.length,
      claims: result.claims.length,
      primary: result.claims.filter((claim) => claim.importance === 'primary').length,
      secondary: result.claims.filter((claim) => claim.importance === 'secondary').length,
      ms: Date.now() - started,
    }));
  }

  // --- eval aggregation ---
  const list = sliced.map((row) => results.get(row.nativeQuestionId)!);
  const dist: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5+': 0 };
  const errorCounts: Record<string, number> = {};
  const criticOps: Record<string, number> = { accept: 0, rewrite: 0, remove: 0, split: 0, merge: 0 };
  const autoFlagCounts: Record<string, number> = {};
  let primaryTotal = 0;
  let secondaryTotal = 0;
  let qreviewDrops = 0;
  let qreviewImportanceChanges = 0;
  let qreviewMissing = 0;
  let qreviewOverExtraction = 0;
  let qreviewSecondaryOver = 0;
  let capHits = 0;
  let softCapHits = 0;
  let dupePairs = 0;
  let modelCalls = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  for (const result of list) {
    const count = result.claims.length;
    dist[count >= 5 ? '5+' : String(count)] += 1;
    if (result.error) errorCounts[result.error] = (errorCounts[result.error] ?? 0) + 1;
    if (result.questionReviewError) {
      errorCounts[result.questionReviewError] = (errorCounts[result.questionReviewError] ?? 0) + 1;
    }
    for (const decision of result.criticDecisions) criticOps[decision.action] += 1;
    for (const claim of result.claims) {
      if (claim.importance === 'primary') primaryTotal += 1;
      else secondaryTotal += 1;
      for (const flag of claim.provenance.autoFlags) autoFlagCounts[flag] = (autoFlagCounts[flag] ?? 0) + 1;
    }
    if (result.drafts.length >= OB_CLAIMS_V5_MAX_GENERATED) capHits += 1;
    if (result.claims.length > OB_CLAIMS_V5_SOFT_SET_CAP) softCapHits += 1;
    dupePairs += flagWithinQuestionDuplicates(result.claims.map((claim) => claim.text)).length;
    if (result.questionReview) {
      qreviewDrops += result.questionReview.dropIndices.length;
      qreviewImportanceChanges += result.questionReview.importanceChanges.length;
      qreviewMissing += result.questionReview.missingConcepts.length;
      if (result.questionReview.overExtraction) qreviewOverExtraction += 1;
      if (result.questionReview.secondaryOverproduction) qreviewSecondaryOver += 1;
    }
    modelCalls += result.usage.modelCalls;
    promptTokens += result.usage.promptTokens;
    completionTokens += result.usage.completionTokens;
  }
  const ok = list.filter((result) => !result.error).length;
  const report = {
    algorithmVersion: OB_CLAIMS_ALGORITHM_V5,
    promptVersions: {
      generator: OB_CLAIMS_GENERATOR_PROMPT_V5,
      critic: OB_CLAIMS_CRITIC_PROMPT_V5,
      questionReview: OB_CLAIMS_QREVIEW_PROMPT_V5,
    },
    models: { generatorModel, criticModel, reviewModel },
    generatedAt: new Date().toISOString(),
    input: path.resolve(inputPath),
    generatorOnly,
    questionsProcessed: list.length,
    questionsOk: ok,
    questionsErrored: list.length - ok,
    claimsDistribution: dist,
    primaryPerQuestion: ok ? Number((primaryTotal / ok).toFixed(2)) : 0,
    secondaryPerQuestion: ok ? Number((secondaryTotal / ok).toFixed(2)) : 0,
    claimsTotal: primaryTotal + secondaryTotal,
    criticOps,
    criticErrors: list.flatMap((result) => result.criticErrors).length,
    qreviewDrops,
    qreviewImportanceChanges,
    qreviewMissingConcepts: qreviewMissing,
    qreviewOverExtraction: qreviewOverExtraction,
    qreviewSecondaryOverproduction: qreviewSecondaryOver,
    generatorCapHits: capHits,
    softSetCapHits: softCapHits,
    withinQuestionDupePairs: dupePairs,
    autoFlags: autoFlagCounts,
    errors: errorCounts,
    usage: { modelCalls, promptTokens, completionTokens },
  };

  writeFileSync(path.join(outDir, 'packets.json'), `${JSON.stringify(sliced, null, 2)}\n`);
  writeFileSync(path.join(outDir, 'extractions.json'), `${JSON.stringify(list, null, 2)}\n`);
  writeFileSync(path.join(outDir, 'review-packet.md'), buildReviewPacket(sliced, results));
  writeFileSync(path.join(outDir, 'eval-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  const pct = (count: number) => (ok ? `${((count / ok) * 100).toFixed(1)}%` : 'n/a');
  writeFileSync(path.join(outDir, 'eval-report.md'), [
    `# v5 Pilot Eval Report`,
    ``,
    `Algorithm: ${OB_CLAIMS_ALGORITHM_V5} | Generated: ${report.generatedAt}`,
    `Models: generator=${generatorModel} critic=${criticModel} review=${reviewModel}${generatorOnly ? ' (GENERATOR-ONLY ablation)' : ''}`,
    ``,
    `## Volume`,
    ``,
    `- questions processed: ${list.length} (ok=${ok}, errored=${list.length - ok})`,
    `- claims total: ${report.claimsTotal} (primary=${primaryTotal}, secondary=${secondaryTotal})`,
    `- primary/question: ${report.primaryPerQuestion}, secondary/question: ${report.secondaryPerQuestion}`,
    ``,
    `## Claims distribution (ok questions)`,
    ``,
    ...Object.entries(dist).map(([bucket, count]) => `- ${bucket} claims: ${count} (${pct(count)})`),
    ``,
    `## Critic activity`,
    ``,
    ...Object.entries(criticOps).map(([op, count]) => `- ${op}: ${count}`),
    `- critic application errors: ${report.criticErrors}`,
    ``,
    `## Question-review activity`,
    ``,
    `- drops: ${qreviewDrops}, importance changes: ${qreviewImportanceChanges}, missing concepts noted: ${qreviewMissing}`,
    `- over_extraction flags: ${qreviewOverExtraction}, secondary_overproduction flags: ${qreviewSecondaryOver}`,
    ``,
    `## Tripwires`,
    ``,
    `- generator cap hits (8 drafts): ${capHits}`,
    `- soft set-cap hits (>5 final): ${softCapHits}`,
    `- near-verbatim dupe pairs surviving (paraphrase dupes are the critic's job): ${dupePairs}`,
    `- auto flags: ${Object.entries(autoFlagCounts).map(([flag, count]) => `${flag}=${count}`).join(', ') || 'none'}`,
    `- errors: ${Object.entries(errorCounts).map(([code, count]) => `${code}=${count}`).join(', ') || 'none'}`,
    ``,
    `## Usage`,
    ``,
    `- model calls: ${modelCalls}, prompt tokens: ${promptTokens}, completion tokens: ${completionTokens}`,
    ``,
  ].join('\n'));

  console.log(JSON.stringify({ artifacts: outDir, ...report }));
}

main().catch((error) => {
  console.error(JSON.stringify({ fatal: error instanceof Error ? error.message : 'unknown' }));
  process.exit(1);
});
