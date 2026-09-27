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

export type AnkiLinkField = { name: string; text: string };
export type AnkiSourcePage = {
  id: string;
  provider: 'orthobullets' | 'rock';
  canonical_url: string;
  source_url: string;
  title: string;
};
export type AnkiLinkCard = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  noteGuid: string;
  cardOrdinal: number;
  orderingKey: string;
  fields: AnkiLinkField[];
  linkedPageIds?: string[];
};
export type AnkiLinkedReviewCard =
  | (AnkiLinkCard & { available: true })
  | { canonicalCardId: string; available: false };

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
  questionChangeDetectedBy?: 'polling' | 'mutation' | 'url' | 'store' | 'manual';
  settleDelayMs?: number;
};

export type PageChangeMessage = {
  type: 'ob:page-changed';
  pageUrl: string;
  previousPageUrl: string | null;
  refreshTimestamp: string;
  detectedBy: 'polling' | 'url';
  tabId?: number | null;
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
  | { type: 'ob:get-active-page-state'; preferRegisteredHost?: boolean; preferredHostUrl?: string }
  | { type: 'ob:register-host-page' }
  | { type: 'ob:get-auth-state' }
  | { type: 'ob:start-link'; deviceName: string }
  | { type: 'ob:poll-link'; linkCode: string }
  | { type: 'ob:clear-link' }
  | { type: 'ob:anki-link-deck'; offset: number; search?: string }
  | { type: 'ob:anki-link-pages'; search?: string; provider?: 'orthobullets' | 'rock' }
  | { type: 'ob:anki-register-page'; provider: 'orthobullets' | 'rock'; url: string; title: string }
  | { type: 'ob:anki-card-links'; canonicalCardId: string }
  | { type: 'ob:anki-page-cards'; pageId: string }
  | { type: 'ob:anki-save-card-link'; canonicalCardId: string; pageId: string }
  | { type: 'ob:anki-remove-card-link'; canonicalCardId: string; pageId: string }
  | { type: 'ob:cancel-curriculum-stream'; streamRequestId: string }
  // `questionAttemptId` targets one specific AAOS Himalaya question instead of
  // whatever is on screen, so the review board can load any row on demand.
  | {
      type: 'ob:start-question-claim-run';
      testKey: string;
      questions: Array<{ nativeQuestionId: string; reviewLocator: string }>;
    }
  | {
      type: 'ob:extract-page-context';
      tabId: number;
      questionAttemptId?: number;
    }
  | {
      // Explicit only: never auto-runs while a learner is taking a test.
      // The page context is used transiently by the server to derive a
      // SnapOrtho-authored claim; protected source text is never persisted.
      type: 'ob:generate-question-claim';
      pageContext: OrthobulletsPageContext;
      runId?: string;
      runItemId?: string;
    }
  | {
      type: 'brobot:request';
      task: BroBotTask;
      pageContext: OrthobulletsPageContext;
      emphasis?: CurriculumExplainEmphasis;
      hintLevel?: 1 | 2 | 3;
      selectedAnswerKey?: string | null;
      priorHints?: Array<Pick<OrthobulletsHintResponse, 'hintLevel' | 'title' | 'hint'>>;
      streamRequestId?: string;
    }
  | {
      type: 'ob:hint';
      pageContext: OrthobulletsPageContext;
      hintLevel: 1 | 2 | 3;
      selectedAnswerKey?: string | null;
      priorHints?: Array<Pick<OrthobulletsHintResponse, 'hintLevel' | 'title' | 'hint'>>;
    }
  | {
      type: 'ob:explain';
      pageContext: OrthobulletsPageContext;
      emphasis?: CurriculumExplainEmphasis;
    }
  | {
      type: 'ob:chat';
      pageContext: OrthobulletsPageContext;
      explanation?: OrthobulletsExplainResponse;
      curriculumStudy?: CurriculumStudyResponse;
      answerState: 'unanswered' | 'answered_review';
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
    }
  | {
      type: 'ob:open-anki-launch';
      command: { noteGuid: string; cardOrdinal: number; rank: 1 | 2 | 3 };
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
  | 'model_unavailable'
  | 'all_chunks_failed'
  | 'synthesis_failed'
  | 'api_failure'
  | 'parse_failure'
  | 'extraction_failure'
  | 'network_failure'
  | 'unknown';

export type ExtensionMessageResponse =
  | { ok: true; buildInfo: ExtensionBuildInfo }
  | { ok: true; registeredHostTabId: number | null }
  | { ok: true; activePage: ActivePageState }
  | { ok: true; auth: AuthState }
  | { ok: true; link: LinkStartResult }
  | { ok: true; deviceToken: string }
  | {
      ok: true;
      pageContext: OrthobulletsPageContext;
      diagnostics: OrthobulletsExtractionDiagnostics;
    }
  | {
      ok: true;
      hint: OrthobulletsHintResponse;
      fetchDiagnostics?: ExtensionFetchDiagnostics;
    }
  | {
      ok: true;
      explanation: BrobotExplainResult;
      fetchDiagnostics?: ExtensionFetchDiagnostics;
    }
  | { ok: true; chat: OrthobulletsChatResponse }
  | { ok: true; topicTurn: OrthobulletsTopicTutorResponse }
  | { ok: true; cleared: true }
  | { ok: true; deck: { release: { id: string; version: string }; total: number; offset: number; cards: AnkiLinkCard[] } }
  | { ok: true; pages: AnkiSourcePage[] }
  | { ok: true; page: AnkiSourcePage }
  | { ok: true; links: Array<{ page: AnkiSourcePage | null }> }
  | { ok: true; cards: AnkiLinkedReviewCard[] }
  | { ok: true; saved: true }
  | { ok: true; removed: true }
  | { ok: true; questionClaimRun: { runId: string; algorithmVersion: string; items: Array<{ id: string; native_question_id: string; status: string; claim_id?: string | null; linked_card_count?: number; last_error_code?: string | null }> } }
  | { ok: true; questionClaim: { status: string; claimId?: string; claimVersionId?: string; nativeQuestionId?: string; reviewStatus?: string; reason?: string; gapRecorded?: boolean; cardCount?: number; runItemId?: string } }
  | { ok: true; launchQueued: { noteGuid: string; cardOrdinal: number; rank: 1 | 2 | 3 }; command?: unknown }
  | {
      ok: false;
      error: string;
      code?: ExtensionErrorCode;
      diagnostics?: OrthobulletsExtractionDiagnostics;
      fetchDiagnostics?: ExtensionFetchDiagnostics;
    };
