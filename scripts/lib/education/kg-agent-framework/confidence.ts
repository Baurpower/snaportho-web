/**
 * Standardized explainable confidence scoring for factory proposals.
 * No opaque AI scores — every dimension is rule-derived.
 */

import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { HIGH_RISK_PREDICATES } from "../kg-relationship-registry.ts";
import type { ConfidenceBreakdown, ConfidenceResult, ReviewRoute } from "./contract.ts";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function scoreProposalConfidence(proposal: ProposalRecord): ConfidenceResult {
  const meta = proposal.metadata ?? {};
  const rules: string[] = [];

  const evidenceQuantity = clamp01(
    (proposal.supporting_card_count + proposal.supporting_question_count) / 20
  );
  const evidenceQuality = clamp01(
    0.5 +
      (proposal.supporting_card_count > 0 ? 0.15 : 0) +
      (proposal.supporting_question_count > 0 ? 0.15 : 0) +
      (proposal.supporting_source_count > 1 ? 0.1 : 0)
  );
  const sourceAgreement = clamp01(1 - proposal.conflict_count * 0.2);
  let ontologyCompliance = 0.9;
  let relationshipValidity = 1;
  let metadataCompleteness = meta.slug || meta.relationship_metadata ? 0.85 : 0.55;
  const conflictScore = clamp01(proposal.conflict_count * 0.25);
  let safetyLevel = 0.1;

  if (proposal.proposal_type === "add_canonical_relationship") {
    const predicate = String(proposal.proposed_predicate ?? "");
    relationshipValidity = predicate ? 0.95 : 0.4;
    if (HIGH_RISK_PREDICATES.has(predicate)) {
      safetyLevel = 0.75;
      rules.push("high_risk_predicate");
    }
    if (!meta.relationship_metadata) {
      metadataCompleteness = 0.5;
      rules.push("missing_relationship_metadata");
    }
  }

  if (proposal.proposal_type === "propose_decision_point") {
    safetyLevel = 0.85;
    rules.push("decision_point_safety_weight");
  }

  if (proposal.proposal_type === "propose_educational_claim") {
    const claimType = String(meta.claim_type ?? "");
    if (["board_trap", "cognitive_trap", "red_flag"].includes(claimType)) {
      safetyLevel = 0.55;
      rules.push("safety_adjacent_claim");
    }
    const text = String(meta.claim_text ?? "");
    if (text.length > 220) {
      metadataCompleteness = 0.5;
      rules.push("claim_length_penalty");
    }
    if (meta.generated_by === "claim-builder-v2") {
      rules.push("claim_builder_generated");
    }
  }

  if (proposal.proposal_type === "create_canonical_entity" && meta.pilot) {
    ontologyCompliance = 0.98;
    rules.push("spec_backed_entity");
  }

  const breakdown: ConfidenceBreakdown = {
    evidenceQuantity,
    evidenceQuality,
    sourceAgreement,
    ontologyCompliance,
    relationshipValidity,
    metadataCompleteness,
    conflictScore,
    safetyLevel,
    rulesApplied: rules,
  };

  const confidence = clamp01(
    proposal.confidence * 0.25 +
      evidenceQuality * 0.2 +
      ontologyCompliance * 0.2 +
      relationshipValidity * 0.15 +
      metadataCompleteness * 0.1 +
      sourceAgreement * 0.1 -
      conflictScore * 0.1
  );

  const route = recommendRoute(proposal, breakdown, confidence);
  const rationale = [
    ...rules.map((r) => `Rule: ${r}`),
    `Composite confidence ${confidence.toFixed(3)} from explainable dimensions`,
  ];

  return { confidence, breakdown, recommendedRoute: route, rationale };
}

export function recommendRoute(
  proposal: ProposalRecord,
  breakdown: ConfidenceBreakdown,
  confidence: number
): ReviewRoute {
  if (proposal.conflict_count >= 2) return "CONFLICTED";

  const meta = proposal.metadata ?? {};
  const hinted = meta.review_route_hint as ReviewRoute | undefined;
  if (proposal.proposal_type === "propose_educational_claim" && hinted) {
    return hinted;
  }

  if (proposal.proposal_type === "propose_educational_claim") {
    const importance = String(meta.importance_level ?? "");
    const claimType = String(meta.claim_type ?? "");
    if (claimType === "red_flag" || breakdown.safetyLevel >= 0.65) return "ATTENDING_REVIEW";
    if (importance === "L1") return "HUMAN_REVIEW";
  }

  if (proposal.proposal_type === "propose_decision_point") return "ATTENDING_REVIEW";

  if (
    proposal.proposal_type === "add_canonical_relationship" &&
    proposal.proposed_predicate &&
    (HIGH_RISK_PREDICATES.has(proposal.proposed_predicate) ||
      proposal.proposed_predicate === "at_risk_structure" ||
      proposal.proposed_predicate === "indicates_treatment")
  ) {
    return "ATTENDING_REVIEW";
  }

  if (breakdown.safetyLevel >= 0.7) return "ATTENDING_REVIEW";
  if (confidence >= 0.88 && breakdown.conflictScore < 0.15 && breakdown.safetyLevel < 0.3) {
    return "AUTO_APPROVED_LOW_RISK";
  }
  if (confidence >= 0.72 && breakdown.metadataCompleteness < 0.65) return "AUTO_REVISED";
  if (breakdown.safetyLevel >= 0.5) return "ATTENDING_REVIEW";
  if (confidence < 0.6 || breakdown.conflictScore > 0.35) return "HUMAN_REVIEW";
  return "HUMAN_REVIEW";
}

export function routeToReviewerType(route: ReviewRoute): import("../kg-compiler/types.ts").RequiredReviewer {
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