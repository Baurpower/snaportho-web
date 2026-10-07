// Fail-closed viability gate over one or more dry-run report.json artifacts.
// Usage: node scripts/evaluate-ob-model-viability.mjs --reports=a/report.json,b/report.json
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function scoreObViabilityReport(report, thresholds) {
  const questions = Number(report.questions ?? 0);
  const outcomes = report.outcomes ?? {};
  // Dry runs record would_* outcomes and write nothing. Apply runs record the terminal names.
  const accepted = Number(outcomes.accepted ?? 0) + Number(outcomes.adopted ?? 0) + Number(outcomes.would_accept ?? 0);
  const failed = Object.entries(outcomes).filter(([key]) => key === 'failed' || key.startsWith('failed_'))
    .reduce((sum, [, value]) => sum + Number(value), 0);
  const unresolved = Number(outcomes.ai_review_unresolved ?? 0) + Number(outcomes.identity_unresolved ?? 0)
    + Number(outcomes.identity_conflict ?? 0) + Number(outcomes.would_unresolved ?? 0)
    + Number(outcomes.would_identity_unresolved ?? 0) + Number(outcomes.would_identity_conflict ?? 0);
  const cost = Number(report.usage?.estimatedCostUsd ?? report.estimatedCostUsd ?? 0);
  const safeRate = (value) => questions > 0 ? value / questions : 0;
  const metrics = {
    questions, accepted, failed, unresolved, acceptedRate: safeRate(accepted),
    failedRate: safeRate(failed), unresolvedRate: safeRate(unresolved), costUsd: cost,
    costPerQuestionUsd: questions > 0 ? cost / questions : null,
  };
  const failures = [];
  if (questions < thresholds.minQuestions) failures.push(`questions:${questions}<${thresholds.minQuestions}`);
  if (metrics.acceptedRate < thresholds.minAcceptedRate) failures.push(`accepted_rate:${metrics.acceptedRate}`);
  if (metrics.failedRate > thresholds.maxFailedRate) failures.push(`failed_rate:${metrics.failedRate}`);
  if (metrics.unresolvedRate > thresholds.maxUnresolvedRate) failures.push(`unresolved_rate:${metrics.unresolvedRate}`);
  if (metrics.costPerQuestionUsd !== null && metrics.costPerQuestionUsd > thresholds.maxCostPerQuestionUsd) {
    failures.push(`cost_per_question:${metrics.costPerQuestionUsd}`);
  }
  if (thresholds.remainingQuestions > 0 && metrics.costPerQuestionUsd !== null) {
    const projected = metrics.costPerQuestionUsd * thresholds.remainingQuestions;
    metrics.projectedRemainingCostUsd = projected;
    if (projected > thresholds.maxRemainingCostUsd) {
      failures.push(`projected_remaining_cost:${projected}`);
    }
  }
  return { model: report.models ?? null, pass: failures.length === 0, failures, metrics };
}

function main() {
  const args = new Map();
  for (const value of process.argv.slice(2)) {
    if (!value.startsWith('--')) continue;
    const at = value.indexOf('=');
    args.set(at < 0 ? value.slice(2) : value.slice(2, at), at < 0 ? 'true' : value.slice(at + 1));
  }
  const paths = (args.get('reports') ?? '').split(',').filter(Boolean);
  if (!paths.length) throw new Error('missing --reports=report.json[,report.json]');
  const thresholds = {
    minQuestions: Number(args.get('min-questions') ?? '50'),
    minAcceptedRate: Number(args.get('min-accepted-rate') ?? '0.70'),
    maxFailedRate: Number(args.get('max-failed-rate') ?? '0.05'),
    maxUnresolvedRate: Number(args.get('max-unresolved-rate') ?? '0.25'),
    maxCostPerQuestionUsd: Number(args.get('max-cost-per-question') ?? '0.02'),
    remainingQuestions: Number(args.get('remaining-questions') ?? '0'),
    maxRemainingCostUsd: Number(args.get('max-remaining-cost') ?? '10'),
  };
  if (!Number.isInteger(thresholds.minQuestions) || thresholds.minQuestions < 1
    || Object.entries(thresholds).slice(1).some(([, value]) => !Number.isFinite(value) || value < 0)) {
    throw new Error('invalid viability threshold');
  }
  const evaluated = paths.map((reportPath) => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    return { reportPath, ...scoreObViabilityReport(report, thresholds) };
  });
  const result = { generatedAt: new Date().toISOString(), thresholds, pass: evaluated.every((row) => row.pass), evaluated };
  const out = args.get('out');
  if (out) writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify(result));
  if (!result.pass) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
