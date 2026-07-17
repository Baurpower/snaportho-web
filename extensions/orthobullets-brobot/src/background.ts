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
  buildCurriculumExplainRequest,
  buildQuestionExplainRequest,
  buildQuestionHintRequest,
  type BroBotTask,
  resolveBroBotEndpoint,
  type BroBotExtensionRequest,
} from './shared/brobot-routing.js';
import {
  BACKGROUND_HANDLER_VERSION,
  EXTENSION_BUILD_ID,
  ROUTING_CONTRACT_VERSION,
} from './shared/build-info.js';
import {
  detectSupportedQuestionProviderFromUrl,
  getConfiguredAppOrigin,
  isLikelySupportedQuestionUrl,
} from './shared/runtime.js';

const STORAGE_KEY = 'snaportho_extension_device_token';
const EXTENSION_TOKEN_HEADER = 'x-snaportho-extension-token';
const ADDON_BASE_URL_HEADER = 'x-snaportho-addon-base-url';
const BACKGROUND_BUILD_ID_MARKER = '2026-07-12-rock-curriculum-routing-v3';

// Server error codes (from explain/route.ts and friends) map 1:1 onto the
// extension's own ExtensionErrorCode for known cases; anything else falls
// through to 'unknown' so the UI always has a defined state to render.
const KNOWN_ERROR_CODES = new Set<ExtensionErrorCode>([
  'quota_exceeded',
  'disabled',
  'invalid_request',
  'invalid_curriculum_request',
  'curriculum_content_missing',
  'curriculum_content_too_large',
  'unsupported_provider',
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

console.info('[snaportho-extension] background_startup', {
  extensionBuildId: EXTENSION_BUILD_ID,
  backgroundBuildIdMarker: BACKGROUND_BUILD_ID_MARKER,
  routingContractVersion: ROUTING_CONTRACT_VERSION,
  backgroundHandlerVersion: BACKGROUND_HANDLER_VERSION,
  loadedManifestVersion: chrome.runtime.getManifest?.().version ?? null,
});

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

function buildFetchDiagnosticsMeta(requestPayload: BroBotExtensionRequest | null, requestBody: string | null) {
  if (!requestPayload) return {};
  const curriculum = requestPayload.task === 'curriculum_explain' ? requestPayload.curriculum : null;
  return {
    requestedTask: requestPayload.task,
    requestProvider: requestPayload.provider,
    requestPageKind: requestPayload.pageContext.pageKind,
    requestPayloadKind: requestPayload.task === 'curriculum_explain' ? 'curriculum' as const : 'question' as const,
    curriculumSectionCount: curriculum?.sections.length,
    curriculumContentCharCount:
      curriculum?.sections.reduce((total, section) => total + section.text.length, 0) ??
      requestPayload.pageContext.contentText?.length,
    requestBodyCharCount: requestBody?.length,
    wasTruncated: Boolean(requestPayload.pageContext.raw?.providerSpecific?.wasTruncated),
    omittedSectionCount: Number(requestPayload.pageContext.raw?.providerSpecific?.omittedSectionCount ?? 0),
  };
}

async function fetchJson(pathname: string, init?: RequestInit, diagnosticsInput?: {
  requestPayload?: BroBotExtensionRequest;
  requestBody?: string;
  messageType?: string;
  onDiagnostics?: (diagnostics: ExtensionFetchDiagnostics) => void;
}) {
  const baseUrl = getConfiguredAppOrigin();
  const attemptedLinkUrl = `${baseUrl}${pathname}`;
  const diagnosticsMeta = buildFetchDiagnosticsMeta(
    diagnosticsInput?.requestPayload ?? null,
    diagnosticsInput?.requestBody ?? null
  );
  const baseDiagnostics = {
    attemptedLinkUrl,
    baseUrl,
    resolvedEndpoint: attemptedLinkUrl,
    extensionBuildId: EXTENSION_BUILD_ID,
    routingContractVersion: ROUTING_CONTRACT_VERSION,
    backgroundHandlerVersion: BACKGROUND_HANDLER_VERSION,
    messageType: diagnosticsInput?.messageType,
    loadedManifestVersion: chrome.runtime.getManifest?.().version ?? null,
    httpStatus: null,
    responseBody: null,
    responseMessage: null,
    fetchFailedBeforeResponse: false,
    ...diagnosticsMeta,
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
    console.warn('[snaportho-extension] request_failed', {
      pathname,
      status: response.status,
      responseBody: safeResponseBodyPreview(rawBody),
    });
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
      serverErrorCode: typeof json?.error === 'string' ? json.error : null,
    });
  }
  diagnosticsInput?.onDiagnostics?.({
    ...baseDiagnostics,
    httpStatus: response.status,
    responseMessage: response.statusText || 'OK',
  });
  return json;
}

function isCurriculumExplainPage(pageContext: OrthobulletsPageContext) {
  const classification = pageContext.classification ?? classifyPage(pageContext);
  return pageContext.mode === 'curriculum_content' || classification.pageKind === 'educational_content';
}

function inferExplainTask(pageContext: OrthobulletsPageContext): Extract<BroBotTask, 'curriculum_explain' | 'question_explain'> {
  return isCurriculumExplainPage(pageContext) ? 'curriculum_explain' : 'question_explain';
}

function buildRequestPayload(task: BroBotTask, pageContext: OrthobulletsPageContext): BroBotExtensionRequest {
  switch (task) {
    case 'curriculum_explain':
      return buildCurriculumExplainRequest(pageContext);
    case 'question_explain':
      return buildQuestionExplainRequest(pageContext);
    case 'question_hint':
      return buildQuestionHintRequest(pageContext);
  }
}

function assertRoutingInvariant(requestPayload: BroBotExtensionRequest, endpoint: string) {
  if (
    requestPayload.provider === 'rock' &&
    requestPayload.pageContext.pageKind === 'curriculum_content' &&
    endpoint.includes('/orthobullets/explain')
  ) {
    throw new Error('Routing invariant violated: ROCK curriculum content cannot use the Orthobullets question explanation endpoint.');
  }
  if (requestPayload.task === 'curriculum_explain' && endpoint !== '/api/brobot/curriculum/explain') {
    throw new Error(`Routing invariant violated for curriculum_explain: ${endpoint}`);
  }
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

chrome.runtime.onMessage.addListener((message: ExtensionMessage | { type: 'ob:question-changed' }, sender: { tab?: { id?: number } }, sendResponse: (response: ExtensionMessageResponse) => void) => {
  if (message && typeof message === 'object' && 'type' in message && message.type === 'ob:question-changed') {
    void chrome.runtime
      .sendMessage({
        ...message,
        tabId: sender.tab?.id ?? null,
      })
      .catch(() => null);
    return false;
  }
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

      if (message.type === 'brobot:request' || message.type === 'ob:explain' || message.type === 'ob:hint') {
        const deviceToken = await getStoredDeviceToken();
        if (!deviceToken) {
          throw new CodedError('Extension is not linked to a SnapOrtho account.', 'not_linked');
        }

        const task: BroBotTask =
          message.type === 'brobot:request'
            ? message.task
            : message.type === 'ob:hint'
              ? 'question_hint'
              : inferExplainTask(message.pageContext);
        const requestPayload = buildRequestPayload(task, message.pageContext);
        const endpoint = resolveBroBotEndpoint(requestPayload);
        assertRoutingInvariant(requestPayload, endpoint);
        const requestBodyObject =
          task === 'question_hint'
            ? {
                ...requestPayload,
                hintLevel: 'hintLevel' in message ? message.hintLevel : undefined,
                selectedAnswerKey: 'selectedAnswerKey' in message ? message.selectedAnswerKey : undefined,
              }
            : {
                ...requestPayload,
                emphasis: 'emphasis' in message ? message.emphasis : undefined,
              };
        const requestBody = JSON.stringify(requestBodyObject);
        let fetchDiagnostics: ExtensionFetchDiagnostics | undefined;

        console.info('[snaportho-extension] background_message', {
          messageType: message.type,
          provider: message.pageContext.provider,
          pageKind: message.pageContext.pageKind,
          requestedTask: task,
          extensionBuildId: EXTENSION_BUILD_ID,
          routingContractVersion: ROUTING_CONTRACT_VERSION,
        });
        console.info('[snaportho-extension] endpoint_resolution', {
          requestedTask: requestPayload.task,
          resolvedEndpoint: `${getConfiguredAppOrigin()}${endpoint}`,
        });
        console.info('[snaportho-extension] fetch', {
          method: 'POST',
          resolvedEndpoint: `${getConfiguredAppOrigin()}${endpoint}`,
          payloadKind: requestPayload.task === 'curriculum_explain' ? 'curriculum' : 'question',
        });
        console.info('[snaportho-extension] explain_request', {
          requestedTask: requestPayload.task,
          resolvedEndpoint: `${getConfiguredAppOrigin()}${endpoint}`,
          requestProvider: requestPayload.provider,
          requestPageKind: message.pageContext.pageKind,
          requestPayloadKind: requestPayload.task === 'curriculum_explain' ? 'curriculum' : 'question',
          curriculumSectionCount: requestPayload.task === 'curriculum_explain' ? requestPayload.curriculum.sections.length : undefined,
          curriculumContentCharCount:
            requestPayload.task === 'curriculum_explain'
              ? requestPayload.curriculum.sections.reduce((total, section) => total + section.text.length, 0)
              : undefined,
          requestBodyCharCount: requestBody.length,
          wasTruncated: Boolean(message.pageContext.raw?.providerSpecific?.wasTruncated),
          omittedSectionCount: Number(message.pageContext.raw?.providerSpecific?.omittedSectionCount ?? 0),
        });

        const result = await fetchJson(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [EXTENSION_TOKEN_HEADER]: deviceToken,
          },
          body: requestBody,
        }, {
          requestPayload,
          requestBody,
          messageType: message.type,
          onDiagnostics: (diagnostics) => {
            fetchDiagnostics = diagnostics;
          },
        });

        if (task === 'question_hint') {
          sendResponse({ ok: true, hint: result, fetchDiagnostics });
        } else {
          sendResponse({ ok: true, explanation: result, fetchDiagnostics });
        }
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

      if (message.type === 'ob:topic-tutor-turn') {
        const deviceToken = await getStoredDeviceToken();
        if (!deviceToken) {
          throw new CodedError('Extension is not linked to a SnapOrtho account.', 'not_linked');
        }

        const topicTurn = await fetchJson('/api/brobot/orthobullets/topic-tutor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [EXTENSION_TOKEN_HEADER]: deviceToken,
          },
          body: JSON.stringify({
            pageContext: message.pageContext,
            action: message.action,
            progress: message.progress,
            history: message.history,
            userMessage: message.userMessage,
          }),
        });

        sendResponse({ ok: true, topicTurn });
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
