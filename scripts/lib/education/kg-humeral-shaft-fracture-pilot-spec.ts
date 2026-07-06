/**
 * Humeral shaft fracture knowledge neighborhood — manufacturing seed.
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

export const HUMERAL_SHAFT_PILOT_KEY = "humeral-shaft-fracture-neighborhood" as const;

export const HUMERAL_SHAFT_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-humeral-shaft-fractures",
  prepareTopicId: "humeral-shaft-fracture",
  legacyRetargetProposalKey: "retarget:trauma-humeral-shaft-fractures",
} as const;

export const HUMERAL_SHAFT_ASSET_COUNTS = {
  ankiCardMappings: 10,
  orthobulletsQuestionMappings: 47,
} as const;

const HS_SPECIFIC: PilotEntitySpec[] = [
  {
    slug: "humeral-shaft-fracture",
    entityType: "condition",
    preferredLabel: "Humeral Shaft Fracture",
    description: "Diaphyseal humerus fracture with radial nerve risk in spiral distal-third patterns.",
    metadata: { clinical_kind: "fracture", pilot: HUMERAL_SHAFT_PILOT_KEY, maturity_target: 6 },
  },
  {
    slug: "humeral-im-nailing",
    entityType: "procedure",
    preferredLabel: "Humeral IM Nailing",
    description: "Intramedullary nailing for unstable humeral shaft fracture patterns.",
    metadata: { pilot: HUMERAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "humeral-plate-osteosynthesis",
    entityType: "procedure",
    preferredLabel: "Humeral Plate Osteosynthesis",
    description: "Open plating for humeral shaft fractures when nailing is unsuitable.",
    metadata: { pilot: HUMERAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "holstein-lewis-fracture",
    entityType: "imaging_finding",
    preferredLabel: "Holstein-Lewis Fracture",
    description: "Spiral distal-third humeral shaft fracture pattern associated with radial nerve injury.",
    metadata: { pilot: HUMERAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "radial-nerve-palsy",
    entityType: "complication",
    preferredLabel: "Radial Nerve Palsy",
    description: "Wrist drop or posterior interosseous dysfunction after humeral shaft injury.",
    metadata: { pilot: HUMERAL_SHAFT_PILOT_KEY },
  },
  {
    slug: "humeral-shaft-nonunion",
    entityType: "complication",
    preferredLabel: "Humeral Shaft Nonunion",
    description: "Failure of humeral diaphyseal fracture healing.",
    metadata: { pilot: HUMERAL_SHAFT_PILOT_KEY },
  },
];

export const HUMERAL_SHAFT_ENTITIES: PilotEntitySpec[] = [
  ...sharedUeAnatomyEntitiesForSibling(HUMERAL_SHAFT_PILOT_KEY),
  ...HS_SPECIFIC,
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const HUMERAL_SHAFT_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...UE_SHARED_ANATOMY_RELATIONSHIPS,
  rel("upper-extremity-trauma-anatomy-hub", "prerequisite_for", "humeral-shaft-fracture", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    educational_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("humeral-shaft-fracture", "injured_in", "humeral-shaft", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
    clinical_importance: "high",
  }),
  rel("humeral-shaft-fracture", "involves_anatomy", "upper-extremity-trauma-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "diagnosis",
    relationship_strength: "core",
  }),
  rel("humeral-shaft-fracture", "at_risk_structure", "radial-nerve", {
    anatomy_role: "essential",
    relevance_reason: "spiral_groove",
    clinical_importance: "high",
    context_relevance: ["call", "or"],
  }),
  rel("humeral-shaft-fracture", "at_risk_structure", "brachial-artery", {
    anatomy_role: "supporting",
    relevance_reason: "vascular",
    clinical_importance: "moderate",
    context_relevance: ["call"],
  }),
  rel("humeral-shaft-fracture", "has_imaging_finding", "holstein-lewis-fracture", {
    relevance_reason: "nerve_risk",
    management_importance: "high",
  }),
  rel("holstein-lewis-fracture", "indicates_treatment", "humeral-plate-osteosynthesis", {
    management_importance: "high",
    confidence: 0.7,
    review_status: "needs_review",
    note: "operative strategy and nerve exploration attending-dependent",
  }),
  rel("humeral-shaft-fracture", "treated_by", "humeral-im-nailing", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("humeral-shaft-fracture", "treated_by", "humeral-plate-osteosynthesis", {
    management_importance: "high",
    context_relevance: ["or"],
  }),
  rel("humeral-im-nailing", "involves_anatomy", "humeral-shaft", {
    anatomy_role: "essential",
    relevance_reason: "implant_path",
    context_relevance: ["or"],
  }),
  rel("humeral-plate-osteosynthesis", "at_risk_structure", "radial-nerve", {
    anatomy_role: "essential",
    relevance_reason: "posterior_approach",
    clinical_importance: "high",
    context_relevance: ["or"],
  }),
  rel("humeral-shaft-fracture", "has_complication", "radial-nerve-palsy"),
  rel("humeral-shaft-fracture", "has_complication", "humeral-shaft-nonunion"),
  rel("holstein-lewis-fracture", "explains_instability", "humeral-shaft-fracture", {
    management_importance: "high",
    confidence: 0.75,
  }),
];

export function activeHumeralShaftRelationships(): PilotRelationshipSpec[] {
  return HUMERAL_SHAFT_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const HUMERAL_SHAFT_CLAIM_DRAFTS: PilotClaimDraft[] = [
  {
    draftId: "claim-hs-radial-nerve-exam",
    claimType: "fact",
    claimText: "Document wrist extension and finger extension at presentation and after reduction of humeral shaft fractures.",
    primaryEntitySlug: "humeral-shaft-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "trauma-humeral-shaft-fractures curriculum",
    contextRelevance: ["call"],
  },
  {
    draftId: "claim-hs-holstein-lewis",
    claimType: "board_trap",
    claimText: "Holstein-Lewis spiral distal-third humeral shaft fractures are classic radial nerve injury associations on boards.",
    primaryEntitySlug: "holstein-lewis-fracture",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "humeral shaft board pearls",
    contextRelevance: ["oite"],
  },
  {
    draftId: "claim-hs-radial-trap",
    claimType: "cognitive_trap",
    claimText: "Missing a new radial nerve deficit after closed reduction of a humeral shaft fracture.",
    primaryEntitySlug: "radial-nerve",
    importanceLevel: "L1",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "humeral shaft neurovascular traps",
    contextRelevance: ["call"],
  },
  {
    draftId: "claim-hs-nailing-default",
    claimType: "fact",
    claimText: "Intramedullary nailing is a common operative answer for unstable humeral shaft fracture patterns.",
    primaryEntitySlug: "humeral-im-nailing",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "humeral shaft treatment patterns",
    contextRelevance: ["or"],
  },
  {
    draftId: "claim-hs-case-script",
    claimType: "clinical_script",
    claimText: "Present mechanism, alignment, radial nerve exam, brachial pulse, splint plan, and operative versus nonoperative pathway.",
    primaryEntitySlug: "humeral-shaft-fracture",
    importanceLevel: "L2",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "humeral shaft case script",
    contextRelevance: ["call", "clinic"],
  },
];

export const HUMERAL_SHAFT_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "dp-hs-operative-nail",
    subjectEntitySlug: "humeral-shaft-fracture",
    patternType: "operative_indication",
    trigger: "Unstable humeral shaft alignment, open fracture, or pathologic pattern needing rigid fixation",
    action: "Proceed with operative stabilization pathway (typically IM nail when suitable) with documented nerve exam",
    urgency: "urgent",
    safetyCriticality: "moderate",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "humeral shaft operative defaults",
    requiresAttendingReview: true,
  },
  {
    draftId: "dp-hs-radial-nerve-deficit",
    subjectEntitySlug: "humeral-shaft-fracture",
    patternType: "operative_indication",
    trigger: "New radial nerve deficit after closed reduction or Holstein-Lewis pattern with progressive deficit",
    action: "Escalate to attending for exploration versus observation strategy with repeat neuro exam",
    urgency: "urgent",
    safetyCriticality: "high",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "radial nerve management pathways",
    requiresAttendingReview: true,
  },
];