/**
 * Pilon fracture knowledge neighborhood — manufacturing seed.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  LE_SHARED_ANATOMY_RELATIONSHIPS,
  LEG_REFERENCE_RELATIONSHIPS,
  sharedLeAnatomyEntitiesForSibling,
  sharedLegAnatomyEntitiesForSibling,
} from "./kg-lower-extremity-shared-anatomy.ts";

export const PILON_PILOT_KEY = "pilon-fracture-neighborhood" as const;

export const PILON_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-tibial-plafond-fractures",
  prepareTopicId: "pilon-fracture",
  legacyRetargetProposalKey: "retarget:trauma-tibial-plafond-fractures",
} as const;

export const PILON_ASSET_COUNTS = {
  ankiCardMappings: 5,
  orthobulletsQuestionMappings: 27,
} as const;

const PILON_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "pilon-fracture",
    entityType: "condition",
    preferredLabel: "Pilon Fracture",
    description: "High-energy intra-articular distal tibial plafond fracture with soft-tissue compromise risk.",
    metadata: { clinical_kind: "fracture", pilot: PILON_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "pilon-orif",
    entityType: "procedure",
    preferredLabel: "Pilon ORIF",
    description: "Definitive open reduction internal fixation of tibial plafond articular injury.",
    metadata: { pilot: PILON_PILOT_KEY },
  },
  {
    slug: "soft-tissue-compromise-pilon",
    entityType: "imaging_finding",
    preferredLabel: "Soft Tissue Compromise in Pilon Fracture",
    description: "Severe swelling, fracture blisters, or skin compromise delaying definitive fixation.",
    metadata: { pilot: PILON_PILOT_KEY },
  },
  {
    slug: "pilon-wound-complication",
    entityType: "complication",
    preferredLabel: "Pilon Wound Complication",
    description: "Wound breakdown or infection after pilon fracture operative management.",
    metadata: { pilot: PILON_PILOT_KEY },
  },
  {
    slug: "staged-pilon-protocol",
    entityType: "treatment_principle",
    preferredLabel: "Staged Pilon Protocol",
    description: "Spanning external fixation and soft-tissue recovery before definitive plafond reconstruction.",
    metadata: { pilot: PILON_PILOT_KEY },
  },
];

export const PILON_ENTITIES: PilotEntitySpec[] = [
  ...sharedLeAnatomyEntitiesForSibling(PILON_PILOT_KEY),
  ...sharedLegAnatomyEntitiesForSibling(PILON_PILOT_KEY),
  ...PILON_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const PILON_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...LE_SHARED_ANATOMY_RELATIONSHIPS,
  ...LEG_REFERENCE_RELATIONSHIPS,
  rel("lower-extremity-trauma-anatomy-hub", "prerequisite_for", "pilon-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("pilon-fracture", "injured_in", "tibial-shaft", {
    anatomy_role: "essential",
    relevance_reason: "distal_plafond",
    relationship_strength: "core",
    clinical_importance: "high",
    note: "distal tibial plafond localized via tibial-shaft shared slug",
  }),
  rel("pilon-fracture", "involves_anatomy", "talus", {
    anatomy_role: "essential",
    relevance_reason: "ankle_mortise",
    clinical_importance: "high",
  }),
  rel("pilon-fracture", "involves_anatomy", "fibula", {
    anatomy_role: "essential",
    relevance_reason: "lateral_column_length",
    clinical_importance: "high",
  }),
  rel("pilon-fracture", "involves_anatomy", "anterior-compartment", {
    anatomy_role: "supporting",
    relevance_reason: "compartment_risk",
  }),
  rel("pilon-fracture", "involves_anatomy", "lower-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("pilon-fracture", "has_imaging_finding", "soft-tissue-compromise-pilon", {
    relevance_reason: "staging",
    management_importance: "high",
  }),
  rel("soft-tissue-compromise-pilon", "indicates_treatment", "staged-pilon-protocol", {
    management_importance: "high",
    confidence: 0.85,
    review_status: "needs_review",
    note: "do not rush definitive fixation through compromised skin",
  }),
  rel("pilon-fracture", "treated_by", "staged-pilon-protocol", {
    management_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("pilon-fracture", "treated_by", "pilon-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("pilon-orif", "involves_anatomy", "tibial-shaft", {
    anatomy_role: "essential",
    relevance_reason: "plafond_reduction",
    context_relevance: ["or"],
  }),
  rel("pilon-fracture", "has_complication", "pilon-wound-complication"),
];

export function activePilonRelationships(): PilotRelationshipSpec[] {
  return PILON_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const PILON_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-pilon-staged-soft-tissue",
    claimType: "fact",
    claimText: "Pilon fractures are intra-articular distal tibial injuries where soft tissues often dictate staged reconstruction.",
    primaryEntitySlug: "pilon-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts pilon-fracture oneLiner",
    contextRelevance: ["call", "or"],
  },
  {
    draftId: "claim-pilon-fibula-length",
    claimType: "anatomy_pearl",
    claimText: "Fibular length and lateral column restoration support ankle alignment during pilon reconstruction.",
    primaryEntitySlug: "fibula",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts anatomy + orSurvivalTips",
    contextRelevance: ["or", "oite"],
  },
  {
    draftId: "claim-pilon-rush-fixation-trap",
    claimType: "board_trap",
    claimText: "Do not rush definitive pilon fixation through compromised skin — staging protects against wound catastrophe.",
    primaryEntitySlug: "soft-tissue-compromise-pilon",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts boardPearls",
    contextRelevance: ["oite", "or"],
  },
  {
    draftId: "claim-pilon-ct-articular-trap",
    claimType: "cognitive_trap",
    claimText: "Planning pilon ORIF from radiographs alone without CT articular mapping of comminution and step-off.",
    primaryEntitySlug: "pilon-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts imaging + selfCheckQuestions",
    contextRelevance: ["call"],
  },
  {
    draftId: "claim-pilon-case-script",
    claimType: "clinical_script",
    claimText: "Document soft-tissue status, articular injury pattern, fibula role, staging plan, and definitive fixation timing.",
    primaryEntitySlug: "pilon-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts caseSteps",
    contextRelevance: ["call", "clinic"],
  },
];

export const PILON_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-pilon-staged-spanning",
    subjectEntitySlug: "pilon-fracture",
    patternType: "operative_indication",
    trigger: "Pilon fracture with severe swelling, fracture blisters, or soft-tissue compromise",
    action: "Apply staged pilon protocol with spanning external fixation and delayed definitive ORIF when skin allows",
    urgency: "urgent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts decisionMaking + treatmentOptions",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-pilon-definitive-orif",
    subjectEntitySlug: "pilon-fracture",
    patternType: "operative_indication",
    trigger: "Soft tissues recovered with unacceptable articular step-off or instability on CT",
    action: "Proceed with definitive pilon ORIF including fibular length restoration and articular reduction",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts treatmentOptions + surgicalApproach",
    requiresAttendingReview: true,
  },
];