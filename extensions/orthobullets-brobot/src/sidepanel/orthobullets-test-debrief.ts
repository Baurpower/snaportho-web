import type {
  OrthobulletsExplainResponse,
  OrthobulletsPageContext,
  OrthobulletsTestResultRow,
  OrthobulletsTestReview,
} from '../shared/types.js';

export type TestDebriefQuestion = {
  row: OrthobulletsTestResultRow;
  pageContext: OrthobulletsPageContext | null;
  explanation: OrthobulletsExplainResponse | null;
  status: 'pending' | 'collecting' | 'ready' | 'error';
  error: string | null;
};

export type FullTestDebrief = {
  version: 1;
  testKey: string;
  createdAt: string;
  updatedAt: string;
  status: 'building' | 'ready' | 'partial' | 'error';
  questions: TestDebriefQuestion[];
};

export type TestDebriefHooks = {
  onFindAnkiCards: (button: HTMLButtonElement, debrief: FullTestDebrief | null) => void;
  onFindQuestionAnkiCards: (questionId: string, button: HTMLButtonElement) => void;
  onOpenQuestion: (reviewUrl: string) => void;
  onBuildDebrief: () => void;
  onExportDebrief: () => void;
  onClearDebrief: () => void;
  onUnlink: () => void;
};

export function testDebriefStorageKey(review: OrthobulletsTestReview) {
  const identity = review.testId || review.rows.map((row) => row.questionId).join('|');
  return `snaportho:test-debrief:v1:${identity}`;
}

function misconceptionFor(question: TestDebriefQuestion) {
  const selected = question.row.selectedAnswerKey;
  return question.explanation?.whyWrong.find((item) => item.choiceKey === selected)
    ?? question.explanation?.whyWrong.find((item) => item.isClassicTrap)
    ?? question.explanation?.whyWrong[0]
    ?? null;
}

export function fullDebriefText(review: OrthobulletsTestReview, debrief: FullTestDebrief) {
  const ready = debrief.questions.filter((question) => question.explanation);
  const conceptCounts = new Map<string, number>();
  for (const question of ready) {
    const concept = question.explanation?.testedConcept;
    if (concept) conceptCounts.set(concept, (conceptCounts.get(concept) ?? 0) + 1);
  }
  const patterns = [...conceptCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([concept, count]) => `- ${concept}${count > 1 ? ` (${count} questions)` : ''}`);
  const questions = ready.flatMap((question) => {
    const explanation = question.explanation!;
    const misconception = misconceptionFor(question);
    return [
      `### Q${question.row.order} · ${question.row.questionId} · ${explanation.testedConcept}`,
      `- Your answer: ${question.row.selectedAnswerKey ?? 'unknown'}; correct: ${question.row.correctAnswerKey ?? 'unknown'}`,
      `- Bottom line: ${explanation.bottomLine}`,
      `- Misconception: ${misconception?.reason ?? explanation.boardTrap ?? 'No specific distractor analysis available.'}`,
      `- Remember: ${explanation.boardPearl}`,
      ...(explanation.studyNext.length ? [`- Study next: ${explanation.studyNext.join('; ')}`] : []),
      '',
    ];
  });
  return [
    '# SnapOrtho test debrief',
    '',
    `${review.correctCount}/${review.totalCount} correct${review.scorePercent != null ? ` (${review.scorePercent}%)` : ''}; ${review.missedCount} missed.`,
    '',
    '## Pattern diagnosis',
    ...(patterns.length ? patterns : ['- No completed question explanations.']),
    '',
    '## Miss analysis',
    ...questions,
    '## Active recall',
    ...ready.map((question) => `- Without looking: explain ${question.explanation!.testedConcept}, including the decisive clue and the main trap.`),
    '',
    '## Remediation',
    ...[...new Set(ready.flatMap((question) => question.explanation?.studyNext ?? []))].map((item) => `- ${item}`),
  ].join('\n');
}

export function getOrthobulletsTestReview(
  pageContext: OrthobulletsPageContext | null
): OrthobulletsTestReview | null {
  if (
    pageContext?.provider !== 'orthobullets' ||
    pageContext.mode !== 'test_review' ||
    pageContext.pageKind !== 'test_results'
  ) {
    return null;
  }
  return pageContext.testReview ?? null;
}

export function groupMissedQuestions(rows: OrthobulletsTestResultRow[]) {
  const groups = new Map<string, OrthobulletsTestResultRow[]>();
  for (const row of rows.filter((candidate) => candidate.isCorrect === false)) {
    const label = row.topic?.trim() || row.specialty?.trim() || 'Uncategorized';
    groups.set(label, [...(groups.get(label) ?? []), row]);
  }
  return [...groups.entries()]
    .map(([label, questions]) => ({
      label,
      specialty: questions.find((question) => question.specialty)?.specialty ?? null,
      questions: questions.sort((left, right) => left.order - right.order),
    }))
    .sort((left, right) =>
      right.questions.length - left.questions.length || left.label.localeCompare(right.label)
    );
}

export function appendOrthobulletsTestDebrief(
  content: HTMLElement,
  input: {
    review: OrthobulletsTestReview;
    debrief: FullTestDebrief | null;
    hooks: TestDebriefHooks;
    escapeHtml: (value: string) => string;
  }
) {
  const { review, debrief, hooks, escapeHtml } = input;
  const groups = groupMissedQuestions(review.rows);
  const createElement = (html: string) => {
    const host = document.createElement('div');
    host.innerHTML = html;
    return host.firstElementChild as HTMLElement;
  };
  const score = review.scorePercent != null ? `${review.scorePercent}% correct · ` : '';
  const header = createElement(`<section style="padding:16px;border-radius:16px;background:#f0fdfa;border:1px solid #99f6e4;display:grid;gap:12px;">
    <div style="display:grid;gap:5px;">
      <p style="margin:0;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#0f766e;font-weight:800;">Test debrief</p>
      <h2 style="margin:0;font-size:20px;line-height:1.25;color:#18202b;">Missed-question overview</h2>
      <p style="margin:0;color:#384152;line-height:1.5;">${escapeHtml(score)}${review.missedCount} missed of ${review.totalCount} across ${groups.length} concept${groups.length === 1 ? '' : 's'}.</p>
    </div>
    ${
      review.missedCount
        ? `<div style="display:grid;gap:8px;">
            <button id="test-build-debrief" style="border:none;border-radius:999px;background:#0f766e;color:white;padding:10px 14px;font-weight:800;font-size:13px;cursor:pointer;">${debrief?.status === 'building' ? 'Building full debrief…' : debrief ? 'Rebuild full debrief' : 'Build full debrief'}</button>
            <button id="test-find-anki" style="border:1px solid #0f766e;border-radius:999px;background:white;color:#0f766e;padding:9px 14px;font-weight:800;font-size:13px;cursor:pointer;">Find relevant cards in Anki</button>
          </div>`
        : '<p style="margin:0;color:#15803d;font-weight:700;">Clean sweep — there are no misses to debrief.</p>'
    }
    <p style="margin:0;font-size:12px;line-height:1.5;color:#5c6574;">SnapOrtho finds existing cards in the backend. The add-on opens the matching local cards in Browse without changing card state.</p>
  </section>`);
  content.appendChild(header);
  header.querySelector<HTMLButtonElement>('#test-find-anki')?.addEventListener('click', (event) => {
    hooks.onFindAnkiCards(event.currentTarget as HTMLButtonElement, debrief);
  });
  const buildButton = header.querySelector<HTMLButtonElement>('#test-build-debrief');
  if (buildButton) {
    buildButton.disabled = debrief?.status === 'building';
    buildButton.addEventListener('click', () => hooks.onBuildDebrief());
  }

  if (debrief) {
    const ready = debrief.questions.filter((question) => question.explanation);
    const failed = debrief.questions.filter((question) => question.status === 'error');
    const concepts = [...new Set(ready.map((question) => question.explanation!.testedConcept))];
    const statusCopy = debrief.status === 'building'
      ? `${ready.length} of ${debrief.questions.length} missed questions analyzed`
      : `${ready.length} analyzed${failed.length ? ` · ${failed.length} could not be loaded` : ''}`;
    const summary = createElement(`<section style="padding:14px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;display:grid;gap:11px;">
      <div>
        <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9a3412;font-weight:800;">Full debrief ${escapeHtml(debrief.status)}</p>
        <p style="margin:5px 0 0;color:#5c6574;font-size:12px;">${escapeHtml(statusCopy)} · saved locally</p>
      </div>
      ${concepts.length ? `<div><p style="margin:0 0 5px;font-weight:800;color:#18202b;">Pattern diagnosis</p>${concepts.map((concept) => `<p style="margin:3px 0;color:#384152;font-size:13px;">• ${escapeHtml(concept)}</p>`).join('')}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="test-export-debrief" style="border:1px solid #c2410c;border-radius:999px;background:white;color:#9a3412;padding:7px 11px;font-weight:700;font-size:12px;cursor:pointer;">Copy debrief</button>
        <button id="test-clear-debrief" style="border:none;background:transparent;color:#64748b;padding:7px;font-weight:700;font-size:12px;cursor:pointer;">Clear saved debrief</button>
      </div>
    </section>`);
    content.appendChild(summary);
    summary.querySelector('#test-export-debrief')?.addEventListener('click', () => hooks.onExportDebrief());
    summary.querySelector('#test-clear-debrief')?.addEventListener('click', () => hooks.onClearDebrief());
  }

  for (const group of groups) {
    const questions = group.questions.map((question) => {
      const enriched = debrief?.questions.find((candidate) => candidate.row.questionId === question.questionId);
      const explanation = enriched?.explanation;
      const misconception = enriched ? misconceptionFor(enriched) : null;
      return `
      <button data-review-url="${escapeHtml(question.reviewUrl)}" style="width:100%;display:flex;align-items:center;gap:9px;padding:9px 10px;border:1px solid #e2e8f0;border-radius:10px;background:white;text-align:left;cursor:pointer;">
        <span style="display:grid;place-items:center;width:21px;height:21px;border-radius:6px;background:#dc2626;color:white;font-size:11px;font-weight:800;">×</span>
        <span style="font-weight:800;color:#18202b;">Q${question.order}</span>
        <span style="flex:1;color:#5c6574;font-size:12px;">${escapeHtml(question.questionId)}</span>
        <span style="font-size:12px;color:#9f1239;">${escapeHtml(question.selectedAnswerKey ?? '?')} → ${escapeHtml(question.correctAnswerKey ?? '?')}</span>
      </button>
      ${enriched?.status === 'collecting' ? '<p style="margin:2px 8px;color:#0f766e;font-size:12px;">Collecting review and generating teaching analysis…</p>' : ''}
      ${enriched?.error ? `<p style="margin:2px 8px;color:#b91c1c;font-size:12px;">${escapeHtml(enriched.error)}</p>` : ''}
      ${explanation ? `<div style="margin:0 2px 5px;padding:10px;border-left:3px solid #14b8a6;background:#f8fafc;display:grid;gap:6px;">
        <p style="margin:0;font-weight:800;color:#18202b;">${escapeHtml(explanation.testedConcept)}</p>
        <p style="margin:0;font-size:12px;line-height:1.45;color:#384152;"><strong>Bottom line:</strong> ${escapeHtml(explanation.bottomLine)}</p>
        <p style="margin:0;font-size:12px;line-height:1.45;color:#7c2d12;"><strong>Your misconception:</strong> ${escapeHtml(misconception?.reason ?? explanation.boardTrap ?? 'No specific distractor analysis available.')}</p>
        <p style="margin:0;font-size:12px;line-height:1.45;color:#065f46;"><strong>Remember:</strong> ${escapeHtml(explanation.boardPearl)}</p>
        <p style="margin:0;font-size:12px;line-height:1.45;color:#475569;"><strong>Active recall:</strong> Explain the decisive clue and main trap without looking.</p>
        <button data-question-anki="${escapeHtml(question.questionId)}" style="justify-self:start;border:1px solid #0f766e;border-radius:999px;background:white;color:#0f766e;padding:6px 10px;font-weight:700;font-size:11px;cursor:pointer;">Find cards for this misconception</button>
      </div>` : ''}`;
    }).join('');
    const card = createElement(`<section style="padding:14px;border-radius:14px;background:white;border:1px solid #ded7c8;display:grid;gap:10px;">
      <div>
        <h3 style="margin:0;font-size:15px;color:#18202b;">${escapeHtml(group.label)}</h3>
        <p style="margin:4px 0 0;font-size:12px;color:#5c6574;">${group.questions.length} missed question${group.questions.length === 1 ? '' : 's'}${group.specialty ? ` · ${escapeHtml(group.specialty)}` : ''}</p>
      </div>
      <div style="display:grid;gap:7px;">${questions}</div>
      <p style="margin:0;font-size:12px;line-height:1.45;color:#64748b;">${debrief ? 'The detailed analysis is saved locally; open a question for the complete source review.' : 'Build the full debrief to capture stems, distractors, answer distributions, teaching links, and misconception-level explanations.'}</p>
    </section>`);
    content.appendChild(card);
    card.querySelectorAll<HTMLButtonElement>('[data-review-url]').forEach((button) => {
      button.addEventListener('click', () => {
        const reviewUrl = button.dataset.reviewUrl;
        if (reviewUrl) hooks.onOpenQuestion(reviewUrl);
      });
    });
    card.querySelectorAll<HTMLButtonElement>('[data-question-anki]').forEach((button) => {
      button.addEventListener('click', () => {
        const questionId = button.dataset.questionAnki;
        if (questionId) hooks.onFindQuestionAnkiCards(questionId, button);
      });
    });
  }

  const footer = createElement(`<div><button id="test-unlink" style="border:1px solid #d2cab8;border-radius:999px;background:#f7f5ef;color:#18202b;padding:9px 14px;font-weight:700;font-size:12px;cursor:pointer;">Unlink</button></div>`);
  content.appendChild(footer);
  footer.querySelector('#test-unlink')?.addEventListener('click', () => hooks.onUnlink());
}
