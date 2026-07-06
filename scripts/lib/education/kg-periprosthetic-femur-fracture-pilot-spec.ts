/**
 * Periprosthetic Femur Fracture knowledge neighborhood — manufacturing seed.
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

export const PeriprostheticFemurFracture_PILOT_KEY = "periprosthetic-femur-fracture-neighborhood" as const;

export const PeriprostheticFemurFracture_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-periprosthetic-femur-fracture",
  prepareTopicId: "periprosthetic-fracture",
  legacyRetargetProposalKey: "retarget:adult-recon-periprosthetic-femur-fracture",
} as const;

export const PeriprostheticFemurFracture_ASSET_COUNTS = {
  ankiCardMappings: 6,
  orthobulletsQuestionMappings: 28,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "periprosthetic-femur-fracture", entityType: "condition", preferredLabel: "Periprosthetic Femur Fracture", description: "Femur fracture adjacent to THA stem with implant stability implications.", metadata: { pilot: PeriprostheticFemurFracture_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "vancouver-classification", entityType: "classification_system", preferredLabel: "Vancouver Classification", description: "Periprosthetic femur fracture classification by location and stem stability.", metadata: { pilot: PeriprostheticFemurFracture_PILOT_KEY } },
  { slug: "stem-loosening", entityType: "complication", preferredLabel: "Femoral Stem Loosening", description: "Unstable stem requiring revision in select Vancouver patterns.", metadata: { pilot: PeriprostheticFemurFracture_PILOT_KEY } },
];

export const PeriprostheticFemurFracture_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(PeriprostheticFemurFracture_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(PeriprostheticFemurFracture_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(PeriprostheticFemurFracture_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(PeriprostheticFemurFracture_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "periprosthetic-femur-fracture", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("periprosthetic-femur-fracture", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "periprosthetic-femur-fracture", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("femoral-shaft-fracture", "prerequisite_for", "periprosthetic-femur-fracture", {"cross_neighborhood":"trauma"}),
  rel("femoral-stem", "prerequisite_for", "periprosthetic-femur-fracture", {}),
  rel("periprosthetic-femur-fracture", "involves_anatomy", "femoral-diaphysis", {"cross_cluster":"lower-extremity-trauma-cluster-shared"}),
  rel("periprosthetic-femur-fracture", "has_classification", "vancouver-classification", {}),
  rel("total-hip-arthroplasty", "prerequisite_for", "periprosthetic-femur-fracture", {}),
];

export const PeriprostheticFemurFracture_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activePeriprostheticFemurFractureRelationships(): PilotRelationshipSpec[] {
  return PeriprostheticFemurFracture_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const PeriprostheticFemurFracture_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-periprosthetic-femur-fracture-core",
    claimType: "fact",
    claimText: "Periprosthetic femur fracture management hinges on Vancouver pattern and stem stability.",
    primaryEntitySlug: "periprosthetic-femur-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-periprosthetic-femur-fracture-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying periprosthetic femur fracture without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "periprosthetic-femur-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-periprosthetic-femur-fracture-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect periprosthetic femur fracture anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "periprosthetic-femur-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-periprosthetic-femur-fracture-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for periprosthetic femur fracture.",
    primaryEntitySlug: "periprosthetic-femur-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const PeriprostheticFemurFracture_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-periprosthetic-femur-fracture-operative",
    subjectEntitySlug: "periprosthetic-femur-fracture",
    patternType: "operative_indication",
    trigger: "Periprosthetic femur fracture with unstable THA stem",
    action: "Discuss stem revision versus ORIF with attending using Vancouver framework",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
