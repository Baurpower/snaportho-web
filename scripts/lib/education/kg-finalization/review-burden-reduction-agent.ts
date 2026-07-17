import type { GraphFinalizationAgent, GraphFinalizationAgentReport } from "./types.ts";
import { emptyResult } from "./types.ts";
import { canonicalSemanticKey, inheritReviewDecision, type ReviewInheritanceCandidate } from "./review-inheritance.ts";
import { claimFingerprint, decisionPointFingerprint, entityFingerprint, relationshipFingerprint } from "./utils.ts";

type ReviewBurdenArtifacts = {
  decision_inheritance: Array<Record<string, unknown>>;
  review_delta_report: Record<string, unknown>;
};

export const ReviewBurdenReductionAgent: GraphFinalizationAgent<ReviewBurdenArtifacts> = {
  name: "ReviewBurdenReductionAgent",
  run(input): GraphFinalizationAgentReport<ReviewBurdenArtifacts> {
    const result = emptyResult();
    const artifacts: ReviewBurdenArtifacts = {
      decision_inheritance: [],
      review_delta_report: {},
    };
    const prior = new Map(input.priorReviewDecisions.map((decision) => [decision.proposal_fingerprint, decision]));
    const semanticPrior = new Map<string, (typeof input.priorReviewDecisions)[number]>();
    const fingerprints: Array<ReviewInheritanceCandidate & { kind: "entity" | "relationship" | "claim" | "decision_point"; object: unknown }> = [
      ...input.entities.map((object) => ({
        kind: "entity" as const,
        fingerprint: entityFingerprint(object),
        alternateFingerprints: [String(object.metadata?._provenance_fingerprint ?? "")].filter(Boolean),
        proposalType: "entity",
        riskClass: "identity",
        evidenceClass: String(object.source),
        canonicalSubject: object.slug,
        object,
      })),
      ...input.relationships.map((object) => ({
        kind: "relationship" as const,
        fingerprint: relationshipFingerprint(object),
        alternateFingerprints: [String(object.metadata?._provenance_fingerprint ?? "")].filter(Boolean),
        proposalType: "relationship",
        riskClass: String(object.metadata?.risk_class ?? object.metadata?.review_status ?? "relationship"),
        evidenceClass: String(object.source),
        canonicalSubject: object.subjectSlug,
        canonicalPredicate: object.predicate,
        canonicalObject: object.objectSlug,
        object,
      })),
      ...input.claims.map((object) => ({
        kind: "claim" as const,
        fingerprint: claimFingerprint(object),
        alternateFingerprints: [`claim|${object.draftId}`, String(object.metadata?._provenance_fingerprint ?? "")].filter(Boolean),
        proposalType: "claim",
        riskClass: String(object.importanceLevel),
        evidenceClass: String(object.contentSource),
        canonicalSubject: object.primaryEntitySlug,
        canonicalPredicate: object.claimType,
        canonicalObject: object.draftId,
        text: object.claimText,
        object,
      })),
      ...input.decisionPoints.map((object) => ({
        kind: "decision_point" as const,
        fingerprint: decisionPointFingerprint(object),
        alternateFingerprints: [
          `decision_point|${object.draftId}`,
          `decision|${object.draftId}`,
        ],
        proposalType: "decision_point",
        riskClass: String(object.safetyCriticality),
        evidenceClass: String(object.requiresAttendingReview ? "attending_review" : "clinical_review"),
        canonicalSubject: object.subjectEntitySlug,
        canonicalPredicate: object.patternType,
        canonicalObject: object.draftId,
        text: `${object.trigger} ${object.action}`,
        object,
      })),
    ];
    for (const item of fingerprints) {
      const exact = [item.fingerprint, ...item.alternateFingerprints].find((fingerprint) => prior.has(fingerprint));
      if (exact) semanticPrior.set(canonicalSemanticKey(item, input.aliases), prior.get(exact)!);
    }

    for (const item of fingerprints) {
      const inheritance = inheritReviewDecision(item, prior, semanticPrior, input.aliases);
      if (inheritance.mode === "none") continue;
      artifacts.decision_inheritance.push({
        fingerprint: item.fingerprint,
        matchedPriorFingerprint: inheritance.matchedPriorFingerprint,
        inheritanceMode: inheritance.mode,
        objectKind: item.kind,
        inheritedDecision: inheritance.inheritedDecision,
        reason: inheritance.reason,
      });
      result.approved.push({
        fingerprint: item.fingerprint,
        objectKind: item.kind,
        agent: this.name,
        reason: `Inherited prior review decision: ${inheritance.inheritedDecision}.`,
        confidence: inheritance.mode === "exact" ? 0.9 : 0.82,
      });
      result.metrics.reviewDecisionsInherited += 1;
    }

    const totalObjects = fingerprints.length;
    const exactCount = artifacts.decision_inheritance.filter((item) => item.inheritanceMode === "exact").length;
    const semanticCount = artifacts.decision_inheritance.filter((item) => item.inheritanceMode === "semantic").length;
    const rejectionPatternCount = artifacts.decision_inheritance.filter((item) => item.inheritanceMode === "rejection_pattern").length;
    artifacts.review_delta_report = {
      priorReviewDecisions: input.priorReviewDecisions.length,
      generatedObjects: totalObjects,
      exact_inheritance_count: exactCount,
      semantic_inheritance_count: semanticCount,
      rejection_pattern_reuse_count: rejectionPatternCount,
      exactFingerprintMatches: exactCount,
      semanticFingerprintMatches: semanticCount,
      estimatedHumanReviewItemsAvoided: artifacts.decision_inheritance.length,
      estimatedRemainingReviewObjects: Math.max(0, totalObjects - artifacts.decision_inheritance.length),
      delta_review_count: Math.max(0, totalObjects - artifacts.decision_inheritance.length),
      inheritanceMode: "exact_and_safe_semantic",
    };

    return { agent: this.name, generatedAt: new Date().toISOString(), result, artifacts };
  },
};
