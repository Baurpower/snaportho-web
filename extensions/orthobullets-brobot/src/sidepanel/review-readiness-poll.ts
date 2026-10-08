// Readiness polling for hidden review tabs. Repeatedly extracts until every
// required signal agrees and the fingerprint is stable across two
// consecutive extractions. Read-only: this module never clicks answers,
// submits forms, or calls Orthobullets answer handlers.

import {
  classifyReviewReadiness,
  reviewTimeoutDiagnostics,
  type ReviewReadinessInput,
} from '../shared/review-readiness.js';
import type { OrthobulletsReviewDiagnostics } from '../shared/types.js';

export const REVIEW_POLL_INTERVAL_MS = 300;
export const REVIEW_POLL_TIMEOUT_MS = 10_000;
export const REVIEW_POLL_STABLE_MATCHES = 2;

export type ReviewExtractResult =
  | { ok: true; page: ReviewReadinessInput }
  | { ok: false; error: string };

export type ReviewPollOptions = {
  expectedQuestionId?: string | null;
  pollIntervalMs?: number;
  timeoutMs?: number;
  stableMatches?: number;
  /** Resolved by the caller (side panel message round-trip). Read-only. */
  extract: () => Promise<ReviewExtractResult>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /**
   * Optional early-wake hook. The caller resolves it when a content-script
   * mutation notification arrives for this tab, so polling reacts without
   * waiting for the next interval. Resolving early never skips extraction.
   */
  waitForWake?: (timeoutMs: number) => Promise<void>;
};

export class ReviewReadinessError extends Error {
  diagnostics: OrthobulletsReviewDiagnostics;
  attempts: number;

  constructor(diagnostics: OrthobulletsReviewDiagnostics, attempts: number) {
    super(diagnostics.detail ?? diagnostics.errorCode ?? 'Review is not ready.');
    this.name = 'ReviewReadinessError';
    this.diagnostics = diagnostics;
    this.attempts = attempts;
  }
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function waitForCompletedReviewContext(
  options: ReviewPollOptions,
): Promise<{ page: ReviewReadinessInput; diagnostics: OrthobulletsReviewDiagnostics; attempts: number }> {
  const pollIntervalMs = options.pollIntervalMs ?? REVIEW_POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? REVIEW_POLL_TIMEOUT_MS;
  const stableMatches = options.stableMatches ?? REVIEW_POLL_STABLE_MATCHES;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? (() => Date.now());
  const startedAt = now();

  let attempts = 0;
  let lastFingerprint: string | null = null;
  let stableCount = 0;
  let lastPage: ReviewReadinessInput | null = null;
  let lastDiagnostics: OrthobulletsReviewDiagnostics | null = null;

  for (;;) {
    const extracted = await options.extract();
    attempts += 1;
    if (!extracted.ok) {
      lastFingerprint = null;
      stableCount = 0;
    } else {
      lastPage = extracted.page;
      lastDiagnostics = classifyReviewReadiness(extracted.page, {
        expectedQuestionId: options.expectedQuestionId ?? null,
      });
      // Trust the extractor's DOM-level failure scan: auth walls and
      // unrevealed prompts are detected from live DOM the poll cannot
      // re-derive from extracted fields alone. A question mismatch still
      // takes precedence because the extractor never knew the expected id.
      const attached = (extracted.page as { reviewDiagnostics?: OrthobulletsReviewDiagnostics }).reviewDiagnostics;
      if (
        lastDiagnostics.errorCode !== 'orthobullets_question_mismatch' &&
        attached &&
        (attached.state === 'not_authenticated' || attached.state === 'answer_reveal_required')
      ) {
        lastDiagnostics = {
          ...attached,
          expectedQuestionId: options.expectedQuestionId ?? attached.expectedQuestionId,
        };
      }
      if (
        lastDiagnostics.state === 'answer_reveal_required' ||
        lastDiagnostics.state === 'not_authenticated' ||
        (lastDiagnostics.state === 'not_completed' && lastDiagnostics.errorCode)
      ) {
        throw new ReviewReadinessError(lastDiagnostics, attempts);
      }
      if (lastDiagnostics.state === 'ready') {
        if (lastDiagnostics.fingerprint === lastFingerprint) {
          stableCount += 1;
        } else {
          stableCount = 1;
          lastFingerprint = lastDiagnostics.fingerprint;
        }
        if (stableCount >= stableMatches) {
          return { page: extracted.page, diagnostics: lastDiagnostics, attempts };
        }
      } else {
        lastFingerprint = lastDiagnostics.fingerprint;
        stableCount = 0;
      }
    }

    if (now() - startedAt >= timeoutMs) {
      throw new ReviewReadinessError(
        reviewTimeoutDiagnostics(lastPage, {
          expectedQuestionId: options.expectedQuestionId ?? null,
          attempts,
          timeoutMs,
        }),
        attempts,
      );
    }
    if (options.waitForWake) {
      await options.waitForWake(pollIntervalMs);
    } else {
      await sleep(pollIntervalMs);
    }
  }
}
