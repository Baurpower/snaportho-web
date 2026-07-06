/**
 * Bearing Surface Selection knowledge neighborhood — manufacturing seed.
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

export const BearingSurfaceSelection_PILOT_KEY = "bearing-surface-selection-neighborhood" as const;

export const BearingSurfaceSelection_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-bearing-surfaces",
  prepareTopicId: "total-hip-arthroplasty",
  legacyRetargetProposalKey: "retarget:adult-recon-bearing-surfaces",
} as const;

export const BearingSurfaceSelection_ASSET_COUNTS = {
  ankiCardMappings: 6,
  orthobulletsQuestionMappings: 26,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "bearing-surface-selection", entityType: "biomechanics_concept", preferredLabel: "Bearing Surface Selection", description: "Choice among polyethylene, ceramic, and metal bearing couples.", metadata: { pilot: BearingSurfaceSelection_PILOT_KEY } },
  { slug: "cross-linked-polyethylene", entityType: "biomechanics_concept", preferredLabel: "Cross-Linked Polyethylene", description: "Highly cross-linked PE reducing volumetric wear in arthroplasty.", metadata: { pilot: BearingSurfaceSelection_PILOT_KEY } },
  { slug: "ceramic-on-ceramic-bearing", entityType: "biomechanics_concept", preferredLabel: "Ceramic-on-Ceramic Bearing", description: "Low-wear ceramic couple with fracture and squeak considerations.", metadata: { pilot: BearingSurfaceSelection_PILOT_KEY } },
];

export const BearingSurfaceSelection_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(BearingSurfaceSelection_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(BearingSurfaceSelection_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(BearingSurfaceSelection_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(BearingSurfaceSelection_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "bearing-surface-selection", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("bearing-surface-selection", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "bearing-surface-selection", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("polyethylene-liner", "prerequisite_for", "bearing-surface-selection", {}),
  rel("polyethylene-wear-osteolysis", "prerequisite_for", "bearing-surface-selection", {}),
  rel("adverse-local-tissue-reaction", "prerequisite_for", "bearing-surface-selection", {}),
  rel("total-hip-arthroplasty", "prerequisite_for", "bearing-surface-selection", {}),
  rel("total-knee-arthroplasty", "prerequisite_for", "bearing-surface-selection", {}),
];

export const BearingSurfaceSelection_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeBearingSurfaceSelectionRelationships(): PilotRelationshipSpec[] {
  return BearingSurfaceSelection_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const BearingSurfaceSelection_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-bearing-surface-selection-core",
    claimType: "fact",
    claimText: "Bearing choice must account for wear, stability, patient age, and revision consequences.",
    primaryEntitySlug: "bearing-surface-selection",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-bearing-surface-selection-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying bearing surface selection without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "bearing-surface-selection",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-bearing-surface-selection-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect bearing surface selection anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "bearing-surface-selection",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-bearing-surface-selection-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for bearing surface selection.",
    primaryEntitySlug: "bearing-surface-selection",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const BearingSurfaceSelection_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-bearing-surface-selection-operative",
    subjectEntitySlug: "bearing-surface-selection",
    patternType: "operative_indication",
    trigger: "Primary arthroplasty in young active patient",
    action: "Discuss bearing surface options with attending weighing wear versus complications",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
