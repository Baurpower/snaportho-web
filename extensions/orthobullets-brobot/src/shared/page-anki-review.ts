export type PageAnkiCard = {
  noteGuid: string;
  cardOrdinal: number;
  prompt: string;
  answer: string;
  extra: string | null;
};

export type PageAnkiReview = {
  provider: 'orthobullets' | 'rock';
  pageUrl: string;
  cards: PageAnkiCard[];
};

const SAFE_GUID = /^[A-Za-z0-9._:-]{1,200}$/;

export function readPageAnkiReview(value: unknown): PageAnkiReview | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.provider !== 'orthobullets' && row.provider !== 'rock') return null;
  if (typeof row.pageUrl !== 'string' || !row.pageUrl.startsWith('https://')) return null;
  if (!Array.isArray(row.cards)) return null;
  const cards = row.cards.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const card = candidate as Record<string, unknown>;
    if (typeof card.noteGuid !== 'string' || !SAFE_GUID.test(card.noteGuid)) return [];
    if (!Number.isInteger(card.cardOrdinal) || Number(card.cardOrdinal) < 0) return [];
    if (typeof card.prompt !== 'string' || typeof card.answer !== 'string') return [];
    return [{
      noteGuid: card.noteGuid,
      cardOrdinal: Number(card.cardOrdinal),
      prompt: card.prompt.slice(0, 4000),
      answer: card.answer.slice(0, 6000),
      extra: typeof card.extra === 'string' ? card.extra.slice(0, 4000) : null,
    }];
  });
  return { provider: row.provider, pageUrl: row.pageUrl, cards };
}

