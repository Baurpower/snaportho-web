import assert from 'node:assert/strict';
import { scoreObViabilityReport } from './evaluate-ob-model-viability.mjs';

const thresholds = {
  minQuestions: 50,
  minAcceptedRate: 0.70,
  maxFailedRate: 0.05,
  maxUnresolvedRate: 0.25,
  maxCostPerQuestionUsd: 0.02,
};

function dryRun(accepted, unresolved, costUsd = 0.5) {
  return { questions: 50, outcomes: { would_accept: accepted, would_unresolved: unresolved }, estimatedCostUsd: costUsd };
}

const muse = scoreObViabilityReport(dryRun(35, 15, 0.9616), thresholds);
assert.equal(muse.metrics.accepted, 35);
assert.equal(muse.metrics.unresolved, 15);
assert.equal(muse.metrics.unresolvedRate, 0.3);
assert.equal(muse.pass, false);
assert.deepEqual(muse.failures, ['unresolved_rate:0.3']);

const clear = scoreObViabilityReport(dryRun(38, 12, 0.5), thresholds);
assert.equal(clear.metrics.accepted, 38);
assert.equal(clear.metrics.unresolved, 12);
assert.equal(clear.pass, true);
assert.deepEqual(clear.failures, []);

const ignoredDryRunNames = scoreObViabilityReport({
  questions: 50,
  outcomes: { accepted: 0, unresolved: 0 },
  estimatedCostUsd: 0.5,
}, thresholds);
assert.equal(ignoredDryRunNames.metrics.accepted, 0);
assert.equal(ignoredDryRunNames.pass, false);

console.log('evaluate-ob-model-viability.test.mjs: all assertions passed');
