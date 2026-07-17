import * as assert from 'node:assert/strict';

import type { BrobotExplainResult, OrthobulletsHintResponse } from '../shared/types.js';
import {
  applyPayloadToSession,
  canRenderExplanationForSession,
  createEmptyQuestionSession,
  QuestionSessionStore,
} from './question-session.js';
import type { OrthobulletsPageContext } from '../shared/types.js';

const sampleHint = {
  hintLevel: 1,
  hintId: 'hint-1',
  title: 'Hint 1',
  hint: 'Think about stability.',
  warnings: [],
  avoidRevealingAnswer: true,
} satisfies OrthobulletsHintResponse;

const sampleExplanation = {
  explanationId: 'exp-1',
  bottomLine: 'Teaching answer',
  testedConcept: 'Stability',
  whyCorrect: 'Because',
  whyWrong: [],
  boardPearl: 'Pearl',
  studyNext: [],
  warnings: [],
} satisfies BrobotExplainResult;

const store = new QuestionSessionStore();

const sessionA = store.activateFingerprint('fp-a', {
  url: 'https://www.orthobullets.com/currenttest?questionId=1',
  questionId: '1',
  questionPositionLabel: 'Question 1 of 10',
});
sessionA.extractionStatus = 'ready';
sessionA.hints = [sampleHint];
sessionA.hintStatus = 'ready';
sessionA.explanation = sampleExplanation;
sessionA.explanationStatus = 'ready';
sessionA.primaryAction = 'hint';
sessionA.reviewState = 'unanswered';

store.activateFingerprint('fp-b', {
  url: 'https://www.orthobullets.com/currenttest?questionId=2',
  questionId: '2',
  resetVisiblePanel: true,
});

const view = store.deriveViewState();
assert.equal(view.fingerprintAligned, true);
assert.equal(view.showLoadingCurrentQuestion, true, 'new session should load before showing stale content');
assert.equal(view.hintsToRender.length, 0, 'must not render previous question hints');
assert.equal(view.explanationToRender, null, 'must not render previous question explanation');

store.getSession('fp-b')!.extractionStatus = 'ready';
store.getSession('fp-b')!.primaryAction = 'hint';
store.getSession('fp-b')!.reviewState = 'unanswered';
const readyView = store.deriveViewState();
assert.equal(readyView.showLoadingCurrentQuestion, false);
assert.equal(readyView.showHintCta, true);
assert.equal(readyView.hintButtonLabel, 'Show Hint');
assert.equal(readyView.debug.currentHintIndex, null);
assert.equal(readyView.hintsToRender.length, 0, 'prefetch ready but panel idle should hide hints');

store.getSession('fp-b')!.hintStatus = 'error';
assert.equal(store.deriveViewState().hintButtonLabel, 'Retry Hint');

store.visiblePanelMode = 'hint_open';
store.getSession('fp-b')!.hintStatus = 'ready';
store.getSession('fp-b')!.hints = [{ ...sampleHint, hint: 'New hint' }];
store.getSession('fp-b')!.currentHintIndex = 0;
store.getSession('fp-b')!.hintOpenedForFingerprint = 'fp-b';
const openView = store.deriveViewState();
assert.equal(openView.hintsToRender.length, 1);
assert.match(openView.hintsToRender[0]?.hint ?? '', /New hint/);
assert.equal(openView.hintButtonLabel, 'Next Hint');
assert.equal(openView.debug.hintCount, 1);
assert.equal(openView.debug.currentHintIndex, 0);
assert.equal(openView.debug.hintOpenedForFingerprint, 'fp-b');

store.getSession('fp-b')!.hints.push({ ...sampleHint, hintId: 'hint-2', hintLevel: 2, hint: 'Second hint' });
store.getSession('fp-b')!.currentHintIndex = 1;
const secondHintView = store.deriveViewState();
assert.equal(secondHintView.hintsToRender.length, 2);
assert.equal(secondHintView.hintButtonLabel, 'Next Hint');

store.getSession('fp-b')!.hints.push({ ...sampleHint, hintId: 'hint-3', hintLevel: 3, hint: 'Final hint' });
store.getSession('fp-b')!.currentHintIndex = 2;
const finalHintView = store.deriveViewState();
assert.equal(finalHintView.hintButtonLabel, 'No more hints');
assert.equal(finalHintView.hintButtonDisabled, true);

store.bumpGeneration('fp-b');
const resetHintView = store.deriveViewState();
assert.equal(resetHintView.debug.currentHintIndex, null);
assert.equal(resetHintView.hintButtonLabel, 'Show Hint');

assert.equal(store.canCommit('fp-a', 1), false, 'stale fingerprint should discard');
assert.equal(store.staleResponsesDiscarded >= 1, true);

const empty = createEmptyQuestionSession('fp-c', 'https://example.com');
assert.equal(empty.generation, 1);
assert.equal(empty.extractionStatus, 'idle');

const unansweredPayload = {
  source: 'orthobullets',
  provider: 'orthobullets',
  mode: 'question',
  pageUrl: 'https://www.orthobullets.com/currenttest?questionId=211001',
  sourceUrl: 'https://www.orthobullets.com/currenttest?questionId=211001',
  pageKind: 'current_test',
  questionId: '211001',
  stem: 'Open tibial fracture management',
  answerChoices: [
    { key: 'A', text: 'ORIF' },
    { key: 'B', text: 'External fixation' },
  ],
  breadcrumbs: [],
  percentDistribution: [],
  linkedConcepts: [],
  images: [],
  extractionWarnings: [],
  questionReviewSignals: {
    hasVisibleExplanation: false,
    hasVisibleReviewMarker: false,
    hasSubmittedAnswerState: false,
    visibleUnansweredPrompt: true,
    unansweredOverrideApplied: true,
    reviewScore: 0,
    unansweredScore: 5,
    reviewEvidence: [],
    unansweredEvidence: ['unanswered_prompt', 'no_review_answer_styling', 'no_distribution_rows', 'preferred_response_disabled', 'no_explanation_text'],
  },
} satisfies OrthobulletsPageContext;

const staleExplainSession = store.getSession('fp-b')!;
staleExplainSession.explanation = sampleExplanation;
staleExplainSession.explanationStatus = 'ready';
applyPayloadToSession(staleExplainSession, unansweredPayload);
assert.equal(staleExplainSession.reviewState, 'unanswered');
assert.equal(staleExplainSession.primaryAction, 'hint');
assert.equal(staleExplainSession.explanation, undefined, 'unanswered re-extraction must quarantine explanation');
assert.equal(staleExplainSession.explanationStatus, 'idle');

store.visiblePanelMode = 'explanation_open';
const blockedView = store.deriveViewState();
assert.equal(blockedView.showExplainCta, false);
assert.equal(blockedView.explanationToRender, null);
assert.equal(blockedView.debug.explanationRenderBlockedReason, 'review_state_not_answered_review');

const answeredSession = store.getSession('fp-a')!;
answeredSession.reviewState = 'answered_review';
answeredSession.primaryAction = 'explain';
answeredSession.explanation = sampleExplanation;
answeredSession.explanationStatus = 'ready';
store.activeFingerprint = 'fp-a';
store.visiblePanelMode = 'explanation_open';
const allowed = canRenderExplanationForSession(answeredSession, 'fp-a', 'explanation_open');
assert.equal(allowed.allowed, true);

console.log('Question session store tests passed.');
