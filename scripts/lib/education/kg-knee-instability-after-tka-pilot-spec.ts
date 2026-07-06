/**
 * Knee Instability After TKA knowledge neighborhood — manufacturing seed.
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

export const KneeInstabilityAfterTka_PILOT_KEY = "knee-instability-after-tka-neighborhood" as const;

export const KneeInstabilityAfterTka_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-knee-instability",
  prepareTopicId: "revision-arthroplasty",
  legacyRetargetProposalKey: "retarget:adult-recon-knee-instability",
} as const;

export const KneeInstabilityAfterTka_ASSET_COUNTS = {
  ankiCardMappings: 6,
  orthobulletsQuestionMappings: 30,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "knee-instability-after-tka", entityType: "condition", preferredLabel: "Knee Instability After TKA", description: "Persistent instability after TKA from balancing or constraint issues.", metadata: { pilot: KneeInstabilityAfterTka_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "flexion-extension-gap-balance", entityType: "biomechanics_concept", preferredLabel: "Flexion-Extension Gap Balance", description: "Soft tissue and bone resection balance determining TKA stability.", metadata: { pilot: KneeInstabilityAfterTka_PILOT_KEY } },
];

export const KneeInstabilityAfterTka_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(KneeInstabilityAfterTka_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(KneeInstabilityAfterTka_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(KneeInstabilityAfterTka_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(KneeInstabilityAfterTka_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "knee-instability-after-tka", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("knee-instability-after-tka", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "knee-instability-after-tka", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("knee-instability-after-tka", "involves_anatomy", "collateral-ligaments", {}),
  rel("knee-instability-after-tka", "involves_anatomy", "cruciate-ligaments", {}),
  rel("total-knee-arthroplasty", "prerequisite_for", "knee-instability-after-tka", {}),
];

export const KneeInstabilityAfterTka_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeKneeInstabilityAfterTkaRelationships(): PilotRelationshipSpec[] {
  return KneeInstabilityAfterTka_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const KneeInstabilityAfterTka_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-knee-instability-after-tka-core",
    claimType: "fact",
    claimText: "TKA instability requires gap balance and component position review before revision.",
    primaryEntitySlug: "knee-instability-after-tka",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-knee-instability-after-tka-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying knee instability after tka without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "knee-instability-after-tka",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-knee-instability-after-tka-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect knee instability after tka anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "knee-instability-after-tka",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-knee-instability-after-tka-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for knee instability after tka.",
    primaryEntitySlug: "knee-instability-after-tka",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const KneeInstabilityAfterTka_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-knee-instability-after-tka-operative",
    subjectEntitySlug: "knee-instability-after-tka",
    patternType: "operative_indication",
    trigger: "Persistent TKA instability despite appropriate rehab",
    action: "Review balancing and discuss constrained implant or revision with attending",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
