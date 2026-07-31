import { TOPIC_TUTOR_PRIMARY_ACTIONS, topicCountsSummary } from '../shared/topic-tutor-chips.js';
import type {
  OrthobulletsPageContext,
  OrthobulletsTopicAction,
  OrthobulletsTopicProgress,
  OrthobulletsTopicTutorTurn,
} from '../shared/types.js';

export interface TopicTutorPanelState {
  pageContext: OrthobulletsPageContext | null;
  topicProgress: OrthobulletsTopicProgress;
  topicHistory: OrthobulletsTopicTutorTurn[];
  topicChatDraft: string;
  topicChips: string[];
  topicInsufficientContent: boolean;
  operation: string;
}

export interface TopicTutorPanelActions {
  runTopicTutorTurn: (input: { action?: OrthobulletsTopicAction; userMessage?: string }) => void;
  findPageAnkiCards: (button: HTMLButtonElement) => void;
  saveTopicPearl: (quote: string) => void;
  setDraft: (value: string) => void;
  unlink: () => void;
  isBusy: boolean;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, html?: string) {
  const element = document.createElement(tag);
  if (html != null) element.innerHTML = html;
  return element;
}

function renderHeader(pageContext: OrthobulletsPageContext | null, progress: OrthobulletsTopicProgress) {
  const title = pageContext?.title ?? 'Orthobullets topic';
  const currentSection =
    progress.sectionsCompleted[progress.sectionsCompleted.length - 1] ??
    pageContext?.sectionHeadings?.[0] ??
    null;
  const counts = pageContext ? topicCountsSummary(pageContext) : [];

  const sectionCount = pageContext?.contentSections?.length ?? 0;
  const bulletCount = pageContext?.topicBulletCount ?? 0;
  return `<header style="display:grid;gap:7px;padding:12px;border-radius:14px;background:linear-gradient(135deg,#ecfdf5,#f8fafc);border:1px solid #99f6e4;">
    <div style="display:grid;gap:2px;">
      <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:800;">BroBot page companion</p>
      <h2 style="margin:0;font-size:17px;line-height:1.25;">${escapeHtml(title)}</h2>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:11px;color:#5c6574;">
      ${currentSection ? `<span style="padding:3px 7px;border-radius:999px;background:white;border:1px solid #d2cab8;">Section: ${escapeHtml(currentSection)}</span>` : ''}
      ${sectionCount ? `<span style="padding:3px 7px;border-radius:999px;background:white;border:1px solid #d2cab8;">${sectionCount} sections</span>` : ''}
      ${bulletCount ? `<span style="padding:3px 7px;border-radius:999px;background:white;border:1px solid #d2cab8;">${bulletCount} bullets read</span>` : ''}
      ${counts.map((count) => `<span style="padding:3px 7px;border-radius:999px;background:white;border:1px solid #d2cab8;">${escapeHtml(count)}</span>`).join('')}
    </div>
  </header>`;
}

function renderPrimaryActions(isBusy: boolean) {
  return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;">
    ${TOPIC_TUTOR_PRIMARY_ACTIONS.map(
      (item, index) =>
        `<button type="button" data-topic-action="${item.action}" ${isBusy ? 'disabled' : ''} style="${index === 0 ? 'grid-column:1/-1;' : ''}border:1px solid ${index === 0 ? '#0f766e' : '#cbd5e1'};border-radius:10px;background:${isBusy ? '#f1f5f9' : index === 0 ? '#ecfdf5' : 'white'};color:${index === 0 ? '#0f766e' : '#18202b'};padding:9px;font-size:11px;font-weight:800;line-height:1.25;cursor:${isBusy ? 'default' : 'pointer'};text-align:left;">${escapeHtml(item.label)}</button>`
    ).join('')}
  </div>`;
}

function renderConversation(history: OrthobulletsTopicTutorTurn[], isLoading: boolean) {
  if (!history.length && !isLoading) {
    return `<div style="padding:10px;border-radius:12px;background:#f8fafc;color:#475569;font-size:12px;line-height:1.5;">I’ve read the visible sections on this page. Ask what a bullet means, compare treatments, clarify an algorithm, or connect the page to a clinical scenario.</div>`;
  }

  const items = history
    .map((turn, index) => {
      const isAssistant = turn.role === 'assistant';
      const bubbleTone = isAssistant
        ? 'background:#f7f5ef;border:1px solid #ded7c8;color:#18202b;'
        : 'background:#0f766e;border:1px solid #0f766e;color:white;';
      const saveButton = isAssistant
        ? `<button type="button" data-save-pearl-index="${index}" style="justify-self:start;border:none;background:none;color:#0f766e;font-size:11px;font-weight:700;cursor:pointer;padding:0;">Save as pearl</button>`
        : '';
      return `<div style="display:grid;gap:4px;justify-items:${isAssistant ? 'start' : 'end'};">
        <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#5c6574;font-weight:700;">${isAssistant ? 'BroBot' : 'You'}</p>
        <div style="max-width:100%;padding:10px 12px;border-radius:14px;line-height:1.5;font-size:13px;${bubbleTone}">${escapeHtml(turn.content).replace(/\n/g, '<br />')}</div>
        ${saveButton}
      </div>`;
    })
    .join('');

  const loadingBubble = isLoading
    ? `<div style="display:grid;gap:4px;">
        <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#5c6574;font-weight:700;">BroBot</p>
        <div style="padding:10px 12px;border-radius:14px;background:#f7f5ef;border:1px solid #ded7c8;color:#5c6574;font-size:13px;">Reading the page and thinking of a question...</div>
      </div>`
    : '';

  return `<div style="display:grid;gap:10px;max-height:320px;overflow:auto;padding-right:4px;">${items}${loadingBubble}</div>`;
}

export function renderTopicTutorPanel(
  content: HTMLElement,
  state: TopicTutorPanelState,
  actions: TopicTutorPanelActions
) {
  const isLoading = state.operation === 'chatting' || state.operation === 'explaining';

  content.appendChild(createElement('div', renderHeader(state.pageContext, state.topicProgress)));

  const actionsCard = createElement(
    'div',
    `<div style="padding:12px;border-radius:16px;background:white;border:1px solid #ded7c8;display:grid;gap:8px;">
      <p style="margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:800;">Quick tools</p>
      ${renderPrimaryActions(actions.isBusy)}
      <button type="button" id="topic-find-anki" ${actions.isBusy ? 'disabled' : ''} style="width:100%;border:0;border-radius:10px;background:${actions.isBusy ? '#94a3b8' : '#0f766e'};color:white;padding:11px 12px;font-size:12px;font-weight:800;cursor:${actions.isBusy ? 'default' : 'pointer'};">Find relevant Anki cards</button>
    </div>`
  );

  const conversationCard = createElement(
    'div',
    `<div style="padding:12px;border-radius:16px;background:white;border:1px solid #99f6e4;box-shadow:0 8px 22px rgba(15,118,110,.08);display:grid;gap:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <h3 style="margin:0;font-size:15px;">Ask BroBot about this page</h3>
        <span style="font-size:10px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:.08em;">Page grounded</span>
      </div>
      ${renderConversation(state.topicHistory, isLoading)}
      ${
        state.topicChips.length
          ? `<div style="display:flex;gap:6px;flex-wrap:wrap;">${state.topicChips
              .map(
                (chip, index) =>
                  `<button type="button" data-chip-index="${index}" style="border:1px solid #cbd5e1;border-radius:999px;background:#f8fafc;color:#0f172a;padding:6px 10px;font-size:11px;font-weight:600;cursor:pointer;">${escapeHtml(chip)}</button>`
              )
              .join('')}</div>`
          : ''
      }
      <form id="topic-chat-form" style="display:grid;gap:6px;">
        <textarea id="topic-chat-input" rows="3" placeholder="What do you want clarified from this page?" style="width:100%;box-sizing:border-box;border:1px solid #94a3b8;border-radius:12px;padding:11px;font:inherit;resize:vertical;font-size:13px;">${escapeHtml(state.topicChatDraft)}</textarea>
        <div style="display:flex;justify-content:flex-end;">
          <button type="submit" ${actions.isBusy ? 'disabled' : ''} style="border:none;border-radius:999px;background:${actions.isBusy ? '#94a3b8' : '#0f766e'};color:white;padding:8px 12px;font-weight:700;font-size:12px;cursor:${actions.isBusy ? 'default' : 'pointer'};">${actions.isBusy ? 'Sending...' : 'Send'}</button>
        </div>
      </form>
    </div>`
  );
  content.appendChild(conversationCard);
  content.appendChild(actionsCard);

  actionsCard.querySelectorAll<HTMLButtonElement>('[data-topic-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.topicAction as OrthobulletsTopicAction | undefined;
      if (!action) return;
      actions.runTopicTutorTurn({ action });
    });
  });
  const ankiButton = actionsCard.querySelector<HTMLButtonElement>('#topic-find-anki');
  ankiButton?.addEventListener('click', () => actions.findPageAnkiCards(ankiButton));

  if (state.topicInsufficientContent) {
    content.appendChild(
      createElement(
        'div',
        `<div style="padding:10px 12px;border-radius:12px;background:#fffaf0;border:1px solid #f5d7a1;color:#7c2d12;font-size:12px;line-height:1.4;">
          I couldn't ground the last answer confidently in the visible page. Try Refresh; BroBot can still answer using general orthopaedic knowledge and will label added context.
        </div>`
      )
    );
  }

  conversationCard.querySelectorAll<HTMLButtonElement>('[data-save-pearl-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.savePearlIndex ?? -1);
      const turn = state.topicHistory[index];
      if (turn) actions.saveTopicPearl(turn.content);
    });
  });
  conversationCard.querySelectorAll<HTMLButtonElement>('[data-chip-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.chipIndex ?? -1);
      const chip = state.topicChips[index];
      const matchedAction = TOPIC_TUTOR_PRIMARY_ACTIONS.find((item) => item.label === chip)?.action;
      if (matchedAction) {
        actions.runTopicTutorTurn({ action: matchedAction });
      } else if (chip) {
        actions.runTopicTutorTurn({ userMessage: chip });
      }
    });
  });
  const chatInput = conversationCard.querySelector('#topic-chat-input') as HTMLTextAreaElement | null;
  chatInput?.addEventListener('input', (event) => {
    actions.setDraft((event.currentTarget as HTMLTextAreaElement).value);
  });
  conversationCard.querySelector('#topic-chat-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = chatInput?.value.trim();
    if (value) actions.runTopicTutorTurn({ userMessage: value });
  });

  const unlinkCard = createElement(
    'div',
    `<div style="display:flex;justify-content:flex-end;">
      <button id="topic-unlink" style="border:1px solid #d2cab8;border-radius:999px;background:#f7f5ef;color:#18202b;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">Unlink</button>
    </div>`
  );
  content.appendChild(unlinkCard);
  unlinkCard.querySelector('#topic-unlink')?.addEventListener('click', () => actions.unlink());
}
