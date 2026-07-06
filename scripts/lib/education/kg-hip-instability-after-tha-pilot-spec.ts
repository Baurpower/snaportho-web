/**
 * Hip Instability After THA knowledge neighborhood — manufacturing seed.
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

export const HipInstabilityAfterTha_PILOT_KEY = "hip-instability-after-tha-neighborhood" as const;

export const HipInstabilityAfterTha_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-hip-instability",
  prepareTopicId: "revision-arthroplasty",
  legacyRetargetProposalKey: "retarget:adult-recon-hip-instability",
} as const;

export const HipInstabilityAfterTha_ASSET_COUNTS = {
  ankiCardMappings: 7,
  orthobulletsQuestionMappings: 36,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "hip-instability-after-tha", entityType: "condition", preferredLabel: "Hip Instability After THA", description: "Recurrent THA dislocation from malposition, soft tissue, or bearing issues.", metadata: { pilot: HipInstabilityAfterTha_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "hip-center-of-rotation", entityType: "biomechanics_concept", preferredLabel: "Hip Center of Rotation", description: "Acetabular positioning determinant of THA stability and leg length.", metadata: { pilot: HipInstabilityAfterTha_PILOT_KEY } },
  { slug: "malpositioned-acetabular-component", entityType: "imaging_finding", preferredLabel: "Malpositioned Acetabular Component", description: "Cup position outside safe zone contributing to dislocation.", metadata: { pilot: HipInstabilityAfterTha_PILOT_KEY } },
];

export const HipInstabilityAfterTha_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(HipInstabilityAfterTha_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(HipInstabilityAfterTha_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(HipInstabilityAfterTha_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(HipInstabilityAfterTha_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "hip-instability-after-tha", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("hip-instability-after-tha", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "hip-instability-after-tha", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("hip-instability-after-tha", "involves_anatomy", "hip-capsule", {}),
  rel("hip-instability-after-tha", "involves_anatomy", "short-external-rotators", {}),
  rel("hip-instability-after-tha", "has_imaging_finding", "malpositioned-acetabular-component", {}),
  rel("total-hip-arthroplasty", "prerequisite_for", "hip-instability-after-tha", {}),
];

export const HipInstabilityAfterTha_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeHipInstabilityAfterThaRelationships(): PilotRelationshipSpec[] {
  return HipInstabilityAfterTha_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const HipInstabilityAfterTha_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-hip-instability-after-tha-core",
    claimType: "fact",
    claimText: "THA instability workup must assess component position, soft tissues, and infection.",
    primaryEntitySlug: "hip-instability-after-tha",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-hip-instability-after-tha-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying hip instability after tha without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "hip-instability-after-tha",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-hip-instability-after-tha-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect hip instability after tha anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "hip-instability-after-tha",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-hip-instability-after-tha-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for hip instability after tha.",
    primaryEntitySlug: "hip-instability-after-tha",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const HipInstabilityAfterTha_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-hip-instability-after-tha-operative",
    subjectEntitySlug: "hip-instability-after-tha",
    patternType: "operative_indication",
    trigger: "Recurrent THA dislocation after index procedure",
    action: "Review component position and discuss revision options with attending",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
