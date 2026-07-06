/**
 * Hip Prosthetic Joint Infection knowledge neighborhood — manufacturing seed.
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

export const HipProstheticJointInfection_PILOT_KEY = "hip-prosthetic-joint-infection-neighborhood" as const;

export const HipProstheticJointInfection_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-hip-pji",
  prepareTopicId: "periprosthetic-joint-infection",
  legacyRetargetProposalKey: "retarget:adult-recon-hip-pji",
} as const;

export const HipProstheticJointInfection_ASSET_COUNTS = {
  ankiCardMappings: 8,
  orthobulletsQuestionMappings: 42,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "hip-prosthetic-joint-infection", entityType: "condition", preferredLabel: "Hip Prosthetic Joint Infection", description: "Infection involving THA components with biofilm and implant retention implications.", metadata: { pilot: HipProstheticJointInfection_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "biofilm-concept", entityType: "biomechanics_concept", preferredLabel: "Biofilm Concept", description: "Bacterial biofilm limiting antibiotic penetration on implant surfaces.", metadata: { pilot: HipProstheticJointInfection_PILOT_KEY } },
  { slug: "hip-irrigation-debridement", entityType: "procedure", preferredLabel: "Hip Irrigation and Debridement", description: "Debridement with implant retention in select acute hip PJI.", metadata: { pilot: HipProstheticJointInfection_PILOT_KEY } },
];

export const HipProstheticJointInfection_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(HipProstheticJointInfection_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(HipProstheticJointInfection_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(HipProstheticJointInfection_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(HipProstheticJointInfection_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "hip-prosthetic-joint-infection", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("hip-prosthetic-joint-infection", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "hip-prosthetic-joint-infection", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("periprosthetic-joint-infection", "prerequisite_for", "hip-prosthetic-joint-infection", {"relationship_strength":"core"}),
  rel("compartment-syndrome", "prerequisite_for", "hip-prosthetic-joint-infection", {"cross_neighborhood":"trauma","relevance_reason":"limb_threat_differential"}),
  rel("acetabular-component", "prerequisite_for", "hip-prosthetic-joint-infection", {}),
  rel("femoral-stem", "prerequisite_for", "hip-prosthetic-joint-infection", {}),
  rel("hip-prosthetic-joint-infection", "treated_by", "hip-irrigation-debridement", {"management_importance":"high","review_status":"needs_review"}),
];

export const HipProstheticJointInfection_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeHipProstheticJointInfectionRelationships(): PilotRelationshipSpec[] {
  return HipProstheticJointInfection_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const HipProstheticJointInfection_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-hip-prosthetic-joint-infection-core",
    claimType: "fact",
    claimText: "Hip PJI is not cellulitis — aspiration and timeline drive implant retention versus revision.",
    primaryEntitySlug: "hip-prosthetic-joint-infection",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-hip-prosthetic-joint-infection-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying hip prosthetic joint infection without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "hip-prosthetic-joint-infection",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-hip-prosthetic-joint-infection-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect hip prosthetic joint infection anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "hip-prosthetic-joint-infection",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-hip-prosthetic-joint-infection-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for hip prosthetic joint infection.",
    primaryEntitySlug: "hip-prosthetic-joint-infection",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const HipProstheticJointInfection_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-hip-prosthetic-joint-infection-operative",
    subjectEntitySlug: "hip-prosthetic-joint-infection",
    patternType: "operative_indication",
    trigger: "Acute postoperative hip drainage with elevated inflammatory markers",
    action: "Coordinate aspiration, cultures, and discuss I&D versus staged revision with attending",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
