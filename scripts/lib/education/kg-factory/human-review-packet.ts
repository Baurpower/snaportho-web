import type { ProposalRecord } from "../../../kg-automation-common.ts";
import type { CurationReport } from "./types.ts";

export function buildHumanReviewPacket(
  proposals: ProposalRecord[],
  curation: CurationReport
): {
  markdown: string;
  items: Array<Record<string, unknown>>;
} {
  const decisionByFp = new Map(curation.decisions.map((d) => [d.proposal_fingerprint, d]));

  const humanQueue = proposals.filter((p) => {
    const route = p.metadata?.curation_route ?? decisionByFp.get(p.proposal_fingerprint)?.route;
    return route === "HUMAN_REVIEW" || route === "ATTENDING_REVIEW";
  });

  const items = humanQueue.map((proposal) => {
    const decision = decisionByFp.get(proposal.proposal_fingerprint);
    return {
      proposal_fingerprint: proposal.proposal_fingerprint,
      proposal_type: proposal.proposal_type,
      route: decision?.route ?? proposal.metadata?.curation_route,
      target:
        proposal.proposed_entity_label ??
        `${proposal.metadata?.subject_slug} -[${proposal.proposed_predicate}]-> ${proposal.metadata?.object_slug}` ??
        proposal.metadata?.draft_id,
      agent_recommendation: decision?.recommendation,
      confidence: decision?.scores.confidence,
      safety_score: decision?.scores.safety,
      rationale: decision?.rationale ?? [],
      reviewer_decision_required: decision?.reviewerDecisionRequired,
      alternatives: decision?.alternatives ?? [],
      evidence_summary: proposal.evidence_summary,
      metadata: proposal.metadata,
    };
  });

  const lines = [
    "# Knowledge Factory — Human Review Queue (Ankle)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `**Items requiring human judgment:** ${items.length}`,
    `**Auto-curated (low-risk):** ${curation.summary.AUTO_APPROVED_LOW_RISK}`,
    "",
    "Everything else was classified and justified by the first-pass curator.",
    "",
  ];

  for (const item of items) {
    lines.push(`## ${item.proposal_fingerprint}`);
    lines.push("");
    lines.push(`- **Type:** ${item.proposal_type}`);
    lines.push(`- **Route:** ${item.route}`);
    lines.push(`- **Target:** ${item.target}`);
    lines.push(`- **Agent recommendation:** ${item.agent_recommendation}`);
    lines.push(`- **Confidence:** ${item.confidence}`);
    lines.push(`- **Safety score:** ${item.safety_score}`);
    lines.push(`- **Decision required:** ${item.reviewer_decision_required}`);
    lines.push("");
    lines.push("**Rationale:**");
    for (const r of item.rationale as string[]) {
      lines.push(`- ${r}`);
    }
    lines.push("");
    if ((item.alternatives as string[]).length) {
      lines.push("**Alternatives:**");
      for (const a of item.alternatives as string[]) {
        lines.push(`- ${a}`);
      }
      lines.push("");
    }
  }

  return { markdown: lines.join("\n"), items };
}