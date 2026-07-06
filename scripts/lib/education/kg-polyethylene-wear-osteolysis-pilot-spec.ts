/**
 * Polyethylene Wear and Osteolysis knowledge neighborhood — manufacturing seed.
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

export const PolyethyleneWearOsteolysis_PILOT_KEY = "polyethylene-wear-osteolysis-neighborhood" as const;

export const PolyethyleneWearOsteolysis_SOURCE_IDS = {
  curriculumNodeSlug: "adult-recon-polyethylene-wear",
  prepareTopicId: "revision-arthroplasty",
  legacyRetargetProposalKey: "retarget:adult-recon-polyethylene-wear",
} as const;

export const PolyethyleneWearOsteolysis_ASSET_COUNTS = {
  ankiCardMappings: 4,
  orthobulletsQuestionMappings: 18,
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  { slug: "polyethylene-wear-osteolysis", entityType: "condition", preferredLabel: "Polyethylene Wear and Osteolysis", description: "Bearing surface wear with particle-induced bone loss.", metadata: { pilot: PolyethyleneWearOsteolysis_PILOT_KEY, clinical_kind: "arthroplasty", maturity_target: 6 } },
  { slug: "particulate-debris", entityType: "biomechanics_concept", preferredLabel: "Particulate Debris", description: "Wear particles activating macrophage-mediated osteolysis.", metadata: { pilot: PolyethyleneWearOsteolysis_PILOT_KEY } },
  { slug: "focal-osteolysis", entityType: "imaging_finding", preferredLabel: "Focal Periprosthetic Osteolysis", description: "Localized bone loss adjacent to polyethylene bearing.", metadata: { pilot: PolyethyleneWearOsteolysis_PILOT_KEY } },
];

export const PolyethyleneWearOsteolysis_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(PolyethyleneWearOsteolysis_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(PolyethyleneWearOsteolysis_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(PolyethyleneWearOsteolysis_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(PolyethyleneWearOsteolysis_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "polyethylene-wear-osteolysis", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),
  rel("polyethylene-wear-osteolysis", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),
  rel("implant-concepts-hub", "prerequisite_for", "polyethylene-wear-osteolysis", { implant_role: "essential", relevance_reason: "arthroplasty" }),
  rel("polyethylene-liner", "prerequisite_for", "polyethylene-wear-osteolysis", {}),
  rel("polyethylene-wear-osteolysis", "has_imaging_finding", "focal-osteolysis", {}),
  rel("bearing-surface-selection", "prerequisite_for", "polyethylene-wear-osteolysis", {}),
  rel("revision-arthroplasty", "prerequisite_for", "polyethylene-wear-osteolysis", {}),
];

export const PolyethyleneWearOsteolysis_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];

export function activePolyethyleneWearOsteolysisRelationships(): PilotRelationshipSpec[] {
  return PolyethyleneWearOsteolysis_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const PolyethyleneWearOsteolysis_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-polyethylene-wear-osteolysis-core",
    claimType: "fact",
    claimText: "Polyethylene wear is a silent driver of late arthroplasty failure through osteolysis.",
    primaryEntitySlug: "polyethylene-wear-osteolysis",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
    contextRelevance: ["clinic","call"],
  },
  {
    draftId: "claim-polyethylene-wear-osteolysis-board-trap",
    claimType: "board_trap",
    claimText: "Board trap: oversimplifying polyethylene wear osteolysis without attending-level implant, fixation, or infection context.",
    primaryEntitySlug: "polyethylene-wear-osteolysis",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-polyethylene-wear-osteolysis-pearl",
    claimType: "anatomy_pearl",
    claimText: "Attending pearl: connect polyethylene wear osteolysis anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.",
    primaryEntitySlug: "polyethylene-wear-osteolysis",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["or","clinic"],
  },
  {
    draftId: "claim-polyethylene-wear-osteolysis-script",
    claimType: "clinical_script",
    claimText: "Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for polyethylene wear osteolysis.",
    primaryEntitySlug: "polyethylene-wear-osteolysis",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    contextRelevance: ["call","clinic"],
  },
];

export const PolyethyleneWearOsteolysis_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-polyethylene-wear-osteolysis-operative",
    subjectEntitySlug: "polyethylene-wear-osteolysis",
    patternType: "operative_indication",
    trigger: "Progressive osteolysis around polyethylene bearing",
    action: "Discuss liner exchange or revision with attending and assess bone loss",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "adult-reconstruction cluster manufacturing seed",
    requiresAttendingReview: true,
  },
];
