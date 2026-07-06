/**
 * Ankle fracture knowledge neighborhood — pilot specification.
 *
 * Pure data module: no DB IO. Used by proposal generation and quality reports.
 * Claims and decision points are DRAFT inputs only — never verified canonical truth.
 */

export const ANKLE_PILOT_KEY = "ankle-fracture-neighborhood" as const;

export const ANKLE_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-ankle-fractures",
  prepareTopicId: "ankle-fracture",
  casePrepSlug: "ankle-fracture-orif",
  legacyRetargetProposalKey: "retarget:trauma-ankle-fractures",
} as const;

export const ANKLE_ASSET_COUNTS = {
  ankiCardMappings: 12,
  orthobulletsQuestionMappings: 98,
} as const;

export type PilotEntitySpec = {
  slug: string;
  entityType: string;
  preferredLabel: string;
  description: string;
  metadata?: Record<string, unknown>;
};

export type PilotRelationshipSpec = {
  subjectSlug: string;
  predicate: string;
  objectSlug: string;
  metadata?: Record<string, unknown>;
};

export type PilotClaimDraft = {
  draftId: string;
  claimType: string;
  claimText: string;
  primaryEntitySlug: string;
  importanceLevel: "L1" | "L2" | "L3" | "L4";
  contentSource: "generated_draft";
  reviewStatus: "generated" | "needs_review";
  sourceNote: string;
  contextRelevance?: string[];
};

export type PilotDecisionPointDraft = {
  draftId: string;
  subjectEntitySlug: string;
  patternType: string;
  trigger: string;
  action: string;
  urgency: "routine" | "urgent" | "emergent";
  safetyCriticality: "none" | "moderate" | "high" | "emergency";
  contentSource: "generated_draft";
  reviewStatus: "generated" | "needs_review";
  sourceNote: string;
  requiresAttendingReview: boolean;
};

/** Canonical entity proposals for the ankle neighborhood. */
export const ANKLE_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "ankle-fracture",
    entityType: "condition",
    preferredLabel: "Ankle Fracture",
    description: "Fracture involving the ankle mortise and malleolar structures.",
    metadata: { clinical_kind: "fracture", pilot: ANKLE_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "weber-classification",
    entityType: "classification_system",
    preferredLabel: "Weber Classification",
    description: "Ankle fracture classification based on fibular fracture level relative to syndesmosis.",
    metadata: { pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "weber-a",
    entityType: "classification_grade",
    preferredLabel: "Weber A",
    description: "Infrasyndesmotic fibular fracture.",
    metadata: { pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "weber-b",
    entityType: "classification_grade",
    preferredLabel: "Weber B",
    description: "Transyndesmotic fibular fracture at syndesmosis level.",
    metadata: { pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "weber-c",
    entityType: "classification_grade",
    preferredLabel: "Weber C",
    description: "Suprasyndesmotic fibular fracture.",
    metadata: { pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "medial-clear-space-widening",
    entityType: "imaging_finding",
    preferredLabel: "Medial Clear Space Widening",
    description: "Radiographic widening suggesting deltoid incompetence and mortise instability.",
    metadata: { pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "mortise-stability",
    entityType: "biomechanics_concept",
    preferredLabel: "Mortise Stability",
    description: "Ankle joint congruity and stability of the mortise ring.",
    metadata: { pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "ankle-orif",
    entityType: "procedure",
    preferredLabel: "Ankle ORIF",
    description: "Open reduction and internal fixation of unstable ankle fracture patterns.",
    metadata: { pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "ankle-orif-fixation",
    entityType: "fixation_method",
    preferredLabel: "ORIF",
    description: "Operative fixation method for unstable ankle fractures.",
    metadata: { pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "ankle-malunion",
    entityType: "complication",
    preferredLabel: "Ankle Malunion",
    description: "Malreduced ankle fracture with persistent mortise incongruity.",
    metadata: { pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "post-traumatic-ankle-arthritis",
    entityType: "complication",
    preferredLabel: "Post-traumatic Ankle Arthritis",
    description: "Degenerative joint disease after ankle fracture injury.",
    metadata: { pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "syndesmotic-malreduction",
    entityType: "complication",
    preferredLabel: "Syndesmotic Malreduction",
    description: "Inadequate restoration of syndesmotic alignment after fixation.",
    metadata: { pilot: ANKLE_PILOT_KEY },
  },
  // Anatomy hub
  {
    slug: "ankle-ring",
    entityType: "anatomy_structure",
    preferredLabel: "Ankle Ring",
    description: "Composite mortise ring mental model connecting malleoli, syndesmosis, and deltoid.",
    metadata: { anatomy_kind: "composite", hierarchy_level: "structure", region: "ankle", pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "lateral-malleolus",
    entityType: "anatomy_structure",
    preferredLabel: "Lateral Malleolus",
    description: "Distal fibular lateral malleolus.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "ankle", pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "medial-malleolus",
    entityType: "anatomy_structure",
    preferredLabel: "Medial Malleolus",
    description: "Distal tibial medial malleolus.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "ankle", pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "talus",
    entityType: "anatomy_structure",
    preferredLabel: "Talus",
    description: "Talar dome and talar body at the ankle joint.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "ankle", pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "syndesmosis",
    entityType: "anatomy_structure",
    preferredLabel: "Syndesmosis",
    description: "Distal tibiofibular syndesmotic complex.",
    metadata: { anatomy_kind: "ligament", hierarchy_level: "structure", region: "ankle", pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "deltoid-ligament",
    entityType: "anatomy_structure",
    preferredLabel: "Deltoid Ligament",
    description: "Medial ankle deltoid ligament complex.",
    metadata: { anatomy_kind: "ligament", hierarchy_level: "structure", region: "ankle", pilot: ANKLE_PILOT_KEY },
  },
  {
    slug: "superficial-peroneal-nerve",
    entityType: "anatomy_structure",
    preferredLabel: "Superficial Peroneal Nerve",
    description: "Superficial peroneal nerve at risk in lateral ankle surgery.",
    metadata: { anatomy_kind: "nerve", hierarchy_level: "structure", region: "ankle", pilot: ANKLE_PILOT_KEY },
  },
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

/** Relationship proposals with draft metadata weighting. */
export const ANKLE_RELATIONSHIPS: PilotRelationshipSpec[] = [
  // Anatomy hierarchy
  rel("lateral-malleolus", "part_of", "ankle-ring", { anatomy_role: "essential", relevance_reason: "diagnosis" }),
  rel("medial-malleolus", "part_of", "ankle-ring", { anatomy_role: "essential", relevance_reason: "diagnosis" }),
  rel("syndesmosis", "part_of", "ankle-ring", { anatomy_role: "essential", relevance_reason: "instability" }),
  rel("deltoid-ligament", "part_of", "ankle-ring", { anatomy_role: "essential", relevance_reason: "instability" }),
  rel("talus", "articulates_with", "lateral-malleolus", { anatomy_role: "supporting", relevance_reason: "diagnosis" }),
  rel("deltoid-ligament", "inserts_on", "medial-malleolus", { anatomy_role: "supporting", relevance_reason: "instability" }),
  // Prerequisites
  rel("ankle-ring", "prerequisite_for", "ankle-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["clinic", "call"],
  }),
  // Clinical — diagnosis
  rel("ankle-fracture", "injured_in", "lateral-malleolus", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("ankle-fracture", "injured_in", "medial-malleolus", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("ankle-fracture", "involves_anatomy", "ankle-ring", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("ankle-fracture", "involves_anatomy", "syndesmosis", {
    anatomy_role: "essential",
    relevance_reason: "instability",
  }),
  rel("ankle-fracture", "involves_anatomy", "deltoid-ligament", {
    anatomy_role: "essential",
    relevance_reason: "instability",
  }),
  rel("ankle-fracture", "at_risk_structure", "superficial-peroneal-nerve", {
    anatomy_role: "essential",
    relevance_reason: "neurovascular_risk",
    context_relevance: ["or", "call"],
    clinical_importance: "high",
  }),
  rel("deltoid-ligament", "explains_instability", "ankle-fracture", {
    anatomy_role: "essential",
    relevance_reason: "instability",
    management_importance: "high",
  }),
  rel("syndesmosis", "explains_instability", "ankle-fracture", {
    anatomy_role: "essential",
    relevance_reason: "instability",
  }),
  // Classification
  rel("ankle-fracture", "has_classification", "weber-classification", {
    board_relevance: "high",
    educational_importance: "high",
  }),
  rel("ankle-fracture", "has_grade", "weber-b", { board_relevance: "high" }),
  rel("weber-b", "injured_in", "lateral-malleolus", { relevance_reason: "classification" }),
  // Imaging
  rel("ankle-fracture", "has_imaging_finding", "medial-clear-space-widening", {
    relevance_reason: "imaging",
    management_importance: "high",
    clinical_importance: "high",
  }),
  rel("medial-clear-space-widening", "explains_instability", "ankle-fracture", {
    relevance_reason: "imaging",
    management_importance: "high",
  }),
  rel("ankle-fracture", "involves_anatomy", "mortise-stability", {
    relevance_reason: "instability",
    note: "biomechanics_concept linked via involves_anatomy until dedicated predicate exists",
  }),
  // Treatment
  rel("ankle-fracture", "uses_fixation", "ankle-orif-fixation", {
    management_importance: "high",
    context_relevance: ["or", "clinic"],
  }),
  rel("ankle-fracture", "treated_by", "ankle-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("medial-clear-space-widening", "indicates_treatment", "ankle-orif", {
    management_importance: "high",
    confidence: 0.85,
    review_status: "needs_review",
  }),
  // Complications
  rel("ankle-fracture", "has_complication", "ankle-malunion"),
  rel("ankle-fracture", "has_complication", "post-traumatic-ankle-arthritis"),
  rel("ankle-fracture", "has_complication", "syndesmotic-malreduction"),
  // Procedure anatomy
  rel("ankle-orif", "involves_anatomy", "lateral-malleolus", {
    anatomy_role: "essential",
    relevance_reason: "approach",
    context_relevance: ["or"],
  }),
  rel("ankle-orif", "at_risk_structure", "superficial-peroneal-nerve", {
    anatomy_role: "essential",
    relevance_reason: "neurovascular_risk",
    context_relevance: ["or"],
  }),
];

/** Filter out disabled placeholder relationships. */
export function activeAnkleRelationships(): PilotRelationshipSpec[] {
  return ANKLE_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

/**
 * Claim drafts decomposed from static Prepare `ankle-fracture` topic.
 * content_source is always generated_draft — NOT verified.
 */
export const ANKLE_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-ankle-mortise-congruity",
    claimType: "fact",
    claimText: "Ankle fracture management hinges on mortise congruity, skin status, neurovascular exam, and syndesmotic integrity.",
    primaryEntitySlug: "ankle-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.mustKnow",
    contextRelevance: ["clinic", "call"],
  },
  {
    draftId: "claim-ankle-deltoid-unstable-fibula",
    claimType: "board_trap",
    claimText: "A deltoid ligament injury can make an isolated fibular fracture functionally unstable (bimalleolar equivalent).",
    primaryEntitySlug: "ankle-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.boardPearls",
    contextRelevance: ["oite", "clinic"],
  },
  {
    draftId: "claim-ankle-medial-clear-space",
    claimType: "imaging_point",
    claimText: "Medial clear space widening suggests deltoid incompetence and an unstable ankle fracture pattern.",
    primaryEntitySlug: "medial-clear-space-widening",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts + orthobullets fixture pattern (metadata only)",
    contextRelevance: ["clinic", "call"],
  },
  {
    draftId: "claim-ankle-ring-concept",
    claimType: "anatomy_pearl",
    claimText: "The ankle ring concept links malleoli, syndesmosis, and deltoid function — instability reflects ring disruption.",
    primaryEntitySlug: "ankle-ring",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.anatomy",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-ankle-isolated-fibula-trap",
    claimType: "cognitive_trap",
    claimText: "Assuming an isolated lateral malleolus fracture is always stable without assessing medial structures.",
    primaryEntitySlug: "ankle-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.orSurvivalTips + boardPearls synthesis",
    contextRelevance: ["call", "oite"],
  },
  {
    draftId: "claim-ankle-stress-views",
    claimType: "fact",
    claimText: "Stress views may help evaluate medial clear space and syndesmotic injury when plain films are equivocal.",
    primaryEntitySlug: "ankle-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.pimpQuestions",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-ankle-syndesmosis-language",
    claimType: "clinical_script",
    claimText: "On rounds, state whether the mortise is stable, comment on syndesmotic injury, and outline splint and weight-bearing plan.",
    primaryEntitySlug: "ankle-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.caseSteps",
    contextRelevance: ["clinic", "call"],
  },
];

/** Decision point drafts — always generated_draft; attending review required for operative indication. */
export const ANKLE_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-ankle-unstable-mortise-orif",
    subjectEntitySlug: "ankle-fracture",
    patternType: "operative_indication",
    trigger: "Unstable mortise pattern (e.g., medial clear space widening, bimalleolar injury, failed closed reduction)",
    action: "Proceed with operative fixation pathway (ORIF) including syndesmotic assessment/fixation when indicated",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.decisionMaking + treatmentOptions",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-ankle-stable-nonoperative",
    subjectEntitySlug: "ankle-fracture",
    patternType: "nonoperative_eligible",
    trigger: "Stable mortise with acceptable alignment after reduction",
    action: "Nonoperative immobilization with protected weight-bearing plan and repeat radiographs",
    urgency: "routine",
    safetyCriticality: "none",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.treatmentOptions",
    requiresAttendingReview: true,
  },
];

export function slugToEntityMap(): Map<string, PilotEntitySpec> {
  return new Map(ANKLE_ENTITIES.map((e) => [e.slug, e]));
}