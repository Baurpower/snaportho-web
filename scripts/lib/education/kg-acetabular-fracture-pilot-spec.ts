/**
 * Acetabular fracture knowledge neighborhood — manufacturing seed.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import { HIP_SHARED_ANATOMY_RELATIONSHIPS } from "./kg-hip-shared-anatomy.ts";
import {
  LE_SHARED_ANATOMY_RELATIONSHIPS,
  sharedHipAnatomyForLeSibling,
  sharedLeAnatomyEntitiesForSibling,
} from "./kg-lower-extremity-shared-anatomy.ts";

export const ACETABULAR_FRACTURE_PILOT_KEY = "acetabular-fracture-neighborhood" as const;

export const ACETABULAR_FRACTURE_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-acetabular-fractures",
  prepareTopicId: "acetabular-fracture",
  legacyRetargetProposalKey: "retarget:trauma-acetabular-fractures",
} as const;

export const ACETABULAR_FRACTURE_ASSET_COUNTS = {
  ankiCardMappings: 24,
  orthobulletsQuestionMappings: 74,
} as const;

const ACETABULAR_SPECIFIC: PilotEntitySpec[] = [
  {
    slug: "acetabular-fracture",
    entityType: "condition",
    preferredLabel: "Acetabular Fracture",
    description: "Intra-articular hip socket fracture with column, wall, and congruity concerns.",
    metadata: { clinical_kind: "fracture", pilot: ACETABULAR_FRACTURE_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "judet-letournel-classification",
    entityType: "classification_system",
    preferredLabel: "Judet-Letournel Classification",
    description: "Column-and-wall acetabular fracture classification framework.",
    metadata: { pilot: ACETABULAR_FRACTURE_PILOT_KEY },
  },
  {
    slug: "posterior-wall-acetabular-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Posterior Wall Acetabular Fracture",
    description: "Posterior wall fragment pattern with hip instability risk after injury.",
    metadata: { pilot: ACETABULAR_FRACTURE_PILOT_KEY },
  },
  {
    slug: "acetabular-orif",
    entityType: "procedure",
    preferredLabel: "Acetabular ORIF",
    description: "Open reduction internal fixation of displaced acetabular fracture.",
    metadata: { pilot: ACETABULAR_FRACTURE_PILOT_KEY },
  },
  {
    slug: "acetabular-post-traumatic-arthritis",
    entityType: "complication",
    preferredLabel: "Acetabular Post-Traumatic Arthritis",
    description: "Degenerative hip arthritis after acetabular malunion or articular incongruity.",
    metadata: { pilot: ACETABULAR_FRACTURE_PILOT_KEY },
  },
];

export const ACETABULAR_FRACTURE_ENTITIES: PilotEntitySpec[] = [
  ...sharedLeAnatomyEntitiesForSibling(ACETABULAR_FRACTURE_PILOT_KEY),
  ...sharedHipAnatomyForLeSibling(ACETABULAR_FRACTURE_PILOT_KEY),
  ...ACETABULAR_SPECIFIC,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const ACETABULAR_FRACTURE_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...LE_SHARED_ANATOMY_RELATIONSHIPS,
  ...HIP_SHARED_ANATOMY_RELATIONSHIPS,
  rel("lower-extremity-trauma-anatomy-hub", "prerequisite_for", "acetabular-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("acetabular-fracture", "injured_in", "acetabulum", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("acetabular-fracture", "involves_anatomy", "femoral-head", {
    anatomy_role: "essential",
    relevance_reason: "congruity",
    clinical_importance: "high",
  }),
  rel("acetabular-fracture", "involves_anatomy", "iliac-wing", {
    anatomy_role: "essential",
    relevance_reason: "column",
    clinical_importance: "high",
  }),
  rel("acetabular-fracture", "involves_anatomy", "lower-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("femoral-head", "articulates_with", "acetabulum", {
    anatomy_role: "essential",
    relevance_reason: "hip_joint",
    clinical_importance: "high",
  }),
  rel("acetabular-fracture", "has_imaging_finding", "posterior-wall-acetabular-fracture", {
    relevance_reason: "instability",
    management_importance: "high",
  }),
  rel("posterior-wall-acetabular-fracture", "indicates_treatment", "acetabular-orif", {
    management_importance: "high",
    confidence: 0.8,
    review_status: "needs_review",
    note: "displacement and instability dependent",
  }),
  rel("acetabular-fracture", "treated_by", "acetabular-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("acetabular-orif", "involves_anatomy", "acetabulum", {
    anatomy_role: "essential",
    relevance_reason: "approach",
    context_relevance: ["or"],
  }),
  rel("acetabular-fracture", "has_classification", "judet-letournel-classification", {
    educational_importance: "high",
    context_relevance: ["clinic", "oite"],
  }),
  rel("acetabular-fracture", "has_complication", "acetabular-post-traumatic-arthritis"),
  rel("posterior-wall-acetabular-fracture", "explains_instability", "acetabular-fracture", {
    management_importance: "high",
    confidence: 0.85,
  }),
];

export function activeAcetabularFractureRelationships(): PilotRelationshipSpec[] {
  return ACETABULAR_FRACTURE_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const ACETABULAR_FRACTURE_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-acet-column-wall",
    claimType: "fact",
    claimText: "Acetabular fractures are classified and managed by column-and-wall patterns with articular reduction and hip congruity goals.",
    primaryEntitySlug: "acetabular-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "trauma-acetabular-fractures curriculum",
    contextRelevance: ["call", "or"],
  },
  {
    draftId: "claim-acet-posterior-wall-trap",
    claimType: "board_trap",
    claimText: "Posterior wall acetabular fractures can present with subtle instability and are operative problems when hip subluxation risk is present.",
    primaryEntitySlug: "posterior-wall-acetabular-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "acetabular board pearls",
    contextRelevance: ["oite", "or"],
  },
  {
    draftId: "claim-acet-nonoperative-displaced",
    claimType: "cognitive_trap",
    claimText: "Treating displaced intra-articular acetabular fractures as stable injuries without column, wall, and congruity assessment.",
    primaryEntitySlug: "acetabular-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "acetabular decision-making pitfalls",
    contextRelevance: ["or"],
  },
  {
    draftId: "claim-acet-case-script",
    claimType: "clinical_script",
    claimText: "Describe fracture pattern, hip stability exam, column-wall language, surgical approach plan, and post-traumatic arthritis counseling.",
    primaryEntitySlug: "acetabular-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "acetabular case presentation pattern",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-acet-femoral-head-congruity",
    claimType: "anatomy_pearl",
    claimText: "Femoral head-acetabulum congruity after reduction is the central determinant of long-term hip function after acetabular fracture.",
    primaryEntitySlug: "femoral-head",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "acetabular anatomy and outcomes",
    contextRelevance: ["or", "oite"],
  },
];

export const ACETABULAR_FRACTURE_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-acet-posterior-wall-orif",
    subjectEntitySlug: "acetabular-fracture",
    patternType: "operative_indication",
    trigger: "Posterior wall acetabular fracture with hip instability or significant articular displacement",
    action: "Discuss acetabular ORIF with attending; document instability exam and congruity goals",
    urgency: "urgent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "acetabular operative indications",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-acet-displaced-orif",
    subjectEntitySlug: "acetabular-fracture",
    patternType: "operative_indication",
    trigger: "Displaced acetabular fracture with intra-articular step-off or column disruption",
    action: "Plan open reduction with column-specific approach per Judet-Letournel pattern and attending preference",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "acetabular ORIF pathway",
    requiresAttendingReview: true,
  },
];

export function acetabularFractureSlugToEntityMap(): Map<string, PilotEntitySpec> {
  return new Map(ACETABULAR_FRACTURE_ENTITIES.map((e) => [e.slug, e]));
}