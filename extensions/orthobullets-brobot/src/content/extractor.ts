import { SELECTOR_SET_VERSION, SELECTORS } from './selectors.js';
import type {
  OrthobulletsChoice,
  OrthobulletsImageMetadata,
  OrthobulletsLinkedConcept,
  OrthobulletsPageContext,
  OrthobulletsPercentDistribution,
  QuestionProvider,
} from '../shared/types.js';

export const EXTRACTOR_VERSION = '2026-07-03-provider-rock-v1';
export { SELECTOR_SET_VERSION };

const MAX_CURRICULUM_CONTENT_CHARS = 14000;
const MIN_CURRICULUM_CONTENT_CHARS = 500;

type DomElementLike = {
  nodeName?: string;
  tagName?: string;
  textContent: string | null;
  getAttribute(name: string): string | null;
  querySelector(selector: string): DomElementLike | null;
  querySelectorAll(selector: string): ArrayLike<DomElementLike>;
};

type DocumentLike = DomElementLike & {
  locationHref?: string;
  title?: string;
};

function normalizeWhitespace(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function textOf(element: DomElementLike | null | undefined) {
  return normalizeWhitespace(element?.textContent);
}

function collectTexts(root: DocumentLike, selectors: readonly string[], debugKey: string, matched: Record<string, string[]>) {
  for (const selector of selectors) {
    const nodes = Array.from(root.querySelectorAll(selector));
    const texts = nodes.map((node) => textOf(node)).filter(Boolean);
    if (texts.length) {
      matched[debugKey] = [...(matched[debugKey] ?? []), selector];
      return texts;
    }
  }
  return [];
}

function firstText(root: DocumentLike, selectors: readonly string[], debugKey: string, matched: Record<string, string[]>) {
  return collectTexts(root, selectors, debugKey, matched)[0];
}

function firstElement(root: DocumentLike, selectors: readonly string[], debugKey: string, matched: Record<string, string[]>) {
  for (const selector of selectors) {
    const node = root.querySelector(selector);
    if (node) {
      matched[debugKey] = [...(matched[debugKey] ?? []), selector];
      return node;
    }
  }
  return null;
}

function parseQuestionIdFromUrl(url: string) {
  const obQuestionMatch = url.match(/\b((?:OBQ|SBQ)[A-Z0-9.-]+)\b/i);
  if (obQuestionMatch?.[1]) return obQuestionMatch[1].toUpperCase();

  const queryMatch = url.match(/[?&](?:questionId|question_id|qid)=([A-Za-z0-9.-]+)/i);
  if (queryMatch?.[1]) return queryMatch[1].toUpperCase();

  return undefined;
}

function parseTopicIdFromUrl(url: string) {
  const match = url.match(/orthobullets\.com\/[^/]+\/(\d{3,6})\//i);
  return match?.[1];
}

function detectPageKind(input: {
  pageUrl: string;
  explanationText?: string;
  correctAnswerKey?: string;
  selectedAnswerKey?: string;
}) {
  if (/\/currenttest\b/i.test(input.pageUrl)) return 'current_test' as const;
  if (/\/testview\b/i.test(input.pageUrl)) return 'review' as const;
  if (input.explanationText || input.correctAnswerKey || input.selectedAnswerKey) return 'review' as const;
  return 'unknown' as const;
}

function dedupeTexts(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const normalized = normalizeWhitespace(value);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });
  return result;
}

function detectProviderFromUrl(url: string): QuestionProvider | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === 'orthobullets.com' || host === 'www.orthobullets.com') return 'orthobullets';
    if (
      host === 'rock.aaos.org' ||
      host === 'www.rock.aaos.org' ||
      host.endsWith('.rock.aaos.org') ||
      (host.includes('aaos.org') && /\/rock\b/i.test(parsed.pathname)) ||
      host.includes('orthopaedicrock')
    ) {
      return 'rock';
    }
  } catch {
    return null;
  }
  return null;
}

function detectProviderFromDom(root: DocumentLike): QuestionProvider | null {
  const text = normalizeWhitespace(root.textContent).toLowerCase();
  if (root.querySelector('[data-provider="orthobullets"], [data-source="orthobullets"]')) return 'orthobullets';
  if (root.querySelector('[data-provider="rock"], [data-source="rock"], [data-rock-question], [data-testid*="rock" i]')) return 'rock';
  if (/\brock curriculum\b|\baaos rock\b|\bresident orthopaedic core knowledge\b/.test(text)) return 'rock';
  if (/\borthobullets\b/.test(text)) return 'orthobullets';
  return null;
}

export function detectQuestionProvider(input: { document: DocumentLike; pageUrl?: string }) {
  const pageUrl = input.pageUrl ?? input.document.locationHref ?? '';
  return detectProviderFromUrl(pageUrl) ?? detectProviderFromDom(input.document);
}

function detectChoiceKey(text: string, index: number) {
  const explicit = text.match(/^([A-H])[\).\s:-]+/);
  if (explicit?.[1]) return explicit[1];
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[index] ?? String(index + 1);
}

function detectPercent(text: string) {
  const match = text.match(/(\d{1,3})\s*%/);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function classifyConcept(label: string): OrthobulletsLinkedConcept['kind'] {
  const lower = label.toLowerCase();
  if (lower.includes('oite')) return 'oite';
  if (lower.includes('card')) return 'card';
  return 'topic';
}

function firstMatchingText(node: DomElementLike, selectors: readonly string[]) {
  for (const selector of selectors) {
    const text = textOf(node.querySelector(selector));
    if (text) return text;
  }
  return undefined;
}

function extractChoices(
  root: DocumentLike,
  matched: Record<string, string[]>
): {
  answerChoices: OrthobulletsChoice[];
  selectedAnswerKey?: string;
  correctAnswerKey?: string;
  percentDistribution: OrthobulletsPercentDistribution[];
} {
  const answerChoices: OrthobulletsChoice[] = [];
  const percentDistribution: OrthobulletsPercentDistribution[] = [];

  const nodes = firstElement(root, SELECTORS.choiceRows, 'choiceRows', matched)
    ? collectChoiceNodes(root, SELECTORS.choiceRows, matched)
    : [];

  // Section-level data-correct attribute is the most reliable correctness
  // signal — it's set whether or not the user answered correctly, unlike
  // the per-row `right` class which only appears on the selected choice.
  const correctSection = root.querySelector(SELECTORS.correctAnswerSection);
  const correctAnswerNumber = normalizeWhitespace(correctSection?.getAttribute('data-correct'));
  if (correctSection) {
    matched.correctAnswerSection = [...(matched.correctAnswerSection ?? []), SELECTORS.correctAnswerSection];
  }

  nodes.forEach((node, index) => {
    const scopedText = firstMatchingText(node, SELECTORS.choiceText);
    if (scopedText) matched.choiceText = [...(matched.choiceText ?? []), SELECTORS.choiceText[0]];
    const text = scopedText || textOf(node);
    if (!text) return;

    const answerNumber = normalizeWhitespace(node.querySelector('.answerNumber')?.textContent);
    const key =
      normalizeWhitespace(node.getAttribute('data-answer-key')) ||
      normalizeWhitespace(node.getAttribute('data-choice-key')) ||
      answerNumber ||
      detectChoiceKey(text, index);
    const className = normalizeWhitespace(node.getAttribute('class')).toLowerCase();
    const ariaChecked = normalizeWhitespace(node.getAttribute('aria-checked')).toLowerCase();
    const isSelected =
      SELECTORS.selectedAnswerClassNames.some((name) => className.includes(name)) ||
      ariaChecked === 'true' ||
      node.querySelector('input[type="checkbox"]:checked, input:checked') != null;
    const isCorrect =
      SELECTORS.correctAnswerClassNames.some((name) => className.includes(name)) ||
      (Boolean(correctAnswerNumber) && answerNumber === correctAnswerNumber);

    const scopedPercentText = firstMatchingText(node, SELECTORS.choicePercent);
    if (scopedPercentText) matched.choicePercent = [...(matched.choicePercent ?? []), SELECTORS.choicePercent[0]];
    const percent = detectPercent(scopedPercentText ?? text);

    answerChoices.push({
      key,
      text,
      isSelected,
      isCorrect,
    });

    if (percent != null) {
      percentDistribution.push({
        answerKey: key,
        label: key,
        percent,
      });
    }
  });

  if (percentDistribution.length === 0) {
    const distributionTexts = collectTexts(root, SELECTORS.distributionRows, 'distributionRows', matched);
    distributionTexts.forEach((text, index) => {
      const percent = detectPercent(text);
      if (percent == null) return;
      percentDistribution.push({
        answerKey: answerChoices[index]?.key,
        label: answerChoices[index]?.key,
        percent,
      });
    });
  }

  const selected = answerChoices.find((choice) => choice.isSelected)?.key;
  const correct = answerChoices.find((choice) => choice.isCorrect)?.key;

  return {
    answerChoices,
    selectedAnswerKey: selected,
    correctAnswerKey: correct,
    percentDistribution,
  };
}

function collectChoiceNodes(
  root: DocumentLike,
  selectors: readonly string[],
  matched: Record<string, string[]>
) {
  for (const selector of selectors) {
    const nodes = Array.from(root.querySelectorAll(selector));
    if (nodes.length) {
      matched.choiceRows = [...(matched.choiceRows ?? []), selector];
      return nodes;
    }
  }
  return [];
}

function parseBackgroundImageUrl(style: string | null | undefined) {
  const match = (style ?? '').match(/background-image:\s*url\((['"]?)([^'")]+)\1\)/i);
  return match?.[2];
}

// Image metadata only — never reads pixel data or runs OCR. Orthobullets
// renders question figures as `div`s with a CSS background-image (not
// `<img>`), and stores the asset URL in a non-standard `alt` attribute on
// that div rather than real alt text, so the URL is recovered from
// `style`/`alt` rather than `src` when needed.
function extractImages(root: DocumentLike, matched: Record<string, string[]>) {
  const seen = new Set<string>();
  const images: OrthobulletsImageMetadata[] = [];

  for (const selector of SELECTORS.images) {
    const nodes = Array.from(root.querySelectorAll(selector));
    if (!nodes.length) continue;
    matched.images = [...(matched.images ?? []), selector];

    nodes.forEach((node) => {
      const altAttr = normalizeWhitespace(node.getAttribute('alt'));
      const src =
        normalizeWhitespace(node.getAttribute('src')) ||
        parseBackgroundImageUrl(node.getAttribute('style')) ||
        (/^https?:\/\//i.test(altAttr) ? altAttr : '');
      // When the "alt" attribute is actually the asset URL (Orthobullets'
      // div-based figures), there is no real alt text to record.
      const alt = src === altAttr ? undefined : altAttr;
      const key = `${src}|${alt ?? ''}`;
      if (!src || seen.has(key)) return;
      seen.add(key);

      const width = Number(node.getAttribute('width') ?? '');
      const height = Number(node.getAttribute('height') ?? '');

      images.push({
        src,
        alt: alt || undefined,
        width: Number.isFinite(width) && width > 0 ? width : undefined,
        height: Number.isFinite(height) && height > 0 ? height : undefined,
      });
    });
  }

  return images;
}

function extractLinkedConcepts(root: DocumentLike, matched: Record<string, string[]>) {
  const concepts: OrthobulletsLinkedConcept[] = [];
  const seen = new Set<string>();

  for (const selector of SELECTORS.linkedConcepts) {
    const nodes = Array.from(root.querySelectorAll(selector));
    if (!nodes.length) continue;
    matched.linkedConcepts = [...(matched.linkedConcepts ?? []), selector];

    nodes.forEach((node) => {
      const label = textOf(node);
      const href = normalizeWhitespace(node.getAttribute('href'));
      if (!label) return;
      const key = `${label}|${href}`;
      if (seen.has(key)) return;
      seen.add(key);

      concepts.push({
        label,
        href: href || undefined,
        kind: classifyConcept(label),
      });
    });
  }

  return concepts.slice(0, 10);
}

function extractQuestionId(root: DocumentLike, url: string, matched: Record<string, string[]>) {
  const fromUrl = parseQuestionIdFromUrl(url);
  if (fromUrl) return fromUrl;

  const hinted = firstElement(root, SELECTORS.questionIdHints, 'questionIdHints', matched);
  const attr =
    normalizeWhitespace(hinted?.getAttribute('data-question-id')) ||
    normalizeWhitespace(hinted?.getAttribute('data-quiz-question-id')) ||
    normalizeWhitespace(hinted?.getAttribute('data-question-code'));
  if (attr) return attr;

  // Fallback: Orthobullets renders the visible "QID 1234" label inside
  // `.question__code` with no machine-readable attribute.
  const codeText = textOf(hinted);
  const codeMatch = codeText.match(/\bQID\s*([0-9]+)/i);
  return codeMatch?.[1] || undefined;
}

function extractTopicId(root: DocumentLike, url: string, matched: Record<string, string[]>) {
  const fromUrl = parseTopicIdFromUrl(url);
  if (fromUrl) return fromUrl;

  const hinted = firstElement(root, SELECTORS.topicIdHints, 'topicIdHints', matched);
  const attr =
    normalizeWhitespace(hinted?.getAttribute('data-topic-id')) ||
    normalizeWhitespace(hinted?.getAttribute('data-topic-code'));
  if (attr) return attr;

  // Fallback: the question's own URL is `/question/<id>/...`, which has no
  // topic segment — the topic id instead lives in the first breadcrumb
  // link's href (`/<specialty>/<topicId>/<slug>`).
  const breadcrumbLink =
    root.querySelector('.breadcrumbs-section--question a[href]') ?? root.querySelector('a[href].breadcrumbs-section__path-item, nav.breadcrumb a[href], .breadcrumbs a[href]');
  const href = breadcrumbLink?.getAttribute('href') ?? '';
  const hrefMatch = href.match(/^\/[a-z-]+\/(\d{3,6})\//i);
  return hrefMatch?.[1] || undefined;
}

export function extractOrthobulletsPageContext(input: {
  document: DocumentLike;
  pageUrl?: string;
}): OrthobulletsPageContext {
  const pageUrl = input.pageUrl ?? input.document.locationHref ?? '';
  const matchedSelectors: Record<string, string[]> = {};
  const breadcrumbs = collectTexts(input.document, SELECTORS.breadcrumbs, 'breadcrumbs', matchedSelectors);
  const stem = firstText(input.document, SELECTORS.stem, 'stem', matchedSelectors);
  const explanationText = firstText(
    input.document,
    SELECTORS.explanation,
    'explanation',
    matchedSelectors
  );
  const linkedConcepts = extractLinkedConcepts(input.document, matchedSelectors);
  const images = extractImages(input.document, matchedSelectors);
  const choices = extractChoices(input.document, matchedSelectors);
  const topicId = extractTopicId(input.document, pageUrl, matchedSelectors);
  const questionId = extractQuestionId(input.document, pageUrl, matchedSelectors);
  const pageKind = detectPageKind({
    pageUrl,
    explanationText,
    correctAnswerKey: choices.correctAnswerKey,
    selectedAnswerKey: choices.selectedAnswerKey,
  });

  const extractionWarnings: string[] = [];
  if (!stem) extractionWarnings.push('stem_not_visible');
  if (choices.answerChoices.length === 0) extractionWarnings.push('answer_choices_not_visible');
  if (breadcrumbs.length === 0 && !topicId) extractionWarnings.push('topic_not_visible');
  if (!choices.selectedAnswerKey) extractionWarnings.push('selected_answer_not_visible');
  if (!choices.correctAnswerKey) extractionWarnings.push('correct_answer_not_visible');
  if (!explanationText) {
    extractionWarnings.push('preferred_response_not_visible');
    extractionWarnings.push('explanation_not_visible');
  }

  return {
    source: 'orthobullets',
    provider: 'orthobullets',
    mode: 'question',
    pageUrl,
    sourceUrl: pageUrl,
    pageKind,
    questionId,
    topicId,
    title: normalizeWhitespace(input.document.title) || null,
    breadcrumbs,
    stem: stem || undefined,
    answerChoices: choices.answerChoices.map((choice) => ({
      ...choice,
      label: choice.key ?? null,
      isSelected: choice.isSelected ?? null,
      isCorrect: choice.isCorrect ?? null,
    })),
    selectedAnswerKey: choices.selectedAnswerKey,
    correctAnswerKey: choices.correctAnswerKey,
    selectedAnswer: choices.answerChoices.find((choice) => choice.key === choices.selectedAnswerKey)?.text ?? null,
    correctAnswer: choices.answerChoices.find((choice) => choice.key === choices.correctAnswerKey)?.text ?? null,
    percentDistribution: choices.percentDistribution,
    explanationText: explanationText || undefined,
    explanation: explanationText || null,
    linkedConcepts,
    images,
    extractionWarnings,
    raw: {
      providerSpecific: {
        percentDistribution: choices.percentDistribution,
        linkedConcepts,
      },
    },
    debug: {
      matchedSelectors,
      extractorVersion: EXTRACTOR_VERSION,
    },
  };
}

const ROCK_SELECTORS = {
  root: [
    '[data-provider="rock"]',
    '[data-source="rock"]',
    '[data-rock-question]',
    '[data-testid="question-page"]',
    '[data-testid*="question" i]',
    '[aria-label*="question" i]',
    '[role="main"]',
    'main',
  ],
  breadcrumbs: [
    '[data-testid="breadcrumb"] a',
    '[data-testid="breadcrumbs"] a',
    '[aria-label="breadcrumb"] a',
    'nav[aria-label*="breadcrumb" i] a',
    '.breadcrumb a',
  ],
  title: [
    '[data-testid="curriculum-title"]',
    '[data-testid="topic-title"]',
    'h1',
  ],
  stem: [
    '[data-testid="question-stem"]',
    '[data-testid*="question-stem" i]',
    '[data-testid*="stem" i]',
    '[data-question-stem]',
    '[data-question-text]',
    '[data-prompt]',
    '[class*="question-stem" i]',
    '[class*="questionText" i]',
    '[class*="prompt" i]',
    '[aria-labelledby*="question" i]',
    'section[aria-label*="question" i] [data-testid*="stem" i]',
    'section[aria-label*="question" i] [class*="stem" i]',
    'section[aria-label*="question" i] [class*="prompt" i]',
    'article [data-testid*="stem" i]',
    'article [class*="stem" i]',
    'article [class*="prompt" i]',
  ],
  choices: [
    '[data-testid="answer-choice"]',
    '[data-testid*="answer-choice" i]',
    '[data-testid*="choice" i]',
    '[data-testid*="option" i]',
    '[data-answer-label]',
    '[data-choice-label]',
    '[data-answer-key]',
    '[data-choice-key]',
    '[role="radio"]',
    '[role="option"]',
    'button[aria-label*="answer" i]',
    'button[aria-label*="choice" i]',
    'button[class*="answer" i]',
    'button[class*="choice" i]',
    'div[class*="answer" i]',
    'div[class*="choice" i]',
    'div[class*="option" i]',
    'label:has(input[type="radio"])',
    'label:has(input[type="checkbox"])',
    'li[data-answer-label]',
    'li[class*="answer" i]',
    'li[class*="choice" i]',
    'fieldset label',
    'ol li',
  ],
  explanation: [
    '[data-testid="explanation"]',
    '[data-testid="rationale"]',
    '[data-testid*="explanation" i]',
    '[data-testid*="rationale" i]',
    '[aria-label*="explanation" i]',
    '[aria-label*="rationale" i]',
    '[class*="explanation" i]',
    '[class*="rationale" i]',
    '[class*="review" i][class*="answer" i]',
    'section.review-rationale',
  ],
  images: [
    '[data-testid="question-stem"] img',
    '[data-testid*="stem" i] img',
    '[data-question-stem] img',
    '[data-testid="explanation"] img',
    '[data-testid="rationale"] img',
    '[data-testid*="explanation" i] img',
    '[data-testid*="rationale" i] img',
    '[aria-label*="explanation" i] img',
    '[aria-label*="rationale" i] img',
    'figure img',
    'main img',
  ],
  contentRoot: [
    '[data-testid="course-content"]',
    '[data-testid*="course-content" i]',
    '[data-testid*="curriculum-content" i]',
    '[data-testid*="article-content" i]',
    '[class*="course-content" i]',
    '[class*="curriculum-content" i]',
    '[class*="article-content" i]',
    '[class*="main-content" i]',
    'article',
    '[role="main"]',
    'main',
  ],
  contentBlocks: [
    'h1',
    'h2',
    'h3',
    'h4',
    'p',
    'li',
    '[data-testid*="learning-objective" i]',
    '[class*="learning-objective" i]',
  ],
  authors: [
    '[data-testid*="author" i]',
    '[class*="author" i]',
    '[rel="author"]',
  ],
  date: [
    'time',
    '[data-testid*="date" i]',
    '[class*="date" i]',
    '[class*="updated" i]',
  ],
} as const;

function scopedRoot(root: DocumentLike) {
  return firstElement(root, ROCK_SELECTORS.root, 'rockRoot', {}) ?? root;
}

function collectRockTexts(root: DocumentLike, selectors: readonly string[], key: string, matched: Record<string, string[]>) {
  return dedupeTexts(collectTexts(root, selectors, key, matched));
}

function extractRockQuestionId(root: DocumentLike, url: string) {
  const attrNode = root.querySelector('[data-question-id], [data-rock-question-id], [data-assessment-item-id]');
  const attr =
    normalizeWhitespace(attrNode?.getAttribute('data-question-id')) ||
    normalizeWhitespace(attrNode?.getAttribute('data-rock-question-id')) ||
    normalizeWhitespace(attrNode?.getAttribute('data-assessment-item-id'));
  if (attr) return attr;
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('questionId') ??
      parsed.searchParams.get('question_id') ??
      parsed.searchParams.get('qid') ??
      parsed.pathname.match(/\/(?:questions?|items?)\/([A-Za-z0-9.-]+)/i)?.[1] ??
      null;
  } catch {
    return null;
  }
}

function extractRockTopicId(root: DocumentLike, url: string) {
  const attrNode = root.querySelector('[data-topic-id], [data-curriculum-id], [data-module-id]');
  const attr =
    normalizeWhitespace(attrNode?.getAttribute('data-topic-id')) ||
    normalizeWhitespace(attrNode?.getAttribute('data-curriculum-id')) ||
    normalizeWhitespace(attrNode?.getAttribute('data-module-id'));
  if (attr) return attr;
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('topicId') ??
      parsed.searchParams.get('moduleId') ??
      parsed.pathname.match(/\/(?:curriculum|modules?|topics?)\/([A-Za-z0-9.-]+)/i)?.[1] ??
      null;
  } catch {
    return null;
  }
}

function cleanChoiceText(rawText: string) {
  return normalizeWhitespace(
    rawText
      .replace(/\b(selected|your answer|correct answer|incorrect|correct|submitted)\b/gi, ' ')
      .replace(/\s+/g, ' ')
  );
}

function firstTextWithStrategy(root: DocumentLike, selectors: readonly string[], debugKey: string, strategyKey: string, matched: Record<string, string[]>) {
  for (const selector of selectors) {
    const nodes = Array.from(root.querySelectorAll(selector));
    const text = nodes.map((node) => textOf(node)).find(Boolean);
    if (text) {
      matched[debugKey] = [...(matched[debugKey] ?? []), selector];
      matched[strategyKey] = [selector];
      return { text, strategy: selector };
    }
  }
  matched[strategyKey] = ['not_found'];
  return { text: undefined, strategy: 'not_found' };
}

function collectChoiceNodesWithStrategy(root: DocumentLike, selectors: readonly string[], matched: Record<string, string[]>) {
  for (const selector of selectors) {
    const nodes = Array.from(root.querySelectorAll(selector));
    if (nodes.length >= 2) {
      matched.choiceRows = [...(matched.choiceRows ?? []), selector];
      matched.choicesStrategy = [selector];
      return { nodes, strategy: selector };
    }
  }
  matched.choicesStrategy = ['not_found'];
  return { nodes: [], strategy: 'not_found' };
}

function nodeHasMarker(node: DomElementLike, selectors: readonly string[]) {
  return selectors.some((selector) => node.querySelector(selector) != null);
}

function detectRockAnswerState(node: DomElementLike) {
  const className = normalizeWhitespace(node.getAttribute('class')).toLowerCase();
  const ariaChecked = normalizeWhitespace(node.getAttribute('aria-checked')).toLowerCase();
  const ariaLabel = normalizeWhitespace(node.getAttribute('aria-label')).toLowerCase();
  const title = normalizeWhitespace(node.getAttribute('title')).toLowerCase();
  const dataState = normalizeWhitespace(node.getAttribute('data-state')).toLowerCase();
  const dataStatus = normalizeWhitespace(node.getAttribute('data-status')).toLowerCase();
  const result = normalizeWhitespace(node.getAttribute('data-result')).toLowerCase();
  const text = textOf(node).toLowerCase();
  const markerText = [ariaLabel, title, dataState, dataStatus, result, className, text].join(' ');

  const selectedByInput = node.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked, input:checked') != null;
  const selectedByAttr = ariaChecked === 'true' || normalizeWhitespace(node.getAttribute('data-selected')).toLowerCase() === 'true';
  const selectedByMarker = /\b(selected|your answer|you chose|chosen|submitted answer|user-answer)\b/.test(markerText);
  const selectedByIcon = nodeHasMarker(node, [
    '[aria-label*="selected" i]',
    '[aria-label*="your answer" i]',
    '[title*="selected" i]',
    '[data-testid*="selected" i]',
    '[class*="selected" i]',
    '[class*="user-answer" i]',
  ]);

  const correctByAttr = normalizeWhitespace(node.getAttribute('data-correct')).toLowerCase() === 'true' || result === 'correct' || dataStatus === 'correct';
  const correctByMarker = /\b(correct answer|correct response|right answer)\b/.test(markerText) || /\bcorrect\b/.test(className);
  const correctByIcon = nodeHasMarker(node, [
    '[aria-label*="correct" i]',
    '[title*="correct" i]',
    '[data-testid*="correct" i]',
    '[class*="correct" i]',
    '[class*="right-answer" i]',
  ]);

  const strategies: string[] = [];
  if (selectedByInput) strategies.push('selected:checked_input');
  if (selectedByAttr) strategies.push('selected:aria_or_data');
  if (selectedByMarker) strategies.push('selected:text_or_class');
  if (selectedByIcon) strategies.push('selected:icon');
  if (correctByAttr) strategies.push('correct:data_attr');
  if (correctByMarker) strategies.push('correct:text_or_class');
  if (correctByIcon) strategies.push('correct:icon');

  return {
    isSelected: selectedByInput || selectedByAttr || selectedByMarker || selectedByIcon,
    isCorrect: correctByAttr || correctByMarker || correctByIcon,
    strategies,
  };
}

function extractRockChoices(root: DocumentLike, matched: Record<string, string[]>) {
  const seen = new Set<string>();
  const choices: OrthobulletsChoice[] = [];
  const { nodes, strategy } = collectChoiceNodesWithStrategy(root, ROCK_SELECTORS.choices, matched);
  const answerStateStrategies = new Set<string>();

  nodes.forEach((node, index) => {
    const explicitLabel =
      normalizeWhitespace(node.getAttribute('data-answer-label')) ||
      normalizeWhitespace(node.getAttribute('data-choice-label')) ||
      normalizeWhitespace(node.getAttribute('data-answer-key')) ||
      normalizeWhitespace(node.getAttribute('data-choice-key')) ||
      normalizeWhitespace(node.getAttribute('aria-label'))?.match(/^([A-H])[\).\s:-]+/)?.[1] ||
      undefined;
    const rawText =
      firstMatchingText(node, ['[data-testid*="answer-text" i]', '.answer-text', 'span', 'p']) ||
      textOf(node);
    const text = cleanChoiceText(rawText);
    if (!text || text.length < 2) return;
    const key = explicitLabel || detectChoiceKey(text, index);
    const dedupeKey = `${key}|${text}`.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    const answerState = detectRockAnswerState(node);
    answerState.strategies.forEach((stateStrategy) => answerStateStrategies.add(stateStrategy));

    choices.push({
      key,
      label: key,
      text,
      isSelected: answerState.isSelected || null,
      isCorrect: answerState.isCorrect || null,
    });
  });

  matched.answerStateStrategy = answerStateStrategies.size ? [...answerStateStrategies] : ['not_found'];

  return {
    choices,
    choicesStrategy: strategy,
    answerStateStrategy: answerStateStrategies.size ? [...answerStateStrategies].join(',') : 'not_found',
  };
}

function extractRockImages(root: DocumentLike, matched: Record<string, string[]>) {
  const images: OrthobulletsImageMetadata[] = [];
  const seen = new Set<string>();
  for (const selector of ROCK_SELECTORS.images) {
    const nodes = Array.from(root.querySelectorAll(selector));
    if (!nodes.length) continue;
    matched.images = [...(matched.images ?? []), selector];
    nodes.forEach((node) => {
      const src = normalizeWhitespace(node.getAttribute('src'));
      if (!src || src.startsWith('data:') || seen.has(src)) return;
      seen.add(src);
      images.push({
        src,
        alt: normalizeWhitespace(node.getAttribute('alt')) || undefined,
      });
    });
  }
  return images;
}

function cleanCurriculumText(value: string) {
  return normalizeWhitespace(
    value
      .replace(/\b(send feedback|search|highlight|bookmark|cookie settings|privacy settings|table of contents)\b/gi, ' ')
      .replace(/\b(previous|next|back to course|open menu|user menu|logout)\b/gi, ' ')
  );
}

function isUiChromeText(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.length < 12) return true;
  if (/^(search|menu|home|profile|logout|send feedback|previous|next|bookmark|highlight)$/i.test(value)) return true;
  return false;
}

function extractRockCurriculumContent(root: DocumentLike, matched: Record<string, string[]>) {
  const contentRoot = firstElement(root, ROCK_SELECTORS.contentRoot, 'contentRoot', matched) as DocumentLike | null;
  const scanRoot = contentRoot ?? root;
  const blocks = Array.from(scanRoot.querySelectorAll(ROCK_SELECTORS.contentBlocks.join(', ')));
  if (blocks.length) matched.contentBlocks = ['semantic_content_blocks'];

  const sectionHeadings: string[] = [];
  const contentSections: Array<{ heading: string; text: string }> = [];
  const allTexts: string[] = [];
  let currentHeading = 'Overview';
  let currentTexts: string[] = [];
  const seen = new Set<string>();

  function flushSection() {
    const text = dedupeTexts(currentTexts).join('\n');
    if (text.length >= 80) {
      contentSections.push({ heading: currentHeading, text });
    }
    currentTexts = [];
  }

  blocks.forEach((node) => {
    const rawText = cleanCurriculumText(textOf(node));
    if (!rawText || isUiChromeText(rawText)) return;
    const key = rawText.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const nodeName = (node.nodeName ?? node.tagName ?? '').toLowerCase();
    if (/^h[1-4]$/.test(nodeName)) {
      flushSection();
      currentHeading = rawText;
      sectionHeadings.push(rawText);
      allTexts.push(rawText);
      return;
    }

    currentTexts.push(rawText);
    allTexts.push(rawText);
  });
  flushSection();

  const contentText = dedupeTexts(allTexts).join('\n\n').slice(0, MAX_CURRICULUM_CONTENT_CHARS);
  const authors = collectRockTexts(root, ROCK_SELECTORS.authors, 'authors', matched).slice(0, 8);
  const date = firstText(root, ROCK_SELECTORS.date, 'date', matched) ?? null;
  const extractionStrategy = blocks.length ? 'semantic_content_blocks' : 'not_found';

  return {
    contentText: contentText || null,
    contentSections: contentSections.slice(0, 20).map((section) => ({
      heading: section.heading,
      text: section.text.slice(0, 3000),
    })),
    sectionHeadings: dedupeTexts(sectionHeadings).slice(0, 30),
    authors,
    date,
    extractionStrategy,
    contentCharCount: contentText.length,
  };
}

function detectRockPageKind(input: {
  url: string;
  selectedAnswer?: string | null;
  correctAnswer?: string | null;
  explanation?: string | null;
}) {
  if (/review|results?|submitted/i.test(input.url) || input.correctAnswer || input.explanation) return 'review';
  if (input.selectedAnswer) return 'answered';
  return 'question';
}

export function extractRockPageContext(input: {
  document: DocumentLike;
  pageUrl?: string;
}): OrthobulletsPageContext {
  const pageUrl = input.pageUrl ?? input.document.locationHref ?? '';
  const matchedSelectors: Record<string, string[]> = {};
  const root = scopedRoot(input.document) as DocumentLike;
  const breadcrumbs = collectRockTexts(input.document, ROCK_SELECTORS.breadcrumbs, 'breadcrumbs', matchedSelectors);
  const title =
    firstText(input.document, ROCK_SELECTORS.title, 'title', matchedSelectors) ||
    normalizeWhitespace(input.document.title) ||
    null;
  const stemResult = firstTextWithStrategy(root, ROCK_SELECTORS.stem, 'stem', 'stemStrategy', matchedSelectors);
  const explanationResult = firstTextWithStrategy(root, ROCK_SELECTORS.explanation, 'explanation', 'explanationStrategy', matchedSelectors);
  const stem = stemResult.text;
  const explanationText = explanationResult.text || null;
  const choicesResult = extractRockChoices(root, matchedSelectors);
  const answerChoices = choicesResult.choices;
  const selectedChoice = answerChoices.find((choice) => choice.isSelected);
  const correctChoice = answerChoices.find((choice) => choice.isCorrect);
  const questionId = extractRockQuestionId(input.document, pageUrl);
  const topicId = extractRockTopicId(input.document, pageUrl);
  const images = extractRockImages(root, matchedSelectors);
  const hasQuestion = Boolean(stem && answerChoices.length >= 2);
  const curriculum = hasQuestion
    ? null
    : extractRockCurriculumContent(input.document, matchedSelectors);
  const hasCurriculumContent = Boolean(curriculum?.contentText && curriculum.contentCharCount >= MIN_CURRICULUM_CONTENT_CHARS);
  const mode = hasQuestion ? 'question' : 'curriculum_content';
  const pageKind = hasQuestion ? detectRockPageKind({
    url: pageUrl,
    selectedAnswer: selectedChoice?.key ?? null,
    correctAnswer: correctChoice?.key ?? null,
    explanation: explanationText,
  }) : 'curriculum_content';

  const extractionWarnings: string[] = [];
  if (!stem && !hasCurriculumContent) extractionWarnings.push('stem_not_visible');
  if (answerChoices.length === 0 && !hasCurriculumContent) extractionWarnings.push('answer_choices_not_visible');
  if (breadcrumbs.length === 0 && !topicId && !title) extractionWarnings.push('topic_not_visible');
  if (hasQuestion && !selectedChoice) extractionWarnings.push('selected_answer_not_visible');
  if (hasQuestion && !correctChoice) extractionWarnings.push('correct_answer_not_visible');
  if (hasQuestion && !explanationText) extractionWarnings.push('explanation_not_visible');
  if (!hasQuestion && !hasCurriculumContent) extractionWarnings.push('curriculum_content_not_visible');

  return {
    source: 'rock',
    provider: 'rock',
    mode,
    pageUrl,
    sourceUrl: pageUrl,
    pageKind,
    questionId,
    topicId,
    title,
    breadcrumbs,
    authors: curriculum?.authors ?? [],
    date: curriculum?.date ?? null,
    sectionHeadings: curriculum?.sectionHeadings ?? [],
    contentText: curriculum?.contentText ?? null,
    contentSections: curriculum?.contentSections ?? [],
    stem: stem || undefined,
    answerChoices,
    selectedAnswerKey: selectedChoice?.key ?? null,
    correctAnswerKey: correctChoice?.key ?? null,
    selectedAnswer: selectedChoice?.text ?? null,
    correctAnswer: correctChoice?.text ?? null,
    percentDistribution: [],
    explanationText,
    explanation: explanationText,
    linkedConcepts: [],
    images,
    raw: {
      providerSpecific: {
        adapter: 'rock',
        fixtureSource: 'synthetic_until_real_sanitized_captures_available',
        stemStrategy: stemResult.strategy,
        choicesStrategy: choicesResult.choicesStrategy,
        explanationStrategy: explanationResult.strategy,
        answerStateStrategy: choicesResult.answerStateStrategy,
        hasQuestion,
        hasCurriculumContent,
        contentCharCount: curriculum?.contentCharCount ?? 0,
        sectionCount: curriculum?.contentSections.length ?? 0,
        headingCount: curriculum?.sectionHeadings.length ?? 0,
        extractionStrategy: hasQuestion ? 'question' : curriculum?.extractionStrategy ?? 'not_found',
      },
    },
    extractionWarnings,
    debug: {
      matchedSelectors,
      extractorVersion: EXTRACTOR_VERSION,
    },
  };
}

export function extractQuestionContext(input: {
  document: DocumentLike;
  pageUrl?: string;
}): OrthobulletsPageContext | null {
  const provider = detectQuestionProvider(input);
  if (provider === 'orthobullets') return extractOrthobulletsPageContext(input);
  if (provider === 'rock') return extractRockPageContext(input);
  return null;
}
