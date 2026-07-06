/**
 * First-pass intelligent curator — rule-based, fully auditable.
 * Optional LLM enhancement can layer on top; default path requires no API key.
 */

import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { HIGH_RISK_PREDICATES } from "../kg-relationship-registry.ts";
import type { CurationRoute, CurationScores, CuratorDecision } from "./types.ts";

const LOW_RISK_PREDICATES = new Set([
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
const AUTO_ENTITY_TYPES = new Set([
  "anatomy_structure",
  "classification_system",
  "classification_grade",
  "imaging_finding",
  "biomechanics_concept",
  "complication",
  "fixation_method",
  "procedure",
  "condition",
]);

const HUMAN_REVIEW_CLAIM_TYPES = new Set([
  "board_trap",
  "cognitive_trap",
  "red_flag",
  "imaging_point",
  "clinical_script",
]);

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function isSpecBackedProposal(proposal: ProposalRecord): boolean {
  const meta = proposal.metadata ?? {};
  return Boolean(meta.pilot || meta.factory_version || meta.slug);
}

function scoreProposal(proposal: ProposalRecord): CurationScores {
  let confidence = proposal.confidence;
  let evidence = 0.7;
  let ambiguity = 0.2;
  let safety = 0.1;
  let completeness = 0.8;
  const meta = proposal.metadata ?? {};
  const specBacked = isSpecBackedProposal(proposal);

  if (specBacked && proposal.proposal_type !== "propose_educational_claim") {
    confidence = Math.max(confidence, 0.92);
    ambiguity = Math.min(ambiguity, 0.25);
    completeness = Math.max(completeness, 0.85);
  }

  if (proposal.supporting_card_count > 0 || proposal.supporting_question_count > 0) {
    evidence = clamp01(0.6 + Math.min(proposal.supporting_card_count, 20) * 0.02);
  }

  if (proposal.conflict_count > 0) {
    ambiguity = clamp01(0.5 + proposal.conflict_count * 0.15);
    confidence *= 0.85;
  }

  if (proposal.proposal_type === "propose_decision_point") {
    safety = 0.85;
    ambiguity = clamp01(ambiguity + 0.2);
  }

  if (proposal.proposal_type === "propose_educational_claim") {
    const claimType = String(meta.claim_type ?? "");
    if (["cognitive_trap", "board_trap", "red_flag"].includes(claimType)) {
      safety = 0.55;
      ambiguity = clamp01(ambiguity + 0.15);
    }
    if (claimType === "anatomy_pearl" && specBacked) {
      confidence = Math.max(confidence, 0.88);
      ambiguity = Math.min(ambiguity, 0.3);
      safety = 0.15;
    }
    const text = String(meta.claim_text ?? "");
    if (text.length > 220) {
      ambiguity = clamp01(ambiguity + 0.25);
      completeness = 0.55;
    }
  }

  if (
    proposal.proposal_type === "add_canonical_relationship" &&
    proposal.proposed_predicate &&
    HIGH_RISK_PREDICATES.has(proposal.proposed_predicate)
  ) {
    safety = 0.75;
  }

  const relMeta = meta.relationship_metadata as Record<string, unknown> | undefined;
  if (proposal.proposal_type === "add_canonical_relationship" && !relMeta) {
    completeness = 0.5;
  }

  return {
    confidence: clamp01(confidence),
    evidence: clamp01(evidence),
    ambiguity: clamp01(ambiguity),
    safety: clamp01(safety),
    completeness: clamp01(completeness),
  };
}

function isAtomicClaim(text: string): boolean {
  const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);
  return sentences.length <= 2 && text.length <= 280;
}

function autoReviseProposal(proposal: ProposalRecord): {
  revisions: Partial<ProposalRecord>;
  substantive: boolean;
} {
  const revisions: Partial<ProposalRecord> = {};
  const meta = { ...(proposal.metadata ?? {}) };
  let changed = false;
  let substantive = false;

  if (proposal.proposal_type === "propose_educational_claim") {
    const text = String(meta.claim_text ?? "").trim();
    if (text && !isAtomicClaim(text) && text.includes(",")) {
      const firstClause = text.split(/[,;]/)[0]?.trim();
      if (firstClause && firstClause.length > 20) {
        meta.claim_text = `${firstClause}.`;
        meta.curation_note = "Auto-split to first atomic clause";
        changed = true;
        substantive = true;
      }
    }
    if (!meta.content_source) {
      meta.content_source = "generated_draft";
      changed = true;
    }
    meta.verified = false;
    changed = true;
  }

  if (proposal.proposal_type === "add_canonical_relationship") {
    const relMeta = (meta.relationship_metadata as Record<string, unknown>) ?? {};
    if (!relMeta.anatomy_role && LOW_RISK_PREDICATES.has(String(proposal.proposed_predicate))) {
      relMeta.anatomy_role = "supporting";
      meta.relationship_metadata = relMeta;
      changed = true;
    }
    if (!relMeta.review_status) {
      relMeta.review_status = "unreviewed";
      meta.relationship_metadata = relMeta;
      changed = true;
    }
  }

  if (proposal.proposal_type === "create_canonical_entity" && !meta.slug && proposal.proposed_entity_label) {
    meta.slug = proposal.proposed_entity_label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    changed = true;
  }

  if (changed) {
    revisions.metadata = meta;
  }

  return { revisions, substantive };
}

function classifyRoute(proposal: ProposalRecord, scores: CurationScores, rules: string[]): CurationRoute {
  const specBacked = isSpecBackedProposal(proposal);

  if (proposal.proposal_type === "propose_decision_point") {
    rules.push("decision_point_requires_attending");
    return "ATTENDING_REVIEW";
  }

  if (
    proposal.proposal_type === "add_canonical_relationship" &&
    proposal.proposed_predicate &&
    HIGH_RISK_PREDICATES.has(proposal.proposed_predicate)
  ) {
    rules.push("high_risk_predicate");
    return "ATTENDING_REVIEW";
  }

  if (
    proposal.proposal_type === "add_canonical_relationship" &&
    proposal.proposed_predicate &&
    LOW_RISK_PREDICATES.has(proposal.proposed_predicate)
  ) {
    rules.push("deterministic_clinical_or_anatomy_predicate");
    return "AUTO_APPROVED_LOW_RISK";
  }

  if (
    proposal.proposal_type === "create_canonical_entity" &&
    proposal.proposed_entity_type &&
    AUTO_ENTITY_TYPES.has(proposal.proposed_entity_type) &&
    specBacked
  ) {
    rules.push("spec_backed_entity_create");
    return "AUTO_APPROVED_LOW_RISK";
  }

  if (proposal.proposal_type === "link_curriculum_node_to_entity") {
    rules.push("deterministic_bridge");
    return scores.confidence >= 0.85 ? "AUTO_APPROVED_LOW_RISK" : "HUMAN_REVIEW";
  }

  if (proposal.proposal_type === "propose_educational_claim") {
    const claimType = String(proposal.metadata?.claim_type ?? "");
    const importance = String(proposal.metadata?.importance_level ?? "");

    if (claimType === "anatomy_pearl" && specBacked) {
      rules.push("anatomy_pearl_on_hub");
      return "AUTO_APPROVED_LOW_RISK";
    }

    if (importance === "L2" && claimType === "fact") {
      rules.push("l2_fact_light_review");
      return "AUTO_REVISED";
    }

    if (HUMAN_REVIEW_CLAIM_TYPES.has(claimType)) {
      rules.push("educational_judgment_claim");
      return "HUMAN_REVIEW";
    }

    if (importance === "L1" && claimType === "fact") {
      rules.push("l1_management_fact");
      return "HUMAN_REVIEW";
    }
  }

  if (!specBacked && (scores.ambiguity >= 0.55 || scores.confidence < 0.65)) {
    rules.push("low_confidence_or_high_ambiguity");
    return "HUMAN_REVIEW";
  }

  if (specBacked && proposal.proposal_type === "create_canonical_entity") {
    rules.push("spec_backed_entity_fallback");
    return "AUTO_APPROVED_LOW_RISK";
  }

  rules.push("default_human_review");
  return "HUMAN_REVIEW";
}

function routeToReviewStatus(route: CurationRoute): ProposalRecord["review_status"] {
  switch (route) {
    case "AUTO_APPROVED_LOW_RISK":
      return "approved";
    case "AUTO_REVISED":
      return "needs_review";
    case "ATTENDING_REVIEW":
    case "HUMAN_REVIEW":
      return "needs_review";
    case "REJECTED":
      return "rejected";
    default:
      return "generated";
  }
}

function reviewerDecisionPrompt(proposal: ProposalRecord, route: CurationRoute): string | null {
  if (route === "AUTO_APPROVED_LOW_RISK" || route === "REJECTED") return null;

  if (proposal.proposal_type === "propose_decision_point") {
    return `Approve operative/management pathway: ${proposal.metadata?.draft_id}`;
  }
  if (proposal.proposal_type === "propose_educational_claim") {
    return `Confirm clinical accuracy and atomicity of claim: ${proposal.metadata?.draft_id}`;
  }
  if (proposal.proposal_type === "add_canonical_relationship" && proposal.proposed_predicate === "indicates_treatment") {
    return `Confirm management implication: ${proposal.metadata?.subject_slug} -[indicates_treatment]-> ${proposal.metadata?.object_slug}`;
  }
  return `Review ${proposal.proposal_type} for ${proposal.proposed_entity_label ?? proposal.proposal_fingerprint}`;
}

export function curateProposal(proposal: ProposalRecord): CuratorDecision {
  const rulesTriggered: string[] = [];
  const scores = scoreProposal(proposal);
  const { revisions, substantive } = autoReviseProposal(proposal);
  const revised = Object.keys(revisions).length > 0;

  let route = classifyRoute(proposal, scores, rulesTriggered);
  if (substantive && route === "AUTO_APPROVED_LOW_RISK") {
    route = "AUTO_REVISED";
    rulesTriggered.push("auto_revised_substantive_content");
  }

  const finalReviewStatus =
    route === "AUTO_APPROVED_LOW_RISK"
      ? "approved"
      : route === "AUTO_REVISED"
        ? "needs_review"
        : routeToReviewStatus(route);

  return {
    route,
    scores,
    recommendation:
      route === "AUTO_APPROVED_LOW_RISK"
        ? "Auto-approve — low-risk deterministic curation"
        : route === "AUTO_REVISED"
          ? "Auto-revise then queue for light human confirmation"
          : route === "ATTENDING_REVIEW"
            ? "Attending review required"
            : route === "REJECTED"
              ? "Reject proposal"
              : "Curator review required",
    rationale: rulesTriggered.map((r) => `Rule: ${r}`),
    alternatives:
      route === "HUMAN_REVIEW"
        ? ["Approve as-is", "Revise metadata", "Reject", "Escalate to attending"]
        : [],
    reviewerDecisionRequired: reviewerDecisionPrompt(proposal, route),
    revisions: {
      ...revisions,
      review_status: finalReviewStatus,
      metadata: {
        ...(proposal.metadata ?? {}),
        ...(revisions.metadata ?? {}),
        curation_route: route,
        curation_scores: scores,
        curation_rules: rulesTriggered,
        curated_at: new Date().toISOString(),
        content_source:
          proposal.proposal_type === "propose_educational_claim" ||
          proposal.proposal_type === "propose_decision_point"
            ? "generated_draft"
            : proposal.metadata?.content_source,
        verified: false,
      },
    },
    audit: {
      curator: "kg-factory-rules-v1",
      evaluatedAt: new Date().toISOString(),
      rulesTriggered,
      optionalLlmUsed: false,
    },
  };
}

export function curateProposalBatch(proposals: ProposalRecord[]): {
  curated: ProposalRecord[];
  decisions: CuratorDecision[];
} {
  const curated: ProposalRecord[] = [];
  const decisions: CuratorDecision[] = [];

  for (const proposal of proposals) {
    const decision = curateProposal(proposal);
    decisions.push(decision);
    curated.push({
      ...proposal,
      ...decision.revisions,
      review_status: decision.revisions.review_status ?? proposal.review_status,
      metadata: decision.revisions.metadata ?? proposal.metadata,
    });
  }

  return { curated, decisions };
}

export function summarizeCurationRoutes(decisions: CuratorDecision[]) {
  const summary = {
    AUTO_APPROVED_LOW_RISK: 0,
    AUTO_REVISED: 0,
    HUMAN_REVIEW: 0,
    ATTENDING_REVIEW: 0,
    REJECTED: 0,
  } satisfies Record<CurationRoute, number>;

  for (const d of decisions) {
    summary[d.route] += 1;
  }
  return summary;
}