import * as assert from 'node:assert/strict';

import { hasReviewData, isExplainEligible, isHintEligible, isUnansweredQuestion } from './page-classification.js';
import type { OrthobulletsPageContext } from './types.js';

function createContext(overrides: Partial<OrthobulletsPageContext>): OrthobulletsPageContext {
  return {
    source: 'orthobullets',
    pageUrl: 'https://www.orthobullets.com/currenttest?questionId=210999',
    pageKind: 'current_test',
    breadcrumbs: ['Trauma'],
    answerChoices: [
      { key: '1', text: 'Choice 1' },
      { key: '2', text: 'Choice 2' },
    ],
    percentDistribution: [],
    linkedConcepts: [],
    images: [],
    extractionWarnings: [],
    ...overrides,
  };
}

const unansweredCurrentTest = createContext({
  stem: 'A patient presents with an unstable fracture pattern.',
});

assert.equal(hasReviewData(unansweredCurrentTest), false);
assert.equal(isUnansweredQuestion(unansweredCurrentTest), true);
assert.equal(isHintEligible(unansweredCurrentTest), true);
assert.equal(isExplainEligible(unansweredCurrentTest), false);

const currentTestWithReviewData = createContext({
  correctAnswerKey: '2',
  explanationText: 'Preferred response discusses instability and fixation choice.',
  percentDistribution: [
    { answerKey: '1', percent: 20 },
    { answerKey: '2', percent: 55 },
  ],
});

assert.equal(hasReviewData(currentTestWithReviewData), true);
assert.equal(isUnansweredQuestion(currentTestWithReviewData), false);
assert.equal(isHintEligible(currentTestWithReviewData), false);
assert.equal(isExplainEligible(currentTestWithReviewData), true);

const reviewPage = createContext({
  pageUrl: 'https://www.orthobullets.com/testview?qid=3794&ans=2',
  pageKind: 'review',
  selectedAnswerKey: '1',
  correctAnswerKey: '2',
  explanationText: 'Review explanation is visible.',
});

assert.equal(hasReviewData(reviewPage), true);
assert.equal(isUnansweredQuestion(reviewPage), false);
assert.equal(isHintEligible(reviewPage), false);
assert.equal(isExplainEligible(reviewPage), true);

console.log('Orthobullets page classification tests passed.');
