import { SELECTOR_SET_VERSION, SELECTORS } from './selectors.js';
import type {
  OrthobulletsChoice,
  OrthobulletsImageMetadata,
  OrthobulletsLinkedConcept,
  OrthobulletsPageContext,
  OrthobulletsPercentDistribution,
} from '../shared/types.js';

export const EXTRACTOR_VERSION = '2026-06-29-testview-review-v2';
export { SELECTOR_SET_VERSION };

type DomElementLike = {
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
    pageUrl,
    pageKind,
    questionId,
    topicId,
    breadcrumbs,
    stem: stem || undefined,
    answerChoices: choices.answerChoices,
    selectedAnswerKey: choices.selectedAnswerKey,
    correctAnswerKey: choices.correctAnswerKey,
    percentDistribution: choices.percentDistribution,
    explanationText: explanationText || undefined,
    linkedConcepts,
    images,
    extractionWarnings,
    debug: {
      matchedSelectors,
      extractorVersion: EXTRACTOR_VERSION,
    },
  };
}
