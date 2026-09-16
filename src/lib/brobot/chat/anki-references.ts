export type AnkiReference = {
  id: string;
  number: number;
  anchorText: string;
  cardId: string;
  cardVersionId: string;
  releaseId: string;
  deckPath: string;
  title: string;
  front: string;
  back: string;
  extra: string;
  frontHtml: string;
  backHtml: string;
  extraHtml: string;
  targetCloze: number | null;
  images: Array<{ url: string; alt: string; filename: string }>;
};

type Field = { name?: string; rawValue?: string; value?: string; plainText?: string };

const STOP = new Set('about after answer based before between could during from have into most other should their there these those through under using which while with would'.split(' '));
const CLOZE = /\{\{c(\d+)::([\s\S]*?)(?:::(.*?))?\}\}/gi;

export function plainCardText(raw: string): string {
  return raw
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/(?:p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n')
    .trim();
}

export function cardFields(raw: unknown): {
  front: string; back: string; extra: string;
  frontHtml: string; backHtml: string; extraHtml: string;
} {
  const fields = Array.isArray(raw) ? raw as Field[] : [];
  const get = (...names: string[]) => {
    const field = fields.find((item) => names.includes(String(item.name ?? '').toLowerCase()));
    return String(field?.rawValue ?? field?.value ?? field?.plainText ?? '');
  };
  const frontHtml = get('text', 'front', 'question');
  const backHtml = get('back', 'answer');
  const extraHtml = get('extra');
  return {
    front: plainCardText(frontHtml), back: plainCardText(backHtml), extra: plainCardText(extraHtml),
    frontHtml, backHtml, extraHtml,
  };
}

export function renderCloze(text: string, ordinal: number, revealed: boolean): string {
  return text.replace(CLOZE, (_all, rawIndex: string, answer: string, hint?: string) =>
    Number(rawIndex) === ordinal + 1
      ? revealed ? answer : `[…${hint ? ` ${hint}` : ''}]`
      : answer
  );
}

export function answerSentences(answer: string): string[] {
  return answer
    .replace(/^#{1,6}.*$/gm, '')
    .replace(/^\s*[-*\d.)]+\s+/gm, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 35 && part.length <= 450 && !part.includes('|'))
    .slice(0, 14);
}

export function searchTerms(sentence: string): string[] {
  return [...new Set((sentence.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? [])
    .filter((term) => !STOP.has(term)))].slice(0, 8);
}

export function clozeFactMatches(sentence: string, front: string, ordinal: number): boolean {
  const normalizedSentence = plainCardText(sentence).toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  for (const match of front.matchAll(CLOZE)) {
    if (Number(match[1]) !== ordinal + 1) continue;
    const answer = plainCardText(match[2]).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (answer.length < 4 || !normalizedSentence.includes(answer)) continue;
    const context = renderCloze(front, ordinal, false).replace(/\[\.\.\.[^\]]*\]/g, '');
    const terms = searchTerms(context).filter((term) => term !== answer);
    if (terms.filter((term) => normalizedSentence.includes(term)).length >= 2) return true;
  }
  return false;
}
