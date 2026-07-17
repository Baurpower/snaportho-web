import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parseHTML } = require('linkedom');

import { extractOrthobulletsPageContext } from '../content/extractor.js';
import {
  buildReviewStateKey,
  computeQuestionReviewSignals,
  inferQuestionState,
  isElementVisible,
  resolveQuestionTutorPrimaryAction,
} from './question-review-state.js';
import type { OrthobulletsPageContext } from './types.js';

const FIXTURES_DIR = path.join(process.cwd(), 'extensions/orthobullets-brobot/fixtures');

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
      { key: 'A', text: 'Choice A' },
      { key: 'B', text: 'Choice B' },
    ],
    percentDistribution: [],
    linkedConcepts: [],
    images: [],
    extractionWarnings: [],
    ...overrides,
  };
}

function withVisibleReviewSignals(
  context: OrthobulletsPageContext,
  overrides: Partial<NonNullable<OrthobulletsPageContext['questionReviewSignals']>> = {}
): OrthobulletsPageContext {
  return {
    ...context,
    questionReviewSignals: {
      hasVisibleExplanation: true,
      hasVisibleReviewMarker: true,
      hasSubmittedAnswerState: true,
      visibleUnansweredPrompt: false,
      unansweredOverrideApplied: false,
      reviewScore: 3,
      unansweredScore: 0,
      reviewEvidence: ['correct_answer_review_class', 'distribution_rows', 'explanation_text'],
      unansweredEvidence: [],
      ...overrides,
    },
  };
}

const unanswered = createContext({
  stem: 'A patient presents with an unstable fracture pattern.',
});

assert.equal(inferQuestionState(unanswered), 'unanswered');
assert.equal(resolveQuestionTutorPrimaryAction(unanswered), 'hint');

const hiddenReviewDom = createContext({
  stem: 'A patient presents with an unstable fracture pattern.',
  selectedAnswerKey: 'B',
  correctAnswerKey: 'B',
  explanationText: 'Hidden preferred response text that should not count yet.',
  percentDistribution: [{ answerKey: 'B', percent: 62 }],
  questionReviewSignals: {
    hasVisibleExplanation: false,
    hasVisibleReviewMarker: false,
    hasSubmittedAnswerState: false,
    visibleUnansweredPrompt: false,
    unansweredOverrideApplied: false,
    reviewScore: 0,
    unansweredScore: 4,
    reviewEvidence: [],
    unansweredEvidence: ['no_review_answer_styling', 'no_distribution_rows', 'preferred_response_disabled', 'no_explanation_text'],
  },
});

assert.equal(inferQuestionState(hiddenReviewDom), 'unanswered');
assert.equal(resolveQuestionTutorPrimaryAction(hiddenReviewDom), 'hint');

const answered = withVisibleReviewSignals(
  createContext({
    stem: 'A patient presents with an unstable fracture pattern.',
    correctAnswerKey: 'B',
    explanationText: 'Preferred response is visible after submission.',
    percentDistribution: [{ answerKey: 'B', percent: 62 }],
  })
);

assert.equal(inferQuestionState(answered), 'answered_review');
assert.equal(resolveQuestionTutorPrimaryAction(answered), 'explain');
assert.equal(buildReviewStateKey(answered), 'answered_review:3:0:0:0:0:0:0:0');

const hiddenFixtureHtml = readFileSync(
  path.join(FIXTURES_DIR, 'synthetic-current-test-hidden-review.html'),
  'utf8'
);
const { document: hiddenFixtureDocument } = parseHTML(hiddenFixtureHtml);
const hiddenFixtureContext = extractOrthobulletsPageContext({
  document: hiddenFixtureDocument,
  pageUrl: 'https://www.orthobullets.com/currenttest?questionId=210999',
});

assert.equal(hiddenFixtureContext.correctAnswerKey, undefined, 'hidden data-correct should not populate correctAnswerKey');
assert.equal(hiddenFixtureContext.explanationText, undefined, 'hidden explanation should not populate explanationText');
assert.equal(hiddenFixtureContext.percentDistribution.length, 0, 'hidden percent rows should be ignored');
assert.equal(inferQuestionState(hiddenFixtureContext), 'unanswered');
assert.equal(resolveQuestionTutorPrimaryAction(hiddenFixtureContext), 'hint');

const visibleReviewHtml = readFileSync(path.join(FIXTURES_DIR, 'synthetic-review-page.html'), 'utf8');
const { document: visibleReviewDocument } = parseHTML(visibleReviewHtml);
const visibleReviewContext = extractOrthobulletsPageContext({
  document: visibleReviewDocument,
  pageUrl: 'https://www.orthobullets.com/testview?qid=1',
});

assert.equal(inferQuestionState(visibleReviewContext), 'answered_review');
assert.equal(resolveQuestionTutorPrimaryAction(visibleReviewContext), 'explain');

const hiddenNode = hiddenFixtureDocument.querySelector('.preferredResponse');
assert.equal(isElementVisible(hiddenNode), false);

const visibleSignals = computeQuestionReviewSignals(visibleReviewDocument, visibleReviewContext);
assert.equal(visibleSignals.hasSubmittedAnswerState, true);

const stalePromptReviewHtml = readFileSync(
  path.join(FIXTURES_DIR, 'synthetic-review-with-stale-prompt.html'),
  'utf8'
);
const { document: stalePromptReviewDocument } = parseHTML(stalePromptReviewHtml);
const stalePromptReviewContext = extractOrthobulletsPageContext({
  document: stalePromptReviewDocument,
  pageUrl: 'https://www.orthobullets.com/currenttest?questionId=211002',
});
assert.equal(stalePromptReviewContext.questionReviewSignals?.visibleUnansweredPrompt, true);
assert.ok((stalePromptReviewContext.questionReviewSignals?.reviewScore ?? 0) >= 2);
assert.equal(stalePromptReviewContext.questionReviewSignals?.unansweredOverrideApplied, false);
assert.equal(inferQuestionState(stalePromptReviewContext), 'answered_review');
assert.equal(resolveQuestionTutorPrimaryAction(stalePromptReviewContext), 'explain');

const selectAnswerHtml = readFileSync(
  path.join(FIXTURES_DIR, 'synthetic-current-test-select-answer-prompt.html'),
  'utf8'
);
const { document: selectAnswerDocument } = parseHTML(selectAnswerHtml);
const selectAnswerContext = extractOrthobulletsPageContext({
  document: selectAnswerDocument,
  pageUrl: 'https://www.orthobullets.com/currenttest?questionId=211001',
});

assert.equal(selectAnswerContext.questionReviewSignals?.unansweredOverrideApplied, true);
assert.equal(selectAnswerContext.questionReviewSignals?.visibleUnansweredPrompt, true);
assert.equal(selectAnswerContext.questionReviewSignals?.hasSubmittedAnswerState, false);
assert.equal(inferQuestionState(selectAnswerContext), 'unanswered');
assert.equal(resolveQuestionTutorPrimaryAction(selectAnswerContext), 'hint');
assert.notEqual(
  buildReviewStateKey(selectAnswerContext),
  buildReviewStateKey(stalePromptReviewContext),
  'review reveal evidence must change the lifecycle key'
);

const strongerReviewEvidenceWins = withVisibleReviewSignals(
  createContext({
    stem: 'A patient presents with an unstable fracture pattern.',
  }),
  {
    visibleUnansweredPrompt: true,
    unansweredOverrideApplied: false,
    reviewScore: 4,
    unansweredScore: 1,
  }
);
assert.equal(inferQuestionState(strongerReviewEvidenceWins), 'answered_review');
assert.equal(resolveQuestionTutorPrimaryAction(strongerReviewEvidenceWins), 'explain');

console.log('Question review state tests passed.');
