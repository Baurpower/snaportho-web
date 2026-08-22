import type {
  ExtensionErrorCode,
  ExtensionMessage,
  ExtensionMessageResponse,
  PageChangeMessage,
  QuestionChangeMessage,
} from './shared/messages.js';
import type {
  ExtensionFetchDiagnostics,
  OrthobulletsExplainResponse,
  OrthobulletsExtractionDiagnostics,
  OrthobulletsPageContext,
  ProviderDetectionStatus,
  QuestionProvider,
} from './shared/types.js';
import { classifyPage, isPageUsable } from './shared/page-classification.js';
import {
  buildCurriculumExplainRequest,
  buildQuestionExplainRequest,
  buildQuestionHintRequest,
  type BroBotCurriculumPayload,
  type BroBotTask,
  resolveBroBotEndpoint,
  type BroBotExtensionRequest,
  validateCurriculumExplainRequest,
} from './shared/brobot-routing.js';
import { BACKGROUND_HANDLER_VERSION, EXTENSION_BUILD_ID, ROUTING_CONTRACT_VERSION } from './shared/build-info.js';
import {
  detectSupportedQuestionProviderFromUrl,
  getConfiguredAppOrigin,
  isLikelySupportedQuestionUrl,
} from './shared/runtime.js';

const STORAGE_KEY = 'snaportho_extension_device_token';
const EXTENSION_TOKEN_HEADER = 'x-snaportho-extension-token';
const ADDON_BASE_URL_HEADER = 'x-snaportho-addon-base-url';
const BACKGROUND_BUILD_ID_MARKER = '2026-07-30-himalaya-live-v4';
const curriculumStreamControllers = new Map<string, AbortController>();

// Server error codes (from explain/route.ts and friends) map 1:1 onto the
// extension's own ExtensionErrorCode for known cases; anything else falls
// through to 'unknown' so the UI always has a defined state to render.
const KNOWN_ERROR_CODES = new Set<ExtensionErrorCode>([
  'quota_exceeded',
  'disabled',
  'invalid_request',
  'invalid_curriculum_request',
  'invalid_request_shape',
  'client_contract_validation_failed',
  'extension_update_required',
  'curriculum_content_missing',
  'curriculum_content_too_large',
  'unsupported_provider',
  'model_unavailable',
  'all_chunks_failed',
  'synthesis_failed',
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

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function uuidFromHash(hash: string) {
  const chars = hash.slice(0, 32).split('');
  chars[12] = '4';
  chars[16] = ['8', '9', 'a', 'b'][Number.parseInt(chars[16] ?? '0', 16) % 4] ?? '8';
  const value = chars.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function ankiSearchKeywords(explanation: OrthobulletsExplainResponse) {
  const stop = new Set([
    'appropriate',
    'because',
    'correct',
    'following',
    'management',
    'patient',
    'patients',
    'physician',
    'prescribed',
    'treatment',
    'without',
    'would',
    'appointment',
    'comprehensive',
    'evaluation',
    'approach',
    'involves',
  ]);
  const source = [explanation.testedConcept, explanation.bottomLine, explanation.whyCorrect].join(' ');
  return [
    ...new Set(
      (source.match(/[A-Za-z][A-Za-z-]{6,}/g) ?? [])
        .map((token) => token.toLowerCase().replace(/^-|-$/g, ''))
        .filter((token) => token.length >= 7 && !stop.has(token)),
    ),
  ]
    .sort((left, right) => right.length - left.length || left.localeCompare(right))
    .slice(0, 24);
}

function ankiQuestionMetadata(pageContext: OrthobulletsPageContext, explanation?: OrthobulletsExplainResponse) {
  if (explanation) {
    return {
      testedConcept: explanation.testedConcept,
      summary: explanation.bottomLine,
      searchKeywords: ankiSearchKeywords(explanation),
      source: 'brobot_explanation' as const,
    };
  }
  const topic =
    pageContext.linkedConcepts[0]?.label ||
    pageContext.breadcrumbs[pageContext.breadcrumbs.length - 1] ||
    pageContext.title ||
    'Orthobullets question';
  const scopedContext: OrthobulletsPageContext = {
    ...pageContext,
    title: topic,
    sectionHeadings: [topic],
    contentSections: [
      {
        heading: topic,
        text: [pageContext.stem ?? '', ...pageContext.answerChoices.map((choice) => choice.text)].join(' '),
      },
    ],
  };
  return {
    testedConcept: topic.slice(0, 300),
    summary: `Question topic: ${topic}`.slice(0, 600),
    searchKeywords: ankiPageSearchKeywords(scopedContext),
    source: 'page_metadata' as const,
  };
}

function ankiPageSearchKeywords(pageContext: OrthobulletsPageContext) {
  const stop = new Set([
    'about',
    'after',
    'also',
    'because',
    'between',
    'cards',
    'clinical',
    'from',
    'have',
    'images',
    'management',
    'most',
    'orthobullets',
    'page',
    'patient',
    'patients',
    'questions',
    'section',
    'should',
    'that',
    'their',
    'these',
    'this',
    'treatment',
    'video',
    'what',
    'when',
    'which',
    'with',
  ]);
  const source = [
    pageContext.title ?? '',
    ...(pageContext.sectionHeadings ?? []),
    ...(pageContext.contentSections ?? []).flatMap((section) => [section.heading, section.text]),
    pageContext.contentText ?? '',
  ].join(' ');
  const counts = new Map<string, number>();
  for (const raw of source.match(/[A-Za-z][A-Za-z-]{3,}/g) ?? []) {
    const token = raw.toLowerCase().replace(/^-|-$/g, '');
    if (token.length < 4 || stop.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts]
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)
    .slice(0, 24)
    .map(([token]) => token);
}

function ankiPageSearchSections(pageContext: OrthobulletsPageContext) {
  const sections = pageContext.contentSections ?? [];
  const structured = sections
    .map((section, index) => {
      const scopedContext: OrthobulletsPageContext = {
        ...pageContext,
        title: section.heading,
        sectionHeadings: [section.heading],
        contentSections: [section],
        contentText: section.text,
      };
      const concepts = ankiPageSearchKeywords(scopedContext).slice(0, 12);
      if (!concepts.length) return null;
      return {
        id: `section-${index + 1}`,
        heading: section.heading.slice(0, 240),
        concepts,
        priority: index < 4 ? 5 : index < 10 ? 4 : 3,
      };
    })
    .filter((section): section is NonNullable<typeof section> => Boolean(section))
    .slice(0, 30);
  if (structured.length) return structured;
  const concepts = ankiPageSearchKeywords(pageContext).slice(0, 12);
  if (!concepts.length) return [];
  return [
    {
      id: 'page-overview',
      heading: (pageContext.title || pageContext.sectionHeadings?.[0] || 'Topic overview').slice(0, 240),
      concepts,
      priority: 5,
    },
  ];
}

let registeredHostTabId: number | null = null;

async function getActiveTabState(preferRegisteredHost = false, preferredHostUrl?: string) {
  const urlMatchedTab = preferRegisteredHost && preferredHostUrl
    ? (await chrome.tabs.query({})).find((candidate: { url?: string }) => candidate.url === preferredHostUrl) ?? null
    : null;
  const registeredTab = !urlMatchedTab && preferRegisteredHost && registeredHostTabId != null
    ? await chrome.tabs.get(registeredHostTabId).catch(() => null)
    : null;
  const [queriedTab] = urlMatchedTab || registeredTab
    ? [urlMatchedTab ?? registeredTab]
    : await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = urlMatchedTab ?? registeredTab ?? queriedTab;
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
  return value.replace(/snaportho_(?:extension|device)_[A-Za-z0-9_=-]+/g, '[redacted-device-token]').slice(0, 800);
}

function buildFetchDiagnosticsMeta(requestPayload: BroBotExtensionRequest | null, requestBody: string | null) {
  if (!requestPayload) return {};
  const curriculum = requestPayload.task === 'curriculum_explain' ? requestPayload.curriculum : null;
  return {
    requestedTask: requestPayload.task,
    requestProvider: requestPayload.provider,
    requestPageKind: requestPayload.pageContext.pageKind,
    requestPayloadKind: requestPayload.task === 'curriculum_explain' ? ('curriculum' as const) : ('question' as const),
    curriculumSectionCount: curriculum?.sections.length,
    curriculumContentCharCount:
      curriculum?.sections.reduce((total, section) => total + section.text.length, 0) ??
      requestPayload.pageContext.contentText?.length,
    requestBodyCharCount: requestBody?.length,
    wasTruncated: Boolean(requestPayload.pageContext.raw?.providerSpecific?.wasTruncated),
    omittedSectionCount: Number(requestPayload.pageContext.raw?.providerSpecific?.omittedSectionCount ?? 0),
  };
}

async function fetchJson(
  pathname: string,
  init?: RequestInit,
  diagnosticsInput?: {
    requestPayload?: BroBotExtensionRequest;
    requestBody?: string;
    messageType?: string;
    onDiagnostics?: (diagnostics: ExtensionFetchDiagnostics) => void;
  },
) {
  const baseUrl = getConfiguredAppOrigin();
  const attemptedLinkUrl = `${baseUrl}${pathname}`;
  const diagnosticsMeta = buildFetchDiagnosticsMeta(
    diagnosticsInput?.requestPayload ?? null,
    diagnosticsInput?.requestBody ?? null,
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
      },
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
        : (json?.message ?? json?.error ?? `Request failed (${response.status})`);
    throw new CodedError(message, code, {
      ...baseDiagnostics,
      httpStatus: response.status,
      responseBody: safeResponseBodyPreview(rawBody),
      responseMessage: json?.message ?? json?.error ?? response.statusText,
      serverErrorCode: typeof json?.error === 'string' ? json.error : null,
      requestId: typeof json?.requestId === 'string' ? json.requestId : null,
      failureStage: typeof json?.stage === 'string' ? json.stage : null,
    });
  }
  diagnosticsInput?.onDiagnostics?.({
    ...baseDiagnostics,
    httpStatus: response.status,
    responseMessage: response.statusText || 'OK',
  });
  return json;
}

async function fetchCurriculumStream(
  pathname: string,
  init: RequestInit,
  streamRequestId: string,
): Promise<unknown> {
  const attemptedLinkUrl = `${getConfiguredAppOrigin()}${pathname}`;
  const abortController = new AbortController();
  curriculumStreamControllers.set(streamRequestId, abortController);
  const timeoutId = setTimeout(() => abortController.abort(), 5 * 60_000);
  let response: Response;
  try {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'text/event-stream');
    response = await fetch(attemptedLinkUrl, {
      ...init,
      headers,
      signal: abortController.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    curriculumStreamControllers.delete(streamRequestId);
    throw new CodedError(
      abortController.signal.aborted
        ? 'BroBot took too long to finish this page. Please retry.'
        : 'Could not reach SnapOrtho. Check that the dev server is running, then retry.',
      'network_failure',
    );
  }

  if (!response.ok || !response.body) {
    clearTimeout(timeoutId);
    curriculumStreamControllers.delete(streamRequestId);
    const rawBody = await response.text().catch(() => '');
    const json = rawBody ? await Promise.resolve().then(() => JSON.parse(rawBody)).catch(() => null) : null;
    const code: ExtensionErrorCode = KNOWN_ERROR_CODES.has(json?.error) ? json.error : 'unknown';
    throw new CodedError(json?.message ?? json?.error ?? `Request failed (${response.status})`, code);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('text/event-stream')) {
    clearTimeout(timeoutId);
    curriculumStreamControllers.delete(streamRequestId);
    const result = await response.json().catch(() => null);
    if (result && typeof result === 'object') return result;
    throw new CodedError('BroBot returned an unreadable curriculum response. Please retry.', 'parse_failure');
  }

  const publish = (event: string, data: unknown) => {
    void chrome.runtime
      .sendMessage({ type: 'ob:curriculum-stream', streamRequestId, event, data })
      .catch(() => undefined);
  };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed: unknown = null;

  const consume = (block: string) => {
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (!dataLines.length) return;
    const dataText = dataLines.join('\n');
    const data = Promise.resolve()
      .then(() => JSON.parse(dataText))
      .catch(() => dataText);
    void data.then((parsed) => publish(event, parsed));
    if (event === 'complete') completed = JSON.parse(dataText);
    if (event === 'error') {
      const parsed = JSON.parse(dataText) as { message?: string; error?: ExtensionErrorCode };
      throw new CodedError(parsed.message ?? 'BroBot could not generate this study guide.', parsed.error ?? 'unknown');
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        consume(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new CodedError('BroBot took too long to finish this page. Please retry.', 'network_failure');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    curriculumStreamControllers.delete(streamRequestId);
  }
  if (!completed) throw new CodedError('BroBot stream ended before the study guide was complete.', 'api_failure');
  return completed;
}

function isCurriculumExplainPage(pageContext: OrthobulletsPageContext) {
  const classification = pageContext.classification ?? classifyPage(pageContext);
  return pageContext.mode === 'curriculum_content' || classification.pageKind === 'educational_content';
}

function inferExplainTask(
  pageContext: OrthobulletsPageContext,
): Extract<BroBotTask, 'curriculum_explain' | 'question_explain'> {
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
    throw new Error(
      'Routing invariant violated: ROCK curriculum content cannot use the Orthobullets question explanation endpoint.',
    );
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

function extractionFailureCodeFor(
  pageContext: OrthobulletsPageContext,
): OrthobulletsExtractionDiagnostics['failureCode'] {
  if (pageContext.provider === 'himalaya' && pageContext.pageKind === 'results-overview') {
    return 'waiting_for_question_selection';
  }
  if (isReadablePageContext(pageContext)) return undefined;
  if (pageContext.provider === 'himalaya') return 'question_content_not_found';
  return 'page_not_readable';
}

async function sendExtractionMessage(
  tabId: number,
  questionAttemptId?: number,
): Promise<{
  response: {
    ok?: boolean;
    pageContext?: OrthobulletsPageContext;
    error?: string;
    provider?: ProviderDetectionStatus;
    unsupported?: boolean;
  } | null;
  sendMessageError: string | null;
}> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'ob:extract-page-context', questionAttemptId }, (response: unknown) => {
      const sendMessageError = chrome.runtime.lastError?.message ?? null;
      resolve({
        response:
          (response as {
            ok?: boolean;
            pageContext?: OrthobulletsPageContext;
            error?: string;
            provider?: ProviderDetectionStatus;
            unsupported?: boolean;
          } | null) ?? null,
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

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage | QuestionChangeMessage | PageChangeMessage,
    sender: { tab?: { id?: number } },
    sendResponse: (response: ExtensionMessageResponse) => void,
  ) => {
    if (
      message &&
      typeof message === 'object' &&
      'type' in message &&
      (message.type === 'ob:question-changed' || message.type === 'ob:page-changed')
    ) {
      void chrome.runtime
        .sendMessage({
          ...message,
          tabId: sender.tab?.id ?? null,
        })
        .catch(() => null);
      return false;
    }
    if (message.type === 'ob:register-host-page') {
      if (typeof sender.tab?.id === 'number') registeredHostTabId = sender.tab.id;
      sendResponse({ ok: true, registeredHostTabId: registeredHostTabId ?? null });
      return false;
    }
    void (async () => {
      try {
        if (message.type === 'ob:get-active-page-state') {
          sendResponse({
            ok: true,
            activePage: await getActiveTabState(message.preferRegisteredHost === true, message.preferredHostUrl),
          });
          return;
        }

        if (message.type === 'ob:get-build-info') {
          sendResponse({
            ok: true,
            buildInfo: {
              extensionBuildId: EXTENSION_BUILD_ID,
              routingContractVersion: ROUTING_CONTRACT_VERSION,
              backgroundHandlerVersion: BACKGROUND_HANDLER_VERSION,
            },
          });
          return;
        }

        if (message.type === 'ob:get-auth-state') {
          const deviceToken = await getStoredDeviceToken();
          sendResponse({
            ok: true,
            auth: deviceToken ? { status: 'linked', deviceToken } : { status: 'unlinked' },
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

        if (message.type === 'ob:send-to-anki') {
          const deviceToken = await getStoredDeviceToken();
          if (!deviceToken) throw new CodedError('Extension is not linked to a SnapOrtho account.', 'not_linked');
          const nativeQuestionId = message.pageContext.questionId?.trim();
          if (!nativeQuestionId)
            throw new CodedError('This question has no stable Orthobullets ID.', 'invalid_request');
          const metadata = ankiQuestionMetadata(message.pageContext, message.explanation);
          const fingerprint = await sha256(
            [nativeQuestionId, message.pageContext.stem ?? '', metadata.testedConcept].join('|'),
          );
          const idempotencyHash = await sha256(`${fingerprint}|${Math.floor(Date.now() / 300_000)}`);
          const result = await fetchJson('/api/brobot/extension/anki-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [EXTENSION_TOKEN_HEADER]: deviceToken,
            },
            body: JSON.stringify({
              contractVersion: 'snaportho-extension-anki-search.v1',
              clientRequestId: crypto.randomUUID(),
              idempotencyKey: uuidFromHash(idempotencyHash),
              source: {
                provider: 'orthobullets',
                queryKind: 'question',
                nativeQuestionId,
                questionFingerprintHash: fingerprint,
              },
              concept: {
                testedConcept: metadata.testedConcept,
                summary: metadata.summary,
                searchKeywords: metadata.searchKeywords,
                pageSections: [],
                source: metadata.source,
              },
              requestedAction: 'open_browse_and_return_results',
              extensionVersion: chrome.runtime.getManifest?.().version ?? 'unknown',
              createdAt: new Date().toISOString(),
            }),
          });
          sendResponse({ ok: true, ankiSearch: result });
          return;
        }

        if (message.type === 'ob:send-page-to-anki') {
          const deviceToken = await getStoredDeviceToken();
          if (!deviceToken) throw new CodedError('Extension is not linked to a SnapOrtho account.', 'not_linked');
          const title = message.pageContext.title?.trim() || 'Orthobullets topic';
          const pageIdentity =
            message.pageContext.topicId?.trim() ||
            new URL(message.pageContext.sourceUrl || message.pageContext.pageUrl).pathname.slice(0, 200);
          if (!pageIdentity) throw new CodedError('This topic page has no stable identity.', 'invalid_request');
          const pageSections = ankiPageSearchSections(message.pageContext);
          if (!pageSections.length)
            throw new CodedError('No searchable page sections were extracted.', 'extraction_failure');
          const summary = `${title}. Sections: ${pageSections.map((section) => section.heading).join('; ')}`.slice(
            0,
            600,
          );
          const fingerprint = await sha256(
            [pageIdentity, title, message.pageContext.contentMarkdown ?? message.pageContext.contentText ?? ''].join(
              '|',
            ),
          );
          const idempotencyHash = await sha256(`${fingerprint}|${Math.floor(Date.now() / 300_000)}`);
          const result = await fetchJson('/api/brobot/extension/anki-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [EXTENSION_TOKEN_HEADER]: deviceToken,
            },
            body: JSON.stringify({
              contractVersion: 'snaportho-extension-anki-search.v1',
              clientRequestId: crypto.randomUUID(),
              idempotencyKey: uuidFromHash(idempotencyHash),
              source: {
                provider: 'orthobullets',
                queryKind: 'topic_page',
                nativeQuestionId: pageIdentity,
                questionFingerprintHash: fingerprint,
              },
              concept: {
                testedConcept: title,
                summary,
                searchKeywords: ankiPageSearchKeywords(message.pageContext),
                pageSections,
                source: 'page_metadata',
              },
              requestedAction: 'open_browse_and_return_results',
              extensionVersion: chrome.runtime.getManifest?.().version ?? 'unknown',
              createdAt: new Date().toISOString(),
            }),
          });
          sendResponse({ ok: true, ankiSearch: result });
          return;
        }

        if (message.type === 'ob:send-test-to-anki') {
          const deviceToken = await getStoredDeviceToken();
          if (!deviceToken) throw new CodedError('Extension is not linked to a SnapOrtho account.', 'not_linked');
          const review = message.pageContext.testReview;
          if (
            message.pageContext.provider !== 'orthobullets' ||
            message.pageContext.mode !== 'test_review' ||
            !review
          ) {
            throw new CodedError('This is not an Orthobullets test-results page.', 'invalid_request');
          }
          const missedRows = review.rows.filter((row) => row.isCorrect === false);
          if (!missedRows.length)
            throw new CodedError('This test has no missed questions to search.', 'invalid_request');
          const grouped = new Map<string, typeof missedRows>();
          for (const row of missedRows) {
            const key = row.topic?.trim() || row.specialty?.trim() || row.questionId;
            grouped.set(key, [...(grouped.get(key) ?? []), row]);
          }
          const enrichedById = new Map(
            (message.enrichedQuestions ?? []).map((question) => [question.questionId, question]),
          );
          const pageSections = [...grouped.entries()]
            .map(([heading, rows], index) => ({
              id: `missed-concept-${index + 1}`,
              heading: heading.slice(0, 240),
              concepts: [
                ...new Set([
                  heading,
                  ...rows.map((row) => row.specialty).filter((value): value is string => Boolean(value)),
                  ...rows.map((row) => row.questionId),
                  ...rows.flatMap((row) => {
                    const enriched = enrichedById.get(row.questionId);
                    return enriched ? [enriched.testedConcept, ...enriched.searchKeywords] : [];
                  }),
                ]),
              ].slice(0, 12),
              priority: Math.max(1, Math.min(5, rows.length + 2)),
            }))
            .slice(0, 30);
          const nativeTestId =
            review.testId || new URL(message.pageContext.pageUrl).searchParams.get('test') || 'orthobullets-test';
          const fingerprint = await sha256(
            JSON.stringify({
              nativeTestId,
              misses: missedRows.map((row) => [row.questionId, row.topic, row.selectedAnswerKey, row.correctAnswerKey]),
            }),
          );
          const idempotencyHash = await sha256(`${fingerprint}|${Math.floor(Date.now() / 300_000)}`);
          const result = await fetchJson('/api/brobot/extension/anki-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [EXTENSION_TOKEN_HEADER]: deviceToken,
            },
            body: JSON.stringify({
              contractVersion: 'snaportho-extension-anki-search.v1',
              clientRequestId: crypto.randomUUID(),
              idempotencyKey: uuidFromHash(idempotencyHash),
              source: {
                provider: 'orthobullets',
                queryKind: 'topic_page',
                nativeQuestionId: `test:${nativeTestId}`,
                questionFingerprintHash: fingerprint,
              },
              concept: {
                testedConcept: (message.enrichedQuestions?.length
                  ? message.enrichedQuestions.map((question) => question.testedConcept).join('; ')
                  : `Missed concepts from Orthobullets test ${nativeTestId}`
                ).slice(0, 300),
                summary: (message.enrichedQuestions?.length
                  ? message.enrichedQuestions.map((question) => question.summary).join(' ')
                  : `${missedRows.length} missed questions across ${pageSections.length} concept groups: ${pageSections.map((section) => section.heading).join('; ')}`
                ).slice(0, 600),
                searchKeywords: [...new Set(pageSections.flatMap((section) => section.concepts))].slice(0, 24),
                pageSections,
                source: 'page_metadata',
              },
              requestedAction: 'open_browse_and_return_results',
              extensionVersion: chrome.runtime.getManifest?.().version ?? 'unknown',
              createdAt: new Date().toISOString(),
            }),
          });
          sendResponse({ ok: true, ankiSearch: result });
          return;
        }

        if (message.type === 'ob:get-anki-search-status') {
          const deviceToken = await getStoredDeviceToken();
          if (!deviceToken) throw new CodedError('Extension is not linked to a SnapOrtho account.', 'not_linked');
          const result = await fetchJson(
            `/api/brobot/extension/anki-search/${encodeURIComponent(message.searchRequestId)}`,
            {
              method: 'GET',
              headers: { [EXTENSION_TOKEN_HEADER]: deviceToken },
            },
          );
          sendResponse({ ok: true, ankiSearch: result });
          return;
        }

        if (message.type === 'ob:extract-page-context') {
          const tabSnapshot = await getTabSnapshot(message.tabId);
          const initialAttempt = await sendExtractionMessage(message.tabId, message.questionAttemptId);
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
              const retryAttempt = await sendExtractionMessage(message.tabId, message.questionAttemptId);
              response = retryAttempt.response;
              sendMessageError = retryAttempt.sendMessageError;
            }
          }

          if (!response?.ok || !response.pageContext) {
            const contentScriptResponded = Boolean(response);
            const failureCode: OrthobulletsExtractionDiagnostics['failureCode'] = !contentScriptResponded
              ? 'content_script_no_response'
              : response?.provider === 'himalaya'
                ? 'question_content_not_found'
                : 'unsupported_page_type';
            const diagnostics = buildExtractionDiagnostics({
              activeTabId: tabSnapshot.tabId,
              activeTabUrl: tabSnapshot.url,
              activeTabStatus: tabSnapshot.status,
              contentScriptResponded,
              failureCode,
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
              'extraction_failure',
            );
          }
          const pageContext = enrichPageContext(response.pageContext);
          const diagnostics = buildExtractionDiagnostics({
            activeTabId: tabSnapshot.tabId,
            activeTabUrl: tabSnapshot.url,
            activeTabStatus: tabSnapshot.status,
            contentScriptResponded: true,
            pageContext,
            failureCode: extractionFailureCodeFor(pageContext),
            sendMessageError,
            fallbackInjectionAttempted,
            injectionError,
          });
          sendResponse({ ok: true, pageContext, diagnostics });
          return;
        }

        if (message.type === 'ob:cancel-curriculum-stream') {
          curriculumStreamControllers.get(message.streamRequestId)?.abort();
          curriculumStreamControllers.delete(message.streamRequestId);
          sendResponse({ ok: true, cleared: true });
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
                  selectedAnswerKey:
                    'selectedAnswerKey' in message && message.selectedAnswerKey ? message.selectedAnswerKey : undefined,
                  priorHints: 'priorHints' in message ? message.priorHints : undefined,
                }
              : {
                  ...requestPayload,
                  emphasis: 'emphasis' in message ? message.emphasis : undefined,
                };
          if (requestPayload.task === 'curriculum_explain') {
            const contract = validateCurriculumExplainRequest(
              requestBodyObject as BroBotCurriculumPayload & {
                emphasis?: unknown;
              },
            );
            if (!contract.success) {
              console.warn('[snaportho-extension] client_contract_validation_failed', {
                contractVersion: requestPayload.contractVersion,
                issues: contract.issues,
                sectionCount: requestPayload.curriculum.sections.length,
                contentCharacters: requestPayload.curriculum.sections.reduce(
                  (sum, section) => sum + section.text.length,
                  0,
                ),
              });
              throw new CodedError(
                'BroBot could not prepare this page because the extension and server formats do not match.',
                'client_contract_validation_failed',
                {
                  attemptedLinkUrl: `${getConfiguredAppOrigin()}${endpoint}`,
                  baseUrl: getConfiguredAppOrigin(),
                  httpStatus: null,
                  responseBody: null,
                  responseMessage: contract.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' | '),
                  fetchFailedBeforeResponse: true,
                  requestedTask: requestPayload.task,
                  resolvedEndpoint: `${getConfiguredAppOrigin()}${endpoint}`,
                  requestProvider: requestPayload.provider,
                  requestPageKind: message.pageContext.pageKind,
                  requestPayloadKind: 'curriculum',
                  curriculumSectionCount: requestPayload.curriculum.sections.length,
                  curriculumContentCharCount: requestPayload.curriculum.sections.reduce(
                    (sum, section) => sum + section.text.length,
                    0,
                  ),
                  requestBodyCharCount: JSON.stringify(requestBodyObject).length,
                },
              );
            }
          }
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
            curriculumSectionCount:
              requestPayload.task === 'curriculum_explain' ? requestPayload.curriculum.sections.length : undefined,
            curriculumContentCharCount:
              requestPayload.task === 'curriculum_explain'
                ? requestPayload.curriculum.sections.reduce((total, section) => total + section.text.length, 0)
                : undefined,
            requestBodyCharCount: requestBody.length,
            wasTruncated: Boolean(message.pageContext.raw?.providerSpecific?.wasTruncated),
            omittedSectionCount: Number(message.pageContext.raw?.providerSpecific?.omittedSectionCount ?? 0),
          });

          const requestInit = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [EXTENSION_TOKEN_HEADER]: deviceToken,
            },
            body: requestBody,
          } satisfies RequestInit;
          const result =
            task === 'curriculum_explain' && message.type === 'brobot:request' && message.streamRequestId
              ? await fetchCurriculumStream(endpoint, requestInit, message.streamRequestId)
              : await fetchJson(endpoint, requestInit, {
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
              answerState: message.answerState,
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

        sendResponse({
          ok: false,
          error: 'Unsupported message.',
          code: 'unknown',
        });
      } catch (error) {
        const code = error instanceof CodedError ? error.code : 'unknown';
        const fetchDiagnostics = error instanceof CodedError ? error.fetchDiagnostics : undefined;
        let diagnostics: OrthobulletsExtractionDiagnostics | undefined;
        let message = error instanceof Error ? error.message : 'Unknown extension error.';
        if (code === 'extraction_failure' && typeof message === 'string') {
          try {
            const parsed = JSON.parse(message) as {
              message?: string;
              diagnostics?: OrthobulletsExtractionDiagnostics;
            };
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
  },
);
