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
    candidate_scores: trace.candidates,
    predicate_families: trace.predicateFamilies,
    cache_status: trace.cacheStatus,
    stage_timings_ms: trace.stageTimingsMs,
    retrieval_latency_ms: Object.values(trace.stageTimingsMs).reduce((sum, value) => sum + value, 0),
    configured_deadline_ms: trace.configuredDeadlineMs,
    elapsed_latency_ms: Math.round(trace.elapsedLatencyMs),
    timeout_stage: trace.timeoutStage ?? null,
    rpc_started: trace.rpcStarted,
    rpc_completed: trace.rpcCompleted,
    evidence_packet_count: input.result.packet ? 1 : 0,
    answer_influenced: trace.answerInfluenced,
    retrieval_mode: trace.retrievalMode,
    safe_error_code: trace.safeErrorCode ?? null,
    safe_error_stage: trace.safeErrorStage ?? null,
    packet_token_estimate: trace.packetTokenEstimate,
    policy_version: trace.policyVersion,
    packet_schema_version: trace.packetSchemaVersion,
    gap_signals: trace.gaps,
  };
}

export async function persistBroBotKgShadowTrace(
  input: PersistInput,
  dependencies: { client?: BroBotKgTelemetryWriter } = {}
): Promise<{ persisted: boolean; latencyMs: number; errorCode?: string }> {
  const persistenceStarted = performance.now();
  if (input.result.mode === "off") return { persisted: false, latencyMs: 0, errorCode: "KG_MODE_OFF" };
  try {
    const trace = input.result.trace;
    const supabase = dependencies.client ?? createAdminClient();
    const { error } = await supabase
      .from("brobot_kg_retrieval_events")
      .upsert(buildBroBotKgTelemetryRow(input), { onConflict: "request_id", ignoreDuplicates: true });
    const latencyMs = Math.round((performance.now() - persistenceStarted) * 100) / 100;
    if (error) {
      console.error("[brobot-kg] telemetry persistence failed", {
        requestId: trace.requestId,
        retrievalId: trace.retrievalId,
        errorCode: "KG_TELEMETRY_INSERT_FAILED",
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
}) {
  try {
    await createAdminClient()
      .from("brobot_kg_retrieval_events")
      .update({ quality_gate_warnings: input.qualityGateWarnings })
      .eq("request_id", input.requestId);
  } catch (error) {
    console.error("[brobot-kg] outcome update failed (non-fatal)", error);
  }
}
