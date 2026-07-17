import type { QuestionRefreshSource } from '../shared/question-fingerprint.js';
import type { VisibleQuestionIdentity } from '../shared/messages.js';
import { fingerprintPartsFromPageContext } from '../shared/question-fingerprint.js';
import { inferQuestionState, resolveQuestionTutorPrimaryAction } from '../shared/page-classification.js';
import type {
  BrobotExplainResult,
  CurriculumStudyResponse,
  OrthobulletsChatTurn,
  OrthobulletsHintResponse,
  OrthobulletsPageContext,
} from '../shared/types.js';
import type { InferredQuestionState, QuestionTutorPrimaryAction } from '../shared/question-review-state.js';

export type ExtractionStatus = 'idle' | 'extracting' | 'ready' | 'error';
export type PrefetchStatus = 'idle' | 'prefetching' | 'ready' | 'error';
export type ReviewState = InferredQuestionState;
export type PrimaryAction = QuestionTutorPrimaryAction;
export type VisiblePanelMode = 'idle' | 'hint_open' | 'explanation_open' | 'chat_open';
export type RequestType = 'extraction' | 'hint' | 'explanation';

export type OrthobulletsQuestionPayload = OrthobulletsPageContext;

export type QuestionSession = {
  fingerprint: string;
  questionId?: string | null;
  testId?: string | null;
  questionNumber?: number;
  totalQuestions?: number;
  url: string;
  extractedAt: number;
  extractionStatus: ExtractionStatus;
  extractionError?: string;
  reviewState: ReviewState;
  primaryAction: PrimaryAction;
  payload?: OrthobulletsQuestionPayload;

  hintStatus: PrefetchStatus;
  hints: OrthobulletsHintResponse[];
  hintError?: string;
  hintErrorStatus?: number | null;
  hintErrorBody?: string | null;
  hintPayloadSummary?: string;
  currentHintIndex: number | null;
  hintOpenedForFingerprint: string | null;

  explanationStatus: PrefetchStatus;
  explanation?: BrobotExplainResult;
  curriculumStudy?: CurriculumStudyResponse | null;
  explanationError?: string;

  chatHistory: OrthobulletsChatTurn[];
  chatDraft: string;
  chatPrompts: string[];

  generation: number;
  questionPositionLabel?: string | null;
};

export type QuestionLifecycleDebug = {
  activeFingerprint: string | null;
  renderedSessionFingerprint: string | null;
  sessionCount: number;
  currentGeneration: number | null;
  extractionStatus: ExtractionStatus | null;
  hintStatus: PrefetchStatus | null;
  explanationStatus: PrefetchStatus | null;
  reviewState: ReviewState | null;
  primaryAction: PrimaryAction | null;
  visiblePanelMode: VisiblePanelMode;
  inFlightRequests: number;
  lastEvent: string;
  staleResponsesDiscarded: number;
  refreshSource: QuestionRefreshSource;
  questionId: string | null;
  questionNumber: number | null;
  stemHash: string | null;
  answerChoiceHash: string | null;
  imageHash: string | null;
  visibleUnansweredPrompt: boolean;
  unansweredOverrideApplied: boolean;
  reviewScore: number;
  unansweredScore: number;
  reviewEvidence: string[];
  unansweredEvidence: string[];
  visiblePreferredResponseActive: boolean;
  visiblePreferredResponseEnabled: boolean;
  visibleExplanationTextLength: number;
  visibleSelectedAnswerReviewClass: boolean;
  visibleCorrectAnswerReviewClass: boolean;
  visibleDistributionRows: number;
  hintErrorStatus: number | null;
  hintErrorBody: string | null;
  hintPayloadSummary: string | null;
  explanationRenderBlockedReason: string | null;
  lastExtractedAt: number | null;
  visibleQuestionIdentity: VisibleQuestionIdentity | null;
  previousVisibleQuestionIdentity: VisibleQuestionIdentity | null;
  activeQuestionKey: string | null;
  previousActiveQuestionKey: string | null;
  questionChangeDetectedBy: 'polling' | 'mutation' | 'url' | 'manual' | null;
  lastQuestionChangeAt: string | null;
  refreshSkippedReason: string | null;
  hintCount: number;
  currentHintIndex: number | null;
  hintButtonLabel: string;
  hintOpenedForFingerprint: string | null;
};

export type QuestionTutorViewState = {
  fingerprintAligned: boolean;
  showLoadingCurrentQuestion: boolean;
  session: QuestionSession | null;
  visiblePanelMode: VisiblePanelMode;
  primaryAction: PrimaryAction;
  reviewState: ReviewState;
  hintButtonLabel: string;
  hintButtonDisabled: boolean;
  explainButtonLabel: string;
  hintsToRender: OrthobulletsHintResponse[];
  explanationToRender: BrobotExplainResult | null;
  curriculumStudy: CurriculumStudyResponse | null;
  chatHistory: OrthobulletsChatTurn[];
  chatDraft: string;
  chatPrompts: string[];
  showHintCta: boolean;
  showExplainCta: boolean;
  showHintLoading: boolean;
  showExplanationLoading: boolean;
  debug: QuestionLifecycleDebug;
};

export function parseQuestionPositionLabel(label: string | null | undefined) {
  if (!label) return { questionNumber: undefined, totalQuestions: undefined };
  const match = label.match(/question\s+(\d+)\s+of\s+(\d+)/i);
  if (!match) return { questionNumber: undefined, totalQuestions: undefined };
  return {
    questionNumber: Number(match[1]),
    totalQuestions: Number(match[2]),
  };
}

export function createEmptyQuestionSession(fingerprint: string, url: string): QuestionSession {
  return {
    fingerprint,
    url,
    extractedAt: 0,
    extractionStatus: 'idle',
    reviewState: 'unknown',
    primaryAction: 'unavailable',
    hintStatus: 'idle',
    hints: [],
    currentHintIndex: null,
    hintOpenedForFingerprint: null,
    explanationStatus: 'idle',
    chatHistory: [],
    chatDraft: '',
    chatPrompts: [],
    generation: 1,
  };
}

export function quarantineExplanationForSession(session: QuestionSession) {
  session.explanationStatus = 'idle';
  session.explanation = undefined;
  session.curriculumStudy = null;
  session.explanationError = undefined;
}

function deriveHintButtonState(session: QuestionSession | null, visiblePanelMode: VisiblePanelMode) {
  if (!session) {
    return { label: 'Show Hint', disabled: false };
  }
  if (session.hintStatus === 'error') {
    return { label: 'Retry Hint', disabled: false };
  }
  if (visiblePanelMode !== 'hint_open') {
    return { label: 'Show Hint', disabled: false };
  }
  if (session.hintStatus === 'prefetching') {
    return { label: 'Preparing hint…', disabled: true };
  }
  if (session.currentHintIndex != null && session.currentHintIndex >= 2) {
    return { label: 'No more hints', disabled: true };
  }
  return { label: 'Next Hint', disabled: false };
}

function applyReviewStateInvariants(session: QuestionSession, reviewState: ReviewState) {
  session.reviewState = reviewState;
  if (reviewState === 'unanswered') {
    session.primaryAction = 'hint';
    quarantineExplanationForSession(session);
    return;
  }
  if (reviewState === 'answered_review') {
    session.primaryAction = 'explain';
    return;
  }
  session.primaryAction = resolveQuestionTutorPrimaryAction(session.payload ?? null);
}

export function canRenderExplanationForSession(
  session: QuestionSession,
  activeFingerprint: string | null,
  visiblePanelMode: VisiblePanelMode
): { allowed: boolean; blockedReason: string | null } {
  if (!activeFingerprint || session.fingerprint !== activeFingerprint) {
    return { allowed: false, blockedReason: 'fingerprint_mismatch' };
  }
  if (session.reviewState !== 'answered_review') {
    return { allowed: false, blockedReason: 'review_state_not_answered_review' };
  }
  if (visiblePanelMode !== 'explanation_open' && visiblePanelMode !== 'chat_open') {
    return { allowed: false, blockedReason: 'panel_mode_not_explanation_open' };
  }
  if (session.explanationStatus !== 'ready') {
    return { allowed: false, blockedReason: 'explanation_not_ready' };
  }
  if (!session.explanation) {
    return { allowed: false, blockedReason: 'missing_explanation_data' };
  }
  return { allowed: true, blockedReason: null };
}

export function applyPayloadToSession(session: QuestionSession, payload: OrthobulletsPageContext) {
  const reviewState = inferQuestionState(payload);
  session.payload = payload;
  session.questionId = payload.questionId ?? null;
  session.url = payload.pageUrl ?? payload.sourceUrl ?? session.url;
  session.extractedAt = Date.now();
  session.extractionStatus = 'ready';
  session.extractionError = undefined;
  applyReviewStateInvariants(session, reviewState);
}

export class QuestionSessionStore {
  private sessions = new Map<string, QuestionSession>();
  activeFingerprint: string | null = null;
  visiblePanelMode: VisiblePanelMode = 'idle';
  inFlightRequests = 0;
  lastEvent = 'init';
  staleResponsesDiscarded = 0;
  refreshSource: QuestionRefreshSource = 'automatic';
  visibleQuestionIdentity: VisibleQuestionIdentity | null = null;
  previousVisibleQuestionIdentity: VisibleQuestionIdentity | null = null;
  activeQuestionKey: string | null = null;
  previousActiveQuestionKey: string | null = null;
  questionChangeDetectedBy: 'polling' | 'mutation' | 'url' | 'manual' | null = null;
  lastQuestionChangeAt: string | null = null;
  refreshSkippedReason: string | null = null;

  getSessionCount() {
    return this.sessions.size;
  }

  getSession(fingerprint: string) {
    return this.sessions.get(fingerprint) ?? null;
  }

  getRenderableSession(): QuestionSession | null {
    if (!this.activeFingerprint) return null;
    const session = this.sessions.get(this.activeFingerprint);
    if (!session || session.fingerprint !== this.activeFingerprint) return null;
    return session;
  }

  activateFingerprint(
    fingerprint: string,
    init: {
      url: string;
      questionId?: string | null;
      questionPositionLabel?: string | null;
      resetVisiblePanel?: boolean;
    }
  ): QuestionSession {
    this.activeFingerprint = fingerprint;
    if (init.resetVisiblePanel !== false) {
      this.visiblePanelMode = 'idle';
    }
    this.lastEvent = 'activate_fingerprint';

    let session = this.sessions.get(fingerprint);
    if (!session) {
      session = createEmptyQuestionSession(fingerprint, init.url);
      this.sessions.set(fingerprint, session);
    }

    session.url = init.url;
    session.questionId = init.questionId ?? session.questionId ?? null;
    session.questionPositionLabel = init.questionPositionLabel ?? session.questionPositionLabel ?? null;
    const position = parseQuestionPositionLabel(session.questionPositionLabel);
    session.questionNumber = position.questionNumber;
    session.totalQuestions = position.totalQuestions;

    return session;
  }

  bumpGeneration(fingerprint: string) {
    const session = this.sessions.get(fingerprint);
    if (!session) return 0;
    session.generation += 1;
    session.hintStatus = 'idle';
    session.hints = [];
    session.hintError = undefined;
    session.currentHintIndex = null;
    session.hintOpenedForFingerprint = null;
    session.explanationStatus = 'idle';
    session.explanation = undefined;
    session.curriculumStudy = null;
    session.explanationError = undefined;
    session.extractionStatus = 'idle';
    session.extractionError = undefined;
    this.visiblePanelMode = 'idle';
    this.lastEvent = 'bump_generation';
    return session.generation;
  }

  canCommit(fingerprint: string, generation: number) {
    if (this.activeFingerprint !== fingerprint) {
      this.staleResponsesDiscarded += 1;
      this.lastEvent = 'stale_response_discarded:fingerprint';
      return false;
    }
    const session = this.sessions.get(fingerprint);
    if (!session || session.generation !== generation) {
      this.staleResponsesDiscarded += 1;
      this.lastEvent = 'stale_response_discarded:generation';
      return false;
    }
    return true;
  }

  beginInFlight() {
    this.inFlightRequests += 1;
  }

  endInFlight() {
    this.inFlightRequests = Math.max(0, this.inFlightRequests - 1);
  }

  buildDebug(explanationRenderBlockedReason: string | null = null): QuestionLifecycleDebug {
    const session = this.getRenderableSession();
    const fingerprintParts = session?.payload ? fingerprintPartsFromPageContext(session.payload) : null;
    const signals = session?.payload?.questionReviewSignals;
    const hintButton = deriveHintButtonState(session, this.visiblePanelMode);
    return {
      activeFingerprint: this.activeFingerprint,
      renderedSessionFingerprint: session?.fingerprint ?? null,
      sessionCount: this.sessions.size,
      currentGeneration: session?.generation ?? null,
      extractionStatus: session?.extractionStatus ?? null,
      hintStatus: session?.hintStatus ?? null,
      explanationStatus: session?.explanationStatus ?? null,
      reviewState: session?.reviewState ?? null,
      primaryAction: session?.primaryAction ?? null,
      visiblePanelMode: this.visiblePanelMode,
      inFlightRequests: this.inFlightRequests,
      lastEvent: this.lastEvent,
      staleResponsesDiscarded: this.staleResponsesDiscarded,
      refreshSource: this.refreshSource,
      questionId: session?.questionId ?? null,
      questionNumber: session?.questionNumber ?? null,
      stemHash: fingerprintParts?.stemHash ?? null,
      answerChoiceHash: fingerprintParts?.answerChoiceHash ?? null,
      imageHash: fingerprintParts?.imageHash ?? null,
      visibleUnansweredPrompt: signals?.visibleUnansweredPrompt ?? false,
      unansweredOverrideApplied: signals?.unansweredOverrideApplied ?? false,
      reviewScore: signals?.reviewScore ?? 0,
      unansweredScore: signals?.unansweredScore ?? 0,
      reviewEvidence: signals?.reviewEvidence ?? [],
      unansweredEvidence: signals?.unansweredEvidence ?? [],
      visiblePreferredResponseActive: signals?.visiblePreferredResponseActive ?? false,
      visiblePreferredResponseEnabled: signals?.visiblePreferredResponseEnabled ?? false,
      visibleExplanationTextLength: signals?.visibleExplanationTextLength ?? 0,
      visibleSelectedAnswerReviewClass: signals?.visibleSelectedAnswerReviewClass ?? false,
      visibleCorrectAnswerReviewClass: signals?.visibleCorrectAnswerReviewClass ?? false,
      visibleDistributionRows: signals?.visibleDistributionRows ?? 0,
      hintErrorStatus: session?.hintErrorStatus ?? null,
      hintErrorBody: session?.hintErrorBody ?? null,
      hintPayloadSummary: session?.hintPayloadSummary ?? null,
      explanationRenderBlockedReason,
      lastExtractedAt: session?.extractedAt ?? null,
      visibleQuestionIdentity: this.visibleQuestionIdentity,
      previousVisibleQuestionIdentity: this.previousVisibleQuestionIdentity,
      activeQuestionKey: this.activeQuestionKey,
      previousActiveQuestionKey: this.previousActiveQuestionKey,
      questionChangeDetectedBy: this.questionChangeDetectedBy,
      lastQuestionChangeAt: this.lastQuestionChangeAt,
      refreshSkippedReason: this.refreshSkippedReason,
      hintCount: session?.hints.length ?? 0,
      currentHintIndex: session?.currentHintIndex ?? null,
      hintButtonLabel: hintButton.label,
      hintOpenedForFingerprint: session?.hintOpenedForFingerprint ?? null,
    };
  }

  deriveViewState(): QuestionTutorViewState {
    const session = this.getRenderableSession();
    const fingerprintAligned = Boolean(
      this.activeFingerprint && session && session.fingerprint === this.activeFingerprint
    );

    const showLoadingCurrentQuestion =
      !fingerprintAligned ||
      !session ||
      session.extractionStatus === 'extracting' ||
      session.extractionStatus === 'idle';

    const primaryAction = session?.primaryAction ?? 'unavailable';
    const reviewState = session?.reviewState ?? 'unknown';

    const showHintCta =
      fingerprintAligned &&
      !showLoadingCurrentQuestion &&
      reviewState === 'unanswered' &&
      primaryAction === 'hint';
    const showExplainCta =
      fingerprintAligned &&
      !showLoadingCurrentQuestion &&
      reviewState === 'answered_review' &&
      primaryAction === 'explain';

    let hintsToRender: OrthobulletsHintResponse[] = [];
    let explanationToRender: BrobotExplainResult | null = null;
    let chatHistory: OrthobulletsChatTurn[] = [];
    let chatDraft = '';
    let chatPrompts: string[] = [];
    let showHintLoading = false;
    let showExplanationLoading = false;
    let explanationRenderBlockedReason: string | null = null;

    if (fingerprintAligned && session && !showLoadingCurrentQuestion) {
      if (this.visiblePanelMode === 'hint_open') {
        if (session.hintStatus === 'prefetching') showHintLoading = true;
        if (session.currentHintIndex != null) {
          hintsToRender = session.hints.slice(0, session.currentHintIndex + 1);
        }
      }

      const explanationRender = canRenderExplanationForSession(
        session,
        this.activeFingerprint,
        this.visiblePanelMode
      );
      explanationRenderBlockedReason = explanationRender.blockedReason;
      if (explanationRender.allowed && session.explanation) {
        explanationToRender = session.explanation;
        chatHistory = [...session.chatHistory];
        chatDraft = session.chatDraft;
        chatPrompts = [...session.chatPrompts];
      }
      if (
        (this.visiblePanelMode === 'explanation_open' || this.visiblePanelMode === 'chat_open') &&
        session.explanationStatus === 'prefetching'
      ) {
        showExplanationLoading = true;
      }
    } else if (session && session.reviewState !== 'answered_review' && session.explanation) {
      explanationRenderBlockedReason = 'review_state_not_answered_review';
    }

    const hintButton = deriveHintButtonState(session, this.visiblePanelMode);

    const explainButtonLabel = !session
      ? 'Explain with BroBot'
      : session.explanationStatus === 'prefetching'
        ? 'Preparing explanation...'
        : 'Explain with BroBot';

    return {
      fingerprintAligned,
      showLoadingCurrentQuestion,
      session,
      visiblePanelMode: this.visiblePanelMode,
      primaryAction,
      reviewState,
      hintButtonLabel: hintButton.label,
      hintButtonDisabled: hintButton.disabled,
      explainButtonLabel,
      hintsToRender,
      explanationToRender,
      curriculumStudy: session?.curriculumStudy ?? null,
      chatHistory,
      chatDraft,
      chatPrompts,
      showHintCta,
      showExplainCta,
      showHintLoading,
      showExplanationLoading,
      debug: this.buildDebug(explanationRenderBlockedReason),
    };
  }
}
