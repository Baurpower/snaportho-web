import * as assert from 'node:assert/strict';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parseHTML } = require('linkedom');

import { extractQuestionContext } from '../content/extractor.js';
import { buildHimalayaApiPageContext } from '../providers/himalaya/himalaya-context.js';
import { normalizeHimalayaAttempts } from '../providers/himalaya/himalaya-api.js';
import {
  createQuestionSourceAdapter,
  detectSourceFingerprintDrift,
  parseSourceHierarchy,
} from './question-source-adapter.js';
import { isQuestionSourceIdentityV1 } from './question-source-identity.js';

function documentFrom(html: string) {
  return parseHTML(html).document;
}

const obReviewed = extractQuestionContext({
  document: documentFrom(`
    <html><head><title>Synthetic question</title></head><body>
      <div class="question__code">QID 210136</div>
      <div class="question__text">A synthetic stem asks which sanitized reconstruction is preferred.</div>
      <div class="answerItem selected">A. Column plating</div>
      <div class="answerItem correct">B. Cup-cage</div>
      <section id="explanation">Preferred response: cup-cage reconstruction.</section>
    </body></html>
  `),
  pageUrl: 'https://www.orthobullets.com/question/view?test=77',
});
assert.ok(obReviewed);
const obAdapter = createQuestionSourceAdapter(obReviewed);
assert.equal(obAdapter.provider, 'orthobullets');
assert.equal(obAdapter.extractQuestion().nativeQuestionId, '210136');
assert.equal(obAdapter.stableIdentity().identityStatus, 'stable');
assert.equal(obAdapter.stableIdentity().nativeQuestionId, '210136');
assert.equal(isQuestionSourceIdentityV1(obAdapter.stableIdentity()), true);
const obReview = obAdapter.extractReviewOutcome();
assert.ok(obReview);
assert.equal(obReview.correct, false);
assert.equal(obReview.explanationAvailable, true);
assert.equal(obAdapter.context().testId, '77');
assert.equal(Object.prototype.hasOwnProperty.call(obAdapter.stableIdentity(), 'stem'), false);

const obUnanswered = extractQuestionContext({
  document: documentFrom(`
    <html><head><title>Synthetic live</title></head><body>
      <div class="question__text">A synthetic unanswered stem.</div>
      <div class="answerItem">A. Alpha</div>
      <div class="answerItem">B. Beta</div>
    </body></html>
  `),
  pageUrl: 'https://www.orthobullets.com/currenttest?questionId=5151',
});
assert.ok(obUnanswered);
const liveAdapter = createQuestionSourceAdapter(obUnanswered);
assert.equal(liveAdapter.extractQuestion().nativeQuestionId, '5151');
assert.equal(liveAdapter.extractReviewOutcome(), null);

const rock = extractQuestionContext({
  document: documentFrom(`
    <html><head><title>ROCK Synthetic</title></head><body>
      <div data-testid="question-stem">A synthetic ROCK stem about jump distance.</div>
      <div data-testid="answer-choice">A. One</div>
      <div data-testid="answer-choice">B. Two</div>
    </body></html>
  `),
  pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=510000500&did=88&type=pretest',
});
assert.ok(rock);
const rockAdapter = createQuestionSourceAdapter(rock);
assert.equal(rockAdapter.provider, 'rock_himalaya');
assert.equal(rockAdapter.context().chapterId, '510000500');
assert.equal(rockAdapter.context().assessmentDefinitionId, '88');
assert.equal(rockAdapter.context().assessmentType, 'pretest');
assert.deepEqual(parseSourceHierarchy('https://rock.aaos.org/x?did=9&type=posttest').assessmentType, 'posttest');

const [attempt] = normalizeHimalayaAttempts([{
  question: {
    questionAttemptId: 590424518,
    stem: '<p>A synthetic himalaya stem.</p>',
    answers: [
      { id: 1, text: 'Synthetic alpha' },
      { id: 2, text: 'Synthetic beta', correctResponse: true },
    ],
    selectedAnswer: 1,
  },
  remediation: { feedback: '<p>Synthetic discussion.</p>', correctResponse: false, correctAnswerIds: [2] },
  showCorrectAnswer: true,
}]);
const himalaya = buildHimalayaApiPageContext({
  question: attempt,
  bridgeState: {
    bridgeVersion: 'test',
    pageUrl: 'https://learn.aaos.org/diweb/review',
    view: 'results',
    testAttemptId: 1,
    archived: true,
    assessmentTitle: 'Synthetic',
    score: 0,
    maxScore: 1,
    questionResults: [{ questionAttemptId: 590424518, questionId: 424242, result: 'INCORRECT' }],
    openModal: null,
    liveQuestion: null,
  },
  allQuestions: [attempt],
  pageUrl: 'https://learn.aaos.org/diweb/review',
});
const himalayaAdapter = createQuestionSourceAdapter(himalaya);
assert.equal(himalayaAdapter.provider, 'rock_himalaya');
assert.equal(himalayaAdapter.extractQuestion().nativeQuestionId, '424242');
assert.notEqual(himalayaAdapter.stableIdentity().attemptId, himalayaAdapter.stableIdentity().nativeQuestionId);
assert.equal(himalayaAdapter.extractReviewOutcome()?.correct, false);

const otherAttempt = buildHimalayaApiPageContext({
  question: { ...attempt, questionAttemptId: 590424999 },
  bridgeState: {
    bridgeVersion: 'test',
    pageUrl: 'https://learn.aaos.org/diweb/review',
    view: 'results',
    testAttemptId: 2,
    archived: true,
    assessmentTitle: 'Synthetic',
    score: 0,
    maxScore: 1,
    questionResults: [{ questionAttemptId: 590424999, questionId: 424242, result: 'INCORRECT' }],
    openModal: null,
    liveQuestion: null,
  },
  allQuestions: [{ ...attempt, questionAttemptId: 590424999 }],
  pageUrl: 'https://learn.aaos.org/diweb/review',
});
assert.equal(
  detectSourceFingerprintDrift(
    createQuestionSourceAdapter(himalaya).stableIdentity().sourceFingerprintHash,
    createQuestionSourceAdapter(otherAttempt).stableIdentity().sourceFingerprintHash,
  ),
  false,
);
assert.equal(
  detectSourceFingerprintDrift(
    himalayaAdapter.stableIdentity().sourceFingerprintHash,
    createQuestionSourceAdapter({
      ...himalaya,
      stem: 'A different synthetic stem.',
      raw: { providerSpecific: {} },
    }).stableIdentity().sourceFingerprintHash,
  ),
  true,
);

const results = extractQuestionContext({
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
assert.ok(results);
const resultsAdapter = createQuestionSourceAdapter(results);
assert.equal(resultsAdapter.extractQuestion().nativeQuestionId, null);
assert.equal(resultsAdapter.extractReviewOutcome(), null);
assert.equal(resultsAdapter.stableIdentity().identityStatus, 'missing_native_id');

console.log('question-source-adapter.test.ts: all assertions passed');
