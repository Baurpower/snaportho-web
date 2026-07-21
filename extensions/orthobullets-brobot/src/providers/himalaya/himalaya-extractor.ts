import type { OrthobulletsPageContext } from '../../shared/types.js';
import { hashText } from '../../shared/question-fingerprint.js';
import { logHimalayaExtraction } from './himalaya-debug.js';
import type { HimalayaAnswerChoice, HimalayaPageMode, HimalayaQuestionSnapshot } from './himalaya-types.js';

type DomElementLike = {
  nodeName?: string;
  tagName?: string;
  textContent: string | null;
  getAttribute(name: string): string | null;
  querySelector(selector: string): DomElementLike | null;
  querySelectorAll(selector: string): ArrayLike<DomElementLike>;
  closest?(selector: string): DomElementLike | null;
  parentElement?: DomElementLike | null;
  getBoundingClientRect?(): { width: number; height: number; top?: number; bottom?: number };
};

type DocumentLike = DomElementLike & {
  locationHref?: string;
  title?: string;
  body?: DomElementLike & { innerText?: string | null };
};

const HIMALAYA_SELECTORS = {
  questionContainer: [
    '[role="dialog"]',
    '[aria-modal="true"]',
    '.modal.show',
    '[class*="modal-dialog" i]',
    '[class*="review-dialog" i]',
    '.question-attempt',
    '[data-testid*="question" i]',
    '[class*="question-attempt" i]',
    '[class*="assessment-item" i]',
    '[class*="question" i]',
  ],
  stem: [
    '.stem',
    '[class*="stem" i]',
    '[data-testid*="stem" i]',
    '[class*="question-text" i]',
    '[class*="questionText" i]',
    '[class*="question-content" i]',
    '[class*="questionContent" i]',
    '.prompt',
  ],
  answers: [
    '.answers .answer',
    '.answer',
    '[class*="answer" i]',
    '[data-testid*="answer" i]',
    'label:has(input[type="radio"])',
    'label:has(input[type="checkbox"])',
    '[role="radio"]',
    '[role="option"]',
  ],
  answerIndex: ['.answer-index', '[class*="answer-index" i]', '[class*="answerIndex" i]'],
  answerText: ['.answer-text', '[class*="answer-text" i]', '[class*="answerText" i]', 'p', 'span'],
  explanation: ['.feedback', '[class*="feedback" i]', '[data-testid*="feedback" i]'],
  discussion: ['[role="tabpanel"][aria-label*="discussion" i]', '[class*="discussion" i]', '[data-testid*="discussion" i]'],
  keyReferencePoints: ['.keyReferencePoints', '[class*="keyReferencePoints" i]', '[class*="key-reference" i]'],
  references: ['.reference', '.references', '[class*="reference" i]', '[data-testid*="reference" i]'],
} as const;

function normalizeWhitespace(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function textOf(node: DomElementLike | null | undefined) {
  return normalizeWhitespace(node?.textContent);
}

export function isHimalayaUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase() === 'learn.aaos.org' && /\/diweb(?:\/|$)/i.test(parsed.pathname);
  } catch {
    return /learn\.aaos\.org\/diweb/i.test(url);
  }
}

export function isElementVisible(element: DomElementLike | null): boolean {
  if (!element) return false;
  if (typeof HTMLElement !== 'undefined' && element instanceof HTMLElement) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity) !== 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  let current: DomElementLike | null | undefined = element;
  while (current) {
    const className = current.getAttribute('class') ?? '';
    const style = current.getAttribute('style') ?? '';
    if (current.getAttribute('hidden') != null || current.getAttribute('aria-hidden') === 'true') return false;
    if (/\b(ng-hide|hidden|d-none|sr-only|visually-hidden)\b/i.test(className)) return false;
    if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0/i.test(style)) return false;
    current = current.parentElement ?? null;
  }
  return true;
}

function visibleText(node: DomElementLike | null | undefined) {
  return isElementVisible(node ?? null) ? textOf(node) : '';
}

function queryFirstVisible(root: DomElementLike, selectors: readonly string[]) {
  for (const selector of selectors) {
    const nodes = Array.from(root.querySelectorAll(selector));
    const node = nodes.find((candidate) => isElementVisible(candidate));
    if (node) return node;
  }
  return null;
}

function collectVisibleTexts(root: DomElementLike, selectors: readonly string[]) {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const selector of selectors) {
    for (const node of Array.from(root.querySelectorAll(selector))) {
      const text = visibleText(node);
      const key = text.toLowerCase();
      if (!text || seen.has(key)) continue;
      seen.add(key);
      values.push(text);
    }
    if (values.length) break;
  }
  return values;
}

function textAfterHeading(root: DomElementLike, headingPattern: RegExp) {
  const nodes = Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,strong,b,div,p,section'));
  for (const node of nodes) {
    const text = visibleText(node);
    if (!headingPattern.test(text)) continue;
    const parentText = visibleText(node.parentElement ?? null);
    const cleaned = parentText.replace(text, '').trim();
    if (cleaned.length >= 10) return cleaned;
  }
  return '';
}

function detectHimalayaPageMode(documentRef: DocumentLike): HimalayaPageMode {
  const bodyText = normalizeWhitespace(documentRef.body?.innerText ?? documentRef.textContent);
  const hasQuestion = Array.from(documentRef.querySelectorAll(HIMALAYA_SELECTORS.questionContainer.join(','))).some((node) => {
    const stem = queryFirstVisible(node, HIMALAYA_SELECTORS.stem);
    const answers = Array.from(node.querySelectorAll(HIMALAYA_SELECTORS.answers.join(','))).filter(isElementVisible);
    return Boolean(stem && answers.length >= 2);
  });
  if (hasQuestion) {
    if (bodyText.match(/\b(feedback|discussion|key reference points|references|correct|incorrect|your answer|show more)\b/i)) {
      return 'reviewed-question';
    }
    return 'active-question';
  }
  if (
    /^Results:/i.test(bodyText) ||
    /\bResults:\s*Posttest/i.test(bodyText) ||
    /\bQuestions:\b/i.test(bodyText) ||
    /Each box below represents a question/i.test(bodyText) ||
    /\b(CORRECT|INCORRECT|UNANSWERED)\b/.test(bodyText)
  ) {
    return 'results-overview';
  }
  return 'unknown';
}

function countOverviewQuestionTiles(documentRef: DocumentLike) {
  const nodes = Array.from(documentRef.querySelectorAll('button, a, [role="button"], [class*="question" i]'));
  return nodes.filter((node) => {
    const text = visibleText(node) || normalizeWhitespace(node.getAttribute('aria-label'));
    return /\b(CORRECT|INCORRECT|UNANSWERED)\b/i.test(text) || /^[✓✕xX]?\s*\d{1,3}$/.test(text);
  }).length;
}

function containerScore(node: DomElementLike) {
  let score = 0;
  const className = normalizeWhitespace(node.getAttribute('class')).toLowerCase();
  const text = visibleText(node).toLowerCase();
  if (/\b(active|expanded|selected|current|show|open)\b/.test(className)) score += 20;
  if (/\b(feedback|key reference points|references|your answer|correct|incorrect)\b/.test(text)) score += 10;
  if (queryFirstVisible(node, HIMALAYA_SELECTORS.stem)) score += 5;
  const answerCount = Array.from(node.querySelectorAll(HIMALAYA_SELECTORS.answers.join(','))).filter(isElementVisible).length;
  score += Math.min(answerCount, 6);
  if (typeof window !== 'undefined' && typeof node.getBoundingClientRect === 'function') {
    const rect = node.getBoundingClientRect();
    const center = (rect.top ?? 0) + (rect.height ?? 0) / 2;
    const viewportCenter = window.innerHeight / 2;
    score -= Math.abs(center - viewportCenter) / 1000;
  }
  return score;
}

function findActiveQuestionContainer(documentRef: DocumentLike) {
  const candidates = Array.from(documentRef.querySelectorAll(HIMALAYA_SELECTORS.questionContainer.join(',')))
    .filter(isElementVisible)
    .filter((node) => queryFirstVisible(node, HIMALAYA_SELECTORS.stem))
    .filter((node) => Array.from(node.querySelectorAll(HIMALAYA_SELECTORS.answers.join(','))).filter(isElementVisible).length >= 2);

  candidates.sort((a, b) => containerScore(b) - containerScore(a));
  return { active: candidates[0] ?? null, candidates };
}

function cleanAnswerText(raw: string, label?: string) {
  let text = normalizeWhitespace(raw)
    .replace(/\b(your answer|selected answer|correct answer|incorrect answer|correct|incorrect)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (label) {
    text = text.replace(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\).:\\s-]+`, 'i'), '').trim();
  }
  return text;
}

function detectChoiceLabel(node: DomElementLike, index: number) {
  const indexText = HIMALAYA_SELECTORS.answerIndex
    .map((selector) => textOf(node.querySelector(selector)))
    .find(Boolean);
  const attr =
    normalizeWhitespace(node.getAttribute('data-answer-label')) ||
    normalizeWhitespace(node.getAttribute('data-choice-label')) ||
    normalizeWhitespace(node.getAttribute('aria-label')).match(/^([A-H])[\).\s:-]+/)?.[1] ||
    '';
  const fromText = textOf(node).match(/^([A-H])[\).\s:-]+/)?.[1];
  return (indexText || attr || fromText || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[index] || String(index + 1)).replace(/[^A-Za-z0-9]/g, '').slice(0, 3);
}

function visibleMarker(node: DomElementLike, selectors: string[]) {
  return selectors.some((selector) => Array.from(node.querySelectorAll(selector)).some(isElementVisible));
}

function detectAnswerState(node: DomElementLike) {
  const className = normalizeWhitespace(node.getAttribute('class')).toLowerCase();
  const text = visibleText(node).toLowerCase();
  const aria = normalizeWhitespace(node.getAttribute('aria-label')).toLowerCase();
  const title = normalizeWhitespace(node.getAttribute('title')).toLowerCase();
  const dataStatus = normalizeWhitespace(node.getAttribute('data-status')).toLowerCase();
  const markerText = [className, text, aria, title, dataStatus].join(' ');
  const selected =
    /\b(your-answer|your answer|selected|you chose|chosen)\b/i.test(markerText) ||
    node.getAttribute('aria-checked') === 'true' ||
    node.querySelector('input:checked') != null;
  const incorrect =
    /(?:^|[\s_-])(incorrect|wrong|times-circle)(?:$|[\s_-])/i.test(markerText) ||
    visibleMarker(node, ['.fa-times-circle', '[class*="times-circle" i]', '[aria-label*="incorrect" i]', '[title*="incorrect" i]']);
  const correct = !incorrect && (
    /\b(correct-answer|correct answer|right answer)\b/i.test(markerText) ||
    /(?:^|[\s_-])(correct|right)(?:$|[\s_-])/i.test(className) ||
    node.getAttribute('data-correct') === 'true' ||
    visibleMarker(node, ['.fa-check-circle', '[class*="check" i]', '[aria-label="correct" i]', '[title="correct" i]'])
  );
  return { selected, correct: correct ? true : incorrect ? false : undefined };
}

function extractChoices(container: DomElementLike) {
  const seen = new Set<string>();
  const choices: HimalayaAnswerChoice[] = [];
  const rawNodes = Array.from(container.querySelectorAll(HIMALAYA_SELECTORS.answers.join(',')))
    .filter(isElementVisible)
    .filter((node) => !/\banswers\b/i.test(node.getAttribute('class') ?? ''));
  const nodes = rawNodes.filter((node) => {
    let parent = node.parentElement;
    while (parent && parent !== container) {
      if (rawNodes.includes(parent)) return false;
      parent = parent.parentElement;
    }
    return true;
  });
  nodes.forEach((node, index) => {
    const label = detectChoiceLabel(node, index);
    const scopedText = HIMALAYA_SELECTORS.answerText
      .map((selector) => visibleText(node.querySelector(selector)))
      .find((value) => value && value.length > 1);
    const text = cleanAnswerText(scopedText || visibleText(node), label);
    if (!text || text.length < 2) return;
    const key = `${label}|${text}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const state = detectAnswerState(node);
    choices.push({
      id: label || String(index + 1),
      label,
      text,
      selected: state.selected,
      correct: state.correct,
    });
  });
  return choices;
}

function questionNumberFromPage(container: DomElementLike, pageUrl: string) {
  const text = visibleText(container);
  const fromText = text.match(/\bQuestion\s+(\d+)\b/i)?.[1] ?? text.match(/^\s*(\d{1,3})[\).]/)?.[1];
  if (fromText) return fromText;
  return pageUrl.match(/[?&](?:question|questionNumber|qid)=([A-Za-z0-9.-]+)/i)?.[1];
}

function questionPositionFromPage(container: DomElementLike, documentRef: DocumentLike) {
  const text = `${visibleText(container)} ${normalizeWhitespace(documentRef.body?.innerText)}`;
  const match = text.match(/\bQuestion\s+(\d+)\s+(?:of|\/)\s*(\d+)\b/i);
  return { questionNumber: match?.[1], totalQuestions: match?.[2] };
}

function extractAssessmentTitle(documentRef: DocumentLike) {
  const bodyText = normalizeWhitespace(documentRef.body?.innerText);
  return bodyText.match(/\bResults:\s*([^|]+?)(?=\s+Question\s+\d+\s+of\s+\d+|$)/i)?.[1]?.trim()
    || normalizeWhitespace(documentRef.title)
    || undefined;
}

function questionIdFromPage(container: DomElementLike, pageUrl: string) {
  const attrNode = container.querySelector('[data-question-id], [data-assessment-item-id], [id*="question" i]');
  const attr =
    normalizeWhitespace(attrNode?.getAttribute('data-question-id')) ||
    normalizeWhitespace(attrNode?.getAttribute('data-assessment-item-id')) ||
    normalizeWhitespace(container.getAttribute('data-question-id'));
  if (attr) return attr;
  return pageUrl.match(/[?&](?:questionId|question_id|qid)=([A-Za-z0-9.-]+)/i)?.[1];
}

function buildFingerprint(input: {
  questionId?: string;
  questionNumber?: string;
  stem: string;
  choices: HimalayaAnswerChoice[];
  mode?: string;
}) {
  const normalized = JSON.stringify({
    provider: 'himalaya',
    questionId: input.questionId ?? '',
    questionNumber: input.questionNumber ?? '',
    stem: normalizeWhitespace(input.stem).toLowerCase(),
    choices: input.choices.map((choice) => ({
      label: choice.label ?? '',
      text: normalizeWhitespace(choice.text).toLowerCase(),
    })),
    mode: input.mode ?? '',
  });
  return `himalaya:${hashText(normalized)}`;
}

function extractSection(container: DomElementLike, selectors: readonly string[], headingFallback: RegExp) {
  const selectorText = collectVisibleTexts(container, selectors).join('\n\n');
  if (selectorText) return selectorText;
  return textAfterHeading(container, headingFallback);
}

export function extractHimalayaQuestionSnapshot(input: {
  document: DocumentLike;
  pageUrl?: string;
}): { pageMode: HimalayaPageMode; snapshot: HimalayaQuestionSnapshot | null; questionCount: number } {
  const pageUrl = input.pageUrl ?? input.document.locationHref ?? '';
  const pageMode = detectHimalayaPageMode(input.document);
  const { active, candidates } = findActiveQuestionContainer(input.document);
  let snapshot: HimalayaQuestionSnapshot | null = null;

  if (active && (pageMode === 'reviewed-question' || pageMode === 'active-question')) {
    const stem = visibleText(queryFirstVisible(active, HIMALAYA_SELECTORS.stem));
    const choices = extractChoices(active);
    const explanation = extractSection(active, HIMALAYA_SELECTORS.explanation, /^(feedback|explanation)$/i);
    const discussion = extractSection(active, HIMALAYA_SELECTORS.discussion, /^discussion$/i);
    const keyReferencePoints = extractSection(active, HIMALAYA_SELECTORS.keyReferencePoints, /^key reference points?$/i);
    const references = extractSection(active, HIMALAYA_SELECTORS.references, /^references?$/i);
    const answeredReview =
      Boolean(explanation) ||
      Boolean(keyReferencePoints) ||
      choices.some((choice) => choice.correct !== undefined);
    const reviewState = answeredReview
      ? 'answered_review'
      : choices.some((choice) => choice.selected)
        ? 'selected'
        : pageMode === 'active-question'
          ? 'unanswered'
          : 'unknown';
    const questionId = questionIdFromPage(active, pageUrl);
    const position = questionPositionFromPage(active, input.document);
    const questionNumber = position.questionNumber ?? questionNumberFromPage(active, pageUrl);
    snapshot = {
      provider: 'himalaya',
      pageMode: answeredReview ? 'reviewed-question' : 'active-question',
      questionId,
      questionNumber,
      totalQuestions: position.totalQuestions,
      assessmentTitle: extractAssessmentTitle(input.document),
      stem,
      choices,
      explanation: explanation || undefined,
      discussion: discussion || undefined,
      keyReferencePoints: keyReferencePoints || undefined,
      references: references || undefined,
      reviewState,
      fingerprint: buildFingerprint({ questionId, questionNumber, stem, choices, mode: answeredReview ? 'review' : 'live' }),
    };
  }

  const effectiveQuestionCount = pageMode === 'results-overview'
    ? countOverviewQuestionTiles(input.document)
    : candidates.length;

  logHimalayaExtraction({
    url: pageUrl,
    pageMode,
    rootFound: Boolean(input.document.querySelector('main, [role="main"], body')),
    questionCount: effectiveQuestionCount,
    activeQuestionFound: Boolean(active),
    snapshot,
  });

  return { pageMode, snapshot, questionCount: effectiveQuestionCount };
}

export function extractHimalayaPageContext(input: {
  document: DocumentLike;
  pageUrl?: string;
}): OrthobulletsPageContext | null {
  const pageUrl = input.pageUrl ?? input.document.locationHref ?? '';
  const { pageMode, snapshot, questionCount } = extractHimalayaQuestionSnapshot(input);

  if (pageMode === 'results-overview') {
    return {
      source: 'himalaya',
      provider: 'himalaya',
      mode: 'curriculum_content',
      pageUrl,
      sourceUrl: pageUrl,
      pageKind: 'results-overview',
      title: normalizeWhitespace(input.document.title) || 'AAOS Himalaya results',
      breadcrumbs: [],
      contentText: null,
      contentMarkdown: null,
      answerChoices: [],
      percentDistribution: [],
      linkedConcepts: [],
      images: [],
      questionCount,
      extractionWarnings: ['himalaya_results_overview_no_active_question'],
      raw: { providerSpecific: { adapter: 'himalaya', pageMode } },
      classification: {
        pageKind: 'unreadable',
        confidence: 0.9,
        reason: 'Select a question to review it with BroBot.',
        detected: {
          hasStem: false,
          answerChoiceCount: 0,
          readableTextLength: 0,
          headings: ['Results', 'Questions'],
          referencesCount: 0,
          tablesCount: 0,
          imagesCount: 0,
          activeUrl: pageUrl,
          title: normalizeWhitespace(input.document.title) || null,
        },
      },
      debug: {
        matchedSelectors: { himalayaPageMode: [pageMode] },
        extractorVersion: '2026-07-12-himalaya-v1',
      },
    };
  }

  if (!snapshot || !snapshot.stem || snapshot.choices.length < 2) return null;

  const selectedChoice = snapshot.choices.find((choice) => choice.selected);
  const correctChoice = snapshot.choices.find((choice) => choice.correct === true);
  const visibleTeachingText = snapshot.explanation ?? snapshot.discussion;
  const answerChoices = snapshot.choices.map((choice) => ({
    key: choice.id,
    label: choice.label ?? choice.id,
    text: choice.text,
    isSelected: choice.selected,
    isCorrect: choice.correct ?? null,
  }));
  const reviewSignals = {
    hasVisibleExplanation: Boolean(visibleTeachingText || snapshot.keyReferencePoints),
    hasVisibleReviewMarker: snapshot.choices.some((choice) => choice.correct !== undefined),
    hasSubmittedAnswerState: snapshot.reviewState === 'answered_review',
    visibleUnansweredPrompt: snapshot.reviewState === 'unanswered',
    unansweredOverrideApplied: false,
    reviewScore: snapshot.reviewState === 'answered_review' ? 3 : 0,
    unansweredScore: snapshot.reviewState === 'unanswered' ? 3 : 0,
    reviewEvidence: [
      snapshot.explanation ? 'explanation_text' : '',
      snapshot.discussion ? 'discussion_text' : '',
      snapshot.keyReferencePoints ? 'key_reference_points' : '',
      snapshot.choices.some((choice) => choice.correct !== undefined) ? 'answer_result_markers' : '',
    ].filter(Boolean),
    unansweredEvidence: snapshot.reviewState === 'unanswered' ? ['visible_answer_controls', 'no_review_markers', 'no_explanation_text'] : [],
    visiblePreferredResponseActive: Boolean(visibleTeachingText),
    visiblePreferredResponseEnabled: Boolean(visibleTeachingText),
    visibleExplanationTextLength: visibleTeachingText?.length ?? 0,
    visibleSelectedAnswerReviewClass: snapshot.choices.some((choice) => choice.selected),
    visibleCorrectAnswerReviewClass: snapshot.choices.some((choice) => choice.correct === true),
    visibleDistributionRows: 0,
  };

  return {
    source: 'himalaya',
    provider: 'himalaya',
    mode: 'question',
    pageUrl,
    sourceUrl: pageUrl,
    pageKind: snapshot.pageMode === 'reviewed-question' ? 'review' : 'current_test',
    supportedPageKind: snapshot.pageMode === 'reviewed-question' ? 'rock_himalaya_review' : 'rock_himalaya_question',
    questionId: snapshot.questionId ?? snapshot.fingerprint,
    title: normalizeWhitespace(input.document.title) || 'AAOS Himalaya assessment',
    breadcrumbs: ['AAOS', 'Himalaya Assessment'],
    stem: snapshot.stem,
    answerChoices,
    selectedAnswerKey: selectedChoice?.id ?? null,
    correctAnswerKey: correctChoice?.id ?? null,
    selectedAnswer: selectedChoice?.text ?? null,
    correctAnswer: correctChoice?.text ?? null,
    percentDistribution: [],
    explanationText: snapshot.explanation ?? snapshot.discussion ?? null,
    explanation: snapshot.explanation ?? null,
    sourceExplanation: snapshot.explanation ?? null,
    sourceKeyPoints: snapshot.keyReferencePoints ?? null,
    sourceReferences: snapshot.references ?? null,
    references: snapshot.references ? [snapshot.references] : [],
    referencesCount: snapshot.references ? 1 : 0,
    linkedConcepts: [],
    images: [],
    raw: {
      providerSpecific: {
        adapter: 'himalaya',
        pageMode,
        reviewState: snapshot.reviewState,
        fingerprint: snapshot.fingerprint,
        assessmentTitle: snapshot.assessmentTitle ?? null,
        questionNumber: snapshot.questionNumber ?? null,
        totalQuestions: snapshot.totalQuestions ?? null,
        discussionText: snapshot.discussion ?? null,
        sourceMaterial: {
          explanation: snapshot.explanation ?? null,
          keyReferencePoints: snapshot.keyReferencePoints ?? null,
          references: snapshot.references ?? null,
        },
      },
    },
    extractionWarnings: [
      !selectedChoice ? 'selected_answer_not_visible' : '',
      !correctChoice && snapshot.reviewState === 'answered_review' ? 'correct_answer_not_visible' : '',
      !snapshot.explanation ? 'explanation_not_visible' : '',
      !snapshot.keyReferencePoints ? 'key_reference_points_not_visible' : '',
      !snapshot.references ? 'references_not_visible' : '',
    ].filter(Boolean),
    questionReviewSignals: reviewSignals,
    classification: {
      pageKind: 'question',
      confidence: snapshot.choices.length >= 3 ? 0.94 : 0.86,
      reason: 'Detected an AAOS Himalaya reviewed question with visible choices.',
      detected: {
        hasStem: true,
        answerChoiceCount: answerChoices.length,
        readableTextLength: snapshot.stem.length + (snapshot.explanation?.length ?? 0),
        headings: ['AAOS Himalaya Assessment'],
        referencesCount: snapshot.references ? 1 : 0,
        tablesCount: 0,
        imagesCount: 0,
        activeUrl: pageUrl,
        title: normalizeWhitespace(input.document.title) || null,
      },
    },
    debug: {
      matchedSelectors: { himalayaPageMode: [pageMode] },
      extractorVersion: '2026-07-12-himalaya-v1',
    },
  };
}
