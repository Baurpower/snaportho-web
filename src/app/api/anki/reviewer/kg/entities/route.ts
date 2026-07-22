/* eslint-disable @typescript-eslint/no-explicit-any -- Canonical entity rows await generated Supabase types. */
import { NextResponse } from "next/server";
import { reviewerAuth } from "../../_lib";
export async function GET(request: Request) {
  const a = await reviewerAuth(request, "mapping_reviewer");
  if ("response" in a) return a.response;
  const url = new URL(request.url),
    q = (url.searchParams.get("q") ?? "").trim(),
    limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? 20) || 20, 1),
      30,
    );
  if (q.length < 2)
    return NextResponse.json(
      { error: "query must contain at least 2 characters" },
      { status: 400 },
    );
  const pattern = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const { data, error } = await a.auth.supabase
    .from("canonical_entities")
    .select(
      "id,preferred_label,entity_type,description,status,review_status,replacement_entity_id",
    )
    .eq("is_active", true)
    .eq("status", "canonical")
    .ilike("preferred_label", pattern)
    .order("preferred_label")
    .limit(limit);
  if (error)
    return NextResponse.json(
      { error: "knowledge graph search unavailable" },
      { status: 500 },
    );
  return NextResponse.json({
    query: q,
    entities: (data ?? []).map((e: any) => ({
      id: e.id,
      label: e.preferred_label,
      entityType: e.entity_type,
      description: e.description,
      status: e.status,
      reviewStatus: e.review_status,
      replacementEntityId: e.replacement_entity_id,
    })),
  });
}
