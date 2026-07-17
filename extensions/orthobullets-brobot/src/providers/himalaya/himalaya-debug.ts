import type { HimalayaPageMode, HimalayaQuestionSnapshot } from './himalaya-types.js';

function isDebugEnabled() {
  try {
    return localStorage.getItem('snaportho_brobot_debug') === '1';
  } catch {
    return false;
  }
}

export function logHimalayaExtraction(input: {
  url: string;
  pageMode: HimalayaPageMode;
  rootFound: boolean;
  questionCount: number;
  activeQuestionFound: boolean;
  snapshot: HimalayaQuestionSnapshot | null;
}) {
  if (!isDebugEnabled()) return;
  const snapshot = input.snapshot;
  console.debug('[BroBot][Himalaya] extraction', {
    url: input.url,
    pageMode: input.pageMode,
    rootFound: input.rootFound,
    questionCount: input.questionCount,
    activeQuestionFound: input.activeQuestionFound,
    stemLength: snapshot?.stem.length ?? 0,
    choiceCount: snapshot?.choices.length ?? 0,
    selectedCount: snapshot?.choices.filter((choice) => choice.selected).length ?? 0,
    correctCount: snapshot?.choices.filter((choice) => choice.correct === true).length ?? 0,
    explanationLength: snapshot?.explanation?.length ?? 0,
    keyPointsLength: snapshot?.keyReferencePoints?.length ?? 0,
    referenceLength: snapshot?.references?.length ?? 0,
    reviewState: snapshot?.reviewState ?? 'unknown',
    fingerprint: snapshot?.fingerprint ?? null,
  });
}

export function installHimalayaDebugInspector(documentRef: Document) {
  try {
    if (localStorage.getItem('snaportho_brobot_debug') !== '1') return;
  } catch {
    return;
  }

  const windowRef = window as typeof window & {
    __BROBOT_HIMALAYA_DEBUG__?: { inspect: () => unknown };
  };
  windowRef.__BROBOT_HIMALAYA_DEBUG__ = {
    inspect: () => ({
      url: window.location.href,
      questionAttempts: Array.from(documentRef.querySelectorAll('.question-attempt')).map((node, index) => ({
        index,
        className: node.getAttribute('class'),
        textLength: (node.textContent ?? '').replace(/\s+/g, ' ').trim().length,
        visible: node instanceof HTMLElement ? window.getComputedStyle(node).display !== 'none' : null,
      })),
      stems: Array.from(documentRef.querySelectorAll('.stem, [class*="stem" i], [data-testid*="stem" i]')).length,
      answers: Array.from(documentRef.querySelectorAll('.answer, [class*="answer" i], [data-testid*="answer" i]')).length,
      feedback: Array.from(documentRef.querySelectorAll('.feedback, .keyReferencePoints, .reference')).length,
    }),
  };
}
