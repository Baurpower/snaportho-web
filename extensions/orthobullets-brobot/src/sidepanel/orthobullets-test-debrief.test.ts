import * as assert from 'node:assert/strict';
import type { OrthobulletsTestResultRow } from '../shared/types.js';
import { fullDebriefText, groupMissedQuestions, testDebriefStorageKey } from './orthobullets-test-debrief.js';

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
assert.match(testDebriefStorageKey({
  testId: 'TEST-1',
  day: null,
  scorePercent: 25,
  totalCount: 4,
  correctCount: 1,
  missedCount: 3,
  rows,
}), /TEST-1$/);

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
