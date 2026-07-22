/* eslint-disable @typescript-eslint/no-explicit-any -- Workspace proposal rows await generated Supabase types. */
import { NextResponse } from "next/server";
import { reviewerAuth, body, audit } from "../../_lib";
import {
  workspaceProposalSchema,
  workspaceProposalEvidenceHash,
} from "@/lib/education/anki-reviewer";
const personalTag = /^(personal|user|local)::/i;
const listStatuses = [
  "submitted",
  "under_review",
  "changes_requested",
  "approved_for_incorporation",
  "rejected",
  "withdrawn",
];
export async function GET(request: Request) {
  const a = await reviewerAuth(request);
  if ("response" in a) return a.response;
  const url = new URL(request.url),
    scope = url.searchParams.get("scope") ?? "queue",
    status = url.searchParams.get("status"),
    kind = url.searchParams.get("kind"),
    limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? 30) || 30, 1),
      100,
    );
  let query = a.auth.supabase
    .from("anki_editor_workspace_proposals")
    .select(
      "id,reviewer_user_id,proposal_kind,source_surface,canonical_card_id,base_canonical_card_version_id,note_guid,card_ordinal,status,proposal_evidence_hash,created_at,reviewed_at,kg_expansion_suggestion",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  query =
    scope === "mine"
      ? query.eq("reviewer_user_id", a.ctx.userId)
      : query.neq("reviewer_user_id", a.ctx.userId);
  query =
    status && listStatuses.includes(status)
      ? query.eq("status", status)
      : query.in(
          "status",
          scope === "mine"
            ? listStatuses
            : ["submitted", "under_review", "changes_requested"],
        );
  if (kind && ["edit_existing_card", "create_missing_card"].includes(kind))
    query = query.eq("proposal_kind", kind);
  const { data, error } = await query;
  if (error)
    return NextResponse.json(
      { error: "proposal queue unavailable" },
      { status: 500 },
    );
  return NextResponse.json({
    scope,
    proposals: (data ?? []).map((p: any) => ({
      ...p,
      kg_expansion_suggestion: p.kg_expansion_suggestion
        ? {
            suggestionType: p.kg_expansion_suggestion.suggestionType,
            preferredLabel: p.kg_expansion_suggestion.preferredLabel,
          }
        : null,
    })),
  });
}
export async function POST(request: Request) {
  const a = await reviewerAuth(request, "clinical_editor");
  if ("response" in a) return a.response;
  const parsed = await body(request, workspaceProposalSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data!,
    evidenceHash = workspaceProposalEvidenceHash(input);
  if (
    [...input.centralTagChanges.add, ...input.centralTagChanges.remove].some(
      (t) => personalTag.test(t),
    )
  )
    return NextResponse.json(
      {
        error:
          "personal tags stay local and cannot be submitted as central tags",
      },
      { status: 400 },
    );
  const { data: existing } = await a.auth.supabase
    .from("anki_editor_workspace_proposals")
    .select("id,status,proposal_evidence_hash")
    .eq("reviewer_user_id", a.ctx.userId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existing)
    return existing.proposal_evidence_hash === evidenceHash
      ? NextResponse.json({
          proposalId: existing.id,
          status: existing.status,
          proposalEvidenceHash: evidenceHash,
          idempotentReplay: true,
          canonicalDataChanged: false,
        })
      : NextResponse.json(
          {
            error: "idempotency key reused with different evidence",
            conflictType: "duplicate_submission",
          },
          { status: 409 },
        );
  if (input.baseCard) {
    const { data: card } = await a.auth.supabase
      .from("canonical_cards")
      .select("id,current_version_id,is_active")
      .eq("id", input.baseCard.canonicalCardId)
      .maybeSingle();
    const { data: version } = await a.auth.supabase
      .from("canonical_card_versions")
      .select("id,content_hash,canonical_card_id")
      .eq("id", input.baseCard.canonicalCardVersionId)
      .maybeSingle();
    if (!card?.is_active)
      return NextResponse.json(
        { error: "canonical card inactive", conflictType: "card_inactive" },
        { status: 409 },
      );
    if (
      card.current_version_id !== input.baseCard.canonicalCardVersionId ||
      version?.canonical_card_id !== card.id ||
      version?.content_hash !== input.baseCard.contentHash
    )
      return NextResponse.json(
        {
          error: "server card version changed",
          conflictType: "server_version_changed",
        },
        { status: 409 },
      );
  }
  const entityIds = input.mappingChanges.flatMap((m) =>
    m.canonicalEntityId ? [m.canonicalEntityId] : [],
  );
  if (input.kgExpansionSuggestion?.existingEntityId)
    entityIds.push(input.kgExpansionSuggestion.existingEntityId);
  if (entityIds.length) {
    const unique = [...new Set(entityIds)],
      { data: entities } = await a.auth.supabase
        .from("canonical_entities")
        .select("id")
        .in("id", unique)
        .eq("is_active", true)
        .eq("status", "canonical");
    if ((entities ?? []).length !== unique.length)
      return NextResponse.json(
        {
          error: "mapping references an inactive or unknown entity",
          conflictType: "entity_inactive",
        },
        { status: 409 },
      );
  }
  const { data, error } = await a.auth.supabase
    .from("anki_editor_workspace_proposals")
    .insert({
      reviewer_user_id: a.ctx.userId,
      device_token_id: a.ctx.deviceTokenId,
      proposal_kind: input.proposalKind,
      source_surface: input.sourceSurface,
      canonical_card_id: input.baseCard?.canonicalCardId ?? null,
      base_canonical_card_version_id:
        input.baseCard?.canonicalCardVersionId ?? null,
      base_content_hash: input.baseCard?.contentHash ?? null,
      note_guid: input.localIdentity.noteGuid,
      card_ordinal: input.localIdentity.cardOrdinal,
      local_content_hash: input.localIdentity.contentHash,
      edited_fields: input.editedFields,
      central_tag_changes: input.centralTagChanges,
      proposed_deck_path: input.proposedDeckPath,
      mapping_changes: input.mappingChanges,
      kg_expansion_suggestion: input.kgExpansionSuggestion,
      reviewer_notes: input.notes,
      proposal_evidence_hash: evidenceHash,
      status: "submitted",
      idempotency_key: input.idempotencyKey,
      client_version: input.clientVersion,
    })
    .select("id,status")
    .single();
  if (error)
    return NextResponse.json(
      { error: "editor proposal rejected" },
      { status: 409 },
    );
  await audit(
    a.auth.supabase,
    a.ctx,
    "change_draft_saved",
    { change_proposal_id: null },
    ["workspace_proposal_submitted"],
  );
  return NextResponse.json({
    proposalId: data.id,
    status: data.status,
    proposalEvidenceHash: evidenceHash,
    canonicalDataChanged: false,
    publicationEligible: false,
  });
}
