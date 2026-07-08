import * as assert from 'node:assert/strict';

import { resolveCurriculumChatChips } from './curriculum-chips.js';
import {
  classifyPage,
  hasReviewData,
  isExplainEligible,
  isHintEligible,
  isPageUsable,
  isUnansweredQuestion,
  preferredBrobotMode,
} from './page-classification.js';
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

const classifiedQuestion = classifyPage(unansweredCurrentTest);
assert.equal(classifiedQuestion.pageKind, 'question');
assert.equal(isPageUsable(unansweredCurrentTest), true);
assert.equal(preferredBrobotMode(unansweredCurrentTest), 'question_tutor');

const classifiedCurriculum = classifyPage(rockCurriculum);
assert.equal(classifiedCurriculum.pageKind, 'educational_content');
assert.equal(isPageUsable(rockCurriculum), true);
assert.equal(preferredBrobotMode(rockCurriculum), 'explain_page');

const referencesHeavy = createContext({
  source: 'rock',
  provider: 'rock',
  mode: 'curriculum_content',
  pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=READING',
  sourceUrl: 'https://rock.aaos.org/coursecontent.aspx?id=READING',
  pageKind: 'curriculum_content',
  answerChoices: [],
  contentText:
    'Recommended reading summary for proximal humerus fractures. These citations cover classification, vascular risk, operative indications, and rehabilitation milestones that commonly appear on OITE-style trauma questions.',
  contentMarkdown:
    '# Recommended Reading\n\nThese citations cover classification, vascular risk, operative indications, and rehabilitation milestones.\n\n1. Neer CS. Displaced proximal humeral fractures.\n2. Hertel R, et al. Predictors of humeral head ischemia.\n3. Robinson CM, et al. ORIF versus nonoperative treatment.',
  references: [
    'Neer CS. Displaced proximal humeral fractures.',
    'Hertel R, et al. Predictors of humeral head ischemia.',
    'Robinson CM, et al. ORIF versus nonoperative treatment.',
  ],
  referencesCount: 3,
});

const classifiedReferences = classifyPage(referencesHeavy);
assert.equal(classifiedReferences.pageKind, 'educational_content');
assert.match(classifiedReferences.reason, /references/i);

const unreadable = createContext({
  stem: 'A visible stem without choices',
  answerChoices: [{ key: 'A', text: 'Only one choice' }],
});
assert.equal(classifyPage(unreadable).pageKind, 'unreadable');
assert.equal(isPageUsable(unreadable), false);

const curriculumChips = resolveCurriculumChatChips(
  createContext({
    source: 'rock',
    provider: 'rock',
    mode: 'curriculum_content',
    pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=LOCAL-ANESTHESIA',
    title: 'Local Anesthesia',
    contentText: 'Lidocaine, bupivacaine, and LAST management.',
    tablesCount: 1,
    answerChoices: [],
  }),
  {
    suggestedFollowUps: [
      'Why do esters and amides have different allergy risks?',
      'What should I know about LAST before injecting local?',
    ],
  }
);
assert.equal(curriculumChips.includes('Teach me like an MS3'), false);
assert.equal(curriculumChips.includes('Quiz me'), false);
assert.ok(curriculumChips.includes('Compare the drugs'));
assert.ok(curriculumChips.length <= 8);
assert.equal(preferredBrobotMode(unansweredCurrentTest), 'question_tutor');

const orthobulletsTopicPage = createContext({
  mode: 'topic_page',
  pageUrl: 'https://www.orthobullets.com/trauma/1042/femoral-neck-fractures',
  sourceUrl: 'https://www.orthobullets.com/trauma/1042/femoral-neck-fractures',
  pageKind: 'topic',
  answerChoices: [],
  sectionHeadings: ['Introduction', 'Treatment', 'Classification'],
  contentText: 'Nondisplaced femoral neck fractures in young patients require urgent fixation.',
});

const classifiedTopicPage = classifyPage(orthobulletsTopicPage);
assert.equal(classifiedTopicPage.pageKind, 'topic_page');
assert.equal(isPageUsable(orthobulletsTopicPage), true);
assert.equal(preferredBrobotMode(orthobulletsTopicPage), 'topic_tutor');
// A topic page must never fall through to ROCK's curriculum_content prompt path.
assert.notEqual(preferredBrobotMode(orthobulletsTopicPage), 'explain_page');

console.log('Orthobullets page classification tests passed.');
