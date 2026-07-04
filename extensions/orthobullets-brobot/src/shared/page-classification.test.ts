import * as assert from 'node:assert/strict';

import { hasReviewData, isExplainEligible, isHintEligible, isUnansweredQuestion } from './page-classification.js';
import type { OrthobulletsPageContext } from './types.js';

function createContext(overrides: Partial<OrthobulletsPageContext>): OrthobulletsPageContext {
  return {
    source: 'orthobullets',
    provider: 'orthobullets',
    mode: 'question',
    pageUrl: 'https://www.orthobullets.com/currenttest?questionId=210999',
    sourceUrl: 'https://www.orthobullets.com/currenttest?questionId=210999',
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

const rockUnanswered = createContext({
  source: 'rock',
  provider: 'rock',
  mode: 'question',
  pageUrl: 'https://rock.aaos.org/questions/ROCK-SYN-001',
  sourceUrl: 'https://rock.aaos.org/questions/ROCK-SYN-001',
  pageKind: 'question',
  stem: 'A ROCK curriculum question stem.',
});

assert.equal(hasReviewData(rockUnanswered), false);
assert.equal(isUnansweredQuestion(rockUnanswered), true);
assert.equal(isHintEligible(rockUnanswered), true);

const rockReview = createContext({
  source: 'rock',
  provider: 'rock',
  mode: 'question',
  pageUrl: 'https://rock.aaos.org/review/questions/ROCK-SYN-002',
  sourceUrl: 'https://rock.aaos.org/review/questions/ROCK-SYN-002',
  pageKind: 'review',
  correctAnswer: 'Open reduction and internal fixation',
  explanation: 'Rationale is visible.',
});

assert.equal(hasReviewData(rockReview), true);
assert.equal(isUnansweredQuestion(rockReview), false);
assert.equal(isExplainEligible(rockReview), true);

const rockCurriculum = createContext({
  source: 'rock',
  provider: 'rock',
  mode: 'curriculum_content',
  pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=LOCAL-ANESTHESIA',
  sourceUrl: 'https://rock.aaos.org/coursecontent.aspx?id=LOCAL-ANESTHESIA',
  pageKind: 'curriculum_content',
  answerChoices: [],
  contentText: 'A substantial ROCK curriculum page about local anesthesia.',
});

assert.equal(hasReviewData(rockCurriculum), true);
assert.equal(isUnansweredQuestion(rockCurriculum), false);
assert.equal(isHintEligible(rockCurriculum), false);
assert.equal(isExplainEligible(rockCurriculum), true);

console.log('Orthobullets page classification tests passed.');
