import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { createServiceRoleClient, isMissingRelationError } from "../../../kg-automation-common.ts";

export type DbQualityReport = {
  generatedAt: string;
  pilotKey: string;
  source: "database" | "proposals_only";
  metrics: Record<string, number | string | boolean>;
  estimatedMaturityLevel: number;
};

export async function loadDbQualityMetrics(
  pilotKey: string,
  proposals: ProposalRecord[]
): Promise<DbQualityReport> {
  const metrics: Record<string, number | string | boolean> = {
    proposalCount: proposals.length,
    approvedProposalCount: proposals.filter((p) => p.review_status === "approved").length,
    entityProposalCount: proposals.filter((p) => p.proposal_type === "create_canonical_entity").length,
    relationshipProposalCount: proposals.filter((p) => p.proposal_type === "add_canonical_relationship").length,
    claimProposalCount: proposals.filter((p) => p.proposal_type === "propose_educational_claim").length,
    dpProposalCount: proposals.filter((p) => p.proposal_type === "propose_decision_point").length,
    autoApprovedCount: proposals.filter((p) => p.metadata?.curation_route === "AUTO_APPROVED_LOW_RISK").length,
    humanReviewCount: proposals.filter(
      (p) => p.metadata?.curation_route === "HUMAN_REVIEW" || p.metadata?.curation_route === "ATTENDING_REVIEW"
    ).length,
    canonicalEntityCount: 0,
    canonicalRelationshipCount: 0,
    educationalClaimCount: 0,
    decisionPointCount: 0,
    provenanceCompleteness: 0,
    reviewCompleteness: 0,
    publicationReadiness: false,
  };

  let source: DbQualityReport["source"] = "proposals_only";

  try {
    const supabase = createServiceRoleClient();

    const { count: entityCount } = await supabase
      .from("canonical_entities")
      .select("id", { count: "exact", head: true })
      .contains("metadata", { pilot: pilotKey });

    const { count: relCount } = await supabase
      .from("canonical_relationships")
      .select("id", { count: "exact", head: true });

    let claimCount = 0;
    let dpCount = 0;
    try {
      const { count: c } = await supabase
        .from("educational_claims")
        .select("id", { count: "exact", head: true });
      claimCount = c ?? 0;
      const { count: d } = await supabase
        .from("decision_points")
        .select("id", { count: "exact", head: true });
      dpCount = d ?? 0;
    } catch {
      // tables may not exist pre-migration
    }

    metrics.canonicalEntityCount = entityCount ?? 0;
    metrics.canonicalRelationshipCount = relCount ?? 0;
    metrics.educationalClaimCount = claimCount;
    metrics.decisionPointCount = dpCount;
    source = "database";
  } catch (error) {
    if (!isMissingRelationError(error, "canonical_entities")) {
      metrics.dbError = error instanceof Error ? error.message : String(error);
    }
  }

  const approved = Number(metrics.approvedProposalCount);
  const total = Number(metrics.proposalCount);
  metrics.reviewCompleteness = total > 0 ? approved / total : 0;
  metrics.provenanceCompleteness = proposals.every((p) => p.evidence_summary || p.source_signal_ids?.length)
    ? 1
    : 0.85;

  let maturity = 1;
  if (approved >= 5) maturity = 2;
  if (approved >= 15) maturity = 3;
  if (Number(metrics.claimProposalCount) >= 5) maturity = 4;
  if (Number(metrics.dpProposalCount) >= 1) maturity = 4;
  if (approved / Math.max(total, 1) >= 0.65) maturity = 5;
  if (Number(metrics.canonicalEntityCount) > 0 && Number(metrics.canonicalRelationshipCount) > 0) maturity = 6;
  if (metrics.reviewCompleteness >= 0.85 && Number(metrics.canonicalEntityCount) >= 10) maturity = 7;

  metrics.publicationReadiness = maturity >= 6 && Number(metrics.humanReviewCount) === 0;

  return {
    generatedAt: new Date().toISOString(),
    pilotKey,
    source,
    metrics,
    estimatedMaturityLevel: maturity,
  };
}