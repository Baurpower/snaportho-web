import * as assert from 'node:assert/strict';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parseHTML } = require('linkedom');

import {
  extractOrthobulletsPageContext,
  extractOrthobulletsTestResultsContext,
} from '../content/extractor.js';
import { extractHimalayaPageContext } from '../providers/himalaya/himalaya-extractor.js';
import { buildHimalayaApiPageContext } from '../providers/himalaya/himalaya-context.js';
import { normalizeHimalayaAttempts } from '../providers/himalaya/himalaya-api.js';
import {
  REVIEW_OUTCOME_CAPTURE_MIN,
  STABLE_NATIVE_ID_CAPTURE_MIN,
  evaluateSanitizedIdentityCapture,
  isQuestionSourceIdentityV1,
  type QuestionSourceIdentityV1,
} from './question-source-identity.js';

function identityOf(value: unknown): QuestionSourceIdentityV1 {
  const packet = (value as { raw?: { providerSpecific?: { sourceIdentity?: unknown } } } | null)?.raw?.providerSpecific?.sourceIdentity;
  assert.equal(isQuestionSourceIdentityV1(packet), true);
  return packet as QuestionSourceIdentityV1;
}

function documentFrom(html: string) {
  return parseHTML(html).document;
}

const report = evaluateSanitizedIdentityCapture();
assert.deepEqual(report.failures, [], report.failures.join('\n'));
assert.ok(report.stableRate >= STABLE_NATIVE_ID_CAPTURE_MIN);
assert.ok(report.reviewRate >= REVIEW_OUTCOME_CAPTURE_MIN);

const urlQid = extractOrthobulletsPageContext({
  document: documentFrom(`
    <html><head><title>Synthetic question</title></head><body>
      <div class="question__text">A synthetic stem asks which sanitized option is preferred.</div>
      <div class="answerItem">A. Synthetic cast</div>
      <div class="answerItem">B. Synthetic fixation</div>
    </body></html>
  `),
  pageUrl: 'https://www.orthobullets.com/testview?qid=obq24-001',
});
assert.equal(urlQid.questionId, 'OBQ24-001');
assert.equal(identityOf(urlQid).identityStatus, 'stable');
assert.equal(identityOf(urlQid).nativeQuestionId, 'OBQ24-001');

const codeOnly = extractOrthobulletsPageContext({
  document: documentFrom(`
    <html><head><title>Synthetic question</title></head><body>
      <div class="question__code">QID 4321</div>
      <div class="question__text">A synthetic stem with the id only in the visible code.</div>
      <div class="answerItem selected">A. Synthetic alpha</div>
      <div class="answerItem correct">B. Synthetic beta</div>
      <section id="explanation">Synthetic explanation that names beta as the preferred response.</section>
    </body></html>
  `),
  pageUrl: 'https://www.orthobullets.com/question/view',
});
const codeIdentity = identityOf(codeOnly);
assert.equal(codeOnly.questionId, '4321');
assert.equal(codeIdentity.identityStatus, 'stable');
assert.equal(codeIdentity.reviewState, 'answered_review');
assert.equal(codeIdentity.correct, false);

const missingQid = extractOrthobulletsPageContext({
  document: documentFrom(`
    <html><head><title>Synthetic question</title></head><body>
      <div class="question__text">A synthetic stem with no question id anywhere.</div>
      <div class="answerItem">A. Synthetic alpha</div>
      <div class="answerItem">B. Synthetic beta</div>
    </body></html>
  `),
  pageUrl: 'https://www.orthobullets.com/question/view',
});
assert.equal(missingQid.questionId, null);
assert.equal(identityOf(missingQid).identityStatus, 'missing_native_id');

const reviewedCorrect = extractOrthobulletsPageContext({
  document: documentFrom(`
    <html><head><title>Synthetic question</title></head><body>
      <div class="question__text">A synthetic reviewed stem.</div>
      <div class="answerItem">A. Synthetic alpha</div>
      <div class="answerItem selected correct">B. Synthetic beta</div>
      <section id="explanation">Synthetic explanation for the preferred beta option.</section>
    </body></html>
  `),
  pageUrl: 'https://www.orthobullets.com/testview?qid=5151',
});
assert.equal(identityOf(reviewedCorrect).correct, true);
assert.equal(identityOf(reviewedCorrect).reviewState, 'answered_review');

const results = extractOrthobulletsTestResultsContext({
  document: documentFrom(`
    <html><head><title>Qbank Results</title></head><body>
      <table>
        <thead><tr><th>#</th><th>Question</th><th>Correct</th><th>Selected</th><th>Specialty</th><th>Topic</th></tr></thead>
        <tbody>
          <tr>
            <td>1</td><td><a href="/testview?qid=OBQ13-14">OBQ13-14</a></td><td>2</td><td>2</td><td>Trauma</td><td>Synthetic topic</td>
          </tr>
        </tbody>
      </table>
    </body></html>
  `),
  pageUrl: 'https://www.orthobullets.com/qbank/testscore?test=synthetic',
});
assert.equal(results.pageKind, 'test_results');
assert.equal(identityOf(results).nativeQuestionId, null);
assert.equal(identityOf(results).identityStatus, 'missing_native_id');
assert.ok(identityOf(results).warnings.includes('results_page_not_a_question'));

const himalayaUrlOnly = extractHimalayaPageContext({
  document: documentFrom(`
    <html><head><title>Synthetic Himalaya</title></head><body><main>
      <section class="question-attempt active">
        <div class="stem">A sanitized stem with no definition id.</div>
        <div class="answers">
          <div class="answer"><span class="answer-text">Synthetic alpha</span></div>
          <div class="answer"><span class="answer-text">Synthetic beta</span></div>
        </div>
      </section>
    </main></body></html>
  `),
  pageUrl: 'https://learn.aaos.org/diweb/review?questionAttemptId=55&qid=999',
});
assert.ok(himalayaUrlOnly);
assert.equal(himalayaUrlOnly.questionId, null);
const urlOnlyIdentity = identityOf(himalayaUrlOnly);
assert.equal(urlOnlyIdentity.nativeQuestionId, null);
assert.equal(urlOnlyIdentity.identityStatus, 'attempt_id_only');
assert.equal(urlOnlyIdentity.attemptId, '55');

const himalayaExplicit = extractHimalayaPageContext({
  document: documentFrom(`
    <html><head><title>Synthetic Himalaya</title></head><body><main>
      <section class="question-attempt active" data-question-id="HIM-SYN-009">
        <div class="stem">A sanitized stem with an explicit item id.</div>
        <div class="answers">
          <div class="answer your-answer"><span class="answer-text">Synthetic alpha</span></div>
          <div class="answer correct"><span class="answer-text">Synthetic beta</span></div>
        </div>
        <div class="feedback">Feedback: synthetic beta is the preferred option.</div>
      </section>
    </main></body></html>
  `),
  pageUrl: 'https://learn.aaos.org/diweb/review?questionAttemptId=55&qid=999',
});
assert.equal(himalayaExplicit?.questionId, 'HIM-SYN-009');
assert.equal(identityOf(himalayaExplicit).identityStatus, 'stable');
assert.notEqual(identityOf(himalayaExplicit).nativeQuestionId, '55');
assert.notEqual(identityOf(himalayaExplicit).nativeQuestionId, '999');

const [joined] = normalizeHimalayaAttempts([{
  question: {
    questionAttemptId: 590424518,
    stem: '<p>A synthetic himalaya stem.</p>',
    answers: [
      { id: 1, text: 'Synthetic alpha' },
      { id: 2, text: 'Synthetic beta', correctResponse: true },
    ],
    selectedAnswer: 2,
  },
  remediation: { feedback: '<p>Synthetic discussion.</p>', correctResponse: true, correctAnswerIds: [2] },
  showCorrectAnswer: true,
}]);
const joinedContext = buildHimalayaApiPageContext({
  question: joined,
  bridgeState: {
    bridgeVersion: 'test',
    pageUrl: 'https://learn.aaos.org/diweb/review',
    view: 'results',
    testAttemptId: 34631349,
    archived: true,
    assessmentTitle: 'Synthetic assessment',
    score: 1,
    maxScore: 1,
    questionResults: [{ questionAttemptId: 590424518, questionId: 424242, result: 'CORRECT' }],
    openModal: null,
    liveQuestion: null,
  },
  allQuestions: [joined],
  pageUrl: 'https://learn.aaos.org/diweb/review',
});
assert.equal(joinedContext.questionId, '424242');
assert.equal(identityOf(joinedContext).attemptId, '590424518');
assert.equal(identityOf(joinedContext).correct, true);

const [withheld] = normalizeHimalayaAttempts([{
  question: {
    questionAttemptId: 777,
    questionId: 424242,
    stem: '<p>An in-progress synthetic question.</p>',
    answers: [
      { id: 1, text: 'Synthetic alpha', correctResponse: true },
      { id: 2, text: 'Synthetic beta' },
    ],
    selectedAnswer: 2,
  },
  showCorrectAnswer: false,
}]);
const withheldContext = buildHimalayaApiPageContext({
  question: withheld,
  bridgeState: null,
  allQuestions: [withheld],
  pageUrl: 'https://learn.aaos.org/diweb/question',
});
assert.equal(withheldContext.questionId, '424242');
assert.equal(identityOf(withheldContext).reviewState, 'not_reviewable');
assert.equal(identityOf(withheldContext).correct, null);
const sameItemOtherAttempt = buildHimalayaApiPageContext({
  question: { ...joined, questionAttemptId: 590424999 },
  bridgeState: {
    bridgeVersion: 'test',
    pageUrl: 'https://learn.aaos.org/diweb/review',
    view: 'results',
    testAttemptId: 999,
    archived: true,
    assessmentTitle: 'Synthetic assessment',
    score: null,
    maxScore: null,
    questionResults: [{ questionAttemptId: 590424999, questionId: 424242, result: 'CORRECT' }],
    openModal: null,
    liveQuestion: null,
  },
  allQuestions: [{ ...joined, questionAttemptId: 590424999 }],
  pageUrl: 'https://learn.aaos.org/diweb/review',
});
assert.equal(sameItemOtherAttempt.questionId, '424242');
assert.equal(
  identityOf(sameItemOtherAttempt).sourceFingerprintHash,
  identityOf(joinedContext).sourceFingerprintHash,
);
assert.notEqual(identityOf(sameItemOtherAttempt).attemptId, identityOf(joinedContext).attemptId);

const [noDefinition] = normalizeHimalayaAttempts([{
  question: {
    questionAttemptId: 890,
    stem: '<p>A synthetic stem with only an attempt id.</p>',
    answers: [
      { id: 1, text: 'Synthetic alpha' },
      { id: 2, text: 'Synthetic beta' },
    ],
    selectedAnswer: 1,
  },
  showCorrectAnswer: false,
}]);
const noDefinitionContext = buildHimalayaApiPageContext({
  question: noDefinition,
  bridgeState: null,
  allQuestions: [noDefinition],
  pageUrl: 'https://learn.aaos.org/diweb/question',
});
assert.equal(noDefinitionContext.questionId, null);
assert.equal(identityOf(noDefinitionContext).identityStatus, 'attempt_id_only');
assert.notEqual(identityOf(noDefinitionContext).nativeQuestionId, '890');

console.log(
  `question-source-identity fixtures passed (stable ${report.stableCaptured}/${report.stableEligible}, review ${report.reviewCaptured}/${report.reviewEligible})`,
);
