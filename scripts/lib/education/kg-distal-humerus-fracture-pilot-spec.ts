/**
 * Distal humerus fracture knowledge neighborhood — manufacturing seed.
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

export const DISTAL_HUMERUS_PILOT_KEY = "distal-humerus-fracture-neighborhood" as const;

export const DISTAL_HUMERUS_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-distal-humerus-fractures",
  prepareTopicId: "distal-humerus-fracture",
  legacyRetargetProposalKey: "retarget:trauma-distal-humerus-fractures",
} as const;

export const DISTAL_HUMERUS_ASSET_COUNTS = {
  ankiCardMappings: 7,
  orthobulletsQuestionMappings: 26,
} as const;

const DH_SPECIFIC: PilotEntitySpec[] = [
  {
    slug: "distal-humerus-fracture",
    entityType: "condition",
    preferredLabel: "Distal Humerus Fracture",
    description: "Fracture of the distal humeral articular region with column and nerve risk.",
    metadata: { clinical_kind: "fracture", pilot: DISTAL_HUMERUS_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "intra-articular-distal-humerus-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Intra-articular Distal Humerus Fracture",
    description: "Articular involvement of capitellum and/or trochlea requiring anatomic restoration.",
    metadata: { pilot: DISTAL_HUMERUS_PILOT_KEY },
  },
  {
    slug: "distal-humerus-orif",
    entityType: "procedure",
    preferredLabel: "Distal Humerus ORIF",
    description: "Dual-column open reduction internal fixation of distal humerus fracture.",
    metadata: { pilot: DISTAL_HUMERUS_PILOT_KEY },
  },
  {
    slug: "total-elbow-arthroplasty-trauma",
    entityType: "procedure",
    preferredLabel: "Total Elbow Arthroplasty for Trauma",
    description: "Arthroplasty option for unreconstructable distal humerus fracture in elderly patients.",
    metadata: { pilot: DISTAL_HUMERUS_PILOT_KEY },
  },
  {
    slug: "elbow-stiffness",
    entityType: "complication",
    preferredLabel: "Elbow Stiffness",
    description: "Loss of elbow motion after distal humerus fracture and immobilization.",
    metadata: { pilot: DISTAL_HUMERUS_PILOT_KEY },
  },
  {
    slug: "distal-humerus-nonunion",
    entityType: "complication",
    preferredLabel: "Distal Humerus Nonunion",
    description: "Failure of distal humerus fracture healing with instability.",
    metadata: { pilot: DISTAL_HUMERUS_PILOT_KEY },
  },
];

export const DISTAL_HUMERUS_ENTITIES: PilotEntitySpec[] = [
  ...sharedUeAnatomyEntitiesForSibling(DISTAL_HUMERUS_PILOT_KEY),
  ...DH_SPECIFIC,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const DISTAL_HUMERUS_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...UE_SHARED_ANATOMY_RELATIONSHIPS,
  rel("upper-extremity-trauma-anatomy-hub", "prerequisite_for", "distal-humerus-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("distal-humerus-fracture", "injured_in", "distal-humerus", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("distal-humerus-fracture", "involves_anatomy", "medial-column", {
    anatomy_role: "essential",
    relevance_reason: "column_fixation",
    clinical_importance: "high",
  }),
  rel("distal-humerus-fracture", "involves_anatomy", "lateral-column", {
    anatomy_role: "essential",
    relevance_reason: "column_fixation",
    clinical_importance: "high",
  }),
  rel("distal-humerus-fracture", "involves_anatomy", "capitellum", {
    anatomy_role: "essential",
    relevance_reason: "articular",
  }),
  rel("distal-humerus-fracture", "involves_anatomy", "trochlea", {
    anatomy_role: "essential",
    relevance_reason: "articular",
  }),
  rel("distal-humerus-fracture", "involves_anatomy", "upper-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("distal-humerus-fracture", "at_risk_structure", "ulnar-nerve", {
    anatomy_role: "essential",
    relevance_reason: "posteromedial_exposure",
    clinical_importance: "high",
    context_relevance: ["or"],
  }),
  rel("distal-humerus-fracture", "at_risk_structure", "median-nerve", {
    anatomy_role: "essential",
    relevance_reason: "anterior_exposure",
    clinical_importance: "high",
    context_relevance: ["or"],
  }),
  rel("distal-humerus-fracture", "has_imaging_finding", "intra-articular-distal-humerus-fracture", {
    relevance_reason: "articular",
    management_importance: "high",
  }),
  rel("intra-articular-distal-humerus-fracture", "indicates_treatment", "distal-humerus-orif", {
    management_importance: "high",
    confidence: 0.8,
    review_status: "needs_review",
  }),
  rel("distal-humerus-fracture", "treated_by", "distal-humerus-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("distal-humerus-fracture", "treated_by", "total-elbow-arthroplasty-trauma", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("distal-humerus-orif", "involves_anatomy", "distal-humerus", {
    anatomy_role: "essential",
    relevance_reason: "approach",
    context_relevance: ["or"],
  }),
  rel("distal-humerus-orif", "at_risk_structure", "ulnar-nerve", {
    anatomy_role: "essential",
    relevance_reason: "must_protect",
    clinical_importance: "high",
    context_relevance: ["or"],
  }),
  rel("distal-humerus-fracture", "has_complication", "elbow-stiffness"),
  rel("distal-humerus-fracture", "has_complication", "distal-humerus-nonunion"),
];

export function activeDistalHumerusRelationships(): PilotRelationshipSpec[] {
  return DISTAL_HUMERUS_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const DISTAL_HUMERUS_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-dh-column-concept",
    claimType: "anatomy_pearl",
    claimText: "Distal humerus fracture thinking uses medial and lateral column restoration with articular surface reconstruction.",
    primaryEntitySlug: "distal-humerus",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "trauma-distal-humerus-fractures curriculum",
    contextRelevance: ["or"],
  },
  {
    draftId: "claim-dh-ulnar-nerve",
    claimType: "board_trap",
    claimText: "Ulnar nerve identification and protection are essential during posterior distal humerus exposure.",
    primaryEntitySlug: "ulnar-nerve",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "distal humerus surgical anatomy",
    contextRelevance: ["oite", "or"],
  },
  {
    draftId: "claim-dh-tea-elderly",
    claimType: "cognitive_trap",
    claimText: "Attempting complex ORIF in unreconstructable osteoporotic distal humerus fractures without discussing arthroplasty.",
    primaryEntitySlug: "distal-humerus-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "distal humerus elderly treatment",
    contextRelevance: ["or"],
  },
  {
    draftId: "claim-dh-stiffness",
    claimType: "fact",
    claimText: "Elbow stiffness is a major functional complication after distal humerus fracture treatment.",
    primaryEntitySlug: "elbow-stiffness",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "distal humerus complications",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-dh-case-script",
    claimType: "clinical_script",
    claimText: "Describe articular involvement, column comminution, nerve exam, splint position, and ORIF versus arthroplasty discussion.",
    primaryEntitySlug: "distal-humerus-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "distal humerus case script",
    contextRelevance: ["call", "clinic"],
  },
];

export const DISTAL_HUMERUS_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-dh-orif",
    subjectEntitySlug: "distal-humerus-fracture",
    patternType: "operative_indication",
    trigger: "Displaced intra-articular distal humerus fracture with reconstructable columns in suitable patient",
    action: "Plan dual-column ORIF with attending; document nerve protection and articular reduction goals",
    urgency: "urgent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "distal humerus ORIF indications",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-dh-tea",
    subjectEntitySlug: "distal-humerus-fracture",
    patternType: "operative_indication",
    trigger: "Unreconstructable distal humerus fracture in elderly low-demand patient",
    action: "Discuss total elbow arthroplasty with attending and postoperative activity restrictions",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "distal humerus arthroplasty pathway",
    requiresAttendingReview: true,
  },
];