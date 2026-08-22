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
  topicLabel: string;
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
  onCopyDebrief: () => void;
  onClearDebrief: () => void;
  onUnlink: () => void;
};

export function himalayaDebriefStorageKey(pageContext: OrthobulletsPageContext | null) {
  const providerSpecific = pageContext?.raw?.providerSpecific;
  const identity = providerSpecific?.testAttemptId ?? pageContext?.pageUrl ?? 'unknown';
  return `snaportho:himalaya-debrief:v1:${identity}`;
}

export function himalayaDebriefText(
  rows: ReviewBoardRow[],
  rowStates: Map<number, ReviewBoardRowState>,
  assessmentTitle: string | null
) {
  const ready = rows.flatMap((row) => {
    const explanation = rowStates.get(row.questionAttemptId)?.explanation;
    return explanation ? [{ row, explanation }] : [];
  });
  const concepts = [...new Set(ready.map(({ explanation }) => explanation.testedConcept))];
  return [
    `# ${assessmentTitle || 'AAOS Himalaya test debrief'}`,
    '',
    `${summarizeBoard(rows).correctCount}/${rows.length} correct; ${summarizeBoard(rows).missedCount} missed.`,
    '',
    '## Pattern diagnosis',
    ...(concepts.length ? concepts.map((concept) => `- ${concept}`) : ['- No completed explanations yet.']),
    '',
    '## Miss analysis',
    ...ready.flatMap(({ row, explanation }) => [
      `### Q${row.questionNumber ?? '?'} · ${explanation.testedConcept}`,
      `- You answered: ${row.selectedAnswer ?? 'unknown'}`,
      `- Correct answer: ${row.correctAnswer ?? 'unknown'}`,
      `- Bottom line: ${explanation.bottomLine}`,
      `- Main trap: ${explanation.boardTrap ?? explanation.whyWrong[0]?.reason ?? 'Not identified'}`,
      `- Remember: ${explanation.boardPearl}`,
      '',
    ]),
    '## Active recall',
    ...ready.map(({ explanation }) => `- Explain ${explanation.testedConcept}, including the decisive clue and main trap.`),
    '',
    '## Remediation',
    ...[...new Set(ready.flatMap(({ explanation }) => explanation.studyNext))].map((item) => `- ${item}`),
  ].join('\n');
}

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
  const topicLabel = rowState.explanation?.testedConcept || row.topicLabel;

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
        ${rowState.explanation ? `<div style="display:grid;gap:9px;padding:12px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
          <div><p style="margin:0 0 3px;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:#0f766e;font-weight:800;">Bottom line</p><p style="margin:0;font-size:13px;line-height:1.5;color:#18202b;font-weight:700;">${escapeHtml(rowState.explanation.bottomLine)}</p></div>
          <div><p style="margin:0 0 3px;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:#0f766e;font-weight:800;">Why</p><p style="margin:0;font-size:12px;line-height:1.5;color:#384152;">${escapeHtml(rowState.explanation.whyCorrect)}</p></div>
          ${rowState.explanation.boardTrap ? `<div><p style="margin:0 0 3px;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:#b45309;font-weight:800;">Trap</p><p style="margin:0;font-size:12px;line-height:1.5;color:#384152;">${escapeHtml(rowState.explanation.boardTrap)}</p></div>` : ''}
          <div><p style="margin:0 0 3px;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:#0f766e;font-weight:800;">Remember</p><p style="margin:0;font-size:12px;line-height:1.5;color:#384152;">${escapeHtml(rowState.explanation.boardPearl)}</p></div>
        </div>` : ''}
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
      <span style="flex:none;font-weight:800;font-size:12px;color:#18202b;">${escapeHtml(numberLabel)}</span>
      <span style="flex:1;min-width:0;display:grid;gap:2px;"><strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:#18202b;">${escapeHtml(topicLabel)}</strong><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#64748b;">${escapeHtml(row.stemPreview)}</span></span>
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
  const missedRows = rows.filter((row) => row.isCorrect === false);
  const correctRows = rows.filter((row) => row.isCorrect === true);
  const completedExplanations = rows.filter((row) => rowStates.get(row.questionAttemptId)?.explanation).length;
  const concepts = [...new Set(rows.flatMap((row) => {
    const explanation = rowStates.get(row.questionAttemptId)?.explanation;
    return explanation ? [explanation.testedConcept] : [];
  }))];

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
  const header = createElement(`<section style="padding:16px;border-radius:18px;background:linear-gradient(145deg,#0f766e,#115e59);color:white;display:grid;gap:11px;box-shadow:0 10px 28px rgba(15,118,110,.18);">
    <div style="display:grid;gap:4px;">
      <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#ccfbf1;font-weight:800;">Post-test review</p>
      <h2 style="margin:2px 0 0;font-size:22px;line-height:1.2;color:white;">${summary.missedCount ? `${summary.missedCount} question${summary.missedCount === 1 ? '' : 's'} to review` : 'Nothing missed'}</h2>
      <p style="margin:0;font-size:12px;color:#ccfbf1;">${escapeHtml(scoreLabel ?? `${summary.correctCount}/${summary.total}`)} correct${input.assessmentTitle ? ` · ${escapeHtml(input.assessmentTitle.replace(/^Posttest:\s*/i, ''))}` : ''}</p>
    </div>
    ${
      summary.missedCount
        ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="rb-explain-misses" ${input.explainAllInFlight ? 'disabled' : ''}
              style="width:100%;border:none;border-radius:12px;background:${input.explainAllInFlight ? '#99a8a6' : 'white'};color:#0f766e;padding:11px 14px;font-weight:800;font-size:13px;cursor:${input.explainAllInFlight ? 'default' : 'pointer'};">
              ${input.explainAllInFlight ? 'Summarizing your misses…' : completedExplanations >= summary.missedCount ? 'Refresh summaries' : 'Summarize missed questions'}
            </button>
          </div>`
        : `<p style="margin:0;font-size:13px;color:#d1fae5;font-weight:700;">Clean sweep — nothing missed on this attempt.</p>`
    }
  </section>`);
  content.appendChild(header);
  header.querySelector('#rb-explain-misses')?.addEventListener('click', () => hooks.onExplainAllMisses());

  if (completedExplanations || input.explainAllInFlight) {
    const debriefSummary = createElement(`<section style="padding:14px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;display:grid;gap:10px;">
      <div>
        <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#9a3412;font-weight:800;">Full debrief</p>
        <p style="margin:4px 0 0;font-size:12px;color:#5c6574;">${completedExplanations} of ${summary.missedCount} misses analyzed · saved locally</p>
      </div>
      ${concepts.length ? `<div><p style="margin:0 0 4px;font-weight:800;font-size:13px;">Pattern diagnosis</p>${concepts.map((concept) => `<p style="margin:2px 0;font-size:12px;color:#384152;">• ${escapeHtml(concept)}</p>`).join('')}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="rb-copy-debrief" style="border:1px solid #c2410c;border-radius:999px;background:white;color:#9a3412;padding:7px 11px;font-weight:700;font-size:12px;cursor:pointer;">Copy debrief</button>
        <button id="rb-clear-debrief" style="border:none;background:transparent;color:#64748b;padding:7px;font-weight:700;font-size:12px;cursor:pointer;">Clear saved debrief</button>
      </div>
    </section>`);
    content.appendChild(debriefSummary);
    debriefSummary.querySelector('#rb-copy-debrief')?.addEventListener('click', () => hooks.onCopyDebrief());
    debriefSummary.querySelector('#rb-clear-debrief')?.addEventListener('click', () => hooks.onClearDebrief());
  }

  const defaultRowState: ReviewBoardRowState = { expanded: false, loading: false, explanation: null, error: null };
  const list = createElement(`<section style="display:grid;gap:8px;"><div style="display:flex;align-items:end;justify-content:space-between;gap:12px;"><div><p style="margin:0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#0f766e;font-weight:800;">Missed concepts</p><h2 style="margin:3px 0 0;font-size:17px;color:#18202b;">What to tighten up</h2></div><span style="font-size:12px;color:#64748b;">Tap to expand</span></div><ul style="margin:0;padding:0;display:grid;gap:8px;">
    ${missedRows
      .map((row) =>
        renderRow({
          row,
          rowState: rowStates.get(row.questionAttemptId) ?? defaultRowState,
          escapeHtml,
          renderExplanation: renderers.renderExplanation,
        })
      )
      .join('')}
  </ul></section>`);
  content.appendChild(list);

  list.querySelectorAll<HTMLButtonElement>('[data-toggle-id]').forEach((button) => {
    button.addEventListener('click', () => hooks.onToggleRow(Number(button.dataset.toggleId)));
  });
  list.querySelectorAll<HTMLButtonElement>('[data-explain-id]').forEach((button) => {
    button.addEventListener('click', () => hooks.onExplainRow(Number(button.dataset.explainId)));
  });

  if (correctRows.length) {
    const correctSection = createElement(`<details style="border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;overflow:hidden;"><summary style="padding:11px 12px;cursor:pointer;font-size:12px;font-weight:800;color:#475569;">${correctRows.length} correct answer${correctRows.length === 1 ? '' : 's'}</summary><ul style="margin:0;padding:0 8px 8px;display:grid;gap:6px;">${correctRows.map((row) => renderRow({ row, rowState: rowStates.get(row.questionAttemptId) ?? defaultRowState, escapeHtml, renderExplanation: renderers.renderExplanation })).join('')}</ul></details>`);
    content.appendChild(correctSection);
    correctSection.querySelectorAll<HTMLButtonElement>('[data-toggle-id]').forEach((button) => button.addEventListener('click', () => hooks.onToggleRow(Number(button.dataset.toggleId))));
    correctSection.querySelectorAll<HTMLButtonElement>('[data-explain-id]').forEach((button) => button.addEventListener('click', () => hooks.onExplainRow(Number(button.dataset.explainId))));
  }

  const footer = createElement(`<div style="display:flex;gap:8px;flex-wrap:wrap;">
    <button id="rb-unlink" style="border:1px solid #d2cab8;border-radius:999px;background:#f7f5ef;color:#18202b;padding:9px 14px;font-weight:700;font-size:12px;cursor:pointer;">Unlink</button>
  </div>`);
  content.appendChild(footer);
  footer.querySelector('#rb-unlink')?.addEventListener('click', () => hooks.onUnlink());
}
