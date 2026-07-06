/**
 * Adverse Local Tissue Reaction (Metal Reaction) knowledge neighborhood — manufacturing seed.
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

export const AdverseLocalTissueReaction_PILOT_KEY = "adverse-local-tissue-reaction-neighborhood" as const;

export const AdverseLocalTissueReaction_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-altr",
  prepareTopicId: "revision-arthroplasty",
  legacyRetargetProposalKey: "retarget:adult-recon-altr",
} as const;

export const AdverseLocalTissueReaction_ASSET_COUNTS = {
  ankiCardMappings: 3,
  orthobulletsQuestionMappings: 14,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "adverse-local-tissue-reaction", entityType: "condition", preferredLabel: "Adverse Local Tissue Reaction", description: "Metal ion-driven local soft tissue destruction around MoM bearings.", metadata: { pilot: AdverseLocalTissueReaction_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "pseudotumor-mom", entityType: "imaging_finding", preferredLabel: "Pseudotumor (MoM)", description: "MRI/MARS finding of periarticular soft tissue mass in metal reaction.", metadata: { pilot: AdverseLocalTissueReaction_PILOT_KEY } },
  { slug: "metal-ion-elevation", entityType: "biomechanics_concept", preferredLabel: "Metal Ion Elevation", description: "Elevated cobalt/chromium suggesting bearing corrosion or trunnionosis.", metadata: { pilot: AdverseLocalTissueReaction_PILOT_KEY } },
];

export const AdverseLocalTissueReaction_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(AdverseLocalTissueReaction_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(AdverseLocalTissueReaction_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(AdverseLocalTissueReaction_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(AdverseLocalTissueReaction_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "adverse-local-tissue-reaction", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("adverse-local-tissue-reaction", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "adverse-local-tissue-reaction", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("polyethylene-liner", "prerequisite_for", "adverse-local-tissue-reaction", {"note":"cross-ref MoM bearing"}),
  rel("adverse-local-tissue-reaction", "has_imaging_finding", "pseudotumor-mom", {}),
  rel("bearing-surface-selection", "prerequisite_for", "adverse-local-tissue-reaction", {}),
  rel("revision-arthroplasty", "prerequisite_for", "adverse-local-tissue-reaction", {}),
];

export const AdverseLocalTissueReaction_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeAdverseLocalTissueReactionRelationships(): PilotRelationshipSpec[] {
  return AdverseLocalTissueReaction_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const AdverseLocalTissueReaction_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-adverse-local-tissue-reaction-core",
    claimType: "fact",
    claimText: "ALTR requires metal ion workup and soft tissue assessment before revision planning.",
    primaryEntitySlug: "adverse-local-tissue-reaction",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-adverse-local-tissue-reaction-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying adverse local tissue reaction without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "adverse-local-tissue-reaction",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-adverse-local-tissue-reaction-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect adverse local tissue reaction anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "adverse-local-tissue-reaction",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-adverse-local-tissue-reaction-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for adverse local tissue reaction.",
    primaryEntitySlug: "adverse-local-tissue-reaction",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const AdverseLocalTissueReaction_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-adverse-local-tissue-reaction-operative",
    subjectEntitySlug: "adverse-local-tissue-reaction",
    patternType: "operative_indication",
    trigger: "Painful MoM THA with elevated metal ions or pseudotumor",
    action: "Discuss revision to alternate bearing with attending and assess soft tissue destruction",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
