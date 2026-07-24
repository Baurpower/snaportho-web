// MAIN-world bridge for the AAOS te6 assessment engine.
//
// Content scripts run in an isolated world and cannot touch `window.angular`,
// but `testAttemptId` / `archived` — the two values the te6 REST API requires —
// live only on the AngularJS scope. This script runs in the page world, reads
// that scope, and re-publishes a sanitized snapshot over window.postMessage.
//
// It only ever READS the scope. It never calls te6 functions, mutates scope
// state, or submits anything, so it cannot affect a live attempt.

import {
  HIMALAYA_BRIDGE_MESSAGE_SOURCE,
  type HimalayaBridgeState,
  type Te6Question,
  type Te6QuestionResult,
  type Te6Remediation,
} from './himalaya-te6-types.js';

const BRIDGE_VERSION = '2026-07-23-himalaya-bridge-v1';
const POLL_MS = 400;

type AngularLike = {
  element(node: unknown): { scope(): Record<string, unknown> | undefined };
};

function getAngular(): AngularLike | null {
  const candidate = (window as unknown as { angular?: AngularLike }).angular;
  return candidate && typeof candidate.element === 'function' ? candidate : null;
}

function scopeOf(angular: AngularLike, selector: string): Record<string, unknown> | null {
  const node = document.querySelector(selector);
  if (!node) return null;
  try {
    return angular.element(node).scope() ?? null;
  } catch {
    return null;
  }
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readQuestionResults(value: unknown): Te6QuestionResult[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      index: asNumber(entry.index) ?? undefined,
      result: typeof entry.result === 'string' ? entry.result : null,
      questionAttemptId: asNumber(entry.questionAttemptId) ?? undefined,
      questionId: asNumber(entry.questionId) ?? undefined,
      marked: entry.marked === true,
    }));
}

/**
 * Strip Angular bookkeeping ($$hashKey, $$mdSelectId, …) so the postMessage
 * payload stays structured-cloneable and free of cyclic scope references.
 */
function plainCopy<T>(value: unknown): T | null {
  if (value == null || typeof value !== 'object') return null;
  try {
    return JSON.parse(
      JSON.stringify(value, (key, nested) => (key.startsWith('$$') || key.startsWith('$') ? undefined : nested))
    ) as T;
  } catch {
    return null;
  }
}

/**
 * Which review modal, if any, the learner currently has open.
 *
 * This is a best-effort convenience so the panel can follow along when someone
 * opens a question on the page; the review board itself never depends on it.
 * Being conservative matters more than always answering, because naming the
 * wrong question would show the learner the wrong explanation.
 *
 * te6's uib-modal build leaks: dismissed modals stay in the DOM at display:block
 * with their scope intact, and backdrops accumulate. The only signal that
 * separates a live modal from a corpse is the Bootstrap `in` class (and the
 * non-zero opacity it applies). When neither is observable we report nothing
 * rather than guessing at a stale element.
 */
function readOpenModal(angular: AngularLike): HimalayaBridgeState['openModal'] {
  const candidates = Array.from(document.querySelectorAll('.modal')).map((modal) => {
    const body = modal.querySelector('#resultQuestionDetails, .modal-body');
    if (!body) return null;
    let scope: Record<string, unknown> | null = null;
    try {
      scope = angular.element(body).scope() ?? null;
    } catch {
      return null;
    }
    const question = scope?.question as Record<string, unknown> | undefined;
    const questionAttemptId = asNumber(question?.questionAttemptId);
    // A modal still fetching its question has a scope but no question yet.
    if (!scope || questionAttemptId == null) return null;

    const opacity = Number.parseFloat(window.getComputedStyle(modal).opacity || '0') || 0;
    return {
      hasIn: modal.classList.contains('in'),
      opacity,
      openModal: {
        currentIndex: asNumber(scope.currentIndex),
        total: asNumber(scope.total),
        questionAttemptId,
      },
    };
  });

  const live = candidates.filter((candidate): candidate is NonNullable<typeof candidate> => candidate != null);
  const shown = live.find((candidate) => candidate.hasIn)
    ?? live.filter((candidate) => candidate.opacity > 0.01).sort((a, b) => b.opacity - a.opacity)[0];
  return shown?.openModal ?? null;
}

function readLiveQuestion(te: Record<string, unknown>): HimalayaBridgeState['liveQuestion'] {
  const questions = te.questions;
  if (!Array.isArray(questions) || !questions.length) return null;
  const current = questions[0] as Record<string, unknown> | undefined;
  if (!current) return null;
  const question = plainCopy<Te6Question>(current);
  if (!question || !question.stem) return null;
  return {
    question,
    remediation: plainCopy<Te6Remediation>(current.remediation) ?? null,
    showCorrectAnswer: current.showCorrectAnswer === true,
    displayIndex: asNumber(current.displayOrder) ?? (asNumber(te.index) != null ? (asNumber(te.index) as number) + 1 : null),
    totalQuestions: asNumber(te.totalQuestionCount) ?? asNumber(te.questionCount),
  };
}

function readState(): HimalayaBridgeState | null {
  const angular = getAngular();
  if (!angular) return null;

  const appScope = scopeOf(angular, '#teApp [ng-include], #teApp, [ng-controller="te-controller"]');
  const te = (appScope?.te ?? null) as Record<string, unknown> | null;
  if (!te) return null;

  const liveQuestion = readLiveQuestion(te);
  const questionResults = readQuestionResults(te.questionResults);
  const view: HimalayaBridgeState['view'] = questionResults.length
    ? 'results'
    : liveQuestion
      ? 'question'
      : 'unknown';

  return {
    bridgeVersion: BRIDGE_VERSION,
    pageUrl: window.location.href,
    view,
    testAttemptId: asNumber(te.testAttemptId),
    archived: te.archived === true,
    assessmentTitle: asString(te.name),
    score: asNumber(te.score),
    maxScore: asNumber(te.maxScore),
    questionResults,
    openModal: readOpenModal(angular),
    liveQuestion,
  };
}

function publish(state: HimalayaBridgeState) {
  window.postMessage(
    { source: HIMALAYA_BRIDGE_MESSAGE_SOURCE, type: 'te-state', state },
    window.location.origin
  );
}

/**
 * Cheap identity of the observable state. Publishing only on change keeps the
 * isolated world from re-extracting on every poll tick.
 */
function stateKey(state: HimalayaBridgeState) {
  return [
    state.view,
    state.testAttemptId ?? '',
    state.archived ? '1' : '0',
    state.questionResults.map((result) => `${result.questionAttemptId ?? ''}:${result.result ?? ''}`).join(','),
    state.openModal ? `${state.openModal.questionAttemptId ?? ''}@${state.openModal.currentIndex ?? ''}` : '',
    state.liveQuestion
      ? `${state.liveQuestion.question.questionAttemptId ?? ''}:${state.liveQuestion.question.selectedAnswer ?? ''}:${state.liveQuestion.showCorrectAnswer ? '1' : '0'}`
      : '',
  ].join('|');
}

export function startHimalayaBridge() {
  let lastKey: string | null = null;

  const tick = () => {
    const state = readState();
    if (!state) return;
    const key = stateKey(state);
    if (key === lastKey) return;
    lastKey = key;
    publish(state);
  };

  tick();
  window.setInterval(tick, POLL_MS);

  // Let the isolated world force a fresh publish (e.g. when the side panel opens
  // after the state already settled and no further changes are coming).
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data as { source?: string; type?: string } | null;
    if (data?.source !== HIMALAYA_BRIDGE_MESSAGE_SOURCE || data.type !== 'request-te-state') return;
    lastKey = null;
    tick();
  });
}
