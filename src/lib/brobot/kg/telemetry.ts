import { createAdminClient } from "@/lib/supabase/admin";
import type { BroBotKgShadowResult } from "./contracts";
import {
  hashBroBotKgQuery,
  sanitizeBroBotKgQuery,
  shouldStoreSanitizedKgQuery,
} from "./privacy";

export async function persistBroBotKgShadowTrace(input: {
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
}) {
  if (input.result.mode === "off") return;
  try {
    const trace = input.result.trace;
    const supabase = createAdminClient();
    const { error } = await supabase.from("brobot_kg_retrieval_events").insert({
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
      packet_token_estimate: trace.packetTokenEstimate,
      policy_version: trace.policyVersion,
      packet_schema_version: trace.packetSchemaVersion,
      gap_signals: trace.gaps,
    });
    if (error) console.error("[brobot-kg] telemetry insert failed (non-fatal)", error.message);
  } catch (error) {
    console.error("[brobot-kg] telemetry failed (non-fatal)", error);
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
