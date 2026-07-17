import { detectQuestionProvider, extractQuestionContext } from './extractor.js';
import { startQuestionLifecycleWatch } from './question-lifecycle.js';
import { installHimalayaDebugInspector } from '../providers/himalaya/himalaya-debug.js';

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
    <div id="brobot-panel" aria-label="BroBot panel">
      <button id="brobot-close" type="button" aria-label="Close BroBot">×</button>
      <iframe title="BroBot" src="${chrome.runtime.getURL('sidepanel.html')}"></iframe>
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
}

if (!window.__snapOrthoBroBotContentScriptLoaded) {
  window.__snapOrthoBroBotContentScriptLoaded = true;
  console.info('[SnapOrtho BroBot] content script loaded');
  ensureInPageLauncher();
  installHimalayaDebugInspector(document);
  startQuestionLifecycleWatch(document, window.location.href);

  chrome.runtime.onMessage.addListener((message: { type?: string }, _sender: unknown, sendResponse: (response: unknown) => void) => {
    if (message?.type !== 'ob:extract-page-context') {
      return false;
    }

    try {
      const provider = detectQuestionProvider({
        document: document as never,
        pageUrl: window.location.href,
      });
      const pageContext = extractQuestionContext({
        document: document as never,
        pageUrl: window.location.href,
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
        return false;
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

    return false;
  });
}
