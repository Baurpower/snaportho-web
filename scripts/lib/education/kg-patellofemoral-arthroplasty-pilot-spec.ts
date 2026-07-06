/**
 * Patellofemoral Arthroplasty knowledge neighborhood — manufacturing seed.
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

export const PatellofemoralArthroplasty_PILOT_KEY = "patellofemoral-arthroplasty-neighborhood" as const;

export const PatellofemoralArthroplasty_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-patellofemoral-arthroplasty",
  prepareTopicId: "knee-osteoarthritis",
  legacyRetargetProposalKey: "retarget:adult-recon-patellofemoral-arthroplasty",
} as const;

export const PatellofemoralArthroplasty_ASSET_COUNTS = {
  ankiCardMappings: 3,
  orthobulletsQuestionMappings: 12,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "patellofemoral-arthroplasty", entityType: "procedure", preferredLabel: "Patellofemoral Arthroplasty", description: "Isolated patellofemoral resurfacing for select anterior knee OA.", metadata: { pilot: PatellofemoralArthroplasty_PILOT_KEY } },
  { slug: "patellofemoral-tracking", entityType: "biomechanics_concept", preferredLabel: "Patellofemoral Tracking", description: "Patella alignment and trochlear engagement determining PFA candidacy.", metadata: { pilot: PatellofemoralArthroplasty_PILOT_KEY } },
];

export const PatellofemoralArthroplasty_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(PatellofemoralArthroplasty_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(PatellofemoralArthroplasty_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(PatellofemoralArthroplasty_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(PatellofemoralArthroplasty_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "patellofemoral-arthroplasty", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("patellofemoral-arthroplasty", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "patellofemoral-arthroplasty", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("patellofemoral-arthroplasty", "involves_anatomy", "patella", {"cross_cluster":"lower-extremity-trauma-cluster-shared"}),
  rel("patellar-component", "prerequisite_for", "patellofemoral-arthroplasty", {}),
  rel("knee-osteoarthritis", "prerequisite_for", "patellofemoral-arthroplasty", {}),
];

export const PatellofemoralArthroplasty_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activePatellofemoralArthroplastyRelationships(): PilotRelationshipSpec[] {
  return PatellofemoralArthroplasty_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const PatellofemoralArthroplasty_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-patellofemoral-arthroplasty-core",
    claimType: "fact",
    claimText: "PFA requires isolated patellofemoral disease without significant tibiofemoral OA.",
    primaryEntitySlug: "patellofemoral-arthroplasty",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-patellofemoral-arthroplasty-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying patellofemoral arthroplasty without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "patellofemoral-arthroplasty",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-patellofemoral-arthroplasty-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect patellofemoral arthroplasty anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "patellofemoral-arthroplasty",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-patellofemoral-arthroplasty-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for patellofemoral arthroplasty.",
    primaryEntitySlug: "patellofemoral-arthroplasty",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const PatellofemoralArthroplasty_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-patellofemoral-arthroplasty-operative",
    subjectEntitySlug: "patellofemoral-arthroplasty",
    patternType: "operative_indication",
    trigger: "Isolated patellofemoral OA with failed conservative care",
    action: "Confirm no significant tibiofemoral disease before PFA discussion with attending",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
