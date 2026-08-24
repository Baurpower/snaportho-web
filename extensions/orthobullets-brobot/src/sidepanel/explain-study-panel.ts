import {
  detectTopicLabel,
  estimateStudyMinutes,
  isClinicallyImportantWarning,
} from '../shared/curriculum-chips.js';
import type { CurriculumExplainEmphasis, CurriculumStudyResponse, OrthobulletsPageContext } from '../shared/types.js';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderCurriculumGenerationError(input: {
  title: string;
  message: string;
  requestId?: string | null;
  canRetry: boolean;
}) {
  return `<div data-curriculum-generation-error style="padding:12px;border-radius:12px;background:#fff0ef;border:1px solid #f0c0bc;color:#a02d1f;display:grid;gap:7px;">
    <p style="margin:0;font-weight:700;">Page detected, but generation failed</p>
    <p style="margin:0;line-height:1.45;">${escapeHtml(input.title)} ${escapeHtml(input.message)}</p>
    ${input.requestId ? `<p style="margin:0;font-size:11px;color:#7f1d1d;">Request ID: ${escapeHtml(input.requestId)}</p>` : ''}
    ${input.canRetry ? '<button id="retry-curriculum-explain" style="justify-self:start;border:1px solid #a02d1f;border-radius:999px;background:white;color:#a02d1f;padding:6px 12px;font-weight:700;cursor:pointer;">Retry explanation</button>' : ''}
  </div>`;
}

function renderBulletList(items: string[]) {
  if (!items.length) return '';
  return `<ul style="margin:0;padding-left:16px;display:grid;gap:4px;font-size:13px;line-height:1.35;">${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')}</ul>`;
}

function renderCollapsibleCard(input: {
  id: string;
  title: string;
  contentHtml: string;
  expanded?: boolean;
  tone?: 'neutral' | 'accent' | 'warning';
}) {
  const theme =
    input.tone === 'accent'
      ? 'background:#f0fdfa;border:1px solid #99f6e4;'
      : input.tone === 'warning'
        ? 'background:#fffbeb;border:1px solid #fde68a;'
        : 'background:white;border:1px solid #ded7c8;';
  return `<details data-study-section="${escapeHtml(input.id)}" ${input.expanded ? 'open' : ''} style="padding:8px 10px;border-radius:10px;${theme}">
    <summary style="cursor:pointer;font-size:13px;font-weight:700;line-height:1.3;list-style-position:outside;">${escapeHtml(input.title)}</summary>
    <div style="margin-top:6px;display:grid;gap:4px;">${input.contentHtml}</div>
  </details>`;
}

function renderMustKnow(groups: CurriculumStudyResponse['mustKnow']) {
  if (!groups.length) return '';
  return groups
    .map(
      (group) =>
        `<div style="display:grid;gap:4px;">
          <p style="margin:0;font-size:12px;font-weight:700;color:#0f766e;">${escapeHtml(group.title)}</p>
          ${renderBulletList(group.bullets)}
        </div>`,
    )
    .join('');
}

function renderAttendingQuestions(items: CurriculumStudyResponse['attendingQuestions']) {
  if (!items.length) return '';
  return items
    .map(
      (item) =>
        `<details style="padding:0;">
          <summary style="cursor:pointer;font-size:13px;line-height:1.35;"><span style="font-size:11px;color:#5c6574;margin-right:6px;">${escapeHtml(item.difficulty)}</span>${escapeHtml(item.question)}</summary>
          <p style="margin:6px 0 0;font-size:12px;color:#384152;">${escapeHtml(item.answer)}</p>
        </details>`,
    )
    .join('');
}

function renderMiniQuiz(items: CurriculumStudyResponse['miniQuiz']) {
  if (!items.length) return '';
  return items.map((item, index) => `<details style="padding:8px 0;border-bottom:${index < items.length - 1 ? '1px solid #e2e8f0' : 'none'};">
    <summary style="cursor:pointer;font-size:13px;line-height:1.4;font-weight:700;">${escapeHtml(item.question)}</summary>
    <p style="margin:7px 0 2px;font-size:12px;line-height:1.45;color:#0f766e;font-weight:800;">${escapeHtml(item.answer)}</p>
    <p style="margin:0;font-size:12px;line-height:1.45;color:#475569;">${escapeHtml(item.explanation)}</p>
  </details>`).join('');
}

function renderComparisonTable(table: CurriculumStudyResponse['comparisonTable']) {
  if (!table?.headers.length || !table.rows.length) return '';
  return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;line-height:1.35;"><thead><tr>${table.headers.map((header) => `<th style="padding:6px;text-align:left;background:#f1f5f9;border:1px solid #cbd5e1;">${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td style="padding:6px;vertical-align:top;border:1px solid #e2e8f0;">${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export function renderStudyPanelHeader(
  pageContext: OrthobulletsPageContext,
  _selectedEmphasis: CurriculumExplainEmphasis,
) {
  const topic = detectTopicLabel(pageContext);
  const studyMinutes = estimateStudyMinutes(pageContext);
  const refsHeavy = (pageContext.referencesCount ?? pageContext.references?.length ?? 0) >= 3;

  return `<header style="display:grid;gap:6px;padding:10px;border-radius:12px;background:#f8fafc;border:1px solid #cbd5e1;">
    <div style="display:grid;gap:2px;">
      <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">AAOS ROCK</p>
      <h2 style="margin:0;font-size:16px;line-height:1.25;">${escapeHtml(pageContext.title ?? 'Curriculum page')}</h2>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:11px;color:#5c6574;">
      ${topic ? `<span style="padding:3px 7px;border-radius:999px;background:white;border:1px solid #d2cab8;">${escapeHtml(topic)}</span>` : ''}
      ${studyMinutes ? `<span style="padding:3px 7px;border-radius:999px;background:white;border:1px solid #d2cab8;">~${studyMinutes} min</span>` : ''}
      ${(pageContext.tablesCount ?? 0) > 0 ? `<span style="padding:3px 7px;border-radius:999px;background:white;border:1px solid #d2cab8;">${pageContext.tablesCount} tables</span>` : ''}
    </div>
    ${
      refsHeavy
        ? `<p style="margin:0;font-size:11px;color:#7c2d12;line-height:1.35;">Mostly references — themes may be limited.</p>`
        : ''
    }
    <p style="margin:0;font-size:11px;color:#0f766e;font-weight:700;">Complete study guide · boards + clinical + OR</p>
  </header>`;
}

export function renderCurriculumStudyPanel(study: CurriculumStudyResponse, pageContext: OrthobulletsPageContext) {
  const cards: string[] = [];

  cards.push(
    renderCollapsibleCard({
      id: 'takeaway',
      title: 'One-sentence takeaway',
      contentHtml: `<p style="margin:0;font-size:13px;font-weight:600;line-height:1.35;">${escapeHtml(study.oneSentenceTakeaway)}</p>`,
      expanded: true,
      tone: 'accent',
    }),
  );

  if (study.classifications.length) {
    cards.push(
      renderCollapsibleCard({
        id: 'classifications',
        title: study.classifications.length === 1 ? study.classifications[0].title : 'Key classifications',
        contentHtml:
          study.classifications.length === 1
            ? renderBulletList(study.classifications[0].bullets)
            : renderMustKnow(study.classifications),
        expanded: true,
        tone: 'accent',
      }),
    );
  }

  if (study.inThirtySeconds.length) {
    cards.push(
      renderCollapsibleCard({
        id: 'thirty',
        title: 'In 30 Seconds',
        contentHtml: renderBulletList(study.inThirtySeconds),
        expanded: true,
      }),
    );
  }

  if (study.mustKnow.length) {
    cards.push(
      renderCollapsibleCard({
        id: 'mustKnow',
        title: 'Must Know',
        contentHtml: renderMustKnow(study.mustKnow),
        expanded: true,
      }),
    );
  }

  if (study.commonMistakes.length) {
    cards.push(
      renderCollapsibleCard({
        id: 'mistakes',
        title: 'Common Mistakes',
        contentHtml: renderBulletList(study.commonMistakes),
        expanded: true,
      }),
    );
  }

  if (study.clinicalPearls.length) {
    cards.push(
      renderCollapsibleCard({
        id: 'pearls',
        title: 'Clinical & operative pearls',
        contentHtml: renderBulletList(study.clinicalPearls),
        expanded: true,
      }),
    );
  }

  if (study.testableFacts.length) {
    cards.push(
      renderCollapsibleCard({
        id: 'testable',
        title: 'Facts to Know · Commonly Tested',
        contentHtml: renderBulletList(study.testableFacts),
        expanded: true,
      }),
    );
  }

  if (study.attendingQuestions.length) {
    cards.push(
      renderCollapsibleCard({
        id: 'attending',
        title: 'Commonly tested & attending questions',
        contentHtml: renderAttendingQuestions(study.attendingQuestions),
        expanded: true,
      }),
    );
  }

  if (study.comparisonTable) {
    cards.push(renderCollapsibleCard({ id: 'comparison', title: 'Compare the options', contentHtml: renderComparisonTable(study.comparisonTable), expanded: true }));
  }

  if (study.miniQuiz.length) {
    cards.push(renderCollapsibleCard({ id: 'quiz', title: 'Active recall', contentHtml: renderMiniQuiz(study.miniQuiz), tone: 'accent', expanded: true }));
  }

  if (study.memoryHooks.length) {
    cards.push(renderCollapsibleCard({ id: 'memory', title: 'Memory hooks', contentHtml: renderBulletList(study.memoryHooks), expanded: true }));
  }

  if (study.deepDive.length) {
    cards.push(renderCollapsibleCard({ id: 'deepDive', title: 'Why it matters', contentHtml: renderBulletList(study.deepDive), expanded: true }));
  }

  const clinicalWarnings = study.warnings.filter(isClinicallyImportantWarning);

  return `<section style="display:grid;gap:6px;">
    ${renderStudyPanelHeader(pageContext, study.emphasis)}
    ${cards.join('')}
    ${
      clinicalWarnings.length
        ? `<div style="padding:8px 10px;border-radius:10px;background:#fffaf0;border:1px solid #f5d7a1;color:#7c2d12;font-size:12px;line-height:1.35;">${escapeHtml(clinicalWarnings.join(' · '))}</div>`
        : ''
    }
    ${
      study.parseError
        ? `<p style="margin:0;font-size:11px;color:#5c6574;">Developer note: ${escapeHtml(study.parseError)}</p>`
        : ''
    }
  </section>`;
}

export function hasGiantParagraphCards(html: string) {
  const paragraphMatches = html.match(/<p[^>]*style="[^"]*line-height:1\.55/g) ?? [];
  return paragraphMatches.length >= 3;
}

export function renderCurriculumChatChips(chips: string[]) {
  if (!chips.length) return '';
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start;">${chips
    .map(
      (prompt, index) =>
        `<button data-prompt-index="${index}" type="button" style="border:1px solid #cbd5e1;border-radius:999px;background:#f8fafc;color:#0f172a;padding:6px 10px;font-size:11px;font-weight:600;line-height:1.3;cursor:pointer;max-width:100%;text-align:left;">${escapeHtml(prompt)}</button>`,
    )
    .join('')}</div>`;
}
