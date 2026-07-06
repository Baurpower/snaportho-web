/**
 * Unicompartmental Knee Arthritis knowledge neighborhood — manufacturing seed.
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

export const UnicompartmentalKneeArthritis_PILOT_KEY = "unicompartmental-knee-arthritis-neighborhood" as const;

export const UnicompartmentalKneeArthritis_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-unicompartmental-knee",
  prepareTopicId: "knee-osteoarthritis",
  legacyRetargetProposalKey: "retarget:adult-recon-unicompartmental-knee",
} as const;

export const UnicompartmentalKneeArthritis_ASSET_COUNTS = {
  ankiCardMappings: 6,
  orthobulletsQuestionMappings: 24,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "unicompartmental-knee-arthritis", entityType: "condition", preferredLabel: "Unicompartmental Knee Arthritis", description: "Single-compartment knee OA potentially amenable to UKA.", metadata: { pilot: UnicompartmentalKneeArthritis_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "unicompartmental-knee-arthroplasty", entityType: "procedure", preferredLabel: "Unicompartmental Knee Arthroplasty", description: "Partial knee replacement preserving cruciates in select patients.", metadata: { pilot: UnicompartmentalKneeArthritis_PILOT_KEY } },
];

export const UnicompartmentalKneeArthritis_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(UnicompartmentalKneeArthritis_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(UnicompartmentalKneeArthritis_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(UnicompartmentalKneeArthritis_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(UnicompartmentalKneeArthritis_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "unicompartmental-knee-arthritis", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("unicompartmental-knee-arthritis", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "unicompartmental-knee-arthritis", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("unicompartmental-knee-arthritis", "involves_anatomy", "tibial-plateau", {"cross_cluster":"lower-extremity-trauma-cluster-shared"}),
  rel("unicompartmental-knee-arthritis", "involves_anatomy", "cruciate-ligaments", {}),
  rel("unicompartmental-knee-arthritis", "indicates_treatment", "unicompartmental-knee-arthroplasty", {"management_importance":"high","review_status":"needs_review"}),
  rel("knee-osteoarthritis", "prerequisite_for", "unicompartmental-knee-arthritis", {}),
];

export const UnicompartmentalKneeArthritis_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeUnicompartmentalKneeArthritisRelationships(): PilotRelationshipSpec[] {
  return UnicompartmentalKneeArthritis_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const UnicompartmentalKneeArthritis_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-unicompartmental-knee-arthritis-core",
    claimType: "fact",
    claimText: "UKA candidacy requires isolated compartment disease, intact ligaments, and correctable deformity.",
    primaryEntitySlug: "unicompartmental-knee-arthritis",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-unicompartmental-knee-arthritis-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying unicompartmental knee arthritis without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "unicompartmental-knee-arthritis",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-unicompartmental-knee-arthritis-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect unicompartmental knee arthritis anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "unicompartmental-knee-arthritis",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-unicompartmental-knee-arthritis-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for unicompartmental knee arthritis.",
    primaryEntitySlug: "unicompartmental-knee-arthritis",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const UnicompartmentalKneeArthritis_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-unicompartmental-knee-arthritis-operative",
    subjectEntitySlug: "unicompartmental-knee-arthritis",
    patternType: "operative_indication",
    trigger: "Medial compartment OA with intact ACL and correctable varus",
    action: "Discuss UKA versus TKA with attending using compartment-specific criteria",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
