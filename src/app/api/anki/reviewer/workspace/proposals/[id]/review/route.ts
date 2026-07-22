/* eslint-disable @typescript-eslint/no-explicit-any -- Workspace proposal rows await generated Supabase types. */
import { NextResponse } from "next/server";
import { reviewerAuth, body } from "../../../../_lib";
import { workspaceReviewSchema } from "@/lib/education/anki-reviewer";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await reviewerAuth(request, "clinical_editor");
  if ("response" in a) return a.response;
  const parsed = await body(request, workspaceReviewSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data!,
    { id } = await params,
    { data: proposal } = await a.auth.supabase
      .from("anki_editor_workspace_proposals")
      .select(
        "id,reviewer_user_id,proposal_kind,status,proposal_evidence_hash,canonical_card_id,base_canonical_card_version_id,mapping_changes,kg_expansion_suggestion",
      )
      .eq("id", id)
      .maybeSingle();
  if (!proposal)
    return NextResponse.json({ error: "proposal not found" }, { status: 404 });
  if (proposal.proposal_evidence_hash !== input.proposalEvidenceHash)
    return NextResponse.json(
      {
        error: "proposal evidence changed",
        conflictType: "proposal_superseded",
      },
      { status: 409 },
    );
  if (
    input.decision === "approve_for_incorporation" &&
    proposal.kg_expansion_suggestion &&
    !a.ctx.roles.includes("administrator")
  )
    return NextResponse.json(
      { error: "KG expansion approval requires administrator review" },
      { status: 403 },
    );
  if (proposal.canonical_card_id) {
    const { data: card } = await a.auth.supabase
      .from("canonical_cards")
      .select("current_version_id,is_active")
      .eq("id", proposal.canonical_card_id)
      .maybeSingle();
    if (!card?.is_active)
      return NextResponse.json(
        { error: "canonical card inactive", conflictType: "card_inactive" },
        { status: 409 },
      );
    if (card.current_version_id !== proposal.base_canonical_card_version_id)
      return NextResponse.json(
        {
          error: "server card version changed",
          conflictType: "server_version_changed",
        },
        { status: 409 },
      );
  }
  const ids = (proposal.mapping_changes ?? []).flatMap((m: any) =>
    m.canonicalEntityId ? [m.canonicalEntityId] : [],
  );
  if (ids.length) {
    const unique = [...new Set(ids)],
      { data: entities } = await a.auth.supabase
        .from("canonical_entities")
        .select("id")
        .in("id", unique)
        .eq("is_active", true)
        .eq("status", "canonical");
    if ((entities ?? []).length !== unique.length)
      return NextResponse.json(
        {
          error: "mapping references inactive entity",
          conflictType: "entity_inactive",
        },
        { status: 409 },
      );
  }
  const { data, error } = await a.auth.supabase.rpc(
    "record_anki_editor_workspace_review",
    {
      p_proposal_id: id,
      p_reviewer_user_id: a.ctx.userId,
      p_device_token_id: a.ctx.deviceTokenId,
      p_decision: input.decision,
      p_proposal_evidence_hash: input.proposalEvidenceHash,
      p_reviewer_roles_snapshot: a.ctx.roles,
      p_reviewer_qualification_snapshot: a.ctx.qualificationSnapshot,
      p_reason_codes: input.reasonCodes,
      p_reviewer_notes: input.notes,
      p_idempotency_key: input.idempotencyKey,
      p_client_version: input.clientVersion,
    },
  );
  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("second_reviewer_required"))
      return NextResponse.json(
        {
          error: "a second reviewer is required",
          conflictType: "permission_changed",
        },
        { status: 409 },
      );
    return NextResponse.json(
      {
        error: "review action rejected",
        conflictType: message.includes("evidence")
          ? "proposal_superseded"
          : undefined,
      },
      { status: 409 },
    );
  }
  return NextResponse.json({
    reviewActionId: data,
    decision: input.decision,
    canonicalDataChanged: false,
    incorporated: false,
    published: false,
  });
}
