/**
 * Supracondylar humerus fracture knowledge neighborhood — manufacturing seed.
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

export const SUPRACONDYLAR_PILOT_KEY = "supracondylar-humerus-fracture-neighborhood" as const;

export const SUPRACONDYLAR_SOURCE_IDS = {
  curriculumNodeSlug: "pediatrics-supracondylar-fracture-pediatric",
  prepareTopicId: "supracondylar-humerus-fracture",
  legacyRetargetProposalKey: "retarget:pediatrics-supracondylar-fracture-pediatric",
} as const;

export const SUPRACONDYLAR_ASSET_COUNTS = {
  ankiCardMappings: 0,
  orthobulletsQuestionMappings: 58,
} as const;

const SC_SPECIFIC: PilotEntitySpec[] = [
  {
    slug: "supracondylar-humerus-fracture",
    entityType: "condition",
    preferredLabel: "Supracondylar Humerus Fracture",
    description: "Pediatric distal humerus metaphyseal fracture with neurovascular urgency.",
    metadata: { clinical_kind: "fracture", pilot: SUPRACONDYLAR_PILOT_KEY, maturity_target: 6, pediatric: true },
  },
  {
    slug: "gartland-classification",
    entityType: "classification_system",
    preferredLabel: "Gartland Classification",
    description: "Displacement-based supracondylar humerus fracture classification.",
    metadata: { pilot: SUPRACONDYLAR_PILOT_KEY },
  },
  {
    slug: "extension-type-supracondylar-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Extension-Type Supracondylar Fracture",
    description: "Posteriorly displaced supracondylar pattern on lateral radiograph.",
    metadata: { pilot: SUPRACONDYLAR_PILOT_KEY },
  },
  {
    slug: "supracondylar-percutaneous-pinning",
    entityType: "procedure",
    preferredLabel: "Supracondylar Percutaneous Pinning",
    description: "Closed reduction and percutaneous pinning for displaced pediatric supracondylar fractures.",
    metadata: { pilot: SUPRACONDYLAR_PILOT_KEY },
  },
  {
    slug: "pulseless-supracondylar-hand",
    entityType: "imaging_finding",
    preferredLabel: "Pulseless Supracondylar Hand",
    description: "Absent radial pulse after supracondylar injury requiring vascular assessment.",
    metadata: { pilot: SUPRACONDYLAR_PILOT_KEY },
  },
  {
    slug: "cubitus-varus",
    entityType: "complication",
    preferredLabel: "Cubitus Varus",
    description: "Gunstock deformity after malunited supracondylar humerus fracture.",
    metadata: { pilot: SUPRACONDYLAR_PILOT_KEY },
  },
  {
    slug: "supracondylar-nerve-palsy",
    entityType: "complication",
    preferredLabel: "Supracondylar Nerve Palsy",
    description: "AIN, median, or radial nerve dysfunction after supracondylar fracture.",
    metadata: { pilot: SUPRACONDYLAR_PILOT_KEY },
  },
];

export const SUPRACONDYLAR_ENTITIES: PilotEntitySpec[] = [
  ...sharedUeAnatomyEntitiesForSibling(SUPRACONDYLAR_PILOT_KEY),
  ...SC_SPECIFIC,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const SUPRACONDYLAR_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...UE_SHARED_ANATOMY_RELATIONSHIPS,
  rel("upper-extremity-trauma-anatomy-hub", "prerequisite_for", "supracondylar-humerus-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("supracondylar-humerus-fracture", "injured_in", "distal-humerus", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("supracondylar-humerus-fracture", "involves_anatomy", "elbow-joint", {
    anatomy_role: "essential",
    relevance_reason: "alignment",
    clinical_importance: "high",
  }),
  rel("supracondylar-humerus-fracture", "involves_anatomy", "upper-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("supracondylar-humerus-fracture", "at_risk_structure", "brachial-artery", {
    anatomy_role: "essential",
    relevance_reason: "vascular_exam",
    clinical_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("supracondylar-humerus-fracture", "at_risk_structure", "anterior-interosseous-nerve", {
    anatomy_role: "essential",
    relevance_reason: "ain_exam",
    clinical_importance: "high",
    context_relevance: ["call"],
  }),
  rel("supracondylar-humerus-fracture", "at_risk_structure", "median-nerve", {
    anatomy_role: "essential",
    relevance_reason: "neurovascular_exam",
    clinical_importance: "high",
    context_relevance: ["call"],
  }),
  rel("supracondylar-humerus-fracture", "at_risk_structure", "radial-nerve", {
    anatomy_role: "essential",
    relevance_reason: "neurovascular_exam",
    clinical_importance: "high",
    context_relevance: ["call"],
  }),
  rel("supracondylar-humerus-fracture", "has_imaging_finding", "extension-type-supracondylar-fracture", {
    relevance_reason: "displacement",
    management_importance: "high",
  }),
  rel("supracondylar-humerus-fracture", "has_imaging_finding", "pulseless-supracondylar-hand", {
    relevance_reason: "vascular_emergency",
    management_importance: "high",
  }),
  rel("extension-type-supracondylar-fracture", "indicates_treatment", "supracondylar-percutaneous-pinning", {
    management_importance: "high",
    confidence: 0.85,
    review_status: "needs_review",
  }),
  rel("pulseless-supracondylar-hand", "indicates_treatment", "supracondylar-percutaneous-pinning", {
    management_importance: "high",
    confidence: 0.8,
    review_status: "needs_review",
    note: "urgent reduction first; vascular exploration attending-dependent",
  }),
  rel("supracondylar-humerus-fracture", "treated_by", "supracondylar-percutaneous-pinning", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("supracondylar-percutaneous-pinning", "involves_anatomy", "distal-humerus", {
    anatomy_role: "essential",
    relevance_reason: "pin_trajectory",
    context_relevance: ["or"],
  }),
  rel("supracondylar-humerus-fracture", "has_classification", "gartland-classification", {
    educational_importance: "high",
    context_relevance: ["clinic", "oite"],
  }),
  rel("supracondylar-humerus-fracture", "has_complication", "cubitus-varus"),
  rel("supracondylar-humerus-fracture", "has_complication", "supracondylar-nerve-palsy"),
];

export function activeSupracondylarRelationships(): PilotRelationshipSpec[] {
  return SUPRACONDYLAR_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const SUPRACONDYLAR_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-sc-nv-urgency",
    claimType: "fact",
    claimText: "Supracondylar humerus fractures are pediatric elbow injuries where neurovascular status determines urgency.",
    primaryEntitySlug: "supracondylar-humerus-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts supracondylar-humerus-fracture fast.oneLiner",
    contextRelevance: ["call"],
  },
  {
    draftId: "claim-sc-ain-exam",
    claimType: "anatomy_pearl",
    claimText: "Test anterior interosseous nerve function with FPL and index FDP strength in pediatric supracondylar exams.",
    primaryEntitySlug: "anterior-interosseous-nerve",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.orSurvivalTips",
    contextRelevance: ["call", "oite"],
  },
  {
    draftId: "claim-sc-pulseless-trap",
    claimType: "board_trap",
    claimText: "A pulseless, poorly perfused hand after supracondylar fracture is an emergency requiring urgent reduction and vascular reassessment.",
    primaryEntitySlug: "pulseless-supracondylar-hand",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.boardPearls",
    contextRelevance: ["call", "oite"],
  },
  {
    draftId: "claim-sc-fat-pad-trap",
    claimType: "cognitive_trap",
    claimText: "Clearing a child with elbow pain after trauma without checking anterior humeral line and fat pad signs.",
    primaryEntitySlug: "extension-type-supracondylar-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.mustKnow",
    contextRelevance: ["call"],
  },
  {
    draftId: "claim-sc-pinning-default",
    claimType: "fact",
    claimText: "Displaced supracondylar fractures typically need urgent closed reduction and percutaneous pinning.",
    primaryEntitySlug: "supracondylar-percutaneous-pinning",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.treatmentOptions",
    contextRelevance: ["or"],
  },
  {
    draftId: "claim-sc-case-script",
    claimType: "clinical_script",
    claimText: "Document swelling, pulse, AIN/median/radial exam, anterior humeral line, Gartland language, and pinning urgency.",
    primaryEntitySlug: "supracondylar-humerus-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.caseSteps",
    contextRelevance: ["call"],
  },
];

export const SUPRACONDYLAR_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-sc-urgent-pinning",
    subjectEntitySlug: "supracondylar-humerus-fracture",
    patternType: "operative_indication",
    trigger: "Displaced (Gartland II-III) supracondylar fracture pattern",
    action: "Urgent closed reduction and percutaneous pinning with attending; repeat neurovascular exam after reduction",
    urgency: "emergent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.decisionMaking",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-sc-pulseless-vascular",
    subjectEntitySlug: "supracondylar-humerus-fracture",
    patternType: "operative_indication",
    trigger: "Pulseless or poorly perfused hand after supracondylar fracture, especially if remains pulseless after reduction",
    action: "Emergent reduction, vascular reassessment, and attending escalation for exploration versus observation protocol",
    urgency: "emergent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.complications + vascular pathways",
    requiresAttendingReview: true,
  },
];