/**
 * Transient v5 claim processor for browser-driven Orthobullets reviews.
 *
 * The extension opens the exact results-page review URL in an inactive tab,
 * polls for review readiness, and POSTs the ready page. This module converts
 * that ready context into a transient source packet and executes it through
 * the SAME v5 production machinery as the file-driven runner (identity,
 * generate, review, repair, validate, resolution, atomic persist). There is
 * exactly one persistence implementation; transient runs inherit its
 * guarantees instead of forking them.
 *
 * Only durable data persists: model-authored claims, links, hashes,
 * diagnostics, and model usage. Raw source text (stem, choices, correct
 * answer, explanation, page HTML) never crosses the persistence boundary,
 * and the raw packet is released after the request completes.
 */

import { OB_PROD_ALGORITHM, OB_PROD_PROMPT_SET } from './claim-extraction-contract-v1';
import { sourceContentHashV5, type ObSourcePacketV5 } from './claim-extractor-v5';
import type { TransientClaim, TransientProductionRun } from './transient-production-runner';

export const TRANSIENT_CLAIM_PROCESSOR_VERSION = 'orthobullets-transient-claims.v1' as const;

export type TransientQuestionInput = {
  nativeQuestionId: string;
  reviewLocator: string;
  packet: ObSourcePacketV5;
};

export type DurableTransientResult = {
  processorVersion: typeof TRANSIENT_CLAIM_PROCESSOR_VERSION;
  algorithmVersion: typeof OB_PROD_ALGORITHM;
  promptSetVersion: typeof OB_PROD_PROMPT_SET;
  nativeQuestionId: string;
  reviewLocator: string;
  sourceHash: string;
  status:
    | 'accepted'
    | 'ai_review_unresolved'
    | 'skipped_completed'
    | 'identity_unresolved'
    | 'identity_conflict'
    | 'failed_transient';
  /** Model-authored claims re-read from durable candidates. Never source prose. */
  claims: TransientClaim[];
  usageTotals: { promptTokens: number; completionTokens: number; estimatedCostUsd: number };
  diagnostics: string[];
  completedAttemptId: string | null;
  processedAt: string;
};

export type TransientProcessorDb = {
  findCompletedExtraction: (
    nativeQuestionId: string,
    sourceHash: string,
  ) => Promise<{ attemptId: string } | null>;
  runProductionSingle: (input: {
    nativeQuestionId: string;
    packet: ObSourcePacketV5;
    reviewLocator: string;
    sourceHash: string;
  }) => Promise<TransientProductionRun>;
};

export type TransientProcessorDeps = {
  db: TransientProcessorDb;
  now?: () => string;
};

export type PageLikeForPacket = {
  stem?: string;
  answerChoices: Array<{ key?: string; label?: string | null; text?: string }>;
  correctAnswer?: string | null;
  explanationText?: string | null;
  explanation?: string | null;
  breadcrumbs?: string[];
  title?: string | null;
};

/** Pure converter: ready page context -> transient v5 source packet. */
export function transientPacketFromPageContext(page: PageLikeForPacket): ObSourcePacketV5 {
  return {
    stem: page.stem ?? '',
    answerChoices: (page.answerChoices ?? []).map((choice) => ({
      key: String(choice.key ?? choice.label ?? ''),
      text: String(choice.text ?? ''),
    })),
    correctAnswer: page.correctAnswer ?? null,
    explanationText: page.explanationText ?? page.explanation ?? null,
    topicHints: [...(page.breadcrumbs ?? []), page.title ?? '']
      .map((hint) => String(hint).trim())
      .filter(Boolean),
  };
}

function sanitizeReviewLocator(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('review_locator_must_be_https');
  if (!/(^|\.)orthobullets\.com$/i.test(url.hostname)) throw new Error('review_locator_must_be_orthobullets');
  url.hash = '';
  return url.toString();
}

/** Best-effort release: blank the transient source fields after completion. */
export function releaseTransientPacket(packet: ObSourcePacketV5): void {
  packet.stem = '';
  for (const choice of packet.answerChoices) {
    choice.key = '';
    choice.text = '';
  }
  packet.answerChoices = [];
  packet.correctAnswer = null;
  packet.explanationText = null;
  packet.topicHints = [];
}

function sourceFieldValues(packet: ObSourcePacketV5): string[] {
  return [
    packet.stem,
    ...packet.answerChoices.flatMap((choice) => [choice.key, choice.text]),
    packet.correctAnswer ?? '',
    packet.explanationText ?? '',
    ...packet.topicHints,
  ].filter((value) => value.trim().length >= 24);
}

/**
 * Persistence-boundary guard for durable RESULT metadata (hashes, ids,
 * locators, diagnostics, usage). Claim texts are excluded: they are
 * model-authored outputs governed by review gates and DB CHECK constraints.
 * Throws before any write when a source field leaks into durable metadata.
 */
export function assertDurableResultClean(durable: DurableTransientResult, packet: ObSourcePacketV5): void {
  const serialized = JSON.stringify({ ...durable, claims: [] }) ?? '';
  for (const field of sourceFieldValues(packet)) {
    if (serialized.includes(field)) {
      throw new Error('transient_source_text_at_persistence_boundary');
    }
  }
}

export async function processTransientOrthobulletsQuestion(
  input: TransientQuestionInput,
  deps: TransientProcessorDeps,
): Promise<{ durable: DurableTransientResult }> {
  const now = deps.now ?? (() => new Date().toISOString());

  try {
    const reviewLocator = sanitizeReviewLocator(input.reviewLocator);

    // 1. Compute the source hash.
    const sourceHash = sourceContentHashV5(input.packet);

    // 2. Skip source hashes already completed (restart-safe).
    const completed = await deps.db.findCompletedExtraction(input.nativeQuestionId, sourceHash);
    if (completed) {
      const durable: DurableTransientResult = {
        processorVersion: TRANSIENT_CLAIM_PROCESSOR_VERSION,
        algorithmVersion: OB_PROD_ALGORITHM,
        promptSetVersion: OB_PROD_PROMPT_SET,
        nativeQuestionId: input.nativeQuestionId,
        reviewLocator,
        sourceHash,
        status: 'skipped_completed',
        claims: [],
        usageTotals: { promptTokens: 0, completionTokens: 0, estimatedCostUsd: 0 },
        diagnostics: [],
        completedAttemptId: completed.attemptId,
        processedAt: now(),
      };
      assertDurableResultClean(durable, input.packet);
      return { durable };
    }

    // 3+4. Execute the production pipeline (generate, review, repair,
    // validate, resolve) and persist atomically (events, candidates,
    // decisions, resolutions, claims, links) through the shared seam.
    const run = await deps.db.runProductionSingle({
      nativeQuestionId: input.nativeQuestionId,
      packet: input.packet,
      reviewLocator,
      sourceHash,
    });
    const status: DurableTransientResult['status'] =
      run.outcome === 'adopted' ? 'skipped_completed'
      : run.outcome === 'accepted' ? 'accepted'
      : run.outcome === 'unresolved' ? 'ai_review_unresolved'
      : run.outcome === 'identity_unresolved' ? 'identity_unresolved'
      : run.outcome === 'identity_conflict' ? 'identity_conflict'
      : 'failed_transient';
    const diagnostics = [
      ...(run.diagnostic ? [run.diagnostic] : []),
      ...run.reasonCodes,
    ].filter((code, index, all) => code && all.indexOf(code) === index).slice(0, 8);
    const durable: DurableTransientResult = {
      processorVersion: TRANSIENT_CLAIM_PROCESSOR_VERSION,
      algorithmVersion: OB_PROD_ALGORITHM,
      promptSetVersion: OB_PROD_PROMPT_SET,
      nativeQuestionId: input.nativeQuestionId,
      reviewLocator,
      sourceHash,
      status,
      claims: run.claims,
      usageTotals: {
        promptTokens: run.promptTokens,
        completionTokens: run.completionTokens,
        estimatedCostUsd: run.estimatedCostUsd,
      },
      diagnostics,
      completedAttemptId: status === 'skipped_completed' ? run.attemptId : null,
      processedAt: now(),
    };
    assertDurableResultClean(durable, input.packet);
    return { durable };
  } finally {
    // 5. Release the raw packet after the request completes.
    releaseTransientPacket(input.packet);
  }
}
