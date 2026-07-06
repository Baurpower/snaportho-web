/**
 * Bone Loss in Revision Arthroplasty knowledge neighborhood — manufacturing seed.
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

export const BoneLossRevisionArthroplasty_PILOT_KEY = "bone-loss-revision-arthroplasty-neighborhood" as const;

export const BoneLossRevisionArthroplasty_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-bone-loss-revision",
  prepareTopicId: "revision-arthroplasty",
  legacyRetargetProposalKey: "retarget:adult-recon-bone-loss-revision",
} as const;

export const BoneLossRevisionArthroplasty_ASSET_COUNTS = {
  ankiCardMappings: 7,
  orthobulletsQuestionMappings: 32,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "bone-loss-revision-arthroplasty", entityType: "condition", preferredLabel: "Bone Loss in Revision Arthroplasty", description: "Periprosthetic bone deficiency complicating revision implant fixation.", metadata: { pilot: BoneLossRevisionArthroplasty_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "paprosky-classification", entityType: "classification_system", preferredLabel: "Paprosky Classification", description: "Acetabular bone loss classification for revision THA.", metadata: { pilot: BoneLossRevisionArthroplasty_PILOT_KEY } },
  { slug: "aori-classification", entityType: "classification_system", preferredLabel: "AORI Classification", description: "Femoral and tibial metaphyseal bone loss classification for revision TKA.", metadata: { pilot: BoneLossRevisionArthroplasty_PILOT_KEY } },
];

export const BoneLossRevisionArthroplasty_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(BoneLossRevisionArthroplasty_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(BoneLossRevisionArthroplasty_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(BoneLossRevisionArthroplasty_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(BoneLossRevisionArthroplasty_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "bone-loss-revision-arthroplasty", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("bone-loss-revision-arthroplasty", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "bone-loss-revision-arthroplasty", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("bone-loss-revision-arthroplasty", "has_classification", "paprosky-classification", {}),
  rel("bone-loss-revision-arthroplasty", "has_classification", "aori-classification", {}),
  rel("revision-arthroplasty", "prerequisite_for", "bone-loss-revision-arthroplasty", {}),
  rel("polyethylene-wear-osteolysis", "prerequisite_for", "bone-loss-revision-arthroplasty", {}),
];

export const BoneLossRevisionArthroplasty_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeBoneLossRevisionArthroplastyRelationships(): PilotRelationshipSpec[] {
  return BoneLossRevisionArthroplasty_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const BoneLossRevisionArthroplasty_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-bone-loss-revision-arthroplasty-core",
    claimType: "fact",
    claimText: "Bone loss classification drives revision implant selection and augmentation strategy.",
    primaryEntitySlug: "bone-loss-revision-arthroplasty",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-bone-loss-revision-arthroplasty-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying bone loss revision arthroplasty without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "bone-loss-revision-arthroplasty",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-bone-loss-revision-arthroplasty-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect bone loss revision arthroplasty anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "bone-loss-revision-arthroplasty",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-bone-loss-revision-arthroplasty-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for bone loss revision arthroplasty.",
    primaryEntitySlug: "bone-loss-revision-arthroplasty",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const BoneLossRevisionArthroplasty_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-bone-loss-revision-arthroplasty-operative",
    subjectEntitySlug: "bone-loss-revision-arthroplasty",
    patternType: "operative_indication",
    trigger: "Revision arthroplasty with significant acetabular or metaphyseal bone loss",
    action: "Classify bone loss with Paprosky/AORI and discuss augmentation options with attending",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
