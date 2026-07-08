import { SELECTOR_SET_VERSION, SELECTORS } from './selectors.js';
import { classifyPage } from '../shared/page-classification.js';
import type {
  OrthobulletsChoice,
  OrthobulletsImageMetadata,
  OrthobulletsLinkedConcept,
  OrthobulletsPageContext,
  OrthobulletsPercentDistribution,
  QuestionProvider,
  TopicBullet,
  TopicSection,
} from '../shared/types.js';

export const EXTRACTOR_VERSION = '2026-07-05-rock-explain-study-panel-v2';
export { SELECTOR_SET_VERSION };

const MAX_CURRICULUM_CONTENT_CHARS = 14000;
const MIN_CURRICULUM_CONTENT_CHARS = 500;
const MIN_REFERENCES_HEAVY_CONTENT_CHARS = 180;

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

// Orthobullets question/review pages live under /question/ or /currenttest/;
// everything else that carries a numeric topic segment
// (/topic/<id>/<slug> or /<specialty>/<id>/<slug>) is a topic reference page.
function isLikelyOrthobulletsQuestionUrl(url: string) {
  return /orthobullets\.com\/(question|currenttest|testview)\b/i.test(url);
}

export function isLikelyOrthobulletsTopicUrl(url: string) {
  if (!url || isLikelyOrthobulletsQuestionUrl(url)) return false;
  return /orthobullets\.com\/(topic|[a-z-]+)\/\d{3,6}\b/i.test(url);
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

  const draftContext: OrthobulletsPageContext = {
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

  return {
    ...draftContext,
    classification: classifyPage(draftContext),
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
  questionContainers: [
    '[data-testid="question-page"]',
    'section[aria-label*="question" i]',
    'fieldset[aria-label*="answer" i]',
    '[class*="question-container" i]',
    '[class*="assessment-item" i]',
    '[data-rock-question]',
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
    // Orthobullets topic page wrapper classes
    '.mainSection',
    '.innerPageContent',
    '.topic__content',
    '.topic-content',
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
    'blockquote',
    'figcaption',
    'caption',
    '[data-testid*="learning-objective" i]',
    '[class*="learning-objective" i]',
    '[class*="reference" i]',
    '[class*="references" i]',
    '[id*="reference" i]',
    '[id*="references" i]',
  ],
  references: [
    '[data-testid*="reference" i] li',
    '[data-testid*="reference" i] p',
    '[class*="reference" i] li',
    '[class*="references" i] li',
    '[id*="reference" i] li',
    '[id*="references" i] li',
    'section[aria-label*="reference" i] li',
    'section[aria-label*="reference" i] p',
  ],
  tables: ['table'],
  chrome: [
    'header',
    'footer',
    'nav',
    'aside',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    '[aria-label*="cookie" i]',
    '[class*="cookie" i]',
    '[class*="feedback" i]',
    '[data-testid*="feedback" i]',
    '[class*="sidebar" i]',
    '[class*="menu" i]',
    'script',
    'style',
    'noscript',
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

  const directText = textOf(root);
  if (directText && selectors.some((selector) => /stem|prompt|question-stem/i.test(selector))) {
    matched[debugKey] = [...(matched[debugKey] ?? []), 'self_text'];
    matched[strategyKey] = ['self_text'];
    return { text: directText, strategy: 'self_text' };
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

function findRockQuestionContainer(root: DocumentLike, matched: Record<string, string[]>) {
  return firstElement(root, ROCK_SELECTORS.questionContainers, 'questionContainer', matched);
}

function isLikelyRockQuestionUrl(url: string) {
  return /\/(?:questions?|items?|assessment|quiz|test|review)\b/i.test(url) || /[?&](?:questionId|question_id|qid)=/i.test(url);
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

function extractRockChoices(root: DocumentLike, pageUrl: string, matched: Record<string, string[]>) {
  const seen = new Set<string>();
  const choices: OrthobulletsChoice[] = [];
  const questionContainer = findRockQuestionContainer(root, matched);
  const choiceRoot = (questionContainer ?? (isLikelyRockQuestionUrl(pageUrl) ? root : null)) as DocumentLike | null;
  if (!choiceRoot) {
    matched.choicesStrategy = ['skipped_non_question_page'];
    matched.answerStateStrategy = ['not_found'];
    return {
      choices,
      choicesStrategy: 'skipped_non_question_page',
      answerStateStrategy: 'not_found',
    };
  }

  const { nodes, strategy } = collectChoiceNodesWithStrategy(choiceRoot, ROCK_SELECTORS.choices, matched);
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

const CHROME_PHRASES =
  /^(search|menu|home|profile|logout|send feedback|previous|next|bookmark|highlight|cookie settings|privacy settings)$/i;

function isUiChromeText(value: string) {
  if (value.length < 12) return true;
  return CHROME_PHRASES.test(value);
}

// Headings must never be dropped just for being short ("Overview",
// "Treatment", "Exam" are common section titles under 12 chars) — only
// literal nav/button chrome text that happens to be a heading tag.
function isChromeHeading(value: string) {
  return CHROME_PHRASES.test(value);
}

function tableToMarkdown(table: DomElementLike) {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (!rows.length) return '';

  const parsedRows = rows
    .map((row) =>
      Array.from(row.querySelectorAll('th, td'))
        .map((cell) => cleanCurriculumText(textOf(cell)))
        .filter(Boolean)
    )
    .filter((cells) => cells.length > 0);

  if (!parsedRows.length) return '';

  const header = parsedRows[0];
  const body = parsedRows.slice(1);
  const separator = header.map(() => '---');
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ];
  return lines.join('\n');
}

function extractLearningObjectives(
  root: DocumentLike,
  contentSections: Array<{ heading: string; text: string }>,
  matched: Record<string, string[]>
) {
  const objectives: string[] = [];
  const seen = new Set<string>();

  const objectiveSection = contentSections.find((section) =>
    /learning\s+objectives?/i.test(section.heading)
  );
  if (objectiveSection) {
    objectiveSection.text
      .split('\n')
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter((line) => line.length >= 12)
      .forEach((line) => {
        const key = line.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        objectives.push(line);
      });
  }

  for (const selector of [
    '[data-testid*="learning-objective" i] li',
    '[class*="learning-objective" i] li',
    'section[aria-label*="learning objective" i] li',
  ]) {
    const nodes = Array.from(root.querySelectorAll(selector));
    if (!nodes.length) continue;
    matched.learningObjectives = [...(matched.learningObjectives ?? []), selector];
    nodes.forEach((node) => {
      const text = cleanCurriculumText(textOf(node));
      if (!text || text.length < 12) return;
      const key = text.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      objectives.push(text);
    });
  }

  return objectives.slice(0, 20);
}

function extractRockReferences(root: DocumentLike, matched: Record<string, string[]>) {
  const references: string[] = [];
  const seen = new Set<string>();

  for (const selector of ROCK_SELECTORS.references) {
    const nodes = Array.from(root.querySelectorAll(selector));
    if (!nodes.length) continue;
    matched.references = [...(matched.references ?? []), selector];
    nodes.forEach((node) => {
      const text = cleanCurriculumText(textOf(node));
      if (!text || text.length < 20 || isUiChromeText(text)) return;
      const key = text.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      references.push(text);
    });
  }

  return references.slice(0, 40);
}

function extractRockTablesMarkdown(root: DocumentLike, matched: Record<string, string[]>) {
  const tables: string[] = [];
  const seen = new Set<string>();

  for (const selector of ROCK_SELECTORS.tables) {
    const nodes = Array.from(root.querySelectorAll(selector));
    if (!nodes.length) continue;
    matched.tables = [...(matched.tables ?? []), selector];
    nodes.forEach((node) => {
      const markdown = tableToMarkdown(node);
      if (!markdown || markdown.length < 20) return;
      const key = markdown.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      tables.push(markdown);
    });
  }

  return {
    tablesMarkdown: tables.slice(0, 8),
    tablesCount: tables.length,
  };
}

function buildContentMarkdown(input: {
  title?: string | null;
  breadcrumbs: string[];
  sectionHeadings: string[];
  contentSections: Array<{ heading: string; text: string }>;
  references: string[];
  tablesMarkdown: string[];
  contentText: string | null;
}) {
  const parts: string[] = [];
  if (input.title) parts.push(`# ${input.title}`);
  if (input.breadcrumbs.length) parts.push(`Breadcrumbs: ${input.breadcrumbs.join(' > ')}`);

  if (input.contentSections.length) {
    input.contentSections.forEach((section) => {
      parts.push(`## ${section.heading}\n${section.text}`);
    });
  } else if (input.contentText) {
    parts.push(input.contentText);
  }

  if (input.tablesMarkdown.length) {
    parts.push('## Tables');
    input.tablesMarkdown.forEach((table, index) => {
      parts.push(`### Table ${index + 1}\n${table}`);
    });
  }

  if (input.references.length) {
    parts.push('## References');
    input.references.forEach((reference, index) => {
      parts.push(`${index + 1}. ${reference}`);
    });
  }

  return parts.join('\n\n').slice(0, MAX_CURRICULUM_CONTENT_CHARS) || null;
}

function extractRockCurriculumContent(root: DocumentLike, matched: Record<string, string[]>) {
  const contentRoot = firstElement(root, ROCK_SELECTORS.contentRoot, 'contentRoot', matched) as DocumentLike | null;
  const scanRoot = contentRoot ?? root;
  const blockSelector = ROCK_SELECTORS.contentBlocks.join(', ');
  const blocks = Array.from(scanRoot.querySelectorAll(blockSelector)).filter((node) => {
    return !ROCK_SELECTORS.chrome.some((selector) => node.querySelector(selector) != null);
  });
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
    if (!rawText) return;
    const nodeName = (node.nodeName ?? node.tagName ?? '').toLowerCase();
    const isHeading = /^h[1-4]$/.test(nodeName);
    if (isHeading ? isChromeHeading(rawText) : isUiChromeText(rawText)) return;
    const key = rawText.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    if (isHeading) {
      flushSection();
      currentHeading = rawText;
      sectionHeadings.push(rawText);
      allTexts.push(`## ${rawText}`);
      return;
    }

    const prefix = nodeName === 'li' ? '- ' : '';
    currentTexts.push(`${prefix}${rawText}`);
    allTexts.push(`${prefix}${rawText}`);
  });
  flushSection();

  const references = extractRockReferences(scanRoot, matched);
  const { tablesMarkdown, tablesCount } = extractRockTablesMarkdown(scanRoot, matched);
  const contentText = dedupeTexts(allTexts).join('\n\n').slice(0, MAX_CURRICULUM_CONTENT_CHARS);
  const authors = collectRockTexts(root, ROCK_SELECTORS.authors, 'authors', matched).slice(0, 8);
  const date = firstText(root, ROCK_SELECTORS.date, 'date', matched) ?? null;
  const extractionStrategy = blocks.length ? 'semantic_content_blocks' : references.length ? 'references_blocks' : 'not_found';
  const normalizedSections = contentSections.slice(0, 20).map((section) => ({
    heading: section.heading,
    text: section.text.slice(0, 3000),
  }));
  const learningObjectives = extractLearningObjectives(scanRoot, normalizedSections, matched);
  const contentMarkdown = buildContentMarkdown({
    title: firstText(root, ROCK_SELECTORS.title, 'title', matched) ?? null,
    breadcrumbs: collectRockTexts(root, ROCK_SELECTORS.breadcrumbs, 'breadcrumbs', matched),
    sectionHeadings: dedupeTexts(sectionHeadings).slice(0, 30),
    contentSections: normalizedSections,
    references,
    tablesMarkdown,
    contentText: contentText || null,
  });

  return {
    contentText: contentText || null,
    contentMarkdown,
    contentSections: normalizedSections,
    sectionHeadings: dedupeTexts(sectionHeadings).slice(0, 30),
    learningObjectives,
    tablesMarkdown,
    references,
    referencesCount: references.length,
    tablesCount,
    authors,
    date,
    extractionStrategy,
    contentCharCount: contentMarkdown?.length ?? contentText.length,
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
  const questionContainer = findRockQuestionContainer(root, matchedSelectors);
  const stemRoot = (questionContainer ?? (isLikelyRockQuestionUrl(pageUrl) ? root : null)) as DocumentLike | null;
  const stemResult = stemRoot
    ? firstTextWithStrategy(stemRoot, ROCK_SELECTORS.stem, 'stem', 'stemStrategy', matchedSelectors)
    : { text: undefined, strategy: 'skipped_non_question_page' as const };
  const explanationResult = firstTextWithStrategy(root, ROCK_SELECTORS.explanation, 'explanation', 'explanationStrategy', matchedSelectors);
  const stem = stemResult.text;
  const explanationText = explanationResult.text || null;
  const choicesResult = extractRockChoices(root, pageUrl, matchedSelectors);
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
  const hasCurriculumContent = Boolean(
    curriculum &&
      (curriculum.contentCharCount >= MIN_CURRICULUM_CONTENT_CHARS ||
        (curriculum.referencesCount >= 3 && curriculum.contentCharCount >= MIN_REFERENCES_HEAVY_CONTENT_CHARS))
  );
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

  const draftContext: OrthobulletsPageContext = {
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
    contentMarkdown: curriculum?.contentMarkdown ?? null,
    contentSections: curriculum?.contentSections ?? [],
    learningObjectives: curriculum?.learningObjectives ?? [],
    tablesMarkdown: curriculum?.tablesMarkdown ?? [],
    references: curriculum?.references ?? [],
    referencesCount: curriculum?.referencesCount ?? 0,
    tablesCount: curriculum?.tablesCount ?? 0,
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
        referencesCount: curriculum?.referencesCount ?? 0,
        tablesCount: curriculum?.tablesCount ?? 0,
        extractionStrategy: hasQuestion ? 'question' : curriculum?.extractionStrategy ?? 'not_found',
      },
    },
    extractionWarnings,
    debug: {
      matchedSelectors,
      extractorVersion: EXTRACTOR_VERSION,
    },
  };

  return {
    ...draftContext,
    classification: classifyPage(draftContext),
  };
}

const MIN_TOPIC_CONTENT_CHARS = 80;

// Build TopicSection[] from already-extracted contentSections. The existing
// semantic block scanner flattens nested list structure, so bullets get depth 0
// for Phase 1. Lines prefixed with "- " (added by extractRockCurriculumContent)
// become bullets; other lines are treated as depth-0 prose bullets.
function buildTopicStructuredSections(
  contentSections: Array<{ heading: string; text: string }>
): TopicSection[] {
  return contentSections.map((section, i) => {
    const id = `s${i}-${section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
    const bullets: TopicBullet[] = [];
    for (const line of section.text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const isDash = trimmed.startsWith('- ');
      bullets.push({ text: isDash ? trimmed.slice(2) : trimmed, depth: 0, path: [] });
    }
    return { id, title: section.heading, bullets };
  });
}

const TOPIC_BREADCRUMB_SELECTORS = [...SELECTORS.breadcrumbs, ...ROCK_SELECTORS.breadcrumbs] as const;
const TOPIC_TITLE_SELECTORS = ['[data-testid="topic-title"]', '.trending-title', 'h1'] as const;

// "12 Questions", "8 Cards", "3 Videos" style counters shown on Orthobullets
// topic pages (Study/Quiz/Cards/Video tabs). Read from visible page text
// only — no AJAX-loaded counts are fetched.
function extractTopicCount(bodyText: string, label: string) {
  const match = bodyText.match(new RegExp(`(\\d{1,4})\\s*\\+?\\s*${label}`, 'i'));
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

// Orthobullets topic pages ("Trauma > 1042 > Femoral Shaft Fractures") are
// concise bullet-based references rather than question pages. This reuses
// the same generic semantic-tag scanner as ROCK's curriculum extraction
// (headings/bullets/tables/images), since that scanner is DOM-structure
// agnostic and not actually ROCK-specific.
export function extractOrthobulletsTopicPageContext(input: {
  document: DocumentLike;
  pageUrl?: string;
}): OrthobulletsPageContext {
  const pageUrl = input.pageUrl ?? input.document.locationHref ?? '';
  const matchedSelectors: Record<string, string[]> = {};
  const breadcrumbs = collectTexts(input.document, TOPIC_BREADCRUMB_SELECTORS, 'breadcrumbs', matchedSelectors);
  const title =
    firstText(input.document, TOPIC_TITLE_SELECTORS, 'title', matchedSelectors) ||
    normalizeWhitespace(input.document.title) ||
    null;
  const topicId = extractTopicId(input.document, pageUrl, matchedSelectors);
  const curriculum = extractRockCurriculumContent(input.document, matchedSelectors);
  const images = extractRockImages(input.document, matchedSelectors);
  // Document.textContent is null per DOM spec (only Element/Text nodes have
  // it) — read from <body> (or the document itself as a last resort, e.g.
  // in tests that pass a body-less stub).
  const bodyText = normalizeWhitespace((input.document.querySelector('body') ?? input.document).textContent);
  const questionCount = extractTopicCount(bodyText, 'questions?');
  const cardCount = extractTopicCount(bodyText, 'cards?');
  const videoCount = extractTopicCount(bodyText, 'videos?');

  const hasContent = Boolean(curriculum.contentText && curriculum.contentText.length >= MIN_TOPIC_CONTENT_CHARS);

  // When the semantic block scanner found no headings (Orthobullets uses
  // .trending-title divs and .panel-title divs rather than <h1>–<h4>), seed
  // sectionHeadings from the page title so classification doesn't treat a
  // readable topic page as "unreadable" due to an empty headings array.
  const effectiveSectionHeadings =
    curriculum.sectionHeadings.length > 0
      ? curriculum.sectionHeadings
      : title
        ? [title]
        : [];

  // If the semantic scanner returned insufficient content (e.g. Orthobullets
  // uses non-standard class names that don't match contentRoot selectors, or
  // accordion content loads after document_idle), fall back to body text so
  // the Topic Tutor can still receive some material to work with.
  let effectiveContentText = curriculum.contentText;
  let effectiveContentMarkdown = curriculum.contentMarkdown;
  if (!hasContent) {
    const cleanBody = bodyText
      .replace(
        /\b(send feedback|search|cookie settings|privacy policy|terms of service|previous|next|home|logout|login|register|sign in|site map|menu|navigation)\b/gi,
        ' '
      )
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (cleanBody.length >= MIN_TOPIC_CONTENT_CHARS) {
      effectiveContentText = cleanBody.slice(0, MAX_CURRICULUM_CONTENT_CHARS);
      const mdTitle = title ? `# ${title}\n\n` : '';
      effectiveContentMarkdown = `${mdTitle}${effectiveContentText}`.slice(0, MAX_CURRICULUM_CONTENT_CHARS);
      matchedSelectors.contentRoot = [...(matchedSelectors.contentRoot ?? []), 'body_text_fallback'];
    }
  }

  const extractionWarnings: string[] = [];
  if (!hasContent) extractionWarnings.push('topic_content_not_visible');
  if (breadcrumbs.length === 0 && !topicId) extractionWarnings.push('topic_not_visible');
  if (!title) extractionWarnings.push('title_not_visible');

  const draftContext: OrthobulletsPageContext = {
    source: 'orthobullets',
    provider: 'orthobullets',
    mode: 'topic_page',
    pageUrl,
    sourceUrl: pageUrl,
    pageKind: 'topic',
    topicId,
    title,
    breadcrumbs,
    sectionHeadings: effectiveSectionHeadings,
    contentText: effectiveContentText,
    contentMarkdown: effectiveContentMarkdown,
    contentSections: curriculum.contentSections,
    tablesMarkdown: curriculum.tablesMarkdown,
    references: curriculum.references,
    referencesCount: curriculum.referencesCount,
    tablesCount: curriculum.tablesCount,
    answerChoices: [],
    percentDistribution: [],
    linkedConcepts: [],
    images,
    questionCount,
    cardCount,
    videoCount,
    extractionWarnings,
    raw: {
      providerSpecific: {
        adapter: 'orthobullets-topic',
        extractionStrategy: curriculum.extractionStrategy,
        contentCharCount: curriculum.contentCharCount,
        usedBodyTextFallback: !hasContent && Boolean(effectiveContentText),
      },
    },
    debug: {
      matchedSelectors,
      extractorVersion: EXTRACTOR_VERSION,
    },
  };

  return {
    ...draftContext,
    classification: classifyPage(draftContext),
  };
}

export function extractQuestionContext(input: {
  document: DocumentLike;
  pageUrl?: string;
}): OrthobulletsPageContext | null {
  const provider = detectQuestionProvider(input);
  if (provider === 'orthobullets') {
    const pageUrl = input.pageUrl ?? input.document.locationHref ?? '';
    if (isLikelyOrthobulletsTopicUrl(pageUrl)) {
      return extractOrthobulletsTopicPageContext(input);
    }
    const questionContext = extractOrthobulletsPageContext(input);
    if (!questionContext.stem && questionContext.answerChoices.length === 0) {
      return extractOrthobulletsTopicPageContext(input);
    }
    return questionContext;
  }
  if (provider === 'rock') return extractRockPageContext(input);
  return null;
}
