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

  return `<header style="display:grid;gap:6px;padding:10px;border-radius:12px;background:#f8fafc;border:1px solid #cbd5e1;">
    <div style="display:grid;gap:2px;">
      <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">Orthobullets Page Mode</p>
      <h2 style="margin:0;font-size:16px;line-height:1.25;">${escapeHtml(title)}</h2>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:11px;color:#5c6574;">
      ${currentSection ? `<span style="padding:3px 7px;border-radius:999px;background:white;border:1px solid #d2cab8;">Section: ${escapeHtml(currentSection)}</span>` : ''}
      <span style="padding:3px 7px;border-radius:999px;background:white;border:1px solid #d2cab8;">Tier ${progress.tier}/5</span>
      ${counts.map((count) => `<span style="padding:3px 7px;border-radius:999px;background:white;border:1px solid #d2cab8;">${escapeHtml(count)}</span>`).join('')}
    </div>
  </header>`;
}

function renderPrimaryActions(isBusy: boolean) {
  return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;">
    ${TOPIC_TUTOR_PRIMARY_ACTIONS.map(
      (item) =>
        `<button type="button" data-topic-action="${item.action}" ${isBusy ? 'disabled' : ''} style="border:1px solid #cbd5e1;border-radius:10px;background:${isBusy ? '#f1f5f9' : 'white'};color:#18202b;padding:8px 8px;font-size:11px;font-weight:700;line-height:1.25;cursor:${isBusy ? 'default' : 'pointer'};text-align:left;">${escapeHtml(item.label)}</button>`
    ).join('')}
  </div>`;
}

function renderConversation(history: OrthobulletsTopicTutorTurn[], isLoading: boolean) {
  if (!history.length && !isLoading) {
    return `<p style="margin:0;color:#5c6574;font-size:12px;">Pick an action above, or answer BroBot's question below once it asks one.</p>`;
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
        <div style="max-width:100%;padding:10px 12px;border-radius:14px;line-height:1.5;font-size:13px;${bubbleTone}">${escapeHtml(turn.content)}</div>
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

function renderProgressPanel(progress: OrthobulletsTopicProgress) {
  function renderList(items: string[], emptyLabel: string) {
    if (!items.length) return `<p style="margin:0;color:#94a3b8;font-size:11px;">${escapeHtml(emptyLabel)}</p>`;
    return `<ul style="margin:0;padding-left:16px;display:grid;gap:2px;font-size:12px;line-height:1.35;">${items
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('')}</ul>`;
  }

  return `<details style="padding:10px;border-radius:12px;background:white;border:1px solid #ded7c8;" open>
    <summary style="cursor:pointer;font-weight:700;font-size:13px;">Your progress on this page</summary>
    <div style="margin-top:8px;display:grid;gap:8px;">
      <p style="margin:0;font-size:12px;color:#5c6574;">${progress.sectionsCompleted.length} section${progress.sectionsCompleted.length === 1 ? '' : 's'} completed</p>
      <div>
        <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:#b45309;">Concepts missed</p>
        ${renderList(progress.conceptsMissed, 'None yet — keep going.')}
      </div>
      <div>
        <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:#0f766e;">Concepts mastered</p>
        ${renderList(progress.conceptsMastered, 'None yet.')}
      </div>
      <div>
        <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:#5c6574;">Saved pearls</p>
        ${renderList(progress.savedPearls, 'Tap "Save as pearl" on any BroBot message to keep it here.')}
      </div>
    </div>
  </details>`;
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
      <p style="margin:0;font-size:12px;color:#5c6574;line-height:1.4;">BroBot reads this page's title, headings, and bullets, then quizzes you on it instead of summarizing it.</p>
      ${renderPrimaryActions(actions.isBusy)}
    </div>`
  );
  content.appendChild(actionsCard);
  actionsCard.querySelectorAll<HTMLButtonElement>('[data-topic-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.topicAction as OrthobulletsTopicAction | undefined;
      if (!action) return;
      actions.runTopicTutorTurn({ action });
    });
  });

  if (state.topicInsufficientContent) {
    content.appendChild(
      createElement(
        'div',
        `<div style="padding:10px 12px;border-radius:12px;background:#fffaf0;border:1px solid #f5d7a1;color:#7c2d12;font-size:12px;line-height:1.4;">
          This page didn't have enough extracted content to answer that from the page alone. Reply "yes" below if you'd like BroBot to use general orthopaedic knowledge instead.
        </div>`
      )
    );
  }

  const conversationCard = createElement(
    'div',
    `<div style="padding:12px;border-radius:16px;background:white;border:1px solid #ded7c8;display:grid;gap:10px;">
      <h3 style="margin:0;font-size:14px;">Conversation</h3>
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
        <textarea id="topic-chat-input" rows="2" placeholder="Type your answer or reply here..." style="width:100%;box-sizing:border-box;border:1px solid #d2cab8;border-radius:12px;padding:10px;font:inherit;resize:vertical;font-size:13px;">${escapeHtml(state.topicChatDraft)}</textarea>
        <div style="display:flex;justify-content:flex-end;">
          <button type="submit" ${actions.isBusy ? 'disabled' : ''} style="border:none;border-radius:999px;background:${actions.isBusy ? '#94a3b8' : '#0f766e'};color:white;padding:8px 12px;font-weight:700;font-size:12px;cursor:${actions.isBusy ? 'default' : 'pointer'};">${actions.isBusy ? 'Sending...' : 'Send'}</button>
        </div>
      </form>
    </div>`
  );
  content.appendChild(conversationCard);

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

  content.appendChild(createElement('div', renderProgressPanel(state.topicProgress)));

  const unlinkCard = createElement(
    'div',
    `<div style="display:flex;justify-content:flex-end;">
      <button id="topic-unlink" style="border:1px solid #d2cab8;border-radius:999px;background:#f7f5ef;color:#18202b;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">Unlink</button>
    </div>`
  );
  content.appendChild(unlinkCard);
  unlinkCard.querySelector('#topic-unlink')?.addEventListener('click', () => actions.unlink());
}
