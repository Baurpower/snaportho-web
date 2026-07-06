/**
 * Intertrochanteric femur fracture knowledge neighborhood — manufacturing seed.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  HIP_SHARED_ANATOMY_RELATIONSHIPS,
  sharedAnatomyEntitiesForSibling,
} from "./kg-hip-shared-anatomy.ts";

export const INTERTROCHANTERIC_PILOT_KEY = "intertrochanteric-fracture-neighborhood" as const;

export const INTERTROCHANTERIC_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-intertrochanteric-fractures",
  prepareTopicId: "intertrochanteric-fracture",
  legacyRetargetProposalKey: "retarget:trauma-intertrochanteric-fractures",
} as const;

export const INTERTROCHANTERIC_ASSET_COUNTS = {
  ankiCardMappings: 10,
  orthobulletsQuestionMappings: 40,
} as const;

const IT_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "intertrochanteric-fracture",
    entityType: "condition",
    preferredLabel: "Intertrochanteric Fracture",
    description: "Extracapsular proximal femur fracture through the intertrochanteric region.",
    metadata: { clinical_kind: "fracture", pilot: INTERTROCHANTERIC_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "cephalomedullary-nail",
    entityType: "implant",
    preferredLabel: "Cephalomedullary Nail",
    description: "Intramedullary implant for unstable intertrochanteric and subtrochanteric fracture patterns.",
    metadata: { pilot: INTERTROCHANTERIC_PILOT_KEY },
  },
  {
    slug: "cephalomedullary-nailing",
    entityType: "procedure",
    preferredLabel: "Cephalomedullary Nailing",
    description: "Operative intramedullary fixation procedure using a cephalomedullary nail.",
    metadata: { pilot: INTERTROCHANTERIC_PILOT_KEY },
  },
  {
    slug: "sliding-hip-screw",
    entityType: "implant",
    preferredLabel: "Sliding Hip Screw",
    description: "Plate-and-screw construct for stable intertrochanteric fracture patterns.",
    metadata: { pilot: INTERTROCHANTERIC_PILOT_KEY },
  },
  {
    slug: "unstable-intertrochanteric-pattern",
    entityType: "imaging_finding",
    preferredLabel: "Unstable Intertrochanteric Pattern",
    description: "Radiographic pattern with posterior/medial comminution or reverse obliquity suggesting instability.",
    metadata: { pilot: INTERTROCHANTERIC_PILOT_KEY },
  },
  {
    slug: "reverse-obliquity-it-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Reverse Obliquity Intertrochanteric Fracture",
    description: "Reverse oblique intertrochanteric line with medial cortical failure risk.",
    metadata: { pilot: INTERTROCHANTERIC_PILOT_KEY },
  },
  {
    slug: "intertrochanteric-implant-failure",
    entityType: "complication",
    preferredLabel: "Intertrochanteric Implant Failure",
    description: "Cutout, varus collapse, or fixation failure after intertrochanteric fracture treatment.",
    metadata: { pilot: INTERTROCHANTERIC_PILOT_KEY },
  },
];

export const INTERTROCHANTERIC_ENTITIES: PilotEntitySpec[] = [
  ...sharedAnatomyEntitiesForSibling(INTERTROCHANTERIC_PILOT_KEY),
  ...IT_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const INTERTROCHANTERIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...HIP_SHARED_ANATOMY_RELATIONSHIPS,
  rel("proximal-femur-anatomy-hub", "prerequisite_for", "intertrochanteric-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("intertrochanteric-fracture", "injured_in", "intertrochanteric-region", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("intertrochanteric-fracture", "involves_anatomy", "greater-trochanter", {
    anatomy_role: "essential",
    relevance_reason: "fixation_landmark",
    clinical_importance: "high",
  }),
  rel("intertrochanteric-fracture", "involves_anatomy", "lesser-trochanter", {
    anatomy_role: "essential",
    relevance_reason: "stability",
  }),
  rel("intertrochanteric-fracture", "involves_anatomy", "calcar", {
    anatomy_role: "essential",
    relevance_reason: "medial_support",
    clinical_importance: "high",
  }),
  rel("intertrochanteric-fracture", "involves_anatomy", "proximal-femur-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("intertrochanteric-fracture", "has_imaging_finding", "unstable-intertrochanteric-pattern", {
    relevance_reason: "instability",
    management_importance: "high",
  }),
  rel("intertrochanteric-fracture", "has_imaging_finding", "reverse-obliquity-it-fracture", {
    relevance_reason: "instability",
    management_importance: "high",
  }),
  rel("unstable-intertrochanteric-pattern", "indicates_treatment", "cephalomedullary-nailing", {
    management_importance: "high",
    confidence: 0.8,
    review_status: "needs_review",
  }),
  rel("reverse-obliquity-it-fracture", "indicates_treatment", "cephalomedullary-nailing", {
    management_importance: "high",
    confidence: 0.85,
    review_status: "needs_review",
  }),
  rel("intertrochanteric-fracture", "treated_by", "cephalomedullary-nail", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("intertrochanteric-fracture", "treated_by", "sliding-hip-screw", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("cephalomedullary-nailing", "involves_anatomy", "intertrochanteric-region", {
    anatomy_role: "essential",
    relevance_reason: "implant_path",
    context_relevance: ["or"],
  }),
  rel("intertrochanteric-fracture", "has_complication", "intertrochanteric-implant-failure"),
  rel("unstable-intertrochanteric-pattern", "explains_instability", "intertrochanteric-fracture", {
    management_importance: "high",
    confidence: 0.8,
  }),
];

export function activeIntertrochantericRelationships(): PilotRelationshipSpec[] {
  return INTERTROCHANTERIC_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const INTERTROCHANTERIC_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-it-extracapsular-fixation",
    claimType: "fact",
    claimText: "Intertrochanteric fractures are extracapsular injuries where stability pattern drives sliding hip screw versus cephalomedullary nail selection.",
    primaryEntitySlug: "intertrochanteric-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture learningObjectives + treatmentOptions",
    contextRelevance: ["call", "or"],
  },
  {
    draftId: "claim-it-reverse-obliquity-trap",
    claimType: "board_trap",
    claimText: "Reverse obliquity intertrochanteric fractures are unstable patterns where sliding hip screw fixation commonly fails.",
    primaryEntitySlug: "reverse-obliquity-it-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture deep.classification + boardPearls",
    contextRelevance: ["oite", "or"],
  },
  {
    draftId: "claim-it-medial-cortical-support",
    claimType: "anatomy_pearl",
    claimText: "Calcar and medial cortical buttress integrity strongly influence intertrochanteric fracture stability.",
    primaryEntitySlug: "calcar",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture deep.anatomy",
    contextRelevance: ["or"],
  },
  {
    draftId: "claim-it-cutout-cognitive-trap",
    claimType: "cognitive_trap",
    claimText: "Treating an unstable intertrochanteric pattern like a stable extra-articular fracture without implant selection adjustment.",
    primaryEntitySlug: "unstable-intertrochanteric-pattern",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture deep.decisionMaking",
    contextRelevance: ["or"],
  },
  {
    draftId: "claim-it-case-script",
    claimType: "clinical_script",
    claimText: "Describe fracture line orientation, medial comminution, implant category, tip-apex distance language, and mobilization plan.",
    primaryEntitySlug: "intertrochanteric-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture fast.caseSteps",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-it-implant-failure",
    claimType: "fact",
    claimText: "Varus collapse and lag-screw cutout are classic failure modes after intertrochanteric fixation.",
    primaryEntitySlug: "intertrochanteric-implant-failure",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture deep.complications",
    contextRelevance: ["clinic"],
  },
];

export const INTERTROCHANTERIC_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-it-cephalomedullary-unstable",
    subjectEntitySlug: "intertrochanteric-fracture",
    patternType: "operative_indication",
    trigger: "Unstable intertrochanteric pattern, reverse obliquity, or poor medial cortical support",
    action: "Favor cephalomedullary nail fixation with attending confirmation of implant and reduction strategy",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture deep.treatmentOptions",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-it-shs-stable",
    subjectEntitySlug: "intertrochanteric-fracture",
    patternType: "operative_indication",
    trigger: "Stable intertrochanteric pattern with intact medial buttress suitable for sliding hip screw",
    action: "Proceed with sliding hip screw pathway when attending agrees stability assessment",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture deep.treatmentOptions",
    requiresAttendingReview: true,
  },
];

export function intertrochantericSlugToEntityMap(): Map<string, PilotEntitySpec> {
  return new Map(INTERTROCHANTERIC_ENTITIES.map((e) => [e.slug, e]));
}