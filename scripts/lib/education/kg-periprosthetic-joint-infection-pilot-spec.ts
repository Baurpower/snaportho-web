/**
 * Periprosthetic Joint Infection knowledge neighborhood — manufacturing seed.
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

export const PeriprostheticJointInfection_PILOT_KEY = "periprosthetic-joint-infection-neighborhood" as const;

export const PeriprostheticJointInfection_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-periprosthetic-joint-infection",
  prepareTopicId: "periprosthetic-joint-infection",
  legacyRetargetProposalKey: "retarget:adult-recon-periprosthetic-joint-infection",
} as const;

export const PeriprostheticJointInfection_ASSET_COUNTS = {
  ankiCardMappings: 12,
  orthobulletsQuestionMappings: 56,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "periprosthetic-joint-infection", entityType: "condition", preferredLabel: "Periprosthetic Joint Infection", description: "Prosthetic joint infection requiring structured workup and staged treatment.", metadata: { pilot: PeriprostheticJointInfection_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "pji-timeline-classification", entityType: "classification_system", preferredLabel: "PJI Timeline Classification", description: "Acute postoperative, acute hematogenous, and chronic infection categories.", metadata: { pilot: PeriprostheticJointInfection_PILOT_KEY } },
  { slug: "two-stage-revision-arthroplasty", entityType: "procedure", preferredLabel: "Two-Stage Revision Arthroplasty", description: "Spacer placement followed by reimplantation after infection control.", metadata: { pilot: PeriprostheticJointInfection_PILOT_KEY } },
  { slug: "biofilm-concept", entityType: "biomechanics_concept", preferredLabel: "Biofilm Concept", description: "Bacterial biofilm limiting antibiotic penetration on implant surfaces.", metadata: { pilot: PeriprostheticJointInfection_PILOT_KEY } },
];

export const PeriprostheticJointInfection_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(PeriprostheticJointInfection_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(PeriprostheticJointInfection_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(PeriprostheticJointInfection_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(PeriprostheticJointInfection_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "periprosthetic-joint-infection", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("periprosthetic-joint-infection", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "periprosthetic-joint-infection", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("hip-prosthetic-joint-infection", "prerequisite_for", "periprosthetic-joint-infection", {}),
  rel("knee-prosthetic-joint-infection", "prerequisite_for", "periprosthetic-joint-infection", {}),
  rel("compartment-syndrome", "prerequisite_for", "periprosthetic-joint-infection", {"cross_neighborhood":"trauma"}),
  rel("periprosthetic-joint-infection", "has_classification", "pji-timeline-classification", {}),
  rel("periprosthetic-joint-infection", "treated_by", "two-stage-revision-arthroplasty", {"management_importance":"high","review_status":"needs_review"}),
];

export const PeriprostheticJointInfection_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activePeriprostheticJointInfectionRelationships(): PilotRelationshipSpec[] {
  return PeriprostheticJointInfection_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const PeriprostheticJointInfection_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-periprosthetic-joint-infection-core",
    claimType: "fact",
    claimText: "PJI workup is a structured infection pathway where timing and aspiration data shape whether implants can be retained.",
    primaryEntitySlug: "periprosthetic-joint-infection",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-periprosthetic-joint-infection-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying periprosthetic joint infection without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "periprosthetic-joint-infection",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-periprosthetic-joint-infection-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect periprosthetic joint infection anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "periprosthetic-joint-infection",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-periprosthetic-joint-infection-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for periprosthetic joint infection.",
    primaryEntitySlug: "periprosthetic-joint-infection",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const PeriprostheticJointInfection_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-periprosthetic-joint-infection-operative",
    subjectEntitySlug: "periprosthetic-joint-infection",
    patternType: "operative_indication",
    trigger: "Suspected PJI with elevated inflammatory markers and positive aspiration",
    action: "Discuss implant retention versus staged revision with attending using timeline classification",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
