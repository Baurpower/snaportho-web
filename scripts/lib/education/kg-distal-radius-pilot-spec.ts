/**
 * Distal radius fracture knowledge neighborhood — enriched pilot specification.
 * Shared anatomy owner for the Hand & Wrist Prepare Curriculum Cluster.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  HAND_WRIST_SHARED_ANATOMY_ENTITIES,
  HAND_WRIST_SHARED_ANATOMY_RELATIONSHIPS,
} from "./kg-hand-wrist-shared-anatomy.ts";

export const DISTAL_RADIUS_PILOT_KEY = "distal-radius-fracture-neighborhood" as const;

export const DISTAL_RADIUS_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-distal-radius-fractures",
  prepareTopicId: "distal-radius-fracture",
  casePrepSlug: "distal-radius-orif",
  legacyRetargetProposalKey: "retarget:trauma-distal-radius-fractures",
} as const;

export const DISTAL_RADIUS_ASSET_COUNTS = {
  ankiCardMappings: 0,
  orthobulletsQuestionMappings: 41,
} as const;

const DISTAL_RADIUS_SPECIFIC: PilotEntitySpec[] = [
  {
    slug: "distal-radius-fracture",
    entityType: "condition",
    preferredLabel: "Distal Radius Fracture",
    description: "Fracture of the distal radius and wrist articular region.",
    metadata: { clinical_kind: "fracture", pilot: DISTAL_RADIUS_PILOT_KEY, maturity_target: 6, cluster: "hand-wrist" },
  },
  {
    slug: "dorsal-comminution",
    entityType: "imaging_finding",
    preferredLabel: "Dorsal Comminution",
    description: "Dorsal metaphyseal comminution suggesting instability after reduction.",
    metadata: { pilot: DISTAL_RADIUS_PILOT_KEY },
  },
  {
    slug: "radial-height-loss",
    entityType: "imaging_finding",
    preferredLabel: "Radial Height Loss",
    description: "Loss of radial length on wrist radiographs affecting alignment goals.",
    metadata: { pilot: DISTAL_RADIUS_PILOT_KEY },
  },
  {
    slug: "volar-approach",
    entityType: "surgical_approach",
    preferredLabel: "Volar Approach",
    description: "Volar FCR interval approach to the distal radius.",
    metadata: { pilot: DISTAL_RADIUS_PILOT_KEY },
  },
  {
    slug: "distal-radius-orif",
    entityType: "procedure",
    preferredLabel: "Distal Radius ORIF",
    description: "Open reduction and internal fixation of unstable distal radius fractures.",
    metadata: { pilot: DISTAL_RADIUS_PILOT_KEY },
  },
  {
    slug: "distal-radius-orif-fixation",
    entityType: "fixation_method",
    preferredLabel: "ORIF",
    description: "Operative fixation method for unstable distal radius patterns.",
    metadata: { pilot: DISTAL_RADIUS_PILOT_KEY },
  },
  {
    slug: "median-neuropathy",
    entityType: "complication",
    preferredLabel: "Median Neuropathy",
    description: "Median nerve dysfunction after fracture swelling or operative injury.",
    metadata: { pilot: DISTAL_RADIUS_PILOT_KEY },
  },
  {
    slug: "loss-of-reduction",
    entityType: "complication",
    preferredLabel: "Loss of Reduction",
    description: "Recurrent displacement after closed reduction and casting.",
    metadata: { pilot: DISTAL_RADIUS_PILOT_KEY },
  },
  {
    slug: "crps",
    entityType: "complication",
    preferredLabel: "CRPS",
    description: "Complex regional pain syndrome after wrist injury.",
    metadata: { pilot: DISTAL_RADIUS_PILOT_KEY },
  },
  {
    slug: "tendon-irritation",
    entityType: "complication",
    preferredLabel: "Tendon Irritation",
    description: "Flexor or extensor tendon irritation from prominent hardware.",
    metadata: { pilot: DISTAL_RADIUS_PILOT_KEY },
  },
];

const DISTAL_RADIUS_CROSS_REFS: PilotEntitySpec[] = [
  "druj-instability",
  "galeazzi-fracture",
  "essex-lopresti-injury",
  "carpal-instability",
].map((key) => ({
  slug: key,
  entityType: "condition",
  preferredLabel: key
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" "),
  description: `Cross-neighborhood reference stub for ${key}.`,
  metadata: {
    shared_reference: true,
    cross_neighborhood: true,
    owner_pilot: `${key}-neighborhood`,
    pilot: DISTAL_RADIUS_PILOT_KEY,
  },
}));

export const DISTAL_RADIUS_ENTITIES: PilotEntitySpec[] = [
  ...HAND_WRIST_SHARED_ANATOMY_ENTITIES.map((e) => ({
    ...e,
    metadata: { ...e.metadata, cluster_owner: DISTAL_RADIUS_PILOT_KEY },
  })),
  ...DISTAL_RADIUS_SPECIFIC,
  ...DISTAL_RADIUS_CROSS_REFS,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const DISTAL_RADIUS_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...HAND_WRIST_SHARED_ANATOMY_RELATIONSHIPS,
  rel("hand-wrist-anatomy-hub", "prerequisite_for", "distal-radius-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["clinic", "or"],
  }),
  rel("distal-radius-fracture", "injured_in", "distal-radius", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("distal-radius-fracture", "involves_anatomy", "druj", {
    anatomy_role: "essential",
    relevance_reason: "instability",
    management_importance: "high",
  }),
  rel("distal-radius-fracture", "involves_anatomy", "tfcc", {
    anatomy_role: "essential",
    relevance_reason: "ulnar_wrist",
    management_importance: "high",
  }),
  rel("distal-radius-fracture", "involves_anatomy", "hand-wrist-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("distal-radius-fracture", "at_risk_structure", "median-nerve", {
    anatomy_role: "essential",
    relevance_reason: "neurovascular_risk",
    context_relevance: ["clinic", "or", "call"],
    clinical_importance: "high",
  }),
  rel("distal-radius-fracture", "differential_for", "druj-instability", { cross_neighborhood: true, cluster: "hand-wrist" }),
  rel("distal-radius-fracture", "differential_for", "galeazzi-fracture", { cross_neighborhood: true, cluster: "hand-wrist" }),
  rel("distal-radius-fracture", "differential_for", "essex-lopresti-injury", { cross_neighborhood: true, cluster: "hand-wrist" }),
  rel("distal-radius-fracture", "differential_for", "carpal-instability", { cross_neighborhood: true, cluster: "hand-wrist" }),
  rel("distal-radius-fracture", "has_imaging_finding", "dorsal-comminution", {
    relevance_reason: "imaging",
    management_importance: "high",
    clinical_importance: "high",
  }),
  rel("distal-radius-fracture", "has_imaging_finding", "radial-height-loss", {
    relevance_reason: "imaging",
    management_importance: "high",
  }),
  rel("dorsal-comminution", "indicates_treatment", "distal-radius-orif", {
    management_importance: "high",
    confidence: 0.82,
    review_status: "needs_review",
  }),
  rel("radial-height-loss", "indicates_treatment", "distal-radius-orif", {
    management_importance: "high",
    confidence: 0.8,
    review_status: "needs_review",
  }),
  rel("distal-radius-fracture", "uses_fixation", "distal-radius-orif-fixation", {
    management_importance: "high",
    context_relevance: ["or", "clinic"],
  }),
  rel("distal-radius-fracture", "treated_by", "distal-radius-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("distal-radius-orif", "uses_approach", "volar-approach", {
    context_relevance: ["or"],
    management_importance: "high",
  }),
  rel("distal-radius-orif", "involves_anatomy", "distal-radius", {
    anatomy_role: "essential",
    relevance_reason: "approach",
    context_relevance: ["or"],
  }),
  rel("distal-radius-orif", "at_risk_structure", "median-nerve", {
    anatomy_role: "essential",
    relevance_reason: "neurovascular_risk",
    context_relevance: ["or"],
  }),
  rel("druj", "explains_instability", "distal-radius-fracture", {
    anatomy_role: "essential",
    relevance_reason: "instability",
    management_importance: "high",
  }),
  rel("distal-radius-fracture", "has_complication", "median-neuropathy"),
  rel("distal-radius-fracture", "has_complication", "loss-of-reduction"),
  rel("distal-radius-fracture", "has_complication", "crps"),
  rel("distal-radius-fracture", "has_complication", "tendon-irritation"),
];

export function activeDistalRadiusRelationships(): PilotRelationshipSpec[] {
  return DISTAL_RADIUS_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const DISTAL_RADIUS_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-dr-mechanism-nv",
    claimType: "fact",
    claimText:
      "Distal radius fracture management hinges on mechanism, alignment, median nerve exam, and appropriate immobilization choice.",
    primaryEntitySlug: "distal-radius-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.mustKnow",
    contextRelevance: ["clinic", "call"],
  },
  {
    draftId: "claim-dr-druj-trap",
    claimType: "board_trap",
    claimText: "DRUJ instability after distal radius fixation can be missed if ulnar-sided wrist exam is skipped.",
    primaryEntitySlug: "druj",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.anatomy + boardPearls synthesis",
    contextRelevance: ["clinic", "oite"],
  },
  {
    draftId: "claim-dr-dorsal-comminution",
    claimType: "imaging_point",
    claimText: "Dorsal comminution often signals instability and higher fixation likelihood after reduction.",
    primaryEntitySlug: "dorsal-comminution",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.pimpQuestions",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-dr-volar-cortex",
    claimType: "anatomy_pearl",
    claimText: "The volar cortex serves as a key reduction reference when restoring length and volar tilt.",
    primaryEntitySlug: "distal-radius",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.anatomy",
    contextRelevance: ["or", "clinic"],
  },
  {
    draftId: "claim-dr-malalignment-trap",
    claimType: "cognitive_trap",
    claimText: "Accepting malalignment in young or high-demand patients without reassessing instability criteria.",
    primaryEntitySlug: "distal-radius-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.boardPearls",
    contextRelevance: ["clinic", "oite"],
  },
  {
    draftId: "claim-dr-radiographic-params",
    claimType: "fact",
    claimText: "Radial height, inclination, and volar tilt language should anchor alignment discussions on wrist radiographs.",
    primaryEntitySlug: "radial-height-loss",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.orSurvivalTips + deep.imaging",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-dr-splint-plan",
    claimType: "clinical_script",
    claimText: "After reduction, document median nerve status, finger ROM, splint plan, and timing of post-reduction films.",
    primaryEntitySlug: "distal-radius-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts fast.caseSteps",
    contextRelevance: ["clinic", "call"],
  },
  {
    draftId: "claim-dr-shared-anatomy",
    claimType: "anatomy_pearl",
    claimText: "Hand-wrist shared anatomy hub links distal radius fractures to DRUJ, TFCC, scaphoid, and nerve compression neighborhoods.",
    primaryEntitySlug: "hand-wrist-anatomy-hub",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "hand-wrist-cluster enrichment",
    contextRelevance: ["clinic", "or"],
  },
];

export const DISTAL_RADIUS_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-dr-operative-fixation",
    subjectEntitySlug: "distal-radius-fracture",
    patternType: "operative_indication",
    trigger: "Unstable pattern with significant displacement, dorsal comminution, articular step-off, or failed closed reduction",
    action: "Proceed with operative fixation pathway (volar ORIF when indicated) with documented median nerve exam",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.decisionMaking + treatmentOptions",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-dr-nonoperative-cast",
    subjectEntitySlug: "distal-radius-fracture",
    patternType: "nonoperative_eligible",
    trigger: "Acceptable alignment after closed reduction in patient suitable for casting",
    action: "Splint/cast with protected motion plan, repeat radiographs, and median nerve surveillance",
    urgency: "routine",
    safetyCriticality: "none",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "curriculum-data.ts deep.treatmentOptions",
    requiresAttendingReview: true,
  },
];

export function distalRadiusSlugToEntityMap(): Map<string, PilotEntitySpec> {
  return new Map(DISTAL_RADIUS_ENTITIES.map((e) => [e.slug, e]));
}