import * as assert from 'node:assert/strict';

import {
  fetchHimalayaAttempts,
  htmlToText,
  normalizeHimalayaAttempts,
} from './himalaya-api.js';

// Mirrors the real POST /all-question-attempts/ payload shape captured live from
// learn.aaos.org on 2026-07-23. Content is synthetic; only the shape is real.
const reviewPayload = [
  {
    question: {
      questionAttemptId: 590424518,
      type: 'MULTIPLE_CHOICE',
      stem: '<p>Figure 1 shows a synthetic radiograph of a sanitized patient.</p><p>What is the most likely finding?</p>',
      answers: [
        { id: 2471033971, text: '<p>Synthetic choice one</p>', displayOrder: 1, correctResponse: false },
        { id: 2471033972, text: '<p>Synthetic choice two</p>', displayOrder: 2, correctResponse: false },
        { id: 2471033975, text: '<p>Synthetic choice three</p>', displayOrder: 3, correctResponse: true },
      ],
      selectedAnswer: 2471033975,
      selectedAnswers: [2471033975],
      displayOrder: 1,
      medias: [{ url: 'https://example.test/synthetic-figure-1.jpg', description: 'Synthetic figure', name: 'Figure 1' }],
      tags: ['Hip'],
    },
    remediation: {
      feedback: '<p>Synthetic discussion explaining the sanitized finding.</p>',
      reference: '<p>Synthetic Author. Sanitized Journal. 2026;2:10-14.</p>',
      correctResponse: true,
      correctAnswerIds: [2471033975],
      averagePeerPercent: 0,
      additionalFeedbacks: [],
    },
    showCorrectAnswer: true,
  },
  {
    question: {
      questionAttemptId: 590424520,
      type: 'MULTIPLE_CHOICE',
      stem: '<p>A synthetic dysplasia scenario.</p>',
      answers: [
        { id: 3001, text: 'Shallow synthetic acetabulum', displayOrder: 1, correctResponse: false },
        { id: 3002, text: 'Excessive synthetic anteversion', displayOrder: 2, correctResponse: true },
      ],
      selectedAnswer: 3001,
      selectedAnswers: [3001],
      displayOrder: 3,
      medias: [],
      tags: [],
    },
    remediation: {
      feedback: '<ul><li>Synthetic point one</li><li>Synthetic point two</li></ul>',
      reference: '',
      correctResponse: false,
      correctAnswerIds: [3002],
    },
    showCorrectAnswer: true,
  },
];

const reviewQuestions = normalizeHimalayaAttempts(reviewPayload);

assert.equal(reviewQuestions.length, 2, 'both attempts should normalize');
assert.deepEqual(
  reviewQuestions.map((question) => question.questionNumber),
  [1, 3],
  'questions sort by te6 displayOrder, not array position'
);

const [first, missed] = reviewQuestions;

assert.equal(first.stem, 'Figure 1 shows a synthetic radiograph of a sanitized patient.\nWhat is the most likely finding?');
assert.equal(first.choices.length, 3);
assert.deepEqual(first.choices.map((choice) => choice.label), ['A', 'B', 'C']);
assert.equal(first.choices[2]?.text, 'Synthetic choice three');
assert.equal(first.choices[2]?.correct, true);
assert.equal(first.choices[2]?.selected, true);
assert.equal(first.isCorrect, true);
assert.deepEqual(first.selectedChoiceIds, ['C']);
assert.deepEqual(first.correctChoiceIds, ['C']);
assert.equal(first.explanation, 'Synthetic discussion explaining the sanitized finding.');
assert.match(first.references ?? '', /Sanitized Journal/);
assert.equal(first.images.length, 1);
assert.equal(first.images[0]?.src, 'https://example.test/synthetic-figure-1.jpg');
assert.deepEqual(first.tags, ['Hip']);
assert.equal(first.reviewAvailable, true);

assert.equal(missed.isCorrect, false, 'a wrong answer must normalize to isCorrect false');
assert.deepEqual(missed.selectedChoiceIds, ['A']);
assert.deepEqual(missed.correctChoiceIds, ['B']);
assert.equal(missed.references, null, 'an empty reference string must normalize to null');
assert.match(missed.explanation ?? '', /• Synthetic point one/, 'list items become bullet lines');

// A live attempt: te6 withholds remediation and sets showCorrectAnswer false.
// Nothing may leak the answer key in that state.
const liveQuestions = normalizeHimalayaAttempts([
  {
    question: {
      questionAttemptId: 777,
      type: 'MULTIPLE_CHOICE',
      stem: '<p>An in-progress synthetic question.</p>',
      answers: [
        { id: 1, text: 'Synthetic A', correctResponse: true },
        { id: 2, text: 'Synthetic B', correctResponse: false },
      ],
      selectedAnswer: 2,
      selectedAnswers: [2],
      displayOrder: 4,
    },
    showCorrectAnswer: false,
  },
]);

assert.equal(liveQuestions.length, 1);
const live = liveQuestions[0];
assert.equal(live.reviewAvailable, false);
assert.equal(live.isCorrect, null, 'correctness is unknown mid-attempt');
assert.deepEqual(live.correctChoiceIds, [], 'no correct answer may be exposed mid-attempt');
assert.equal(
  live.choices.every((choice) => choice.correct === undefined),
  true,
  'answer.correctResponse must be ignored when te6 says showCorrectAnswer is false'
);
assert.deepEqual(live.selectedChoiceIds, ['B'], 'the learner selection is still tracked mid-attempt');
assert.equal(live.explanation, null);

// Malformed payloads must degrade to empty rather than throw.
assert.deepEqual(normalizeHimalayaAttempts(null), []);
assert.deepEqual(normalizeHimalayaAttempts({}), []);
assert.deepEqual(normalizeHimalayaAttempts([null, {}, { question: {} }]), []);
assert.deepEqual(
  normalizeHimalayaAttempts([{ question: { questionAttemptId: 5, stem: '   ' } }]),
  [],
  'a blank stem is not a usable question'
);

assert.equal(htmlToText('<p>a</p><p>b</p>'), 'a\nb');
assert.equal(htmlToText('a&nbsp;&amp;&nbsp;b'), 'a & b');
assert.equal(htmlToText('<script>bad()</script>ok'), 'ok');
assert.equal(htmlToText(null), '');

async function testFetchWiring() {
  // Headers are mandatory: te6 returns a Java error string without an explicit
  // JSON Accept header, and drops auth without credentials.
  const calls: Array<{ url: string; init: Record<string, unknown> }> = [];
  const okResult = await fetchHimalayaAttempts({
    testAttemptId: 34631349,
    archived: true,
    origin: 'https://learn.aaos.org',
    fetchImpl: async (url, init) => {
      calls.push({ url, init: init as unknown as Record<string, unknown> });
      return { ok: true, status: 200, json: async () => reviewPayload };
    },
  });

  assert.equal(okResult.ok, true);
  assert.equal(okResult.ok && okResult.questions.length, 2);
  assert.equal(calls[0]?.url, 'https://learn.aaos.org/diweb/ws/rest/te/tracking/all-question-attempts/');
  assert.equal((calls[0]?.init.headers as Record<string, string>).Accept, 'application/json');
  assert.equal((calls[0]?.init.headers as Record<string, string>)['Content-Type'], 'application/json');
  assert.equal(calls[0]?.init.credentials, 'include');
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), { testAttemptId: 34631349, archived: true });

  const httpFailure = await fetchHimalayaAttempts({
    testAttemptId: 1,
    archived: false,
    fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({}) }),
  });
  assert.equal(httpFailure.ok, false);
  assert.equal(httpFailure.ok === false && httpFailure.status, 403);

  const emptyPayload = await fetchHimalayaAttempts({
    testAttemptId: 1,
    archived: false,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => [] }),
  });
  assert.equal(emptyPayload.ok, false);
  assert.equal(emptyPayload.ok === false && emptyPayload.reason, 'empty_payload');

  const thrown = await fetchHimalayaAttempts({
    testAttemptId: 1,
    archived: false,
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });
  assert.equal(thrown.ok, false);
  assert.equal(thrown.ok === false && thrown.reason, 'offline');
}

testFetchWiring().then(
  () => {
    console.log('Himalaya te6 API tests passed.');
  },
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
