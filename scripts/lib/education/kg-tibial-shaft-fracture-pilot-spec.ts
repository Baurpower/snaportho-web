/**
 * Tibial shaft fracture knowledge neighborhood — manufacturing seed.
 *
 * Pure data module: no DB IO. Claims and DPs are DRAFT inputs only.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";

export const TIBIAL_SHAFT_PILOT_KEY = "tibial-shaft-fracture-neighborhood" as const;

export const TIBIAL_SHAFT_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-tibial-shaft-fractures",
  prepareTopicId: "tibial-shaft-fracture",
  legacyRetargetProposalKey: "retarget:trauma-tibial-shaft-fractures",
} as const;

export const TIBIAL_SHAFT_ASSET_COUNTS = {
  ankiCardMappings: 10,
  orthobulletsQuestionMappings: 63,
} as const;

export const TIBIAL_SHAFT_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "tibial-shaft-fracture",
    entityType: "condition",
    preferredLabel: "Tibial Shaft Fracture",
    description: "Diaphyseal fracture of the tibia, often with associated fibular injury and soft-tissue concerns.",
    metadata: { clinical_kind: "fracture", pilot: TIBIAL_SHAFT_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "tibia-leg-anatomy-hub",
    entityType: "anatomy_structure",
    preferredLabel: "Tibia Leg Anatomy Hub",
    description: "Composite leg model linking tibial shaft, fibula, blood supply, and compartment layout.",
    metadata: {
      anatomy_kind: "composite",
      hierarchy_level: "structure",
      region: "leg",
      pilot: TIBIAL_SHAFT_PILOT_KEY,
    },
  },
  {
    slug: "tibial-shaft",
    entityType: "anatomy_structure",
    preferredLabel: "Tibial Shaft",
    description: "Subcutaneous tibial diaphysis with limited soft-tissue envelope.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "leg", pilot: TIBIAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "fibula",
    entityType: "anatomy_structure",
    preferredLabel: "Fibula",
    description: "Lateral leg bone influencing alignment and length in tibial shaft injuries.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "leg", pilot: TIBIAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "tibial-blood-supply",
    entityType: "biomechanics_concept",
    preferredLabel: "Tibial Blood Supply",
    description: "Endosteal and periosteal perfusion concepts relevant to healing and open fractures.",
    metadata: { pilot: TIBIAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "leg-compartment-complex",
    entityType: "anatomy_structure",
    preferredLabel: "Leg Compartment Complex",
    description: "Four-compartment osteofascial model shared with compartment syndrome neighborhood.",
    metadata: { anatomy_kind: "composite", hierarchy_level: "structure", region: "leg", pilot: TIBIAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "anterior-compartment",
    entityType: "anatomy_structure",
    preferredLabel: "Anterior Compartment",
    description: "Anterior leg compartment at risk after tibial shaft injury.",
    metadata: { anatomy_kind: "compartment", hierarchy_level: "structure", region: "leg", pilot: TIBIAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "tibial-im-nail",
    entityType: "procedure",
    preferredLabel: "Tibial IM Nailing",
    description: "Intramedullary nailing for unstable or operative tibial shaft fracture patterns.",
    metadata: { pilot: TIBIAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "im-nail-fixation",
    entityType: "fixation_method",
    preferredLabel: "IM Nail",
    description: "Intramedullary fixation method for tibial shaft fractures.",
    metadata: { pilot: TIBIAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "tibial-malunion",
    entityType: "complication",
    preferredLabel: "Tibial Malunion",
    description: "Angular or rotational malalignment after tibial shaft fracture.",
    metadata: { pilot: TIBIAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "tibial-nonunion",
    entityType: "complication",
    preferredLabel: "Tibial Nonunion",
    description: "Failure of fracture healing after tibial shaft injury.",
    metadata: { pilot: TIBIAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "tibial-infection",
    entityType: "complication",
    preferredLabel: "Tibial Infection",
    description: "Deep infection risk especially with open tibial shaft fractures.",
    metadata: { pilot: TIBIAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "segmental-tibial-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Segmental Tibial Fracture Pattern",
    description: "Segmented diaphyseal pattern suggesting instability and operative tendency.",
    metadata: { pilot: TIBIAL_SHAFT_PILOT_KEY },
  },
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const TIBIAL_SHAFT_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("tibial-shaft", "part_of", "tibia-leg-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis" }),
  rel("fibula", "part_of", "tibia-leg-anatomy-hub", { anatomy_role: "essential", relevance_reason: "alignment" }),
  rel("anterior-compartment", "part_of", "leg-compartment-complex", { anatomy_role: "essential", relevance_reason: "compartment_risk" }),
  rel("leg-compartment-complex", "part_of", "tibia-leg-anatomy-hub", { anatomy_role: "essential", relevance_reason: "compartment_risk" }),
  rel("tibia-leg-anatomy-hub", "prerequisite_for", "tibial-shaft-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("tibial-shaft-fracture", "injured_in", "tibial-shaft", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("tibial-shaft-fracture", "involves_anatomy", "fibula", {
    anatomy_role: "essential",
    relevance_reason: "alignment",
    management_importance: "high",
  }),
  rel("tibial-shaft-fracture", "involves_anatomy", "tibia-leg-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("tibial-shaft-fracture", "involves_anatomy", "leg-compartment-complex", {
    anatomy_role: "essential",
    relevance_reason: "compartment_risk",
    clinical_importance: "high",
    context_relevance: ["call"],
  }),
  rel("tibial-shaft-fracture", "involves_anatomy", "anterior-compartment", {
    anatomy_role: "essential",
    relevance_reason: "compartment_risk",
    context_relevance: ["call"],
  }),
  rel("tibial-shaft-fracture", "involves_anatomy", "tibial-blood-supply", {
    relevance_reason: "healing",
    note: "biomechanics_concept linked via involves_anatomy",
  }),
  rel("tibial-shaft-fracture", "has_imaging_finding", "segmental-tibial-fracture", {
    relevance_reason: "instability",
    management_importance: "high",
  }),
  rel("segmental-tibial-fracture", "indicates_treatment", "tibial-im-nail", {
    management_importance: "high",
    confidence: 0.8,
    review_status: "needs_review",
  }),
  rel("tibial-shaft-fracture", "uses_fixation", "im-nail-fixation", {
    management_importance: "high",
    context_relevance: ["or", "clinic"],
  }),
  rel("tibial-shaft-fracture", "treated_by", "tibial-im-nail", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("tibial-im-nail", "involves_anatomy", "tibial-shaft", {
    anatomy_role: "essential",
    relevance_reason: "approach",
    context_relevance: ["or"],
  }),
  rel("tibial-shaft-fracture", "has_complication", "tibial-malunion"),
  rel("tibial-shaft-fracture", "has_complication", "tibial-nonunion"),
  rel("tibial-shaft-fracture", "has_complication", "tibial-infection"),
  rel("fibula", "articulates_with", "tibial-shaft", { anatomy_role: "supporting", relevance_reason: "alignment" }),
];

export function activeTibialShaftRelationships(): PilotRelationshipSpec[] {
  return TIBIAL_SHAFT_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const TIBIAL_SHAFT_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-tsf-soft-tissue-first",
    claimType: "fact",
    claimText: "Tibial shaft fractures are soft-tissue injuries first and bony injuries second.",
    primaryEntitySlug: "tibial-shaft-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.oneLiner",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-tsf-compartment-serial-exams",
    claimType: "board_trap",
    claimText: "Serial compartment exams matter because compartment syndrome is a clinical diagnosis that can evolve after splinting.",
    primaryEntitySlug: "tibial-shaft-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.boardPearls",
    contextRelevance: ["call", "oite"],
  },
  {
    draftId: "claim-tsf-open-urgency",
    claimType: "cognitive_trap",
    claimText: "Treating an open tibial shaft fracture like a routine closed injury without soft-tissue urgency and antibiotic planning.",
    primaryEntitySlug: "tibial-shaft-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.pimpQuestions + prerequisites open-fractures",
    contextRelevance: ["call"],
  },
  {
    draftId: "claim-tsf-im-entry-anatomy",
    claimType: "anatomy_pearl",
    claimText: "Proximal tibial entry point landmarks and nail starting point language are core OR survival knowledge for tibial IM nailing.",
    primaryEntitySlug: "tibial-shaft",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.anatomyFocus + orSurvivalTips",
    contextRelevance: ["or"],
  },
  {
    draftId: "claim-tsf-fibula-alignment",
    claimType: "fact",
    claimText: "Fibula status can influence tibial alignment and length goals during fracture management.",
    primaryEntitySlug: "fibula",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.selfCheckQuestions",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-tsf-segmental-instability",
    claimType: "imaging_point",
    claimText: "Segmental or highly comminuted tibial shaft patterns often signal instability and higher operative likelihood.",
    primaryEntitySlug: "segmental-tibial-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.classification + decisionMaking",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-tsf-case-script",
    claimType: "clinical_script",
    claimText: "Present wound status, compartment check, alignment, splint plan, and weight-bearing restrictions with explicit compartment surveillance.",
    primaryEntitySlug: "tibial-shaft-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.caseSteps",
    contextRelevance: ["call", "clinic"],
  },
];

export const TIBIAL_SHAFT_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-tsf-operative-nailing",
    subjectEntitySlug: "tibial-shaft-fracture",
    patternType: "operative_indication",
    trigger: "Unstable alignment, open injury, segmental/comminuted pattern, or unacceptable deformity",
    action: "Proceed with operative stabilization pathway (typically IM nail when soft tissues allow) with documented compartment exam",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.decisionMaking + treatmentOptions",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-tsf-nonoperative-cast",
    subjectEntitySlug: "tibial-shaft-fracture",
    patternType: "nonoperative_eligible",
    trigger: "Closed injury with acceptable alignment in patient suitable for casting/bracing",
    action: "Nonoperative immobilization with serial compartment exams and repeat radiographs",
    urgency: "routine",
    safetyCriticality: "none",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.treatmentOptions",
    requiresAttendingReview: true,
  },
];

export function tibialShaftSlugToEntityMap(): Map<string, PilotEntitySpec> {
  return new Map(TIBIAL_SHAFT_ENTITIES.map((e) => [e.slug, e]));
}