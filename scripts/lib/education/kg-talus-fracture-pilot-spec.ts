/**
 * Talus fracture knowledge neighborhood — manufacturing seed.
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

export const TALUS_PILOT_KEY = "talus-fracture-neighborhood" as const;

export const TALUS_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-talar-neck-fractures",
  prepareTopicId: "talus-fracture",
  legacyRetargetProposalKey: "retarget:trauma-talar-neck-fractures",
} as const;

export const TALUS_ASSET_COUNTS = {
  ankiCardMappings: 13,
  orthobulletsQuestionMappings: 28,
} as const;

const TALUS_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "talus-fracture",
    entityType: "condition",
    preferredLabel: "Talus Fracture",
    description: "Talar neck or body fracture with limited vascular supply and AVN risk after displacement.",
    metadata: { clinical_kind: "fracture", pilot: TALUS_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "hawkins-classification",
    entityType: "classification_system",
    preferredLabel: "Hawkins Classification",
    description: "Talar neck fracture classification by subtalar and ankle joint subluxation/dislocation.",
    metadata: { pilot: TALUS_PILOT_KEY },
  },
  {
    slug: "talar-neck-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Talar Neck Fracture",
    description: "Radiographic talar neck fracture pattern with Hawkins displacement implications.",
    metadata: { pilot: TALUS_PILOT_KEY },
  },
  {
    slug: "talus-orif",
    entityType: "procedure",
    preferredLabel: "Talus ORIF",
    description: "Open reduction internal fixation of displaced talar neck or body fracture.",
    metadata: { pilot: TALUS_PILOT_KEY },
  },
  {
    slug: "talar-avn",
    entityType: "complication",
    preferredLabel: "Talar Avascular Necrosis",
    description: "Osteonecrosis of the talus after vascular compromise from talar neck fracture.",
    metadata: { pilot: TALUS_PILOT_KEY },
  },
];

export const TALUS_ENTITIES: PilotEntitySpec[] = [
  ...sharedLeAnatomyEntitiesForSibling(TALUS_PILOT_KEY),
  ...TALUS_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const TALUS_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...LE_SHARED_ANATOMY_RELATIONSHIPS,
  rel("lower-extremity-trauma-anatomy-hub", "prerequisite_for", "talus-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("talus-fracture", "injured_in", "talus", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("talus-fracture", "involves_anatomy", "subtalar-joint", {
    anatomy_role: "essential",
    relevance_reason: "hawkins_displacement",
    clinical_importance: "high",
  }),
  rel("talus-fracture", "involves_anatomy", "lower-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("talus-fracture", "has_imaging_finding", "talar-neck-fracture", {
    relevance_reason: "classification",
    management_importance: "high",
  }),
  rel("talar-neck-fracture", "indicates_treatment", "talus-orif", {
    management_importance: "high",
    confidence: 0.8,
    review_status: "needs_review",
    note: "displacement and Hawkins grade drive fixation urgency",
  }),
  rel("talus-fracture", "treated_by", "talus-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("talus-orif", "involves_anatomy", "talus", {
    anatomy_role: "essential",
    relevance_reason: "anatomic_reduction",
    context_relevance: ["or"],
  }),
  rel("talus-fracture", "has_classification", "hawkins-classification", {
    educational_importance: "high",
    context_relevance: ["clinic", "oite"],
  }),
  rel("talus-fracture", "has_complication", "talar-avn"),
];

export function activeTalusRelationships(): PilotRelationshipSpec[] {
  return TALUS_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const TALUS_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-talus-avn-risk",
    claimType: "fact",
    claimText: "Talus fractures carry avascular necrosis risk because talar neck displacement compromises limited retrograde blood supply.",
    primaryEntitySlug: "talus-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets trauma-talar-neck-fractures curriculum node",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-talus-hawkins-language",
    claimType: "fact",
    claimText: "Hawkins classification links talar neck displacement to subtalar and ankle subluxation and rising AVN risk.",
    primaryEntitySlug: "hawkins-classification",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets trauma-talar-neck-fractures classification",
    contextRelevance: ["clinic", "oite"],
  },
  {
    draftId: "claim-talus-urgent-reduction-trap",
    claimType: "board_trap",
    claimText: "Delayed reduction of displaced talar neck fractures increases AVN risk — treat as urgent anatomic restoration problem.",
    primaryEntitySlug: "talar-neck-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets trauma-talar-neck-fractures board pearls",
    contextRelevance: ["oite", "or"],
  },
  {
    draftId: "claim-talus-missed-fracture-trap",
    claimType: "cognitive_trap",
    claimText: "Clearing ankle trauma without scrutinizing talar neck lines on radiographs when mechanism suggests talar injury.",
    primaryEntitySlug: "talar-neck-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets trauma-talar-neck-fractures imaging",
    contextRelevance: ["call"],
  },
  {
    draftId: "claim-talus-case-script",
    claimType: "clinical_script",
    claimText: "Document mechanism, Hawkins grade language, reduction quality, fixation plan, and AVN surveillance strategy.",
    primaryEntitySlug: "talus-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets trauma-talar-neck-fractures case presentation",
    contextRelevance: ["call", "clinic"],
  },
];

export const TALUS_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-talus-urgent-orif",
    subjectEntitySlug: "talus-fracture",
    patternType: "operative_indication",
    trigger: "Displaced talar neck fracture (Hawkins II-IV pattern) with subtalar or ankle subluxation",
    action: "Urgent anatomic reduction and talus ORIF with attending; plan serial imaging for AVN surveillance",
    urgency: "urgent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets trauma-talar-neck-fractures treatment pathways",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-talus-avn-surveillance",
    subjectEntitySlug: "talus-fracture",
    patternType: "operative_indication",
    trigger: "Talar neck fracture treated operatively or nonoperatively with Hawkins displacement history",
    action: "Establish AVN surveillance with serial clinical exam and advanced imaging per attending protocol",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets trauma-talar-neck-fractures complications",
    requiresAttendingReview: true,
  },
];