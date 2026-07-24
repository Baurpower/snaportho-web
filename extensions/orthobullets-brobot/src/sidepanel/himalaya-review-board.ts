// AAOS Himalaya review board.
//
// Renders every question in a finished attempt as one scannable list, driven
// entirely by te6 API data. Misses expand by default with a BroBot teaching
// answer; correct questions stay collapsed until asked for, so a full test can
// be reviewed without opening a single modal on the page.

import type { OrthobulletsExplainResponse, OrthobulletsPageContext } from '../shared/types.js';

export type ReviewBoardRow = {
  questionAttemptId: number;
  questionNumber: number | null;
  isCorrect: boolean | null;
  stemPreview: string;
  selectedAnswer: string | null;
  correctAnswer: string | null;
  hasExplanation: boolean;
};

export type ReviewBoardRowState = {
  expanded: boolean;
  loading: boolean;
  explanation: OrthobulletsExplainResponse | null;
  error: string | null;
};

export type ReviewBoardHooks = {
  onToggleRow: (questionAttemptId: number) => void;
  onExplainRow: (questionAttemptId: number) => void;
  onExplainAllMisses: () => void;
  onUnlink: () => void;
};

export type ReviewBoardRenderers = {
  escapeHtml: (value: string) => string;
  renderExplanation: (explanation: OrthobulletsExplainResponse, mode: 'question_tutor') => string;
};

/** Read the board rows the extractor attached to the overview page context. */
export function getReviewBoardRows(pageContext: OrthobulletsPageContext | null): ReviewBoardRow[] {
  const raw = pageContext?.raw?.providerSpecific?.reviewBoard;
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is ReviewBoardRow => {
    if (!row || typeof row !== 'object') return false;
    return typeof (row as ReviewBoardRow).questionAttemptId === 'number';
  });
}

export function summarizeBoard(rows: ReviewBoardRow[]) {
  const missed = rows.filter((row) => row.isCorrect === false);
  const correct = rows.filter((row) => row.isCorrect === true);
  return {
    total: rows.length,
    missedCount: missed.length,
    correctCount: correct.length,
    missedIds: missed.map((row) => row.questionAttemptId),
  };
}

function statusChip(row: ReviewBoardRow, escapeHtml: (value: string) => string) {
  if (row.isCorrect === false) {
    return `<span style="flex:none;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:6px;background:#dc2626;color:white;font-weight:700;font-size:12px;" aria-label="Missed">✕</span>`;
  }
  if (row.isCorrect === true) {
    return `<span style="flex:none;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:6px;background:#16a34a;color:white;font-weight:700;font-size:12px;" aria-label="Correct">✓</span>`;
  }
  return `<span style="flex:none;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:6px;background:#94a3b8;color:white;font-weight:700;font-size:12px;" aria-label="Unanswered">${escapeHtml('–')}</span>`;
}

function answerLine(label: string, value: string | null, tone: 'miss' | 'correct', escapeHtml: (value: string) => string) {
  if (!value) return '';
  const color = tone === 'miss' ? '#b91c1c' : '#15803d';
  return `<p style="margin:0;font-size:12px;line-height:1.5;color:#384152;">
    <strong style="color:${color};">${escapeHtml(label)}</strong> ${escapeHtml(value)}
  </p>`;
}

function renderRow(input: {
  row: ReviewBoardRow;
  rowState: ReviewBoardRowState;
  escapeHtml: (value: string) => string;
  renderExplanation: ReviewBoardRenderers['renderExplanation'];
}) {
  const { row, rowState, escapeHtml } = input;
  const missed = row.isCorrect === false;
  const borderColor = missed ? '#fecaca' : '#e2e8f0';
  const headerBackground = missed ? '#fef2f2' : 'white';
  const numberLabel = row.questionNumber != null ? `Q${row.questionNumber}` : 'Question';

  const body = rowState.expanded
    ? `<div style="padding:0 12px 12px;display:grid;gap:10px;border-top:1px solid ${borderColor};padding-top:10px;">
        <p style="margin:0;font-size:13px;line-height:1.55;color:#18202b;">${escapeHtml(row.stemPreview)}${row.stemPreview.length >= 180 ? '…' : ''}</p>
        <div style="display:grid;gap:4px;">
          ${answerLine('You answered:', row.selectedAnswer, 'miss', escapeHtml)}
          ${answerLine('Correct answer:', row.correctAnswer, 'correct', escapeHtml)}
        </div>
        ${
          rowState.loading
            ? `<p style="margin:0;font-size:12px;color:#0f766e;font-weight:600;">BroBot is working through this one…</p>`
            : ''
        }
        ${
          rowState.error
            ? `<p style="margin:0;font-size:12px;color:#a02d1f;line-height:1.5;">${escapeHtml(rowState.error)}</p>`
            : ''
        }
        ${rowState.explanation ? input.renderExplanation(rowState.explanation, 'question_tutor') : ''}
        ${
          !rowState.explanation && !rowState.loading
            ? `<div><button data-explain-id="${row.questionAttemptId}" style="border:none;border-radius:999px;background:#0f766e;color:white;padding:8px 14px;font-weight:700;font-size:12px;cursor:pointer;">Explain with BroBot</button></div>`
            : ''
        }
      </div>`
    : '';

  return `<li style="list-style:none;border:1px solid ${borderColor};border-radius:12px;overflow:hidden;background:white;">
    <button data-toggle-id="${row.questionAttemptId}" aria-expanded="${rowState.expanded ? 'true' : 'false'}"
      style="width:100%;box-sizing:border-box;display:flex;align-items:center;gap:10px;padding:10px 12px;background:${headerBackground};border:none;text-align:left;cursor:pointer;font:inherit;">
      ${statusChip(row, escapeHtml)}
      <span style="flex:none;font-weight:700;font-size:13px;color:#18202b;">${escapeHtml(numberLabel)}</span>
      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:#5c6574;">${escapeHtml(row.stemPreview)}</span>
      <span style="flex:none;color:#5c6574;font-size:12px;">${rowState.expanded ? '▲' : '▼'}</span>
    </button>
    ${body}
  </li>`;
}

export function appendHimalayaReviewBoard(
  content: HTMLElement,
  input: {
    rows: ReviewBoardRow[];
    rowStates: Map<number, ReviewBoardRowState>;
    assessmentTitle: string | null;
    score: number | null;
    maxScore: number | null;
    explainAllInFlight: boolean;
    hooks: ReviewBoardHooks;
    renderers: ReviewBoardRenderers;
  }
) {
  const { rows, rowStates, hooks, renderers } = input;
  const { escapeHtml } = renderers;
  const summary = summarizeBoard(rows);

  const createElement = (html: string) => {
    const host = document.createElement('div');
    host.innerHTML = html;
    return host.firstElementChild as HTMLElement;
  };

  if (!rows.length) {
    content.appendChild(
      createElement(`<div style="padding:14px;border-radius:16px;background:#f0fdfa;border:1px solid #99f6e4;display:grid;gap:8px;">
        <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">AAOS Himalaya</p>
        <p style="margin:0;color:#384152;line-height:1.5;">Loading your results… If this stays empty, open a question on the page and BroBot will review it directly.</p>
      </div>`)
    );
    return;
  }

  const scoreLabel = input.score != null && input.maxScore != null ? `${input.score}/${input.maxScore}` : null;
  const header = createElement(`<div style="padding:14px;border-radius:16px;background:#f0fdfa;border:1px solid #99f6e4;display:grid;gap:10px;">
    <div style="display:grid;gap:4px;">
      <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">Review board</p>
      ${input.assessmentTitle ? `<p style="margin:0;font-size:13px;line-height:1.4;color:#18202b;font-weight:600;">${escapeHtml(input.assessmentTitle)}</p>` : ''}
      <p style="margin:0;color:#384152;line-height:1.5;font-size:13px;">
        ${scoreLabel ? `<strong>${escapeHtml(scoreLabel)}</strong> · ` : ''}${summary.missedCount} missed of ${summary.total}
      </p>
    </div>
    ${
      summary.missedCount
        ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="rb-explain-misses" ${input.explainAllInFlight ? 'disabled' : ''}
              style="border:none;border-radius:999px;background:${input.explainAllInFlight ? '#94a3b8' : '#0f766e'};color:white;padding:9px 14px;font-weight:700;font-size:13px;cursor:${input.explainAllInFlight ? 'default' : 'pointer'};">
              ${input.explainAllInFlight ? 'Working through your misses…' : `Walk my ${summary.missedCount} miss${summary.missedCount === 1 ? '' : 'es'}`}
            </button>
          </div>`
        : `<p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">Clean sweep — nothing missed on this attempt.</p>`
    }
  </div>`);
  content.appendChild(header);
  header.querySelector('#rb-explain-misses')?.addEventListener('click', () => hooks.onExplainAllMisses());

  const defaultRowState: ReviewBoardRowState = { expanded: false, loading: false, explanation: null, error: null };
  const list = createElement(`<ul style="margin:0;padding:0;display:grid;gap:8px;">
    ${rows
      .map((row) =>
        renderRow({
          row,
          rowState: rowStates.get(row.questionAttemptId) ?? defaultRowState,
          escapeHtml,
          renderExplanation: renderers.renderExplanation,
        })
      )
      .join('')}
  </ul>`);
  content.appendChild(list);

  list.querySelectorAll<HTMLButtonElement>('[data-toggle-id]').forEach((button) => {
    button.addEventListener('click', () => hooks.onToggleRow(Number(button.dataset.toggleId)));
  });
  list.querySelectorAll<HTMLButtonElement>('[data-explain-id]').forEach((button) => {
    button.addEventListener('click', () => hooks.onExplainRow(Number(button.dataset.explainId)));
  });

  const footer = createElement(`<div style="display:flex;gap:8px;flex-wrap:wrap;">
    <button id="rb-unlink" style="border:1px solid #d2cab8;border-radius:999px;background:#f7f5ef;color:#18202b;padding:9px 14px;font-weight:700;font-size:12px;cursor:pointer;">Unlink</button>
  </div>`);
  content.appendChild(footer);
  footer.querySelector('#rb-unlink')?.addEventListener('click', () => hooks.onUnlink());
}
