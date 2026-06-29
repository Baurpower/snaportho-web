import type {
  ActivePageState,
  AuthState,
  ExtensionErrorCode,
  ExtensionMessage,
  ExtensionMessageResponse,
} from '../shared/messages.js';
import type {
  OrthobulletsExplainResponse,
  OrthobulletsExtractionDiagnostics,
  OrthobulletsPageContext,
} from '../shared/types.js';
import { isDevelopmentMode } from '../shared/runtime.js';

const BROBOT_ICON_URL = chrome.runtime.getURL('icons/brobot-32.png');

const ERROR_COPY: Record<ExtensionErrorCode, { title: string; canRetry: boolean }> = {
  unsupported_page: { title: 'This page is not supported.', canRetry: false },
  not_linked: { title: 'Extension is not linked to a SnapOrtho account.', canRetry: false },
  quota_exceeded: { title: 'Daily BroBot limit reached.', canRetry: false },
  disabled: { title: 'BroBot Orthobullets explanations are currently unavailable.', canRetry: false },
  invalid_request: { title: 'This page context could not be processed.', canRetry: true },
  api_failure: { title: 'BroBot could not generate an explanation.', canRetry: true },
  parse_failure: { title: "BroBot's response could not be parsed.", canRetry: true },
  extraction_failure: { title: 'Could not read this Orthobullets page.', canRetry: true },
  network_failure: { title: 'Could not reach SnapOrtho.', canRetry: true },
  unknown: { title: 'Something went wrong.', canRetry: true },
};

async function sendMessage(message: ExtensionMessage): Promise<ExtensionMessageResponse> {
  return chrome.runtime.sendMessage(message);
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    className?: string;
    text?: string;
    html?: string;
  } = {}
) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text != null) element.textContent = options.text;
  if (options.html != null) element.innerHTML = options.html;
  return element;
}

function renderList(items: string[]) {
  if (!items.length) return '<p style="margin:0;color:#5c6574;">None</p>';
  return `<ul style="margin:0;padding-left:18px;">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function canUnlockFullExplanation(pageContext: OrthobulletsPageContext) {
  return Boolean(pageContext.correctAnswerKey && pageContext.explanationText);
}

function isCurrentTestAwaitingReview(pageContext: OrthobulletsPageContext) {
  return pageContext.pageKind === 'current_test' && !canUnlockFullExplanation(pageContext);
}

function isReadableReviewPage(pageContext: OrthobulletsPageContext) {
  const hasQuestionIdentity = Boolean(pageContext.questionId || pageContext.stem);
  const hasStem = Boolean(pageContext.stem?.trim());
  const hasChoices = pageContext.answerChoices.length >= 2;
  return hasQuestionIdentity && hasStem && hasChoices;
}

export function mountSidePanelApp(root: HTMLElement) {
  const state: {
    activePage: ActivePageState | null;
    auth: AuthState | null;
    loading: boolean;
    linking: boolean;
    linkCode: string | null;
    pageContext: OrthobulletsPageContext | null;
    extractionDiagnostics: OrthobulletsExtractionDiagnostics | null;
    explanation: OrthobulletsExplainResponse | null;
    error: { message: string; code: ExtensionErrorCode } | null;
    debugMode: boolean;
  } = {
    activePage: null,
    auth: null,
    loading: true,
    linking: false,
    linkCode: null,
    pageContext: null,
    extractionDiagnostics: null,
    explanation: null,
    error: null,
    debugMode: false,
  };

  async function refreshBaseState() {
    state.loading = true;
    render();

    const [pageResult, authResult] = await Promise.all([
      sendMessage({ type: 'ob:get-active-page-state' }),
      sendMessage({ type: 'ob:get-auth-state' }),
    ]);

    state.activePage = pageResult.ok && 'activePage' in pageResult ? pageResult.activePage : null;
    state.auth = authResult.ok && 'auth' in authResult ? authResult.auth : null;
    state.loading = false;
    render();
  }

  async function startLinkFlow() {
    state.error = null;
    state.linking = true;
    render();

    const deviceName = `Chrome ${new Date().toISOString().slice(0, 16)}`;
    const result = await sendMessage({ type: 'ob:start-link', deviceName });
    if (!result.ok || !('link' in result)) {
      state.error = result.ok
        ? { message: 'Failed to start link flow.', code: 'unknown' }
        : { message: result.error, code: result.code ?? 'unknown' };
      state.linking = false;
      render();
      return;
    }

    state.linkCode = result.link.linkCode;
    render();

    const interval = window.setInterval(async () => {
      if (!state.linkCode) {
        window.clearInterval(interval);
        return;
      }

      const pollResult = await sendMessage({
        type: 'ob:poll-link',
        linkCode: state.linkCode,
      });

      if (pollResult.ok && 'deviceToken' in pollResult) {
        state.linking = false;
        state.linkCode = null;
        await refreshBaseState();
        window.clearInterval(interval);
        return;
      }
    }, 3000);
  }

  async function runExplain() {
    state.error = null;
    state.explanation = null;
    render();

    if (!state.activePage?.tabId) {
      state.error = { message: 'No active Orthobullets tab is available.', code: 'unsupported_page' };
      render();
      return;
    }

    const extractResult = await sendMessage({
      type: 'ob:extract-page-context',
      tabId: state.activePage.tabId,
    });

    if (!extractResult.ok || !('pageContext' in extractResult)) {
      state.extractionDiagnostics = !extractResult.ok && 'diagnostics' in extractResult ? extractResult.diagnostics ?? null : null;
      state.error = extractResult.ok
        ? { message: 'Failed to extract page context.', code: 'extraction_failure' }
        : { message: extractResult.error, code: extractResult.code ?? 'extraction_failure' };
      render();
      return;
    }

    state.pageContext = extractResult.pageContext;
    state.extractionDiagnostics = extractResult.diagnostics;
    if (!isReadableReviewPage(extractResult.pageContext)) {
      state.error = {
        message: 'This page did not expose enough visible question content yet. BroBot needs the stem and at least two answer choices to continue.',
        code: 'extraction_failure',
      };
      render();
      return;
    }
    if (isCurrentTestAwaitingReview(extractResult.pageContext)) {
      state.error = null;
      state.explanation = null;
      render();
      return;
    }
    render();

    const explainResult = await sendMessage({
      type: 'ob:explain',
      pageContext: extractResult.pageContext,
    });

    if (!explainResult.ok || !('explanation' in explainResult)) {
      state.error = explainResult.ok
        ? { message: 'Failed to explain page.', code: 'unknown' }
        : { message: explainResult.error, code: explainResult.code ?? 'unknown' };
      render();
      return;
    }

    state.explanation = explainResult.explanation;
    render();
  }

  async function unlink() {
    await sendMessage({ type: 'ob:clear-link' });
    state.explanation = null;
    await refreshBaseState();
  }

  function renderExplanation(explanation: OrthobulletsExplainResponse) {
    return `
      <section style="display:grid;gap:12px;">
        <article style="padding:12px;border-radius:14px;background:#f0fdfa;border:1px solid #99f6e4;">
          <h3 style="margin:0 0 6px;">Bottom Line</h3>
          <p style="margin:0;font-weight:600;">${explanation.bottomLine}</p>
        </article>
        <article style="padding:12px;border-radius:14px;background:white;border:1px solid #ded7c8;">
          <h3 style="margin:0 0 6px;">Tested Concept</h3>
          <p style="margin:0;">${explanation.testedConcept}</p>
        </article>
        <article style="padding:12px;border-radius:14px;background:white;border:1px solid #ded7c8;">
          <h3 style="margin:0 0 6px;">Why This Answer Is Correct</h3>
          <p style="margin:0;white-space:pre-wrap;">${explanation.whyCorrect}</p>
        </article>
        <article style="padding:12px;border-radius:14px;background:white;border:1px solid #ded7c8;">
          <h3 style="margin:0 0 6px;">Why the Other Choices Are Wrong</h3>
          ${renderList(
            explanation.whyWrong.map(
              (item) =>
                `${item.choiceKey ?? '?'}: ${item.reason}${item.isClassicTrap ? ' <strong>(classic trap)</strong>' : ''}`
            )
          )}
        </article>
        <article style="padding:12px;border-radius:14px;background:#fffbeb;border:1px solid #fde68a;">
          <h3 style="margin:0 0 6px;">Board Pearl</h3>
          <p style="margin:0;font-weight:600;">${explanation.boardPearl}</p>
        </article>
      </section>
    `;
  }

  function render() {
    root.innerHTML = '';

    const container = createElement('div', {
      html: `
        <div style="padding:18px;display:grid;gap:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${BROBOT_ICON_URL}" alt="BroBot" width="32" height="32" style="display:block;width:32px;height:32px;border-radius:8px;" />
            <div>
            <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#0f766e;font-weight:700;">BroBot</p>
            <h1 style="margin:6px 0 0;font-size:24px;line-height:1.2;">Orthobullets Tutor</h1>
            </div>
          </div>
        </div>
      `,
    });

    const content = createElement('div');
    content.style.padding = '0 18px 18px';
    content.style.display = 'grid';
    content.style.gap = '14px';

    if (state.loading) {
      content.appendChild(createElement('p', { text: 'Loading extension state...' }));
    } else if (!state.activePage?.supported) {
      content.appendChild(
        createElement('div', {
          html: `<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;">
            Open an Orthobullets page, then reopen this side panel.
          </div>`,
        })
      );
    } else if (state.auth?.status !== 'linked') {
      const card = createElement('div', {
        html: `<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;">
          <p style="margin:0 0 10px;">Link this extension to your SnapOrtho account before requesting explanations.</p>
          <button id="start-link" style="border:none;border-radius:999px;background:#0f766e;color:white;padding:10px 14px;font-weight:700;cursor:pointer;">
            ${state.linking ? 'Waiting for approval...' : 'Link to SnapOrtho'}
          </button>
          ${state.linkCode ? `<p style="margin:10px 0 0;color:#5c6574;">Link code: ${state.linkCode}</p>` : ''}
        </div>`,
      });
      content.appendChild(card);
      card.querySelector('#start-link')?.addEventListener('click', () => {
        void startLinkFlow();
      });
    } else {
      const explainButtonLabel =
        state.pageContext && isCurrentTestAwaitingReview(state.pageContext)
          ? 'Waiting for review mode'
          : 'Explain with BroBot';
      const controls = createElement('div', {
        html: `<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;display:grid;gap:10px;">
          <p style="margin:0;color:#5c6574;">Active page: ${state.activePage.title ?? state.activePage.url ?? 'Orthobullets'}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="explain" style="border:none;border-radius:999px;background:#0f766e;color:white;padding:10px 14px;font-weight:700;cursor:pointer;">${explainButtonLabel}</button>
            <button id="unlink" style="border:1px solid #d2cab8;border-radius:999px;background:#f7f5ef;color:#18202b;padding:10px 14px;font-weight:700;cursor:pointer;">Unlink</button>
          </div>
        </div>`,
      });
      content.appendChild(controls);
      controls.querySelector('#explain')?.addEventListener('click', () => void runExplain());
      controls.querySelector('#unlink')?.addEventListener('click', () => void unlink());
    }

    if (state.pageContext && isCurrentTestAwaitingReview(state.pageContext)) {
      content.appendChild(
        createElement('div', {
          html: `<div style="padding:12px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;display:grid;gap:8px;">
            <p style="margin:0;font-weight:700;">Current test detected.</p>
            <p style="margin:0;">Answer or review the question to unlock the complete BroBot explanation.</p>
          </div>`,
        })
      );
    }

    if (state.error) {
      const copy = ERROR_COPY[state.error.code] ?? ERROR_COPY.unknown;
      const errorCard = createElement('div', {
        html: `<div style="padding:12px;border-radius:14px;background:#fff0ef;border:1px solid #f0c0bc;color:#a02d1f;display:grid;gap:8px;">
          <p style="margin:0;font-weight:700;">${copy.title}</p>
          <p style="margin:0;">${state.error.message}</p>
          ${
            state.extractionDiagnostics?.failureCode
              ? `<p style="margin:0;font-size:12px;color:#7f1d1d;">Failure code: ${state.extractionDiagnostics.failureCode}</p>`
              : ''
          }
          ${copy.canRetry ? `<button id="retry-explain" style="justify-self:start;border:1px solid #a02d1f;border-radius:999px;background:white;color:#a02d1f;padding:6px 12px;font-weight:700;cursor:pointer;">Retry</button>` : ''}
        </div>`,
      });
      content.appendChild(errorCard);
      errorCard.querySelector('#retry-explain')?.addEventListener('click', () => void runExplain());
    }

    if (state.activePage?.supported && state.auth?.status === 'linked') {
      const debugToggle = createElement('div', {
        html: `<button id="toggle-debug" style="justify-self:start;border:none;background:none;color:#5c6574;font-size:12px;text-decoration:underline;cursor:pointer;padding:0;">
          ${state.debugMode ? 'Hide debug info' : 'Show debug info'}
        </button>`,
      });
      content.appendChild(debugToggle);
      debugToggle.querySelector('#toggle-debug')?.addEventListener('click', () => {
        state.debugMode = !state.debugMode;
        render();
      });
    }

    if ((state.debugMode || isDevelopmentMode()) && (state.pageContext || state.extractionDiagnostics)) {
      content.appendChild(
        createElement('div', {
          html: `<div style="padding:12px;border-radius:14px;background:white;border:1px solid #ded7c8;">
            <h3 style="margin:0 0 6px;">Debug Summary</h3>
            <pre style="white-space:pre-wrap;margin:0;font-size:12px;">${JSON.stringify(
              {
                activeTabUrl: state.extractionDiagnostics?.activeTabUrl ?? state.activePage?.url ?? null,
                contentScriptResponded: state.extractionDiagnostics?.contentScriptResponded ?? null,
                readable: state.extractionDiagnostics?.readable ?? null,
                failureCode: state.extractionDiagnostics?.failureCode ?? null,
                extractorVersion: state.pageContext?.debug?.extractorVersion ?? null,
                pageKind: state.pageContext?.pageKind ?? null,
                questionId: state.pageContext?.questionId ?? null,
                topicId: state.pageContext?.topicId ?? null,
                breadcrumbCount: state.extractionDiagnostics?.breadcrumbCount ?? state.pageContext?.breadcrumbs.length ?? 0,
                breadcrumbs: state.pageContext?.breadcrumbs ?? [],
                hasStem: state.extractionDiagnostics?.hasStem ?? Boolean(state.pageContext?.stem),
                stemPreview: state.pageContext?.stem?.slice(0, 80) ?? null,
                hasQuestionId: state.extractionDiagnostics?.hasQuestionId ?? Boolean(state.pageContext?.questionId),
                answerChoiceCount: state.extractionDiagnostics?.answerChoiceCount ?? state.pageContext?.answerChoices.length ?? 0,
                selectedAnswerKey: state.pageContext?.selectedAnswerKey ?? null,
                correctAnswerKey: state.pageContext?.correctAnswerKey ?? null,
                percentDistributionRows:
                  state.extractionDiagnostics?.percentDistributionCount ?? state.pageContext?.percentDistribution.length ?? 0,
                imageCount: state.extractionDiagnostics?.imageCount ?? state.pageContext?.images.length ?? 0,
                linkedConceptCount:
                  state.extractionDiagnostics?.linkedConceptCount ?? state.pageContext?.linkedConcepts.length ?? 0,
                warnings: state.extractionDiagnostics?.warnings ?? state.pageContext?.extractionWarnings ?? [],
                matchedSelectors: state.pageContext?.debug?.matchedSelectors ?? {},
                lastErrorCode: state.error?.code ?? null,
              },
              null,
              2
            )}</pre>
          </div>`,
        })
      );
    }

    if (state.explanation) {
      content.appendChild(createElement('div', { html: renderExplanation(state.explanation) }));
    }

    root.appendChild(container);
    root.appendChild(content);
  }

  void refreshBaseState();
}
