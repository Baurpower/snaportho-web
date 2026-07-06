import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { buildHumanReviewPacket } from "../kg-factory/human-review-packet.ts";
import type { AutoReviewReport } from "./types.ts";

export function generateReviewPacket(
  displayName: string,
  proposals: ProposalRecord[],
  autoReview: AutoReviewReport
): { markdown: string; items: Array<Record<string, unknown>> } {
  const curationReport = {
    generatedAt: autoReview.generatedAt,
    pilotKey: autoReview.pilotKey,
    summary: {
      AUTO_APPROVED_LOW_RISK: autoReview.summary.AUTO_APPROVE,
      AUTO_REVISED: 0,
      HUMAN_REVIEW: autoReview.summary.SAFE_REVIEW,
      ATTENDING_REVIEW: autoReview.summary.EXPERT_REVIEW,
      REJECTED: autoReview.summary.REJECT,
    },
    decisions: autoReview.decisions.map((d) => ({
      proposal_fingerprint: d.proposal_fingerprint,
      proposal_type: d.proposal_type,
      route:
        d.category === "AUTO_APPROVE"
          ? ("AUTO_APPROVED_LOW_RISK" as const)
          : d.category === "EXPERT_REVIEW"
            ? ("ATTENDING_REVIEW" as const)
            : d.category === "REJECT"
              ? ("REJECTED" as const)
              : ("HUMAN_REVIEW" as const),
      scores: {
        confidence: d.confidence,
        evidence: d.evidenceQuality,
        ambiguity: 1 - d.ontologyConsistency,
        safety: d.safetyCriticality,
        completeness: d.publicationReadiness,
      },
      recommendation: `Auto-review: ${d.category}`,
      rationale: d.rationale,
      reviewerDecisionRequired:
        d.category === "EXPERT_REVIEW" || d.category === "SAFE_REVIEW"
          ? `Review ${d.proposal_type} (${d.category})`
          : null,
      revised: false,
      final_review_status: "needs_review" as const,
    })),
  };

  const escalated = autoReview.decisions.filter(
    (d) => d.category === "EXPERT_REVIEW" || d.category === "SAFE_REVIEW"
  );

  const escalatedFingerprints = new Set(escalated.map((d) => d.proposal_fingerprint));
  const queueProposals = proposals.filter((p) =>
    escalatedFingerprints.has(p.proposal_fingerprint)
  );

  const { markdown, items } = buildHumanReviewPacket(queueProposals, curationReport);

  const header = [
    `# Ontology Compiler — Human Review Packet (${displayName})`,
    "",
    `Generated: ${autoReview.generatedAt}`,
    "",
    `**Escalated for human review:** ${items.length} (${autoReview.humanReviewPercent}% of proposals)`,
    `**Auto-approved:** ${autoReview.summary.AUTO_APPROVE}`,
    `**Rejected:** ${autoReview.summary.REJECT}`,
    "",
    "Only ambiguous, safety-critical, or low-confidence items appear below.",
    "",
  ].join("\n");

  const body = markdown.replace(/^# Knowledge Factory[^\n]*\n\n/, "");

  return {
    markdown: `${header}${body}`,
    items: items.map((item) => ({
      ...item,
      auto_review_category: escalated.find(
        (d) => d.proposal_fingerprint === item.proposal_fingerprint
      )?.category,
    })),
  };
}