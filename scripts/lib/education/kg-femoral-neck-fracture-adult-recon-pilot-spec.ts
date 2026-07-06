/**
 * Femoral Neck Fracture (Adult Recon Perspective) knowledge neighborhood — manufacturing seed.
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

export const FemoralNeckFractureAdultRecon_PILOT_KEY = "femoral-neck-fracture-adult-recon-neighborhood" as const;

export const FemoralNeckFractureAdultRecon_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-femoral-neck-fracture",
  prepareTopicId: "femoral-neck-fracture",
  legacyRetargetProposalKey: "retarget:adult-recon-femoral-neck-fracture",
} as const;

export const FemoralNeckFractureAdultRecon_ASSET_COUNTS = {
  ankiCardMappings: 9,
  orthobulletsQuestionMappings: 64,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "femoral-neck-fracture-adult-recon", entityType: "condition", preferredLabel: "Femoral Neck Fracture (Adult Recon)", description: "Intracapsular neck fracture evaluated for fixation versus hemi/THA from reconstruction perspective.", metadata: { pilot: FemoralNeckFractureAdultRecon_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "total-hip-arthroplasty", entityType: "procedure", preferredLabel: "Total Hip Arthroplasty", description: "Full hip replacement option for displaced neck fractures in select patients.", metadata: { pilot: FemoralNeckFractureAdultRecon_PILOT_KEY } },
  { slug: "hip-hemiarthroplasty", entityType: "procedure", preferredLabel: "Hip Hemiarthroplasty", description: "Partial hip replacement for displaced femoral neck fractures in older adults.", metadata: { pilot: FemoralNeckFractureAdultRecon_PILOT_KEY } },
  { slug: "displaced-femoral-neck-fracture", entityType: "imaging_finding", preferredLabel: "Displaced Femoral Neck Fracture", description: "Displacement pattern shifting management toward arthroplasty.", metadata: { pilot: FemoralNeckFractureAdultRecon_PILOT_KEY } },
];

export const FemoralNeckFractureAdultRecon_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(FemoralNeckFractureAdultRecon_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(FemoralNeckFractureAdultRecon_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(FemoralNeckFractureAdultRecon_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(FemoralNeckFractureAdultRecon_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "femoral-neck-fracture-adult-recon", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("femoral-neck-fracture-adult-recon", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "femoral-neck-fracture-adult-recon", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("femoral-neck-fracture", "prerequisite_for", "femoral-neck-fracture-adult-recon", {"cross_neighborhood":"trauma","relationship_strength":"core"}),
  rel("femoral-neck-fracture-adult-recon", "involves_anatomy", "femoral-neck", {"cross_cluster":"hip-fracture-cluster-shared"}),
  rel("femoral-neck-fracture-adult-recon", "indicates_treatment", "hip-hemiarthroplasty", {"management_importance":"high","review_status":"needs_review"}),
  rel("femoral-neck-fracture-adult-recon", "indicates_treatment", "total-hip-arthroplasty", {"management_importance":"high","review_status":"needs_review"}),
  rel("displaced-femoral-neck-fracture", "indicates_treatment", "hip-hemiarthroplasty", {"management_importance":"high"}),
];

export const FemoralNeckFractureAdultRecon_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeFemoralNeckFractureAdultReconRelationships(): PilotRelationshipSpec[] {
  return FemoralNeckFractureAdultRecon_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const FemoralNeckFractureAdultRecon_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-femoral-neck-fracture-adult-recon-core",
    claimType: "fact",
    claimText: "Displaced femoral neck fractures in older adults are often arthroplasty problems rather than screw fixation problems.",
    primaryEntitySlug: "femoral-neck-fracture-adult-recon",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-femoral-neck-fracture-adult-recon-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying femoral neck fracture adult recon without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "femoral-neck-fracture-adult-recon",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-femoral-neck-fracture-adult-recon-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect femoral neck fracture adult recon anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "femoral-neck-fracture-adult-recon",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-femoral-neck-fracture-adult-recon-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for femoral neck fracture adult recon.",
    primaryEntitySlug: "femoral-neck-fracture-adult-recon",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const FemoralNeckFractureAdultRecon_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-femoral-neck-fracture-adult-recon-operative",
    subjectEntitySlug: "femoral-neck-fracture-adult-recon",
    patternType: "operative_indication",
    trigger: "Displaced femoral neck fracture in older adult with low healing potential",
    action: "Discuss hemiarthroplasty versus THA with attending; document optimization and DVT prophylaxis",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
