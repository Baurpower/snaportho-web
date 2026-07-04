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
