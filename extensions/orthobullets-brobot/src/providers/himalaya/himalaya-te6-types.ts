// Shapes returned by the AAOS te6 (mycrowdwisdom) assessment engine.
//
// Two sources feed these types:
//   1. The AngularJS scope, read by the MAIN-world bridge (`himalaya-bridge.ts`).
//   2. The te6 REST API under /diweb/ws/rest/te/tracking (`himalaya-api.ts`).
//
// Both are treated as untrusted input: every field is optional and validated at
// the boundary, because AAOS can change the payload without notice.

export const HIMALAYA_BRIDGE_MESSAGE_SOURCE = 'snaportho-brobot-himalaya-bridge' as const;
export const HIMALAYA_REST_BASE_PATH = '/diweb/ws/rest/te/tracking' as const;

/** `te.questionResults[]` on the results page scope. */
export type Te6QuestionResult = {
  index?: number;
  /** 'CORRECT' | 'INCORRECT' | null when unanswered. */
  result?: string | null;
  questionAttemptId?: number;
  questionId?: number;
  marked?: boolean;
};

/** One answer choice as returned by the REST API. */
export type Te6Answer = {
  id?: number;
  /** HTML string. */
  text?: string;
  number?: number;
  displayOrder?: number;
  displayNumber?: string;
  correctResponse?: boolean;
  selectedFlag?: boolean;
};

export type Te6Question = {
  questionAttemptId?: number;
  type?: string;
  /** HTML string. */
  stem?: string;
  answers?: Te6Answer[];
  selectedAnswer?: number | null;
  selectedAnswers?: number[];
  displayOrder?: number;
  markForReview?: boolean;
  medias?: Array<{ url?: string; thumbnailUrl?: string; description?: string; name?: string; type?: string }>;
  tags?: string[];
};

export type Te6Remediation = {
  /** HTML string. AAOS surfaces this under a tab labelled "Discussion". */
  feedback?: string;
  /** HTML string. AAOS surfaces this under a tab labelled "Recommended Readings". */
  reference?: string;
  keyReferencePoints?: string;
  correctResponse?: boolean;
  correctAnswerIds?: number[];
  averagePeerPercent?: number;
  requireManualGrading?: boolean;
  partiallyCorrect?: boolean;
  additionalFeedbacks?: Array<{ title?: string; description?: string }>;
};

/** One element of the POST /all-question-attempts/ response array. */
export type Te6QuestionAttempt = {
  question?: Te6Question;
  remediation?: Te6Remediation;
  showCorrectAnswer?: boolean;
};

/**
 * What the MAIN-world bridge publishes to the isolated world. `testAttemptId`
 * and `archived` exist ONLY on the Angular scope, never in the DOM, which is
 * the entire reason the bridge has to exist.
 */
export type HimalayaBridgeState = {
  bridgeVersion: string;
  pageUrl: string;
  /** 'results' when the score/tile view is up, 'question' during a live attempt. */
  view: 'results' | 'question' | 'unknown';
  testAttemptId: number | null;
  archived: boolean;
  assessmentTitle: string | null;
  score: number | null;
  maxScore: number | null;
  questionResults: Te6QuestionResult[];
  /** Present only while a review modal is open. */
  openModal: {
    currentIndex: number | null;
    total: number | null;
    questionAttemptId: number | null;
  } | null;
  /** The in-progress question during a live attempt (te.questions[0]). */
  liveQuestion: {
    question: Te6Question;
    remediation: Te6Remediation | null;
    showCorrectAnswer: boolean;
    displayIndex: number | null;
    totalQuestions: number | null;
  } | null;
};

export type HimalayaBridgeMessage = {
  source: typeof HIMALAYA_BRIDGE_MESSAGE_SOURCE;
  type: 'te-state';
  state: HimalayaBridgeState;
};

export function isHimalayaBridgeMessage(value: unknown): value is HimalayaBridgeMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<HimalayaBridgeMessage>;
  return candidate.source === HIMALAYA_BRIDGE_MESSAGE_SOURCE && candidate.type === 'te-state' && Boolean(candidate.state);
}
