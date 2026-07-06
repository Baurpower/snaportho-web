/**
 * Aseptic Loosening of TKA knowledge neighborhood — manufacturing seed.
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

export const AsepticLooseningTka_PILOT_KEY = "aseptic-loosening-tka-neighborhood" as const;

export const AsepticLooseningTka_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-aseptic-loosening-tka",
  prepareTopicId: "revision-arthroplasty",
  legacyRetargetProposalKey: "retarget:adult-recon-aseptic-loosening-tka",
} as const;

export const AsepticLooseningTka_ASSET_COUNTS = {
  ankiCardMappings: 5,
  orthobulletsQuestionMappings: 20,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "aseptic-loosening-tka", entityType: "condition", preferredLabel: "Aseptic Loosening of TKA", description: "Mechanical failure of TKA fixation without infection.", metadata: { pilot: AsepticLooseningTka_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "tibial-component-subsidence", entityType: "imaging_finding", preferredLabel: "Tibial Component Subsidence", description: "Progressive tibial tray settling indicating loosening.", metadata: { pilot: AsepticLooseningTka_PILOT_KEY } },
];

export const AsepticLooseningTka_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(AsepticLooseningTka_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(AsepticLooseningTka_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(AsepticLooseningTka_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(AsepticLooseningTka_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "aseptic-loosening-tka", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("aseptic-loosening-tka", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "aseptic-loosening-tka", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("tibial-baseplate", "prerequisite_for", "aseptic-loosening-tka", {}),
  rel("femoral-component", "prerequisite_for", "aseptic-loosening-tka", {}),
  rel("aseptic-loosening-tka", "has_imaging_finding", "tibial-component-subsidence", {}),
  rel("revision-arthroplasty", "prerequisite_for", "aseptic-loosening-tka", {}),
];

export const AsepticLooseningTka_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeAsepticLooseningTkaRelationships(): PilotRelationshipSpec[] {
  return AsepticLooseningTka_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const AsepticLooseningTka_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-aseptic-loosening-tka-core",
    claimType: "fact",
    claimText: "Exclude infection before diagnosing aseptic TKA loosening.",
    primaryEntitySlug: "aseptic-loosening-tka",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-aseptic-loosening-tka-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying aseptic loosening tka without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "aseptic-loosening-tka",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-aseptic-loosening-tka-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect aseptic loosening tka anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "aseptic-loosening-tka",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-aseptic-loosening-tka-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for aseptic loosening tka.",
    primaryEntitySlug: "aseptic-loosening-tka",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const AsepticLooseningTka_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-aseptic-loosening-tka-operative",
    subjectEntitySlug: "aseptic-loosening-tka",
    patternType: "operative_indication",
    trigger: "Painful TKA with progressive subsidence and excluded infection",
    action: "Discuss revision TKA with attending including constraint and bone loss",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
