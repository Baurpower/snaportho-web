/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { reviewerAuth } from "../../../_lib";

export async function GET(request: Request) {
  const auth = await reviewerAuth(request, "clinical_editor");
  if ("response" in auth) return auth.response;
  const { data: decisions, error } = await auth.auth.supabase
    .from("anki_kg_improvement_decisions")
    .select(
      "id,suggestion_id,reviewer_user_id,decision,evidence_hash,created_at,anki_kg_improvement_suggestions!inner(id,reviewer_user_id,canonical_card_id,canonical_card_version_id,improvement_id,graph_diff,created_at)",
    )
    .eq("decision", "accept")
    .neq("reviewer_user_id", auth.ctx.userId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error)
    return NextResponse.json(
      { error: "improvement queue unavailable" },
      { status: 500 },
    );
  const suggestionIds = (decisions ?? []).map((decision: any) => decision.suggestion_id);
  const { data: adjudications } = suggestionIds.length
    ? await auth.auth.supabase
        .from("anki_kg_improvement_adjudications")
        .select("suggestion_id")
        .in("suggestion_id", suggestionIds)
    : { data: [] };
  const adjudicated = new Set(
    (adjudications ?? []).map((row: any) => row.suggestion_id),
  );
  return NextResponse.json({
    improvements: (decisions ?? [])
      .filter((decision: any) => !adjudicated.has(decision.suggestion_id))
      .map((decision: any) => ({
        suggestionId: decision.suggestion_id,
        decisionId: decision.id,
        evidenceHash: decision.evidence_hash,
        createdAt: decision.created_at,
        improvement: decision.anki_kg_improvement_suggestions.graph_diff,
      })),
  });
}

