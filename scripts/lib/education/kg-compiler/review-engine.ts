import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { validateRelationshipTriple } from "../kg-relationship-registry.ts";
import {
  curateProposal,
  curateProposalBatch,
  summarizeCurationRoutes,
} from "../kg-factory/intelligent-curator.ts";
import type { CurationRoute } from "../kg-factory/types.ts";
import {
  buildReviewRecommendation,
  mapCurationRouteToReviewRoute,
} from "../kg-agent-framework/review-bridge.ts";
import type { ProposalEnvelope } from "../kg-agent-framework/contract.ts";
import { wrapProposal } from "../kg-agent-framework/proposal-contract.ts";
import type { AutoReviewCategory, AutoReviewDecision, AutoReviewReport } from "./types.ts";

const AUTO_APPROVE_PREDICATES = new Set([
  "part_of",
  "contains",
  "articulates_with",
  "inserts_on",
  "prerequisite_for",
  "has_classification",
  "has_grade",
  "has_imaging_finding",
  "has_complication",
  "injured_in",
  "involves_anatomy",
]);

function mapRouteToCategory(
  route: CurationRoute,
  proposal: ProposalRecord,
  safety: number
): AutoReviewCategory {
  if (route === "REJECTED") return "REJECT";
  if (route === "ATTENDING_REVIEW") return "EXPERT_REVIEW";
  if (route === "AUTO_APPROVED_LOW_RISK") return "AUTO_APPROVE";

  if (route === "AUTO_REVISED") return "SAFE_REVIEW";

  if (proposal.proposal_type === "propose_decision_point") return "EXPERT_REVIEW";
  if (proposal.proposal_type === "propose_educational_claim") {
    const claimType = String(proposal.metadata?.claim_type ?? "");
    if (["red_flag", "cognitive_trap", "board_trap"].includes(claimType) || safety >= 0.5) {
      return "EXPERT_REVIEW";
    }
    if (String(proposal.metadata?.importance_level) === "L1") return "EXPERT_REVIEW";
    return "SAFE_REVIEW";
  }

  if (
    proposal.proposal_type === "add_canonical_relationship" &&
    proposal.proposed_predicate &&
    !AUTO_APPROVE_PREDICATES.has(proposal.proposed_predicate)
  ) {
    return proposal.proposed_predicate === "indicates_treatment" ? "EXPERT_REVIEW" : "SAFE_REVIEW";
  }

  if (route === "HUMAN_REVIEW") {
    return safety >= 0.55 ? "EXPERT_REVIEW" : "SAFE_REVIEW";
  }

  return "SAFE_REVIEW";
}

function reviewerType(category: AutoReviewCategory): import("./types.ts").RequiredReviewer {
  switch (category) {
    case "AUTO_APPROVE":
      return "none";
    case "SAFE_REVIEW":
      return "curator";
    case "EXPERT_REVIEW":
      return "attending";
    case "REJECT":
      return "none";
    default:
      return "curator";
  }
}

function ontologyConsistencyScore(proposal: ProposalRecord): number {
  if (proposal.proposal_type !== "add_canonical_relationship") return 1;
  const subjType = String(proposal.metadata?.subject_entity_type ?? "");
  const objType = String(proposal.metadata?.object_entity_type ?? "");
  const predicate = String(proposal.proposed_predicate ?? "");
  if (!subjType || !objType || !predicate) return 0.5;
  const result = validateRelationshipTriple({
    subjectEndpointType: "canonical_entity",
    subjectEntityType: subjType,
    predicate,
    objectEndpointType: "canonical_entity",
    objectEntityType: objType,
  });
  return result.valid ? 1 : 0;
}

function publicationReadinessScore(category: AutoReviewCategory, scores: {
  confidence: number;
  completeness: number;
  safety: number;
}): number {
  if (category === "REJECT") return 0;
  if (category === "EXPERT_REVIEW") return Math.min(0.45, scores.confidence * 0.5);
  if (category === "SAFE_REVIEW") return Math.min(0.7, scores.confidence * 0.75);
  return Math.min(0.85, scores.confidence * scores.completeness);
}

export function toProposalEnvelope(
  proposal: ProposalRecord,
  curationRoute?: CurationRoute
): ProposalEnvelope {
  return wrapProposal(proposal, curationRoute);
}

export function reviewProposal(proposal: ProposalRecord): AutoReviewDecision {
  const curation = curateProposal(proposal);
  const reviewRoute = mapCurationRouteToReviewRoute(curation.route, proposal);
  const recommendation = buildReviewRecommendation(proposal, curation.route);
  const category =
    reviewRoute === "CONFLICTED"
      ? "EXPERT_REVIEW"
      : mapRouteToCategory(curation.route, proposal, curation.scores.safety);
  const evidenceQuality = curation.scores.evidence;
  const ontologyConsistency = ontologyConsistencyScore(proposal);
  const relationshipValidity =
    proposal.proposal_type === "add_canonical_relationship" ? ontologyConsistency : 1;
  const duplicateProbability = proposal.conflict_count > 0 ? Math.min(0.9, proposal.conflict_count * 0.2) : 0.05;

  return {
    proposal_fingerprint: proposal.proposal_fingerprint,
    proposal_type: proposal.proposal_type,
    category,
    curationRoute: reviewRoute === "CONFLICTED" ? "HUMAN_REVIEW" : curation.route,
    confidence: recommendation.confidence,
    evidenceQuality: recommendation.evidenceScore,
    ontologyConsistency: recommendation.ontologyComplianceScore,
    relationshipValidity,
    duplicateProbability: recommendation.duplicateRisk,
    safetyCriticality: recommendation.safetyScore,
    publicationReadiness: publicationReadinessScore(category, curation.scores),
    humanReviewerType: recommendation.requiredReviewerRole,
    rationale: [...curation.rationale, recommendation.reason],
    rulesTriggered: curation.audit.rulesTriggered,
  };
}

export function runAutoReview(
  topicKey: string,
  pilotKey: string,
  proposals: ProposalRecord[]
): { curated: ProposalRecord[]; report: AutoReviewReport } {
  const { curated, decisions } = curateProposalBatch(proposals);
  void summarizeCurationRoutes(decisions);

  const autoDecisions = proposals.map((p, i) => {
    const decision = reviewProposal(p);
    // Align category with batch curation route when stricter
    const batchRoute = decisions[i]?.route;
    if (batchRoute === "ATTENDING_REVIEW") decision.category = "EXPERT_REVIEW";
    if (batchRoute === "AUTO_APPROVED_LOW_RISK" && decision.category === "SAFE_REVIEW") {
      decision.category = "AUTO_APPROVE";
    }
    return decision;
  });

  const summary = {
    AUTO_APPROVE: 0,
    SAFE_REVIEW: 0,
    EXPERT_REVIEW: 0,
    REJECT: 0,
  } as Record<AutoReviewCategory, number>;

  for (const d of autoDecisions) {
    summary[d.category] += 1;
  }

  const humanReview = summary.SAFE_REVIEW + summary.EXPERT_REVIEW;
  const humanReviewPercent = (humanReview / Math.max(proposals.length, 1)) * 100;
  const autoApprovedPercent = (summary.AUTO_APPROVE / Math.max(proposals.length, 1)) * 100;

  return {
    curated,
    report: {
      topicKey,
      pilotKey,
      generatedAt: new Date().toISOString(),
      summary,
      humanReviewPercent: Math.round(humanReviewPercent * 10) / 10,
      autoApprovedPercent: Math.round(autoApprovedPercent * 10) / 10,
      decisions: autoDecisions,
    },
  };
}