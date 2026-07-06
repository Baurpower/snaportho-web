/**
 * Hip Osteoarthritis knowledge neighborhood — manufacturing seed.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  RECON_SHARED_ANATOMY_ENTITIES,
  RECON_SHARED_ANATOMY_RELATIONSHIPS,
  crossRefEntitiesForReconSibling,
  sharedHipAnatomyForReconSibling,
  sharedLeAnatomyForReconSibling,
} from "./kg-adult-reconstruction-shared-anatomy.ts";

export const HipOsteoarthritis_PILOT_KEY = "hip-osteoarthritis-neighborhood" as const;

export const HipOsteoarthritis_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-hip-osteoarthritis",
  prepareTopicId: "hip-osteoarthritis",
  legacyRetargetProposalKey: "retarget:adult-recon-hip-osteoarthritis",
} as const;

export const HipOsteoarthritis_ASSET_COUNTS = {
  ankiCardMappings: 18,
  orthobulletsQuestionMappings: 72,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "hip-osteoarthritis", entityType: "condition", preferredLabel: "Hip Osteoarthritis", description: "Degenerative hip disease with groin pain and limited internal rotation.", metadata: { pilot: HipOsteoarthritis_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "joint-space-narrowing-hip", entityType: "imaging_finding", preferredLabel: "Hip Joint Space Narrowing", description: "Radiographic osteoarthritic change with superior joint space loss.", metadata: { pilot: HipOsteoarthritis_PILOT_KEY } },
  { slug: "kellgren-lawrence-hip", entityType: "classification_system", preferredLabel: "Kellgren-Lawrence Hip OA", description: "Descriptive radiographic osteoarthritis severity framework.", metadata: { pilot: HipOsteoarthritis_PILOT_KEY } },
  { slug: "hip-abductor-mechanics", entityType: "biomechanics_concept", preferredLabel: "Hip Abductor Mechanics", description: "Gluteus-mediated pelvic control relevant to THA candidacy and gait.", metadata: { pilot: HipOsteoarthritis_PILOT_KEY } },
  { slug: "total-hip-arthroplasty", entityType: "procedure", preferredLabel: "Total Hip Arthroplasty", description: "Primary hip replacement restoring acetabular and femoral surfaces.", metadata: { pilot: HipOsteoarthritis_PILOT_KEY } },
  { slug: "total-knee-arthroplasty", entityType: "procedure", preferredLabel: "Total Knee Arthroplasty", description: "Primary knee replacement restoring alignment and joint surfaces.", metadata: { pilot: HipOsteoarthritis_PILOT_KEY } },
  { slug: "revision-arthroplasty", entityType: "procedure", preferredLabel: "Revision Arthroplasty", description: "Reoperation for failed or infected arthroplasty with component exchange.", metadata: { pilot: HipOsteoarthritis_PILOT_KEY } },
];

export const HipOsteoarthritis_ENTITIES: PilotEntitySpec[] = [
  ...RECON_SHARED_ANATOMY_ENTITIES.map((e) => ({
    ...e,
    metadata: { ...e.metadata, cluster_owner: HipOsteoarthritis_PILOT_KEY },
  })),
  ...sharedHipAnatomyForReconSibling(HipOsteoarthritis_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(HipOsteoarthritis_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(HipOsteoarthritis_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "hip-osteoarthritis", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("hip-osteoarthritis", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "hip-osteoarthritis", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("hip-osteoarthritis", "involves_anatomy", "acetabulum", {"anatomy_role":"essential"}),
  rel("hip-osteoarthritis", "involves_anatomy", "femoral-head", {"anatomy_role":"essential","cross_cluster":"hip-fracture-cluster-shared"}),
  rel("hip-osteoarthritis", "has_imaging_finding", "joint-space-narrowing-hip", {}),
  rel("femoral-neck-fracture", "prerequisite_for", "hip-osteoarthritis", {"cross_neighborhood":"trauma","relevance_reason":"arthroplasty_pathway"}),
  rel("intertrochanteric-fracture", "prerequisite_for", "hip-osteoarthritis", {"cross_neighborhood":"trauma"}),
  rel("subtrochanteric-fracture", "prerequisite_for", "hip-osteoarthritis", {"cross_neighborhood":"trauma"}),
  rel("hip-osteoarthritis", "indicates_treatment", "total-hip-arthroplasty", {"management_importance":"high","review_status":"needs_review"}),
];

export const HipOsteoarthritis_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...RECON_SHARED_ANATOMY_RELATIONSHIPS,
  ...TOPIC_RELATIONSHIPS,
];

export function activeHipOsteoarthritisRelationships(): PilotRelationshipSpec[] {
  return HipOsteoarthritis_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const HipOsteoarthritis_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-hip-osteoarthritis-core",
    claimType: "fact",
    claimText: "Hip OA is a clinical-plus-radiographic diagnosis where loss of function matters as much as imaging.",
    primaryEntitySlug: "hip-osteoarthritis",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-hip-osteoarthritis-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying hip osteoarthritis without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "hip-osteoarthritis",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-hip-osteoarthritis-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect hip osteoarthritis anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "hip-osteoarthritis",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-hip-osteoarthritis-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for hip osteoarthritis.",
    primaryEntitySlug: "hip-osteoarthritis",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const HipOsteoarthritis_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-hip-osteoarthritis-operative",
    subjectEntitySlug: "hip-osteoarthritis",
    patternType: "operative_indication",
    trigger: "End-stage hip OA with failed conservative care and acceptable surgical risk",
    action: "Discuss primary THA candidacy with attending; review acetabular bone and abductor status",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
