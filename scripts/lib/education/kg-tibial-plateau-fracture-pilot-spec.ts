/**
 * Tibial plateau fracture knowledge neighborhood — manufacturing seed.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  LE_SHARED_ANATOMY_RELATIONSHIPS,
  LEG_REFERENCE_RELATIONSHIPS,
  sharedLeAnatomyEntitiesForSibling,
  sharedLegAnatomyEntitiesForSibling,
} from "./kg-lower-extremity-shared-anatomy.ts";

export const TIBIAL_PLATEAU_PILOT_KEY = "tibial-plateau-fracture-neighborhood" as const;

export const TIBIAL_PLATEAU_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-tibial-plateau-fractures",
  prepareTopicId: "tibial-plateau-fracture",
  legacyRetargetProposalKey: "retarget:trauma-tibial-plateau-fractures",
} as const;

export const TIBIAL_PLATEAU_ASSET_COUNTS = {
  ankiCardMappings: 15,
  orthobulletsQuestionMappings: 68,
} as const;

const PLATEAU_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "tibial-plateau-fracture",
    entityType: "condition",
    preferredLabel: "Tibial Plateau Fracture",
    description: "Proximal tibial articular fracture combining split/depression patterns, instability, and soft-tissue risk.",
    metadata: { clinical_kind: "fracture", pilot: TIBIAL_PLATEAU_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "schatzker-classification",
    entityType: "classification_system",
    preferredLabel: "Schatzker Classification",
    description: "Tibial plateau fracture classification by split, depression, and bicondylar patterns.",
    metadata: { pilot: TIBIAL_PLATEAU_PILOT_KEY },
  },
  {
    slug: "bicondylar-tibial-plateau-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Bicondylar Tibial Plateau Fracture",
    description: "Both medial and lateral plateau involvement indicating high-energy instability.",
    metadata: { pilot: TIBIAL_PLATEAU_PILOT_KEY },
  },
  {
    slug: "tibial-plateau-orif",
    entityType: "procedure",
    preferredLabel: "Tibial Plateau ORIF",
    description: "Open reduction internal fixation of unstable tibial plateau fracture patterns.",
    metadata: { pilot: TIBIAL_PLATEAU_PILOT_KEY },
  },
  {
    slug: "tibial-plateau-stiffness",
    entityType: "complication",
    preferredLabel: "Tibial Plateau Stiffness",
    description: "Post-traumatic knee stiffness after tibial plateau fracture and immobilization.",
    metadata: { pilot: TIBIAL_PLATEAU_PILOT_KEY },
  },
];

export const TIBIAL_PLATEAU_ENTITIES: PilotEntitySpec[] = [
  ...sharedLeAnatomyEntitiesForSibling(TIBIAL_PLATEAU_PILOT_KEY),
  ...sharedLegAnatomyEntitiesForSibling(TIBIAL_PLATEAU_PILOT_KEY),
  ...PLATEAU_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const TIBIAL_PLATEAU_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...LE_SHARED_ANATOMY_RELATIONSHIPS,
  ...LEG_REFERENCE_RELATIONSHIPS,
  rel("lower-extremity-trauma-anatomy-hub", "prerequisite_for", "tibial-plateau-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("tibial-plateau-fracture", "injured_in", "tibial-plateau", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("tibial-plateau-fracture", "involves_anatomy", "distal-femur", {
    anatomy_role: "essential",
    relevance_reason: "tibiofemoral_alignment",
    clinical_importance: "high",
  }),
  rel("tibial-plateau-fracture", "involves_anatomy", "acl", {
    anatomy_role: "supporting",
    relevance_reason: "associated_ligament_injury",
  }),
  rel("tibial-plateau-fracture", "involves_anatomy", "lower-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("tibial-plateau-fracture", "at_risk_structure", "common-peroneal-nerve", {
    anatomy_role: "essential",
    relevance_reason: "lateral_knee_nerve",
    clinical_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("tibial-plateau-fracture", "at_risk_structure", "popliteal-artery", {
    anatomy_role: "essential",
    relevance_reason: "vascular_exam",
    clinical_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("tibial-plateau-fracture", "has_imaging_finding", "bicondylar-tibial-plateau-fracture", {
    relevance_reason: "instability",
    management_importance: "high",
  }),
  rel("bicondylar-tibial-plateau-fracture", "indicates_treatment", "tibial-plateau-orif", {
    management_importance: "high",
    confidence: 0.8,
    review_status: "needs_review",
    note: "soft-tissue timing and staging attending-dependent",
  }),
  rel("tibial-plateau-fracture", "treated_by", "tibial-plateau-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("tibial-plateau-orif", "involves_anatomy", "tibial-plateau", {
    anatomy_role: "essential",
    relevance_reason: "articular_reduction",
    context_relevance: ["or"],
  }),
  rel("tibial-plateau-fracture", "has_classification", "schatzker-classification", {
    educational_importance: "high",
    context_relevance: ["clinic", "oite"],
  }),
  rel("tibial-plateau-fracture", "has_complication", "tibial-plateau-stiffness"),
];

export function activeTibialPlateauRelationships(): PilotRelationshipSpec[] {
  return TIBIAL_PLATEAU_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const TIBIAL_PLATEAU_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-tpf-articular-soft-tissue",
    claimType: "fact",
    claimText: "Tibial plateau fractures combine articular injury, instability, and soft-tissue risk that often dictates operative timing.",
    primaryEntitySlug: "tibial-plateau-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts tibial-plateau-fracture oneLiner",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-tpf-schatzker-language",
    claimType: "fact",
    claimText: "Schatzker classification language communicates split versus depression patterns and guides treatment tendency.",
    primaryEntitySlug: "schatzker-classification",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts tibial-plateau-fracture classification",
    contextRelevance: ["clinic", "oite"],
  },
  {
    draftId: "claim-tpf-peroneal-artery-risk",
    claimType: "anatomy_pearl",
    claimText: "Common peroneal nerve and popliteal artery vulnerability make neurovascular exam mandatory in tibial plateau injuries.",
    primaryEntitySlug: "common-peroneal-nerve",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts mustKnow + anatomyFocus",
    contextRelevance: ["call", "or"],
  },
  {
    draftId: "claim-tpf-soft-tissue-timing-trap",
    claimType: "board_trap",
    claimText: "Soft-tissue condition often dictates tibial plateau operative timing more than the fracture line alone.",
    primaryEntitySlug: "tibial-plateau-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts boardPearls",
    contextRelevance: ["oite", "or"],
  },
  {
    draftId: "claim-tpf-case-script",
    claimType: "clinical_script",
    claimText: "State mechanism, Schatzker pattern, compartment and NV exam, articular step-off, and OR timing with soft-tissue status.",
    primaryEntitySlug: "tibial-plateau-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts caseSteps",
    contextRelevance: ["call", "clinic"],
  },
];

export const TIBIAL_PLATEAU_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-tpf-unstable-orif",
    subjectEntitySlug: "tibial-plateau-fracture",
    patternType: "operative_indication",
    trigger: "Unstable bicondylar or displaced tibial plateau fracture with articular step-off or ligamentous instability",
    action: "Plan ORIF when soft tissues allow; discuss external fixation bridge or delayed fixation if swelling is severe",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts decisionMaking + treatmentOptions",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-tpf-compartment-watch",
    subjectEntitySlug: "tibial-plateau-fracture",
    patternType: "operative_indication",
    trigger: "High-energy tibial plateau injury with tense compartments, escalating pain, or neurovascular change",
    action: "Escalate for compartment syndrome evaluation and fasciotomy consideration before definitive fixation",
    urgency: "emergent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-expansion-seeds.ts complications + pimpQuestions",
    requiresAttendingReview: true,
  },
];