import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Structural validation for the regression suite (no network, no model calls).
// Live evaluation runs via scripts/eval-ob-claims-regression.ts with a
// curator OB session + OpenAI key.

const root = path.dirname(fileURLToPath(import.meta.url));
const suite = JSON.parse(readFileSync(path.join(root, 'claim-extraction-regression-v5.json'), 'utf8')) as {
  schemaVersion: string;
  cases: Array<Record<string, unknown>>;
};

assert.equal(suite.schemaVersion, 'ob-claims-regression-v1');
assert.ok(Array.isArray(suite.cases) && suite.cases.length >= 5, 'regression suite must keep >=5 cases');

const qids = new Set<string>();
for (const testCase of suite.cases) {
  assert.equal(typeof testCase.qid, 'string');
  assert.ok(!qids.has(testCase.qid as string), `duplicate qid ${testCase.qid}`);
  qids.add(testCase.qid as string);
  assert.equal(typeof testCase.specialty, 'string');
  assert.equal(typeof testCase.notes, 'string');
  assert.ok(Array.isArray(testCase.traps) && (testCase.traps as unknown[]).length > 0, `${testCase.qid} needs traps`);
  assert.ok(Array.isArray(testCase.expectedConcepts), `${testCase.qid} needs expectedConcepts array`);
  for (const concept of testCase.expectedConcepts as Array<Record<string, unknown>>) {
    assert.ok(Array.isArray(concept.all) && (concept.all as unknown[]).length > 0, `${testCase.qid} concept needs keywords`);
    assert.ok(
      concept.importance === undefined || concept.importance === 'primary' || concept.importance === 'secondary',
      `${testCase.qid} bad importance`,
    );
  }
  assert.ok(Array.isArray(testCase.forbiddenPatterns), `${testCase.qid} needs forbiddenPatterns array`);
  for (const pattern of testCase.forbiddenPatterns as string[]) {
    assert.doesNotThrow(() => new RegExp(pattern, 'i'), `${testCase.qid} bad regex ${pattern}`);
  }
  // No OB source text may live in the repo: cases carry qids + expectations only.
  const serialized = JSON.stringify(testCase);
  assert.ok(!/explanationText|answerChoices/.test(serialized), `${testCase.qid} must not embed packet content`);
}

console.log('claim-extraction-regression-v5.test.ts: all assertions passed');
