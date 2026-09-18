export type AnkiReference = {
  id: string;
  number: number;
  claimId: string;
  anchorText: string;
  cardId: string;
  cardVersionId: string;
  releaseId: string;
  deckPath: string;
  title: string;
  token: string;
};

export type AnkiCardDetail = {
  cardVersionId: string;
  deckPath: string;
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

export function searchTerms(sentence: string): string[] {
  return [...new Set((sentence.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? [])
    .filter((term) => !STOP.has(term)))].slice(0, 8);
}

/** A short label that cannot reveal any of the card's cloze answers. */
export function safeCardLabel(deckPath: string): string {
  const sanitized = deckPath.replace(CLOZE, '…').replace(/\{\{[^}]*$/g, '');
  const parts = sanitized.split('::').map((part) => part.trim()).filter(Boolean);
  const label = parts.at(-1);
  return label?.slice(0, 90) || 'Study card';
}

export function cardPreview(front: string, ordinal: number, deckPath: string): string {
  const masked = renderCloze(front, ordinal, false).replace(/\{\{c\d+::[^}]*\}\}/gi, '…');
  const preview = plainCardText(masked).replace(/\s+/g, ' ').trim();
  return preview.length >= 12
    ? (preview.length > 100 ? `${preview.slice(0, 97).trimEnd()}…` : preview)
    : safeCardLabel(deckPath);
}

function simpleNumbers(value: string) {
  return [...value.matchAll(/\b\d+(?:\.\d+)?\b/g)].map((match) => match[0]);
}

/** Vetoes obvious contradictions before and after semantic verification. */
export function obviousConflict(claim: string, card: string) {
  const cleanClaim = plainCardText(claim).toLowerCase();
  const cleanCard = plainCardText(card).toLowerCase();
  const negation = /\b(?:not|never|without|no)\b/;
  if (negation.test(cleanClaim) !== negation.test(cleanCard)) return true;
  const side = (value: string) => /\bleft\b/.test(value) ? 'left' : /\bright\b/.test(value) ? 'right' : null;
  if (side(cleanClaim) && side(cleanCard) && side(cleanClaim) !== side(cleanCard)) return true;
  const cardNumbers = simpleNumbers(cleanCard);
  const claimNumbers = simpleNumbers(cleanClaim);
  if (cardNumbers.length && claimNumbers.length && !cardNumbers.some((n) => claimNumbers.includes(n))) return true;
  return false;
}
