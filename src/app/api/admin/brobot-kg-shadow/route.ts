import { NextResponse } from "next/server";

import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from "@/lib/caseprep-review/access-control";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireCasePrepReviewer({ minRole: "content_admin" });
    const url = new URL(request.url);
    const requestId = url.searchParams.get("requestId");
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 100);
    const supabase = createAdminClient();

    let query = supabase
      .from("brobot_kg_retrieval_events")
      .select(
        `request_id,retrieval_id,conversation_id,message_id,normalized_concept,mode,subintent,
         training_level,response_depth,is_follow_up,release_id,retrieval_status,trigger_reasons,bypass_reason,
         fallback_used,candidate_count,selected_neighborhood_slugs,selected_entity_ids,
         selected_relationship_ids,candidate_scores,predicate_families,cache_status,
         stage_timings_ms,retrieval_latency_ms,packet_token_estimate,policy_version,
         packet_schema_version,gap_signals,quality_gate_warnings,evaluator_result,
         regeneration_status,feedback_result,correction_signal,created_at`
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (requestId) query = query.eq("request_id", requestId);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const mode = url.searchParams.get("mode");
    const status = url.searchParams.get("status");
    const neighborhood = url.searchParams.get("neighborhood");
    const entityId = url.searchParams.get("entityId");
    const gapType = url.searchParams.get("gapType");
    const cacheStatus = url.searchParams.get("cacheStatus");
    const latencyBucket = url.searchParams.get("latencyBucket");
    const turn = url.searchParams.get("turn");
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    if (mode) query = query.eq("mode", mode);
    if (status) query = query.eq("retrieval_status", status);
    if (neighborhood) query = query.contains("selected_neighborhood_slugs", [neighborhood]);
    if (entityId) query = query.contains("selected_entity_ids", [entityId]);
    if (gapType) query = query.contains("gap_signals", [{ gapType }]);
    if (cacheStatus) query = query.eq("cache_status", cacheStatus);
    if (latencyBucket === "lt75") query = query.lt("retrieval_latency_ms", 75);
    if (latencyBucket === "75to250") query = query.gte("retrieval_latency_ms", 75).lte("retrieval_latency_ms", 250);
    if (latencyBucket === "gt250") query = query.gt("retrieval_latency_ms", 250);
    if (turn === "first") query = query.eq("is_follow_up", false);
    if (turn === "follow_up") query = query.eq("is_follow_up", true);
    const { data, error } = await query;
    if (error) {
      console.error("[admin/brobot-kg-shadow] trace load failed", error);
      return NextResponse.json({ error: "Unable to load KG shadow traces." }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CasePrepReviewAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load KG shadow traces." }, { status: 500 });
  }
}
