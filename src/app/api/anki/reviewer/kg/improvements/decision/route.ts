import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewerAuth, body } from "../../../_lib";

const requestSchema = z
  .object({
    contractVersion: z.literal("snaportho-anki-kg-improvement-decision.v1"),
    suggestionId: z.string().uuid(),
    improvementId: z.string().min(1).max(64),
    decision: z.enum(["accept", "not_useful"]),
    notes: z.string().max(2000).optional().default(""),
    idempotencyKey: z.string().uuid(),
    clientVersion: z.string().min(1).max(64),
  })
  .strict();

export async function POST(request: Request) {
  const auth = await reviewerAuth(request, "clinical_editor");
  if ("response" in auth) return auth.response;
  const parsed = await body(request, requestSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data!;
  const { data: suggestion } = await auth.auth.supabase
    .from("anki_kg_improvement_suggestions")
    .select(
      "id,reviewer_user_id,canonical_card_id,canonical_card_version_id,improvement_id,evidence_hash,graph_diff",
    )
    .eq("id", input.suggestionId)
    .eq("reviewer_user_id", auth.ctx.userId)
    .maybeSingle();
  if (!suggestion)
    return NextResponse.json({ error: "suggestion not found" }, { status: 404 });
  if (suggestion.improvement_id !== input.improvementId)
    return NextResponse.json(
      { error: "suggestion evidence changed", conflictType: "proposal_superseded" },
      { status: 409 },
    );
  const { data: card } = await auth.auth.supabase
    .from("canonical_cards")
    .select("current_version_id,is_active")
    .eq("id", suggestion.canonical_card_id)
    .maybeSingle();
  if (
    !card?.is_active ||
    card.current_version_id !== suggestion.canonical_card_version_id
  )
    return NextResponse.json(
      { error: "card version changed", conflictType: "server_version_changed" },
      { status: 409 },
    );
  const { data: existing } = await auth.auth.supabase
    .from("anki_kg_improvement_decisions")
    .select("id,decision")
    .eq("reviewer_user_id", auth.ctx.userId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existing)
    return NextResponse.json({
      decisionId: existing.id,
      decision: existing.decision,
      idempotentReplay: true,
    });
  const { data: row, error } = await auth.auth.supabase
    .from("anki_kg_improvement_decisions")
    .insert({
      suggestion_id: suggestion.id,
      reviewer_user_id: auth.ctx.userId,
      device_token_id: auth.ctx.deviceTokenId,
      decision: input.decision,
      evidence_hash: suggestion.evidence_hash,
      reviewer_notes: input.notes,
      idempotency_key: input.idempotencyKey,
      client_version: input.clientVersion,
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json(
      { error: "decision could not be saved" },
      { status: 500 },
    );
  return NextResponse.json({
    decisionId: row.id,
    decision: input.decision,
    queuedForReview: input.decision === "accept",
    canonicalDataChanged: false,
  });
}

