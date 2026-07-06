/**
 * Patella fracture knowledge neighborhood — manufacturing seed.
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

export const PATELLA_PILOT_KEY = "patella-fracture-neighborhood" as const;

export const PATELLA_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-patella-fracture",
  prepareTopicId: "patella-fracture",
  legacyRetargetProposalKey: "retarget:trauma-patella-fracture",
} as const;

export const PATELLA_ASSET_COUNTS = {
  ankiCardMappings: 5,
  orthobulletsQuestionMappings: 11,
} as const;

const PATELLA_SPECIFIC: PilotEntitySpec[] = [
  {
    slug: "patella-fracture",
    entityType: "condition",
    preferredLabel: "Patella Fracture",
    description: "Fracture of the patella with extensor mechanism continuity concerns.",
    metadata: { clinical_kind: "fracture", pilot: PATELLA_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "patella-orif",
    entityType: "procedure",
    preferredLabel: "Patella ORIF",
    description: "Open reduction internal fixation of displaced patella fracture.",
    metadata: { pilot: PATELLA_PILOT_KEY },
  },
  {
    slug: "extensor-mechanism-disruption",
    entityType: "complication",
    preferredLabel: "Extensor Mechanism Disruption",
    description: "Loss of active knee extension after patella fracture displacement or failed healing.",
    metadata: { pilot: PATELLA_PILOT_KEY },
  },
  {
    slug: "patella-baja",
    entityType: "complication",
    preferredLabel: "Patella Baja",
    description: "Inferior patella malposition reducing extensor mechanism efficiency after injury or surgery.",
    metadata: { pilot: PATELLA_PILOT_KEY },
  },
  {
    slug: "tension-band-fixation",
    entityType: "fixation_method",
    preferredLabel: "Tension Band Fixation",
    description: "Cerclage wire tension band technique for patella fracture fixation.",
    metadata: { pilot: PATELLA_PILOT_KEY },
  },
];

export const PATELLA_ENTITIES: PilotEntitySpec[] = [
  ...sharedLeAnatomyEntitiesForSibling(PATELLA_PILOT_KEY),
  ...PATELLA_SPECIFIC,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const PATELLA_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...LE_SHARED_ANATOMY_RELATIONSHIPS,
  rel("lower-extremity-trauma-anatomy-hub", "prerequisite_for", "patella-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "clinic"],
  }),
  rel("patella-fracture", "injured_in", "patella", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("patella-fracture", "involves_anatomy", "extensor-mechanism", {
    anatomy_role: "essential",
    relevance_reason: "function",
    clinical_importance: "high",
  }),
  rel("patella-fracture", "involves_anatomy", "distal-femur", {
    anatomy_role: "supporting",
    relevance_reason: "patellofemoral",
  }),
  rel("patella-fracture", "involves_anatomy", "lower-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("patella-fracture", "uses_fixation", "tension-band-fixation", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("patella-fracture", "treated_by", "patella-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("patella-orif", "involves_anatomy", "patella", {
    anatomy_role: "essential",
    relevance_reason: "approach",
    context_relevance: ["or"],
  }),
  rel("patella-fracture", "has_complication", "extensor-mechanism-disruption"),
  rel("patella-fracture", "has_complication", "patella-baja"),
];

export function activePatellaRelationships(): PilotRelationshipSpec[] {
  return PATELLA_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const PATELLA_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-pat-extensor-continuity",
    claimType: "fact",
    claimText: "Patella fracture management centers on extensor mechanism continuity and restoration of active knee extension.",
    primaryEntitySlug: "patella-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "trauma-patella-fracture curriculum",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-pat-extensor-lag-trap",
    claimType: "board_trap",
    claimText: "A patient unable to perform straight-leg raise after patella fracture has extensor mechanism disruption until proven otherwise.",
    primaryEntitySlug: "extensor-mechanism-disruption",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "patella board pearls",
    contextRelevance: ["call", "oite"],
  },
  {
    draftId: "claim-pat-nonoperative-displaced",
    claimType: "cognitive_trap",
    claimText: "Treating a displaced patella fracture with extensor lag nonoperatively without operative discussion.",
    primaryEntitySlug: "patella-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "patella treatment pitfalls",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-pat-case-script",
    claimType: "clinical_script",
    claimText: "Describe fracture pattern, extensor exam including straight-leg raise, fixation method, and patella alta-baja awareness.",
    primaryEntitySlug: "patella-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "patella case presentation pattern",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-pat-tension-band",
    claimType: "anatomy_pearl",
    claimText: "Tension band fixation converts anterior patellar tensile forces into compression at the fracture site via the extensor mechanism.",
    primaryEntitySlug: "tension-band-fixation",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "patella fixation biomechanics",
    contextRelevance: ["or"],
  },
];

export const PATELLA_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-pat-extensor-orif",
    subjectEntitySlug: "patella-fracture",
    patternType: "operative_indication",
    trigger: "Displaced patella fracture with extensor mechanism disruption or inability to extend the knee",
    action: "Discuss patella ORIF with tension band fixation per attending; document extensor exam",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "patella operative indications",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-pat-nonoperative-stable",
    subjectEntitySlug: "patella-fracture",
    patternType: "nonoperative_eligible",
    trigger: "Nondisplaced patella fracture with intact extensor mechanism and acceptable alignment",
    action: "Immobilize in extension with progressive range-of-motion protocol when healing permits",
    urgency: "routine",
    safetyCriticality: "none",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "patella nonoperative pathway",
    requiresAttendingReview: true,
  },
];

export function patellaSlugToEntityMap(): Map<string, PilotEntitySpec> {
  return new Map(PATELLA_ENTITIES.map((e) => [e.slug, e]));
}