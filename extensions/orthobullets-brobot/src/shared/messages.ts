import type {
  BrobotExplainResult,
  CurriculumExplainEmphasis,
  CurriculumStudyResponse,
  OrthobulletsChatResponse,
  OrthobulletsChatTurn,
  OrthobulletsExplainResponse,
  OrthobulletsExtractionDiagnostics,
  ExtensionFetchDiagnostics,
  OrthobulletsHintResponse,
  OrthobulletsPageContext,
  OrthobulletsTopicAction,
  OrthobulletsTopicProgress,
  OrthobulletsTopicTutorResponse,
  OrthobulletsTopicTutorTurn,
  ProviderDetectionStatus,
  QuestionProvider,
} from './types.js';
import type { BroBotTask } from './brobot-routing.js';
import type { ExtensionBuildInfo } from './build-info.js';

export type ActivePageState = {
  tabId: number | null;
  url: string | null;
  title: string | null;
  supported: boolean;
  provider: QuestionProvider | null;
  detectionStatus: ProviderDetectionStatus;
};

export type AuthState = {
  status: 'linked' | 'unlinked';
  deviceToken?: string;
};

export type LinkStartResult = {
  linkCode: string;
  approvalUrl: string;
  expiresAt: string;
};

export type QuestionChangeMessage = {
  type: 'ob:question-changed';
  fingerprint: string;
  questionId: string | null;
  previousFingerprint: string | null;
  previousQuestionId: string | null;
  reasonForRefresh: string;
  refreshTimestamp: string;
  questionPositionLabel: string | null;
  pageUrl: string;
  tabId?: number;
  visibleQuestionIdentity?: VisibleQuestionIdentity | null;
  previousVisibleQuestionIdentity?: VisibleQuestionIdentity | null;
  activeQuestionKey?: string | null;
  previousActiveQuestionKey?: string | null;
  questionChangeDetectedBy?: 'polling' | 'mutation' | 'url' | 'manual';
  settleDelayMs?: number;
};

export type VisibleQuestionIdentity = {
  questionPositionLabel: string | null;
  questionNumber: number | null;
  questionId: string | null;
  testId: string | null;
  day: string | null;
  stemHash: string;
  answerChoiceHash: string;
  imageHash: string;
};

export type ExtensionMessage =
  | { type: 'ob:get-build-info' }
  | { type: 'ob:get-active-page-state' }
  | { type: 'ob:get-auth-state' }
  | { type: 'ob:start-link'; deviceName: string }
  | { type: 'ob:poll-link'; linkCode: string }
  | { type: 'ob:clear-link' }
  // `questionAttemptId` targets one specific AAOS Himalaya question instead of
  // whatever is on screen, so the review board can load any row on demand.
  | { type: 'ob:extract-page-context'; tabId: number; questionAttemptId?: number }
  | {
      type: 'brobot:request';
      task: BroBotTask;
      pageContext: OrthobulletsPageContext;
      emphasis?: CurriculumExplainEmphasis;
      hintLevel?: 1 | 2 | 3;
      selectedAnswerKey?: string | null;
    }
  | {
      type: 'ob:hint';
      pageContext: OrthobulletsPageContext;
      hintLevel: 1 | 2 | 3;
      selectedAnswerKey?: string | null;
    }
  | { type: 'ob:explain'; pageContext: OrthobulletsPageContext; emphasis?: CurriculumExplainEmphasis }
  | {
      type: 'ob:chat';
      pageContext: OrthobulletsPageContext;
      explanation?: OrthobulletsExplainResponse;
      curriculumStudy?: CurriculumStudyResponse;
      emphasis?: CurriculumExplainEmphasis;
      history: OrthobulletsChatTurn[];
      userMessage: string;
    }
  | {
      type: 'ob:topic-tutor-turn';
      pageContext: OrthobulletsPageContext;
      action?: OrthobulletsTopicAction;
      progress: OrthobulletsTopicProgress;
      history: OrthobulletsTopicTutorTurn[];
      userMessage?: string;
    };

// Stable error codes surfaced to the side panel so it can render a specific
// UI state (and, where relevant, a retry path) instead of a raw message.
export type ExtensionErrorCode =
  | 'unsupported_page'
  | 'not_linked'
  | 'quota_exceeded'
  | 'disabled'
  | 'invalid_request'
  | 'invalid_curriculum_request'
  | 'invalid_request_shape'
  | 'client_contract_validation_failed'
  | 'extension_update_required'
  | 'curriculum_content_missing'
  | 'curriculum_content_too_large'
  | 'unsupported_provider'
  | 'api_failure'
  | 'parse_failure'
  | 'extraction_failure'
  | 'network_failure'
  | 'unknown';

export type ExtensionMessageResponse =
  | { ok: true; buildInfo: ExtensionBuildInfo }
  | { ok: true; activePage: ActivePageState }
  | { ok: true; auth: AuthState }
  | { ok: true; link: LinkStartResult }
  | { ok: true; deviceToken: string }
  | { ok: true; pageContext: OrthobulletsPageContext; diagnostics: OrthobulletsExtractionDiagnostics }
  | { ok: true; hint: OrthobulletsHintResponse; fetchDiagnostics?: ExtensionFetchDiagnostics }
  | { ok: true; explanation: BrobotExplainResult; fetchDiagnostics?: ExtensionFetchDiagnostics }
  | { ok: true; chat: OrthobulletsChatResponse }
  | { ok: true; topicTurn: OrthobulletsTopicTutorResponse }
  | { ok: true; cleared: true }
  | { ok: false; error: string; code?: ExtensionErrorCode; diagnostics?: OrthobulletsExtractionDiagnostics; fetchDiagnostics?: ExtensionFetchDiagnostics };
