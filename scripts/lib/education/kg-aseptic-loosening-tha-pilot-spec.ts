/**
 * Aseptic Loosening of THA knowledge neighborhood — manufacturing seed.
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

export const AsepticLooseningTha_PILOT_KEY = "aseptic-loosening-tha-neighborhood" as const;

export const AsepticLooseningTha_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-aseptic-loosening-tha",
  prepareTopicId: "revision-arthroplasty",
  legacyRetargetProposalKey: "retarget:adult-recon-aseptic-loosening-tha",
} as const;

export const AsepticLooseningTha_ASSET_COUNTS = {
  ankiCardMappings: 5,
  orthobulletsQuestionMappings: 22,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "aseptic-loosening-tha", entityType: "condition", preferredLabel: "Aseptic Loosening of THA", description: "Mechanical failure of THA fixation without infection.", metadata: { pilot: AsepticLooseningTha_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "periprosthetic-radiolucency", entityType: "imaging_finding", preferredLabel: "Periprosthetic Radiolucency", description: "Progressive lucent lines at bone-implant interface.", metadata: { pilot: AsepticLooseningTha_PILOT_KEY } },
  { slug: "osteolysis", entityType: "complication", preferredLabel: "Periprosthetic Osteolysis", description: "Particle-induced bone loss around THA components.", metadata: { pilot: AsepticLooseningTha_PILOT_KEY } },
];

export const AsepticLooseningTha_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(AsepticLooseningTha_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(AsepticLooseningTha_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(AsepticLooseningTha_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(AsepticLooseningTha_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "aseptic-loosening-tha", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("aseptic-loosening-tha", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "aseptic-loosening-tha", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("acetabular-component", "prerequisite_for", "aseptic-loosening-tha", {}),
  rel("femoral-stem", "prerequisite_for", "aseptic-loosening-tha", {}),
  rel("aseptic-loosening-tha", "has_imaging_finding", "periprosthetic-radiolucency", {}),
  rel("aseptic-loosening-tha", "has_complication", "osteolysis", {}),
  rel("revision-arthroplasty", "prerequisite_for", "aseptic-loosening-tha", {}),
];

export const AsepticLooseningTha_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activeAsepticLooseningThaRelationships(): PilotRelationshipSpec[] {
  return AsepticLooseningTha_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const AsepticLooseningTha_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-aseptic-loosening-tha-core",
    claimType: "fact",
    claimText: "Rule out infection before attributing painful THA to aseptic loosening.",
    primaryEntitySlug: "aseptic-loosening-tha",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-aseptic-loosening-tha-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying aseptic loosening tha without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "aseptic-loosening-tha",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-aseptic-loosening-tha-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect aseptic loosening tha anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "aseptic-loosening-tha",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-aseptic-loosening-tha-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for aseptic loosening tha.",
    primaryEntitySlug: "aseptic-loosening-tha",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const AsepticLooseningTha_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-aseptic-loosening-tha-operative",
    subjectEntitySlug: "aseptic-loosening-tha",
    patternType: "operative_indication",
    trigger: "Painful THA with progressive lucency and excluded infection",
    action: "Discuss revision THA with attending including bone loss and fixation strategy",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
