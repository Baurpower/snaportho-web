/**
 * Knee Osteoarthritis knowledge neighborhood — manufacturing seed.
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

export const KneeOsteoarthritis_PILOT_KEY = "knee-osteoarthritis-neighborhood" as const;

export const KneeOsteoarthritis_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-knee-osteoarthritis",
  prepareTopicId: "knee-osteoarthritis",
  legacyRetargetProposalKey: "retarget:adult-recon-knee-osteoarthritis",
} as const;

export const KneeOsteoarthritis_ASSET_COUNTS = {
  ankiCardMappings: 16,
  orthobulletsQuestionMappings: 68,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "knee-osteoarthritis", entityType: "condition", preferredLabel: "Knee Osteoarthritis", description: "Degenerative knee disease with compartment-specific wear and alignment deformity.", metadata: { pilot: KneeOsteoarthritis_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "medial-compartment-narrowing", entityType: "imaging_finding", preferredLabel: "Medial Compartment Narrowing", description: "Standing radiograph varus pattern with medial joint space loss.", metadata: { pilot: KneeOsteoarthritis_PILOT_KEY } },
  { slug: "mechanical-axis-knee", entityType: "biomechanics_concept", preferredLabel: "Knee Mechanical Axis", description: "Hip-knee-ankle alignment influencing unicompartmental versus TKA candidacy.", metadata: { pilot: KneeOsteoarthritis_PILOT_KEY } },
];

export const KneeOsteoarthritis_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(KneeOsteoarthritis_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(KneeOsteoarthritis_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(KneeOsteoarthritis_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(KneeOsteoarthritis_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "knee-osteoarthritis", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("knee-osteoarthritis", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "knee-osteoarthritis", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("knee-osteoarthritis", "involves_anatomy", "tibial-plateau", {"cross_cluster":"lower-extremity-trauma-cluster-shared"}),
  rel("knee-osteoarthritis", "involves_anatomy", "femoral-condyles", {}),
  rel("knee-osteoarthritis", "has_imaging_finding", "medial-compartment-narrowing", {}),
  rel("knee-osteoarthritis", "indicates_treatment", "total-knee-arthroplasty", {"management_importance":"high","review_status":"needs_review"}),
  rel("knee-osteoarthritis", "indicates_treatment", "unicompartmental-knee-arthroplasty", {"management_importance":"moderate"}),
];

export const KneeOsteoarthritis_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeKneeOsteoarthritisRelationships(): PilotRelationshipSpec[] {
  return KneeOsteoarthritis_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const KneeOsteoarthritis_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-knee-osteoarthritis-core",
    claimType: "fact",
    claimText: "Standing films reveal knee OA severity that non-weight-bearing views may understate.",
    primaryEntitySlug: "knee-osteoarthritis",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-knee-osteoarthritis-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying knee osteoarthritis without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "knee-osteoarthritis",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-knee-osteoarthritis-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect knee osteoarthritis anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "knee-osteoarthritis",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-knee-osteoarthritis-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for knee osteoarthritis.",
    primaryEntitySlug: "knee-osteoarthritis",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const KneeOsteoarthritis_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-knee-osteoarthritis-operative",
    subjectEntitySlug: "knee-osteoarthritis",
    patternType: "operative_indication",
    trigger: "Tricompartmental knee OA with failed conservative care",
    action: "Discuss primary TKA candidacy with attending including alignment and ROM",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
