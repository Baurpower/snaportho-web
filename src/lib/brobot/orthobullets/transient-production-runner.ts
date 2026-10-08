/**
 * Single-question v5 production execution for transient (browser-driven)
 * reviews.
 *
 * Runs one ready review through the SAME production machinery as the
 * file-driven runner (identity, generate/review/repair/validate, resolution,
 * atomic persist, completion) via runObProduction in single-packet mode.
 * There is exactly one persistence implementation; transient runs inherit
 * its guarantees instead of forking them.
 *
 * The boundary scan wraps persistExtraction: the persist envelope's
 * structural fields (identity, locators, versions, diagnostics, usage) must
 * never echo source prose. Candidate claim texts are model-authored outputs
 * and are excluded from the scan (they are governed by review gates and DB
 * CHECK constraints instead).
 */
import { createHash } from 'node:crypto';

import { sourceContentHashV5, type ObSourcePacketV5 } from './claim-extractor-v5';
import {
  runObProduction,
  type ObRunnerConfig,
  type ObRunnerItemReport,
  type ObRunnerDb,
} from './ob-production-runner-lib';
import { createPgObRunnerDb, type PgQueryFn } from './ob-pg-store';
import type { ObProdModelClient } from './claim-review-pipeline';

export type TransientClaim = {
  id: string;
  text: string;
  claimType: string;
  importance: string;
  accepted: boolean;
};

export type TransientProductionRun = {
  outcome: 'adopted' | 'accepted' | 'unresolved' | 'failed' | 'identity_unresolved' | 'identity_conflict';
  diagnostic: string | null;
  reasonCodes: string[];
  claimsAccepted: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  claims: TransientClaim[];
  /** Live extraction event id when one exists (adopted/accepted/unresolved). */
  attemptId: string | null;
};

export type TransientProductionConfig = {
  query: PgQueryFn;
  model: ObProdModelClient;
  models: ObRunnerConfig['models'];
  promptPer1kUsd: number;
  completionPer1kUsd: number;
  workerId: string;
  leaseSeconds?: number;
  requestTimeoutMs?: number;
  now?: () => string;
};

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
 * Persistence-boundary guard at the exact write point: the persist
 * envelope's structural fields must not echo source prose. Candidate
 * claim texts are excluded (model-authored by construction).
 */
export function assertPayloadHasNoSourceText(payload: Record<string, unknown>, packet: ObSourcePacketV5): void {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const structural = {
    ...payload,
    candidates: candidates.map((candidate) => {
      if (!candidate || typeof candidate !== 'object') return candidate;
      const { text: _text, final_text: _final, pre_repair_text: _pre, ...rest } = candidate as Record<string, unknown>;
      return rest;
    }),
  };
  const serialized = JSON.stringify(structural) ?? '';
  for (const field of sourceFieldValues(packet)) {
    if (serialized.includes(field)) {
      throw new Error('transient_source_text_at_persistence_boundary');
    }
  }
}

const TRANSIENT_RELEASE_SHA = createHash('sha256').update('orthobullets-transient-claims.v1').digest('hex').slice(0, 40);

export async function runTransientProductionSingle(
  input: { nativeQuestionId: string; packet: ObSourcePacketV5; reviewLocator: string; sourceHash: string },
  config: TransientProductionConfig,
): Promise<TransientProductionRun> {
  const now = config.now ?? (() => new Date().toISOString());
  const baseDb = createPgObRunnerDb(config.query);
  const db: ObRunnerDb = {
    ...baseDb,
    persistExtraction: async (itemId, workerId, payload) => {
      assertPayloadHasNoSourceText(payload, input.packet);
      return baseDb.persistExtraction(itemId, workerId, payload);
    },
  };

  const report = await runObProduction(
    {
      db,
      model: config.model,
      packets: [{
        nativeQuestionId: input.nativeQuestionId,
        specialty: undefined,
        topic: undefined,
        topicUrl: input.reviewLocator,
        packet: input.packet,
      }],
      now,
      nowMs: () => Date.now(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      random: () => Math.random(),
      onCheckpoint: () => {},
    },
    {
      mode: 'run',
      runId: null,
      apply: true,
      workerId: config.workerId,
      leaseSeconds: config.leaseSeconds ?? 300,
      forceReprocess: false,
      limits: { maxQuestions: 1, maxErrors: 0, maxCostUsd: 0, maxConsecutiveFailures: 0, maxItemCostUsd: 0 },
      specialtyFilter: null,
      questionFilter: null,
      models: config.models,
      costPer1kPromptUsd: config.promptPer1kUsd,
      costPer1kCompletionUsd: config.completionPer1kUsd,
      backoffBaseSeconds: 30,
      backoffCapSeconds: 1800,
      heartbeatDivider: 3,
      requestTimeoutMs: config.requestTimeoutMs ?? 120_000,
      releaseSha: TRANSIENT_RELEASE_SHA,
      packetSha256: input.sourceHash,
      pricingProfile: {
        version: 'transient-v5',
        model_profile: 'transient',
        provider: 'openai',
        base_url: null,
        prompt_per_1k_usd: config.promptPer1kUsd,
        completion_per_1k_usd: config.completionPer1kUsd,
      },
      interItemDelayMs: 0,
    },
  );

  if (report.runId && report.stoppedBy === 'queue_empty') {
    try {
      const finalized = await config.query<{ result: { terminal?: boolean } }>(
        'select public.ob_claim_finalize_run($1) as result', [report.runId],
      );
      if (finalized[0]?.result?.terminal !== true) {
        await config.query('select public.ob_claim_pause_run($1, $2)', [report.runId, 'deferred_nonterminal_work']);
      }
    } catch {
      // Lifecycle hygiene only; the extraction outcome stands on its own.
    }
  }

  const item: ObRunnerItemReport | undefined = report.items[0];
  if (!item) {
    return {
      outcome: 'failed', diagnostic: 'lease_failed', reasonCodes: ['lease_failed'],
      claimsAccepted: 0, promptTokens: report.promptTokens, completionTokens: report.completionTokens,
      estimatedCostUsd: report.estimatedCostUsd, claims: [], attemptId: null,
    };
  }

  let attemptId: string | null = null;
  let claims: TransientClaim[] = [];
  if (item.outcome === 'adopted' || item.outcome === 'accepted' || item.outcome === 'unresolved') {
    const live = await config.query<{ id: string }>(
      `select id from public.ob_claim_extraction_events
       where provider = 'orthobullets' and native_question_id = $1
         and source_fingerprint_hash = $2 and algorithm_version = 'orthobullets-claims-prod.v1'
         and prompt_set_version = 'ob-claims-prod-prompts-v1.0'
         and superseded_by_attempt_id is null limit 1`,
      [input.nativeQuestionId, input.sourceHash],
    );
    attemptId = live[0]?.id ?? null;
    if (attemptId) {
      const rows = await config.query<{
        id: string; claim_text: string; final_text: string;
        claim_type: string; importance: string; accepted: boolean;
      }>(
        `select id, claim_text, final_text, claim_type, importance, accepted
         from public.ob_claim_candidates where extraction_event_id = $1 order by candidate_index`,
        [attemptId],
      );
      claims = rows.map((row) => ({
        id: row.id, text: row.final_text || row.claim_text,
        claimType: row.claim_type, importance: row.importance, accepted: row.accepted,
      }));
    }
  }

  return {
    outcome: item.outcome as TransientProductionRun['outcome'],
    diagnostic: item.diagnostic,
    reasonCodes: item.reasonCodes ?? [],
    claimsAccepted: item.claimsAccepted,
    promptTokens: item.promptTokens,
    completionTokens: item.completionTokens,
    estimatedCostUsd: item.estimatedCostUsd,
    claims,
    attemptId,
  };
}

export function transientSourceHash(packet: ObSourcePacketV5): string {
  return sourceContentHashV5(packet);
}
