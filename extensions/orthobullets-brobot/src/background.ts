import type {
  ExtensionErrorCode,
  ExtensionMessage,
  ExtensionMessageResponse,
} from './shared/messages.js';
import type {
  ExtensionFetchDiagnostics,
  OrthobulletsExtractionDiagnostics,
  OrthobulletsPageContext,
  ProviderDetectionStatus,
  QuestionProvider,
} from './shared/types.js';
import {
  classifyPage,
  isPageUsable,
} from './shared/page-classification.js';
import {
  detectSupportedQuestionProviderFromUrl,
  getConfiguredAppOrigin,
  isLikelySupportedQuestionUrl,
} from './shared/runtime.js';

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
  fetchDiagnostics?: ExtensionFetchDiagnostics;
  constructor(message: string, code: ExtensionErrorCode, fetchDiagnostics?: ExtensionFetchDiagnostics) {
    super(message);
    this.code = code;
    this.fetchDiagnostics = fetchDiagnostics;
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
  const provider: QuestionProvider | null = detectSupportedQuestionProviderFromUrl(tab?.url ?? null);
  return {
    tabId: typeof tab?.id === 'number' ? tab.id : null,
    url: tab?.url ?? null,
    title: tab?.title ?? null,
    supported: isLikelySupportedQuestionUrl(tab?.url ?? null),
    provider,
    detectionStatus: (provider ?? 'unsupported') as ProviderDetectionStatus,
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

function safeResponseBodyPreview(value: string | null) {
  if (!value) return null;
  return value
    .replace(/snaportho_(?:extension|device)_[A-Za-z0-9_=-]+/g, '[redacted-device-token]')
    .slice(0, 800);
}

async function fetchJson(pathname: string, init?: RequestInit) {
  const baseUrl = getConfiguredAppOrigin();
  const attemptedLinkUrl = `${baseUrl}${pathname}`;
  const baseDiagnostics = {
    attemptedLinkUrl,
    baseUrl,
    httpStatus: null,
    responseBody: null,
    responseMessage: null,
    fetchFailedBeforeResponse: false,
  };
  let response: Response;
  try {
    response = await fetch(attemptedLinkUrl, init);
  } catch (error) {
    throw new CodedError(
      'Could not reach SnapOrtho. Check that the extension is built for the local app URL and that the dev server is running.',
      'network_failure',
      {
        ...baseDiagnostics,
        responseMessage: error instanceof Error ? error.message : 'Fetch failed before a response was received.',
        fetchFailedBeforeResponse: true,
      }
    );
  }

  const rawBody = await response.text().catch(() => '');
  const json = rawBody
    ? await Promise.resolve()
        .then(() => JSON.parse(rawBody))
        .catch(() => null)
    : null;
  if (!response.ok) {
    const code: ExtensionErrorCode = KNOWN_ERROR_CODES.has(json?.error) ? json.error : 'unknown';
    const message =
      response.status === 401
        ? 'Log in to SnapOrtho first, then retry linking the extension.'
        : json?.message ?? json?.error ?? `Request failed (${response.status})`;
    throw new CodedError(message, code, {
      ...baseDiagnostics,
      httpStatus: response.status,
      responseBody: safeResponseBodyPreview(rawBody),
      responseMessage: json?.message ?? json?.error ?? response.statusText,
    });
  }
  return json;
}

function enrichPageContext(pageContext: OrthobulletsPageContext) {
  const classification = pageContext.classification ?? classifyPage(pageContext);
  return {
    ...pageContext,
    classification,
  };
}

function isReadablePageContext(pageContext: OrthobulletsPageContext) {
  return isPageUsable(pageContext);
}

async function sendExtractionMessage(tabId: number): Promise<{
  response: { ok?: boolean; pageContext?: OrthobulletsPageContext; error?: string; provider?: ProviderDetectionStatus; unsupported?: boolean } | null;
  sendMessageError: string | null;
}> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'ob:extract-page-context' }, (response: unknown) => {
      const sendMessageError = chrome.runtime.lastError?.message ?? null;
      resolve({
        response: (response as { ok?: boolean; pageContext?: OrthobulletsPageContext; error?: string; provider?: ProviderDetectionStatus; unsupported?: boolean } | null) ?? null,
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
  const pageContext = input.pageContext ? enrichPageContext(input.pageContext) : null;
  const urlProvider = detectSupportedQuestionProviderFromUrl(input.activeTabUrl);
  const provider = pageContext?.provider ?? urlProvider ?? 'unsupported';
  const providerSpecific = pageContext?.raw?.providerSpecific ?? {};
  const classification = pageContext?.classification;
  return {
    activeTabId: input.activeTabId,
    activeTabUrl: input.activeTabUrl,
    activeTabStatus: input.activeTabStatus,
    contentScriptResponded: input.contentScriptResponded,
    provider,
    readable: pageContext ? isReadablePageContext(pageContext) : false,
    classification,
    failureCode: input.failureCode,
    sendMessageError: input.sendMessageError ?? null,
    fallbackInjectionAttempted: input.fallbackInjectionAttempted ?? false,
    injectionError: input.injectionError ?? null,
    hasQuestionId: Boolean(pageContext?.questionId),
    hasStem: Boolean(pageContext?.stem?.trim()),
    answerChoiceCount: pageContext?.answerChoices.length ?? 0,
    hasSelectedAnswer: Boolean(pageContext?.selectedAnswerKey ?? pageContext?.selectedAnswer),
    hasCorrectAnswer: Boolean(pageContext?.correctAnswerKey ?? pageContext?.correctAnswer),
    hasExplanation: Boolean(pageContext?.explanationText ?? pageContext?.explanation),
    hasCurriculumContent: Boolean(pageContext?.contentText?.trim()),
    contentCharCount: pageContext?.contentText?.length ?? 0,
    sectionCount: pageContext?.contentSections?.length ?? Number(providerSpecific.sectionCount ?? 0),
    headingCount: pageContext?.sectionHeadings?.length ?? Number(providerSpecific.headingCount ?? 0),
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
          isLikelySupportedQuestionUrl(tabSnapshot.url) &&
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
                'Could not read this page. Make sure you are on a supported Orthobullets or ROCK question page and try again.',
              diagnostics,
            }),
            'extraction_failure'
          );
        }
        const pageContext = enrichPageContext(response.pageContext);
        const diagnostics = buildExtractionDiagnostics({
          activeTabId: tabSnapshot.tabId,
          activeTabUrl: tabSnapshot.url,
          activeTabStatus: tabSnapshot.status,
          contentScriptResponded: true,
          pageContext,
          failureCode: isReadablePageContext(pageContext) ? undefined : 'page_not_readable',
          sendMessageError,
          fallbackInjectionAttempted,
          injectionError,
        });
        sendResponse({ ok: true, pageContext, diagnostics });
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
          body: JSON.stringify({
            pageContext: message.pageContext,
            emphasis: message.emphasis,
          }),
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
            curriculumStudy: message.curriculumStudy,
            emphasis: message.emphasis,
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
      const fetchDiagnostics = error instanceof CodedError ? error.fetchDiagnostics : undefined;
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
        fetchDiagnostics,
      });
    }
  })();

  return true;
});
