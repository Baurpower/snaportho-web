import * as assert from 'node:assert/strict';
import type { OrthobulletsTestResultRow } from '../shared/types.js';
import {
  fullDebriefText,
  groupMissedQuestions,
  hasIncompleteTestDebrief,
  missedTestRows,
  resumeMissedTestDebriefQuestions,
  testDebriefStorageKey,
} from './orthobullets-test-debrief.js';

const rows: OrthobulletsTestResultRow[] = [
  {
    order: 1,
    questionId: 'OBQ1',
    reviewUrl: 'https://www.orthobullets.com/testview?q=1',
    isCorrect: false,
    correctAnswerKey: '2',
    selectedAnswerKey: '4',
    specialty: 'Trauma',
    topic: 'Humeral Shaft Fractures',
  },
  {
    order: 2,
    questionId: 'OBQ2',
    reviewUrl: 'https://www.orthobullets.com/testview?q=2',
    isCorrect: true,
    correctAnswerKey: '1',
    selectedAnswerKey: '1',
    specialty: 'Trauma',
    topic: 'Humeral Shaft Fractures',
  },
  {
    order: 3,
    questionId: 'OBQ3',
    reviewUrl: 'https://www.orthobullets.com/testview?q=3',
    isCorrect: false,
    correctAnswerKey: '3',
    selectedAnswerKey: '1',
    specialty: 'Trauma',
    topic: 'Humeral Shaft Fractures',
  },
  {
    order: 4,
    questionId: 'OBQ4',
    reviewUrl: 'https://www.orthobullets.com/testview?q=4',
    isCorrect: false,
    correctAnswerKey: '5',
    selectedAnswerKey: '2',
    specialty: 'Hand',
    topic: 'Flexor Tendon Injury',
  },
];

const groups = groupMissedQuestions(rows);
assert.equal(groups.length, 2);
assert.equal(groups[0]?.label, 'Humeral Shaft Fractures');
assert.deepEqual(groups[0]?.questions.map((row) => row.questionId), ['OBQ1', 'OBQ3']);
assert.equal(groups[1]?.label, 'Flexor Tendon Injury');
assert.ok(groups.flatMap((group) => group.questions).every((row) => row.isCorrect === false));
assert.deepEqual(missedTestRows(rows).map((row) => row.questionId), ['OBQ1', 'OBQ3', 'OBQ4']);
assert.equal(missedTestRows([...rows, rows[0]!]).length, 3);

const review = {
  testId: 'TEST-1',
  day: '2026-09-26',
  scorePercent: 25,
  totalCount: 4,
  correctCount: 1,
  missedCount: 3,
  rows,
};
const cacheKey = testDebriefStorageKey(review);
assert.equal(testDebriefStorageKey({ ...review, rows: [...rows].reverse() }), cacheKey);
assert.notEqual(testDebriefStorageKey({
  ...review,
  rows: rows.map((row) => row.questionId === 'OBQ1' ? { ...row, selectedAnswerKey: '3' } : row),
}), cacheKey);
assert.notEqual(testDebriefStorageKey({ ...review, day: '2026-09-27' }), cacheKey);
assert.notEqual(testDebriefStorageKey({ ...review, testId: 'TEST-2' }), cacheKey);

const completedQuestions = resumeMissedTestDebriefQuestions(rows).map((question) => ({
  ...question,
  status: 'ready' as const,
  explanation: {
    explanationId: '00000000-0000-4000-8000-000000000001',
    testedConcept: question.row.questionId,
    bottomLine: 'Source-grounded teaching point.',
    whyCorrect: 'The reviewed key is correct.',
    whyWrong: [],
    boardPearl: 'Remember this.',
    studyNext: [],
    warnings: [],
  },
}));
const completedDebrief = {
  version: 1 as const,
  testKey: cacheKey,
  createdAt: '2026-07-29T00:00:00.000Z',
  updatedAt: '2026-07-29T00:00:00.000Z',
  status: 'ready' as const,
  questions: completedQuestions,
};
assert.equal(hasIncompleteTestDebrief(review, completedDebrief), false, 'a completed cache should be reused without analysis');
assert.equal(hasIncompleteTestDebrief(review, null), true, 'a missing cache should start analysis');
assert.equal(hasIncompleteTestDebrief(review, {
  ...completedDebrief,
  questions: completedQuestions.slice(1),
}), true, 'an incomplete cache should resume missing questions');

const resumedQuestions = resumeMissedTestDebriefQuestions(rows, [
  { ...completedQuestions[0]!, status: 'ready' },
  { ...completedQuestions[1]!, status: 'error', error: 'Temporary failure', explanation: null },
]);
assert.deepEqual(resumedQuestions.map((question) => question.status), ['ready', 'pending', 'pending']);
assert.equal(resumedQuestions[0]?.explanation?.testedConcept, 'OBQ1', 'completed teaching output should be preserved');
assert.equal(resumedQuestions[1]?.error, null, 'error analysis should be retried');
assert.ok(resumedQuestions.every((question) => question.row.isCorrect === false));
assert.equal(hasIncompleteTestDebrief(review, {
  ...completedDebrief,
  questions: resumedQuestions,
}), true, 'failed analysis should be eligible for retry');

const exported = fullDebriefText({
  testId: 'TEST-1',
  day: null,
  scorePercent: 25,
  totalCount: 4,
  correctCount: 1,
  missedCount: 3,
  rows,
}, {
  version: 1,
  testKey: 'TEST-1',
  createdAt: '2026-07-29T00:00:00.000Z',
  updatedAt: '2026-07-29T00:00:00.000Z',
  status: 'ready',
  questions: [{
    row: rows[0]!,
    pageContext: null,
    status: 'ready',
    error: null,
    explanation: {
      explanationId: '00000000-0000-4000-8000-000000000000',
      testedConcept: 'Radial nerve management in humeral shaft fracture',
      bottomLine: 'Observe the primary radial nerve palsy.',
      whyCorrect: 'Most recover spontaneously.',
      whyWrong: [{ choiceKey: '4', reason: 'Immediate exploration is not routinely required.' }],
      boardPearl: 'Primary palsies are generally observed.',
      studyNext: ['Indications for radial nerve exploration'],
      warnings: [],
    },
  }],
});
assert.match(exported, /Your answer: 4; correct: 2/);
assert.match(exported, /Active recall/);

console.log('orthobullets-test-debrief.test.ts: all assertions passed');
