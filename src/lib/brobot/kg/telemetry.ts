import { createAdminClient } from "@/lib/supabase/admin";
import type { BroBotKgShadowResult } from "./contracts";
import {
  hashBroBotKgQuery,
  sanitizeBroBotKgQuery,
  shouldStoreSanitizedKgQuery,
} from "./privacy";

type BroBotKgTelemetryWriter = {
  from: (table: string) => {
    upsert: (
      value: Record<string, unknown>,
      options: { onConflict: string; ignoreDuplicates: boolean }
    ) => PromiseLike<{ error: { message: string } | null }>;
  };
};

type PersistInput = {
  result: BroBotKgShadowResult;
  query: string;
  userId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  mode: string;
  subintent: string;
  trainingLevel: string;
  responseDepth: string;
  isFollowUp?: boolean;
};

/** Columns known on live schema after v2 + 20261007010000 additive migration. */
const LIVE_TELEMETRY_COLUMNS = new Set([
  "request_id",
  "retrieval_id",
  "conversation_id",
  "message_id",
  "user_id",
  "query_hash",
  "normalized_concept",
  "sanitized_query",
  "mode",
  "subintent",
  "training_level",
  "response_depth",
  "is_follow_up",
  "release_id",
  "retrieval_status",
  "trigger_reasons",
  "bypass_reason",
  "fallback_used",
  "candidate_count",
  "selected_neighborhood_slugs",
  "selected_entity_ids",
  "selected_relationship_ids",
  "selected_claim_ids",
  "candidate_card_ids",
  "claim_candidate_count",
  "card_candidate_count",
  "candidate_scores",
  "predicate_families",
  "cache_status",
  "stage_timings_ms",
  "retrieval_latency_ms",
  "configured_deadline_ms",
  "elapsed_latency_ms",
  "timeout_stage",
  "rpc_started",
  "rpc_completed",
  "evidence_packet_count",
  "answer_influenced",
  "retrieval_mode",
  "safe_error_code",
  "safe_error_stage",
  "packet_token_estimate",
  "policy_version",
  "packet_schema_version",
  "gap_signals",
  "query_variants",
  "requested_facets",
  "retrieval_channels",
  "claim_score_components",
  "exclusion_reasons",
  "rerank_version",
  "pool_size",
  "support_level",
  "quality_gate_warnings",
  "answer_used_claim_ids",
]);

/** Pre-additive core columns that always existed on shadow live schema. */
const CORE_TELEMETRY_COLUMNS = new Set([
  "request_id",
  "retrieval_id",
  "conversation_id",
  "message_id",
  "user_id",
  "query_hash",
  "normalized_concept",
  "sanitized_query",
  "mode",
  "subintent",
  "training_level",
  "response_depth",
  "is_follow_up",
  "release_id",
  "retrieval_status",
  "trigger_reasons",
  "bypass_reason",
  "fallback_used",
  "candidate_count",
  "selected_neighborhood_slugs",
  "selected_entity_ids",
  "selected_relationship_ids",
  "candidate_scores",
  "predicate_families",
  "cache_status",
  "stage_timings_ms",
  "retrieval_latency_ms",
  "configured_deadline_ms",
  "elapsed_latency_ms",
  "timeout_stage",
  "rpc_started",
  "rpc_completed",
  "evidence_packet_count",
  "answer_influenced",
  "retrieval_mode",
  "safe_error_code",
  "safe_error_stage",
  "packet_token_estimate",
  "policy_version",
  "packet_schema_version",
  "gap_signals",
]);

function pickColumns(
  row: Record<string, unknown>,
  allowed: Set<string>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (allowed.has(key)) out[key] = value;
  }
  return out;
}

export function buildBroBotKgTelemetryRow(input: PersistInput): Record<string, unknown> {
  const trace = input.result.trace;
  return {
    request_id: trace.requestId,
    retrieval_id: trace.retrievalId,
    conversation_id: input.conversationId ?? null,
    message_id: input.messageId ?? null,
    user_id: input.userId ?? null,
    query_hash: hashBroBotKgQuery(input.query),
    normalized_concept: trace.gaps[0]?.normalizedConcept ?? null,
    sanitized_query: shouldStoreSanitizedKgQuery()
      ? sanitizeBroBotKgQuery(input.query)
      : null,
    mode: input.mode,
    subintent: input.subintent,
    training_level: input.trainingLevel,
    response_depth: input.responseDepth,
    is_follow_up: input.isFollowUp ?? false,
    release_id: trace.releaseId ?? null,
    retrieval_status: trace.status,
    trigger_reasons: trace.decision.reasons,
    bypass_reason: trace.decision.bypassReason ?? null,
    fallback_used: trace.status === "error" || trace.status === "timeout",
    candidate_count: trace.candidates.length,
    selected_neighborhood_slugs: trace.neighborhoodSlugs,
    selected_entity_ids: trace.selectedEntityIds,
    selected_relationship_ids: trace.selectedRelationshipIds,
    selected_claim_ids: trace.selectedClaimIds ?? [],
    candidate_card_ids: trace.candidateCardIds ?? [],
    claim_candidate_count: input.result.packet?.claims.length ?? 0,
    card_candidate_count: input.result.packet?.cardCandidates.length ?? 0,
    candidate_scores: trace.candidates,
    predicate_families: trace.predicateFamilies,
    cache_status: trace.cacheStatus,
    stage_timings_ms: trace.stageTimingsMs,
    retrieval_latency_ms: Math.round(
      Object.values(trace.stageTimingsMs).reduce((sum, value) => sum + value, 0)
    ),
    configured_deadline_ms: trace.configuredDeadlineMs,
    elapsed_latency_ms: Math.round(trace.elapsedLatencyMs),
    timeout_stage: trace.timeoutStage ?? null,
    rpc_started: trace.rpcStarted,
    rpc_completed: trace.rpcCompleted,
    evidence_packet_count: input.result.packet ? 1 : 0,
    answer_influenced: Boolean(trace.answerInfluenced),
    retrieval_mode: trace.retrievalMode === "enabled" ? "enabled" : "shadow",
    safe_error_code: trace.safeErrorCode ?? null,
    safe_error_stage: trace.safeErrorStage ?? null,
    packet_token_estimate: trace.packetTokenEstimate,
    policy_version: trace.policyVersion,
    packet_schema_version: trace.packetSchemaVersion,
    gap_signals: trace.gaps,
    query_variants: trace.queryVariants ?? [],
    requested_facets: trace.requestedFacets ?? [],
    retrieval_channels: trace.retrievalChannels ?? {},
    claim_score_components: trace.claimScoreComponents ?? [],
    exclusion_reasons: trace.exclusionReasons ?? [],
    rerank_version: trace.rerankVersion ?? null,
    pool_size: trace.poolSize ?? null,
    support_level: trace.supportLevel ?? null,
  };
}

function isMissingColumnError(message: string | undefined): boolean {
  if (!message) return false;
  return /column .* does not exist/i.test(message) || /Could not find the/i.test(message);
}

function isCheckConstraintError(message: string | undefined): boolean {
  if (!message) return false;
  return /check constraint/i.test(message) || /brobot_kg_answer_influence_check/i.test(message) || /brobot_kg_retrieval_mode_check/i.test(message);
}

export async function persistBroBotKgShadowTrace(
  input: PersistInput,
  dependencies: { client?: BroBotKgTelemetryWriter } = {}
): Promise<{ persisted: boolean; latencyMs: number; errorCode?: string }> {
  const persistenceStarted = performance.now();
  if (input.result.mode === "off") {
    return { persisted: false, latencyMs: 0, errorCode: "KG_MODE_OFF" };
  }
  try {
    const trace = input.result.trace;
    const supabase = dependencies.client ?? createAdminClient();
    const fullRow = buildBroBotKgTelemetryRow(input);

    const attempt = async (row: Record<string, unknown>) =>
      supabase.from("brobot_kg_retrieval_events").upsert(row, {
        onConflict: "request_id",
        ignoreDuplicates: true,
      });

    // Prefer full row (post-additive migration). Fall back to core columns / shadow-safe flags.
    let { error } = await attempt(pickColumns(fullRow, LIVE_TELEMETRY_COLUMNS));
    if (error && (isMissingColumnError(error.message) || isCheckConstraintError(error.message))) {
      const shadowSafe = {
        ...pickColumns(fullRow, CORE_TELEMETRY_COLUMNS),
        answer_influenced: false,
        retrieval_mode: "shadow",
      };
      // Also try with v2 claim id columns if present on live (they are).
      const withClaimCols = {
        ...shadowSafe,
        selected_claim_ids: fullRow.selected_claim_ids,
        candidate_card_ids: fullRow.candidate_card_ids,
        claim_candidate_count: fullRow.claim_candidate_count,
        card_candidate_count: fullRow.card_candidate_count,
      };
      ({ error } = await attempt(withClaimCols));
      if (error && isMissingColumnError(error.message)) {
        ({ error } = await attempt(shadowSafe));
      }
    }

    const latencyMs = Math.round((performance.now() - persistenceStarted) * 100) / 100;
    if (error) {
      console.error("[brobot-kg] telemetry persistence failed", {
        requestId: trace.requestId,
        retrievalId: trace.retrievalId,
        errorCode: "KG_TELEMETRY_INSERT_FAILED",
        message: error.message,
      });
      return { persisted: false, latencyMs, errorCode: "KG_TELEMETRY_INSERT_FAILED" };
    }
    return { persisted: true, latencyMs };
  } catch {
    const latencyMs = Math.round((performance.now() - persistenceStarted) * 100) / 100;
    console.error("[brobot-kg] telemetry persistence threw", {
      requestId: input.result.trace.requestId,
      retrievalId: input.result.trace.retrievalId,
      errorCode: "KG_TELEMETRY_EXCEPTION",
    });
    return { persisted: false, latencyMs, errorCode: "KG_TELEMETRY_EXCEPTION" };
  }
}

export async function attachBroBotKgAnswerOutcome(input: {
  requestId: string;
  qualityGateWarnings: string[];
  usedClaimIds?: string[];
}) {
  try {
    const update: Record<string, unknown> = {
      quality_gate_warnings: input.qualityGateWarnings,
    };
    if (input.usedClaimIds) {
      update.answer_used_claim_ids = input.usedClaimIds;
    }
    const { error } = await createAdminClient()
      .from("brobot_kg_retrieval_events")
      .update(update)
      .eq("request_id", input.requestId);
    if (error && isMissingColumnError(error.message) && input.usedClaimIds) {
      await createAdminClient()
        .from("brobot_kg_retrieval_events")
        .update({ quality_gate_warnings: input.qualityGateWarnings })
        .eq("request_id", input.requestId);
    }
  } catch (error) {
    console.error("[brobot-kg] outcome update failed (non-fatal)", error);
  }
}
