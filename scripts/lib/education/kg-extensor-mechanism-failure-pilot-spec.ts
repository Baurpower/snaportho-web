/**
 * Extensor Mechanism Failure knowledge neighborhood — manufacturing seed.
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

export const ExtensorMechanismFailure_PILOT_KEY = "extensor-mechanism-failure-neighborhood" as const;

export const ExtensorMechanismFailure_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-extensor-mechanism-failure",
  prepareTopicId: "revision-arthroplasty",
  legacyRetargetProposalKey: "retarget:adult-recon-extensor-mechanism-failure",
} as const;

export const ExtensorMechanismFailure_ASSET_COUNTS = {
  ankiCardMappings: 4,
  orthobulletsQuestionMappings: 18,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "extensor-mechanism-failure", entityType: "condition", preferredLabel: "Extensor Mechanism Failure", description: "Quadriceps or patellar tendon disruption compromising active extension.", metadata: { pilot: ExtensorMechanismFailure_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "patellar-tendon-rupture-tka", entityType: "imaging_finding", preferredLabel: "Patellar Tendon Rupture After TKA", description: "Discontinuity of patellar tendon with extensor lag.", metadata: { pilot: ExtensorMechanismFailure_PILOT_KEY } },
];

export const ExtensorMechanismFailure_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(ExtensorMechanismFailure_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(ExtensorMechanismFailure_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(ExtensorMechanismFailure_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(ExtensorMechanismFailure_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "extensor-mechanism-failure", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("extensor-mechanism-failure", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "extensor-mechanism-failure", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("extensor-mechanism-failure", "involves_anatomy", "extensor-mechanism", {"cross_cluster":"lower-extremity-trauma-cluster-shared"}),
  rel("extensor-mechanism-failure", "involves_anatomy", "quadriceps-tendon", {}),
  rel("extensor-mechanism-failure", "involves_anatomy", "patellar-tendon", {}),
  rel("extensor-mechanism-failure", "involves_anatomy", "patella", {"cross_cluster":"lower-extremity-trauma-cluster-shared"}),
  rel("extensor-mechanism-failure", "has_imaging_finding", "patellar-tendon-rupture-tka", {}),
];

export const ExtensorMechanismFailure_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeExtensorMechanismFailureRelationships(): PilotRelationshipSpec[] {
  return ExtensorMechanismFailure_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const ExtensorMechanismFailure_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-extensor-mechanism-failure-core",
    claimType: "fact",
    claimText: "Extensor lag after TKA demands extensor mechanism integrity assessment, not passive rehab alone.",
    primaryEntitySlug: "extensor-mechanism-failure",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-extensor-mechanism-failure-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying extensor mechanism failure without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "extensor-mechanism-failure",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-extensor-mechanism-failure-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect extensor mechanism failure anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "extensor-mechanism-failure",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-extensor-mechanism-failure-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for extensor mechanism failure.",
    primaryEntitySlug: "extensor-mechanism-failure",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const ExtensorMechanismFailure_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-extensor-mechanism-failure-operative",
    subjectEntitySlug: "extensor-mechanism-failure",
    patternType: "operative_indication",
    trigger: "Extensor lag after TKA with suspected tendon disruption",
    action: "Urgent surgical consultation for extensor mechanism repair or reconstruction",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
