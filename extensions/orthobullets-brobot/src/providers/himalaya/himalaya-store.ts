// Isolated-world side of the Himalaya bridge.
//
// Receives te6 Angular scope snapshots from the MAIN-world bridge, then fetches
// the full question set from the te6 REST API. The content script reads from
// here; when nothing has arrived (bridge blocked, AAOS changed their app), the
// caller falls back to the DOM extractor.

import {
  fetchHimalayaAttempts,
  reconcileHimalayaLiveQuestion,
  type HimalayaApiQuestion,
} from './himalaya-api.js';
import {
  HIMALAYA_BRIDGE_MESSAGE_SOURCE,
  isHimalayaBridgeMessage,
  type HimalayaBridgeState,
} from './himalaya-te6-types.js';

export type HimalayaStoreSnapshot = {
  bridgeState: HimalayaBridgeState | null;
  questions: HimalayaApiQuestion[];
  /** Why the API path is unavailable, when it is. */
  apiFailureReason: string | null;
  fetchedTestAttemptId: number | null;
  readiness: 'waiting_for_bridge' | 'waiting_for_attempt_id' | 'loading_attempt' | 'ready' | 'error';
  revision: number;
};

type Listener = (snapshot: HimalayaStoreSnapshot) => void;

const state: HimalayaStoreSnapshot = {
  bridgeState: null,
  questions: [],
  apiFailureReason: null,
  fetchedTestAttemptId: null,
  readiness: 'waiting_for_bridge',
  revision: 0,
};

const listeners = new Set<Listener>();
let inFlightTestAttemptId: number | null = null;
let fetchedForResults = false;

function emit() {
  state.revision += 1;
  const snapshot = getHimalayaStoreSnapshot();
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch {
      // A failing subscriber must not stop the others.
    }
  }
}

export function getHimalayaStoreSnapshot(): HimalayaStoreSnapshot {
  const readiness: HimalayaStoreSnapshot['readiness'] = state.apiFailureReason
    ? 'error'
    : !state.bridgeState
      ? 'waiting_for_bridge'
      : state.bridgeState.testAttemptId == null
        ? 'waiting_for_attempt_id'
        : inFlightTestAttemptId != null || state.fetchedTestAttemptId !== state.bridgeState.testAttemptId
          ? 'loading_attempt'
          : state.questions.length
            ? 'ready'
            : 'error';
  return {
    bridgeState: state.bridgeState,
    questions: state.questions,
    apiFailureReason: state.apiFailureReason,
    fetchedTestAttemptId: state.fetchedTestAttemptId,
    readiness,
    revision: state.revision,
  };
}

export function subscribeToHimalayaStore(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function waitForHimalayaStoreReady(timeoutMs = 2500): Promise<HimalayaStoreSnapshot> {
  const initial = getHimalayaStoreSnapshot();
  if (initial.readiness === 'ready' || initial.readiness === 'error') return Promise.resolve(initial);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (snapshot: HimalayaStoreSnapshot) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      unsubscribe();
      resolve(snapshot);
    };
    const unsubscribe = subscribeToHimalayaStore((snapshot) => {
      if (snapshot.readiness === 'ready' || snapshot.readiness === 'error') finish(snapshot);
    });
    const timeout = setTimeout(() => finish(getHimalayaStoreSnapshot()), timeoutMs);
  });
}

/** Look up one normalized question by its te6 attempt id. */
export function findHimalayaQuestion(questionAttemptId: number | null | undefined) {
  if (questionAttemptId == null) return null;
  return state.questions.find((question) => question.questionAttemptId === questionAttemptId) ?? null;
}

/**
 * The question the learner is looking at right now: the one open in the review
 * modal, or the live question during an attempt.
 */
export function getActiveHimalayaQuestion(): HimalayaApiQuestion | null {
  const bridgeState = state.bridgeState;
  if (!bridgeState) return null;
  if (bridgeState.openModal?.questionAttemptId != null) {
    return findHimalayaQuestion(bridgeState.openModal.questionAttemptId);
  }
  if (bridgeState.view === 'results') return null;
  if (bridgeState.liveQuestion?.question.questionAttemptId != null) {
    return reconcileHimalayaLiveQuestion(
      findHimalayaQuestion(bridgeState.liveQuestion.question.questionAttemptId),
      bridgeState.liveQuestion
    );
  }
  return null;
}

async function loadAttempts(testAttemptId: number, archived: boolean, origin: string, resultsView: boolean) {
  // Results are immutable once an attempt is archived, so one fetch per attempt
  // is enough; re-fetching on every scope tick would hammer AAOS.
  if (inFlightTestAttemptId === testAttemptId) return;
  if (state.fetchedTestAttemptId === testAttemptId && (!resultsView || fetchedForResults)) return;
  inFlightTestAttemptId = testAttemptId;
  emit();
  const result = await fetchHimalayaAttempts({ testAttemptId, archived, origin });
  inFlightTestAttemptId = null;

  if (result.ok) {
    state.questions = result.questions;
    state.apiFailureReason = null;
    state.fetchedTestAttemptId = testAttemptId;
    fetchedForResults = resultsView;
  } else {
    state.questions = [];
    state.apiFailureReason = result.status ? `${result.reason}_${result.status}` : result.reason;
  }
  emit();
  if (
    !resultsView &&
    state.bridgeState?.testAttemptId === testAttemptId &&
    state.bridgeState.view === 'results'
  ) {
    void loadAttempts(testAttemptId, state.bridgeState.archived, origin, true);
  }
}

export function handleHimalayaBridgeState(bridgeState: HimalayaBridgeState, origin: string) {
  const previousTestAttemptId = state.bridgeState?.testAttemptId ?? null;
  state.bridgeState = bridgeState;

  // A different attempt invalidates everything cached for the previous one.
  if (bridgeState.testAttemptId !== previousTestAttemptId) {
    state.questions = [];
    state.apiFailureReason = null;
    state.fetchedTestAttemptId = null;
    fetchedForResults = false;
  }
  emit();

  if (bridgeState.testAttemptId != null) {
    void loadAttempts(
      bridgeState.testAttemptId,
      bridgeState.archived,
      origin,
      bridgeState.view === 'results'
    );
  }
}

export function startHimalayaStore(windowRef: Window = window) {
  windowRef.addEventListener('message', (event) => {
    // Only same-window, same-origin posts from our own bridge are trusted; page
    // scripts and embedded frames must not be able to inject question data.
    if (event.source !== windowRef) return;
    if (event.origin !== windowRef.location.origin) return;
    if (!isHimalayaBridgeMessage(event.data)) return;
    handleHimalayaBridgeState(event.data.state, windowRef.location.origin);
  });

  // The bridge publishes only on change, so a late-starting store asks for the
  // current state rather than waiting for the next scope mutation.
  windowRef.postMessage(
    { source: HIMALAYA_BRIDGE_MESSAGE_SOURCE, type: 'request-te-state' },
    windowRef.location.origin
  );
}

/** Test seam: drop all cached state between assertions. */
export function resetHimalayaStoreForTests() {
  state.bridgeState = null;
  state.questions = [];
  state.apiFailureReason = null;
  state.fetchedTestAttemptId = null;
  state.readiness = 'waiting_for_bridge';
  state.revision = 0;
  inFlightTestAttemptId = null;
  fetchedForResults = false;
  listeners.clear();
}
