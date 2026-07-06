import type { ConfidenceBreakdown, ConfidenceResult, ReviewRoute } from "../contract.ts";
import type { ClaimType } from "./claim-type-classifier.ts";
import { isSafetyClaim } from "./claim-inference.ts";

export type ClaimConfidenceInput = {
  claimType: ClaimType;
  importanceLevel: string;
  evidenceQuality: number;
  sourceAgreement: number;
  atomicityScore: number;
  ontologyFit: number;
  text: string;
  whyItMatters: string[];
  evidenceItemCount: number;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function scoreClaimConfidence(input: ClaimConfidenceInput): ConfidenceResult {
  const rules: string[] = ["claim_builder_evidence_scoring"];

  let safetyLevel = 0.1;
  if (["board_trap", "cognitive_trap", "red_flag"].includes(input.claimType)) {
    safetyLevel = 0.55;
    rules.push("trap_claim_safety_weight");
  }
  if (isSafetyClaim(input.claimType, input.text, input.whyItMatters)) {
    safetyLevel = Math.max(safetyLevel, 0.65);
    rules.push("safety_content_detected");
  }

  const breakdown: ConfidenceBreakdown = {
    evidenceQuantity: clamp01(input.evidenceItemCount / 4),
    evidenceQuality: clamp01(input.evidenceQuality),
    sourceAgreement: clamp01(input.sourceAgreement),
    ontologyCompliance: clamp01(input.ontologyFit),
    relationshipValidity: 1,
    metadataCompleteness: input.atomicityScore >= 0.9 ? 0.9 : 0.6,
    conflictScore: 0,
    safetyLevel,
    rulesApplied: rules,
  };

  const confidence = clamp01(
    breakdown.evidenceQuality * 0.3 +
      breakdown.sourceAgreement * 0.15 +
      breakdown.ontologyCompliance * 0.2 +
      input.atomicityScore * 0.15 +
      breakdown.metadataCompleteness * 0.1 +
      breakdown.evidenceQuantity * 0.1 -
      safetyLevel * 0.1
  );

  const route = routeClaimReview(input.importanceLevel, input.claimType, safetyLevel, confidence);
  const rationale = [
    ...rules.map((r) => `Rule: ${r}`),
    `Evidence quality ${breakdown.evidenceQuality.toFixed(2)}, atomicity ${input.atomicityScore.toFixed(2)}`,
    `Routed to ${route} per claim-builder policy`,
  ];

  return { confidence, breakdown, recommendedRoute: route, rationale };
}

export function routeClaimReview(
  importanceLevel: string,
  claimType: ClaimType,
  safetyLevel: number,
  confidence: number
): ReviewRoute {
  if (claimType === "red_flag" || safetyLevel >= 0.65) return "ATTENDING_REVIEW";
  if (importanceLevel === "L1") return "HUMAN_REVIEW";
  if (["L2", "L3", "L4"].includes(importanceLevel)) {
    if (claimType === "anatomy_pearl" && confidence >= 0.88 && safetyLevel < 0.3) {
      return "AUTO_APPROVED_LOW_RISK";
    }
    return "HUMAN_REVIEW";
  }
  return "HUMAN_REVIEW";
}