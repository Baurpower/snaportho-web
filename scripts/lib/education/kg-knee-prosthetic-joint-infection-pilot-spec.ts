/**
 * Knee Prosthetic Joint Infection knowledge neighborhood — manufacturing seed.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  crossRefEntitiesForReconSibling,
  sharedReconAnatomyEntitiesForSibling,
  sharedHipAnatomyForReconSibling,
  sharedLeAnatomyForReconSibling,
} from "./kg-adult-reconstruction-shared-anatomy.ts";

export const KneeProstheticJointInfection_PILOT_KEY = "knee-prosthetic-joint-infection-neighborhood" as const;

export const KneeProstheticJointInfection_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-knee-pji",
  prepareTopicId: "periprosthetic-joint-infection",
  legacyRetargetProposalKey: "retarget:adult-recon-knee-pji",
} as const;

export const KneeProstheticJointInfection_ASSET_COUNTS = {
  ankiCardMappings: 8,
  orthobulletsQuestionMappings: 42,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "knee-prosthetic-joint-infection", entityType: "condition", preferredLabel: "Knee Prosthetic Joint Infection", description: "Infection involving TKA components with biofilm implications.", metadata: { pilot: KneeProstheticJointInfection_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "knee-irrigation-debridement", entityType: "procedure", preferredLabel: "Knee Irrigation and Debridement", description: "Debridement with polyethylene exchange in select acute knee PJI.", metadata: { pilot: KneeProstheticJointInfection_PILOT_KEY } },
];

export const KneeProstheticJointInfection_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(KneeProstheticJointInfection_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(KneeProstheticJointInfection_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(KneeProstheticJointInfection_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(KneeProstheticJointInfection_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "knee-prosthetic-joint-infection", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("knee-prosthetic-joint-infection", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "knee-prosthetic-joint-infection", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("periprosthetic-joint-infection", "prerequisite_for", "knee-prosthetic-joint-infection", {"relationship_strength":"core"}),
  rel("compartment-syndrome", "prerequisite_for", "knee-prosthetic-joint-infection", {"cross_neighborhood":"trauma"}),
  rel("tibial-baseplate", "prerequisite_for", "knee-prosthetic-joint-infection", {}),
  rel("knee-prosthetic-joint-infection", "treated_by", "knee-irrigation-debridement", {"management_importance":"high","review_status":"needs_review"}),
];

export const KneeProstheticJointInfection_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeKneeProstheticJointInfectionRelationships(): PilotRelationshipSpec[] {
  return KneeProstheticJointInfection_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const KneeProstheticJointInfection_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-knee-prosthetic-joint-infection-core",
    claimType: "fact",
    claimText: "Knee PJI workup parallels hip PJI but adds ROM and extensor integrity assessment.",
    primaryEntitySlug: "knee-prosthetic-joint-infection",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-knee-prosthetic-joint-infection-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying knee prosthetic joint infection without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "knee-prosthetic-joint-infection",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-knee-prosthetic-joint-infection-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect knee prosthetic joint infection anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "knee-prosthetic-joint-infection",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-knee-prosthetic-joint-infection-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for knee prosthetic joint infection.",
    primaryEntitySlug: "knee-prosthetic-joint-infection",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const KneeProstheticJointInfection_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-knee-prosthetic-joint-infection-operative",
    subjectEntitySlug: "knee-prosthetic-joint-infection",
    patternType: "operative_indication",
    trigger: "Acute postoperative knee wound drainage with elevated inflammatory markers",
    action: "Coordinate aspiration and discuss I&D with liner exchange versus staged revision",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
