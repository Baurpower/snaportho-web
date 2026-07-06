/**
 * Implant Fixation Principles knowledge neighborhood — manufacturing seed.
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

export const ImplantFixationPrinciples_PILOT_KEY = "implant-fixation-principles-neighborhood" as const;

export const ImplantFixationPrinciples_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-implant-fixation",
  prepareTopicId: "total-hip-arthroplasty",
  legacyRetargetProposalKey: "retarget:adult-recon-implant-fixation",
} as const;

export const ImplantFixationPrinciples_ASSET_COUNTS = {
  ankiCardMappings: 10,
  orthobulletsQuestionMappings: 38,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "implant-fixation-principles", entityType: "biomechanics_concept", preferredLabel: "Implant Fixation Principles", description: "Cemented versus cementless fixation strategies in primary and revision arthroplasty.", metadata: { pilot: ImplantFixationPrinciples_PILOT_KEY } },
  { slug: "primary-stability", entityType: "biomechanics_concept", preferredLabel: "Primary Stability", description: "Initial implant stability required before biological fixation matures.", metadata: { pilot: ImplantFixationPrinciples_PILOT_KEY } },
  { slug: "bone-ingrowth", entityType: "biomechanics_concept", preferredLabel: "Bone Ingrowth", description: "Cementless porous coating osseointegration over time.", metadata: { pilot: ImplantFixationPrinciples_PILOT_KEY } },
];

export const ImplantFixationPrinciples_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(ImplantFixationPrinciples_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(ImplantFixationPrinciples_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(ImplantFixationPrinciples_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(ImplantFixationPrinciples_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "implant-fixation-principles", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("implant-fixation-principles", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "implant-fixation-principles", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("press-fit-fixation", "prerequisite_for", "implant-fixation-principles", {}),
  rel("cemented-fixation", "prerequisite_for", "implant-fixation-principles", {}),
  rel("cement-mantle", "prerequisite_for", "implant-fixation-principles", {}),
  rel("tibial-shaft-fracture", "prerequisite_for", "implant-fixation-principles", {"cross_neighborhood":"trauma","relevance_reason":"im_nail_fixation_concepts"}),
  rel("total-hip-arthroplasty", "prerequisite_for", "implant-fixation-principles", {}),
  rel("total-knee-arthroplasty", "prerequisite_for", "implant-fixation-principles", {}),
];

export const ImplantFixationPrinciples_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeImplantFixationPrinciplesRelationships(): PilotRelationshipSpec[] {
  return ImplantFixationPrinciples_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const ImplantFixationPrinciples_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-implant-fixation-principles-core",
    claimType: "fact",
    claimText: "Cementless fixation requires primary stability; cemented fixation relies on interlock and mantle quality.",
    primaryEntitySlug: "implant-fixation-principles",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-implant-fixation-principles-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying implant fixation principles without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "implant-fixation-principles",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-implant-fixation-principles-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect implant fixation principles anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "implant-fixation-principles",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-implant-fixation-principles-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for implant fixation principles.",
    primaryEntitySlug: "implant-fixation-principles",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const ImplantFixationPrinciples_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-implant-fixation-principles-operative",
    subjectEntitySlug: "implant-fixation-principles",
    patternType: "operative_indication",
    trigger: "Primary arthroplasty with poor bone quality or revision context",
    action: "Discuss cemented versus cementless fixation strategy with attending",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
