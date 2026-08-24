import { detectQuestionProvider, extractQuestionContext } from './extractor.js';
import { startQuestionLifecycleWatch } from './question-lifecycle.js';
import { installHimalayaDebugInspector } from '../providers/himalaya/himalaya-debug.js';
import { submitHimalayaAnswerForRemediation } from '../providers/himalaya/himalaya-api.js';
import {
  getActiveHimalayaQuestion,
  getHimalayaStoreSnapshot,
  startHimalayaStore,
  subscribeToHimalayaStore,
  waitForHimalayaStoreReady,
} from '../providers/himalaya/himalaya-store.js';

const revealedHimalayaQuestions = new Set<number>();
const collapsedHimalayaAnswers = new Set<number>();
const himalayaRemediationResults = new Map<number, {
  loading?: boolean;
  error?: string;
  correct?: boolean | null;
  correctAnswerIds?: string[];
  explanation?: string | null;
}>();

function renderHimalayaAnswerCheck(root: ShadowRoot | HTMLElement) {
  const slot = root.querySelector('#brobot-answer-check') as HTMLElement | null;
  if (!slot) return;
  const question = getActiveHimalayaQuestion();
  if (!question || question.reviewAvailable) {
    slot.replaceChildren();
    slot.setAttribute('data-visible', 'false');
    return;
  }

  const selected = question.choices.find((choice) => choice.selected);
  const submission = himalayaRemediationResults.get(question.questionAttemptId);
  const bridgeQuestion = getHimalayaStoreSnapshot().bridgeState?.liveQuestion?.question ?? null;
  const submittedCorrectLabels = (submission?.correctAnswerIds ?? []).flatMap((rawId) => {
    const index = bridgeQuestion?.answers?.findIndex((answer) => String(answer.id) === rawId) ?? -1;
    return index >= 0 ? [question.choices[index]?.id].filter((value): value is string => Boolean(value)) : [];
  });
  const correctIds = submittedCorrectLabels.length ? submittedCorrectLabels : question.authoritativeCorrectChoiceIds;
  const correct = question.choices.find((choice) => correctIds.includes(choice.id));
  const revealed = revealedHimalayaQuestions.has(question.questionAttemptId);
  const button = document.createElement('button');
  button.id = 'brobot-check-answer';
  button.type = 'button';
  button.disabled = !selected || submission?.loading === true;
  button.textContent = submission?.loading
    ? 'Checking with AAOS…'
    : !selected
      ? 'Select an answer to check'
      : revealed
        ? collapsedHimalayaAnswers.has(question.questionAttemptId) ? 'Show checked answer' : 'AAOS answer revealed'
        : 'Submit & check answer';

  slot.replaceChildren(button);
  slot.setAttribute('data-visible', 'true');
  if (revealed && selected && correct && !collapsedHimalayaAnswers.has(question.questionAttemptId)) {
    const result = document.createElement('div');
    result.id = 'brobot-answer-result';
    const isCorrect = selected.id === correct.id;
    result.setAttribute('data-correct', String(isCorrect));
    const heading = document.createElement('strong');
    heading.textContent = isCorrect ? 'Correct' : 'Not quite';
    const dismiss = document.createElement('button');
    dismiss.id = 'brobot-dismiss-answer';
    dismiss.type = 'button';
    dismiss.setAttribute('aria-label', 'Minimize checked answer');
    dismiss.textContent = '×';
    const detail = document.createElement('span');
    detail.textContent = `You chose ${selected.label}. AAOS answer: ${correct.label}) ${correct.text}`;
    result.append(heading, dismiss, detail);
    if (submission?.explanation) {
      const explanation = document.createElement('span');
      explanation.textContent = submission.explanation;
      result.appendChild(explanation);
    }
    slot.appendChild(result);
    dismiss.addEventListener('click', () => {
      collapsedHimalayaAnswers.add(question.questionAttemptId);
      renderHimalayaAnswerCheck(root);
    });
  } else if (submission?.error) {
    const error = document.createElement('div');
    error.id = 'brobot-answer-result';
    error.textContent = submission.error;
    slot.appendChild(error);
  }
  button.addEventListener('click', async () => {
    if (!selected || !bridgeQuestion) return;
    if (revealed && collapsedHimalayaAnswers.has(question.questionAttemptId)) {
      collapsedHimalayaAnswers.delete(question.questionAttemptId);
      renderHimalayaAnswerCheck(root);
      return;
    }
    if (correct) {
      revealedHimalayaQuestions.add(question.questionAttemptId);
      renderHimalayaAnswerCheck(root);
      return;
    }
    const snapshot = getHimalayaStoreSnapshot();
    const testAttemptId = snapshot.bridgeState?.testAttemptId;
    if (testAttemptId == null) return;
    himalayaRemediationResults.set(question.questionAttemptId, { loading: true });
    renderHimalayaAnswerCheck(root);
    const result = await submitHimalayaAnswerForRemediation({
      testAttemptId,
      question: bridgeQuestion,
      origin: window.location.origin,
    });
    if (result.ok) {
      himalayaRemediationResults.set(question.questionAttemptId, result);
      revealedHimalayaQuestions.add(question.questionAttemptId);
    } else {
      const suffix = result.status ? ` (${result.status})` : '';
      himalayaRemediationResults.set(question.questionAttemptId, {
        error: `AAOS did not release per-question feedback: ${result.reason}${suffix}.`,
      });
    }
    renderHimalayaAnswerCheck(root);
  });
}

declare global {
  interface Window {
    __snapOrthoBroBotContentScriptLoaded?: boolean;
  }
}

function ensureInPageLauncher() {
  if (detectQuestionProvider({ document: document as never, pageUrl: window.location.href }) !== 'himalaya') return;
  if (document.getElementById('brobot-extension-root')) return;

  const host = document.createElement('div');
  host.id = 'brobot-extension-root';
  document.documentElement.appendChild(host);
  const root = host.attachShadow?.({ mode: 'open' }) ?? host;

  const style = document.createElement('style');
  style.textContent = `
    :host, #brobot-shell { all: initial; }
    #brobot-shell { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    #brobot-launcher { width: 52px; height: 52px; border-radius: 999px; border: 1px solid rgba(15, 118, 110, 0.3); background: #0f766e; color: white; box-shadow: 0 14px 34px rgba(15, 23, 42, 0.24); display: grid; place-items: center; cursor: pointer; padding: 0; }
    #brobot-launcher img { width: 30px; height: 30px; display: block; }
    #brobot-answer-check { display:none; position:absolute; right:0; bottom:64px; width:300px; padding:10px; border:1px solid rgba(15,23,42,.16); border-radius:14px; background:#fff; box-shadow:0 14px 34px rgba(15,23,42,.2); }
    #brobot-answer-check[data-visible="true"] { display:grid; gap:8px; }
    #brobot-check-answer { border:0; border-radius:11px; padding:10px 12px; background:#0f766e; color:#fff; font:700 13px/1.2 system-ui; cursor:pointer; }
    #brobot-check-answer:disabled { background:#94a3b8; cursor:default; }
    #brobot-answer-result { display:grid; gap:4px; padding:10px; border-radius:10px; background:#fff7ed; color:#9a3412; font:500 12px/1.4 system-ui; }
    #brobot-answer-result { position:relative; padding-right:38px; }
    #brobot-dismiss-answer { position:absolute; top:7px; right:7px; width:26px; height:26px; border-radius:999px; border:1px solid rgba(15,23,42,.14); background:#fff; color:#18202b; font:700 18px/1 system-ui; cursor:pointer; }
    #brobot-answer-result[data-correct="true"] { background:#ecfdf5; color:#065f46; }
    #brobot-answer-result strong { font-size:14px; }
    #brobot-answer-result span { overflow-wrap:anywhere; }
    #brobot-panel { display: none; width: min(420px, calc(100vw - 32px)); height: min(720px, calc(100vh - 92px)); background: #fbfaf6; border: 1px solid rgba(15, 23, 42, 0.16); border-radius: 16px; overflow: hidden; box-shadow: 0 22px 60px rgba(15, 23, 42, 0.26); }
    #brobot-panel[data-open="true"] { display: block; }
    #brobot-panel iframe { width: 100%; height: 100%; border: 0; background: #fbfaf6; display: block; }
    #brobot-close { position: absolute; top: 8px; right: 8px; z-index: 2; width: 30px; height: 30px; border-radius: 999px; border: 1px solid rgba(15, 23, 42, 0.14); background: white; color: #18202b; font: 700 18px/1 system-ui; cursor: pointer; }
    @media (max-width: 520px) {
      #brobot-shell { right: 12px; bottom: 12px; }
      #brobot-panel { width: calc(100vw - 24px); height: min(680px, calc(100vh - 84px)); }
    }
  `;

  const shell = document.createElement('div');
  shell.id = 'brobot-shell';
  shell.innerHTML = `
    <div id="brobot-answer-check" data-visible="false" aria-live="polite"></div>
    <div id="brobot-panel" aria-label="BroBot panel">
      <button id="brobot-close" type="button" aria-label="Close BroBot">×</button>
      <iframe title="BroBot" src="${chrome.runtime.getURL('sidepanel.html')}?embedded=1&amp;hostUrl=${encodeURIComponent(window.location.href)}"></iframe>
    </div>
    <button id="brobot-launcher" type="button" aria-label="Open BroBot">
      <img alt="" src="${chrome.runtime.getURL('icons/brobot-32.png')}" />
    </button>
  `;
  root.append(style, shell);

  const panel = root.querySelector('#brobot-panel') as HTMLElement | null;
  const launcher = root.querySelector('#brobot-launcher') as HTMLButtonElement | null;
  const close = root.querySelector('#brobot-close') as HTMLButtonElement | null;
  launcher?.addEventListener('click', () => {
    panel?.setAttribute('data-open', panel.getAttribute('data-open') === 'true' ? 'false' : 'true');
  });
  close?.addEventListener('click', () => panel?.setAttribute('data-open', 'false'));
  renderHimalayaAnswerCheck(root);
}

if (!window.__snapOrthoBroBotContentScriptLoaded) {
  window.__snapOrthoBroBotContentScriptLoaded = true;
  console.info('[SnapOrtho BroBot] content script loaded');
  // Embedded panels live inside AAOS popup windows. Register the sender tab so
  // the extension frame can bind to this host instead of Chrome's unrelated
  // active tab in the parent window.
  void chrome.runtime
    .sendMessage({ type: 'ob:register-host-page' })
    .catch(() => null)
    .finally(() => ensureInPageLauncher());
  installHimalayaDebugInspector(document);
  // Must start before the lifecycle watch so the first fingerprint can already
  // see te6 API data rather than falling back to DOM scraping.
  if (detectQuestionProvider({ document: document as never, pageUrl: window.location.href }) === 'himalaya') {
    startHimalayaStore(window);
  }
  const questionLifecycle = startQuestionLifecycleWatch(document, window.location.href);
  if (detectQuestionProvider({ document: document as never, pageUrl: window.location.href }) === 'himalaya') {
    subscribeToHimalayaStore((snapshot) => {
      const launcherHost = document.getElementById('brobot-extension-root');
      const launcherRoot = launcherHost?.shadowRoot ?? launcherHost;
      if (launcherRoot) renderHimalayaAnswerCheck(launcherRoot);
      if (snapshot.readiness === 'ready' || snapshot.readiness === 'error') {
        questionLifecycle.requestCheck('store');
      }
    });
  }

  chrome.runtime.onMessage.addListener((message: { type?: string; questionAttemptId?: number }, _sender: unknown, sendResponse: (response: unknown) => void) => {
    if (message?.type !== 'ob:extract-page-context') {
      return false;
    }

    void (async () => {
      try {
      const provider = detectQuestionProvider({
        document: document as never,
        pageUrl: window.location.href,
      });
      if (
        provider === 'himalaya' &&
        message.questionAttemptId != null &&
        getHimalayaStoreSnapshot().readiness !== 'ready'
      ) {
        // Targeted rows need the structured attempt payload. Overview pages do
        // not wait: Wicket can replace that transient results DOM while the API
        // request is in flight, so the panel must commit the overview first.
        await waitForHimalayaStoreReady();
      }
      const pageContext = extractQuestionContext({
        document: document as never,
        pageUrl: window.location.href,
        questionAttemptId: message.questionAttemptId,
      });

      const debugEnabled = (() => { try { return localStorage.getItem('snaportho_brobot_debug') === '1'; } catch { return false; } })();
      if (debugEnabled && pageContext) {
        const textLen = pageContext.contentMarkdown?.trim().length ?? pageContext.contentText?.trim().length ?? 0;
        const textPreview = (pageContext.contentMarkdown ?? pageContext.contentText ?? '').trim().slice(0, 200);
        console.debug('[BroBot] extraction result', {
          url: window.location.href,
          mode: pageContext.mode,
          pageKind: (pageContext as unknown as Record<string, unknown>).pageKind,
          title: pageContext.title,
          headingCount: pageContext.sectionHeadings?.length ?? 0,
          contentCharCount: textLen,
          textPreview,
          matchedSelectors: (pageContext.debug as Record<string, unknown> | undefined)?.matchedSelectors,
          extractionWarnings: (pageContext as unknown as Record<string, unknown>).extractionWarnings,
          usedBodyTextFallback: (pageContext.raw as Record<string, unknown> | undefined)?.providerSpecific,
        });
      } else if (debugEnabled) {
        console.debug('[BroBot] extraction returned null', { url: window.location.href, provider });
      }

      if (!pageContext) {
        sendResponse({
          ok: false,
          unsupported: true,
          provider: provider ?? 'unsupported',
          error: 'This readable page is not a supported BroBot question page.',
        });
        return;
      }

      sendResponse({
        ok: true,
        pageContext,
      });
      } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to extract Orthobullets page context.',
      });
      }
    })();

    return true;
  });
}
