import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ANKI_INCORPORATION_CONTRACT,
  INCORPORATION_AGENT_INSTRUCTIONS,
} from "@/lib/education/anki-incorporation";
import {
  authorizedAgentRequest,
  loadIncorporationCandidate,
} from "../../_lib";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!authorizedAgentRequest(request))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminClient();
  const { data: proposalId, error } = await supabase.rpc(
    "claim_anki_workspace_proposal_for_incorporation",
  );
  if (error)
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  if (!proposalId) return new NextResponse(null, { status: 204 });
  const candidate = await loadIncorporationCandidate(supabase, proposalId);
  if (!candidate) {
    await supabase
      .from("anki_editor_workspace_proposals")
      .update({
        status: "needs_attention",
        incorporation_issue: "candidate_context_unavailable",
      })
      .eq("id", proposalId);
    return NextResponse.json(
      { error: "candidate_context_unavailable", proposalId },
      { status: 409 },
    );
  }
  return NextResponse.json({
    instructions: INCORPORATION_AGENT_INSTRUCTIONS,
    candidate,
    responseContract: {
      contractVersion: ANKI_INCORPORATION_CONTRACT,
      proposalId: candidate.proposalId,
      proposalEvidenceHash: candidate.proposalEvidenceHash,
      result:
        candidate.result === "ready"
          ? "incorporate"
          : candidate.result,
      acceptedOperationIds: candidate.operations.map(
        (operation) => operation.id,
      ),
      ignoredOperationIds: [],
      issues: candidate.issues,
    },
  });
}
