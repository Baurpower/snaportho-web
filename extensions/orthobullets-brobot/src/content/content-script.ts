import { detectQuestionProvider, extractQuestionContext } from './extractor.js';

declare global {
  interface Window {
    __snapOrthoBroBotContentScriptLoaded?: boolean;
  }
}

if (!window.__snapOrthoBroBotContentScriptLoaded) {
  window.__snapOrthoBroBotContentScriptLoaded = true;
  console.info('[SnapOrtho BroBot] content script loaded');

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
