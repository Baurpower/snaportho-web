/**
 * Femoral neck fracture knowledge neighborhood — manufacturing seed.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  HIP_SHARED_ANATOMY_ENTITIES,
  HIP_SHARED_ANATOMY_PILOT_KEY,
  HIP_SHARED_ANATOMY_RELATIONSHIPS,
} from "./kg-hip-shared-anatomy.ts";

export const FEMORAL_NECK_PILOT_KEY = "femoral-neck-fracture-neighborhood" as const;

export const FEMORAL_NECK_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-femoral-neck-fractures",
  prepareTopicId: "femoral-neck-fracture",
  legacyRetargetProposalKey: "retarget:trauma-femoral-neck-fractures",
} as const;

export const FEMORAL_NECK_ASSET_COUNTS = {
  ankiCardMappings: 9,
  orthobulletsQuestionMappings: 64,
} as const;

const NECK_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "femoral-neck-fracture",
    entityType: "condition",
    preferredLabel: "Femoral Neck Fracture",
    description: "Intracapsular proximal femur fracture with head viability and AVN risk concerns.",
    metadata: { clinical_kind: "fracture", pilot: FEMORAL_NECK_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "garden-classification",
    entityType: "classification_system",
    preferredLabel: "Garden Classification",
    description: "Displacement-based femoral neck fracture classification framework.",
    metadata: { pilot: FEMORAL_NECK_PILOT_KEY },
  },
  {
    slug: "hip-hemiarthroplasty",
    entityType: "procedure",
    preferredLabel: "Hip Hemiarthroplasty",
    description: "Partial hip replacement for select displaced femoral neck fractures in older adults.",
    metadata: { pilot: FEMORAL_NECK_PILOT_KEY },
  },
  {
    slug: "avascular-necrosis",
    entityType: "complication",
    preferredLabel: "Avascular Necrosis",
    description: "Femoral head osteonecrosis after compromised retinacular blood supply.",
    metadata: { pilot: FEMORAL_NECK_PILOT_KEY },
  },
  {
    slug: "cannulated-screw-fixation",
    entityType: "fixation_method",
    preferredLabel: "Cannulated Screw Fixation",
    description: "Parallel screw fixation for selected femoral neck fracture patterns.",
    metadata: { pilot: FEMORAL_NECK_PILOT_KEY },
  },
  {
    slug: "femoral-neck-orif",
    entityType: "procedure",
    preferredLabel: "Femoral Neck ORIF",
    description: "Open reduction internal fixation of femoral neck fracture.",
    metadata: { pilot: FEMORAL_NECK_PILOT_KEY },
  },
  {
    slug: "displaced-femoral-neck-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Displaced Femoral Neck Fracture",
    description: "Radiographic displacement pattern altering fixation versus arthroplasty calculus.",
    metadata: { pilot: FEMORAL_NECK_PILOT_KEY },
  },
  {
    slug: "femoral-neck-nonunion",
    entityType: "complication",
    preferredLabel: "Femoral Neck Nonunion",
    description: "Failure of femoral neck fracture healing with mechanical symptoms.",
    metadata: { pilot: FEMORAL_NECK_PILOT_KEY },
  },
];

export const FEMORAL_NECK_ENTITIES: PilotEntitySpec[] = [
  ...HIP_SHARED_ANATOMY_ENTITIES.map((e) => ({
    ...e,
    metadata: { ...e.metadata, cluster_owner: FEMORAL_NECK_PILOT_KEY },
  })),
  ...NECK_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const FEMORAL_NECK_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...HIP_SHARED_ANATOMY_RELATIONSHIPS,
  rel("proximal-femur-anatomy-hub", "prerequisite_for", "femoral-neck-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("femoral-neck-fracture", "injured_in", "femoral-neck", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("femoral-neck-fracture", "involves_anatomy", "femoral-head", {
    anatomy_role: "essential",
    relevance_reason: "viability",
    clinical_importance: "high",
  }),
  rel("femoral-neck-fracture", "involves_anatomy", "medial-femoral-circumflex-artery", {
    anatomy_role: "essential",
    relevance_reason: "blood_supply",
    clinical_importance: "high",
  }),
  rel("femoral-neck-fracture", "involves_anatomy", "calcar", {
    anatomy_role: "essential",
    relevance_reason: "stability",
  }),
  rel("femoral-neck-fracture", "involves_anatomy", "proximal-femur-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("femoral-neck-fracture", "at_risk_structure", "medial-femoral-circumflex-artery", {
    anatomy_role: "essential",
    relevance_reason: "blood_supply",
    clinical_importance: "high",
    context_relevance: ["or"],
  }),
  rel("femoral-neck-fracture", "has_imaging_finding", "displaced-femoral-neck-fracture", {
    relevance_reason: "displacement",
    management_importance: "high",
  }),
  rel("displaced-femoral-neck-fracture", "indicates_treatment", "hip-hemiarthroplasty", {
    management_importance: "high",
    confidence: 0.75,
    review_status: "needs_review",
    note: "age and function dependent — attending review required",
  }),
  rel("femoral-neck-fracture", "uses_fixation", "cannulated-screw-fixation", {
    management_importance: "high",
    context_relevance: ["or", "clinic"],
  }),
  rel("femoral-neck-fracture", "treated_by", "femoral-neck-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("femoral-neck-fracture", "treated_by", "hip-hemiarthroplasty", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("femoral-neck-orif", "involves_anatomy", "femoral-neck", {
    anatomy_role: "essential",
    relevance_reason: "approach",
    context_relevance: ["or"],
  }),
  rel("femoral-neck-fracture", "has_complication", "avascular-necrosis"),
  rel("femoral-neck-fracture", "has_complication", "femoral-neck-nonunion"),
  rel("femoral-neck-fracture", "has_classification", "garden-classification", {
    educational_importance: "high",
    context_relevance: ["clinic", "oite"],
  }),
];

export function activeFemoralNeckRelationships(): PilotRelationshipSpec[] {
  return FEMORAL_NECK_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const FEMORAL_NECK_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-fnf-intracapsular-urgency",
    claimType: "fact",
    claimText: "Femoral neck fractures are intracapsular injuries where fracture location and displacement drive fixation versus arthroplasty decisions.",
    primaryEntitySlug: "femoral-neck-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture fast.oneLiner + learningObjectives",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-fnf-mfca-avn",
    claimType: "anatomy_pearl",
    claimText: "Medial femoral circumflex and retinacular blood supply vulnerability explains AVN risk after femoral neck fracture.",
    primaryEntitySlug: "medial-femoral-circumflex-artery",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture deep.anatomy",
    contextRelevance: ["or", "oite"],
  },
  {
    draftId: "claim-fnf-displaced-older-arthroplasty",
    claimType: "board_trap",
    claimText: "Displaced femoral neck fractures in older adults are often arthroplasty problems rather than screw fixation problems.",
    primaryEntitySlug: "displaced-femoral-neck-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture deep.boardPearls",
    contextRelevance: ["oite", "clinic"],
  },
  {
    draftId: "claim-fnf-younger-orif",
    claimType: "cognitive_trap",
    claimText: "Applying geriatric arthroplasty defaults to young active patients with femoral neck fractures without head-preservation discussion.",
    primaryEntitySlug: "femoral-neck-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture fast.pimpQuestions",
    contextRelevance: ["call"],
  },
  {
    draftId: "claim-fnf-garden-language",
    claimType: "fact",
    claimText: "Garden displacement language helps communicate femoral neck fracture stability and treatment tendency.",
    primaryEntitySlug: "garden-classification",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture deep.classification",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-fnf-case-script",
    claimType: "clinical_script",
    claimText: "State fracture location, displacement, medical optimization urgency, DVT prophylaxis, and likely fixation versus arthroplasty pathway.",
    primaryEntitySlug: "femoral-neck-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture fast.caseSteps",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-fnf-nonunion-risk",
    claimType: "fact",
    claimText: "Femoral neck nonunion remains a major failure mode when reduction, fixation, or biology are unfavorable.",
    primaryEntitySlug: "femoral-neck-nonunion",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture deep.complications",
    contextRelevance: ["clinic"],
  },
];

export const FEMORAL_NECK_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-fnf-arthroplasty-pathway",
    subjectEntitySlug: "femoral-neck-fracture",
    patternType: "operative_indication",
    trigger: "Displaced femoral neck fracture in older adult with low functional reserve or poor healing potential",
    action: "Discuss hemiarthroplasty versus total hip arthroplasty with attending; document medical optimization and DVT prophylaxis",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture deep.decisionMaking + treatmentOptions",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-fnf-head-preservation-orif",
    subjectEntitySlug: "femoral-neck-fracture",
    patternType: "operative_indication",
    trigger: "Younger patient with displaced or non-displaced femoral neck fracture where head preservation is prioritized",
    action: "Urgent anatomic reduction and stable fixation (typically cannulated screws) with AVN surveillance plan",
    urgency: "urgent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts hip-fracture fast.pimpQuestions + deep.treatmentOptions",
    requiresAttendingReview: true,
  },
];

export function femoralNeckSlugToEntityMap(): Map<string, PilotEntitySpec> {
  return new Map(FEMORAL_NECK_ENTITIES.map((e) => [e.slug, e]));
}