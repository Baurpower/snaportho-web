import { createHash } from 'node:crypto';

export const LEARNING_PAGE_EXTRACTOR_VERSION = 'rock-structured-v3';
export const LEARNING_PAGE_PROMPT_VERSION = 'curriculum-map-reduce-v1';

export type LearningPageSectionInput = {
  id?: string;
  heading?: string;
  level?: number;
  text: string;
};

export type LearningPageChunk = {
  chunkId: string;
  pageId: string;
  sectionIds: string[];
  headingPath: string[];
  content: string;
  estimatedInputTokens: number;
  sequence: number;
  totalChunks: number;
};

export const LEARNING_PAGE_BUDGET = {
  modelInputTokens: 16_000,
  systemAndMetadataTokens: 2_500,
  responseTokens: 2_500,
  safetyMarginTokens: 2_000,
  sourceTokens: 9_000,
} as const;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Curriculum prose contains abbreviations, numbers, and table syntax, so a
  // conservative 3.5 chars/token is safer than the usual English 4 chars.
  return Math.ceil(text.length / 3.5);
}

export function stableLearningPageHash(value: string): string {
  return createHash('sha256').update(value.replace(/\s+/g, ' ').trim(), 'utf8').digest('hex');
}

function splitAtSentenceBoundaries(text: string, maxTokens: number): string[] {
  if (estimateTokens(text) <= maxTokens) return [text.trim()];
  const sentences = text.match(/[^.!?\n]+(?:[.!?]+|\n|$)/g)?.map((part) => part.trim()).filter(Boolean) ?? [text];
  const output: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (estimateTokens(sentence) > maxTokens) {
      if (current) output.push(current);
      const maxChars = Math.max(500, Math.floor(maxTokens * 3.5));
      for (let offset = 0; offset < sentence.length; offset += maxChars) {
        output.push(sentence.slice(offset, offset + maxChars).trim());
      }
      current = '';
    } else if (estimateTokens(`${current}\n${sentence}`) > maxTokens) {
      if (current) output.push(current);
      current = sentence;
    } else {
      current = current ? `${current}\n${sentence}` : sentence;
    }
  }
  if (current) output.push(current);
  return output.filter(Boolean);
}

export function chunkLearningPage(input: {
  pageId: string;
  title: string;
  sections: LearningPageSectionInput[];
  maxSourceTokens?: number;
}): LearningPageChunk[] {
  const maxTokens = input.maxSourceTokens ?? LEARNING_PAGE_BUDGET.sourceTokens;
  const normalized = input.sections.flatMap((section, index) => {
    const id = section.id?.trim() || `section-${index + 1}`;
    const heading = section.heading?.trim() || input.title;
    return splitAtSentenceBoundaries(section.text.replace(/\s+\n/g, '\n').trim(), maxTokens - 100)
      .map((text, part) => ({ id, heading, level: section.level ?? 2, text, part }));
  });

  const drafts: Array<Omit<LearningPageChunk, 'sequence' | 'totalChunks'>> = [];
  let items: typeof normalized = [];
  const flush = () => {
    if (!items.length) return;
    const sectionIds = [...new Set(items.map((item) => item.id))];
    const headingPath = [...new Set(items.map((item) => item.heading))];
    const content = items.map((item) => `## ${item.heading}${item.part ? ` (continued ${item.part + 1})` : ''}\n${item.text}`).join('\n\n');
    const identity = `${input.pageId}|${sectionIds.join(',')}|${drafts.length}|${content}`;
    drafts.push({
      chunkId: `chunk-${stableLearningPageHash(identity).slice(0, 16)}`,
      pageId: input.pageId,
      sectionIds,
      headingPath,
      content,
      estimatedInputTokens: estimateTokens(content),
    });
    items = [];
  };

  for (const item of normalized) {
    const candidate = [...items, item].map((part) => `## ${part.heading}\n${part.text}`).join('\n\n');
    if (items.length && estimateTokens(candidate) > maxTokens) flush();
    items.push(item);
  }
  flush();
  return drafts.map((chunk, index) => ({ ...chunk, sequence: index + 1, totalChunks: drafts.length }));
}

export function learningPageCacheKey(input: {
  sourceUrl: string;
  contentHash: string;
  mode: string;
  model: string;
}): string {
  return stableLearningPageHash([
    input.sourceUrl.replace(/[?#].*$/, ''),
    input.contentHash,
    LEARNING_PAGE_EXTRACTOR_VERSION,
    LEARNING_PAGE_PROMPT_VERSION,
    input.model,
    input.mode,
  ].join('|'));
}
