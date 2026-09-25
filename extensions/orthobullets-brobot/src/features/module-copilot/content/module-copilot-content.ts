import { captureFrameSnapshot, clickStampedElement } from '../extraction/extract-frame.js';
import type { FrameSnapshot } from '../types/module-state.js';

declare global {
  interface Window {
    __brobotModuleCopilot?: {
      captureFrame: () => FrameSnapshot;
      click: (elementId: string) => { ok: boolean; error?: string };
    };
  }
}

function install() {
  if (window.__brobotModuleCopilot) return;
  window.__brobotModuleCopilot = {
    captureFrame() {
      try {
        return captureFrameSnapshot(document, window.location.href);
      } catch {
        return {
          url: window.location.href,
          title: document.title,
          isTop: window.top === window,
          accessible: false,
          visibleText: '',
          headings: [],
          iframeCount: document.querySelectorAll('iframe').length,
          inaccessibleIframeCount: document.querySelectorAll('iframe').length,
          controls: [],
          question: null,
          progress: null,
          videos: [],
          moduleSignals: [],
          scormSignals: [],
        };
      }
    },
    click(elementId: string) {
      return clickStampedElement(document, elementId);
    },
  };
}

install();
