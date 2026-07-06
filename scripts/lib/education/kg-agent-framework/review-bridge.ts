/**
 * Bridge intelligent curator decisions to ProposalEnvelope-compatible review recommendations.
 */

import type { ProposalRecord } from "../../../kg-automation-common.ts";
import type { CurationRoute } from "../kg-factory/types.ts";
import type { RequiredReviewer } from "../kg-compiler/types.ts";
import type { ReviewRecommendation, ReviewRoute } from "./contract.ts";
import { scoreProposalConfidence } from "./confidence.ts";

export function mapCurationRouteToReviewRoute(
  route: CurationRoute,
  proposal: ProposalRecord
): ReviewRoute {
  if (proposal.conflict_count >= 2) return "CONFLICTED";

  switch (route) {
    case "AUTO_APPROVED_LOW_RISK":
      return "AUTO_APPROVED_LOW_RISK";
    case "AUTO_REVISED":
      return "AUTO_REVISED";
    case "HUMAN_REVIEW":
      return "HUMAN_REVIEW";
    case "ATTENDING_REVIEW":
      return "ATTENDING_REVIEW";
    case "REJECTED":
      return "REJECT";
    default:
      return "HUMAN_REVIEW";
  }
}

export function reviewerRoleForRoute(route: ReviewRoute): RequiredReviewer {
  switch (route) {
    case "AUTO_APPROVED_LOW_RISK":
    case "AUTO_REVISED":
    case "REJECT":
      return "none";
    case "HUMAN_REVIEW":
    case "CONFLICTED":
      return "curator";
    case "ATTENDING_REVIEW":
      return "attending";
    default:
      return "curator";
  }
}

export function buildReviewRecommendation(
  proposal: ProposalRecord,
  curationRoute?: CurationRoute
): ReviewRecommendation {
  const confidence = scoreProposalConfidence(proposal);
  const route =
    curationRoute !== undefined
      ? mapCurationRouteToReviewRoute(curationRoute, proposal)
      : confidence.recommendedRoute;

  const duplicateRisk = proposal.conflict_count > 0
    ? Math.min(0.9, proposal.conflict_count * 0.2)
    : confidence.breakdown.conflictScore;

  const conflictRisk = route === "CONFLICTED"
    ? Math.max(0.6, duplicateRisk)
    : confidence.breakdown.conflictScore;

  const reason =
    route === "CONFLICTED"
      ? `Conflicting evidence signals (${proposal.conflict_count} conflicts)`
      : confidence.rationale[confidence.rationale.length - 1] ??
        `Routed to ${route} by explainable rules`;

  return {
    route,
    confidence: confidence.confidence,
    safetyScore: confidence.breakdown.safetyLevel,
    evidenceScore: confidence.breakdown.evidenceQuality,
    ontologyComplianceScore: confidence.breakdown.ontologyCompliance,
    duplicateRisk,
    conflictRisk,
    reason,
    rationale: confidence.rationale,
    requiredReviewerRole: reviewerRoleForRoute(route),
  };
}