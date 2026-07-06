/**
 * Subtrochanteric femur fracture knowledge neighborhood — manufacturing seed.
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

export const SUBTROCHANTERIC_PILOT_KEY = "subtrochanteric-fracture-neighborhood" as const;

export const SUBTROCHANTERIC_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-subtrochanteric-fractures",
  prepareTopicId: "subtrochanteric-fracture",
  legacyRetargetProposalKey: "retarget:trauma-subtrochanteric-fractures",
} as const;

export const SUBTROCHANTERIC_ASSET_COUNTS = {
  ankiCardMappings: 11,
  orthobulletsQuestionMappings: 20,
} as const;

const ST_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "subtrochanteric-fracture",
    entityType: "condition",
    preferredLabel: "Subtrochanteric Fracture",
    description: "Proximal femoral diaphyseal fracture distal to the lesser trochanter with high mechanical demands.",
    metadata: { clinical_kind: "fracture", pilot: SUBTROCHANTERIC_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "cephalomedullary-nail",
    entityType: "implant",
    preferredLabel: "Cephalomedullary Nail",
    description: "Intramedullary implant shared with intertrochanteric neighborhood for proximal femur fixation.",
    metadata: { pilot: SUBTROCHANTERIC_PILOT_KEY, shared_implant: true },
  },
  {
    slug: "cephalomedullary-nailing",
    entityType: "procedure",
    preferredLabel: "Cephalomedullary Nailing",
    description: "Operative intramedullary fixation procedure using a cephalomedullary nail.",
    metadata: { pilot: SUBTROCHANTERIC_PILOT_KEY, shared_procedure: true },
  },
  {
    slug: "subtrochanteric-plate-osteosynthesis",
    entityType: "procedure",
    preferredLabel: "Subtrochanteric Plate Osteosynthesis",
    description: "Plate fixation option for selected subtrochanteric fracture patterns.",
    metadata: { pilot: SUBTROCHANTERIC_PILOT_KEY },
  },
  {
    slug: "seinsheimer-classification",
    entityType: "classification_system",
    preferredLabel: "Seinsheimer Classification",
    description: "Subtrochanteric fracture classification by fracture line and comminution.",
    metadata: { pilot: SUBTROCHANTERIC_PILOT_KEY },
  },
  {
    slug: "atypical-subtrochanteric-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Atypical Subtrochanteric Fracture",
    description: "Transverse/beaking pattern suggesting bisphosphonate-related or low-energy atypical morphology.",
    metadata: { pilot: SUBTROCHANTERIC_PILOT_KEY },
  },
  {
    slug: "subtrochanteric-varus-malunion",
    entityType: "complication",
    preferredLabel: "Subtrochanteric Varus Malunion",
    description: "Varus malalignment after subtrochanteric fracture with gait and abductor consequences.",
    metadata: { pilot: SUBTROCHANTERIC_PILOT_KEY },
  },
];

export const SUBTROCHANTERIC_ENTITIES: PilotEntitySpec[] = [
  ...sharedAnatomyEntitiesForSibling(SUBTROCHANTERIC_PILOT_KEY),
  ...ST_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const SUBTROCHANTERIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...HIP_SHARED_ANATOMY_RELATIONSHIPS,
  rel("proximal-femur-anatomy-hub", "prerequisite_for", "subtrochanteric-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("subtrochanteric-fracture", "injured_in", "lesser-trochanter", {
    anatomy_role: "essential",
    relevance_reason: "landmark",
    relationship_strength: "core",
    clinical_importance: "high",
    note: "subtrochanteric region defined distal to lesser trochanter",
  }),
  rel("subtrochanteric-fracture", "involves_anatomy", "intertrochanteric-region", {
    anatomy_role: "essential",
    relevance_reason: "proximity",
    clinical_importance: "high",
  }),
  rel("subtrochanteric-fracture", "involves_anatomy", "greater-trochanter", {
    anatomy_role: "essential",
    relevance_reason: "abductor_mechanics",
  }),
  rel("subtrochanteric-fracture", "involves_anatomy", "proximal-femur-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("subtrochanteric-fracture", "has_imaging_finding", "atypical-subtrochanteric-fracture", {
    relevance_reason: "morphology",
    management_importance: "high",
  }),
  rel("subtrochanteric-fracture", "treated_by", "cephalomedullary-nail", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("subtrochanteric-fracture", "treated_by", "subtrochanteric-plate-osteosynthesis", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("cephalomedullary-nailing", "involves_anatomy", "lesser-trochanter", {
    anatomy_role: "essential",
    relevance_reason: "entry_landmark",
    context_relevance: ["or"],
  }),
  rel("subtrochanteric-plate-osteosynthesis", "at_risk_structure", "sciatic-nerve", {
    anatomy_role: "essential",
    relevance_reason: "posterior_exposure",
    clinical_importance: "high",
    context_relevance: ["or"],
  }),
  rel("subtrochanteric-fracture", "has_complication", "subtrochanteric-varus-malunion"),
  rel("subtrochanteric-fracture", "has_classification", "seinsheimer-classification", {
    educational_importance: "high",
    context_relevance: ["clinic", "oite"],
  }),
  rel("atypical-subtrochanteric-fracture", "explains_instability", "subtrochanteric-fracture", {
    management_importance: "high",
    confidence: 0.75,
  }),
];

export function activeSubtrochantericRelationships(): PilotRelationshipSpec[] {
  return SUBTROCHANTERIC_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const SUBTROCHANTERIC_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-st-high-mechanical-demand",
    claimType: "fact",
    claimText: "Subtrochanteric fractures occur in a high-stress diaphyseal transition zone with significant varus and shortening forces.",
    primaryEntitySlug: "subtrochanteric-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "trauma-subtrochanteric curriculum + brobot topic context",
    contextRelevance: ["call", "or"],
  },
  {
    draftId: "claim-st-cephalomedullary-default",
    claimType: "board_trap",
    claimText: "Cephalomedullary nailing is the common operative answer for most subtrochanteric fractures on board-style questions.",
    primaryEntitySlug: "cephalomedullary-nail",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "trauma-subtrochanteric treatment patterns",
    contextRelevance: ["oite", "or"],
  },
  {
    draftId: "claim-st-atypical-bisphosphonate",
    claimType: "cognitive_trap",
    claimText: "Missing atypical subtrochanteric morphology in a low-energy patient on long-term bisphosphonates.",
    primaryEntitySlug: "atypical-subtrochanteric-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "subtrochanteric atypical fracture literature",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-st-sciatic-safety",
    claimType: "anatomy_pearl",
    claimText: "Posterior proximal femur exposure for plate fixation places the sciatic nerve at risk and requires deliberate protection.",
    primaryEntitySlug: "sciatic-nerve",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "proximal femur surgical anatomy",
    contextRelevance: ["or"],
  },
  {
    draftId: "claim-st-varus-malunion",
    claimType: "fact",
    claimText: "Varus malunion after subtrochanteric fracture alters abductor tension and gait mechanics.",
    primaryEntitySlug: "subtrochanteric-varus-malunion",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "subtrochanteric complications",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-st-case-script",
    claimType: "clinical_script",
    claimText: "Describe fracture level relative to lesser trochanter, comminution, implant plan, reduction strategy, and weight-bearing restrictions.",
    primaryEntitySlug: "subtrochanteric-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "subtrochanteric case presentation pattern",
    contextRelevance: ["call", "clinic"],
  },
];

export const SUBTROCHANTERIC_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-st-cephalomedullary-nail",
    subjectEntitySlug: "subtrochanteric-fracture",
    patternType: "operative_indication",
    trigger: "Unstable subtrochanteric fracture pattern requiring intramedullary stabilization",
    action: "Proceed with cephalomedullary nail fixation with attending-confirmed reduction and implant strategy",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "subtrochanteric operative defaults",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-st-atypical-workup",
    subjectEntitySlug: "subtrochanteric-fracture",
    patternType: "operative_indication",
    trigger: "Atypical subtrochanteric morphology in low-energy patient with bisphosphonate or metabolic bone disease concern",
    action: "Discuss extended workup, implant choice, and contralateral surveillance with attending before standard fragility pathway",
    urgency: "urgent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "atypical subtrochanteric fracture management",
    requiresAttendingReview: true,
  },
];

export function subtrochantericSlugToEntityMap(): Map<string, PilotEntitySpec> {
  return new Map(SUBTROCHANTERIC_ENTITIES.map((e) => [e.slug, e]));
}