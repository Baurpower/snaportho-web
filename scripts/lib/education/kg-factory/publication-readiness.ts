import type { ProposalRecord } from "../../../kg-automation-common.ts";
import type { CurationReport, PublicationReadinessReport, ValidationReport } from "./types.ts";

export function assessPublicationReadiness(
  pilotKey: string,
  proposals: ProposalRecord[],
  validation: ValidationReport,
  curation?: CurationReport
): PublicationReadinessReport {
  const blockers: string[] = [];
  const actions: string[] = [];

  const approved = proposals.filter((p) => p.review_status === "approved");
  const pendingHuman = proposals.filter(
    (p) => p.review_status === "needs_review" || p.review_status === "generated"
  );
  const claims = proposals.filter((p) => p.proposal_type === "propose_educational_claim");
  const dps = proposals.filter((p) => p.proposal_type === "propose_decision_point");
  const unverifiedClaims = claims.filter((p) => p.metadata?.verified !== false && p.metadata?.content_source !== "verified");
  const attendingItems =
    curation?.decisions.filter((d) => d.route === "ATTENDING_REVIEW").length ?? 0;

  if (!validation.passed) {
    blockers.push("Validation failures must be resolved");
    actions.push("Run validation engine and fix errors");
  }

  if (pendingHuman.length > 0) {
    blockers.push(`${pendingHuman.length} proposals still awaiting human review`);
  }

  if (attendingItems > 0) {
    blockers.push(`${attendingItems} items require attending review`);
    actions.push("Route ATTENDING_REVIEW queue to attending reviewer");
  }

  if (claims.some((c) => c.metadata?.content_source === "verified")) {
    blockers.push("Draft clinical claims must not be marked verified");
  }

  if (dps.some((d) => d.review_status === "approved" && d.metadata?.requires_attending_review)) {
    blockers.push("Decision points with attending flag cannot auto-publish");
  }

  const rels = proposals.filter((p) => p.proposal_type === "add_canonical_relationship");
  const missingMeta = rels.filter((p) => {
    const m = p.metadata?.relationship_metadata as Record<string, unknown> | undefined;
    return !m?.anatomy_role && !m?.clinical_importance;
  });
  if (missingMeta.length > rels.length * 0.2) {
    blockers.push("Insufficient relationship metadata on essential edges");
    actions.push("Run curate step to normalize metadata");
  }

  let maturity = 1;
  if (approved.length >= 10) maturity = 2;
  if (approved.filter((p) => p.proposal_type === "add_canonical_relationship").length >= 15) maturity = 3;
  if (claims.length >= 5) maturity = 4;
  if (dps.length >= 1) maturity = 4;
  if (approved.length >= proposals.length * 0.7) maturity = 5;
  if (attendingItems === 0 && pendingHuman.length === 0 && validation.passed) maturity = 6;

  const ready = blockers.length === 0 && maturity >= 6;

  return {
    generatedAt: new Date().toISOString(),
    pilotKey,
    ready,
    estimatedMaturityLevel: maturity,
    blockers,
    recommendedActions: actions,
    metrics: {
      totalProposals: proposals.length,
      approvedProposals: approved.length,
      pendingReview: pendingHuman.length,
      claimDrafts: claims.length,
      decisionPointDrafts: dps.length,
      autoApproved:
        curation?.summary.AUTO_APPROVED_LOW_RISK ?? 0,
      humanReviewQueue:
        (curation?.summary.HUMAN_REVIEW ?? 0) + (curation?.summary.ATTENDING_REVIEW ?? 0),
      validationErrors: validation.issues.filter((i) => i.severity === "error").length,
    },
  };
}