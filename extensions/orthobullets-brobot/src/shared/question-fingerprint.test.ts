import * as assert from 'node:assert/strict';

import { fingerprintFromPageContext } from './question-fingerprint.js';
import type { OrthobulletsPageContext } from './types.js';

function questionContext(overrides: Partial<OrthobulletsPageContext>): OrthobulletsPageContext {
  return {
    source: 'orthobullets',
    provider: 'orthobullets',
    mode: 'question',
    pageUrl: 'https://www.orthobullets.com/currenttest?questionId=210999',
    sourceUrl: 'https://www.orthobullets.com/currenttest?questionId=210999',
    pageKind: 'current_test',
    questionId: '210999',
    stem: 'A 79-year-old woman sustains a reverse obliquity intertrochanteric fracture.',
    answerChoices: [
      { key: 'A', text: 'Sliding hip screw' },
      { key: 'B', text: 'Cephalomedullary nail' },
    ],
    breadcrumbs: [],
    percentDistribution: [],
    linkedConcepts: [],
    images: [],
    extractionWarnings: [],
    ...overrides,
  };
}

const base = fingerprintFromPageContext(questionContext({}));
const selectedOnly = fingerprintFromPageContext(
  questionContext({
    selectedAnswerKey: 'B',
    selectedAnswer: 'Cephalomedullary nail',
    answerChoices: [
      { key: 'A', text: 'Sliding hip screw', isSelected: false },
      { key: 'B', text: 'Cephalomedullary nail', isSelected: true, isCorrect: true },
    ],
  })
);
assert.equal(base, selectedOnly, 'answer selection alone should not change fingerprint');

const nextQuestion = fingerprintFromPageContext(
  questionContext({
    questionId: '211000',
    stem: 'A 65-year-old man presents with an open tibial fracture.',
    answerChoices: [
      { key: 'A', text: 'External fixation' },
      { key: 'B', text: 'Intramedullary nail' },
    ],
  })
);
assert.notEqual(base, nextQuestion, 'new question stem/id should change fingerprint');

const imageChoiceA = fingerprintFromPageContext(
  questionContext({
    questionId: undefined,
    stem: '',
    answerChoices: [
      { key: 'A', text: 'Figure A' },
      { key: 'B', text: 'Figure B' },
    ],
    images: [{ src: 'https://www.orthobullets.com/image-a.jpg', alt: 'AP radiograph' }],
  })
);
const imageChoiceB = fingerprintFromPageContext(
  questionContext({
    questionId: undefined,
    stem: '',
    answerChoices: [
      { key: 'A', text: 'Figure A' },
      { key: 'B', text: 'Figure B' },
    ],
    images: [{ src: 'https://www.orthobullets.com/image-b.jpg', alt: 'Lateral radiograph' }],
  })
);
assert.notEqual(imageChoiceA, imageChoiceB, 'image-only questions should differ by image hash');

const positionA = fingerprintFromPageContext(
  questionContext({
    pageUrl: 'https://www.orthobullets.com/currenttest?questionId=210999',
  })
);
const positionB = fingerprintFromPageContext(
  questionContext({
    pageUrl: 'https://www.orthobullets.com/currenttest?questionId=211000',
    questionId: '211000',
    stem: 'A 79-year-old woman sustains a reverse obliquity intertrochanteric fracture.',
  })
);
assert.notEqual(positionA, positionB, 'position key should include test/question identifiers');

console.log('Question fingerprint tests passed.');