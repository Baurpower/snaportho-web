import type { ExtensionMessage, ExtensionMessageResponse, QuestionChangeMessage } from '../shared/messages.js';
import type { QuestionRefreshSource } from '../shared/question-fingerprint.js';
import { fingerprintFromPageContext } from '../shared/question-fingerprint.js';
import { isHintEligible, isExplainEligible } from '../shared/page-classification.js';
import type {
  BrobotExplainResult,
  CurriculumExplainEmphasis,
  OrthobulletsExtractionDiagnostics,
  OrthobulletsHintResponse,
  OrthobulletsPageContext,
} from '../shared/types.js';
import { isCurriculumStudyResponse } from '../shared/types.js';
import {
  applyPayloadToSession,
  quarantineExplanationForSession,
  QuestionSession,
  QuestionSessionStore,
} from './question-session.js';

const DEFAULT_FOLLOW_UP_PROMPTS = ['Why not the trap answer?', 'Make this simpler', 'Give me an Anki-style card'];

export type QuestionTutorControllerDeps = {
  sendMessage: (message: ExtensionMessage) => Promise<ExtensionMessageResponse>;
  extractPageContext: (options?: {
    allowPartial?: boolean;
    preserveError?: boolean;
  }) => Promise<OrthobulletsPageContext | null>;
  onRender: () => void;
  getExplainEmphasis: () => CurriculumExplainEmphasis;
};

export class QuestionTutorController {
  readonly store = new QuestionSessionStore();

  constructor(private readonly deps: QuestionTutorControllerDeps) {}

  private render() {
    this.deps.onRender();
  }

  private getActiveSession(): QuestionSession | null {
    return this.store.getRenderableSession();
  }

  async onQuestionChanged(message: QuestionChangeMessage) {
    const isReviewStateOnly = message.reasonForRefresh === 'review_state_change';
    this.store.previousVisibleQuestionIdentity = message.previousVisibleQuestionIdentity ?? this.store.visibleQuestionIdentity;
    this.store.visibleQuestionIdentity = message.visibleQuestionIdentity ?? this.store.visibleQuestionIdentity;
    this.store.previousActiveQuestionKey = message.previousActiveQuestionKey ?? this.store.activeQuestionKey;
    this.store.activeQuestionKey = message.activeQuestionKey ?? message.fingerprint;
    this.store.questionChangeDetectedBy = message.questionChangeDetectedBy ?? 'mutation';
    this.store.lastQuestionChangeAt = message.refreshTimestamp;
    this.store.refreshSkippedReason = null;

    if (isReviewStateOnly && this.store.activeFingerprint === message.fingerprint) {
      this.store.refreshSource = 'automatic';
      this.store.lastEvent = 'review_state_change';
      await this.extractAndUpdateSession(message.fingerprint, {
        questionPositionLabel: message.questionPositionLabel,
        url: message.pageUrl,
        questionId: message.questionId,
        restartPrefetches: true,
        collapseVisiblePanel: true,
      });
      return;
    }

    this.store.refreshSource = 'automatic';
    this.store.activateFingerprint(message.fingerprint, {
      url: message.pageUrl,
      questionId: message.questionId,
      questionPositionLabel: message.questionPositionLabel,
      resetVisiblePanel: true,
    });
    // A key can recur when navigating Previous. Invalidate its cached content
    // before the first render so an old hint/explanation never flashes.
    this.store.bumpGeneration(message.fingerprint);
    this.store.lastEvent = 'navigation_fingerprint_change';
    this.render();

    if ((message.settleDelayMs ?? 0) > 0) {
      await new Promise((resolve) => setTimeout(resolve, message.settleDelayMs));
      if (this.store.activeFingerprint !== message.fingerprint) {
        this.store.refreshSkippedReason = 'superseded_during_dom_settle';
        return;
      }
    }
    await this.extractAndUpdateSession(message.fingerprint, {
      questionPositionLabel: message.questionPositionLabel,
      url: message.pageUrl,
      questionId: message.questionId,
      restartPrefetches: true,
      collapseVisiblePanel: false,
    });
  }

  async onManualRefresh() {
    const fingerprint = this.store.activeFingerprint;
    if (!fingerprint) return;

    this.store.refreshSource = 'manual';
    this.store.questionChangeDetectedBy = 'manual';
    this.store.lastQuestionChangeAt = new Date().toISOString();
    this.store.refreshSkippedReason = null;
    this.store.visiblePanelMode = 'idle';
    this.store.bumpGeneration(fingerprint);
    this.store.lastEvent = 'manual_refresh';
    this.render();

    const session = this.store.getSession(fingerprint);
    await this.extractAndUpdateSession(fingerprint, {
      questionPositionLabel: session?.questionPositionLabel ?? null,
      url: session?.url ?? '',
      questionId: session?.questionId ?? null,
      restartPrefetches: true,
      collapseVisiblePanel: false,
    });
  }

  async onInitialPageContext(pageContext: OrthobulletsPageContext) {
    const fingerprint = fingerprintFromPageContext(pageContext);
    this.store.activateFingerprint(fingerprint, {
      url: pageContext.pageUrl ?? pageContext.sourceUrl ?? '',
      questionId: pageContext.questionId ?? null,
      resetVisiblePanel: true,
    });
    this.store.lastEvent = 'initial_page_context';
    this.render();

    const session = this.store.getSession(fingerprint);
    if (!session) return;

    const generation = session.generation;
    applyPayloadToSession(session, pageContext);
    if (!this.store.canCommit(fingerprint, generation)) return;

    this.render();
    void this.startPrefetches(fingerprint, generation);
  }

  private async extractAndUpdateSession(
    fingerprint: string,
    options: {
      questionPositionLabel: string | null;
      url: string;
      questionId: string | null;
      restartPrefetches: boolean;
      collapseVisiblePanel: boolean;
    }
  ) {
    const session =
      this.store.getSession(fingerprint) ??
      this.store.activateFingerprint(fingerprint, {
        url: options.url,
        questionId: options.questionId,
        questionPositionLabel: options.questionPositionLabel,
        resetVisiblePanel: !options.collapseVisiblePanel,
      });

    if (options.collapseVisiblePanel) {
      this.store.visiblePanelMode = 'idle';
    }

    session.questionPositionLabel = options.questionPositionLabel;
    session.extractionStatus = 'extracting';
    session.extractionError = undefined;
    this.store.lastEvent = 'extraction_started';
    this.render();

    const generation = session.generation;
    this.store.beginInFlight();
    const pageContext = await this.deps.extractPageContext({ allowPartial: true, preserveError: true });
    this.store.endInFlight();

    if (!this.store.canCommit(fingerprint, generation)) return;

    if (!pageContext || pageContext.mode !== 'question') {
      session.extractionStatus = 'error';
      session.extractionError = 'Could not read question context from the active page.';
      this.store.lastEvent = 'extraction_error';
      this.render();
      return;
    }

    const previousReviewState = session.reviewState;
    applyPayloadToSession(session, pageContext);
    this.store.lastEvent = 'extraction_ready';
    this.render();

    if (options.restartPrefetches) {
      if (previousReviewState !== session.reviewState) {
        if (session.reviewState === 'answered_review') {
          session.explanationStatus = 'idle';
          session.explanation = undefined;
          session.curriculumStudy = null;
          session.explanationError = undefined;
        }
        if (session.reviewState === 'unanswered') {
          quarantineExplanationForSession(session);
          if (this.store.visiblePanelMode === 'explanation_open' || this.store.visiblePanelMode === 'chat_open') {
            this.store.visiblePanelMode = 'idle';
          }
        }
        this.store.lastEvent = 'review_state_transition';
        this.render();
      }
      void this.startPrefetches(fingerprint, generation);
    }
  }

  private async startPrefetches(fingerprint: string, generation: number) {
    const session = this.store.getSession(fingerprint);
    if (!session || !this.store.canCommit(fingerprint, generation)) return;

    if (
      session.primaryAction === 'hint' &&
      session.payload &&
      isHintEligible(session.payload) &&
      (session.hintStatus === 'idle' || session.hintStatus === 'error')
    ) {
      void this.prefetchHint(fingerprint, generation, 1);
    }
    if (
      session.reviewState === 'answered_review' &&
      session.primaryAction === 'explain' &&
      session.payload &&
      isExplainEligible(session.payload) &&
      (session.explanationStatus === 'idle' || session.explanationStatus === 'error')
    ) {
      void this.prefetchExplanation(fingerprint, generation);
    }
  }

  private async prefetchHint(fingerprint: string, generation: number, hintLevel: 1 | 2 | 3) {
    const session = this.store.getSession(fingerprint);
    if (!session?.payload || !this.store.canCommit(fingerprint, generation)) return;
    if (!isHintEligible(session.payload)) return;

    session.hintStatus = 'prefetching';
    session.hintError = undefined;
    session.hintErrorStatus = null;
    session.hintErrorBody = null;
    session.hintPayloadSummary = JSON.stringify({
      provider: session.payload.provider,
      questionId: session.payload.questionId ?? null,
      stemLength: session.payload.stem?.length ?? 0,
      answerChoiceCount: session.payload.answerChoices.length,
      breadcrumbCount: session.payload.breadcrumbs?.length ?? 0,
      hintLevel,
    });
    this.store.lastEvent = `hint_prefetch_${hintLevel}`;
    this.render();

    this.store.beginInFlight();
    const hintResult = await this.deps.sendMessage({
      type: 'brobot:request',
      task: 'question_hint',
      pageContext: session.payload,
      hintLevel,
      selectedAnswerKey: session.payload.selectedAnswerKey,
    });
    this.store.endInFlight();

    if (!this.store.canCommit(fingerprint, generation)) return;

    if (!hintResult.ok || !('hint' in hintResult)) {
      session.hintStatus = 'error';
      session.hintError = hintResult.ok ? 'Failed to prefetch hint.' : hintResult.error;
      if (!hintResult.ok && 'fetchDiagnostics' in hintResult) {
        session.hintErrorStatus = hintResult.fetchDiagnostics?.httpStatus ?? null;
        session.hintErrorBody = hintResult.fetchDiagnostics?.responseBody ?? null;
      }
      this.store.lastEvent = 'hint_prefetch_error';
      this.render();
      return;
    }

    session.hints = [...session.hints.filter((hint) => hint.hintLevel < hintLevel), hintResult.hint];
    session.hintStatus = 'ready';
    this.store.lastEvent = 'hint_prefetch_ready';
    this.render();
  }

  private async prefetchExplanation(fingerprint: string, generation: number) {
    const session = this.store.getSession(fingerprint);
    if (!session?.payload || !this.store.canCommit(fingerprint, generation)) return;
    if (session.reviewState !== 'answered_review' || session.primaryAction !== 'explain') return;
    if (!isExplainEligible(session.payload)) return;

    session.explanationStatus = 'prefetching';
    session.explanationError = undefined;
    this.store.lastEvent = 'explanation_prefetch';
    this.render();

    this.store.beginInFlight();
    const explainResult = await this.deps.sendMessage({
      type: 'brobot:request',
      task: 'question_explain',
      pageContext: session.payload,
      emphasis: this.deps.getExplainEmphasis(),
    });
    this.store.endInFlight();

    if (!this.store.canCommit(fingerprint, generation)) return;
    if (session.reviewState !== 'answered_review' || session.primaryAction !== 'explain') {
      quarantineExplanationForSession(session);
      this.store.lastEvent = 'explanation_prefetch_quarantined';
      this.render();
      return;
    }

    if (!explainResult.ok || !('explanation' in explainResult)) {
      session.explanationStatus = 'error';
      session.explanationError = explainResult.ok ? 'Failed to prefetch explanation.' : explainResult.error;
      this.store.lastEvent = 'explanation_prefetch_error';
      this.render();
      return;
    }

    session.explanation = explainResult.explanation;
    session.curriculumStudy = isCurriculumStudyResponse(explainResult.explanation) ? explainResult.explanation : null;
    session.chatPrompts = DEFAULT_FOLLOW_UP_PROMPTS;
    session.explanationStatus = 'ready';
    this.store.lastEvent = 'explanation_prefetch_ready';
    this.render();
  }

  openHint() {
    const session = this.getActiveSession();
    if (!session || session.primaryAction !== 'hint') return;

    if (this.store.visiblePanelMode !== 'hint_open') {
      this.store.visiblePanelMode = 'hint_open';
      session.currentHintIndex = 0;
      session.hintOpenedForFingerprint = session.fingerprint;
      this.store.lastEvent = 'hint_open';
      if (session.hintStatus === 'error' || (session.hintStatus !== 'prefetching' && session.hints.length === 0)) {
        void this.prefetchHint(session.fingerprint, session.generation, 1);
      }
      this.render();
      return;
    }

    if (session.hintStatus === 'prefetching') return;
    const currentIndex = session.currentHintIndex ?? 0;
    if (session.hintStatus === 'error') {
      const retryLevel = (currentIndex + 1) as 1 | 2 | 3;
      this.store.lastEvent = `hint_retry_${retryLevel}`;
      void this.prefetchHint(session.fingerprint, session.generation, retryLevel);
      this.render();
      return;
    }
    if (currentIndex >= 2) return;
    const nextIndex = currentIndex + 1;
    session.currentHintIndex = nextIndex;
    const nextLevel = (nextIndex + 1) as 1 | 2 | 3;
    this.store.lastEvent = `hint_advance_${nextLevel}`;
    if (!session.hints.some((hint) => hint.hintLevel === nextLevel)) {
      void this.prefetchHint(session.fingerprint, session.generation, nextLevel);
    }
    this.render();
  }

  openExplain() {
    const session = this.getActiveSession();
    if (!session || session.primaryAction !== 'explain') return;

    this.store.visiblePanelMode = 'explanation_open';
    this.store.lastEvent = 'explanation_open';

    if (session.explanationStatus !== 'ready') {
      void this.prefetchExplanation(session.fingerprint, session.generation);
    }

    this.render();
  }

  setChatDraft(value: string) {
    const session = this.getActiveSession();
    if (!session) return;
    session.chatDraft = value;
  }

  async submitFollowUp(promptOverride?: string) {
    const session = this.getActiveSession();
    if (!session?.payload || !session.explanation) return;

    const userMessage = (promptOverride ?? session.chatDraft).trim();
    if (!userMessage) return;

    this.store.visiblePanelMode = 'chat_open';
    const generation = session.generation;
    const priorHistory = [...session.chatHistory];

    this.store.beginInFlight();
    const result = await this.deps.sendMessage({
      type: 'ob:chat',
      pageContext: session.payload,
      explanation: isCurriculumStudyResponse(session.explanation) ? undefined : session.explanation,
      curriculumStudy: session.curriculumStudy ?? undefined,
      emphasis: this.deps.getExplainEmphasis(),
      history: priorHistory,
      userMessage,
    });
    this.store.endInFlight();

    if (!this.store.canCommit(session.fingerprint, generation)) return;

    if (!result.ok || !('chat' in result)) {
      if (!promptOverride) session.chatDraft = userMessage;
      this.store.lastEvent = 'chat_error';
      this.render();
      return;
    }

    session.chatDraft = '';
    session.chatHistory = [
      ...priorHistory,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: result.chat.answer },
    ];
    this.store.lastEvent = 'chat_ready';
    this.render();
  }

  getDiagnosticsPayload(): {
    extractionDiagnostics: OrthobulletsExtractionDiagnostics | null;
    pageContext: OrthobulletsPageContext | null;
    currentQuestionFingerprint: string | null;
    lifecycleDebug: ReturnType<QuestionSessionStore['buildDebug']>;
  } {
    const session = this.getActiveSession();
    return {
      extractionDiagnostics: null,
      pageContext: session?.payload ?? null,
      currentQuestionFingerprint: this.store.activeFingerprint,
      lifecycleDebug: this.store.buildDebug(),
    };
  }
}
