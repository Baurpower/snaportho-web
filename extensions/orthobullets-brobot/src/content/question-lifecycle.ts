import { detectQuestionProvider, extractQuestionContext } from './extractor.js';
import { buildReviewStateKey } from '../shared/question-review-state.js';
import { fingerprintFromPageContext } from '../shared/question-fingerprint.js';
import type { QuestionChangeMessage, VisibleQuestionIdentity } from '../shared/messages.js';

const DEBOUNCE_MS = 120;
const QUESTION_CLOCK_MS = 350;
const DOM_SETTLE_MS = 300;

type DocumentLike = {
  locationHref?: string;
  body: { innerText?: string | null };
  querySelector(selector: string): ElementLike | null;
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
};

type ElementLike = {
  textContent: string | null;
  getAttribute(name: string): string | null;
  closest?(selector: string): ElementLike | null;
  querySelector?(selector: string): ElementLike | null;
  classList?: { contains(name: string): boolean };
};

function normalizeText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function isIgnorableMutationTarget(target: Node | ElementLike): boolean {
  const element = target as Element;
  if (typeof element.closest !== 'function') return false;
  const dialog = element.closest('[role="dialog"], [aria-modal="true"], [class*="modal" i]') as ElementLike | null;
  if (dialog) {
    const hasQuestionContent = Boolean(dialog.querySelector?.(
      '.stem, [class*="stem" i], [class*="question-text" i], [class*="question-content" i], [role="radio"], .answer'
    ));
    if (!hasQuestionContent) return true;
  }
  // Review dialogs are the primary document on Himalaya results pages. Only
  // ignore image-only overlays; modal mutations must trigger re-extraction.
  if (element.closest('[class*="lightbox" i], [class*="zoom" i], [class*="magnify" i]')) {
    return true;
  }
  if (element.closest('[class*="sidebar" i], [class*="side-panel" i], [id*="brobot" i]')) {
    return true;
  }
  if (element.closest('[class*="countdown" i], [class*="timer" i]')) {
    return true;
  }
  return false;
}

function findQuestionWatchRoot(document: DocumentLike): ElementLike | null {
  const selectors = [
    '[role="dialog"]',
    '[aria-modal="true"]',
    '.modal.show',
    '[class*="modal-dialog" i]',
    'section.question',
    '.question-page',
    '[data-testid="question-page"]',
    '.qbank-question',
    '.question-attempt',
    '[class*="question-attempt" i]',
    '.question',
    'main',
    'body',
  ];
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (node) return node;
  }
  return null;
}

function extractQuestionPositionLabel(document: DocumentLike): string | null {
  const selectors = [
    '[class*="question-progress" i]',
    '[class*="questionProgress" i]',
    '[class*="test-progress" i]',
    '[class*="question-number" i]',
    '[class*="questionNumber" i]',
    '.current-question',
  ];
  for (const selector of selectors) {
    const nodes = Array.from(document.querySelectorAll(selector));
    for (const node of nodes) {
      const text = normalizeText(node.textContent);
      if (/question\s+\d+\s+of\s+\d+/i.test(text)) {
        return text.match(/question\s+\d+\s+of\s+\d+/i)?.[0] ?? text;
      }
      if (/^\d+\s+of\s+\d+$/i.test(text)) return `Question ${text}`;
      if (/^\d+\s*\/\s*\d+$/.test(text)) {
        const [current, total] = text.split('/').map((part) => part.trim());
        if (current && total) return `Question ${current} of ${total}`;
      }
    }
  }

  const bodyText = normalizeText(document.body.innerText ?? '');
  const match = bodyText.match(/Question\s+(\d+)\s+of\s+(\d+)/i);
  if (match) return `Question ${match[1]} of ${match[2]}`;
  return null;
}

export function getVisibleQuestionIdentity(document: Document, pageUrl: string): {
  identity: VisibleQuestionIdentity;
  activeQuestionKey: string;
  pageContext: ReturnType<typeof extractQuestionContext>;
} | null {
  const provider = detectQuestionProvider({ document: document as never, pageUrl });
  if (!provider) return null;
  const pageContext = extractQuestionContext({ document: document as never, pageUrl });
  if (!pageContext) return null;
  if (pageContext.provider === 'himalaya' && pageContext.pageKind === 'results-overview') {
    const identity: VisibleQuestionIdentity = {
      questionPositionLabel: null,
      questionNumber: null,
      questionId: null,
      testId: 'himalaya-results-overview',
      day: null,
      stemHash: 'overview',
      answerChoiceHash: 'overview',
      imageHash: '',
    };
    return {
      identity,
      activeQuestionKey: 'himalaya:results-overview',
      pageContext,
    };
  }
  if (pageContext.mode !== 'question') return null;
  const stem = normalizeText(pageContext.stem);
  const answerChoiceText = pageContext.answerChoices.map((choice) => `${choice.key}:${normalizeText(choice.text)}`).join('|');
  if (!stem || pageContext.answerChoices.length < 2) return null;

  const questionPositionLabel = extractQuestionPositionLabel(document as unknown as DocumentLike);
  const questionNumberMatch = questionPositionLabel?.match(/question\s+(\d+)\s+of\s+\d+/i);
  const url = new URL(pageUrl);
  const testId = url.searchParams.get('testId') ?? url.searchParams.get('test') ?? url.searchParams.get('tid');
  const day = url.searchParams.get('day');
  const visibleQuestionImageSources = Array.from(document.querySelectorAll('img'))
    .filter((image) => Boolean(image.closest(
      'section.question, .question-page, [data-testid="question-page"], .qbank-question, .question, main'
    )))
    .filter((image) => !isIgnorableMutationTarget(image))
    .filter((image) => !image.closest(
      '[hidden], [aria-hidden="true"], .hidden, .d-none, [style*="display:none"], [style*="display: none"]'
    ))
    .map((image) => image.getAttribute('src'))
    .filter((src): src is string => Boolean(src))
    .sort()
  const imageSourceText = visibleQuestionImageSources.join('|');
  const identity: VisibleQuestionIdentity = {
    questionPositionLabel,
    questionNumber: questionNumberMatch ? Number(questionNumberMatch[1]) : null,
    questionId: pageContext.questionId ?? null,
    testId,
    day,
    stemHash: hashText(stem),
    answerChoiceHash: hashText(answerChoiceText),
    imageHash: hashText(`${visibleQuestionImageSources.length}:${imageSourceText}`),
  };
  const providerFingerprint =
    pageContext.provider === 'himalaya'
      ? String(pageContext.raw?.providerSpecific?.fingerprint ?? fingerprintFromPageContext(pageContext))
      : null;
  const activeQuestionKey = providerFingerprint ?? [
    identity.testId ?? '',
    identity.day ?? '',
    identity.questionNumber ?? '',
    identity.questionId ?? '',
    identity.stemHash,
    identity.answerChoiceHash,
    identity.imageHash,
  ].join(':');
  return { identity, activeQuestionKey, pageContext };
}

function evaluateQuestionFingerprint(document: Document, pageUrl: string) {
  const visible = getVisibleQuestionIdentity(document, pageUrl);
  if (!visible?.pageContext) return null;

  return {
    fingerprint: visible.activeQuestionKey,
    activeQuestionKey: visible.activeQuestionKey,
    visibleQuestionIdentity: visible.identity,
    questionId: visible.pageContext.questionId ?? null,
    questionPositionLabel: visible.identity.questionPositionLabel,
    pageUrl,
    reviewStateKey: buildReviewStateKey(visible.pageContext),
  };
}

export function startQuestionLifecycleWatch(document: Document, pageUrl = window.location.href) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastFingerprint: string | null = null;
  let lastQuestionId: string | null = null;
  let lastReviewStateKey: string | null = null;
  let lastVisibleQuestionIdentity: VisibleQuestionIdentity | null = null;
  let lastUrl = pageUrl;
  let observer: MutationObserver | null = null;

  function publishChange(detectedBy: 'polling' | 'mutation' | 'url') {
    const snapshot = evaluateQuestionFingerprint(document, window.location.href);
    if (!snapshot) return;

    const fingerprintChanged = snapshot.fingerprint !== lastFingerprint;
    const reviewStateChanged = snapshot.reviewStateKey !== lastReviewStateKey;
    if (!fingerprintChanged && !reviewStateChanged) return;
    const previousActiveQuestionKey = lastFingerprint;
    const previousVisibleQuestionIdentity = lastVisibleQuestionIdentity;

    const payload: QuestionChangeMessage = {
      type: 'ob:question-changed',
      fingerprint: snapshot.fingerprint,
      questionId: snapshot.questionId,
      previousFingerprint: lastFingerprint,
      previousQuestionId: lastQuestionId,
      reasonForRefresh: fingerprintChanged ? `${detectedBy}_question_identity_change` : 'review_state_change',
      refreshTimestamp: new Date().toISOString(),
      questionPositionLabel: snapshot.questionPositionLabel,
      pageUrl: snapshot.pageUrl,
      visibleQuestionIdentity: snapshot.visibleQuestionIdentity,
      previousVisibleQuestionIdentity,
      activeQuestionKey: snapshot.activeQuestionKey,
      previousActiveQuestionKey,
      questionChangeDetectedBy: detectedBy,
      settleDelayMs: fingerprintChanged ? DOM_SETTLE_MS : 0,
    };

    if (fingerprintChanged) {
      lastFingerprint = snapshot.fingerprint;
      lastQuestionId = snapshot.questionId;
      lastUrl = snapshot.pageUrl;
      lastVisibleQuestionIdentity = snapshot.visibleQuestionIdentity;
    }
    lastReviewStateKey = snapshot.reviewStateKey;

    void chrome.runtime.sendMessage(payload).catch(() => {
      // Side panel may be closed; ignore.
    });
  }

  function scheduleCheck(detectedBy: 'mutation' | 'url') {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      publishChange(detectedBy);
    }, DEBOUNCE_MS);
  }

  function seedInitialFingerprint() {
    const snapshot = evaluateQuestionFingerprint(document, window.location.href);
    if (!snapshot) return;
    lastFingerprint = snapshot.fingerprint;
    lastQuestionId = snapshot.questionId;
    lastReviewStateKey = snapshot.reviewStateKey;
    lastVisibleQuestionIdentity = snapshot.visibleQuestionIdentity;
    lastUrl = snapshot.pageUrl;
  }

  function attachObserver() {
    observer?.disconnect();
    const root = findQuestionWatchRoot(document as unknown as DocumentLike);
    if (!root || typeof MutationObserver === 'undefined') return;

    observer = new MutationObserver((records) => {
      const hasRelevantMutation = records.some((record) => {
        if (isIgnorableMutationTarget(record.target)) return false;
        return true;
      });
      if (!hasRelevantMutation) return;
      scheduleCheck('mutation');
    });

    observer.observe(root as unknown as Node, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'data-question-id', 'data-quiz-question-id', 'id', 'href',
        'class', 'style', 'hidden', 'aria-hidden', 'aria-disabled', 'disabled',
        'aria-checked', 'aria-selected', 'aria-expanded', 'data-selected', 'data-state',
        'data-correct', 'data-answer-id',
      ],
    });
  }

  seedInitialFingerprint();
  attachObserver();

  window.setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      publishChange('url');
      return;
    }
    publishChange('polling');
  }, QUESTION_CLOCK_MS);

  window.addEventListener('popstate', () => scheduleCheck('url'));
  window.addEventListener('hashchange', () => scheduleCheck('url'));

  const historyRef = window.history as History & {
    __snapOrthoBroBotPatched?: boolean;
  };
  if (!historyRef.__snapOrthoBroBotPatched) {
    historyRef.__snapOrthoBroBotPatched = true;
    const originalPushState = historyRef.pushState.bind(historyRef);
    const originalReplaceState = historyRef.replaceState.bind(historyRef);
    historyRef.pushState = (...args) => {
      originalPushState(...args);
      scheduleCheck('url');
    };
    historyRef.replaceState = (...args) => {
      originalReplaceState(...args);
      scheduleCheck('url');
    };
  }

  chrome.runtime.onMessage.addListener((message: { type?: string }, _sender: unknown, sendResponse: (response: unknown) => void) => {
    if (message?.type !== 'ob:get-question-fingerprint') return false;
    const snapshot = evaluateQuestionFingerprint(document, window.location.href);
    sendResponse({
      ok: true,
      snapshot,
      lastFingerprint,
      lastQuestionId,
    });
    return false;
  });
}
