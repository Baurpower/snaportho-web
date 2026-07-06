import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { assessPublicationReadiness } from "../kg-factory/publication-readiness.ts";
import { validateProposalPacket } from "../kg-factory/validator.ts";
import {
  defaultAnkleQualityInput,
  scoreNeighborhoodQuality,
} from "../kg-neighborhood-quality.ts";
import type { AutoReviewReport, OntologyGap, PublicationReadinessResult } from "./types.ts";

export function validatePublicationReadiness(
  topicKey: string,
  pilotKey: string,
  targetLevel: number,
  gaps: OntologyGap[],
  proposals: ProposalRecord[],
  autoReview: AutoReviewReport
): PublicationReadinessResult {
  const validation = validateProposalPacket(pilotKey, proposals);
  const curationSummary = {
    generatedAt: new Date().toISOString(),
    pilotKey,
    summary: {
      AUTO_APPROVED_LOW_RISK: autoReview.summary.AUTO_APPROVE,
      AUTO_REVISED: autoReview.summary.SAFE_REVIEW,
      HUMAN_REVIEW: autoReview.summary.SAFE_REVIEW,
      ATTENDING_REVIEW: autoReview.summary.EXPERT_REVIEW,
      REJECTED: autoReview.summary.REJECT,
    },
    decisions: autoReview.decisions.map((d) => ({
      proposal_fingerprint: d.proposal_fingerprint,
      proposal_type: d.proposal_type,
      route:
        d.category === "AUTO_APPROVE"
          ? "AUTO_APPROVED_LOW_RISK"
          : d.category === "EXPERT_REVIEW"
            ? "ATTENDING_REVIEW"
            : d.category === "REJECT"
              ? "REJECTED"
              : "HUMAN_REVIEW",
      scores: {
        confidence: d.confidence,
        evidence: d.evidenceQuality,
        ambiguity: 1 - d.ontologyConsistency,
        safety: d.safetyCriticality,
        completeness: d.publicationReadiness,
      },
      recommendation: d.category,
      rationale: d.rationale,
      reviewerDecisionRequired: null,
      revised: false,
      final_review_status: "needs_review" as const,
    })),
  };

  const factoryReport = assessPublicationReadiness(
    pilotKey,
    proposals,
    validation,
    curationSummary
  );

  const qualityInput = defaultAnkleQualityInput();
  const quality = scoreNeighborhoodQuality(qualityInput);

  const blockers = [
    ...factoryReport.blockers,
    ...quality.blockers.filter((b) => !factoryReport.blockers.includes(b)),
  ];

  const criticalGaps = gaps.filter((g) => g.priority === "critical" || g.priority === "high");
  if (criticalGaps.length > 0) {
    blockers.push(`${criticalGaps.length} critical/high ontology gaps remain unresolved`);
  }

  if (autoReview.humanReviewPercent > 5 && autoReview.summary.EXPERT_REVIEW > 0) {
    // Expected for pilot — not a blocker, but tracked
  }

  const currentLevel = Math.max(
    factoryReport.estimatedMaturityLevel,
    quality.estimatedMaturityLevel
  );

  const remainingWork = [
    ...criticalGaps.slice(0, 8).map((g) => `[${g.priority}] ${g.reason}`),
    ...factoryReport.recommendedActions,
  ];

  const attendingReviewItems = autoReview.decisions.filter(
    (d) => d.category === "EXPERT_REVIEW"
  ).length;
  const humanReviewItems =
    autoReview.summary.SAFE_REVIEW + autoReview.summary.EXPERT_REVIEW;

  let effortBand: "low" | "medium" | "high" = "low";
  if (criticalGaps.length > 5 || humanReviewItems > 15) effortBand = "high";
  else if (criticalGaps.length > 2 || humanReviewItems > 8) effortBand = "medium";

  const ready =
    factoryReport.ready &&
    currentLevel >= targetLevel &&
    criticalGaps.length === 0 &&
    validation.passed;

  return {
    topicKey,
    pilotKey,
    generatedAt: new Date().toISOString(),
    currentLevel,
    requiredLevel: targetLevel,
    ready,
    blockers: [...new Set(blockers)],
    remainingWork,
    productReadiness: {
      traversalSmokeTest: quality.readyForTraversalSmokeTest,
      prepareReady: ready && currentLevel >= 6,
      brobotReady: ready && currentLevel >= 7,
    },
    estimatedEffort: {
      gapsRemaining: gaps.length,
      humanReviewItems,
      attendingReviewItems,
      effortBand,
    },
    dimensionScores: {
      clinical: Number(quality.metrics.canonicalIdentityCoverage),
      relationship: Number(quality.metrics.relationshipValidationRate),
      educational: Number(quality.metrics.claimAtomicityScore),
      reasoning: Number(quality.metrics.decisionPointCoverage),
      anatomical: Number(quality.metrics.anatomyCompleteness),
      review: Number(quality.metrics.reviewCompleteness),
      graph: 1 - Number(quality.metrics.orphanRate),
      asset: Math.min(
        1,
        (Number(quality.metrics.linkedCardCount) + Number(quality.metrics.linkedQuestionCount)) / 20
      ),
    },
  };
}