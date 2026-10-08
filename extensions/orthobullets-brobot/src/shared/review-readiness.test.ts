import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parseHTML } = require('linkedom');

import {
  extractOrthobulletsPageContext,
  extractOrthobulletsTestResultsContext,
} from '../content/extractor.js';
import {
  classifyReviewReadiness,
  detectAuthFailureKind,
  missingReviewFields,
  reviewReadinessFingerprint,
  reviewTimeoutDiagnostics,
} from './review-readiness.js';

const FIXTURES_DIR = path.join(process.cwd(), 'extensions/orthobullets-brobot/fixtures');
const load = (name: string) => parseHTML(readFileSync(path.join(FIXTURES_DIR, name), 'utf8')).document;
const COMPLETE_URL = 'https://www.orthobullets.com/testview?qid=210141&ans=5&test=OBQ17';

// 1. Results rows preserve the exact review URL (qid + ans + test).
const results = extractOrthobulletsTestResultsContext({
  document: load('synthetic-review-readiness-results.html'),
  pageUrl: 'https://www.orthobullets.com/qbank/testscore?test=OBQ17',
});
assert.equal(results.testReview?.rows.length, 2);
assert.equal(
  results.testReview?.rows[0].reviewUrl,
  'https://www.orthobullets.com/testview?qid=210141&ans=5&test=OBQ17',
);
assert.ok(results.testReview?.rows[0].reviewUrl.includes('qid=210141'));
assert.ok(results.testReview?.rows[0].reviewUrl.includes('ans=5'));
assert.ok(results.testReview?.rows[0].reviewUrl.includes('test=OBQ17'));

// 2. Review DOM immediately after load is still rendering, not failed.
const immediate = extractOrthobulletsPageContext({
  document: load('synthetic-review-immediate-partial.html'),
  pageUrl: COMPLETE_URL,
});
assert.equal(immediate.pageKind, 'review');
assert.equal(immediate.questionId, '210141');
assert.equal(immediate.reviewState, 'loading');
assert.ok((immediate.reviewDiagnostics?.missingFields ?? []).includes('explanationText'));
assert.equal(immediate.reviewDiagnostics?.errorCode, null);

// 3. Review DOM after asynchronous rendering is ready (even when the
// learner's answer was incorrect: selected 5, correct 3).
const complete = extractOrthobulletsPageContext({
  document: load('synthetic-review-async-complete.html'),
  pageUrl: COMPLETE_URL,
});
assert.equal(complete.pageKind, 'review');
assert.equal(complete.questionId, '210141');
assert.equal(complete.selectedAnswerKey, '5');
assert.equal(complete.correctAnswerKey, '3');
assert.ok((complete.explanationText ?? '').length > 20);
assert.equal(complete.answerChoices.length, 5);
assert.equal(complete.reviewState, 'ready');
assert.deepEqual(complete.reviewDiagnostics?.missingFields, []);
assert.equal(complete.reviewDiagnostics?.errorCode, null);

// 3b. Revealed review WITHOUT the learner's selection (bare search-sourced
// URL, or a question never attempted) is ready: the claim pipeline never
// consumes the selection, and completion is proven by correct + explanation.
const noSelectionDocument = load('synthetic-review-async-complete.html');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
for (const row of Array.from(noSelectionDocument.querySelectorAll('.answerRow') as any[])) {
  const className = row.getAttribute('class') ?? '';
  row.setAttribute('class', className.replace(/\bselected\b/g, '').replace(/\s+/g, ' ').trim());
}
const noSelection = extractOrthobulletsPageContext({
  document: noSelectionDocument,
  pageUrl: 'https://www.orthobullets.com/testview?qid=210141',
});
assert.equal(noSelection.selectedAnswerKey, undefined);
assert.equal(noSelection.reviewState, 'ready');
assert.deepEqual(noSelection.reviewDiagnostics?.missingFields, []);
assert.ok(noSelection.extractionWarnings.includes('selected_answer_not_visible'));

// 4. "Select Answer" unresolved state fails safely with instructions.
const unrevealed = extractOrthobulletsPageContext({
  document: load('synthetic-review-unrevealed.html'),
  pageUrl: COMPLETE_URL,
});
assert.equal(unrevealed.reviewState, 'answer_reveal_required');
assert.equal(unrevealed.reviewDiagnostics?.errorCode, 'orthobullets_review_not_revealed');
assert.ok(unrevealed.extractionWarnings.includes('orthobullets_review_not_revealed'));
assert.match(unrevealed.reviewDiagnostics?.detail ?? '', /test-results page/);
assert.equal(unrevealed.explanationText, undefined);

// 5. Logged-out pages report authentication trouble, not selector trouble.
const loggedOut = extractOrthobulletsPageContext({
  document: load('synthetic-review-logged-out.html'),
  pageUrl: COMPLETE_URL,
});
assert.equal(loggedOut.reviewState, 'not_authenticated');
assert.equal(loggedOut.reviewDiagnostics?.errorCode, 'orthobullets_login_required');
assert.ok(loggedOut.extractionWarnings.includes('orthobullets_login_required'));

for (const [marker, kind] of [
  ['Please sign in to continue reviewing', 'logged_out_nav'],
  ['Access denied for this review', 'access_denied'],
  ['PEAK Premium Subscribers only', 'subscription_wall'],
] as const) {
  const { document } = parseHTML(`<!doctype html><html><body><p>${marker}</p></body></html>`);
  assert.equal(detectAuthFailureKind(document), kind);
}

// 6. Expected/extracted question mismatch is explicit.
const mismatch = classifyReviewReadiness(complete, { expectedQuestionId: '9999' });
assert.equal(mismatch.state, 'not_completed');
assert.equal(mismatch.errorCode, 'orthobullets_question_mismatch');
assert.deepEqual(mismatch.missingFields, ['questionId:match']);
assert.equal(mismatch.expectedQuestionId, '9999');
assert.equal(mismatch.extractedQuestionId, '210141');

// 7. Explanation present but hidden is not ready.
const hiddenDocument = load('synthetic-review-async-complete.html');
const hiddenNode = hiddenDocument.querySelector('[id*="lblPreferredResponse"]');
hiddenNode?.setAttribute('style', 'display: none');
const hidden = extractOrthobulletsPageContext({ document: hiddenDocument, pageUrl: COMPLETE_URL });
assert.equal(hidden.explanationText, undefined);
assert.notEqual(hidden.reviewState, 'ready');
assert.ok((hidden.reviewDiagnostics?.missingFields ?? []).includes('explanationText'));

// 8. Delayed explanation becoming visible settles to ready.
hiddenNode?.setAttribute('style', '');
const delayed = extractOrthobulletsPageContext({ document: hiddenDocument, pageUrl: COMPLETE_URL });
assert.equal(delayed.reviewState, 'ready');
assert.equal(reviewReadinessFingerprint(delayed), reviewReadinessFingerprint(complete));
assert.notEqual(reviewReadinessFingerprint(hidden), reviewReadinessFingerprint(delayed));

// 9. Navigating to the wrong question (or a generic page) is explicit.
const wrongQuestion = extractOrthobulletsPageContext({
  document: load('synthetic-review-async-complete.html'),
  pageUrl: 'https://www.orthobullets.com/testview?qid=9999&ans=1',
});
assert.equal(wrongQuestion.questionId, '9999');
assert.equal(
  classifyReviewReadiness(wrongQuestion, { expectedQuestionId: '210141' }).errorCode,
  'orthobullets_question_mismatch',
);
const { document: genericDocument } = parseHTML(
  '<!doctype html><html><head><title>Synthetic topic</title></head><body><h1>Synthetic topic</h1></body></html>',
);
const generic = extractOrthobulletsPageContext({
  document: genericDocument,
  pageUrl: 'https://www.orthobullets.com/synthetic/1047/synthetic-topic',
});
assert.equal(classifyReviewReadiness(generic).state, 'not_completed');

// 10. Timeout diagnostics name every missing field without interaction.
const timeout = reviewTimeoutDiagnostics(immediate, {
  expectedQuestionId: '210141',
  attempts: 34,
  timeoutMs: 10_000,
});
assert.equal(timeout.errorCode, 'orthobullets_review_load_timeout');
assert.equal(timeout.expectedQuestionId, '210141');
assert.ok(timeout.missingFields.length > 0);
assert.match(timeout.detail ?? '', /did not settle/);
assert.match(timeout.detail ?? '', /No answer was selected/);
const emptyTimeout = reviewTimeoutDiagnostics(null, { attempts: 1, timeoutMs: 10_000 });
assert.deepEqual(emptyTimeout.missingFields, ['extraction']);

assert.deepEqual(missingReviewFields(complete), []);

console.log('Review readiness classification tests passed.');
