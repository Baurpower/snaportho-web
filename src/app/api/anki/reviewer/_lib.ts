/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any -- Additive reviewer tables are absent from generated database types until deployment. Remove after regenerating Supabase types. */
// @ts-nocheck New additive reviewer tables are absent from generated DB types until migration deployment.
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { authenticateBroBotAnkiRequest } from "@/app/api/brobot-anki/_lib";
import {
  mappingReviewSchema,
  changeProposalSchema,
  validateSubmissionContext,
  type ReviewerContext,
  type PinnedItem,
} from "@/lib/education/anki-reviewer";
export const MAX_REVIEW_BODY = 128_000;
export async function reviewerAuth(
  request: Request,
  role?: "mapping_reviewer" | "clinical_editor" | "deck_editor",
) {
  const auth = await authenticateBroBotAnkiRequest(request);
  if ("response" in auth) return { response: auth.response };
  if (
    auth.authMethod !== "device_token" ||
    !auth.deviceLinkId ||
    !auth.deviceTokenId
  )
    return {
      response: NextResponse.json(
        { error: "device authentication required" },
        { status: 401 },
      ),
    };
  const { data, error } = await auth.supabase
    .from("anki_reviewers")
    .select(
      "user_id,reviewer_status,roles,is_active,qualification_type,qualification_verified,qualification_metadata,display_name",
    )
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (error || !data)
    return {
      response: NextResponse.json(
        { error: "reviewer access unavailable" },
        { status: error ? 500 : 403 },
      ),
    };
  const ctx: ReviewerContext = {
    userId: auth.userId,
    deviceLinkId: auth.deviceLinkId,
    deviceTokenId: auth.deviceTokenId,
    roles: data.roles ?? [],
    active: data.is_active,
    reviewerStatus: data.reviewer_status,
    qualificationSnapshot: {
      type: data.qualification_type,
      verified: data.qualification_verified,
    },
  };
  const hasRole =
    !role ||
    ctx.roles.includes(role) ||
    (role === "mapping_reviewer" && ctx.roles.includes("clinical_editor"));
  if (!ctx.active || ctx.reviewerStatus !== "active" || !hasRole)
    return {
      response: NextResponse.json(
        { error: "reviewer permission required" },
        { status: 403 },
      ),
    };
  return { auth, ctx, reviewer: data };
}
export async function body<T>(
  request: Request,
  schema: {
    safeParse: (v: unknown) => {
      success: boolean;
      data?: T;
      error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
    };
  },
) {
  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > MAX_REVIEW_BODY)
    return {
      response: NextResponse.json(
        { error: "request too large" },
        { status: 413 },
      ),
    };
  let raw;
  try {
    raw = await request.json();
  } catch {
    return {
      response: NextResponse.json({ error: "invalid JSON" }, { status: 400 }),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return {
      response: NextResponse.json(
        {
          error: "invalid reviewer submission",
          field: parsed.error?.issues[0]?.path.join("."),
        },
        { status: 400 },
      ),
    };
  return { data: parsed.data as T };
}
export async function loadItem(
  supabase: any,
  itemId: string,
  userId: string,
  entityId?: string | null,
): Promise<PinnedItem | null> {
  const { data } = await supabase
    .from("anki_review_assignment_items")
    .select(
      "id,assignment_id,item_status,canonical_card_id,canonical_card_version_id,base_content_hash,note_guid,card_ordinal,evidence_hashes,anki_review_assignments!inner(assigned_reviewer_id,status),canonical_cards!inner(current_version_id,is_active)",
    )
    .eq("id", itemId)
    .eq("anki_review_assignments.assigned_reviewer_id", userId)
    .maybeSingle();
  if (!data) return null;
  let entityActive: null | boolean = null;
  if (entityId) {
    const { data: e } = await supabase
      .from("canonical_entities")
      .select("is_active,status")
      .eq("id", entityId)
      .maybeSingle();
    entityActive = Boolean(e?.is_active && e?.status === "canonical");
  }
  return {
    assignmentReviewerId: data.anki_review_assignments.assigned_reviewer_id,
    assignmentStatus: data.anki_review_assignments.status,
    itemStatus: data.item_status,
    canonicalCardId: data.canonical_card_id,
    canonicalCardVersionId: data.canonical_card_version_id,
    baseContentHash: data.base_content_hash,
    noteGuid: data.note_guid,
    cardOrdinal: data.card_ordinal,
    cardActive: data.canonical_cards.is_active,
    currentVersionId: data.canonical_cards.current_version_id,
    entityActive,
    evidenceHashes: data.evidence_hashes ?? [],
    acceptedProposalExists: false,
  };
}
export async function audit(
  supabase: any,
  ctx: ReviewerContext,
  eventType: string,
  ids: Record<string, unknown>,
  reasonCodes: string[] = [],
) {
  await supabase
    .from("anki_reviewer_audit_events")
    .insert({
      reviewer_user_id: ctx.userId,
      device_token_id: ctx.deviceTokenId,
      event_type: eventType,
      request_id: randomUUID(),
      addon_version: "reviewer-api-v1",
      reason_codes: reasonCodes,
      safe_metadata: {},
      ...ids,
    });
}
export async function submitMapping(request: Request, itemId: string) {
  const a = await reviewerAuth(request, "mapping_reviewer");
  if ("response" in a) return a.response;
  const parsed = await body(request, mappingReviewSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data!;
  const item = await loadItem(
    a.auth.supabase,
    itemId,
    a.ctx.userId,
    input.canonicalEntityId,
  );
  if (!item)
    return NextResponse.json(
      { error: "assignment item not found" },
      { status: 404 },
    );
  const conflict = validateSubmissionContext(
    a.ctx,
    item,
    input,
    "mapping_reviewer",
  );
  if (conflict) {
    await audit(
      a.auth.supabase,
      a.ctx,
      "conflict_detected",
      { assignment_item_id: itemId },
      [conflict],
    );
    return NextResponse.json(
      { error: "review conflict", conflictType: conflict },
      { status: 409 },
    );
  }
  if (input.evidenceHashes.some((h) => !item.evidenceHashes.includes(h)))
    return NextResponse.json(
      { error: "evidence hash mismatch" },
      { status: 409 },
    );
  const { data: existing } = await a.auth.supabase
    .from("anki_mapping_review_submissions")
    .select("id")
    .eq("reviewer_user_id", a.ctx.userId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existing)
    return NextResponse.json({
      submissionId: existing.id,
      status: "accepted",
      idempotentReplay: true,
    });
  const { data, error } = await a.auth.supabase
    .from("anki_mapping_review_submissions")
    .insert({
      assignment_id: (
        await a.auth.supabase
          .from("anki_review_assignment_items")
          .select("assignment_id")
          .eq("id", itemId)
          .single()
      ).data.assignment_id,
      assignment_item_id: itemId,
      reviewer_user_id: a.ctx.userId,
      canonical_card_id: input.canonicalCardId,
      canonical_card_version_id: input.canonicalCardVersionId,
      base_content_hash: input.baseContentHash,
      canonical_entity_id: input.canonicalEntityId,
      mapping_role: input.mappingRole,
      human_decision: input.decision,
      human_confidence: input.confidence,
      no_mapping_classification: input.noMappingClassification,
      ambiguity_resolution: input.ambiguityResolution,
      safe_reason_codes: input.reasonCodes,
      safe_notes: input.notes,
      reviewer_qualification_snapshot: a.ctx.qualificationSnapshot,
      provenance_method: "direct_human_review",
      evidence_hashes: input.evidenceHashes,
      idempotency_key: input.idempotencyKey,
      client_version: input.clientVersion,
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json({ error: "submission rejected" }, { status: 409 });
  await audit(a.auth.supabase, a.ctx, "submission_accepted", {
    assignment_item_id: itemId,
    mapping_submission_id: data.id,
  });
  return NextResponse.json({
    submissionId: data.id,
    status: "accepted",
    publicationEligible: false,
  });
}
export async function submitProposal(request: Request, itemId: string) {
  const a = await reviewerAuth(request, "clinical_editor");
  if ("response" in a) return a.response;
  const parsed = await body(request, changeProposalSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data!,
    item = await loadItem(a.auth.supabase, itemId, a.ctx.userId);
  if (!item)
    return NextResponse.json(
      { error: "assignment item not found" },
      { status: 404 },
    );
  const conflict = validateSubmissionContext(
    a.ctx,
    item,
    input,
    "clinical_editor",
  );
  if (conflict)
    return NextResponse.json(
      { error: "review conflict", conflictType: conflict },
      { status: 409 },
    );
  const assignment = (
    await a.auth.supabase
      .from("anki_review_assignment_items")
      .select("assignment_id")
      .eq("id", itemId)
      .single()
  ).data.assignment_id;
  const { data, error } = await a.auth.supabase
    .from("anki_card_change_proposals")
    .insert({
      assignment_id: assignment,
      assignment_item_id: itemId,
      reviewer_user_id: a.ctx.userId,
      canonical_card_id: input.canonicalCardId,
      base_canonical_card_version_id: input.canonicalCardVersionId,
      base_content_hash: input.baseContentHash,
      status: input.status,
      change_type: input.changeType,
      reason_codes: input.reasonCodes,
      client_version: input.clientVersion,
      idempotency_key: input.idempotencyKey,
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json({ error: "proposal rejected" }, { status: 409 });
  const { error: revisionError } = await a.auth.supabase
    .from("anki_card_change_proposal_revisions")
    .insert({
      proposal_id: data.id,
      revision_number: 1,
      base_canonical_card_version_id: input.canonicalCardVersionId,
      base_content_hash: input.baseContentHash,
      edited_fields: input.editedFields,
      tag_changes: { replacement: input.tags },
      proposed_deck_path: input.proposedDeckPath,
      new_computed_content_hash: input.newContentHash,
      reviewer_notes: input.notes,
      reason_codes: input.reasonCodes,
    });
  if (revisionError)
    return NextResponse.json(
      { error: "proposal revision rejected" },
      { status: 409 },
    );
  await audit(a.auth.supabase, a.ctx, "change_draft_saved", {
    assignment_item_id: itemId,
    change_proposal_id: data.id,
  });
  return NextResponse.json({
    proposalId: data.id,
    status: input.status,
    canonicalVersionCreated: false,
  });
}
