import { extractOrthobulletsPageContext } from './extractor.js';

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
      const pageContext = extractOrthobulletsPageContext({
        document: document as never,
        pageUrl: window.location.href,
      });

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
