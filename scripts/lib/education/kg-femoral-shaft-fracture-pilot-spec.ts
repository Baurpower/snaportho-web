/**
 * Femoral shaft fracture knowledge neighborhood — manufacturing seed.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import { HIP_SHARED_ANATOMY_RELATIONSHIPS } from "./kg-hip-shared-anatomy.ts";
import {
  LE_SHARED_ANATOMY_RELATIONSHIPS,
  sharedHipAnatomyForLeSibling,
  sharedLeAnatomyEntitiesForSibling,
} from "./kg-lower-extremity-shared-anatomy.ts";

export const FEMORAL_SHAFT_PILOT_KEY = "femoral-shaft-fracture-neighborhood" as const;

export const FEMORAL_SHAFT_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-femoral-shaft-fractures",
  prepareTopicId: "femoral-shaft-fracture",
  legacyRetargetProposalKey: "retarget:trauma-femoral-shaft-fractures",
} as const;

export const FEMORAL_SHAFT_ASSET_COUNTS = {
  ankiCardMappings: 28,
  orthobulletsQuestionMappings: 60,
} as const;

const FEMORAL_SHAFT_SPECIFIC: PilotEntitySpec[] = [
  {
    slug: "femoral-shaft-fracture",
    entityType: "condition",
    preferredLabel: "Femoral Shaft Fracture",
    description: "Diaphyseal femur fracture often managed with intramedullary fixation in adults.",
    metadata: { clinical_kind: "fracture", pilot: FEMORAL_SHAFT_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "femoral-im-nailing",
    entityType: "procedure",
    preferredLabel: "Femoral IM Nailing",
    description: "Intramedullary nailing for unstable or operative femoral shaft fracture patterns.",
    metadata: { pilot: FEMORAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "femoral-im-nail-fixation",
    entityType: "fixation_method",
    preferredLabel: "Femoral IM Nail Fixation",
    description: "Intramedullary nail fixation method for femoral diaphyseal fractures.",
    metadata: { pilot: FEMORAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "segmental-femoral-shaft-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Segmental Femoral Shaft Fracture",
    description: "Two or more noncontiguous femoral shaft fracture segments indicating high-energy injury.",
    metadata: { pilot: FEMORAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "femoral-malunion",
    entityType: "complication",
    preferredLabel: "Femoral Malunion",
    description: "Angular, rotational, or length malalignment after femoral shaft fracture healing.",
    metadata: { pilot: FEMORAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "fat-embolism",
    entityType: "complication",
    preferredLabel: "Fat Embolism",
    description: "Systemic fat embolism syndrome risk after long-bone and femoral shaft trauma.",
    metadata: { pilot: FEMORAL_SHAFT_PILOT_KEY },
  },
];

export const FEMORAL_SHAFT_ENTITIES: PilotEntitySpec[] = [
  ...sharedLeAnatomyEntitiesForSibling(FEMORAL_SHAFT_PILOT_KEY),
  ...sharedHipAnatomyForLeSibling(FEMORAL_SHAFT_PILOT_KEY),
  ...FEMORAL_SHAFT_SPECIFIC,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const FEMORAL_SHAFT_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...LE_SHARED_ANATOMY_RELATIONSHIPS,
  ...HIP_SHARED_ANATOMY_RELATIONSHIPS,
  rel("lower-extremity-trauma-anatomy-hub", "prerequisite_for", "femoral-shaft-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("femoral-shaft-fracture", "injured_in", "femoral-diaphysis", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("femoral-shaft-fracture", "involves_anatomy", "lower-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("femoral-shaft-fracture", "at_risk_structure", "sciatic-nerve", {
    anatomy_role: "essential",
    relevance_reason: "traction_pinning",
    clinical_importance: "high",
    context_relevance: ["or", "call"],
  }),
  rel("femoral-shaft-fracture", "has_imaging_finding", "segmental-femoral-shaft-fracture", {
    relevance_reason: "high_energy",
    management_importance: "high",
  }),
  rel("segmental-femoral-shaft-fracture", "indicates_treatment", "femoral-im-nailing", {
    management_importance: "high",
    confidence: 0.85,
    review_status: "needs_review",
  }),
  rel("femoral-shaft-fracture", "uses_fixation", "femoral-im-nail-fixation", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("femoral-shaft-fracture", "treated_by", "femoral-im-nailing", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("femoral-im-nailing", "involves_anatomy", "femoral-diaphysis", {
    anatomy_role: "essential",
    relevance_reason: "implant_path",
    context_relevance: ["or"],
  }),
  rel("femoral-shaft-fracture", "has_complication", "femoral-malunion"),
  rel("femoral-shaft-fracture", "has_complication", "fat-embolism"),
];

export function activeFemoralShaftRelationships(): PilotRelationshipSpec[] {
  return FEMORAL_SHAFT_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const FEMORAL_SHAFT_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-fsf-im-nail-default",
    claimType: "fact",
    claimText: "Femoral shaft fractures in adults are commonly stabilized with intramedullary nailing to restore length, rotation, and early mobilization potential.",
    primaryEntitySlug: "femoral-shaft-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "trauma-femoral-shaft-fractures curriculum",
    contextRelevance: ["call", "or"],
  },
  {
    draftId: "claim-fsf-fat-embolism-trap",
    claimType: "board_trap",
    claimText: "Femoral shaft fractures carry fat embolism risk, especially with delayed stabilization after high-energy or polytrauma injury.",
    primaryEntitySlug: "fat-embolism",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "femoral shaft systemic complications",
    contextRelevance: ["call", "oite"],
  },
  {
    draftId: "claim-fsf-rotation-trap",
    claimType: "cognitive_trap",
    claimText: "Accepting femoral shaft malrotation because the fracture appears aligned on AP radiograph alone.",
    primaryEntitySlug: "femoral-malunion",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "femoral shaft alignment pitfalls",
    contextRelevance: ["or"],
  },
  {
    draftId: "claim-fsf-case-script",
    claimType: "clinical_script",
    claimText: "Describe fracture level, comminution, ipsilateral injuries, neurovascular exam, IM nail plan, and fat embolism monitoring.",
    primaryEntitySlug: "femoral-shaft-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "femoral shaft case presentation pattern",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-fsf-sciatic-nerve",
    claimType: "anatomy_pearl",
    claimText: "Sciatic nerve vulnerability matters during femoral traction and percutaneous proximal femoral access maneuvers.",
    primaryEntitySlug: "sciatic-nerve",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "femoral shaft operative anatomy",
    contextRelevance: ["or"],
  },
];

export const FEMORAL_SHAFT_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-fsf-im-nail-operative",
    subjectEntitySlug: "femoral-shaft-fracture",
    patternType: "operative_indication",
    trigger: "Unstable femoral shaft fracture, segmental pattern, or polytrauma patient needing early stabilization",
    action: "Discuss femoral IM nailing with attending; document alignment goals and systemic complication monitoring",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "femoral shaft operative pathway",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-fsf-open-fracture",
    subjectEntitySlug: "femoral-shaft-fracture",
    patternType: "operative_indication",
    trigger: "Open femoral shaft fracture or grossly contaminated soft-tissue injury",
    action: "Urgent irrigation and debridement with stabilization plan per attending and trauma protocol",
    urgency: "urgent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "open femoral shaft management",
    requiresAttendingReview: true,
  },
];

export function femoralShaftSlugToEntityMap(): Map<string, PilotEntitySpec> {
  return new Map(FEMORAL_SHAFT_ENTITIES.map((e) => [e.slug, e]));
}