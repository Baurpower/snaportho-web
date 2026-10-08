// Non-mutating review-page readiness classification for Orthobullets.
//
// A completed review is only usable once every required signal agrees. This
// module classifies the current extraction into a reviewState and, on
// failure, returns structured diagnostics instead of guessing. It never
// clicks answers, submits forms, or calls Orthobullets answer handlers.

import type {
  OrthobulletsPageContext,
  OrthobulletsReviewDiagnostics,
  OrthobulletsReviewErrorCode,
  OrthobulletsReviewState,
} from './types.js';

export const REVIEW_READINESS_CONTRACT = 'orthobullets-review-readiness.v1' as const;

export type ReviewReadinessInput = Pick<
  OrthobulletsPageContext,
  | 'pageKind'
  | 'pageUrl'
  | 'questionId'
  | 'stem'
  | 'answerChoices'
  | 'selectedAnswerKey'
  | 'selectedAnswer'
  | 'correctAnswerKey'
  | 'correctAnswer'
  | 'explanationText'
  | 'explanation'
  | 'extractionWarnings'
  | 'questionReviewSignals'
  | 'raw'
>;

export type ReviewReadinessOptions = {
  expectedQuestionId?: string | null;
  /** Precomputed auth scan (the extractor supplies this from live DOM). */
  authFailure?: AuthFailureKind | null;
};

export type AuthFailureKind =
  | 'login_form'
  | 'logged_out_nav'
  | 'access_denied'
  | 'subscription_wall';

type DocumentLike = {
  querySelector(selector: string): ElementLike | null;
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
};

type ElementLike = {
  textContent: string | null;
  getAttribute(name: string): string | null;
};

const LOGIN_FORM_SELECTORS = [
  'form[action*="login" i]',
  'form[action*="signin" i]',
  'form[action*="sign-in" i]',
  'input[type="password"]',
];

const LOGGED_OUT_NAV_MARKERS = [
  'log in to view',
  'please log in',
  'please sign in',
  'sign in to continue',
];

const ACCESS_DENIED_MARKERS = [
  'access denied',
  'permission denied',
  'session expired',
  'not authorized',
];

const SUBSCRIPTION_MARKERS = [
  'peak premium subscribers only',
  'question locked',
  'subscribe to view',
  'premium subscription required',
];

function normalize(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeId(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase();
}

/** Scan live DOM for login/session walls. Pure read: no clicks, no input. */
export function detectAuthFailureKind(root: DocumentLike | null | undefined): AuthFailureKind | null {
  if (!root) return null;
  try {
    for (const selector of LOGIN_FORM_SELECTORS) {
      if (root.querySelector(selector)) return 'login_form';
    }
    const bodyText = normalize(
      root.querySelector('body')?.textContent ?? (root as unknown as ElementLike).textContent,
    );
    if (!bodyText) return null;
    if (LOGGED_OUT_NAV_MARKERS.some((marker) => bodyText.includes(marker))) return 'logged_out_nav';
    if (ACCESS_DENIED_MARKERS.some((marker) => bodyText.includes(marker))) return 'access_denied';
    if (SUBSCRIPTION_MARKERS.some((marker) => bodyText.includes(marker))) return 'subscription_wall';
  } catch {
    return null;
  }
  return null;
}

function hasStem(page: ReviewReadinessInput) {
  return Boolean(page.stem?.trim());
}

function choiceCount(page: ReviewReadinessInput) {
  return page.answerChoices?.length ?? 0;
}

function hasSelectedAnswer(page: ReviewReadinessInput) {
  return Boolean(page.selectedAnswerKey ?? page.selectedAnswer);
}

function hasCorrectAnswer(page: ReviewReadinessInput) {
  return Boolean(page.correctAnswerKey ?? page.correctAnswer);
}

function hasExplanation(page: ReviewReadinessInput) {
  const text = page.explanationText ?? page.explanation;
  return Boolean(text?.trim());
}

function reviewVisible(page: ReviewReadinessInput): boolean {
  const identity = page.raw?.providerSpecific?.sourceIdentity as
    | { reviewState?: string }
    | undefined;
  if (identity?.reviewState === 'answered_review') return true;
  return page.questionReviewSignals?.hasSubmittedAnswerState === true;
}

function isReviewPageKind(page: ReviewReadinessInput) {
  return page.pageKind === 'review' || page.pageKind === 'testview';
}

function hasUnansweredPrompt(page: ReviewReadinessInput) {
  return page.questionReviewSignals?.visibleUnansweredPrompt === true;
}

function hasDataCorrectSignal(page: ReviewReadinessInput): boolean {
  const warnings = page.extractionWarnings ?? [];
  // The extractor records correct_answer_not_visible whenever neither the
  // per-row review class nor the section-level data-correct attribute
  // resolved, so its absence alongside a correct key implies a real signal.
  if (hasCorrectAnswer(page) && !warnings.includes('correct_answer_not_visible')) return true;
  return reviewVisible(page) && hasCorrectAnswer(page);
}

/**
 * Ordered missing-field diagnostics for timeouts and safe failures.
 *
 * The learner's own selection is deliberately NOT required: search-sourced
 * questions the learner never attempted cannot have one, bare review URLs
 * don't render it, and the claim pipeline never consumes it (packet, source
 * hash, and server schema all exclude it). A missing selection stays visible
 * as the extractor's `selected_answer_not_visible` warning. Completion is
 * proven by the revealed correct answer + explanation instead.
 */
export function missingReviewFields(page: ReviewReadinessInput): string[] {
  const missing: string[] = [];
  if (!isReviewPageKind(page)) missing.push('pageKind:review');
  if (!normalizeId(page.questionId)) missing.push('questionId');
  if (!hasStem(page)) missing.push('stem');
  if (choiceCount(page) < 2) missing.push('answerChoices>=2');
  if (!hasCorrectAnswer(page)) missing.push('correctAnswerKey');
  if (!hasExplanation(page)) missing.push('explanationText');
  if (!reviewVisible(page)) missing.push('reviewVisible');
  return missing;
}

/**
 * Stable fingerprint for polling. Lengths and keys only, so two consecutive
 * matching fingerprints prove a settled DOM without comparing source prose.
 */
export function reviewReadinessFingerprint(page: ReviewReadinessInput): string {
  const explanationLength = (page.explanationText ?? page.explanation ?? '').trim().length;
  return [
    String(page.pageKind ?? ''),
    normalizeId(page.questionId),
    String((page.stem ?? '').trim().length),
    String(choiceCount(page)),
    normalize(page.selectedAnswerKey ?? ''),
    normalize(page.correctAnswerKey ?? ''),
    String(explanationLength),
    reviewVisible(page) ? '1' : '0',
  ].join('|');
}

function mismatchError(
  page: ReviewReadinessInput,
  expectedQuestionId: string | null,
  fingerprint: string,
): OrthobulletsReviewDiagnostics {
  return {
    state: 'not_completed',
    missingFields: ['questionId:match'],
    errorCode: 'orthobullets_question_mismatch',
    expectedQuestionId,
    extractedQuestionId: page.questionId ?? null,
    fingerprint,
    detail: `Review page shows ${page.questionId ?? 'no question'} but ${expectedQuestionId} was requested.`,
  };
}

/**
 * Classify one extraction. Precedence: auth wall > question mismatch >
 * unrevealed answer > ready > loading/not_completed.
 */
export function classifyReviewReadiness(
  page: ReviewReadinessInput,
  options: ReviewReadinessOptions = {},
): OrthobulletsReviewDiagnostics {
  const fingerprint = reviewReadinessFingerprint(page);
  const expectedQuestionId = normalizeId(options.expectedQuestionId) || null;
  const extractedQuestionId = normalizeId(page.questionId) || null;

  if (options.authFailure) {
    return {
      state: 'not_authenticated',
      missingFields: missingReviewFields(page),
      errorCode: 'orthobullets_login_required',
      expectedQuestionId,
      extractedQuestionId: page.questionId ?? null,
      fingerprint,
      detail: `Orthobullets session wall detected (${options.authFailure}). Log in and retry.`,
    };
  }

  if (expectedQuestionId && extractedQuestionId && expectedQuestionId !== extractedQuestionId) {
    return mismatchError(page, expectedQuestionId, fingerprint);
  }

  const stemAndChoices = hasStem(page) && choiceCount(page) >= 2;
  const revealed = hasExplanation(page) && hasDataCorrectSignal(page);
  // A completed review always carries the learner's selected answer, so
  // stem+choices with no selection yet is still rendering (loading), not
  // proof the answer needs revealing. The unrevealed state needs either the
  // explicit prompt or a selection whose correct answer never arrived.
  const unrevealedSignal =
    hasUnansweredPrompt(page) || (hasSelectedAnswer(page) && !hasCorrectAnswer(page));
  if (stemAndChoices && !revealed && unrevealedSignal) {
    const expected = expectedQuestionId ?? extractedQuestionId;
    return {
      state: 'answer_reveal_required',
      missingFields: missingReviewFields(page),
      errorCode: 'orthobullets_review_not_revealed',
      expectedQuestionId: expected,
      extractedQuestionId: page.questionId ?? null,
      fingerprint,
      detail:
        'The review answer is not revealed yet. Open the completed review through the ' +
        'test-results page; background processing never selects an answer.',
    };
  }

  const missing = missingReviewFields(page);
  if (!missing.length) {
    return {
      state: 'ready',
      missingFields: [],
      errorCode: null,
      expectedQuestionId,
      extractedQuestionId: page.questionId ?? null,
      fingerprint,
      detail: null,
    };
  }

  // Partial review DOM with no auth wall, no mismatch, and no unrevealed
  // prompt is still rendering: keep polling rather than failing.
  if (isReviewPageKind(page) || hasStem(page) || choiceCount(page) > 0) {
    return {
      state: 'loading',
      missingFields: missing,
      errorCode: null,
      expectedQuestionId,
      extractedQuestionId: page.questionId ?? null,
      fingerprint,
      detail: null,
    };
  }

  return {
    state: 'not_completed',
    missingFields: missing,
    errorCode: null,
    expectedQuestionId,
    extractedQuestionId: page.questionId ?? null,
    fingerprint,
    detail: 'No completed-review signals are visible on this page.',
  };
}

export function reviewTimeoutDiagnostics(
  page: ReviewReadinessInput | null,
  options: ReviewReadinessOptions & { attempts: number; timeoutMs: number },
): OrthobulletsReviewDiagnostics {
  const fingerprint = page ? reviewReadinessFingerprint(page) : 'no-extraction';
  return {
    state: 'loading',
    missingFields: page ? missingReviewFields(page) : ['extraction'],
    errorCode: 'orthobullets_review_load_timeout',
    expectedQuestionId: normalizeId(options.expectedQuestionId) || null,
    extractedQuestionId: page?.questionId ?? null,
    fingerprint,
    detail:
      `Review content did not settle within ${options.timeoutMs}ms ` +
      `(${options.attempts} extractions). No answer was selected.`,
  };
}

export function isReviewErrorCode(value: unknown): value is OrthobulletsReviewErrorCode {
  return (
    value === 'orthobullets_login_required' ||
    value === 'orthobullets_review_not_revealed' ||
    value === 'orthobullets_question_mismatch' ||
    value === 'orthobullets_review_load_timeout'
  );
}
