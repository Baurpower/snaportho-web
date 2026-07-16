const KEY = 'snaportho:personal-statement:pending-draft';
const MAX_AGE_MS = 30 * 60 * 1000;

export type PendingPersonalStatementDraft = {
  text: string; sourceType: 'paste' | 'docx' | 'pdf' | 'txt'; filename: string | null; intendedAction: 'review' | 'compare' | null; timestamp: number;
};

export function savePendingPersonalStatementDraft(draft: Omit<PendingPersonalStatementDraft, 'timestamp'>) {
  if (typeof window === 'undefined' || !draft.text.trim()) return;
  try { window.sessionStorage.setItem(KEY, JSON.stringify({ ...draft, timestamp: Date.now() })); } catch { /* Best effort during navigation. */ }
}

export function readPendingPersonalStatementDraft(): PendingPersonalStatementDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY); if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PendingPersonalStatementDraft>;
    if (typeof value.text !== 'string' || typeof value.timestamp !== 'number' || Date.now() - value.timestamp > MAX_AGE_MS) { clearPendingPersonalStatementDraft(); return null; }
    return { text: value.text, sourceType: value.sourceType || 'paste', filename: value.filename || null, intendedAction: value.intendedAction || null, timestamp: value.timestamp };
  } catch { clearPendingPersonalStatementDraft(); return null; }
}

export function clearPendingPersonalStatementDraft() { try { window.sessionStorage.removeItem(KEY); } catch { /* Best effort. */ } }
