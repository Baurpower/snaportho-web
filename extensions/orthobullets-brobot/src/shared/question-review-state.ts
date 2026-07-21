import type { OrthobulletsPageContext } from './types.js';

export type InferredQuestionState = 'unanswered' | 'answered_review' | 'unknown';
export type QuestionTutorPrimaryAction = 'hint' | 'explain' | 'unavailable';

export type QuestionReviewSignals = {
  hasVisibleExplanation: boolean;
  hasVisibleReviewMarker: boolean;
  hasSubmittedAnswerState: boolean;
  visibleUnansweredPrompt: boolean;
  unansweredOverrideApplied: boolean;
  reviewScore: number;
  unansweredScore: number;
  reviewEvidence: string[];
  unansweredEvidence: string[];
  visiblePreferredResponseActive: boolean;
  visiblePreferredResponseEnabled: boolean;
  visibleExplanationTextLength: number;
  visibleSelectedAnswerReviewClass: boolean;
  visibleCorrectAnswerReviewClass: boolean;
  visibleDistributionRows: number;
};

type VisibleElementLike = {
  nodeName?: string;
  tagName?: string;
  textContent?: string | null;
  getAttribute(name: string): string | null;
  parentElement?: VisibleElementLike | null;
  parentNode?: VisibleElementLike | null;
  children?: ArrayLike<VisibleElementLike>;
  offsetParent?: VisibleElementLike | null;
  getBoundingClientRect?(): {
    width: number; height: number; top?: number; bottom?: number; left?: number; right?: number;
  };
};

type DocumentLike = {
  querySelector(selector: string): VisibleElementLike | null;
  querySelectorAll(selector: string): ArrayLike<VisibleElementLike>;
};

const HIDDEN_CLASS_PATTERN =
  /\b(hidden|d-none|collapse|collapsed|ng-hide|visually-hidden|sr-only|invisible|display-none|u-hidden|is-hidden)\b/i;

const EXPLANATION_SELECTORS = [
  '[id$="-prefered"] .text',
  '.preferredResponse .question-notes-section-text .text',
  '.preferredResponse__content .text',
  '[id*="lblPreferredResponse"]',
  '[id*="litPreferredResponse"]',
  '.preferred-response',
  '.answer-explanation',
  '[data-testid="question-explanation"]',
  '.question-explanation',
  '#explanation',
];

const PREFERRED_SECTION_SELECTORS = [
  '.preferredResponse[data-correct]',
  '[class*="preferredResponse" i][data-correct]',
];
const PREFERRED_CONTROL_SELECTORS = [
  '[class*="preferredResponse" i]',
  '[id*="preferredResponse" i]',
  '[id*="preferred-response" i]',
  '[aria-controls*="prefer" i]',
  '[data-target*="prefer" i]',
];

const REVIEW_FEEDBACK_SELECTORS = [
  '[class*="toast" i]',
  '[class*="feedback" i]',
  '.review-message',
  '.question-feedback',
  '[data-testid="review-feedback"]',
];

const CHOICE_ROW_SELECTORS = [
  '.answerItem',
  '.answer-choice',
  '.question-answers li',
  '[data-testid="answer-choice"]',
  '.choice-row',
];

const REVIEW_CHOICE_CLASS_NAMES = ['right', 'wrong', 'correct', 'preferred-choice'];
const ACTIVE_ONLY_CLASS_NAMES = ['selected', 'user-selected', 'active', 'checked'];

const PERCENT_SELECTORS = ['.preferred .percent', '.percent', '.answer-percent', '[id*="lblPercent"]'];

function normalizeWhitespace(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function isSelectAnswerPlaceholderText(value: string | null | undefined) {
  const text = normalizeWhitespace(value).toLowerCase();
  if (!text) return false;
  return (
    /select answer to see preferred response/i.test(text) ||
    (/select answer/i.test(text) && /preferred response/i.test(text)) ||
    text === 'select answer' ||
    text === 'preferred response'
  );
}

export function detectVisibleUnansweredPrompt(root: DocumentLike) {
  const isPrompt = (value: string | null | undefined) => {
    const text = normalizeWhitespace(value);
    return /select answer to see preferred response/i.test(text) ||
      (/select answer/i.test(text) && /preferred response/i.test(text));
  };
  for (const node of Array.from(root.querySelectorAll('*'))) {
    if (!isPrompt(node.textContent)) continue;
    // A container inherits hidden descendants through textContent. Only evaluate
    // the smallest matching element, whose own visibility can be trusted.
    if (Array.from(node.children ?? []).some((child) => isPrompt(child.textContent))) continue;
    if (isElementVisible(node)) return true;
  }
  return false;
}

function classTokens(className: string) {
  return className.toLowerCase().split(/\s+/).filter(Boolean);
}

function hasReviewChoiceClass(className: string) {
  const tokens = classTokens(className);
  return REVIEW_CHOICE_CLASS_NAMES.some((name) => tokens.includes(name));
}

function hasActiveOnlyClass(className: string) {
  const tokens = classTokens(className);
  return tokens.some((token) => ACTIVE_ONLY_CLASS_NAMES.includes(token)) && !hasReviewChoiceClass(className);
}

export function isElementVisible(element: VisibleElementLike | null | undefined): boolean {
  if (!element) return false;

  let current: VisibleElementLike | null | undefined = element;
  while (current) {
    const tag = (current.tagName ?? current.nodeName ?? '').toLowerCase();
    if (tag === 'html') break;

    if (current.getAttribute('hidden') != null) return false;

    const ariaHidden = current.getAttribute('aria-hidden')?.toLowerCase();
    if (ariaHidden === 'true') return false;

    const className = current.getAttribute('class') ?? '';
    if (HIDDEN_CLASS_PATTERN.test(className)) return false;

    const style = current.getAttribute('style') ?? '';
    if (/display\s*:\s*none/i.test(style)) return false;
    if (/visibility\s*:\s*hidden/i.test(style)) return false;
    if (/opacity\s*:\s*0(?:\.0+)?(?:\s|;|$)/i.test(style)) return false;

    current = current.parentElement ?? current.parentNode ?? null;
  }

  if (typeof element.getBoundingClientRect === 'function') {
    const rect = element.getBoundingClientRect();
    // Lightweight DOM parsers expose a zeroed rect without performing layout.
    // In browsers, offsetParent is present and makes the zero-size result meaningful.
    if (element.offsetParent !== undefined && rect.width <= 0 && rect.height <= 0) return false;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
    if (
      viewportWidth > 0 && viewportHeight > 0 &&
      ((rect.bottom ?? 1) <= 0 || (rect.right ?? 1) <= 0 ||
        (rect.top ?? 0) >= viewportHeight || (rect.left ?? 0) >= viewportWidth)
    ) return false;
  }

  return normalizeWhitespace(element.textContent).length > 0 || Boolean(element.getAttribute('data-correct'));
}

function queryFirstVisible(root: DocumentLike, selectors: readonly string[]) {
  for (const selector of selectors) {
    const nodes = Array.from(root.querySelectorAll(selector));
    for (const node of nodes) {
      if (isElementVisible(node)) return node;
    }
  }
  return null;
}

function queryAnyVisible(root: DocumentLike, selectors: readonly string[]) {
  return Boolean(queryFirstVisible(root, selectors));
}

export function hasVisibleExplanation(root: DocumentLike, minChars = 20) {
  const node = queryFirstVisible(root, EXPLANATION_SELECTORS);
  if (!node) return false;
  const text = normalizeWhitespace(node.textContent);
  if (isSelectAnswerPlaceholderText(text)) return false;
  return text.length >= minChars;
}

function visibleExplanationTextLength(root: DocumentLike) {
  const node = queryFirstVisible(root, EXPLANATION_SELECTORS);
  const text = normalizeWhitespace(node?.textContent);
  return isSelectAnswerPlaceholderText(text) ? 0 : text.length;
}

function preferredResponseState(root: DocumentLike) {
  let active = false;
  let enabled = false;
  for (const selector of PREFERRED_CONTROL_SELECTORS) {
    for (const node of Array.from(root.querySelectorAll(selector))) {
      if (!isElementVisible(node) || isSelectAnswerPlaceholderText(node.textContent)) continue;
      const className = node.getAttribute('class') ?? '';
      const ariaDisabled = node.getAttribute('aria-disabled')?.toLowerCase();
      const disabled = node.getAttribute('disabled') != null;
      enabled ||= !disabled && ariaDisabled !== 'true';
      active ||= /\b(active|selected|show|open)\b/i.test(className) ||
        node.getAttribute('aria-selected') === 'true' ||
        node.getAttribute('aria-expanded') === 'true';
    }
  }
  return { active, enabled };
}

function visibleChoiceReviewState(root: DocumentLike) {
  let selected = false;
  let correct = false;
  for (const selector of CHOICE_ROW_SELECTORS) {
    for (const node of Array.from(root.querySelectorAll(selector))) {
      if (!isElementVisible(node)) continue;
      const className = node.getAttribute('class') ?? '';
      const tokens = classTokens(className);
      selected ||= tokens.some((token) => ACTIVE_ONLY_CLASS_NAMES.includes(token)) &&
        (hasReviewChoiceClass(className) || node.getAttribute('data-correct') != null);
      correct ||= tokens.some((token) => ['right', 'correct', 'preferred-choice'].includes(token)) ||
        node.getAttribute('data-correct') === 'true';
    }
  }
  return { selected, correct };
}

export function hasVisibleReviewMarker(root: DocumentLike) {
  for (const selector of PREFERRED_SECTION_SELECTORS) {
    const nodes = Array.from(root.querySelectorAll(selector));
    for (const node of nodes) {
      if (!isElementVisible(node)) continue;
      const text = normalizeWhitespace(node.textContent);
      if (isSelectAnswerPlaceholderText(text)) continue;
      if (node.getAttribute('data-correct') || text.length >= 20) return true;
    }
  }

  if (queryAnyVisible(root, REVIEW_FEEDBACK_SELECTORS)) return true;

  for (const selector of CHOICE_ROW_SELECTORS) {
    const nodes = Array.from(root.querySelectorAll(selector));
    for (const node of nodes) {
      if (!isElementVisible(node)) continue;
      const className = node.getAttribute('class') ?? '';
      if (hasReviewChoiceClass(className) && !hasActiveOnlyClass(className)) return true;
      if (className.toLowerCase().includes('wrong')) return true;
    }
  }

  return false;
}

function hasVisibleReviewFeedback(root: DocumentLike) {
  for (const selector of REVIEW_FEEDBACK_SELECTORS) {
    for (const node of Array.from(root.querySelectorAll(selector))) {
      if (isElementVisible(node) && /\b(correct|incorrect)\b/i.test(normalizeWhitespace(node.textContent))) {
        return true;
      }
    }
  }
  return false;
}

function visiblePercentDistributionRows(root: DocumentLike) {
  const seen = new Set<VisibleElementLike>();
  for (const selector of PERCENT_SELECTORS) {
    const nodes = Array.from(root.querySelectorAll(selector));
    for (const node of nodes) {
      if (!isElementVisible(node)) continue;
      if (/\d+(?:\.\d+)?\s*%/.test(normalizeWhitespace(node.textContent))) seen.add(node);
    }
  }
  return seen.size;
}

function hasVisiblePercentDistribution(root: DocumentLike) {
  return visiblePercentDistributionRows(root) > 0;
}

export function hasSubmittedAnswerState(
  root: DocumentLike | null,
  context: Pick<
    OrthobulletsPageContext,
    'pageKind' | 'pageUrl' | 'answerChoices' | 'explanationText' | 'explanation' | 'questionReviewSignals'
  >
) {
  const signals = context.questionReviewSignals;
  if (signals) return signals.hasSubmittedAnswerState;

  if (root) {
    return (
      hasVisibleReviewMarker(root) ||
      hasVisibleExplanation(root) ||
      hasVisiblePercentDistribution(root)
    );
  }

  return false;
}

export function computeQuestionReviewSignals(
  root: DocumentLike,
  context: Pick<OrthobulletsPageContext, 'pageKind' | 'pageUrl' | 'answerChoices' | 'explanationText' | 'explanation'>
): QuestionReviewSignals {
  const visibleUnansweredPrompt = detectVisibleUnansweredPrompt(root);
  const preferred = preferredResponseState(root);
  const choices = visibleChoiceReviewState(root);
  const explanationLength = visibleExplanationTextLength(root);
  const distributionRows = visiblePercentDistributionRows(root);
  const hasVisibleExplanationSignal = hasVisibleExplanation(root);
  const hasVisibleReviewMarkerSignal = hasVisibleReviewMarker(root);
  const reviewEvidence: string[] = [];
  if (choices.selected) reviewEvidence.push('selected_answer_review_class');
  if (choices.correct) reviewEvidence.push('correct_answer_review_class');
  if (distributionRows > 0) reviewEvidence.push('distribution_rows');
  if (preferred.active) reviewEvidence.push('preferred_response_active');
  if (preferred.enabled) reviewEvidence.push('preferred_response_enabled');
  if (explanationLength > 0) reviewEvidence.push('explanation_text');
  if (hasVisibleReviewFeedback(root)) reviewEvidence.push('correct_incorrect_feedback');

  const unansweredEvidence: string[] = [];
  if (visibleUnansweredPrompt) unansweredEvidence.push('unanswered_prompt');
  if (!choices.selected && !choices.correct) unansweredEvidence.push('no_review_answer_styling');
  if (distributionRows === 0) unansweredEvidence.push('no_distribution_rows');
  if (!preferred.enabled) unansweredEvidence.push('preferred_response_disabled');
  if (explanationLength === 0) unansweredEvidence.push('no_explanation_text');

  const reviewScore = reviewEvidence.length;
  const unansweredScore = unansweredEvidence.length;
  const unansweredOverrideApplied = visibleUnansweredPrompt && reviewScore === 0;

  return {
    hasVisibleExplanation: hasVisibleExplanationSignal,
    hasVisibleReviewMarker: hasVisibleReviewMarkerSignal,
    hasSubmittedAnswerState: reviewScore >= 2,
    visibleUnansweredPrompt,
    unansweredOverrideApplied,
    reviewScore,
    unansweredScore,
    reviewEvidence,
    unansweredEvidence,
    visiblePreferredResponseActive: preferred.active,
    visiblePreferredResponseEnabled: preferred.enabled,
    visibleExplanationTextLength: explanationLength,
    visibleSelectedAnswerReviewClass: choices.selected,
    visibleCorrectAnswerReviewClass: choices.correct,
    visibleDistributionRows: distributionRows,
  };
}

export function attachQuestionReviewSignals(
  root: DocumentLike,
  context: OrthobulletsPageContext
): OrthobulletsPageContext {
  return {
    ...context,
    questionReviewSignals: computeQuestionReviewSignals(root, context),
  };
}

export function hasVisibleReviewData(context: OrthobulletsPageContext | null): boolean {
  if (!context) return false;
  if (context.mode === 'curriculum_content') return true;

  const signals = context.questionReviewSignals;
  if (signals) return signals.reviewScore >= 2;

  return false;
}

export function inferQuestionState(context: OrthobulletsPageContext | null): InferredQuestionState {
  if (!context) return 'unknown';
  if (context.mode !== 'question') return 'unknown';
  if (!context.stem?.trim() || context.answerChoices.length < 2) return 'unknown';
  const signals = context.questionReviewSignals;
  if (!signals) return 'unanswered';
  if (signals.reviewScore >= 2) return 'answered_review';
  if (signals.visibleUnansweredPrompt && signals.reviewScore === 0) return 'unanswered';
  if (signals.unansweredScore >= 2) return 'unanswered';
  return 'unknown';
}

export function inferQuestionStateBlockedReason(context: OrthobulletsPageContext | null): string | null {
  if (!context) return 'missing_page_context';
  if (context.mode !== 'question') return 'not_question_mode';
  if (!context.stem?.trim()) return 'stem_not_visible';
  if (context.answerChoices.length < 2) return 'answer_choices_not_visible';
  return null;
}

export function resolveQuestionTutorPrimaryAction(context: OrthobulletsPageContext | null): QuestionTutorPrimaryAction {
  if (!context) return 'unavailable';
  if (context.mode === 'curriculum_content') return 'explain';

  const state = inferQuestionState(context);
  if (state === 'answered_review') return 'explain';
  if (state === 'unanswered') return 'hint';
  return 'unavailable';
}

export function buildReviewStateKey(context: OrthobulletsPageContext): string {
  const state = inferQuestionState(context);
  const signals = context.questionReviewSignals;
  return [
    state,
    String(signals?.reviewScore ?? 0),
    String(signals?.unansweredScore ?? 0),
    signals?.visiblePreferredResponseActive ? '1' : '0',
    // Exact normalized teaching-text length lets AJAX-loaded discussion and
    // "Show More" expansion refresh without changing the question identity.
    String(signals?.visibleExplanationTextLength ?? 0),
    String(signals?.visibleDistributionRows ?? 0),
    signals?.visibleSelectedAnswerReviewClass ? '1' : '0',
    signals?.visibleCorrectAnswerReviewClass ? '1' : '0',
    signals?.visibleUnansweredPrompt ? '1' : '0',
  ].join(':');
}

export function firstVisibleText(root: DocumentLike, selectors: readonly string[], minChars = 1) {
  const node = queryFirstVisible(root, selectors);
  if (!node) return undefined;
  const text = normalizeWhitespace(node.textContent);
  return text.length >= minChars ? text : undefined;
}
