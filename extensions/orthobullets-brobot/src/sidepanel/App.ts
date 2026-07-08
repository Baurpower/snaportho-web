import type {
  ActivePageState,
  AuthState,
  ExtensionErrorCode,
  ExtensionMessage,
  ExtensionMessageResponse,
} from '../shared/messages.js';
import type {
  BrobotExplainResult,
  CurriculumExplainEmphasis,
  CurriculumStudyResponse,
  ExtensionFetchDiagnostics,
  OrthobulletsChatResponse,
  OrthobulletsChatTurn,
  OrthobulletsExplainResponse,
  OrthobulletsExtractionDiagnostics,
  OrthobulletsHintResponse,
  OrthobulletsPageContext,
  OrthobulletsTopicAction,
  OrthobulletsTopicProgress,
  OrthobulletsTopicTutorTurn,
} from '../shared/types.js';
import { createEmptyTopicProgress, isCurriculumStudyResponse } from '../shared/types.js';
import { isClinicallyImportantWarning, resolveCurriculumChatChips } from '../shared/curriculum-chips.js';
import { resolveTopicTutorChips } from '../shared/topic-tutor-chips.js';
import {
  classifyPage,
  hasReviewData,
  isExplainEligible,
  isHintEligible,
  isPageUsable,
  isUnansweredQuestion,
  preferredBrobotMode,
} from '../shared/page-classification.js';
import type { PageClassification } from '../shared/types.js';
import { renderCurriculumChatChips, renderCurriculumStudyPanel } from './explain-study-panel.js';
import { renderTopicTutorPanel } from './topic-tutor-panel.js';

const BROBOT_ICON_URL = chrome.runtime.getURL('icons/brobot-32.png');
const DEFAULT_FOLLOW_UP_PROMPTS = ['Why not the trap answer?', 'Make this simpler', 'Give me an Anki-style card'];
const ERROR_COPY: Record<ExtensionErrorCode, { title: string; canRetry: boolean }> = {
  unsupported_page: { title: 'This page is not supported.', canRetry: false },
  not_linked: { title: 'Extension is not linked to a SnapOrtho account.', canRetry: false },
  quota_exceeded: { title: 'Daily BroBot limit reached.', canRetry: false },
  disabled: { title: 'BroBot Orthobullets explanations are currently unavailable.', canRetry: false },
  invalid_request: { title: 'This page context could not be processed.', canRetry: true },
  api_failure: { title: 'BroBot could not generate an explanation.', canRetry: true },
  parse_failure: { title: "BroBot's response could not be parsed.", canRetry: true },
  extraction_failure: { title: 'Could not read this page.', canRetry: true },
  network_failure: { title: 'Could not reach SnapOrtho.', canRetry: true },
  unknown: { title: 'Something went wrong.', canRetry: true },
};

type OperationState = 'idle' | 'extracting' | 'hinting' | 'explaining' | 'chatting';
type UsageState =
  | OrthobulletsExplainResponse['usage']
  | OrthobulletsChatResponse['usage']
  | OrthobulletsHintResponse['usage']
  | null;

async function sendMessage(message: ExtensionMessage): Promise<ExtensionMessageResponse> {
  return chrome.runtime.sendMessage(message);
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    className?: string;
    text?: string;
    html?: string;
  } = {}
) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text != null) element.textContent = options.text;
  if (options.html != null) element.innerHTML = options.html;
  return element;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderTextBlock(value: string, emphasis = false) {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) return '';

  return paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0;line-height:1.55;${emphasis ? 'font-weight:600;' : ''}">${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`
    )
    .join('');
}

function renderStringList(items: string[]) {
  if (!items.length) return '';
  return `<ul style="margin:0;padding-left:18px;display:grid;gap:6px;">${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')}</ul>`;
}

function getPageClassification(pageContext: OrthobulletsPageContext | null): PageClassification | null {
  if (!pageContext) return null;
  return pageContext.classification ?? classifyPage(pageContext);
}

function extractionFailureMessage(classification: PageClassification | null) {
  if (!classification) {
    return 'Could not extract enough visible page content yet.';
  }
  if (classification.pageKind === 'unreadable' && classification.detected.hasStem && classification.detected.answerChoiceCount < 2) {
    return 'Could not detect a question. BroBot needs a visible stem and at least two answer choices for Question Tutor mode.';
  }
  if (classification.pageKind === 'unreadable' && classification.detected.readableTextLength > 0) {
    return 'Could not extract enough page text for Explain mode yet.';
  }
  if (classification.detected.referencesCount >= 3) {
    return 'This page is mostly references; BroBot can still summarize the key cited themes once enough text is visible.';
  }
  return classification.reason;
}

function isLikelyCurrentTestUrl(url: string | null | undefined) {
  return Boolean(url && /orthobullets\.com\/currenttest/i.test(url));
}

function providerLabel(provider: string | null | undefined) {
  if (provider === 'rock') return 'ROCK';
  if (provider === 'orthobullets') return 'Orthobullets';
  return 'supported';
}

function getBoardTrap(explanation: OrthobulletsExplainResponse) {
  if (explanation.boardTrap) return explanation.boardTrap;
  const classicTrap = explanation.whyWrong.find((item) => item.isClassicTrap);
  if (!classicTrap) return null;
  return `${classicTrap.choiceKey ?? 'Tempting choice'} is the trap because ${classicTrap.reason}`;
}

function getUsageLabel(usage: UsageState) {
  if (!usage) return null;
  if (usage.unlimited) return 'Unlimited';
  if (usage.remainingToday == null || usage.dailyCap == null) return null;
  return `${usage.remainingToday}/${usage.dailyCap} left today`;
}

function renderCard(title: string, contentHtml: string, tone: 'neutral' | 'accent' | 'warning' = 'neutral') {
  const theme =
    tone === 'accent'
      ? 'background:#f0fdfa;border:1px solid #99f6e4;'
      : tone === 'warning'
        ? 'background:#fffbeb;border:1px solid #fde68a;'
        : 'background:white;border:1px solid #ded7c8;';
  return `<article style="padding:14px;border-radius:16px;${theme}display:grid;gap:8px;">
    <h3 style="margin:0;font-size:15px;line-height:1.3;">${escapeHtml(title)}</h3>
    ${contentHtml}
  </article>`;
}

function renderExplanation(explanation: OrthobulletsExplainResponse, mode: 'question_tutor' | 'explain_page' = 'question_tutor') {
  const cards: string[] = [];
  const summaryTitle = mode === 'explain_page' ? 'Quick summary' : 'Bottom Line';
  const conceptTitle = mode === 'explain_page' ? 'High-yield concepts' : 'Tested Concept';
  const teachingTitle = mode === 'explain_page' ? 'Teaching explanation' : 'Why Correct';
  const trapTitle = mode === 'explain_page' ? 'What students usually miss' : 'Board Trap';
  const pearlTitle = mode === 'explain_page' ? 'Clinical pearl' : 'Pearl / Takeaway';
  const studyTitle = mode === 'explain_page' ? 'What to review next' : 'Study Next';

  cards.push(renderCard(summaryTitle, renderTextBlock(explanation.bottomLine, true), 'accent'));

  if (explanation.testedConcept) {
    cards.push(renderCard(conceptTitle, renderTextBlock(explanation.testedConcept)));
  }

  if (explanation.whyCorrect) {
    cards.push(renderCard(teachingTitle, renderTextBlock(explanation.whyCorrect)));
  }

  if (mode === 'question_tutor' && explanation.whyWrong.length) {
    cards.push(
      renderCard(
        'Why Wrong',
        `<ul style="margin:0;padding-left:18px;display:grid;gap:8px;">${explanation.whyWrong
          .map((item) => {
            const label = item.choiceKey ? `${escapeHtml(item.choiceKey)}:` : 'Choice:';
            const trapTag = item.isClassicTrap
              ? ' <span style="font-size:11px;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:0.06em;">Trap</span>'
              : '';
            return `<li><strong>${label}</strong> ${escapeHtml(item.reason)}${trapTag}</li>`;
          })
          .join('')}</ul>`
      )
    );
  }

  const boardTrap = getBoardTrap(explanation);
  if (boardTrap) {
    cards.push(renderCard(trapTitle, renderTextBlock(boardTrap), 'warning'));
  }

  if (explanation.boardPearl) {
    cards.push(renderCard(pearlTitle, renderTextBlock(explanation.boardPearl, true), 'warning'));
  }

  if (explanation.studyNext.length) {
    cards.push(renderCard(studyTitle, renderStringList(explanation.studyNext)));
  }

  return `<section style="display:grid;gap:12px;">${cards.join('')}</section>`;
}

function renderChatTranscript(history: OrthobulletsChatTurn[], isLoading: boolean) {
  const items = history
    .map((turn) => {
      const bubbleTone =
        turn.role === 'assistant'
          ? 'background:#f7f5ef;border:1px solid #ded7c8;color:#18202b;'
          : 'background:#0f766e;border:1px solid #0f766e;color:white;';
      const label = turn.role === 'assistant' ? 'BroBot' : 'You';
      return `<div style="display:grid;gap:6px;justify-items:${turn.role === 'assistant' ? 'start' : 'end'};">
        <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#5c6574;font-weight:700;">${label}</p>
        <div style="max-width:100%;padding:10px 12px;border-radius:14px;line-height:1.55;${bubbleTone}">${renderTextBlock(turn.content)}</div>
      </div>`;
    })
    .join('');

  const loadingBubble = isLoading
    ? `<div style="display:grid;gap:6px;">
        <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#5c6574;font-weight:700;">BroBot</p>
        <div style="max-width:100%;padding:10px 12px;border-radius:14px;background:#f7f5ef;border:1px solid #ded7c8;color:#5c6574;">Thinking through your follow-up...</div>
      </div>`
    : '';

  return `<div style="display:grid;gap:12px;max-height:280px;overflow:auto;padding-right:4px;">${items}${loadingBubble}</div>`;
}

function renderHintCards(hints: OrthobulletsHintResponse[]) {
  return `<section style="display:grid;gap:12px;">${hints
    .map((hint) =>
      renderCard(
        hint.title,
        `${renderTextBlock(hint.hint)}${
          hint.warnings.length
            ? `<p style="margin:0;font-size:12px;color:#7c2d12;">Notes: ${escapeHtml(hint.warnings.join(' | '))}</p>`
            : ''
        }`,
        hint.hintLevel === 3 ? 'warning' : 'neutral'
      )
    )
    .join('')}</section>`;
}

function renderDebugSummary(input: {
  activePage: ActivePageState | null;
  diagnostics: OrthobulletsExtractionDiagnostics | null;
  fetchDiagnostics: ExtensionFetchDiagnostics | null;
  pageContext: OrthobulletsPageContext | null;
  errorCode: ExtensionErrorCode | null;
}) {
  const summary = {
    activeTabUrl: input.diagnostics?.activeTabUrl ?? input.activePage?.url ?? null,
    activeTabId: input.diagnostics?.activeTabId ?? input.activePage?.tabId ?? null,
    activeTabStatus: input.diagnostics?.activeTabStatus ?? null,
    contentScriptResponded: input.diagnostics?.contentScriptResponded ?? null,
    provider: input.pageContext?.provider ?? input.diagnostics?.provider ?? input.activePage?.provider ?? null,
    detectionStatus: input.activePage?.detectionStatus ?? null,
    mode: input.pageContext?.mode ?? null,
    readable: input.diagnostics?.readable ?? null,
    failureCode: input.diagnostics?.failureCode ?? null,
    sendMessageError: input.diagnostics?.sendMessageError ?? null,
    fetchDiagnostics: input.fetchDiagnostics,
    fallbackInjectionAttempted: input.diagnostics?.fallbackInjectionAttempted ?? false,
    injectionError: input.diagnostics?.injectionError ?? null,
    extractorVersion: input.pageContext?.debug?.extractorVersion ?? null,
    pageKind: input.pageContext?.pageKind ?? null,
    sourceUrl: input.pageContext?.sourceUrl ?? input.pageContext?.pageUrl ?? null,
    questionId: input.pageContext?.questionId ?? null,
    topicId: input.pageContext?.topicId ?? null,
    breadcrumbCount: input.diagnostics?.breadcrumbCount ?? input.pageContext?.breadcrumbs.length ?? 0,
    breadcrumbs: input.pageContext?.breadcrumbs ?? [],
    hasStem: input.diagnostics?.hasStem ?? Boolean(input.pageContext?.stem),
    hasSelectedAnswer: input.diagnostics?.hasSelectedAnswer ?? Boolean(input.pageContext?.selectedAnswerKey ?? input.pageContext?.selectedAnswer),
    hasCorrectAnswer: input.diagnostics?.hasCorrectAnswer ?? Boolean(input.pageContext?.correctAnswerKey ?? input.pageContext?.correctAnswer),
    hasExplanation: input.diagnostics?.hasExplanation ?? Boolean(input.pageContext?.explanationText ?? input.pageContext?.explanation),
    hasCurriculumContent: input.diagnostics?.hasCurriculumContent ?? Boolean(input.pageContext?.contentText),
    contentCharCount: input.diagnostics?.contentCharCount ?? input.pageContext?.contentText?.length ?? 0,
    sectionCount: input.diagnostics?.sectionCount ?? input.pageContext?.contentSections?.length ?? 0,
    headingCount: input.diagnostics?.headingCount ?? input.pageContext?.sectionHeadings?.length ?? 0,
    stemPreview: input.pageContext?.stem?.slice(0, 80) ?? null,
    hasQuestionId: input.diagnostics?.hasQuestionId ?? Boolean(input.pageContext?.questionId),
    answerChoiceCount: input.diagnostics?.answerChoiceCount ?? input.pageContext?.answerChoices.length ?? 0,
    selectedAnswerKey: input.pageContext?.selectedAnswerKey ?? null,
    correctAnswerKey: input.pageContext?.correctAnswerKey ?? null,
    percentDistributionRows: input.diagnostics?.percentDistributionCount ?? input.pageContext?.percentDistribution.length ?? 0,
    imageCount: input.diagnostics?.imageCount ?? input.pageContext?.images.length ?? 0,
    linkedConceptCount: input.diagnostics?.linkedConceptCount ?? input.pageContext?.linkedConcepts.length ?? 0,
    warnings: input.diagnostics?.warnings ?? input.pageContext?.extractionWarnings ?? [],
    matchedSelectors: input.pageContext?.debug?.matchedSelectors ?? {},
    classification: input.diagnostics?.classification ?? input.pageContext?.classification ?? null,
    lastErrorCode: input.errorCode,
  };

  return `<details style="padding:12px;border-radius:14px;background:white;border:1px solid #ded7c8;">
    <summary style="cursor:pointer;font-weight:700;color:#5c6574;">Developer debug</summary>
    <p style="margin:10px 0 8px;color:#5c6574;font-size:12px;">Extraction and messaging diagnostics for QA. Hidden by default for normal use.</p>
    <pre style="white-space:pre-wrap;margin:0;font-size:12px;line-height:1.45;">${escapeHtml(JSON.stringify(summary, null, 2))}</pre>
  </details>`;
}

function getStatusCopy(input: {
  loading: boolean;
  activePage: ActivePageState | null;
  auth: AuthState | null;
  operation: OperationState;
  pageContext: OrthobulletsPageContext | null;
  explanation: BrobotExplainResult | null;
  hints: OrthobulletsHintResponse[];
  error: { message: string; code: ExtensionErrorCode } | null;
}) {
  if (input.loading) {
    return { label: 'Loading', detail: 'Checking your extension state and active page.' };
  }
  if (!input.activePage?.supported) {
    return { label: 'Open a supported question page', detail: 'Switch to an Orthobullets or ROCK question tab, then reopen this panel.' };
  }
  if (input.auth?.status !== 'linked') {
    return { label: 'Not linked', detail: 'Link the extension to your SnapOrtho account to use BroBot.' };
  }
  if (input.operation === 'extracting') {
    return { label: 'Extracting', detail: 'Reading the visible question stem, choices, and review context from this page.' };
  }
  if (input.operation === 'hinting') {
    return { label: 'Generating hint', detail: 'BroBot is giving the next reasoning nudge without revealing the answer.' };
  }
  if (input.operation === 'explaining') {
    return { label: 'Generating explanation', detail: 'BroBot is turning this question into a focused teaching answer.' };
  }
  if (input.operation === 'chatting') {
    return { label: 'Follow-up chat loading', detail: 'BroBot is answering your follow-up based on this same question context.' };
  }
  if (input.error?.code === 'quota_exceeded') {
    return { label: 'Quota exceeded', detail: 'Your daily BroBot limit has been reached for now.' };
  }
  if (input.error) {
    return { label: 'Error with retry', detail: input.error.message };
  }
  if (input.explanation) {
    return { label: 'Explanation ready', detail: 'BroBot has a structured teaching answer ready below.' };
  }
  if (input.hints.length) {
    return { label: 'Hint Mode active', detail: 'BroBot is nudging your reasoning step by step without naming the answer choice.' };
  }
  if (input.pageContext && isUnansweredQuestion(input.pageContext)) {
    return { label: 'Hint Mode ready', detail: 'This page looks unanswered, so you can ask for progressive hints before revealing the reasoning.' };
  }
  if (input.pageContext) {
    const classification = getPageClassification(input.pageContext);
    if (classification?.pageKind === 'topic_page') {
      return {
        label: 'Orthobullets topic page detected',
        detail: 'Pick an action below — BroBot will quiz you on this page instead of summarizing it.',
      };
    }
    if (classification?.pageKind === 'educational_content') {
      return { label: 'Learning page detected', detail: 'BroBot can explain this curriculum or article content without forcing Question Tutor mode.' };
    }
    if (classification?.pageKind === 'mixed') {
      return { label: 'Mixed page detected', detail: 'Question Tutor is available, and you can switch to Explain mode for the surrounding educational text.' };
    }
  }
  if (input.pageContext && hasReviewData(input.pageContext)) {
    if (input.pageContext.mode === 'curriculum_content') {
      return { label: 'ROCK curriculum page detected', detail: 'Use Explain with BroBot for a resident-friendly teaching summary of this page.' };
    }
    return { label: `${providerLabel(input.pageContext.provider)} review data detected`, detail: 'Use Explain with BroBot for full reasoning.' };
  }
  return { label: 'Ready to explain', detail: 'Nothing is sent to SnapOrtho until you click a hint or explanation action.' };
}

export function mountSidePanelApp(root: HTMLElement) {
  const state: {
    activePage: ActivePageState | null;
    auth: AuthState | null;
    loading: boolean;
    linking: boolean;
    linkCode: string | null;
    operation: OperationState;
    pageContext: OrthobulletsPageContext | null;
    extractionDiagnostics: OrthobulletsExtractionDiagnostics | null;
    fetchDiagnostics: ExtensionFetchDiagnostics | null;
    explanation: BrobotExplainResult | null;
    curriculumStudy: CurriculumStudyResponse | null;
    explainEmphasis: CurriculumExplainEmphasis;
    hints: OrthobulletsHintResponse[];
    error: { message: string; code: ExtensionErrorCode } | null;
    chatHistory: OrthobulletsChatTurn[];
    chatDraft: string;
    chatPrompts: string[];
    usage: UsageState;
    brobotMode: 'question_tutor' | 'explain_page' | 'topic_tutor';
    forceQuestionMode: boolean;
    topicProgress: OrthobulletsTopicProgress;
    topicHistory: OrthobulletsTopicTutorTurn[];
    topicChatDraft: string;
    topicChips: string[];
    topicInsufficientContent: boolean;
  } = {
    activePage: null,
    auth: null,
    loading: true,
    linking: false,
    linkCode: null,
    operation: 'idle',
    pageContext: null,
    extractionDiagnostics: null,
    fetchDiagnostics: null,
    explanation: null,
    curriculumStudy: null,
    explainEmphasis: 'high_yield',
    hints: [],
    error: null,
    chatHistory: [],
    chatDraft: '',
    chatPrompts: [],
    usage: null,
    brobotMode: 'question_tutor',
    forceQuestionMode: false,
    topicProgress: createEmptyTopicProgress(),
    topicHistory: [],
    topicChatDraft: '',
    topicChips: [],
    topicInsufficientContent: false,
  };

  async function refreshBaseState() {
    state.loading = true;
    render();

    const [pageResult, authResult] = await Promise.all([
      sendMessage({ type: 'ob:get-active-page-state' }),
      sendMessage({ type: 'ob:get-auth-state' }),
    ]);

    state.activePage = pageResult.ok && 'activePage' in pageResult ? pageResult.activePage : null;
    state.auth = authResult.ok && 'auth' in authResult ? authResult.auth : null;
    state.loading = false;
    render();

    if (state.activePage?.supported && state.auth?.status === 'linked') {
      void prefetchPageContext();
    }
  }

  async function prefetchPageContext() {
    state.operation = 'extracting';
    state.error = null;
    render();

    const pageContext = await extractPageContext({ allowPartial: true, preserveError: false });
    state.operation = 'idle';
    if (pageContext) {
      state.brobotMode = state.forceQuestionMode ? 'question_tutor' : preferredBrobotMode(pageContext);
    }
    render();
  }

  async function startLinkFlow() {
    state.error = null;
    state.linking = true;
    render();

    const deviceName = `Chrome ${new Date().toISOString().slice(0, 16)}`;
    const result = await sendMessage({ type: 'ob:start-link', deviceName });
    if (!result.ok || !('link' in result)) {
      state.error = result.ok
        ? { message: 'Failed to start link flow.', code: 'unknown' }
        : { message: result.error, code: result.code ?? 'unknown' };
      state.fetchDiagnostics = !result.ok && 'fetchDiagnostics' in result ? result.fetchDiagnostics ?? null : null;
      state.linking = false;
      render();
      return;
    }

    state.fetchDiagnostics = null;
    state.linkCode = result.link.linkCode;
    render();

    const interval = window.setInterval(async () => {
      if (!state.linkCode) {
        window.clearInterval(interval);
        return;
      }

      const pollResult = await sendMessage({
        type: 'ob:poll-link',
        linkCode: state.linkCode,
      });

      if (pollResult.ok && 'deviceToken' in pollResult) {
        state.fetchDiagnostics = null;
        state.linking = false;
        state.linkCode = null;
        await refreshBaseState();
        window.clearInterval(interval);
      } else if (!pollResult.ok && pollResult.code === 'network_failure') {
        state.fetchDiagnostics = 'fetchDiagnostics' in pollResult ? pollResult.fetchDiagnostics ?? null : null;
        state.error = { message: pollResult.error, code: pollResult.code };
        state.linking = false;
        window.clearInterval(interval);
        render();
      }
    }, 3000);
  }

  async function extractPageContext(options: { allowPartial?: boolean; preserveError?: boolean; forceQuestionMode?: boolean } = {}) {
    if (!state.activePage?.tabId) {
      if (!options.preserveError) {
        state.error = { message: 'No active supported page tab is available.', code: 'unsupported_page' };
        render();
      }
      return null;
    }

    if (options.forceQuestionMode != null) {
      state.forceQuestionMode = options.forceQuestionMode;
    }

    const extractResult = await sendMessage({
      type: 'ob:extract-page-context',
      tabId: state.activePage.tabId,
    });

    if (!extractResult.ok || !('pageContext' in extractResult)) {
      state.extractionDiagnostics = !extractResult.ok && 'diagnostics' in extractResult ? extractResult.diagnostics ?? null : null;
      state.fetchDiagnostics = !extractResult.ok && 'fetchDiagnostics' in extractResult ? extractResult.fetchDiagnostics ?? null : null;
      if (!options.preserveError) {
        state.error = extractResult.ok
          ? { message: 'Failed to extract page context.', code: 'extraction_failure' }
          : { message: extractResult.error, code: extractResult.code ?? 'extraction_failure' };
      }
      render();
      return null;
    }

    state.pageContext = extractResult.pageContext;
    state.extractionDiagnostics = extractResult.diagnostics;
    state.fetchDiagnostics = null;
    state.brobotMode = state.forceQuestionMode ? 'question_tutor' : preferredBrobotMode(extractResult.pageContext);

    const usable = isPageUsable(extractResult.pageContext, { forceQuestionMode: state.forceQuestionMode });
    if (!usable && !options.allowPartial) {
      const classification = getPageClassification(extractResult.pageContext);
      state.error = {
        message: extractionFailureMessage(classification),
        code: 'extraction_failure',
      };
      render();
      return null;
    }

    if (usable) {
      state.error = null;
    }

    return extractResult.pageContext;
  }

  async function runHint(hintLevel: 1 | 2 | 3) {
    state.error = null;
    state.explanation = null;
    state.curriculumStudy = null;
    state.chatHistory = [];
    state.chatDraft = '';
    state.chatPrompts = [];
    state.operation = 'extracting';
    render();

    const pageContext = await extractPageContext();
    if (!pageContext) {
      state.operation = 'idle';
      render();
      return;
    }

    if (!isHintEligible(pageContext)) {
      state.operation = 'idle';
      state.error = null;
      render();
      return;
    }

    state.operation = 'hinting';
    render();

    const hintResult = await sendMessage({
      type: 'ob:hint',
      pageContext,
      hintLevel,
      selectedAnswerKey: pageContext.selectedAnswerKey,
    });

    if (!hintResult.ok || !('hint' in hintResult)) {
      state.operation = 'idle';
      state.error = hintResult.ok
        ? { message: 'Failed to generate hint.', code: 'unknown' }
        : { message: hintResult.error, code: hintResult.code ?? 'unknown' };
      state.fetchDiagnostics = !hintResult.ok && 'fetchDiagnostics' in hintResult ? hintResult.fetchDiagnostics ?? null : null;
      render();
      return;
    }

    state.operation = 'idle';
    state.hints = [...state.hints.filter((hint) => hint.hintLevel < hintLevel), hintResult.hint];
    state.usage = hintResult.hint.usage ?? state.usage;
    render();
  }

  async function runExplain(options: { revealRequested?: boolean; emphasis?: CurriculumExplainEmphasis } = {}) {
    state.error = null;
    if (!options.emphasis) {
      state.explanation = null;
      state.curriculumStudy = null;
      state.chatHistory = [];
      state.chatPrompts = [];
      state.chatDraft = '';
    }
    if (options.emphasis) {
      state.explainEmphasis = options.emphasis;
    }
    state.operation = 'extracting';
    render();

    const pageContext = await extractPageContext({ forceQuestionMode: state.forceQuestionMode });
    if (!pageContext) {
      state.operation = 'idle';
      render();
      return;
    }

    state.brobotMode = state.forceQuestionMode ? 'question_tutor' : preferredBrobotMode(pageContext);
    state.operation = 'explaining';
    render();

    const explainResult = await sendMessage({
      type: 'ob:explain',
      pageContext,
      emphasis: state.explainEmphasis,
    });

    if (!explainResult.ok || !('explanation' in explainResult)) {
      state.operation = 'idle';
      state.error = explainResult.ok
        ? { message: 'Failed to explain page.', code: 'unknown' }
        : { message: explainResult.error, code: explainResult.code ?? 'unknown' };
      state.fetchDiagnostics = !explainResult.ok && 'fetchDiagnostics' in explainResult ? explainResult.fetchDiagnostics ?? null : null;
      render();
      return;
    }

    state.operation = 'idle';
    state.explanation = explainResult.explanation;
    state.curriculumStudy = isCurriculumStudyResponse(explainResult.explanation) ? explainResult.explanation : null;
    state.chatPrompts =
      state.brobotMode === 'explain_page' && state.pageContext
        ? resolveCurriculumChatChips(state.pageContext, state.curriculumStudy)
        : DEFAULT_FOLLOW_UP_PROMPTS;
    state.usage = explainResult.explanation.usage ?? null;
    render();
  }

  async function submitFollowUp(promptOverride?: string) {
    if (!state.pageContext || !state.explanation) return;

    const userMessage = (promptOverride ?? state.chatDraft).trim();
    if (!userMessage) return;

    state.error = null;
    state.operation = 'chatting';
    render();

    const priorHistory = [...state.chatHistory];
    const result = await sendMessage({
      type: 'ob:chat',
      pageContext: state.pageContext,
      explanation: isCurriculumStudyResponse(state.explanation) ? undefined : state.explanation,
      curriculumStudy: state.curriculumStudy ?? undefined,
      emphasis: state.explainEmphasis,
      history: priorHistory,
      userMessage,
    });

    if (!result.ok || !('chat' in result)) {
      state.operation = 'idle';
      state.error = result.ok
        ? { message: 'Failed to answer follow-up.', code: 'unknown' }
        : { message: result.error, code: result.code ?? 'unknown' };
      state.fetchDiagnostics = !result.ok && 'fetchDiagnostics' in result ? result.fetchDiagnostics ?? null : null;
      if (!promptOverride) {
        state.chatDraft = userMessage;
      }
      render();
      return;
    }

    state.operation = 'idle';
    state.chatDraft = '';
    state.chatHistory = [
      ...priorHistory,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: result.chat.answer },
    ];
    state.chatPrompts =
      state.brobotMode === 'explain_page' && state.pageContext
        ? resolveCurriculumChatChips(state.pageContext, {
            suggestedFollowUps: result.chat.suggestedPrompts.length
              ? result.chat.suggestedPrompts
              : state.curriculumStudy?.suggestedFollowUps ?? [],
          })
        : result.chat.suggestedPrompts.length
          ? result.chat.suggestedPrompts
          : DEFAULT_FOLLOW_UP_PROMPTS;
    state.usage = result.chat.usage ?? state.usage;
    render();
  }

  async function runTopicTutorTurn(input: { action?: OrthobulletsTopicAction; userMessage?: string } = {}) {
    if (!state.pageContext) return;

    const userMessage = input.userMessage?.trim() || undefined;
    state.error = null;
    state.operation = 'chatting';
    if (userMessage) {
      state.topicHistory = [...state.topicHistory, { role: 'user', content: userMessage }];
    }
    render();

    const result = await sendMessage({
      type: 'ob:topic-tutor-turn',
      pageContext: state.pageContext,
      action: input.action,
      progress: state.topicProgress,
      history: state.topicHistory,
      userMessage,
    });

    state.operation = 'idle';

    if (!result.ok || !('topicTurn' in result)) {
      state.error = result.ok
        ? { message: 'Failed to get a tutoring response.', code: 'unknown' }
        : { message: result.error, code: result.code ?? 'unknown' };
      state.fetchDiagnostics = !result.ok && 'fetchDiagnostics' in result ? result.fetchDiagnostics ?? null : null;
      if (userMessage) state.topicChatDraft = userMessage;
      render();
      return;
    }

    const turn = result.topicTurn;
    state.topicHistory = [...state.topicHistory, { role: 'assistant', content: turn.message }];
    state.topicChips = resolveTopicTutorChips(turn.suggestedChips);
    state.topicInsufficientContent = turn.insufficientContent;
    state.topicChatDraft = '';
    state.usage = turn.usage ?? state.usage;

    const progress: OrthobulletsTopicProgress = { ...state.topicProgress, tier: turn.tier };
    if (turn.sectionCompleted && !progress.sectionsCompleted.includes(turn.sectionCompleted)) {
      progress.sectionsCompleted = [...progress.sectionsCompleted, turn.sectionCompleted];
    }
    if (turn.conceptTag && turn.conceptStatus === 'missed' && !progress.conceptsMissed.includes(turn.conceptTag)) {
      progress.conceptsMissed = [...progress.conceptsMissed, turn.conceptTag];
    }
    if (turn.conceptTag && turn.conceptStatus === 'mastered' && !progress.conceptsMastered.includes(turn.conceptTag)) {
      progress.conceptsMastered = [...progress.conceptsMastered, turn.conceptTag];
    }
    state.topicProgress = progress;

    render();
  }

  function saveTopicPearl(quote: string) {
    const trimmed = quote.trim();
    if (!trimmed || state.topicProgress.savedPearls.includes(trimmed)) return;
    state.topicProgress = {
      ...state.topicProgress,
      savedPearls: [...state.topicProgress.savedPearls, trimmed],
    };
    render();
  }

  async function unlink() {
    await sendMessage({ type: 'ob:clear-link' });
    state.explanation = null;
    state.curriculumStudy = null;
    state.hints = [];
    state.chatHistory = [];
    state.chatDraft = '';
    state.chatPrompts = [];
    state.pageContext = null;
    state.extractionDiagnostics = null;
    state.fetchDiagnostics = null;
    state.usage = null;
    state.topicProgress = createEmptyTopicProgress();
    state.topicHistory = [];
    state.topicChatDraft = '';
    state.topicChips = [];
    state.topicInsufficientContent = false;
    await refreshBaseState();
  }

  function render() {
    root.innerHTML = '';

    const status = getStatusCopy({
      loading: state.loading,
      activePage: state.activePage,
      auth: state.auth,
      operation: state.operation,
      pageContext: state.pageContext,
      explanation: state.explanation,
      hints: state.hints,
      error: state.error,
    });

    const classification = getPageClassification(state.pageContext);
    const isEducationalPage = classification?.pageKind === 'educational_content';
    const isMixedPage = classification?.pageKind === 'mixed';
    const isUnreadablePage = classification?.pageKind === 'unreadable';
    const isTopicPage = classification?.pageKind === 'topic_page' || state.brobotMode === 'topic_tutor';
    const isCurriculumPage = state.pageContext?.mode === 'curriculum_content' || isEducationalPage;
    const pageLooksHintEligible =
      state.brobotMode === 'question_tutor' &&
      (state.pageContext ? isHintEligible(state.pageContext) : isLikelyCurrentTestUrl(state.activePage?.url));
    const pageLooksExplainEligible = state.pageContext
      ? isExplainEligible(state.pageContext) || isEducationalPage || isMixedPage
      : false;
    const hintNextLevel = state.hints.length === 0 ? 1 : state.hints.length === 1 ? 2 : 3;
    const panelTitle =
      state.brobotMode === 'topic_tutor'
        ? 'Orthobullets Page Mode'
        : state.brobotMode === 'explain_page'
          ? 'Explain with BroBot'
          : 'Question Tutor';

    const container = createElement('div', {
      html: `
        <div style="padding:18px 18px 8px;display:grid;gap:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${BROBOT_ICON_URL}" alt="BroBot" width="32" height="32" style="display:block;width:32px;height:32px;border-radius:8px;" />
            <div>
              <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#0f766e;font-weight:700;">BroBot</p>
              <h1 style="margin:6px 0 0;font-size:24px;line-height:1.2;">${escapeHtml(panelTitle)}</h1>
            </div>
          </div>
        </div>
      `,
    });

    const content = createElement('div');
    content.style.padding = '0 18px 18px';
    content.style.display = 'grid';
    content.style.gap = '14px';

    content.appendChild(
      createElement('div', {
        html: `<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;display:grid;gap:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">${escapeHtml(status.label)}</p>
            ${state.usage ? `<p style="margin:0;font-size:12px;color:#5c6574;">${escapeHtml(getUsageLabel(state.usage) ?? '')}</p>` : ''}
          </div>
          <p style="margin:0;color:#384152;line-height:1.5;">${escapeHtml(status.detail)}</p>
        </div>`,
      })
    );

    if (state.loading) {
      content.appendChild(
        createElement('div', {
          html: `<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;color:#5c6574;">Loading extension state...</div>`,
        })
      );
    } else if (!state.activePage?.supported) {
      content.appendChild(
        createElement('div', {
          html: `<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;">
            Open an Orthobullets or ROCK question page, then reopen this side panel.
          </div>`,
        })
      );
    } else if (state.auth?.status !== 'linked') {
      const card = createElement('div', {
        html: `<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;display:grid;gap:10px;">
          <p style="margin:0;line-height:1.5;">Link this extension to your SnapOrtho account before requesting hints, explanations, or follow-up tutoring.</p>
          <button id="start-link" style="border:none;border-radius:999px;background:#0f766e;color:white;padding:10px 14px;font-weight:700;cursor:pointer;">
            ${state.linking ? 'Waiting for approval...' : 'Link to SnapOrtho'}
          </button>
          ${state.linkCode ? `<p style="margin:0;color:#5c6574;">Link code: ${escapeHtml(state.linkCode)}</p>` : ''}
        </div>`,
      });
      content.appendChild(card);
      card.querySelector('#start-link')?.addEventListener('click', () => {
        void startLinkFlow();
      });
    } else if (isTopicPage) {
      renderTopicTutorPanel(content, state, {
        runTopicTutorTurn: (input) => void runTopicTutorTurn(input),
        saveTopicPearl,
        setDraft: (value) => {
          state.topicChatDraft = value;
        },
        unlink: () => void unlink(),
        isBusy: state.operation !== 'idle',
      });
    } else {
      const isBusy = state.operation !== 'idle';
      const explainButtonLabel =
        state.operation === 'extracting'
          ? 'Extracting...'
          : state.operation === 'explaining'
            ? 'Generating...'
            : state.brobotMode === 'explain_page'
              ? 'Explain this page with BroBot'
              : 'Explain with BroBot';

      if (isEducationalPage && !state.explanation && !pageLooksHintEligible) {
        content.appendChild(
          createElement('div', {
            html: `<div style="padding:14px;border-radius:16px;background:#f0fdfa;border:1px solid #99f6e4;display:grid;gap:10px;">
              <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">Learning page detected</p>
              <p style="margin:0;color:#384152;line-height:1.5;">This looks like a learning page, not a question. BroBot can teach the visible curriculum content instead of forcing Question Tutor mode.</p>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button id="explain-page" ${isBusy ? 'disabled' : ''} style="border:none;border-radius:999px;background:${isBusy ? '#94a3b8' : '#0f766e'};color:white;padding:10px 14px;font-weight:700;cursor:${isBusy ? 'default' : 'pointer'};">${escapeHtml(explainButtonLabel)}</button>
                <button id="force-question" ${isBusy ? 'disabled' : ''} style="border:1px solid #d2cab8;border-radius:999px;background:white;color:#18202b;padding:10px 14px;font-weight:700;cursor:${isBusy ? 'default' : 'pointer'};">Try question detection anyway</button>
                <button id="unlink-edu" ${isBusy ? 'disabled' : ''} style="border:1px solid #d2cab8;border-radius:999px;background:#f7f5ef;color:#18202b;padding:10px 14px;font-weight:700;cursor:${isBusy ? 'default' : 'pointer'};">Unlink</button>
              </div>
            </div>`,
          })
        );
        content.querySelector('#explain-page')?.addEventListener('click', () => {
          state.forceQuestionMode = false;
          void runExplain();
        });
        content.querySelector('#unlink-edu')?.addEventListener('click', () => void unlink());
        content.querySelector('#force-question')?.addEventListener('click', async () => {
          state.forceQuestionMode = true;
          state.brobotMode = 'question_tutor';
          const pageContext = await extractPageContext({ forceQuestionMode: true });
          if (!pageContext) {
            const nextClassification = getPageClassification(state.pageContext);
            state.error = {
              message: extractionFailureMessage(nextClassification),
              code: 'extraction_failure',
            };
            render();
            return;
          }
          state.error = null;
          render();
        });
      } else if (isMixedPage && !state.explanation) {
        content.appendChild(
          createElement('div', {
            html: `<div style="padding:14px;border-radius:16px;background:#f8fafc;border:1px solid #cbd5e1;display:grid;gap:8px;">
              <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">Question + learning content detected</p>
              <p style="margin:0;color:#384152;line-height:1.5;">BroBot will default to Question Tutor, but you can switch to Explain mode for the surrounding educational text.</p>
              <button id="switch-explain" ${isBusy ? 'disabled' : ''} style="justify-self:start;border:1px solid #d2cab8;border-radius:999px;background:white;color:#18202b;padding:8px 12px;font-weight:700;cursor:${isBusy ? 'default' : 'pointer'};">Switch to Explain mode</button>
            </div>`,
          })
        );
        content.querySelector('#switch-explain')?.addEventListener('click', () => {
          state.forceQuestionMode = false;
          state.brobotMode = 'explain_page';
          render();
        });
      }

      if (pageLooksHintEligible) {
        const hintButtonLabel =
          state.operation === 'hinting'
            ? 'Getting hint...'
            : hintNextLevel === 1
              ? 'Get Hint 1'
              : hintNextLevel === 2
                ? 'Next Hint'
                : 'Final Hint';

        const hintCard = createElement('div', {
          html: `<div style="padding:14px;border-radius:16px;background:#f8fafc;border:1px solid #cbd5e1;display:grid;gap:10px;">
            <div style="display:grid;gap:6px;">
              <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">Need a hint?</p>
              <p style="margin:0;color:#384152;line-height:1.5;">BroBot can nudge your reasoning in three steps without naming the answer choice too early.</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button id="hint-next" ${isBusy ? 'disabled' : ''} style="border:none;border-radius:999px;background:${isBusy ? '#94a3b8' : '#0f766e'};color:white;padding:10px 14px;font-weight:700;cursor:${isBusy ? 'default' : 'pointer'};">${escapeHtml(hintButtonLabel)}</button>
              <button id="reveal-reasoning" ${isBusy ? 'disabled' : ''} style="border:1px solid #d2cab8;border-radius:999px;background:white;color:#18202b;padding:10px 14px;font-weight:700;cursor:${isBusy ? 'default' : 'pointer'};">Reveal Reasoning</button>
              <button id="unlink" ${isBusy ? 'disabled' : ''} style="border:1px solid #d2cab8;border-radius:999px;background:#f7f5ef;color:#18202b;padding:10px 14px;font-weight:700;cursor:${isBusy ? 'default' : 'pointer'};">Unlink</button>
            </div>
            <p style="margin:0;font-size:12px;color:#5c6574;">Hints and reveal requests send the current page context only when you click them.</p>
          </div>`,
        });
        content.appendChild(hintCard);
        hintCard.querySelector('#hint-next')?.addEventListener('click', () => void runHint(hintNextLevel as 1 | 2 | 3));
        hintCard.querySelector('#reveal-reasoning')?.addEventListener('click', () => void runExplain({ revealRequested: true }));
        hintCard.querySelector('#unlink')?.addEventListener('click', () => void unlink());
      } else if (isCurriculumPage) {
        content.appendChild(
          createElement('div', {
            html: `<div style="padding:14px;border-radius:16px;background:#f8fafc;border:1px solid #cbd5e1;display:grid;gap:8px;">
              <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">ROCK curriculum page detected</p>
              <p style="margin:0;color:#384152;line-height:1.5;">BroBot can explain and organize the visible curriculum content. Hints and reveal reasoning are only available on question pages.</p>
            </div>`,
          })
        );
      }

      if (!isEducationalPage || state.explanation || pageLooksHintEligible) {
        const controls = createElement('div', {
          html: `<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;display:grid;gap:10px;">
            <p style="margin:0;color:#5c6574;line-height:1.45;">Active page: ${escapeHtml(state.activePage.title ?? state.activePage.url ?? providerLabel(state.activePage.provider))}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button id="explain" ${isBusy ? 'disabled' : ''} style="border:none;border-radius:999px;background:${isBusy ? '#94a3b8' : '#0f766e'};color:white;padding:10px 14px;font-weight:700;cursor:${isBusy ? 'default' : 'pointer'};">${escapeHtml(explainButtonLabel)}</button>
              ${pageLooksHintEligible ? '' : `<button id="unlink" ${isBusy ? 'disabled' : ''} style="border:1px solid #d2cab8;border-radius:999px;background:#f7f5ef;color:#18202b;padding:10px 14px;font-weight:700;cursor:${isBusy ? 'default' : 'pointer'};">Unlink</button>`}
            </div>
            <p style="margin:0;font-size:12px;color:#5c6574;">${
              isCurriculumPage || state.brobotMode === 'explain_page'
                ? 'Explain mode teaches the visible page content with high-yield clinical framing.'
                : pageLooksExplainEligible
                  ? 'Review data detected. Use Explain with BroBot for full reasoning.'
                  : 'Use Explain with BroBot for full review-mode reasoning. Hint Mode stays answer-sparing until you explicitly reveal.'
            }</p>
          </div>`,
        });
        content.appendChild(controls);
        controls.querySelector('#explain')?.addEventListener('click', () => void runExplain());
        controls.querySelector('#unlink')?.addEventListener('click', () => void unlink());
      }
    }

    if (state.error && !(isEducationalPage && !state.forceQuestionMode)) {
      const copy = ERROR_COPY[state.error.code] ?? ERROR_COPY.unknown;
      const errorTitle =
        isUnreadablePage && classification?.detected.referencesCount
          ? 'References-heavy page'
          : isUnreadablePage && classification?.detected.hasStem
            ? 'Could not detect a question'
            : copy.title;
      const errorCard = createElement('div', {
        html: `<div style="padding:14px;border-radius:16px;background:#fff0ef;border:1px solid #f0c0bc;color:#a02d1f;display:grid;gap:8px;">
          <p style="margin:0;font-weight:700;">${escapeHtml(errorTitle)}</p>
          <p style="margin:0;line-height:1.5;">${escapeHtml(state.error.message)}</p>
          ${
            state.extractionDiagnostics?.failureCode
              ? `<p style="margin:0;font-size:12px;color:#7f1d1d;">Failure code: ${escapeHtml(state.extractionDiagnostics.failureCode)}</p>`
              : ''
          }
          ${copy.canRetry ? `<button id="retry-explain" style="justify-self:start;border:1px solid #a02d1f;border-radius:999px;background:white;color:#a02d1f;padding:6px 12px;font-weight:700;cursor:pointer;">Retry</button>` : ''}
        </div>`,
      });
      content.appendChild(errorCard);
      errorCard.querySelector('#retry-explain')?.addEventListener('click', () => {
        if (pageLooksHintEligible) {
          void runHint(hintNextLevel as 1 | 2 | 3);
        } else {
          void runExplain();
        }
      });
    }

    if (state.hints.length) {
      content.appendChild(createElement('div', { html: renderHintCards(state.hints) }));

      if (!state.explanation) {
        content.appendChild(
          createElement('div', {
            html: `<div style="padding:12px;border-radius:14px;background:#fffaf0;border:1px solid #f5d7a1;color:#7c2d12;">
              <p style="margin:0;font-size:12px;line-height:1.5;">Hint Mode is designed to guide your reasoning without naming the answer choice. Use Reveal Reasoning only when you want the full answer path.</p>
            </div>`,
          })
        );
      }
    }

    if (state.pageContext && !state.explanation && !state.error && !isTopicPage && hasReviewData(state.pageContext) && state.pageContext.mode !== 'curriculum_content') {
      content.appendChild(
        createElement('div', {
          html: `<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;display:grid;gap:8px;">
            <p style="margin:0;font-weight:700;">Review data detected.</p>
            <p style="margin:0;color:#384152;line-height:1.5;">Use Explain with BroBot for full reasoning. This page already shows ${state.pageContext.correctAnswerKey || state.pageContext.correctAnswer ? 'a visible correct answer' : 'review-style context'}${state.pageContext.explanationText || state.pageContext.explanation ? ', explanation text' : ''}${state.pageContext.percentDistribution.length ? `, and ${state.pageContext.percentDistribution.length} distribution rows` : ''}.</p>
          </div>`,
        })
      );
    }

    if (state.pageContext && !state.explanation && !state.error && !isTopicPage && !hasReviewData(state.pageContext) && !pageLooksHintEligible && state.pageContext.mode !== 'curriculum_content') {
      content.appendChild(
        createElement('div', {
          html: `<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;display:grid;gap:8px;">
            <p style="margin:0;font-weight:700;">Partial question data detected.</p>
            <p style="margin:0;color:#384152;line-height:1.5;">BroBot can still help with hints from the visible stem and choices. Missing fields are treated as warnings, not a hard failure.</p>
          </div>`,
        })
      );
    }

    if (state.explanation) {
      if (state.brobotMode === 'explain_page' && state.curriculumStudy && state.pageContext) {
        const studyPanel = createElement('div', {
          html: renderCurriculumStudyPanel(state.curriculumStudy, state.pageContext),
        });
        content.appendChild(studyPanel);
        studyPanel.querySelectorAll<HTMLButtonElement>('[data-emphasis-tab]').forEach((button) => {
          button.addEventListener('click', () => {
            const emphasis = button.dataset.emphasisTab as CurriculumExplainEmphasis | undefined;
            if (!emphasis || emphasis === state.explainEmphasis) return;
            void runExplain({ emphasis });
          });
        });
      } else {
        content.appendChild(
          createElement('div', {
            html: renderExplanation(
              state.explanation as OrthobulletsExplainResponse,
              state.brobotMode === 'explain_page' ? 'explain_page' : 'question_tutor'
            ),
          })
        );
      }

      const questionWarnings = state.explanation.warnings.filter(isClinicallyImportantWarning);
      if (questionWarnings.length && state.brobotMode !== 'explain_page') {
        content.appendChild(
          createElement('div', {
            html: `<div style="padding:10px;border-radius:12px;background:#fffaf0;border:1px solid #f5d7a1;color:#7c2d12;">
              <p style="margin:0;font-size:12px;line-height:1.4;">BroBot notes: ${escapeHtml(questionWarnings.join(' · '))}</p>
            </div>`,
          })
        );
      }

      const chatPadding = state.brobotMode === 'explain_page' ? '10px' : '14px';
      const chatGap = state.brobotMode === 'explain_page' ? '8px' : '12px';
      const chatCard = createElement('div', {
        html: `<div style="padding:${chatPadding};border-radius:14px;background:white;border:1px solid #ded7c8;display:grid;gap:${chatGap};">
          <div style="display:grid;gap:4px;">
            <h3 style="margin:0;font-size:16px;">Ask BroBot</h3>
            ${
              state.brobotMode !== 'explain_page'
                ? '<p style="margin:0;color:#5c6574;line-height:1.4;font-size:12px;">Ask about this exact question without leaving the side panel.</p>'
                : ''
            }
          </div>
          ${state.chatHistory.length || state.operation === 'chatting' ? renderChatTranscript(state.chatHistory, state.operation === 'chatting') : `<p style="margin:0;color:#5c6574;font-size:12px;">${state.brobotMode === 'explain_page' ? 'Pick a topic-specific question below to go deeper.' : 'Try: “Why not the trap answer?” or “Give me an Anki-style card.”'}</p>`}
          ${state.brobotMode === 'explain_page' ? renderCurriculumChatChips(state.chatPrompts) : state.chatPrompts.length ? renderCurriculumChatChips(state.chatPrompts) : ''}
          <form id="chat-form" style="display:grid;gap:6px;">
            <textarea id="chat-input" rows="2" placeholder="Ask a follow-up..." style="width:100%;box-sizing:border-box;border:1px solid #d2cab8;border-radius:12px;padding:10px;font:inherit;resize:vertical;font-size:13px;">${escapeHtml(state.chatDraft)}</textarea>
            <div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;">
              <button type="submit" ${state.operation === 'chatting' ? 'disabled' : ''} style="border:none;border-radius:999px;background:${state.operation === 'chatting' ? '#94a3b8' : '#0f766e'};color:white;padding:8px 12px;font-weight:700;font-size:12px;cursor:${state.operation === 'chatting' ? 'default' : 'pointer'};">${state.operation === 'chatting' ? 'Sending...' : 'Ask BroBot'}</button>
            </div>
          </form>
        </div>`,
      });
      content.appendChild(chatCard);

      const chatInput = chatCard.querySelector('#chat-input') as HTMLTextAreaElement | null;
      chatInput?.addEventListener('input', (event) => {
        state.chatDraft = (event.currentTarget as HTMLTextAreaElement).value;
      });
      chatCard.querySelector('#chat-form')?.addEventListener('submit', (event) => {
        event.preventDefault();
        void submitFollowUp();
      });
      chatCard.querySelectorAll<HTMLButtonElement>('[data-prompt-index]').forEach((button) => {
        button.addEventListener('click', () => {
          const index = Number(button.dataset.promptIndex ?? -1);
          const prompt = state.chatPrompts[index];
          if (prompt) {
            void submitFollowUp(prompt);
          }
        });
      });
    }

    if (state.pageContext || state.extractionDiagnostics || state.fetchDiagnostics) {
      content.appendChild(
        createElement('div', {
          html: renderDebugSummary({
            activePage: state.activePage,
            diagnostics: state.extractionDiagnostics,
            fetchDiagnostics: state.fetchDiagnostics,
            pageContext: state.pageContext,
            errorCode: state.error?.code ?? null,
          }),
        })
      );
    }

    root.appendChild(container);
    root.appendChild(content);
  }

  void refreshBaseState();
}
