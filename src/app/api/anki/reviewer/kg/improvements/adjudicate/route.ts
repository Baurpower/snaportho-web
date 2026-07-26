/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { reviewerAuth, body } from "../../../_lib";

const requestSchema = z
  .object({
    contractVersion: z.literal("snaportho-anki-kg-improvement-adjudication.v1"),
    suggestionId: z.string().uuid(),
    decisionId: z.string().uuid(),
    adjudication: z.enum([
      "approve_for_incorporation",
      "request_changes",
      "reject",
      "defer",
    ]),
    approvedOperationIds: z.array(z.string().min(1).max(64)).max(50),
    evidenceHash: z.string().regex(/^[a-f0-9]{64}$/),
    reasonCodes: z
      .array(z.string().regex(/^[a-z0-9_:-]+$/))
      .max(20),
    notes: z.string().max(2000).optional().default(""),
    idempotencyKey: z.string().uuid(),
    clientVersion: z.string().min(1).max(64),
  })
  .strict();

async function materializeApprovedOperations(
  supabase: any,
  suggestion: any,
  approvedOperationIds: string[],
) {
  const operations = Array.isArray(suggestion.graph_diff?.operations)
    ? suggestion.graph_diff.operations
    : [];
  const approved = operations.filter((operation: any) =>
    approvedOperationIds.includes(String(operation?.id ?? "")),
  );
  for (const operation of approved) {
    const fingerprint = createHash("sha256")
      .update(
        `anki-reviewer|${suggestion.id}|${operation.id}|${suggestion.evidence_hash}`,
      )
      .digest("hex");
    const common = {
      proposal_fingerprint: fingerprint,
      source_signal_type: "canonical_card",
      source_signal_ids: [suggestion.canonical_card_id],
      confidence: 0,
      confidence_tier: "low",
      confidence_reason: "direct_human_review_then_independent_adjudication",
      evidence_summary: String(operation.evidence ?? "").slice(0, 2000),
      supporting_card_count: 1,
      supporting_question_count: 0,
      supporting_curriculum_node_count: 0,
      supporting_source_count: 1,
      conflict_count: 0,
      review_status: "needs_review",
      metadata: {
        source: "anki_reviewer_graph_improvement",
        suggestion_id: suggestion.id,
        improvement_id: suggestion.improvement_id,
        operation,
        evidence_hash: suggestion.evidence_hash,
      },
      is_active: true,
    };
    let proposal: Record<string, unknown>;
    if (operation.kind === "add_asset_mapping") {
      proposal = {
        ...common,
        proposal_type: "retarget_card_to_entity",
        proposed_existing_entity_id: operation.entityId,
      };
    } else if (operation.kind === "propose_entity") {
      proposal = {
        ...common,
        proposal_type: "create_canonical_entity",
        proposed_entity_type: operation.entityType,
        proposed_entity_label: operation.proposedLabel,
      };
    } else if (operation.kind === "propose_claim") {
      proposal = {
        ...common,
        proposal_type: "propose_educational_claim",
        proposed_existing_entity_id: operation.primaryEntityId,
      };
    } else {
      continue;
    }
    const { data: existing } = await supabase
      .from("kg_automation_proposals")
      .select("id")
      .eq("proposal_fingerprint", fingerprint)
      .eq("is_active", true)
      .maybeSingle();
    if (existing) continue;
    const { error } = await supabase.from("kg_automation_proposals").insert(proposal);
    if (error) {
      const { data: raced } = await supabase
        .from("kg_automation_proposals")
        .select("id")
        .eq("proposal_fingerprint", fingerprint)
        .eq("is_active", true)
        .maybeSingle();
      if (!raced) throw new Error("automation_proposal_materialization_failed");
    }
  }
}

export async function POST(request: Request) {
  const auth = await reviewerAuth(request, "clinical_editor");
  if ("response" in auth) return auth.response;
  const parsed = await body(request, requestSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data!;
  const { data: suggestion } = await auth.auth.supabase
    .from("anki_kg_improvement_suggestions")
    .select("id,reviewer_user_id,canonical_card_id,improvement_id,evidence_hash,graph_diff")
    .eq("id", input.suggestionId)
    .maybeSingle();
  if (!suggestion)
    return NextResponse.json({ error: "suggestion not found" }, { status: 404 });
  if (suggestion.reviewer_user_id === auth.ctx.userId)
    return NextResponse.json(
      { error: "independent adjudicator required" },
      { status: 403 },
    );
  if (
    suggestion.graph_diff?.reviewTier === "ontology_review" &&
    !auth.ctx.roles.includes("administrator")
  )
    return NextResponse.json(
      { error: "ontology review requires administrator" },
      { status: 403 },
    );
  if (suggestion.evidence_hash !== input.evidenceHash)
    return NextResponse.json(
      { error: "suggestion evidence changed", conflictType: "proposal_superseded" },
      { status: 409 },
    );
  const { data: existing } = await auth.auth.supabase
    .from("anki_kg_improvement_adjudications")
    .select("id,adjudication")
    .eq("adjudicator_user_id", auth.ctx.userId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existing)
    {
      if (existing.adjudication === "approve_for_incorporation")
        await materializeApprovedOperations(
          auth.auth.supabase,
          suggestion,
          input.approvedOperationIds,
        );
    return NextResponse.json({
      adjudicationId: existing.id,
      adjudication: existing.adjudication,
      idempotentReplay: true,
    });
    }
  const { data: row, error } = await auth.auth.supabase
    .from("anki_kg_improvement_adjudications")
    .insert({
      suggestion_id: input.suggestionId,
      decision_id: input.decisionId,
      adjudicator_user_id: auth.ctx.userId,
      device_token_id: auth.ctx.deviceTokenId,
      adjudication: input.adjudication,
      approved_operation_ids: input.approvedOperationIds,
      evidence_hash: input.evidenceHash,
      reason_codes: input.reasonCodes,
      adjudicator_notes: input.notes,
      idempotency_key: input.idempotencyKey,
      client_version: input.clientVersion,
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json(
      { error: "adjudication rejected" },
      { status: 409 },
    );
  if (input.adjudication === "approve_for_incorporation") {
    try {
      await materializeApprovedOperations(
        auth.auth.supabase,
        suggestion,
        input.approvedOperationIds,
      );
    } catch {
      return NextResponse.json(
        {
          error: "approved operations could not enter the governed KG queue",
          adjudicationId: row.id,
        },
        { status: 500 },
      );
    }
  }
  return NextResponse.json({
    adjudicationId: row.id,
    adjudication: input.adjudication,
    canonicalDataChanged: false,
    incorporated: false,
    queuedAutomationProposals:
      input.adjudication === "approve_for_incorporation"
        ? input.approvedOperationIds.length
        : 0,
  });
}
