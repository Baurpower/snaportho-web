import type {
  ExtensionErrorCode,
  ExtensionMessage,
  ExtensionMessageResponse,
} from './shared/messages.js';
import type {
  OrthobulletsExtractionDiagnostics,
  OrthobulletsPageContext,
} from './shared/types.js';
import { getConfiguredAppOrigin, isLikelyOrthobulletsUrl } from './shared/runtime.js';

const STORAGE_KEY = 'snaportho_extension_device_token';
const EXTENSION_TOKEN_HEADER = 'x-snaportho-extension-token';
const ADDON_BASE_URL_HEADER = 'x-snaportho-addon-base-url';

// Server error codes (from explain/route.ts and friends) map 1:1 onto the
// extension's own ExtensionErrorCode for known cases; anything else falls
// through to 'unknown' so the UI always has a defined state to render.
const KNOWN_ERROR_CODES = new Set<ExtensionErrorCode>([
  'quota_exceeded',
  'disabled',
  'invalid_request',
  'api_failure',
  'parse_failure',
]);

class CodedError extends Error {
  code: ExtensionErrorCode;
  constructor(message: string, code: ExtensionErrorCode) {
    super(message);
    this.code = code;
  }
}

void chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true });

async function getStoredDeviceToken() {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  return typeof result[STORAGE_KEY] === 'string' ? result[STORAGE_KEY] : null;
}

async function setStoredDeviceToken(deviceToken: string) {
  await chrome.storage.local.set({ [STORAGE_KEY]: deviceToken });
}

async function clearStoredDeviceToken() {
  await chrome.storage.local.remove([STORAGE_KEY]);
}

async function getActiveTabState() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return {
    tabId: typeof tab?.id === 'number' ? tab.id : null,
    url: tab?.url ?? null,
    title: tab?.title ?? null,
    supported: isLikelyOrthobulletsUrl(tab?.url ?? null),
  };
}

async function getTabSnapshot(tabId: number) {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  return {
    tabId: typeof tab?.id === 'number' ? tab.id : null,
    url: tab?.url ?? null,
    status: tab?.status ?? null,
  };
}

async function fetchJson(pathname: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`${getConfiguredAppOrigin()}${pathname}`, init);
  } catch {
    throw new CodedError('Could not reach SnapOrtho. Check your connection and try again.', 'network_failure');
  }

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const code: ExtensionErrorCode = KNOWN_ERROR_CODES.has(json?.error) ? json.error : 'unknown';
    const message = json?.message ?? json?.error ?? `Request failed (${response.status})`;
    throw new CodedError(message, code);
  }
  return json;
}

function isReadableOrthobulletsQuestionContext(pageContext: OrthobulletsPageContext) {
  const hasQuestionIdentity = Boolean(pageContext.questionId || pageContext.stem);
  const hasStem = typeof pageContext.stem === 'string' && pageContext.stem.trim().length > 0;
  const hasChoices = pageContext.answerChoices.length >= 2;

  return hasQuestionIdentity && hasStem && hasChoices;
}

async function sendExtractionMessage(tabId: number): Promise<{
  response: { ok?: boolean; pageContext?: OrthobulletsPageContext; error?: string } | null;
  sendMessageError: string | null;
}> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'ob:extract-page-context' }, (response: unknown) => {
      const sendMessageError = chrome.runtime.lastError?.message ?? null;
      resolve({
        response: (response as { ok?: boolean; pageContext?: OrthobulletsPageContext; error?: string } | null) ?? null,
        sendMessageError,
      });
    });
  });
}

async function injectContentScript(tabId: number) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content-script.js'],
    });
    return { ok: true as const, injectionError: null };
  } catch (error) {
    return {
      ok: false as const,
      injectionError: error instanceof Error ? error.message : 'Failed to inject content script.',
    };
  }
}

function buildExtractionDiagnostics(input: {
  activeTabId: number | null;
  activeTabUrl: string | null;
  activeTabStatus: string | null;
  contentScriptResponded: boolean;
  pageContext?: OrthobulletsPageContext | null;
  failureCode?: OrthobulletsExtractionDiagnostics['failureCode'];
  sendMessageError?: string | null;
  fallbackInjectionAttempted?: boolean;
  injectionError?: string | null;
}): OrthobulletsExtractionDiagnostics {
  const pageContext = input.pageContext ?? null;
  return {
    activeTabId: input.activeTabId,
    activeTabUrl: input.activeTabUrl,
    activeTabStatus: input.activeTabStatus,
    contentScriptResponded: input.contentScriptResponded,
    readable: pageContext ? isReadableOrthobulletsQuestionContext(pageContext) : false,
    failureCode: input.failureCode,
    sendMessageError: input.sendMessageError ?? null,
    fallbackInjectionAttempted: input.fallbackInjectionAttempted ?? false,
    injectionError: input.injectionError ?? null,
    hasQuestionId: Boolean(pageContext?.questionId),
    hasStem: Boolean(pageContext?.stem?.trim()),
    answerChoiceCount: pageContext?.answerChoices.length ?? 0,
    breadcrumbCount: pageContext?.breadcrumbs.length ?? 0,
    percentDistributionCount: pageContext?.percentDistribution.length ?? 0,
    imageCount: pageContext?.images.length ?? 0,
    linkedConceptCount: pageContext?.linkedConcepts.length ?? 0,
    warnings: pageContext?.extractionWarnings ?? [],
  };
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender: unknown, sendResponse: (response: ExtensionMessageResponse) => void) => {
  void (async () => {
    try {
      if (message.type === 'ob:get-active-page-state') {
        sendResponse({ ok: true, activePage: await getActiveTabState() });
        return;
      }

      if (message.type === 'ob:get-auth-state') {
        const deviceToken = await getStoredDeviceToken();
        sendResponse({
          ok: true,
          auth: deviceToken
            ? { status: 'linked', deviceToken }
            : { status: 'unlinked' },
        });
        return;
      }

      if (message.type === 'ob:start-link') {
        const link = await fetchJson('/api/brobot/extension/auth/start-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [ADDON_BASE_URL_HEADER]: getConfiguredAppOrigin(),
          },
          body: JSON.stringify({ deviceName: message.deviceName }),
        });
        await chrome.tabs.create({ url: link.approvalUrl });
        sendResponse({ ok: true, link });
        return;
      }

      if (message.type === 'ob:poll-link') {
        const result = await fetchJson('/api/brobot/extension/auth/poll-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [ADDON_BASE_URL_HEADER]: getConfiguredAppOrigin(),
          },
          body: JSON.stringify({ linkCode: message.linkCode }),
        });

        if (!result?.deviceToken) {
          throw new Error(result?.error ?? 'Device link is not approved yet.');
        }

        await setStoredDeviceToken(result.deviceToken);
        sendResponse({ ok: true, deviceToken: result.deviceToken });
        return;
      }

      if (message.type === 'ob:clear-link') {
        const deviceToken = await getStoredDeviceToken();
        if (deviceToken) {
          await fetchJson('/api/brobot/extension/auth/revoke-device', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [EXTENSION_TOKEN_HEADER]: deviceToken,
            },
            body: JSON.stringify({ deviceToken }),
          }).catch(() => null);
        }
        await clearStoredDeviceToken();
        sendResponse({ ok: true, cleared: true });
        return;
      }

      if (message.type === 'ob:extract-page-context') {
        const tabSnapshot = await getTabSnapshot(message.tabId);
        const initialAttempt = await sendExtractionMessage(message.tabId);
        let response = initialAttempt.response;
        let sendMessageError = initialAttempt.sendMessageError;
        let fallbackInjectionAttempted = false;
        let injectionError: string | null = null;

        const shouldAttemptInjection =
          isLikelyOrthobulletsUrl(tabSnapshot.url) &&
          (!response || sendMessageError?.toLowerCase().includes('receiving end does not exist'));

        if (shouldAttemptInjection) {
          fallbackInjectionAttempted = true;
          const injectionResult = await injectContentScript(message.tabId);
          injectionError = injectionResult.injectionError;

          if (injectionResult.ok) {
            const retryAttempt = await sendExtractionMessage(message.tabId);
            response = retryAttempt.response;
            sendMessageError = retryAttempt.sendMessageError;
          }
        }

        if (!response?.ok || !response.pageContext) {
          const diagnostics = buildExtractionDiagnostics({
            activeTabId: tabSnapshot.tabId,
            activeTabUrl: tabSnapshot.url,
            activeTabStatus: tabSnapshot.status,
            contentScriptResponded: false,
            failureCode: 'content_script_no_response',
            sendMessageError,
            fallbackInjectionAttempted,
            injectionError,
          });
          throw new CodedError(
            JSON.stringify({
              message:
                response?.error ??
                'Could not read this page. Make sure you are on an Orthobullets review page and try again.',
              diagnostics,
            }),
            'extraction_failure'
          );
        }
        const diagnostics = buildExtractionDiagnostics({
          activeTabId: tabSnapshot.tabId,
          activeTabUrl: tabSnapshot.url,
          activeTabStatus: tabSnapshot.status,
          contentScriptResponded: true,
          pageContext: response.pageContext,
          failureCode: isReadableOrthobulletsQuestionContext(response.pageContext) ? undefined : 'page_not_readable',
          sendMessageError,
          fallbackInjectionAttempted,
          injectionError,
        });
        sendResponse({ ok: true, pageContext: response.pageContext, diagnostics });
        return;
      }

      if (message.type === 'ob:explain') {
        const deviceToken = await getStoredDeviceToken();
        if (!deviceToken) {
          throw new CodedError('Extension is not linked to a SnapOrtho account.', 'not_linked');
        }

        const explanation = await fetchJson('/api/brobot/orthobullets/explain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [EXTENSION_TOKEN_HEADER]: deviceToken,
          },
          body: JSON.stringify({ pageContext: message.pageContext }),
        });

        sendResponse({ ok: true, explanation });
        return;
      }

      if (message.type === 'ob:hint') {
        const deviceToken = await getStoredDeviceToken();
        if (!deviceToken) {
          throw new CodedError('Extension is not linked to a SnapOrtho account.', 'not_linked');
        }

        const hint = await fetchJson('/api/brobot/orthobullets/hint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [EXTENSION_TOKEN_HEADER]: deviceToken,
          },
          body: JSON.stringify({
            pageContext: message.pageContext,
            hintLevel: message.hintLevel,
            selectedAnswerKey: message.selectedAnswerKey,
          }),
        });

        sendResponse({ ok: true, hint });
        return;
      }

      if (message.type === 'ob:chat') {
        const deviceToken = await getStoredDeviceToken();
        if (!deviceToken) {
          throw new CodedError('Extension is not linked to a SnapOrtho account.', 'not_linked');
        }

        const chat = await fetchJson('/api/brobot/orthobullets/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [EXTENSION_TOKEN_HEADER]: deviceToken,
          },
          body: JSON.stringify({
            pageContext: message.pageContext,
            explanation: message.explanation,
            history: message.history,
            userMessage: message.userMessage,
          }),
        });

        sendResponse({ ok: true, chat });
        return;
      }

      sendResponse({ ok: false, error: 'Unsupported message.', code: 'unknown' });
    } catch (error) {
      const code = error instanceof CodedError ? error.code : 'unknown';
      let diagnostics: OrthobulletsExtractionDiagnostics | undefined;
      let message = error instanceof Error ? error.message : 'Unknown extension error.';
      if (code === 'extraction_failure' && typeof message === 'string') {
        try {
          const parsed = JSON.parse(message) as { message?: string; diagnostics?: OrthobulletsExtractionDiagnostics };
          message = parsed.message ?? message;
          diagnostics = parsed.diagnostics;
        } catch {
          // keep plain-text fallback
        }
      }
      sendResponse({
        ok: false,
        error: message,
        code,
        diagnostics,
      });
    }
  })();

  return true;
});
