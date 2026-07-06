/**
 * Calcaneus fracture knowledge neighborhood — manufacturing seed.
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

export const CALCANEUS_PILOT_KEY = "calcaneus-fracture-neighborhood" as const;

export const CALCANEUS_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-calcaneus-fractures",
  prepareTopicId: "calcaneus-fracture",
  legacyRetargetProposalKey: "retarget:trauma-calcaneus-fractures",
} as const;

export const CALCANEUS_ASSET_COUNTS = {
  ankiCardMappings: 11,
  orthobulletsQuestionMappings: 48,
} as const;

const CALCANEUS_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "calcaneus-fracture",
    entityType: "condition",
    preferredLabel: "Calcaneus Fracture",
    description: "High-energy hindfoot fracture with posterior facet involvement and soft-tissue-sensitive operative timing.",
    metadata: { clinical_kind: "fracture", pilot: CALCANEUS_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "sanders-classification",
    entityType: "classification_system",
    preferredLabel: "Sanders Classification",
    description: "CT-based posterior facet calcaneus fracture classification system.",
    metadata: { pilot: CALCANEUS_PILOT_KEY },
  },
  {
    slug: "intra-articular-calcaneus-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Intra-Articular Calcaneus Fracture",
    description: "Posterior facet articular involvement on CT requiring anatomic reduction consideration.",
    metadata: { pilot: CALCANEUS_PILOT_KEY },
  },
  {
    slug: "calcaneus-orif",
    entityType: "procedure",
    preferredLabel: "Calcaneus ORIF",
    description: "Open reduction internal fixation of displaced intra-articular calcaneus fracture.",
    metadata: { pilot: CALCANEUS_PILOT_KEY },
  },
  {
    slug: "subtalar-arthritis",
    entityType: "complication",
    preferredLabel: "Subtalar Arthritis",
    description: "Post-traumatic subtalar joint degeneration after calcaneus fracture.",
    metadata: { pilot: CALCANEUS_PILOT_KEY },
  },
];

export const CALCANEUS_ENTITIES: PilotEntitySpec[] = [
  ...sharedLeAnatomyEntitiesForSibling(CALCANEUS_PILOT_KEY),
  ...CALCANEUS_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const CALCANEUS_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...LE_SHARED_ANATOMY_RELATIONSHIPS,
  rel("lower-extremity-trauma-anatomy-hub", "prerequisite_for", "calcaneus-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("calcaneus-fracture", "injured_in", "calcaneus", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("calcaneus-fracture", "involves_anatomy", "subtalar-joint", {
    anatomy_role: "essential",
    relevance_reason: "articular_involvement",
    clinical_importance: "high",
  }),
  rel("calcaneus-fracture", "involves_anatomy", "plantar-soft-tissues", {
    anatomy_role: "essential",
    relevance_reason: "soft_tissue_envelope",
    clinical_importance: "high",
  }),
  rel("calcaneus-fracture", "involves_anatomy", "lower-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("calcaneus-fracture", "has_imaging_finding", "intra-articular-calcaneus-fracture", {
    relevance_reason: "articular_planning",
    management_importance: "high",
  }),
  rel("intra-articular-calcaneus-fracture", "indicates_treatment", "calcaneus-orif", {
    management_importance: "high",
    confidence: 0.75,
    review_status: "needs_review",
    note: "operative candidacy and timing attending-dependent",
  }),
  rel("calcaneus-fracture", "treated_by", "calcaneus-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("calcaneus-orif", "involves_anatomy", "calcaneus", {
    anatomy_role: "essential",
    relevance_reason: "posterior_facet_reduction",
    context_relevance: ["or"],
  }),
  rel("calcaneus-fracture", "has_classification", "sanders-classification", {
    educational_importance: "high",
    context_relevance: ["clinic", "oite"],
  }),
  rel("calcaneus-fracture", "has_complication", "subtalar-arthritis"),
];

export function activeCalcaneusRelationships(): PilotRelationshipSpec[] {
  return CALCANEUS_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const CALCANEUS_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-calc-soft-tissue-timing",
    claimType: "fact",
    claimText: "Calcaneus fractures are high-energy hindfoot injuries where soft-tissue swelling often delays operative fixation.",
    primaryEntitySlug: "calcaneus-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts calcaneus-fracture oneLiner",
    contextRelevance: ["call", "or"],
  },
  {
    draftId: "claim-calc-subtalar-facet",
    claimType: "anatomy_pearl",
    claimText: "Posterior facet and subtalar joint involvement drive calcaneus fracture classification and long-term arthritis risk.",
    primaryEntitySlug: "subtalar-joint",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts calcaneus-fracture anatomy + pimpQuestions",
    contextRelevance: ["clinic", "oite"],
  },
  {
    draftId: "claim-calc-skin-timing-trap",
    claimType: "board_trap",
    claimText: "Swollen calcaneus skin can dictate operative timing more than the fracture pattern on initial radiographs.",
    primaryEntitySlug: "calcaneus-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts calcaneus-fracture boardPearls",
    contextRelevance: ["oite", "or"],
  },
  {
    draftId: "claim-calc-spine-screen-trap",
    claimType: "cognitive_trap",
    claimText: "Treating calcaneus fracture as an isolated foot injury without considering associated axial-load spine injuries.",
    primaryEntitySlug: "calcaneus-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts calcaneus-fracture orSurvivalTips + selfCheckQuestions",
    contextRelevance: ["call"],
  },
  {
    draftId: "claim-calc-case-script",
    claimType: "clinical_script",
    claimText: "State axial-load mechanism, skin and blister status, Sanders/CT language, and delayed fixation plan with spine screening.",
    primaryEntitySlug: "calcaneus-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts calcaneus-fracture caseSteps",
    contextRelevance: ["call", "clinic"],
  },
];

export const CALCANEUS_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-calc-delayed-orif",
    subjectEntitySlug: "calcaneus-fracture",
    patternType: "operative_indication",
    trigger: "Displaced intra-articular calcaneus fracture with acceptable soft tissues after swelling interval",
    action: "Proceed with delayed calcaneus ORIF for posterior facet restoration; document non-weight-bearing plan",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts calcaneus-fracture decisionMaking + treatmentOptions",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-calc-soft-tissue-hold",
    subjectEntitySlug: "calcaneus-fracture",
    patternType: "operative_indication",
    trigger: "Calcaneus fracture with severe hindfoot swelling, blisters, or compromised plantar skin",
    action: "Splint and elevate; delay definitive fixation until soft tissues recover; screen for associated spine injury",
    urgency: "urgent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts calcaneus-fracture boardPearls + complications",
    requiresAttendingReview: true,
  },
];