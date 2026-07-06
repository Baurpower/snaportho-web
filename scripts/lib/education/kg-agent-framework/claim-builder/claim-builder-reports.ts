import type { ProposalRecord } from "../../../../kg-automation-common.ts";
import type { ClaimCandidate, ExtractionResult } from "./evidence-to-claim.ts";

export type ClaimBuilderOutput = {
  generatedAt: string;
  agentId: string;
  agentVersion: string;
  evidencePacketId?: string;
  gapsAddressed: number;
  gapsScheduled: number;
  claimsGenerated: number;
  claimsRejected: number;
  redirectedToDecisionPoint: number;
  candidates: ClaimCandidate[];
  rejected: ExtractionResult["rejected"];
  proposals: Array<{
    proposalFingerprint: string;
    draftId: string;
    claimType: string;
    importanceLevel: string;
    reviewRoute: string;
    evidenceItemIds: string[];
    verified: boolean;
  }>;
};

export function buildClaimBuilderOutput(params: {
  evidencePacketId?: string;
  gaps: { scheduled: number; addressed: number };
  extraction: ExtractionResult;
  proposals: ProposalRecord[];
}): ClaimBuilderOutput {
  return {
    generatedAt: new Date().toISOString(),
    agentId: "claim-builder",
    agentVersion: "2.0.0",
    evidencePacketId: params.evidencePacketId,
    gapsAddressed: params.gaps.addressed,
    gapsScheduled: params.gaps.scheduled,
    claimsGenerated: params.proposals.length,
    claimsRejected: params.extraction.rejected.length,
    redirectedToDecisionPoint: params.extraction.redirectedToDp.length,
    candidates: params.extraction.candidates,
    rejected: params.extraction.rejected,
    proposals: params.proposals.map((p) => ({
      proposalFingerprint: p.proposal_fingerprint,
      draftId: String(p.metadata?.draft_id ?? ""),
      claimType: String(p.metadata?.claim_type ?? ""),
      importanceLevel: String(p.metadata?.importance_level ?? ""),
      reviewRoute: String(p.metadata?.review_route_hint ?? ""),
      evidenceItemIds: (p.metadata?.evidence_item_ids as string[]) ?? [],
      verified: Boolean(p.metadata?.verified),
    })),
  };
}

export function buildClaimBuilderSummaryMd(output: ClaimBuilderOutput): string {
  const lines = [
    "# Claim Builder Summary",
    "",
    `Generated: ${output.generatedAt}`,
    `Agent: ${output.agentId} v${output.agentVersion}`,
    output.evidencePacketId ? `Evidence packet: \`${output.evidencePacketId}\`` : "Evidence packet: none",
    "",
    "## Metrics",
    "",
    "| Metric | Value |",
    "|--------|------:|",
    `| Gaps scheduled | ${output.gapsScheduled} |`,
    `| Gaps addressed | ${output.gapsAddressed} |`,
    `| Claims generated | ${output.claimsGenerated} |`,
    `| Claims rejected | ${output.claimsRejected} |`,
    `| Redirected to DP Builder | ${output.redirectedToDecisionPoint} |`,
    "",
    "## Generated claims",
    "",
    ...(output.proposals.length
      ? output.proposals.map(
          (p) =>
            `- **${p.claimType}** (${p.importanceLevel}) → ${p.draftId} [${p.reviewRoute}] evidence: ${p.evidenceItemIds.join(", ")}`
        )
      : ["- None"]),
    "",
    "## Rejected / redirected",
    "",
    ...(output.rejected.length
      ? output.rejected.slice(0, 10).map((r) => `- ${r.reason}: ${r.text.slice(0, 80)}...`)
      : ["- None"]),
    "",
    "## Safety",
    "",
    "- All claims: `content_source=generated_draft`, `verified=false`",
    "- Publication eligible: **no**",
    "",
  ];
  return lines.join("\n");
}

export function buildEvidenceClaimTrace(output: ClaimBuilderOutput) {
  return {
    generatedAt: output.generatedAt,
    evidencePacketId: output.evidencePacketId,
    traces: output.proposals.map((p) => ({
      draftId: p.draftId,
      proposalFingerprint: p.proposalFingerprint,
      evidenceItemIds: p.evidenceItemIds,
      claimType: p.claimType,
      reviewRoute: p.reviewRoute,
    })),
    rejectedTraces: output.rejected.map((r) => ({
      evidenceItemIds: r.evidenceItemIds,
      reason: r.reason,
      suggestDecisionPoint: r.suggestDecisionPoint,
      textPreview: r.text.slice(0, 120),
    })),
  };
}