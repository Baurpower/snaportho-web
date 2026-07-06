/**
 * Lisfranc injury knowledge neighborhood — manufacturing seed.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  LE_SHARED_ANATOMY_RELATIONSHIPS,
  sharedLeAnatomyEntitiesForSibling,
} from "./kg-lower-extremity-shared-anatomy.ts";

export const LISFRANC_PILOT_KEY = "lisfranc-injury-neighborhood" as const;

export const LISFRANC_SOURCE_IDS = {
  curriculumNodeSlug: "foot-ankle-lisfranc-injury",
  prepareTopicId: "lisfranc-injury",
  legacyRetargetProposalKey: "retarget:foot-ankle-lisfranc-injury",
} as const;

export const LISFRANC_ASSET_COUNTS = {
  ankiCardMappings: 0,
  orthobulletsQuestionMappings: 34,
} as const;

const LISFRANC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "lisfranc-injury",
    entityType: "condition",
    preferredLabel: "Lisfranc Injury",
    description: "Tarsometatarsal ligamentous and osseous disruption threatening midfoot stability.",
    metadata: { clinical_kind: "ligamentous_injury", pilot: LISFRANC_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "lisfranc-displacement",
    entityType: "imaging_finding",
    preferredLabel: "Lisfranc Displacement",
    description: "Radiographic tarsometatarsal diastasis or instability on weight-bearing views.",
    metadata: { pilot: LISFRANC_PILOT_KEY },
  },
  {
    slug: "lisfranc-orif",
    entityType: "procedure",
    preferredLabel: "Lisfranc ORIF",
    description: "Open reduction internal fixation of unstable Lisfranc injury.",
    metadata: { pilot: LISFRANC_PILOT_KEY },
  },
  {
    slug: "lisfranc-chronic-instability",
    entityType: "complication",
    preferredLabel: "Lisfranc Chronic Instability",
    description: "Persistent midfoot collapse and pain after inadequately treated Lisfranc injury.",
    metadata: { pilot: LISFRANC_PILOT_KEY },
  },
  {
    slug: "lisfranc-nonoperative-immobilization",
    entityType: "treatment_principle",
    preferredLabel: "Lisfranc Nonoperative Immobilization",
    description: "Protected weight-bearing and immobilization for stable nondisplaced Lisfranc patterns.",
    metadata: { pilot: LISFRANC_PILOT_KEY },
  },
];

export const LISFRANC_ENTITIES: PilotEntitySpec[] = [
  ...sharedLeAnatomyEntitiesForSibling(LISFRANC_PILOT_KEY),
  ...LISFRANC_SPECIFIC_ENTITIES,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const LISFRANC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...LE_SHARED_ANATOMY_RELATIONSHIPS,
  rel("lower-extremity-trauma-anatomy-hub", "prerequisite_for", "lisfranc-injury", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("lisfranc-injury", "injured_in", "lisfranc-joint", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("lisfranc-injury", "involves_anatomy", "midfoot", {
    anatomy_role: "essential",
    relevance_reason: "arch_stability",
    clinical_importance: "high",
  }),
  rel("lisfranc-injury", "involves_anatomy", "lower-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("lisfranc-injury", "has_imaging_finding", "lisfranc-displacement", {
    relevance_reason: "instability",
    management_importance: "high",
  }),
  rel("lisfranc-displacement", "indicates_treatment", "lisfranc-orif", {
    management_importance: "high",
    confidence: 0.85,
    review_status: "needs_review",
    note: "weight-bearing films and clinical exam confirm instability",
  }),
  rel("lisfranc-injury", "treated_by", "lisfranc-orif", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("lisfranc-injury", "treated_by", "lisfranc-nonoperative-immobilization", {
    management_importance: "high",
    context_relevance: ["clinic"],
  }),
  rel("lisfranc-orif", "involves_anatomy", "lisfranc-joint", {
    anatomy_role: "essential",
    relevance_reason: "reduction",
    context_relevance: ["or"],
  }),
  rel("lisfranc-injury", "has_complication", "lisfranc-chronic-instability"),
];

export function activeLisfrancRelationships(): PilotRelationshipSpec[] {
  return LISFRANC_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const LISFRANC_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-lisfranc-midfoot-stability",
    claimType: "fact",
    claimText: "Lisfranc injury threatens tarsometatarsal stability and midfoot arch integrity — missed diagnosis leads to chronic collapse.",
    primaryEntitySlug: "lisfranc-injury",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets foot-ankle-lisfranc-injury curriculum node",
    contextRelevance: ["call", "clinic"],
  },
  {
    draftId: "claim-lisfranc-weight-bearing-views",
    claimType: "anatomy_pearl",
    claimText: "Weight-bearing radiographs of the Lisfranc joint reveal diastasis that may be subtle on non-weight-bearing films.",
    primaryEntitySlug: "lisfranc-joint",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets foot-ankle-lisfranc-injury imaging",
    contextRelevance: ["clinic", "oite"],
  },
  {
    draftId: "claim-lisfranc-missed-sprain-trap",
    claimType: "board_trap",
    claimText: "Labeling midfoot pain after athletic or low-energy injury as a simple sprain without checking Lisfranc alignment.",
    primaryEntitySlug: "lisfranc-displacement",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets foot-ankle-lisfranc-injury board pearls",
    contextRelevance: ["oite", "call"],
  },
  {
    draftId: "claim-lisfranc-stable-nonop-trap",
    claimType: "cognitive_trap",
    claimText: "Operating on every Lisfranc injury without distinguishing stable nondisplaced patterns suitable for immobilization.",
    primaryEntitySlug: "lisfranc-injury",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets foot-ankle-lisfranc-injury decision making",
    contextRelevance: ["clinic"],
  },
  {
    draftId: "claim-lisfranc-case-script",
    claimType: "clinical_script",
    claimText: "Document mechanism, plantar ecchymosis, weight-bearing alignment, stability exam, and operative versus immobilization plan.",
    primaryEntitySlug: "lisfranc-injury",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets foot-ankle-lisfranc-injury case presentation",
    contextRelevance: ["call", "clinic"],
  },
];

export const LISFRANC_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-lisfranc-unstable-orif",
    subjectEntitySlug: "lisfranc-injury",
    patternType: "operative_indication",
    trigger: "Unstable Lisfranc injury with tarsometatarsal diastasis or clinical instability on exam",
    action: "Proceed with Lisfranc ORIF to restore midfoot column alignment; document postoperative protected weight-bearing",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets foot-ankle-lisfranc-injury treatment pathways",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-lisfranc-stable-immobilization",
    subjectEntitySlug: "lisfranc-injury",
    patternType: "operative_indication",
    trigger: "Nondisplaced stable Lisfranc injury without diastasis on weight-bearing views",
    action: "Apply Lisfranc nonoperative immobilization with protected weight-bearing and close follow-up for secondary displacement",
    urgency: "routine",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "orthobullets foot-ankle-lisfranc-injury nonoperative management",
    requiresAttendingReview: true,
  },
];