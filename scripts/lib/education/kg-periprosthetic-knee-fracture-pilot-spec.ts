/**
 * Periprosthetic Knee Fracture knowledge neighborhood — manufacturing seed.
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

export const PeriprostheticKneeFracture_PILOT_KEY = "periprosthetic-knee-fracture-neighborhood" as const;

export const PeriprostheticKneeFracture_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-periprosthetic-knee-fracture",
  prepareTopicId: "periprosthetic-fracture",
  legacyRetargetProposalKey: "retarget:adult-recon-periprosthetic-knee-fracture",
} as const;

export const PeriprostheticKneeFracture_ASSET_COUNTS = {
  ankiCardMappings: 5,
  orthobulletsQuestionMappings: 16,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "periprosthetic-knee-fracture", entityType: "condition", preferredLabel: "Periprosthetic Knee Fracture", description: "Fracture adjacent to TKA components with extensor and stability concerns.", metadata: { pilot: PeriprostheticKneeFracture_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "rorabeck-classification", entityType: "classification_system", preferredLabel: "Rorabeck Classification", description: "Supracondylar periprosthetic knee fracture classification framework.", metadata: { pilot: PeriprostheticKneeFracture_PILOT_KEY } },
];

export const PeriprostheticKneeFracture_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(PeriprostheticKneeFracture_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(PeriprostheticKneeFracture_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(PeriprostheticKneeFracture_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(PeriprostheticKneeFracture_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "periprosthetic-knee-fracture", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("periprosthetic-knee-fracture", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "periprosthetic-knee-fracture", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("distal-femur-fracture", "prerequisite_for", "periprosthetic-knee-fracture", {"cross_neighborhood":"trauma"}),
  rel("tibial-shaft-fracture", "prerequisite_for", "periprosthetic-knee-fracture", {"cross_neighborhood":"trauma"}),
  rel("femoral-component", "prerequisite_for", "periprosthetic-knee-fracture", {}),
  rel("tibial-baseplate", "prerequisite_for", "periprosthetic-knee-fracture", {}),
  rel("periprosthetic-knee-fracture", "has_classification", "rorabeck-classification", {}),
];

export const PeriprostheticKneeFracture_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activePeriprostheticKneeFractureRelationships(): PilotRelationshipSpec[] {
  return PeriprostheticKneeFracture_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const PeriprostheticKneeFracture_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-periprosthetic-knee-fracture-core",
    claimType: "fact",
    claimText: "Periprosthetic knee fracture management depends on fracture location and implant stability.",
    primaryEntitySlug: "periprosthetic-knee-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-periprosthetic-knee-fracture-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying periprosthetic knee fracture without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "periprosthetic-knee-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-periprosthetic-knee-fracture-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect periprosthetic knee fracture anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "periprosthetic-knee-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-periprosthetic-knee-fracture-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for periprosthetic knee fracture.",
    primaryEntitySlug: "periprosthetic-knee-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const PeriprostheticKneeFracture_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-periprosthetic-knee-fracture-operative",
    subjectEntitySlug: "periprosthetic-knee-fracture",
    patternType: "operative_indication",
    trigger: "Periprosthetic knee fracture with unstable TKA components",
    action: "Discuss component revision versus ORIF with attending",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
