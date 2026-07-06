/**
 * Factory for Hand & Wrist cluster pilot specifications.
 * Manufacturing seeds only — manufactured neighborhoods are the pipeline outputs.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import type { HandWristNeighborhoodDef } from "./kg-hand-wrist-cluster-definitions.ts";
import {
  COMPARTMENT_SYNDROME_REFERENCE_RELATIONSHIPS,
  HAND_WRIST_SHARED_ANATOMY_RELATIONSHIPS,
  HAND_WRIST_SHARED_ANATOMY_ENTITIES,
  sharedCompartmentSyndromeReference,
  sharedHandWristAnatomyEntitiesForSibling,
} from "./kg-hand-wrist-shared-anatomy.ts";

export type HandWristPilotSpec = {
  pilotKey: string;
  sourceIds: {
    curriculumNodeSlug: string;
    prepareTopicId: string;
    casePrepSlug?: string;
    legacyRetargetProposalKey: string;
  };
  assetCounts: { ankiCardMappings: number; orthobulletsQuestionMappings: number };
  entities: PilotEntitySpec[];
  relationships: PilotRelationshipSpec[];
  claimDrafts: PilotClaimDraft[];
  decisionPointDrafts: PilotDecisionPointDraft[];
};

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

function pilotKeyFor(def: HandWristNeighborhoodDef): string {
  return `${def.topicKey}-neighborhood`;
}

function buildExtraEntities(def: HandWristNeighborhoodDef, pilotKey: string): PilotEntitySpec[] {
  const slug = def.topicKey;
  const extras: PilotEntitySpec[] = [];
  const kinds = def.extraEntityKinds ?? [];

  if (kinds.includes("classification")) {
    extras.push({
      slug: `${slug}-classification`,
      entityType: "classification_system",
      preferredLabel: `${def.displayName} Classification`,
      description: `Classification framework for ${def.displayName.toLowerCase()} pattern recognition and management planning.`,
      metadata: { pilot: pilotKey },
    });
  }
  if (kinds.includes("imaging")) {
    extras.push({
      slug: `${slug}-key-imaging-finding`,
      entityType: "imaging_finding",
      preferredLabel: `${def.displayName} Key Imaging Finding`,
      description: `Characteristic imaging finding for ${def.displayName.toLowerCase()}.`,
      metadata: { pilot: pilotKey },
    });
  }
  if (kinds.includes("procedure")) {
    extras.push({
      slug: `${slug}-operative-treatment`,
      entityType: "procedure",
      preferredLabel: `${def.displayName} Operative Treatment`,
      description: `Operative management pathway for ${def.displayName.toLowerCase()} when nonoperative care is insufficient.`,
      metadata: { pilot: pilotKey },
    });
  }
  if (kinds.includes("complication")) {
    extras.push({
      slug: `${slug}-key-complication`,
      entityType: "complication",
      preferredLabel: `${def.displayName} Key Complication`,
      description: `Important complication to recognize after ${def.displayName.toLowerCase()}.`,
      metadata: { pilot: pilotKey },
    });
  }
  if (kinds.includes("treatment_principle")) {
    extras.push({
      slug: `${slug}-nonoperative-principle`,
      entityType: "treatment_principle",
      preferredLabel: `${def.displayName} Nonoperative Principle`,
      description: `Nonoperative management principle for ${def.displayName.toLowerCase()}.`,
      metadata: { pilot: pilotKey },
    });
  }

  return extras;
}

function crossNeighborhoodReferenceEntities(relatedKeys: string[], pilotKey: string): PilotEntitySpec[] {
  return relatedKeys.map((key) => ({
    slug: key,
    entityType: "condition",
    preferredLabel: key
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    description: `Cross-neighborhood reference stub for ${key} (owner: ${key}-neighborhood).`,
    metadata: {
      shared_reference: true,
      cross_neighborhood: true,
      owner_pilot: `${key}-neighborhood`,
      pilot: pilotKey,
    },
  }));
}

function buildConditionEntity(def: HandWristNeighborhoodDef, pilotKey: string): PilotEntitySpec {
  return {
    slug: def.topicKey,
    entityType: "condition",
    preferredLabel: def.displayName,
    description: `Prepare Hand rotation neighborhood for ${def.displayName} — ${def.categoryLabel}.`,
    metadata: { clinical_kind: def.clinicalKind, pilot: pilotKey, maturity_target: 6, cluster: "hand-wrist" },
  };
}

function buildAnatomyRelationships(def: HandWristNeighborhoodDef): PilotRelationshipSpec[] {
  const rels: PilotRelationshipSpec[] = [
    rel("hand-wrist-anatomy-hub", "prerequisite_for", def.topicKey, {
      anatomy_role: "essential",
      relevance_reason: "diagnosis",
      educational_importance: "high",
      context_relevance: ["clinic", "or", "call"],
    }),
  ];

  for (const anatomySlug of def.primaryAnatomySlugs) {
    rels.push(
      rel(def.topicKey, "involves_anatomy", anatomySlug, {
        anatomy_role: "essential",
        relevance_reason: "diagnosis",
        relationship_strength: "core",
        clinical_importance: "high",
      }),
      rel(def.topicKey, "injured_in", anatomySlug, {
        anatomy_role: "essential",
        relevance_reason: "anatomic_focus",
        clinical_importance: "high",
      })
    );
  }

  return rels;
}

function buildCrossNeighborhoodRelationships(def: HandWristNeighborhoodDef): PilotRelationshipSpec[] {
  return def.relatedTopicKeys.map((relatedKey) =>
    rel(def.topicKey, "differential_for", relatedKey, {
      cross_neighborhood: true,
      cluster: "hand-wrist",
      relevance_reason: "clinical_association",
      educational_importance: "high",
    })
  );
}

function buildClaims(def: HandWristNeighborhoodDef): PilotClaimDraft[] {
  const slug = def.topicKey;
  const anatomyList = def.primaryAnatomySlugs.slice(0, 3).join(", ");
  return [
    {
      draftId: `claim-${slug}-mechanism`,
      claimType: "fact",
      claimText: `${def.displayName} evaluation should anchor on mechanism, focused exam, and the anatomic structures most at risk (${anatomyList}).`,
      primaryEntitySlug: slug,
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: `hand-wrist-cluster-definitions.ts / ${def.category}`,
      contextRelevance: ["clinic", "call"],
    },
    {
      draftId: `claim-${slug}-board-trap`,
      claimType: "board_trap",
      claimText: `Missing ${def.primaryAnatomySlugs[0] ?? "key anatomy"} assessment in ${def.displayName.toLowerCase()} is a common board and OITE trap.`,
      primaryEntitySlug: def.primaryAnatomySlugs[0] ?? slug,
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "hand-wrist manufacturing seed",
      contextRelevance: ["oite", "clinic"],
    },
    {
      draftId: `claim-${slug}-anatomy-pearl`,
      claimType: "anatomy_pearl",
      claimText: `Shared hand-wrist anatomy (${anatomyList}) links ${def.displayName} to adjacent Prepare neighborhoods in the cluster graph.`,
      primaryEntitySlug: "hand-wrist-anatomy-hub",
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "hand-wrist-shared-anatomy.ts",
      contextRelevance: ["clinic", "or"],
    },
    {
      draftId: `claim-${slug}-cognitive-trap`,
      claimType: "cognitive_trap",
      claimText: `Treating ${def.displayName.toLowerCase()} in isolation without checking related wrist, tendon, or nerve neighborhoods in the cluster.`,
      primaryEntitySlug: slug,
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "cross-neighborhood connectivity requirement",
      contextRelevance: ["clinic", "oite"],
    },
    {
      draftId: `claim-${slug}-clinical-script`,
      claimType: "clinical_script",
      claimText: `Document neurovascular status, key anatomic structures (${anatomyList}), stability assessment, and escalation plan for ${def.displayName.toLowerCase()}.`,
      primaryEntitySlug: slug,
      importanceLevel: "L2",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "Prepare Hand rotation script",
      contextRelevance: ["clinic", "call"],
    },
    {
      draftId: `claim-${slug}-imaging`,
      claimType: "imaging_point",
      claimText: `Obtain appropriate hand/wrist imaging for ${def.displayName.toLowerCase()} and explicitly comment on articular alignment and adjacent joint stability.`,
      primaryEntitySlug: slug,
      importanceLevel: "L2",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "hand-wrist manufacturing seed",
      contextRelevance: ["clinic"],
    },
    {
      draftId: `claim-${slug}-rehab`,
      claimType: "rehab_pearl",
      claimText: `Early protected motion and therapy goals for ${def.displayName.toLowerCase()} should align with tendon, ligament, and joint stability constraints.`,
      primaryEntitySlug: slug,
      importanceLevel: "L2",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "Prepare Hand rehabilitation concept",
      contextRelevance: ["clinic"],
    },
  ];
}

function buildDecisionPoints(def: HandWristNeighborhoodDef): PilotDecisionPointDraft[] {
  const slug = def.topicKey;
  const isEmergency =
    def.category === "infection-emergency" ||
    def.clinicalKind === "emergency" ||
    def.clinicalKind === "infection";
  const isOperative =
    def.extraEntityKinds?.includes("procedure") ||
    def.clinicalKind === "fracture" ||
    def.clinicalKind === "fracture_dislocation" ||
    def.clinicalKind === "dislocation" ||
    def.clinicalKind === "tendon_injury";

  const dps: PilotDecisionPointDraft[] = [];

  if (isEmergency) {
    dps.push({
      draftId: `dp-${slug}-emergency`,
      subjectEntitySlug: slug,
      patternType: "emergency_treatment",
      trigger: `Kanavel signs, rapidly progressive swelling, neurovascular compromise, or systemic toxicity in ${def.displayName.toLowerCase()}`,
      action: "Urgent operative drainage, escalation, and broad-spectrum antibiotics per attending protocol; document neurovascular status serially",
      urgency: "emergent",
      safetyCriticality: "emergency",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "infection-emergency routing → ATTENDING_REVIEW",
      requiresAttendingReview: true,
    });
  }

  if (isOperative) {
    dps.push({
      draftId: `dp-${slug}-operative`,
      subjectEntitySlug: slug,
      patternType: "operative_indication",
      trigger: `Unstable pattern, displacement, failed closed treatment, or functional deficit in ${def.displayName.toLowerCase()}`,
      action: "Proceed with operative pathway when indicated; document fixation strategy, tendon/nerve protection, and postoperative plan",
      urgency: "urgent",
      safetyCriticality: "moderate",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "operative routing → ATTENDING_REVIEW",
      requiresAttendingReview: true,
    });
  }

  dps.push({
    draftId: `dp-${slug}-nonoperative`,
    subjectEntitySlug: slug,
    patternType: "nonoperative_eligible",
    trigger: `Stable pattern with acceptable alignment and intact neurovascular exam for ${def.displayName.toLowerCase()}`,
    action: "Splint/immobilize with therapy plan, repeat exam and imaging, and clear return precautions",
    urgency: "routine",
    safetyCriticality: "none",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "Prepare Hand nonoperative pathway",
    requiresAttendingReview: true,
  });

  return dps;
}

export function buildHandWristPilotSpec(def: HandWristNeighborhoodDef): HandWristPilotSpec {
  const pilotKey = pilotKeyFor(def);
  const condition = buildConditionEntity(def, pilotKey);
  const extras = buildExtraEntities(def, pilotKey);
  const crossRefs = crossNeighborhoodReferenceEntities(
    def.relatedTopicKeys.filter((k) => k !== def.topicKey),
    pilotKey
  );

  let entities: PilotEntitySpec[];
  let relationships: PilotRelationshipSpec[];

  if (def.isSharedAnatomyOwner) {
    entities = [
      ...HAND_WRIST_SHARED_ANATOMY_ENTITIES.map((e) => ({
        ...e,
        metadata: { ...e.metadata, cluster_owner: pilotKey },
      })),
      condition,
      ...extras,
      ...crossRefs,
    ];
    relationships = [
      ...HAND_WRIST_SHARED_ANATOMY_RELATIONSHIPS,
      ...buildAnatomyRelationships(def),
      ...buildCrossNeighborhoodRelationships(def),
    ];
  } else {
    entities = [...sharedHandWristAnatomyEntitiesForSibling(pilotKey), condition, ...extras, ...crossRefs];
    if (def.crossClusterRefs?.includes("compartment-syndrome")) {
      entities.push(...sharedCompartmentSyndromeReference(pilotKey));
    }
    relationships = [
      ...HAND_WRIST_SHARED_ANATOMY_RELATIONSHIPS,
      ...buildAnatomyRelationships(def),
      ...buildCrossNeighborhoodRelationships(def),
    ];
    if (def.crossClusterRefs?.includes("compartment-syndrome")) {
      relationships.push(...COMPARTMENT_SYNDROME_REFERENCE_RELATIONSHIPS);
    }
  }

  // Link extras to condition
  for (const extra of extras) {
    if (extra.entityType === "imaging_finding") {
      relationships.push(
        rel(def.topicKey, "has_imaging_finding", extra.slug, {
          relevance_reason: "imaging",
          management_importance: "high",
        })
      );
    }
    if (extra.entityType === "procedure") {
      relationships.push(
        rel(def.topicKey, "treated_by", extra.slug, {
          management_importance: "high",
          context_relevance: ["or"],
          review_status: "needs_review",
        })
      );
      if (def.extraEntityKinds?.includes("imaging")) {
        relationships.push(
          rel(`${def.topicKey}-key-imaging-finding`, "indicates_treatment", extra.slug, {
            management_importance: "high",
            confidence: 0.78,
            review_status: "needs_review",
          })
        );
      }
    }
    if (extra.entityType === "complication") {
      relationships.push(rel(def.topicKey, "has_complication", extra.slug));
    }
  }

  // At-risk nerve structures for nerve compression topics
  if (def.clinicalKind === "nerve_compression") {
    for (const nerveSlug of def.primaryAnatomySlugs.filter((s) => s.includes("nerve") || s === "carpal-tunnel" || s === "guyon-canal")) {
      relationships.push(
        rel(def.topicKey, "at_risk_structure", nerveSlug.includes("nerve") ? nerveSlug : "median-nerve", {
          anatomy_role: "essential",
          relevance_reason: "neurovascular_risk",
          clinical_importance: "high",
          context_relevance: ["clinic", "or"],
        })
      );
    }
  }

  return {
    pilotKey,
    sourceIds: {
      curriculumNodeSlug: def.curriculumNodeSlug,
      prepareTopicId: def.prepareTopicId,
      casePrepSlug: def.casePrepSlug,
      legacyRetargetProposalKey: `retarget:${def.curriculumNodeSlug}`,
    },
    assetCounts: {
      ankiCardMappings: def.ankiCardMappings,
      orthobulletsQuestionMappings: def.orthobulletsQuestionMappings,
    },
    entities,
    relationships: relationships.filter((r) => !r.metadata?.disabled),
    claimDrafts: buildClaims(def),
    decisionPointDrafts: buildDecisionPoints(def),
  };
}

export function activeHandWristRelationships(spec: HandWristPilotSpec): PilotRelationshipSpec[] {
  return spec.relationships.filter((r) => !r.metadata?.disabled);
}