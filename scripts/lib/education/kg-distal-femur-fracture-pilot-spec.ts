/**
 * Distal femur fracture knowledge neighborhood — manufacturing seed.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  LE_SHARED_ANATOMY_RELATIONSHIPS,
  sharedLeAnatomyEntitiesForSibling,
} from "./kg-lower-extremity-shared-anatomy.ts";

export const DISTAL_FEMUR_PILOT_KEY = "distal-femur-fracture-neighborhood" as const;

export const DISTAL_FEMUR_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-distal-femur-fractures",
  prepareTopicId: "distal-femur-fracture",
  legacyRetargetProposalKey: "retarget:trauma-distal-femur-fractures",
} as const;

export const DISTAL_FEMUR_ASSET_COUNTS = {
  ankiCardMappings: 9,
  orthobulletsQuestionMappings: 19,
} as const;

const DISTAL_FEMUR_SPECIFIC: PilotEntitySpec[] = [
  {
    slug: "distal-femur-fracture",
    entityType: "condition",
    preferredLabel: "Distal Femur Fracture",
    description: "Supracondylar femur fracture with articular involvement and vascular proximity concerns.",
    metadata: { clinical_kind: "fracture", pilot: DISTAL_FEMUR_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "distal-femur-orif",
    entityType: "procedure",
    preferredLabel: "Distal Femur ORIF",
    description: "Open reduction internal fixation of displaced distal femur fracture.",
    metadata: { pilot: DISTAL_FEMUR_PILOT_KEY },
  },
  {
    slug: "intra-articular-distal-femur-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Intra-Articular Distal Femur Fracture",
    description: "Distal femur fracture with condylar articular step-off or comminution.",
    metadata: { pilot: DISTAL_FEMUR_PILOT_KEY },
  },
  {
    slug: "distal-femur-malunion",
    entityType: "complication",
    preferredLabel: "Distal Femur Malunion",
    description: "Angular or rotational malalignment after distal femur fracture healing.",
    metadata: { pilot: DISTAL_FEMUR_PILOT_KEY },
  },
];

export const DISTAL_FEMUR_ENTITIES: PilotEntitySpec[] = [
  ...sharedLeAnatomyEntitiesForSibling(DISTAL_FEMUR_PILOT_KEY),
  ...DISTAL_FEMUR_SPECIFIC,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const DISTAL_FEMUR_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...LE_SHARED_ANATOMY_RELATIONSHIPS,
  rel("lower-extremity-trauma-anatomy-hub", "prerequisite_for", "distal-femur-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("distal-femur-fracture", "injured_in", "distal-femur", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("distal-femur-fracture", "involves_anatomy", "tibial-plateau", {
    anatomy_role: "essential",
    relevance_reason: "articular_congruity",
    clinical_importance: "high",
  }),
  rel("distal-femur-fracture", "involves_anatomy", "lower-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("distal-femur-fracture", "at_risk_structure", "popliteal-artery", {
    anatomy_role: "essential",
    relevance_reason: "vascular_injury",
    clinical_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("distal-femur-fracture", "has_imaging_finding", "intra-articular-distal-femur-fracture", {
    relevance_reason: "articular_involvement",
    management_importance: "high",
  }),
  rel("intra-articular-distal-femur-fracture", "indicates_treatment", "distal-femur-orif", {
    management_importance: "high",
    confidence: 0.8,
    review_status: "needs_review",
    note: "patient factors and soft-tissue status dependent",
  }),
  rel("distal-femur-fracture", "treated_by", "distal-femur-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("distal-femur-orif", "involves_anatomy", "distal-femur", {
    anatomy_role: "essential",
    relevance_reason: "approach",
    context_relevance: ["or"],
  }),
  rel("distal-femur-fracture", "has_complication", "distal-femur-malunion"),
];

export function activeDistalFemurRelationships(): PilotRelationshipSpec[] {
  return DISTAL_FEMUR_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const DISTAL_FEMUR_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-dff-articular-reduction",
    claimType: "fact",
    claimText: "Distal femur fractures require assessment of articular involvement, coronal sagittal alignment, and popliteal artery proximity.",
    primaryEntitySlug: "distal-femur-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "trauma-distal-femur-fractures curriculum",
    contextRelevance: ["call", "or"],
  },
  {
    draftId: "claim-dff-popliteal-trap",
    claimType: "board_trap",
    claimText: "High-energy distal femur fractures can injure the popliteal artery despite a warm foot and palpable dorsalis pedis pulse.",
    primaryEntitySlug: "popliteal-artery",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "distal femur vascular board pearls",
    contextRelevance: ["call", "oite"],
  },
  {
    draftId: "claim-dff-nonoperative-displaced",
    claimType: "cognitive_trap",
    claimText: "Managing displaced intra-articular distal femur fractures nonoperatively without articular reduction discussion.",
    primaryEntitySlug: "intra-articular-distal-femur-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "distal femur treatment pitfalls",
    contextRelevance: ["or"],
  },
  {
    draftId: "claim-dff-case-script",
    claimType: "clinical_script",
    claimText: "Describe condylar involvement, vascular exam, soft-tissue condition, fixation construct plan, and malunion prevention goals.",
    primaryEntitySlug: "distal-femur-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "distal femur case presentation pattern",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-dff-tibiofemoral-congruity",
    claimType: "anatomy_pearl",
    claimText: "Distal femur articular surface congruity with the tibial plateau determines knee joint loading after fracture healing.",
    primaryEntitySlug: "distal-femur",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "distal femur knee anatomy",
    contextRelevance: ["or"],
  },
];

export const DISTAL_FEMUR_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-dff-intra-articular-orif",
    subjectEntitySlug: "distal-femur-fracture",
    patternType: "operative_indication",
    trigger: "Intra-articular distal femur fracture with articular step-off or instability",
    action: "Discuss distal femur ORIF with attending; document vascular exam and articular reduction goals",
    urgency: "urgent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "distal femur operative indications",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-dff-vascular-workup",
    subjectEntitySlug: "distal-femur-fracture",
    patternType: "operative_indication",
    trigger: "Distal femur fracture with abnormal ankle-brachial index, expanding hematoma, or ischemic signs",
    action: "Activate vascular surgery consultation and expedite imaging before definitive fixation per attending",
    urgency: "emergent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "popliteal artery injury pathway",
    requiresAttendingReview: true,
  },
];

export function distalFemurSlugToEntityMap(): Map<string, PilotEntitySpec> {
  return new Map(DISTAL_FEMUR_ENTITIES.map((e) => [e.slug, e]));
}