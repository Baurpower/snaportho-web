/**
 * Proximal humerus fracture knowledge neighborhood — manufacturing seed.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  UE_SHARED_ANATOMY_RELATIONSHIPS,
  sharedUeAnatomyEntitiesForSibling,
} from "./kg-upper-extremity-shared-anatomy.ts";

export const PROXIMAL_HUMERUS_PILOT_KEY = "proximal-humerus-fracture-neighborhood" as const;

export const PROXIMAL_HUMERUS_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-proximal-humerus-fractures",
  prepareTopicId: "proximal-humerus-fracture",
  legacyRetargetProposalKey: "retarget:trauma-proximal-humerus-fractures",
} as const;

export const PROXIMAL_HUMERUS_ASSET_COUNTS = {
  ankiCardMappings: 0,
  orthobulletsQuestionMappings: 57,
} as const;

const PH_SPECIFIC: PilotEntitySpec[] = [
  {
    slug: "proximal-humerus-fracture",
    entityType: "condition",
    preferredLabel: "Proximal Humerus Fracture",
    description: "Fracture involving the proximal humeral head, neck, or tuberosities.",
    metadata: { clinical_kind: "fracture", pilot: PROXIMAL_HUMERUS_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "neer-classification",
    entityType: "classification_system",
    preferredLabel: "Neer Classification",
    description: "Part-based proximal humerus fracture classification framework.",
    metadata: { pilot: PROXIMAL_HUMERUS_PILOT_KEY },
  },
  {
    slug: "proximal-humerus-orif",
    entityType: "procedure",
    preferredLabel: "Proximal Humerus ORIF",
    description: "Open reduction internal fixation of displaced proximal humerus fracture.",
    metadata: { pilot: PROXIMAL_HUMERUS_PILOT_KEY },
  },
  {
    slug: "proximal-humerus-hemiarthroplasty",
    entityType: "procedure",
    preferredLabel: "Proximal Humerus Hemiarthroplasty",
    description: "Hemiarthroplasty for select complex or unreconstructable proximal humerus fractures.",
    metadata: { pilot: PROXIMAL_HUMERUS_PILOT_KEY },
  },
  {
    slug: "displaced-proximal-humerus-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Displaced Proximal Humerus Fracture",
    description: "Multi-part or displaced proximal humerus pattern altering fixation versus arthroplasty calculus.",
    metadata: { pilot: PROXIMAL_HUMERUS_PILOT_KEY },
  },
  {
    slug: "proximal-humerus-stiffness",
    entityType: "complication",
    preferredLabel: "Proximal Humerus Stiffness",
    description: "Post-fracture shoulder stiffness from immobilization or malunion.",
    metadata: { pilot: PROXIMAL_HUMERUS_PILOT_KEY },
  },
  {
    slug: "humeral-head-avn",
    entityType: "complication",
    preferredLabel: "Humeral Head AVN",
    description: "Avascular necrosis of the humeral head after proximal humerus fracture.",
    metadata: { pilot: PROXIMAL_HUMERUS_PILOT_KEY },
  },
];

export const PROXIMAL_HUMERUS_ENTITIES: PilotEntitySpec[] = [
  ...sharedUeAnatomyEntitiesForSibling(PROXIMAL_HUMERUS_PILOT_KEY),
  ...PH_SPECIFIC,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const PROXIMAL_HUMERUS_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...UE_SHARED_ANATOMY_RELATIONSHIPS,
  rel("upper-extremity-trauma-anatomy-hub", "prerequisite_for", "proximal-humerus-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("proximal-humerus-fracture", "injured_in", "proximal-humerus", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("proximal-humerus-fracture", "injured_in", "surgical-neck", {
    anatomy_role: "essential",
    relevance_reason: "fracture_zone",
    clinical_importance: "high",
  }),
  rel("proximal-humerus-fracture", "involves_anatomy", "humeral-head", {
    anatomy_role: "essential",
    relevance_reason: "viability",
    clinical_importance: "high",
  }),
  rel("proximal-humerus-fracture", "involves_anatomy", "upper-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("proximal-humerus-fracture", "at_risk_structure", "axillary-nerve", {
    anatomy_role: "essential",
    relevance_reason: "neurovascular_exam",
    clinical_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("proximal-humerus-fracture", "has_imaging_finding", "displaced-proximal-humerus-fracture", {
    relevance_reason: "displacement",
    management_importance: "high",
  }),
  rel("displaced-proximal-humerus-fracture", "indicates_treatment", "proximal-humerus-orif", {
    management_importance: "high",
    confidence: 0.75,
    review_status: "needs_review",
  }),
  rel("proximal-humerus-fracture", "treated_by", "proximal-humerus-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("proximal-humerus-fracture", "treated_by", "proximal-humerus-hemiarthroplasty", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("proximal-humerus-orif", "involves_anatomy", "proximal-humerus", {
    anatomy_role: "essential",
    relevance_reason: "approach",
    context_relevance: ["or"],
  }),
  rel("proximal-humerus-fracture", "has_classification", "neer-classification", {
    educational_importance: "high",
    context_relevance: ["clinic", "oite"],
  }),
  rel("proximal-humerus-fracture", "has_complication", "proximal-humerus-stiffness"),
  rel("proximal-humerus-fracture", "has_complication", "humeral-head-avn"),
];

export function activeProximalHumerusRelationships(): PilotRelationshipSpec[] {
  return PROXIMAL_HUMERUS_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const PROXIMAL_HUMERUS_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-ph-nonoperative-majority",
    claimType: "fact",
    claimText: "Many proximal humerus fractures in elderly patients are treated nonoperatively when alignment is acceptable.",
    primaryEntitySlug: "proximal-humerus-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts proximal-humerus-fracture",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-ph-axillary-exam",
    claimType: "anatomy_pearl",
    claimText: "Axillary nerve exam should be part of every proximal humerus fracture presentation.",
    primaryEntitySlug: "axillary-nerve",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.boardPearls",
    contextRelevance: ["call", "oite"],
  },
  {
    draftId: "claim-ph-tuberosity-trap",
    claimType: "board_trap",
    claimText: "Tuberosity displacement and head-split patterns change operative thinking more than nondisplaced neck lines alone.",
    primaryEntitySlug: "displaced-proximal-humerus-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.decisionMaking",
    contextRelevance: ["oite", "or"],
  },
  {
    draftId: "claim-ph-elderly-arthroplasty-trap",
    claimType: "cognitive_trap",
    claimText: "Pushing ORIF in poor bone quality complex fractures without discussing hemiarthroplasty alternatives.",
    primaryEntitySlug: "proximal-humerus-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.treatmentOptions",
    contextRelevance: ["or"],
  },
  {
    draftId: "claim-ph-case-script",
    claimType: "clinical_script",
    claimText: "State fracture parts, axillary nerve function, sling plan, and early pendulum motion when safe.",
    primaryEntitySlug: "proximal-humerus-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.caseSteps",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-ph-stiffness",
    claimType: "fact",
    claimText: "Stiffness is a major functional complication after proximal humerus fracture and immobilization.",
    primaryEntitySlug: "proximal-humerus-stiffness",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.complications",
    contextRelevance: ["clinic"],
  },
];

export const PROXIMAL_HUMERUS_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-ph-operative-orif",
    subjectEntitySlug: "proximal-humerus-fracture",
    patternType: "operative_indication",
    trigger: "Displaced two-, three-, or four-part pattern with reconstructable tuberosities in suitable patient",
    action: "Discuss ORIF with attending; document tuberosity reduction goals and rehab plan",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.treatmentOptions",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-ph-hemiarthroplasty",
    subjectEntitySlug: "proximal-humerus-fracture",
    patternType: "operative_indication",
    trigger: "Unreconstructable head-split or severe comminution in elderly low-demand patient",
    action: "Discuss hemiarthroplasty with attending and tuberosity healing expectations",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.treatmentOptions",
    requiresAttendingReview: true,
  },
];