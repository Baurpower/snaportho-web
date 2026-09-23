// Learner-loop view for a reviewed miss.
// Shows at most three cards, or an honest empty state. Launch uses the Anki
// note GUID and card ordinal. Feedback is recorded and does not change the match.

import { queueAnkiLaunch, type AnkiLaunchCommand } from '../shared/anki-launch.js';

export type LearnFeedbackSignal = 'helpful' | 'not_helpful' | 'dismissed';

export type LearnCard = {
  noteGuid: string;
  cardOrdinal: number;
  rank: 1 | 2 | 3;
};

export type LearnSnapshot = {
  disposition: 'served' | 'abstain' | 'no_card' | 'not_a_miss';
  gapClass?: string | null;
  reasonCodes?: string[];
  cards?: LearnCard[];
};

export type LearnIdentity = {
  identityStatus?: string | null;
  reviewState?: string | null;
  correct?: boolean | null;
  nativeQuestionId?: string | null;
};

export type LearnLaunchCommand = AnkiLaunchCommand;
export { queueAnkiLaunch };

export type LearnThisNowModel =
  | { visible: false }
  | {
      visible: true;
      kind: 'empty';
      title: string;
      message: string;
    }
  | {
      visible: true;
      kind: 'cards';
      title: string;
      cards: LearnCard[];
    };

const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;
const FORBIDDEN = new Set([
  'stem', 'question', 'questiontext', 'answer', 'answertext', 'explanation',
  'deck', 'deckname', 'deckpath', 'front', 'back',
]);

export function readLearnIdentity(value: unknown): LearnIdentity | null {
  if (!value || typeof value !== 'object' || containsForbidden(value)) return null;
  const row = value as Record<string, unknown>;
  return {
    identityStatus: typeof row.identityStatus === 'string' ? row.identityStatus : null,
    reviewState: typeof row.reviewState === 'string' ? row.reviewState : null,
    correct: typeof row.correct === 'boolean' ? row.correct : row.correct === null ? null : null,
    nativeQuestionId: typeof row.nativeQuestionId === 'string' ? row.nativeQuestionId : null,
  };
}

export function learnThisNowModel(
  identity: LearnIdentity | null,
  snapshot: LearnSnapshot | null,
  enabled = true,
): LearnThisNowModel {
  if (!enabled || !identity) return { visible: false };
  if (identity.reviewState !== 'answered_review' || identity.correct !== false) return { visible: false };
  if (identity.identityStatus !== 'stable' || !identity.nativeQuestionId) {
    return {
      visible: true,
      kind: 'empty',
      title: 'Learn this now',
      message: 'This question has no stable id yet, so no card is recommended.',
    };
  }
  const reasons = snapshot?.reasonCodes ?? [];
  if (!snapshot || snapshot.disposition === 'abstain' || snapshot.disposition === 'no_card' || snapshot.disposition === 'not_a_miss') {
    const held = reasons.includes('safety_hold');
    return {
      visible: true,
      kind: 'empty',
      title: 'Learn this now',
      message: held
        ? 'This topic is held for review. No card is opened.'
        : snapshot?.disposition === 'no_card'
          ? 'No SnapOrtho card teaches this fact yet.'
          : 'No card recommendation for this miss.',
    };
  }
  const cards = (snapshot.cards ?? [])
    .filter((card) => SAFE_ID.test(card.noteGuid) && Number.isInteger(card.cardOrdinal) && card.cardOrdinal >= 0)
    .slice(0, 3);
  if (!cards.length) {
    return {
      visible: true,
      kind: 'empty',
      title: 'Learn this now',
      message: 'No card recommendation for this miss.',
    };
  }
  return { visible: true, kind: 'cards', title: 'Learn this now', cards };
}

/** Weak signal. The returned cards are the same objects the learner was shown. */
export function recordLearnerFeedback<T extends { cards?: LearnCard[] }>(
  snapshot: T,
  signal: LearnFeedbackSignal,
): { signal: LearnFeedbackSignal; cards: LearnCard[]; affectsMatch: false } {
  return {
    signal,
    cards: [...(snapshot.cards ?? [])],
    affectsMatch: false,
  };
}

export function renderLearnThisNow(
  model: LearnThisNowModel,
  escapeHtml: (value: string) => string,
): string {
  if (!model.visible) return '';
  if (model.kind === 'empty') {
    return `<section data-learn-this-now="empty" style="padding:14px;border-radius:16px;background:#f8fafc;border:1px solid #cbd5e1;display:grid;gap:8px;">
      <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">${escapeHtml(model.title)}</p>
      <p style="margin:0;color:#334155;line-height:1.45;">${escapeHtml(model.message)}</p>
    </section>`;
  }
  const rows = model.cards.map((card) => `<li style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
    <span style="font-size:13px;font-weight:700;color:#18202b;">Card ${card.rank}</span>
    <button type="button" data-open-anki="1" data-note-guid="${escapeHtml(card.noteGuid)}" data-card-ordinal="${card.cardOrdinal}" data-rank="${card.rank}" style="border:1px solid #0f766e;border-radius:999px;background:white;color:#0f766e;padding:6px 10px;font-weight:700;font-size:12px;cursor:pointer;">Open in Anki</button>
  </li>`).join('');
  return `<section data-learn-this-now="cards" style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;display:grid;gap:10px;">
    <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">${escapeHtml(model.title)}</p>
    <ol style="margin:0;padding:0;list-style:none;display:grid;gap:8px;">${rows}</ol>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button type="button" data-learn-feedback="helpful" style="border:0;border-radius:999px;background:#0f766e;color:white;padding:6px 10px;font-weight:700;font-size:12px;cursor:pointer;">Helpful</button>
      <button type="button" data-learn-feedback="not_helpful" style="border:1px solid #d2cab8;border-radius:999px;background:#f7f5ef;padding:6px 10px;font-weight:700;font-size:12px;cursor:pointer;">Not this</button>
      <button type="button" data-learn-feedback="dismissed" style="border:0;background:transparent;color:#64748b;font-weight:700;font-size:12px;cursor:pointer;">Dismiss</button>
    </div>
  </section>`;
}

export function bindLearnThisNow(
  root: ParentNode,
  hooks: {
    onOpenAnkiCard?: (command: LearnLaunchCommand) => void;
    onLearnerFeedback?: (feedback: { signal: LearnFeedbackSignal; affectsMatch: false }) => void;
  },
  snapshot: { cards?: LearnCard[] } | null,
) {
  root.querySelectorAll<HTMLButtonElement>('[data-open-anki]').forEach((button) => {
    button.addEventListener('click', () => {
      const queued = queueAnkiLaunch({
        noteGuid: button.dataset.noteGuid,
        cardOrdinal: Number(button.dataset.cardOrdinal),
        rank: Number(button.dataset.rank),
      });
      if (queued.ok) hooks.onOpenAnkiCard?.(queued.command);
    });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-learn-feedback]').forEach((button) => {
    button.addEventListener('click', () => {
      const signal = button.dataset.learnFeedback;
      if (signal !== 'helpful' && signal !== 'not_helpful' && signal !== 'dismissed') return;
      const feedback = recordLearnerFeedback(snapshot ?? {}, signal);
      hooks.onLearnerFeedback?.({ signal: feedback.signal, affectsMatch: feedback.affectsMatch });
    });
  });
}

function containsForbidden(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsForbidden);
  return Object.entries(value as Record<string, unknown>).some(
    ([key, nested]) => FORBIDDEN.has(key.toLowerCase()) || containsForbidden(nested),
  );
}
