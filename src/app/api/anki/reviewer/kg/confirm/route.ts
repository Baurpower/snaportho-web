import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { reviewerAuth, body, audit } from "../../_lib";
import {
  workspaceLocalIdentitySchema,
  workspaceProposalEvidenceHash,
  type WorkspaceProposal,
  REVIEWER_CONTRACT_VERSION,
} from "@/lib/education/anki-reviewer";
import {
  acceptedDraftsToProposalParts,
  type KgDraftSuggestion,
} from "@/lib/education/anki-kg-draft";

const suggestionSchema = z
  .object({
    id: z.string().min(1).max(64),
    kind: z.enum(["link_existing", "new_entity", "new_alias", "no_mapping"]),
    confidence: z.number().min(0).max(1),
    mappingRole: z.enum([
      "teaches",
      "tests",
      "explains",
      "demonstrates",
      "context_only",
      "broadly_related",
    ]),
    canonicalEntityId: z.string().uuid().optional(),
    label: z.string().max(300).optional(),
    entityType: z.string().max(64).optional(),
    preferredLabel: z.string().max(300).optional(),
    entityTypeProposed: z.string().max(64).optional(),
    description: z.string().max(2000).optional(),
    existingEntityId: z.string().uuid().optional(),
    reasonCodes: z.array(z.string().max(80)).max(20),
    evidenceExcerpt: z.string().max(200).optional(),
    defaultSelected: z.boolean(),
  })
  .strict();

const confirmSchema = z
  .object({
    contractVersion: z.literal("snaportho-anki-kg-confirm.v1"),
    localIdentity: workspaceLocalIdentitySchema,
    baseCard: z
      .object({
        canonicalCardId: z.string().uuid(),
        canonicalCardVersionId: z.string().uuid(),
        contentHash: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict(),
    accepted: z.array(suggestionSchema).min(1).max(10),
    refineComment: z.string().max(1000).optional().default(""),
    notes: z.string().max(2000).optional().default(""),
    idempotencyKey: z.string().uuid(),
    clientVersion: z.string().min(1).max(64),
  })
  .strict();

/**
 * Confirm accepted KG drafts → workspace proposal (no live graph write).
 */
export async function POST(request: Request) {
  const a = await reviewerAuth(request, "clinical_editor");
  if ("response" in a) return a.response;
  const parsed = await body(request, confirmSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data!;

  // Verify the pinned card before recording either a mapping or a no-mapping judgment.
  const { data: canonical } = await a.auth.supabase
    .from("canonical_cards")
    .select("id,current_version_id,is_active")
    .eq("id", input.baseCard.canonicalCardId)
    .maybeSingle();
  if (!canonical?.is_active)
    return NextResponse.json({ error: "canonical card inactive" }, { status: 409 });
  if (canonical.current_version_id !== input.baseCard.canonicalCardVersionId)
    return NextResponse.json(
      { error: "card version changed", conflictType: "server_version_changed" },
      { status: 409 },
    );

  const noMappings = input.accepted.filter((s) => s.kind === "no_mapping");
  const accepted = input.accepted.filter((s) => s.kind !== "no_mapping") as KgDraftSuggestion[];
  if (noMappings.length && accepted.length)
    return NextResponse.json(
      { error: "no-mapping cannot be combined with mapping suggestions" },
      { status: 400 },
    );
  if (noMappings.length) {
    const evidenceHash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const { data: existing } = await a.auth.supabase
      .from("anki_reviewer_card_kg_outcomes")
      .select("id,evidence_hash")
      .eq("reviewer_user_id", a.ctx.userId)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing)
      return existing.evidence_hash === evidenceHash
        ? NextResponse.json({
            outcomeId: existing.id,
            outcomeRecorded: true,
            idempotentReplay: true,
          })
        : NextResponse.json(
            { error: "idempotency key reused with different payload" },
            { status: 409 },
          );
    const { data: outcome, error: outcomeError } = await a.auth.supabase
      .from("anki_reviewer_card_kg_outcomes")
      .insert({
        reviewer_user_id: a.ctx.userId,
        device_token_id: a.ctx.deviceTokenId,
        canonical_card_id: input.baseCard.canonicalCardId,
        canonical_card_version_id: input.baseCard.canonicalCardVersionId,
        base_content_hash: input.baseCard.contentHash,
        note_guid: input.localIdentity.noteGuid,
        card_ordinal: input.localIdentity.cardOrdinal,
        local_content_hash: input.localIdentity.contentHash,
        outcome: "no_reliable_existing_entity",
        reason_codes: noMappings[0]?.reasonCodes ?? [],
        reviewer_notes: [input.notes, input.refineComment]
          .filter(Boolean)
          .join("\n")
          .slice(0, 2000),
        evidence_hash: evidenceHash,
        idempotency_key: input.idempotencyKey,
        client_version: input.clientVersion,
      })
      .select("id")
      .single();
    if (outcomeError)
      return NextResponse.json(
        { error: "no-mapping outcome insert failed" },
        { status: 500 },
      );
    return NextResponse.json({
      outcomeId: outcome.id,
      outcomeRecorded: true,
      canonicalDataChanged: false,
    });
  }
  if (!accepted.length)
    return NextResponse.json(
      { error: "select at least one mapping or no-mapping outcome" },
      { status: 400 },
    );

  const { mappingChanges, kgExpansionSuggestion } = acceptedDraftsToProposalParts(accepted);
  if (!mappingChanges.length && !kgExpansionSuggestion)
    return NextResponse.json({ error: "nothing to propose" }, { status: 400 });

  const proposal: WorkspaceProposal = {
    contractVersion: REVIEWER_CONTRACT_VERSION,
    proposalKind: "edit_existing_card",
    sourceSurface: "reviewer_panel",
    baseCard: {
      canonicalCardId: input.baseCard.canonicalCardId,
      canonicalCardVersionId: input.baseCard.canonicalCardVersionId,
      contentHash: input.baseCard.contentHash,
    },
    localIdentity: input.localIdentity,
    editedFields: [],
    centralTagChanges: { add: [], remove: [] },
    proposedDeckPath: null,
    mappingChanges,
    kgExpansionSuggestion,
    notes: [input.notes, input.refineComment ? `refine: ${input.refineComment}` : ""]
      .filter(Boolean)
      .join("\n")
      .slice(0, 2000),
    idempotencyKey: input.idempotencyKey,
    clientVersion: input.clientVersion,
  };

  const evidenceHash = workspaceProposalEvidenceHash(proposal);

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
        })
      : NextResponse.json({ error: "idempotency key reused with different payload" }, { status: 409 });

  const { data: row, error } = await a.auth.supabase
    .from("anki_editor_workspace_proposals")
    .insert({
      reviewer_user_id: a.ctx.userId,
      device_token_id: a.ctx.deviceTokenId,
      proposal_kind: proposal.proposalKind,
      source_surface: proposal.sourceSurface,
      canonical_card_id: proposal.baseCard!.canonicalCardId,
      base_canonical_card_version_id: proposal.baseCard!.canonicalCardVersionId,
      base_content_hash: proposal.baseCard!.contentHash,
      note_guid: proposal.localIdentity.noteGuid,
      card_ordinal: proposal.localIdentity.cardOrdinal,
      local_content_hash: proposal.localIdentity.contentHash,
      edited_fields: proposal.editedFields,
      central_tag_changes: proposal.centralTagChanges,
      proposed_deck_path: proposal.proposedDeckPath,
      mapping_changes: proposal.mappingChanges,
      kg_expansion_suggestion: proposal.kgExpansionSuggestion,
      reviewer_notes: proposal.notes,
      status: "submitted",
      proposal_evidence_hash: evidenceHash,
      idempotency_key: proposal.idempotencyKey,
      client_version: proposal.clientVersion,
    })
    .select("id,status")
    .single();

  if (error)
    return NextResponse.json({ error: "proposal insert failed" }, { status: 500 });

  await audit(
    a.auth.supabase,
    a.ctx,
    "kg_draft_confirmed",
    {
      proposal_id: row.id,
      mapping_count: mappingChanges.length,
    },
    ["kg_confirm", `accepted_${accepted.length}`],
  );

  return NextResponse.json({
    proposalId: row.id,
    status: row.status,
    proposalEvidenceHash: evidenceHash,
    mappingCount: mappingChanges.length,
    hasExpansion: Boolean(kgExpansionSuggestion),
  });
}
