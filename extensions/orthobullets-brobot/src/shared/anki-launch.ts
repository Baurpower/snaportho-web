// Exact Anki launch. The only address is the note GUID and card ordinal.

export type AnkiLaunchCommand = {
  noteGuid: string;
  cardOrdinal: number;
  rank: 1 | 2 | 3;
};

const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;
const FORBIDDEN = new Set([
  'stem', 'question', 'questiontext', 'answer', 'answertext', 'explanation',
  'deck', 'deckname', 'deckpath', 'front', 'back',
]);

export function queueAnkiLaunch(command: unknown): { ok: true; command: AnkiLaunchCommand } | { ok: false; error: string } {
  if (!command || typeof command !== 'object' || containsForbidden(command)) {
    return { ok: false, error: 'invalid_launch' };
  }
  const row = command as Record<string, unknown>;
  if (typeof row.noteGuid !== 'string' || !SAFE_ID.test(row.noteGuid)) return { ok: false, error: 'invalid_launch' };
  if (!Number.isInteger(row.cardOrdinal) || (row.cardOrdinal as number) < 0) return { ok: false, error: 'invalid_launch' };
  if (row.rank !== 1 && row.rank !== 2 && row.rank !== 3) return { ok: false, error: 'invalid_launch' };
  return {
    ok: true,
    command: { noteGuid: row.noteGuid, cardOrdinal: row.cardOrdinal as number, rank: row.rank },
  };
}

function containsForbidden(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsForbidden);
  return Object.entries(value as Record<string, unknown>).some(
    ([key, nested]) => FORBIDDEN.has(key.toLowerCase()) || containsForbidden(nested),
  );
}
