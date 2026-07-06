/**
 * Wrap ProposalRecord in the standardized FactoryProposal envelope.
 */

import type { ProposalRecord } from "../../../kg-automation-common.ts";
import type { CurationRoute } from "../kg-factory/types.ts";
import { scoreProposalConfidence } from "./confidence.ts";
import type { ProposalEnvelope } from "./contract.ts";
import { buildReviewRecommendation } from "./review-bridge.ts";
import { PROPOSAL_SCHEMA_VERSION } from "./versioning.ts";
import { validateProposal, validateWorkAssignment } from "./validation.ts";
import type { WorkAssignment } from "./contract.ts";

export function wrapProposal(
  proposal: ProposalRecord,
  curationRoute?: CurationRoute
): ProposalEnvelope {
  const confidence = scoreProposalConfidence(proposal);
  const validation = validateProposal(proposal);
  const reviewRecommendation = buildReviewRecommendation(proposal, curationRoute);
  const meta = proposal.metadata ?? {};

  const label =
    proposal.proposed_entity_label ??
    String(meta.draft_id ?? proposal.proposal_fingerprint);

  return {
    schemaVersion: PROPOSAL_SCHEMA_VERSION,
    proposalId: proposal.proposal_fingerprint,
    proposal,
    target: {
      objectType: proposal.proposal_type,
      label,
      slug: meta.slug as string | undefined,
      predicate: proposal.proposed_predicate ?? undefined,
    },
    supportingEvidence: {
      summary: proposal.evidence_summary,
      sourceIds: proposal.source_signal_ids ?? [],
      cardCount: proposal.supporting_card_count,
      questionCount: proposal.supporting_question_count,
    },
    confidence: confidence.confidence,
    confidenceExplanation: confidence.rationale,
    confidenceBreakdown: confidence.breakdown,
    provenance: {
      sourceSignalType: proposal.source_signal_type,
      sourceSignalIds: proposal.source_signal_ids ?? [],
      evidenceSummary: proposal.evidence_summary,
    },
    reviewRecommendation,
    validation,
    ontologyCompliance: confidence.breakdown.ontologyCompliance,
    duplicateProbability: reviewRecommendation.duplicateRisk,
    conflictScore: reviewRecommendation.conflictRisk,
    publicationEligible:
      validation.passed &&
      reviewRecommendation.route === "AUTO_APPROVED_LOW_RISK" &&
      proposal.metadata?.content_source !== "verified" &&
      proposal.metadata?.publication_eligible !== false &&
      proposal.metadata?.generated_by !== "claim-builder-v2",
  };
}

export function wrapProposals(
  proposals: ProposalRecord[],
  curationRoutes?: CurationRoute[]
): ProposalEnvelope[] {
  return proposals.map((p, i) => wrapProposal(p, curationRoutes?.[i]));
}

export function validateProposalEnvelope(envelope: ProposalEnvelope) {
  const issues = [...envelope.validation.issues];
  if (!envelope.proposalId) {
    issues.push({
      category: "schema",
      code: "MISSING_PROPOSAL_ID",
      message: "Proposal envelope missing proposalId",
      severity: "error",
      recoverable: "blocked",
    });
  }
  if (!envelope.reviewRecommendation.route) {
    issues.push({
      category: "schema",
      code: "MISSING_ROUTE",
      message: "Proposal envelope missing review route",
      severity: "error",
      recoverable: "blocked",
    });
  }
  return {
    passed: !issues.some((i) => i.severity === "error" || i.severity === "critical"),
    issues,
    envelope,
  };
}

export { validateWorkAssignment };