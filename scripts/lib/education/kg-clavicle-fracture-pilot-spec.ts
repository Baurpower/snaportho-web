/**
 * Clavicle fracture knowledge neighborhood — manufacturing seed (shared anatomy owner).
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  UE_SHARED_ANATOMY_ENTITIES,
  UE_SHARED_ANATOMY_PILOT_KEY,
  UE_SHARED_ANATOMY_RELATIONSHIPS,
} from "./kg-upper-extremity-shared-anatomy.ts";

export const CLAVICLE_PILOT_KEY = "clavicle-fracture-neighborhood" as const;

export const CLAVICLE_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-clavicle-fractures-midshaft",
  prepareTopicId: "clavicle-fracture",
  legacyRetargetProposalKey: "retarget:trauma-clavicle-fractures-midshaft",
} as const;

export const CLAVICLE_ASSET_COUNTS = {
  ankiCardMappings: 0,
  orthobulletsQuestionMappings: 22,
} as const;

const CLAVICLE_SPECIFIC: PilotEntitySpec[] = [
  {
    slug: "clavicle-fracture",
    entityType: "condition",
    preferredLabel: "Clavicle Fracture",
    description: "Fracture of the clavicle, commonly midshaft in traumatic shoulder girdle injuries.",
    metadata: { clinical_kind: "fracture", pilot: CLAVICLE_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "midshaft-clavicle-fracture-pattern",
    entityType: "imaging_finding",
    preferredLabel: "Midshaft Clavicle Fracture Pattern",
    description: "Typical middle-third clavicle fracture displacement pattern.",
    metadata: { pilot: CLAVICLE_PILOT_KEY },
  },
  {
    slug: "clavicle-orif",
    entityType: "procedure",
    preferredLabel: "Clavicle ORIF",
    description: "Operative plate fixation for selected displaced clavicle fractures.",
    metadata: { pilot: CLAVICLE_PILOT_KEY },
  },
  {
    slug: "clavicle-sling-immobilization",
    entityType: "treatment_principle",
    preferredLabel: "Clavicle Sling Immobilization",
    description: "Nonoperative sling support for acceptable clavicle fracture alignment.",
    metadata: { pilot: CLAVICLE_PILOT_KEY },
  },
  {
    slug: "clavicle-malunion",
    entityType: "complication",
    preferredLabel: "Clavicle Malunion",
    description: "Healed clavicle deformity affecting shoulder contour or function.",
    metadata: { pilot: CLAVICLE_PILOT_KEY },
  },
  {
    slug: "clavicle-nonunion",
    entityType: "complication",
    preferredLabel: "Clavicle Nonunion",
    description: "Failure of clavicle fracture healing with persistent pain or instability.",
    metadata: { pilot: CLAVICLE_PILOT_KEY },
  },
];

export const CLAVICLE_ENTITIES: PilotEntitySpec[] = [
  ...UE_SHARED_ANATOMY_ENTITIES.map((e) => ({
    ...e,
    metadata: { ...e.metadata, cluster_owner: CLAVICLE_PILOT_KEY },
  })),
  ...CLAVICLE_SPECIFIC,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const CLAVICLE_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...UE_SHARED_ANATOMY_RELATIONSHIPS,
  rel("upper-extremity-trauma-anatomy-hub", "prerequisite_for", "clavicle-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "clinic"],
  }),
  rel("clavicle-fracture", "injured_in", "clavicle", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("clavicle-fracture", "involves_anatomy", "ac-joint", { anatomy_role: "supporting", relevance_reason: "lateral_clavicle" }),
  rel("clavicle-fracture", "involves_anatomy", "sternoclavicular-joint", {
    anatomy_role: "essential",
    relevance_reason: "medial_clavicle",
    clinical_importance: "high",
  }),
  rel("clavicle-fracture", "involves_anatomy", "upper-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("clavicle-fracture", "has_imaging_finding", "midshaft-clavicle-fracture-pattern", {
    relevance_reason: "pattern",
    management_importance: "high",
  }),
  rel("clavicle-fracture", "treated_by", "clavicle-sling-immobilization", {
    management_importance: "high",
    context_relevance: ["clinic"],
  }),
  rel("clavicle-fracture", "treated_by", "clavicle-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("midshaft-clavicle-fracture-pattern", "indicates_treatment", "clavicle-orif", {
    management_importance: "high",
    confidence: 0.75,
    review_status: "needs_review",
    note: "displacement and patient demand dependent",
  }),
  rel("clavicle-orif", "involves_anatomy", "clavicle", {
    anatomy_role: "essential",
    relevance_reason: "approach",
    context_relevance: ["or"],
  }),
  rel("clavicle-fracture", "has_complication", "clavicle-malunion"),
  rel("clavicle-fracture", "has_complication", "clavicle-nonunion"),
];

export function activeClavicleRelationships(): PilotRelationshipSpec[] {
  return CLAVICLE_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const CLAVICLE_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-clav-midshaft-common",
    claimType: "fact",
    claimText: "Midshaft clavicle fractures are the most common clavicle fracture location after shoulder-directed trauma.",
    primaryEntitySlug: "clavicle-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "trauma-clavicle-fractures-midshaft curriculum",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-clav-sc-joint-trap",
    claimType: "board_trap",
    claimText: "Posterior sternoclavicular displacement can threaten mediastinal structures and is not a benign clavicle injury.",
    primaryEntitySlug: "sternoclavicular-joint",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "shoulder girdle trauma board pearls",
    contextRelevance: ["call", "oite"],
  },
  {
    draftId: "claim-clav-operative-shift",
    claimType: "cognitive_trap",
    claimText: "Treating every displaced midshaft clavicle fracture as mandatory ORIF without discussing nonunion risk and patient goals.",
    primaryEntitySlug: "midshaft-clavicle-fracture-pattern",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "clavicle treatment evolution",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-clav-case-script",
    claimType: "clinical_script",
    claimText: "Describe fracture location, shortening, skin tenting, neurovascular exam, and sling versus operative plan with follow-up.",
    primaryEntitySlug: "clavicle-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "clavicle case presentation pattern",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-clav-nonunion",
    claimType: "fact",
    claimText: "Clavicle nonunion can present with persistent pain, motion limitation, or hardware issues after failed healing.",
    primaryEntitySlug: "clavicle-nonunion",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "clavicle complications",
    contextRelevance: ["clinic"],
  },
];

export const CLAVICLE_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-clav-operative-orif",
    subjectEntitySlug: "clavicle-fracture",
    patternType: "operative_indication",
    trigger: "Displaced midshaft clavicle fracture with shortening, comminution, or high functional demand",
    action: "Discuss clavicle ORIF with attending; document nonoperative risks and patient goals",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "clavicle operative indications",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-clav-nonoperative-sling",
    subjectEntitySlug: "clavicle-fracture",
    patternType: "nonoperative_eligible",
    trigger: "Acceptable alignment in patient suitable for sling immobilization",
    action: "Sling immobilization with pain control and gradual return of motion when healing permits",
    urgency: "routine",
    safetyCriticality: "none",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "clavicle nonoperative pathway",
    requiresAttendingReview: true,
  },
];