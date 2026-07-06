/**
 * Compartment syndrome knowledge neighborhood — pilot specification.
 *
 * Pure data module: no DB IO. Used by proposal generation and quality reports.
 * Claims and decision points are DRAFT inputs only — never verified canonical truth.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";

export const COMPARTMENT_SYNDROME_PILOT_KEY = "compartment-syndrome-neighborhood" as const;

export const COMPARTMENT_SYNDROME_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-leg-compartment-syndrome",
  prepareTopicId: "compartment-syndrome",
  legacyRetargetProposalKey: "retarget:trauma-leg-compartment-syndrome",
} as const;

export const COMPARTMENT_SYNDROME_ASSET_COUNTS = {
  ankiCardMappings: 10,
  orthobulletsQuestionMappings: 23,
} as const;

export const COMPARTMENT_SYNDROME_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "compartment-syndrome",
    entityType: "condition",
    preferredLabel: "Compartment Syndrome",
    description: "Acute elevation of intracompartmental pressure threatening limb perfusion.",
    metadata: { clinical_kind: "emergency", pilot: COMPARTMENT_SYNDROME_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "leg-compartment-complex",
    entityType: "anatomy_structure",
    preferredLabel: "Leg Compartment Complex",
    description: "Four-compartment osteofascial model of the lower leg.",
    metadata: {
      anatomy_kind: "composite",
      hierarchy_level: "structure",
      region: "leg",
      pilot: COMPARTMENT_SYNDROME_PILOT_KEY,
    },
  },
  {
    slug: "anterior-compartment",
    entityType: "anatomy_structure",
    preferredLabel: "Anterior Compartment",
    description: "Anterior leg compartment containing dorsiflexor musculature.",
    metadata: { anatomy_kind: "compartment", hierarchy_level: "structure", region: "leg", pilot: COMPARTMENT_SYNDROME_PILOT_KEY },
  },
  {
    slug: "lateral-compartment",
    entityType: "anatomy_structure",
    preferredLabel: "Lateral Compartment",
    description: "Lateral leg compartment containing evertor musculature.",
    metadata: { anatomy_kind: "compartment", hierarchy_level: "structure", region: "leg", pilot: COMPARTMENT_SYNDROME_PILOT_KEY },
  },
  {
    slug: "deep-posterior-compartment",
    entityType: "anatomy_structure",
    preferredLabel: "Deep Posterior Compartment",
    description: "Deep posterior leg compartment containing flexor hallucis longus and tibialis posterior.",
    metadata: { anatomy_kind: "compartment", hierarchy_level: "structure", region: "leg", pilot: COMPARTMENT_SYNDROME_PILOT_KEY },
  },
  {
    slug: "superficial-posterior-compartment",
    entityType: "anatomy_structure",
    preferredLabel: "Superficial Posterior Compartment",
    description: "Superficial posterior leg compartment containing gastrocnemius and soleus.",
    metadata: { anatomy_kind: "compartment", hierarchy_level: "structure", region: "leg", pilot: COMPARTMENT_SYNDROME_PILOT_KEY },
  },
  {
    slug: "leg-fasciotomy",
    entityType: "procedure",
    preferredLabel: "Leg Fasciotomy",
    description: "Emergent surgical release of leg compartments to restore perfusion.",
    metadata: { pilot: COMPARTMENT_SYNDROME_PILOT_KEY },
  },
  {
    slug: "pain-with-passive-stretch",
    entityType: "exam_maneuver",
    preferredLabel: "Pain with Passive Stretch",
    description: "Early clinical sign of compartment ischemia on passive muscle stretch.",
    metadata: { pilot: COMPARTMENT_SYNDROME_PILOT_KEY },
  },
  {
    slug: "perfusion-pressure-concept",
    entityType: "biomechanics_concept",
    preferredLabel: "Perfusion Pressure Concept",
    description: "Delta pressure framework relating diastolic pressure to compartment pressure.",
    metadata: { pilot: COMPARTMENT_SYNDROME_PILOT_KEY },
  },
  {
    slug: "tibial-shaft-fracture",
    entityType: "condition",
    preferredLabel: "Tibial Shaft Fracture",
    description: "High-risk antecedent injury frequently associated with leg compartment syndrome.",
    metadata: { pilot: COMPARTMENT_SYNDROME_PILOT_KEY, link_role: "antecedent_risk" },
  },
  {
    slug: "muscle-necrosis",
    entityType: "complication",
    preferredLabel: "Muscle Necrosis",
    description: "Irreversible muscle injury from prolonged compartment ischemia.",
    metadata: { pilot: COMPARTMENT_SYNDROME_PILOT_KEY },
  },
  {
    slug: "volkmann-contracture",
    entityType: "complication",
    preferredLabel: "Volkmann Contracture",
    description: "Ischemic contracture after untreated compartment syndrome.",
    metadata: { pilot: COMPARTMENT_SYNDROME_PILOT_KEY },
  },
  {
    slug: "rhabdomyolysis",
    entityType: "complication",
    preferredLabel: "Rhabdomyolysis",
    description: "Muscle breakdown with systemic metabolic consequences after ischemia.",
    metadata: { pilot: COMPARTMENT_SYNDROME_PILOT_KEY },
  },
  {
    slug: "limb-amputation",
    entityType: "complication",
    preferredLabel: "Limb Amputation",
    description: "Catastrophic outcome after delayed fasciotomy and irreversible ischemia.",
    metadata: { pilot: COMPARTMENT_SYNDROME_PILOT_KEY },
  },
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const COMPARTMENT_SYNDROME_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("anterior-compartment", "part_of", "leg-compartment-complex", { anatomy_role: "essential", relevance_reason: "diagnosis" }),
  rel("lateral-compartment", "part_of", "leg-compartment-complex", { anatomy_role: "essential", relevance_reason: "diagnosis" }),
  rel("deep-posterior-compartment", "part_of", "leg-compartment-complex", { anatomy_role: "essential", relevance_reason: "diagnosis" }),
  rel("superficial-posterior-compartment", "part_of", "leg-compartment-complex", { anatomy_role: "essential", relevance_reason: "diagnosis" }),
  rel("leg-compartment-complex", "prerequisite_for", "compartment-syndrome", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("compartment-syndrome", "involves_anatomy", "leg-compartment-complex", {
    anatomy_role: "essential",
    relevance_reason: "compression",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("compartment-syndrome", "involves_anatomy", "anterior-compartment", {
    anatomy_role: "essential",
    relevance_reason: "compression",
    note: "compressed_in semantics via involves_anatomy until predicate registered",
  }),
  rel("compartment-syndrome", "involves_anatomy", "lateral-compartment", {
    anatomy_role: "essential",
    relevance_reason: "compression",
    note: "compressed_in semantics via involves_anatomy until predicate registered",
  }),
  rel("compartment-syndrome", "involves_anatomy", "deep-posterior-compartment", {
    anatomy_role: "essential",
    relevance_reason: "compression",
    note: "compressed_in semantics via involves_anatomy until predicate registered",
  }),
  rel("compartment-syndrome", "involves_anatomy", "superficial-posterior-compartment", {
    anatomy_role: "essential",
    relevance_reason: "compression",
    note: "compressed_in semantics via involves_anatomy until predicate registered",
  }),
  rel("compartment-syndrome", "tested_by", "pain-with-passive-stretch", {
    relevance_reason: "exam",
    management_importance: "high",
    clinical_importance: "high",
  }),
  rel("compartment-syndrome", "involves_anatomy", "perfusion-pressure-concept", {
    relevance_reason: "diagnosis",
    note: "biomechanics_concept linked via involves_anatomy",
  }),
  rel("compartment-syndrome", "treated_by", "leg-fasciotomy", {
    management_importance: "high",
    context_relevance: ["or", "call"],
    clinical_importance: "high",
  }),
  rel("tibial-shaft-fracture", "involves_anatomy", "leg-compartment-complex", {
    anatomy_role: "essential",
    relevance_reason: "compartment_risk",
    clinical_importance: "high",
    context_relevance: ["call"],
  }),
  rel("leg-fasciotomy", "involves_anatomy", "anterior-compartment", { anatomy_role: "essential", relevance_reason: "approach", context_relevance: ["or"] }),
  rel("leg-fasciotomy", "involves_anatomy", "lateral-compartment", { anatomy_role: "essential", relevance_reason: "approach", context_relevance: ["or"] }),
  rel("leg-fasciotomy", "involves_anatomy", "deep-posterior-compartment", { anatomy_role: "essential", relevance_reason: "approach", context_relevance: ["or"] }),
  rel("leg-fasciotomy", "involves_anatomy", "superficial-posterior-compartment", { anatomy_role: "essential", relevance_reason: "approach", context_relevance: ["or"] }),
  rel("compartment-syndrome", "has_complication", "muscle-necrosis"),
  rel("compartment-syndrome", "has_complication", "volkmann-contracture"),
  rel("compartment-syndrome", "has_complication", "rhabdomyolysis"),
  rel("compartment-syndrome", "has_complication", "limb-amputation"),
];

export function activeCompartmentSyndromeRelationships(): PilotRelationshipSpec[] {
  return COMPARTMENT_SYNDROME_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const COMPARTMENT_SYNDROME_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-cs-clinical-diagnosis",
    claimType: "fact",
    claimText:
      "Compartment syndrome is a clinical diagnosis where escalating pain, tense compartments, and pain with passive stretch outweigh waiting for confirmatory imaging.",
    primaryEntitySlug: "compartment-syndrome",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.mustKnow + oneLiner",
    contextRelevance: ["call", "or"],
  },
  {
    draftId: "claim-cs-pulses-unreliable",
    claimType: "board_trap",
    claimText: "Pulselessness is a late finding — do not exclude compartment syndrome when distal pulses are still present.",
    primaryEntitySlug: "compartment-syndrome",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.boardPearls",
    contextRelevance: ["call", "oite"],
  },
  {
    draftId: "claim-cs-passive-stretch",
    claimType: "fact",
    claimText: "Pain with passive stretch of involved musculature is an earlier and more useful sign than absent pulses.",
    primaryEntitySlug: "pain-with-passive-stretch",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.boardPearls",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-cs-four-compartments",
    claimType: "anatomy_pearl",
    claimText: "Leg compartment syndrome requires understanding all four osteofascial compartments — anterior, lateral, deep posterior, and superficial posterior.",
    primaryEntitySlug: "leg-compartment-complex",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.anatomyFocus + deep.anatomy",
    contextRelevance: ["or", "call"],
  },
  {
    draftId: "claim-cs-imaging-delay-trap",
    claimType: "cognitive_trap",
    claimText: "Delaying fasciotomy to obtain imaging or pressure measurements when the clinical picture is evolving.",
    primaryEntitySlug: "compartment-syndrome",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.imaging + fast.orSurvivalTips",
    contextRelevance: ["call"],
  },
  {
    draftId: "claim-cs-pressure-adjunct",
    claimType: "imaging_point",
    claimText: "Compartment pressure measurements are adjuncts only — they should not delay treatment when clinical suspicion is high.",
    primaryEntitySlug: "perfusion-pressure-concept",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.pimpQuestions + deep.imaging",
    contextRelevance: ["call"],
  },
  {
    draftId: "claim-cs-escalation-language",
    claimType: "clinical_script",
    claimText: "On consult, state time-sensitive limb emergency, repeat compartment exam, loosen dressings, and escalate for emergent fasciotomy.",
    primaryEntitySlug: "compartment-syndrome",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.caseSteps",
    contextRelevance: ["call", "or"],
  },
];

export const COMPARTMENT_SYNDROME_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-cs-emergent-fasciotomy",
    subjectEntitySlug: "compartment-syndrome",
    patternType: "emergent_intervention",
    trigger: "Escalating pain out of proportion, tense compartments, pain with passive stretch, or evolving neurovascular deficit",
    action: "Proceed with emergent leg fasciotomy — do not delay for imaging when clinical suspicion is high",
    urgency: "emergent",
    safetyCriticality: "emergency",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.decisionMaking + treatmentOptions",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-cs-pressure-measurement-adjunct",
    subjectEntitySlug: "compartment-syndrome",
    patternType: "diagnostic_adjunct",
    trigger: "Equivocal exam in obtunded patient or unreliable exam conditions",
    action: "Measure compartment pressures as adjunct; maintain low threshold for fasciotomy if trending abnormal",
    urgency: "urgent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.pimpQuestions + deep.decisionMaking",
    requiresAttendingReview: true,
  },
];

export function compartmentSyndromeSlugToEntityMap(): Map<string, PilotEntitySpec> {
  return new Map(COMPARTMENT_SYNDROME_ENTITIES.map((e) => [e.slug, e]));
}