import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  incorporationAgentPlanSchema,
  validateAgentPlan,
} from "@/lib/education/anki-incorporation";
import {
  authorizedAgentRequest,
  loadIncorporationCandidate,
} from "../../_lib";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!authorizedAgentRequest(request))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = incorporationAgentPlanSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid_agent_plan", issues: parsed.error.issues },
      { status: 400 },
    );
  const plan = parsed.data;
  const supabase = createAdminClient();
  const candidate = await loadIncorporationCandidate(
    supabase,
    plan.proposalId,
  );
  if (!candidate)
    return NextResponse.json(
      { error: "proposal_not_processing" },
      { status: 409 },
    );
  const validationErrors = validateAgentPlan(candidate, plan);
  if (validationErrors.length)
    return NextResponse.json(
      { error: "unsafe_agent_plan", issues: validationErrors },
      { status: 409 },
    );

  if (plan.result === "needs_attention") {
    const issue = [...new Set([...candidate.issues, ...plan.issues])]
      .join(",")
      .slice(0, 2000);
    const { error } = await supabase
      .from("anki_editor_workspace_proposals")
      .update({ status: "needs_attention", incorporation_issue: issue })
      .eq("id", candidate.proposalId)
      .eq("proposal_evidence_hash", candidate.proposalEvidenceHash)
      .eq("status", "processing");
    if (error)
      return NextResponse.json({ error: "attention_update_failed" }, { status: 500 });
    return NextResponse.json({
      proposalId: candidate.proposalId,
      status: "needs_attention",
      issues: issue ? issue.split(",") : [],
    });
  }

  const mappingOperations = candidate.operations
    .filter((operation) => operation.kind === "change_mapping")
    .map((operation) => ({
      action: operation.action,
      canonicalEntityId: operation.canonicalEntityId,
      mappingRole: operation.mappingRole,
    }));
  const { data: versionId, error } = await supabase.rpc(
    "incorporate_anki_workspace_proposal",
    {
      p_proposal_id: candidate.proposalId,
      p_evidence_hash: candidate.proposalEvidenceHash,
      p_final_fields: candidate.finalState.fields,
      p_final_tags: candidate.finalState.tags,
      p_final_deck_path: candidate.finalState.deckPath,
      p_content_hash: candidate.finalState.contentHash,
      p_mapping_operations: mappingOperations,
    },
  );
  if (error) {
    await supabase
      .from("anki_editor_workspace_proposals")
      .update({
        status: "needs_attention",
        incorporation_issue: String(error.message ?? "incorporation_failed").slice(
          0,
          2000,
        ),
      })
      .eq("id", candidate.proposalId)
      .eq("status", "processing");
    return NextResponse.json(
      { error: "incorporation_failed", issue: error.message },
      { status: 409 },
    );
  }
  return NextResponse.json({
    proposalId: candidate.proposalId,
    status: "incorporated",
    canonicalCardVersionId: versionId,
    releaseStatus: "eligible_for_next_release",
  });
}
