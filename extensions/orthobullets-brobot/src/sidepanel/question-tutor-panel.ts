import type { ExtensionErrorCode } from '../shared/messages.js';
import type { QuestionTutorViewState } from './question-session.js';

export type QuestionTutorPanelHooks = {
  onHintClick: () => void;
  onExplainClick: () => void;
  onSendToAnki: (
    button: HTMLButtonElement,
    explanation?: import('../shared/types.js').OrthobulletsExplainResponse
  ) => void;
  onRefreshClick: () => void;
  onUnlink: () => void;
  onChatDraftChange: (value: string) => void;
  onChatSubmit: () => void;
  onChatPromptClick: (prompt: string) => void;
};

export type QuestionTutorPanelRenderers = {
  escapeHtml: (value: string) => string;
  renderHintCards: (hints: import('../shared/types.js').OrthobulletsHintResponse[]) => string;
  renderExplanation: (
    explanation: import('../shared/types.js').OrthobulletsExplainResponse,
    mode: 'question_tutor'
  ) => string;
  renderChatTranscript: (history: import('../shared/types.js').OrthobulletsChatTurn[], loading: boolean) => string;
  renderCurriculumChatChips: (prompts: string[]) => string;
  renderLoadingSkeleton: (label: string, detail: string) => string;
  providerLabel: (provider: import('../shared/types.js').QuestionProvider | null | undefined) => string;
};

export function renderQuestionTutorLifecycleDebug(
  debug: QuestionTutorViewState['debug'],
  escapeHtml: (value: string) => string
) {
  return `<pre style="width:100%;max-width:100%;min-width:0;box-sizing:border-box;overflow-x:auto;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;margin:8px 0 0;font-size:12px;line-height:1.45;">${escapeHtml(JSON.stringify(debug, null, 2))}</pre>`;
}

export function appendQuestionTutorPanel(
  content: HTMLElement,
  input: {
    view: QuestionTutorViewState;
    activePageTitle: string | null;
    activePageUrl: string | null;
    provider: import('../shared/types.js').QuestionProvider | null;
    isBusy: boolean;
    error: { message: string; code: ExtensionErrorCode } | null;
    hooks: QuestionTutorPanelHooks;
    renderers: QuestionTutorPanelRenderers;
  }
) {
  const { view, hooks, renderers, isBusy } = input;
  const { escapeHtml, renderHintCards, renderExplanation, renderChatTranscript, renderCurriculumChatChips, renderLoadingSkeleton, providerLabel } =
    renderers;

  const createElement = (html: string) => {
    const element = document.createElement('div');
    element.innerHTML = html;
    return element.firstElementChild as HTMLElement;
  };

  if (view.showLoadingCurrentQuestion) {
    const label = 'Loading current question';
    const detail =
      view.session?.questionPositionLabel?.match(/question\s+\d+\s+of\s+\d+/i)?.[0] != null
        ? `Loading ${view.session?.questionPositionLabel?.match(/question\s+\d+\s+of\s+\d+/i)?.[0]}...`
        : 'Reading the visible question from this page...';
    content.appendChild(createElement(renderLoadingSkeleton(label, detail)));
    return;
  }

  if (view.showHintCta) {
    const hintDisabled = view.hintButtonDisabled;
    const hintCard = createElement(`<div style="padding:14px;border-radius:16px;background:#f8fafc;border:1px solid #cbd5e1;display:grid;gap:10px;">
      <div style="display:grid;gap:6px;">
        <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">Need a hint?</p>
        <p style="margin:0;color:#384152;line-height:1.5;">BroBot prefetches hints in the background. Open when you are ready — nothing is shown until you click.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="qt-hint" ${hintDisabled ? 'disabled' : ''} style="border:none;border-radius:999px;background:${hintDisabled ? '#94a3b8' : '#0f766e'};color:white;padding:10px 14px;font-weight:700;cursor:${hintDisabled ? 'default' : 'pointer'};">${escapeHtml(view.hintButtonLabel)}</button>
        <button id="qt-unlink" style="border:1px solid #d2cab8;border-radius:999px;background:#f7f5ef;color:#18202b;padding:10px 14px;font-weight:700;cursor:pointer;">Unlink</button>
      </div>
    </div>`);
    content.appendChild(hintCard);
    hintCard.querySelector('#qt-hint')?.addEventListener('click', () => hooks.onHintClick());
    hintCard.querySelector('#qt-unlink')?.addEventListener('click', () => hooks.onUnlink());
  }

  if (view.showExplainCta) {
    const prefetchedQuestionExplanation =
      input.provider === 'orthobullets' &&
      view.session?.explanation &&
      'testedConcept' in view.session.explanation
        ? view.session.explanation
        : null;
    const showPreExplainAnkiAction = input.provider === 'orthobullets';
    const ankiButtonLabel = prefetchedQuestionExplanation
      ? 'Find cards in Anki'
      : 'Preparing card search…';
    const reviewPosition = view.session?.payload?.provider === 'himalaya' && view.session.payload.pageKind === 'review'
      ? view.session.questionPositionLabel?.match(/question\s+\d+\s+of\s+\d+/i)?.[0]
        ?? (view.session.questionNumber && view.session.totalQuestions
          ? `Question ${view.session.questionNumber} of ${view.session.totalQuestions}`
          : 'Question')
      : null;
    const reviewHeading = reviewPosition
      ? `Review ${reviewPosition.replace(/^Question\s+/i, 'Question ')}`
      : null;
    const explainCard = createElement(`<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;display:grid;gap:10px;">
      ${reviewHeading ? `<p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">${escapeHtml(reviewHeading)}</p>` : ''}
      <p style="margin:0;color:#5c6574;line-height:1.45;">Active page: ${escapeHtml(input.activePageTitle ?? input.activePageUrl ?? providerLabel(input.provider))}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="qt-explain" ${isBusy ? 'disabled' : ''} style="border:none;border-radius:999px;background:${isBusy ? '#94a3b8' : '#0f766e'};color:white;padding:10px 14px;font-weight:700;cursor:${isBusy ? 'default' : 'pointer'};">${escapeHtml(view.explainButtonLabel)}</button>
        ${showPreExplainAnkiAction ? `<button id="qt-send-to-anki-before-explain" ${prefetchedQuestionExplanation ? '' : 'disabled'} style="border:1px solid #0f766e;border-radius:999px;background:white;color:#0f766e;padding:10px 14px;font-weight:700;cursor:${prefetchedQuestionExplanation ? 'pointer' : 'default'};opacity:${prefetchedQuestionExplanation ? '1' : '0.65'};">${escapeHtml(ankiButtonLabel)}</button>` : ''}
        <button id="qt-unlink-explain" style="border:1px solid #d2cab8;border-radius:999px;background:#f7f5ef;color:#18202b;padding:10px 14px;font-weight:700;cursor:pointer;">Unlink</button>
      </div>
      <p style="margin:0;font-size:12px;color:#5c6574;">Review data detected. BroBot prefetches the explanation in the background; click to open when ready.</p>
    </div>`);
    content.appendChild(explainCard);
    explainCard.querySelector('#qt-explain')?.addEventListener('click', () => hooks.onExplainClick());
    const preExplainAnkiButton = explainCard.querySelector<HTMLButtonElement>('#qt-send-to-anki-before-explain');
    if (preExplainAnkiButton && prefetchedQuestionExplanation) {
      preExplainAnkiButton.addEventListener('click', () =>
        hooks.onSendToAnki(preExplainAnkiButton, prefetchedQuestionExplanation)
      );
    }
    explainCard.querySelector('#qt-unlink-explain')?.addEventListener('click', () => hooks.onUnlink());
  }

  if (view.session && view.fingerprintAligned && !view.showLoadingCurrentQuestion) {
    const unanswered = view.reviewState === 'unanswered';
    const starterPrompts = unanswered
      ? ['Give me a hint', 'What clue should I focus on?', 'Help me narrow the choices']
      : ['Why not the trap answer?', 'Make this simpler', 'Give me an Anki-style card'];
    const visiblePrompts = view.chatPrompts.length ? view.chatPrompts : starterPrompts;
    const chatCard = createElement(`<div style="padding:14px;border-radius:14px;background:white;border:1px solid #ded7c8;display:grid;gap:12px;">
      <div style="display:grid;gap:4px;">
        <h3 style="margin:0;font-size:16px;">Ask BroBot</h3>
        <p style="margin:0;color:#5c6574;line-height:1.4;font-size:12px;">${unanswered
          ? 'Ask about this question or get a reasoning nudge. BroBot will not reveal the answer before you submit.'
          : 'Ask about this exact question without opening the full explanation.'}</p>
      </div>
      ${view.chatHistory.length || isBusy
        ? renderChatTranscript(view.chatHistory, isBusy)
        : `<p style="margin:0;color:#5c6574;font-size:12px;">Try: “${escapeHtml(visiblePrompts[0] ?? 'Give me a hint')}”</p>`}
      ${visiblePrompts.length ? renderCurriculumChatChips(visiblePrompts) : ''}
      <form id="qt-chat-form" style="display:grid;gap:6px;">
        <textarea id="qt-chat-input" rows="2" ${isBusy ? 'disabled' : ''} placeholder="${unanswered ? 'Ask a question or request a hint...' : 'Ask about this question...'}" style="width:100%;box-sizing:border-box;border:1px solid #d2cab8;border-radius:12px;padding:10px;font:inherit;resize:vertical;font-size:13px;">${escapeHtml(view.chatDraft)}</textarea>
        <div style="display:flex;justify-content:flex-end;">
          <button type="submit" ${isBusy ? 'disabled' : ''} style="border:none;border-radius:999px;background:${isBusy ? '#94a3b8' : '#0f766e'};color:white;padding:8px 12px;font-weight:700;font-size:12px;cursor:${isBusy ? 'default' : 'pointer'};">${isBusy ? 'Thinking…' : 'Ask BroBot'}</button>
        </div>
      </form>
    </div>`);
    content.appendChild(chatCard);

    const chatInput = chatCard.querySelector('#qt-chat-input') as HTMLTextAreaElement | null;
    chatInput?.addEventListener('input', (event) => {
      hooks.onChatDraftChange((event.currentTarget as HTMLTextAreaElement).value);
    });
    chatCard.querySelector('#qt-chat-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      hooks.onChatSubmit();
    });
    chatCard.querySelectorAll<HTMLButtonElement>('[data-prompt-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.promptIndex ?? -1);
        const prompt = visiblePrompts[index];
        if (prompt) hooks.onChatPromptClick(prompt);
      });
    });
  }

  if (view.operationError) {
    content.appendChild(createElement(`<div style="padding:12px;border-radius:12px;background:#fff0ef;border:1px solid #f0c0bc;color:#a02d1f;display:grid;gap:5px;">
      <p style="margin:0;font-weight:700;font-size:13px;">BroBot needs another try</p>
      <p style="margin:0;line-height:1.45;font-size:12px;">${escapeHtml(view.operationError)}</p>
    </div>`));
  }

  if (view.showHintLoading && view.visiblePanelMode === 'hint_open') {
    content.appendChild(createElement(renderLoadingSkeleton('Preparing hint', 'BroBot is generating a reasoning nudge for this question...')));
  }

  if (view.hintsToRender.length) {
    content.appendChild(createElement(renderHintCards(view.hintsToRender)));
  }

  if (view.showExplanationLoading && view.visiblePanelMode === 'explanation_open') {
    content.appendChild(createElement(renderLoadingSkeleton('Preparing explanation', 'BroBot is generating a teaching answer for this question...')));
  }

  if (view.explanationToRender) {
    content.appendChild(
      createElement(renderExplanation(view.explanationToRender as import('../shared/types.js').OrthobulletsExplainResponse, 'question_tutor'))
    );

    if (input.provider === 'orthobullets' && 'testedConcept' in view.explanationToRender) {
      const questionExplanation = view.explanationToRender;
      const ankiCard = createElement(`<div style="padding:14px;border-radius:14px;background:#ecfdf5;border:1px solid #99d8c7;display:grid;gap:8px;">
        <button id="qt-send-to-anki" type="button" style="width:100%;border:0;border-radius:12px;background:#0f766e;color:white;padding:10px 12px;font-size:13px;font-weight:700;cursor:pointer;">Find cards in Anki</button>
        <p style="margin:0;color:#46615b;line-height:1.4;font-size:12px;">Sends this question ID and tested concept to Anki, then opens matching cards in Browse.</p>
      </div>`);
      content.appendChild(ankiCard);
      const button = ankiCard.querySelector<HTMLButtonElement>('#qt-send-to-anki');
      button?.addEventListener('click', () => hooks.onSendToAnki(button, questionExplanation));
    }

  }

  if (input.error) {
    content.appendChild(
      createElement(`<div style="padding:14px;border-radius:16px;background:#fff0ef;border:1px solid #f0c0bc;color:#a02d1f;display:grid;gap:8px;">
        <p style="margin:0;font-weight:700;">Something went wrong</p>
        <p style="margin:0;line-height:1.5;">${escapeHtml(input.error.message)}</p>
      </div>`)
    );
  }
}
