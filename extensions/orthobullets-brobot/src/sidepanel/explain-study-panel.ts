import {
  CURRICULUM_EMPHASIS_TABS,
  detectTopicLabel,
  estimateStudyMinutes,
  isClinicallyImportantWarning,
} from '../shared/curriculum-chips.js';
import type {
  CurriculumExplainEmphasis,
  CurriculumStudyResponse,
  OrthobulletsPageContext,
} from '../shared/types.js';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
        </div>`
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
        </details>`
    )
    .join('');
}

function sectionsForEmphasis(emphasis: CurriculumExplainEmphasis) {
  const common = ['takeaway', 'thirty', 'mustKnow', 'mistakes'] as const;
  switch (emphasis) {
    case 'clinical':
      return [...common, 'pearls', 'attending'];
    case 'boards':
      return [...common, 'testable', 'attending'];
    case 'or':
      return [...common, 'attending', 'pearls'];
    default:
      return [...common];
  }
}

export function renderStudyPanelHeader(pageContext: OrthobulletsPageContext, selectedEmphasis: CurriculumExplainEmphasis) {
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
    <div role="tablist" aria-label="Study emphasis" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;">
      ${CURRICULUM_EMPHASIS_TABS.map(
        (tab) =>
          `<button type="button" data-emphasis-tab="${tab.id}" style="border:1px solid ${tab.id === selectedEmphasis ? '#0f766e' : '#cbd5e1'};border-radius:8px;background:${tab.id === selectedEmphasis ? '#0f766e' : 'white'};color:${tab.id === selectedEmphasis ? 'white' : '#18202b'};padding:5px 3px;font-size:11px;font-weight:700;cursor:pointer;">${escapeHtml(tab.label)}</button>`
      ).join('')}
    </div>
  </header>`;
}

export function renderCurriculumStudyPanel(
  study: CurriculumStudyResponse,
  pageContext: OrthobulletsPageContext
) {
  const cards: string[] = [];
  const active = new Set(sectionsForEmphasis(study.emphasis));

  cards.push(
    renderCollapsibleCard({
      id: 'takeaway',
      title: 'One-sentence takeaway',
      contentHtml: `<p style="margin:0;font-size:13px;font-weight:600;line-height:1.35;">${escapeHtml(study.oneSentenceTakeaway)}</p>`,
      expanded: true,
      tone: 'accent',
    })
  );

  if (active.has('thirty') && study.inThirtySeconds.length) {
    cards.push(
      renderCollapsibleCard({
        id: 'thirty',
        title: 'In 30 Seconds',
        contentHtml: renderBulletList(study.inThirtySeconds),
        expanded: true,
      })
    );
  }

  if (active.has('mustKnow') && study.mustKnow.length) {
    cards.push(
      renderCollapsibleCard({
        id: 'mustKnow',
        title: 'Must Know',
        contentHtml: renderMustKnow(study.mustKnow),
        expanded: true,
      })
    );
  }

  if (active.has('mistakes') && study.commonMistakes.length) {
    cards.push(
      renderCollapsibleCard({
        id: 'mistakes',
        title: 'Common Mistakes',
        contentHtml: renderBulletList(study.commonMistakes),
        expanded: study.emphasis === 'high_yield',
      })
    );
  }

  if (active.has('pearls') && study.clinicalPearls.length) {
    cards.push(
      renderCollapsibleCard({
        id: 'pearls',
        title: 'Practical pearls',
        contentHtml: renderBulletList(study.clinicalPearls),
        expanded: study.emphasis === 'clinical' || study.emphasis === 'or',
      })
    );
  }

  if (active.has('testable') && study.testableFacts.length) {
    cards.push(
      renderCollapsibleCard({
        id: 'testable',
        title: 'Most testable facts',
        contentHtml: renderBulletList(study.testableFacts),
        expanded: study.emphasis === 'boards',
      })
    );
  }

  if (active.has('attending') && study.attendingQuestions.length) {
    cards.push(
      renderCollapsibleCard({
        id: 'attending',
        title: study.emphasis === 'or' ? 'What attendings ask' : 'Attending questions',
        contentHtml: renderAttendingQuestions(study.attendingQuestions),
        expanded: study.emphasis === 'or' || study.emphasis === 'boards',
      })
    );
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
        `<button data-prompt-index="${index}" type="button" style="border:1px solid #cbd5e1;border-radius:999px;background:#f8fafc;color:#0f172a;padding:6px 10px;font-size:11px;font-weight:600;line-height:1.3;cursor:pointer;max-width:100%;text-align:left;">${escapeHtml(prompt)}</button>`
    )
    .join('')}</div>`;
}