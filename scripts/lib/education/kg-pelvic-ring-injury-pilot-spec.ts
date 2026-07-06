/**
 * Pelvic ring injury knowledge neighborhood — manufacturing seed (LE shared anatomy owner).
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  LE_SHARED_ANATOMY_ENTITIES,
  LE_SHARED_ANATOMY_RELATIONSHIPS,
} from "./kg-lower-extremity-shared-anatomy.ts";

export const PELVIC_RING_PILOT_KEY = "pelvic-ring-injury-neighborhood" as const;

export const PELVIC_RING_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-pelvic-ring-fractures",
  prepareTopicId: "pelvic-ring-injury",
  legacyRetargetProposalKey: "retarget:trauma-pelvic-ring-fractures",
} as const;

export const PELVIC_RING_ASSET_COUNTS = {
  ankiCardMappings: 14,
  orthobulletsQuestionMappings: 64,
} as const;

const PELVIC_RING_SPECIFIC: PilotEntitySpec[] = [
  {
    slug: "pelvic-ring-injury",
    entityType: "condition",
    preferredLabel: "Pelvic Ring Injury",
    description: "High-energy pelvic ring disruption with instability, hemorrhage, and resuscitation priorities.",
    metadata: { clinical_kind: "fracture", pilot: PELVIC_RING_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "young-burgess-classification",
    entityType: "classification_system",
    preferredLabel: "Young-Burgess Classification",
    description: "Mechanism-based pelvic ring injury classification (APC, LC, VS).",
    metadata: { pilot: PELVIC_RING_PILOT_KEY },
  },
  {
    slug: "pelvic-binder-application",
    entityType: "procedure",
    preferredLabel: "Pelvic Binder Application",
    description: "Emergency circumferential compression to reduce pelvic volume and tamponade hemorrhage.",
    metadata: { pilot: PELVIC_RING_PILOT_KEY },
  },
  {
    slug: "pelvic-external-fixation",
    entityType: "procedure",
    preferredLabel: "Pelvic External Fixation",
    description: "Anterior frame stabilization for unstable pelvic ring injuries during resuscitation or definitive care.",
    metadata: { pilot: PELVIC_RING_PILOT_KEY },
  },
  {
    slug: "unstable-pelvic-ring-pattern",
    entityType: "imaging_finding",
    preferredLabel: "Unstable Pelvic Ring Pattern",
    description: "Radiographic pattern with anterior and/or posterior ring disruption indicating mechanical instability.",
    metadata: { pilot: PELVIC_RING_PILOT_KEY },
  },
  {
    slug: "pelvic-hemorrhage",
    entityType: "complication",
    preferredLabel: "Pelvic Hemorrhage",
    description: "Life-threatening retroperitoneal bleeding from pelvic ring and venous plexus injury.",
    metadata: { pilot: PELVIC_RING_PILOT_KEY },
  },
];

export const PELVIC_RING_ENTITIES: PilotEntitySpec[] = [
  ...LE_SHARED_ANATOMY_ENTITIES.map((e) => ({
    ...e,
    metadata: { ...e.metadata, cluster_owner: PELVIC_RING_PILOT_KEY },
  })),
  ...PELVIC_RING_SPECIFIC,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const PELVIC_RING_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...LE_SHARED_ANATOMY_RELATIONSHIPS,
  rel("lower-extremity-trauma-anatomy-hub", "prerequisite_for", "pelvic-ring-injury", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("pelvic-ring-injury", "injured_in", "pelvis", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("pelvic-ring-injury", "injured_in", "sacrum", {
    anatomy_role: "essential",
    relevance_reason: "posterior_ring",
    clinical_importance: "high",
  }),
  rel("pelvic-ring-injury", "injured_in", "sacroiliac-joint", {
    anatomy_role: "essential",
    relevance_reason: "posterior_stability",
    clinical_importance: "high",
  }),
  rel("pelvic-ring-injury", "involves_anatomy", "pubic-symphysis", {
    anatomy_role: "essential",
    relevance_reason: "anterior_stability",
    clinical_importance: "high",
  }),
  rel("pelvic-ring-injury", "involves_anatomy", "lower-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("pelvic-ring-injury", "at_risk_structure", "pelvis", {
    anatomy_role: "essential",
    relevance_reason: "hemorrhage",
    clinical_importance: "high",
    context_relevance: ["call"],
  }),
  rel("pelvic-ring-injury", "has_imaging_finding", "unstable-pelvic-ring-pattern", {
    relevance_reason: "instability",
    management_importance: "high",
  }),
  rel("unstable-pelvic-ring-pattern", "indicates_treatment", "pelvic-binder-application", {
    management_importance: "high",
    confidence: 0.85,
    review_status: "needs_review",
    note: "resuscitation adjunct — not definitive fixation",
  }),
  rel("unstable-pelvic-ring-pattern", "indicates_treatment", "pelvic-external-fixation", {
    management_importance: "high",
    confidence: 0.8,
    review_status: "needs_review",
  }),
  rel("pelvic-ring-injury", "treated_by", "pelvic-binder-application", {
    management_importance: "high",
    context_relevance: ["call"],
  }),
  rel("pelvic-ring-injury", "treated_by", "pelvic-external-fixation", {
    management_importance: "high",
    context_relevance: ["or", "call"],
  }),
  rel("pelvic-external-fixation", "involves_anatomy", "pelvis", {
    anatomy_role: "essential",
    relevance_reason: "approach",
    context_relevance: ["or"],
  }),
  rel("pelvic-ring-injury", "has_classification", "young-burgess-classification", {
    educational_importance: "high",
    context_relevance: ["clinic", "oite"],
  }),
  rel("pelvic-ring-injury", "has_complication", "pelvic-hemorrhage"),
  rel("unstable-pelvic-ring-pattern", "explains_instability", "pelvic-ring-injury", {
    management_importance: "high",
    confidence: 0.85,
  }),
];

export function activePelvicRingRelationships(): PilotRelationshipSpec[] {
  return PELVIC_RING_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const PELVIC_RING_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-pri-ring-instability",
    claimType: "fact",
    claimText: "Pelvic ring injuries are evaluated as anterior and posterior ring disruptions where instability pattern drives binder, ex-fix, and hemorrhage control priorities.",
    primaryEntitySlug: "pelvic-ring-injury",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "trauma-pelvic-ring-fractures curriculum",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-pri-binder-not-definitive",
    claimType: "board_trap",
    claimText: "Pelvic binder application temporizes hemorrhage but does not replace assessment of unstable ring patterns requiring definitive stabilization.",
    primaryEntitySlug: "pelvic-binder-application",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "pelvic ring resuscitation board pearls",
    contextRelevance: ["call", "oite"],
  },
  {
    draftId: "claim-pri-missed-posterior-ring",
    claimType: "cognitive_trap",
    claimText: "Focusing only on pubic symphysis widening without evaluating sacroiliac disruption in high-energy pelvic trauma.",
    primaryEntitySlug: "unstable-pelvic-ring-pattern",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "pelvic ring imaging pitfalls",
    contextRelevance: ["call"],
  },
  {
    draftId: "claim-pri-case-script",
    claimType: "clinical_script",
    claimText: "State mechanism, hemodynamic status, binder placement, ring stability assessment, transfusion needs, and ex-fix versus definitive OR plan.",
    primaryEntitySlug: "pelvic-ring-injury",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "pelvic ring case presentation pattern",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-pri-si-joint-stability",
    claimType: "anatomy_pearl",
    claimText: "Sacroiliac joint and pubic symphysis integrity define anterior versus posterior pelvic ring stability contributions.",
    primaryEntitySlug: "sacroiliac-joint",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "pelvic ring anatomy",
    contextRelevance: ["or", "oite"],
  },
];

export const PELVIC_RING_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-pri-unstable-ring-stabilization",
    subjectEntitySlug: "pelvic-ring-injury",
    patternType: "operative_indication",
    trigger: "Unstable pelvic ring pattern with mechanical instability after resuscitation",
    action: "Apply pelvic binder if not in place; discuss anterior external fixation or definitive stabilization with trauma team and attending",
    urgency: "urgent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "pelvic ring unstable pattern management",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-pri-hemorrhage-control",
    subjectEntitySlug: "pelvic-ring-injury",
    patternType: "operative_indication",
    trigger: "Hemodynamically unstable patient with pelvic ring injury and suspected pelvic hemorrhage",
    action: "Activate massive transfusion pathway, pelvic binder, angioembolization discussion, and expedited ring stabilization per attending",
    urgency: "emergent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "pelvic hemorrhage resuscitation pathway",
    requiresAttendingReview: true,
  },
];

export function pelvicRingSlugToEntityMap(): Map<string, PilotEntitySpec> {
  return new Map(PELVIC_RING_ENTITIES.map((e) => [e.slug, e]));
}