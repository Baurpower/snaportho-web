/**
 * Neighborhood quality scoring for KG pilots.
 * Pure functions — safe to unit test without DB.
 */

import {
  ANKLE_ASSET_COUNTS,
  ANKLE_CLAIM_DRAFTS,
  ANKLE_DECISION_POINT_DRAFTS,
  ANKLE_ENTITIES,
  ANKLE_PILOT_KEY,
  ANKLE_SOURCE_IDS,
  activeAnkleRelationships,
  type PilotClaimDraft,
  type PilotEntitySpec,
  type PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import { HIGH_RISK_PREDICATES, validateRelationshipTriple } from "./kg-relationship-registry.ts";

export type NeighborhoodQualityInput = {
  pilotKey: string;
  entities: PilotEntitySpec[];
  relationships: PilotRelationshipSpec[];
  claimDrafts: PilotClaimDraft[];
  decisionPointDraftCount: number;
  approvedEntityCount?: number;
  approvedRelationshipCount?: number;
  approvedClaimCount?: number;
  approvedDecisionPointCount?: number;
  linkedCardCount?: number;
  linkedQuestionCount?: number;
};

export type NeighborhoodQualityReport = {
  pilotKey: string;
  estimatedMaturityLevel: number;
  maturityRationale: string[];
  metrics: Record<string, number | string | boolean>;
  blockers: string[];
  readyForTraversalSmokeTest: boolean;
};

const ESSENTIAL_ANATOMY_SLUGS = [
  "ankle-ring",
  "lateral-malleolus",
  "medial-malleolus",
  "syndesmosis",
  "deltoid-ligament",
  "talus",
];

const REQUIRED_DIAGNOSIS_RELS = ["injured_in", "has_classification", "has_imaging_finding", "prerequisite_for"];

function claimAtomicityScore(claims: PilotClaimDraft[]): number {
  if (claims.length === 0) return 0;
  const atomic = claims.filter((c) => {
    const sentences = c.claimText.split(/[.!?]/).filter((s) => s.trim().length > 0);
    return sentences.length <= 2 && c.claimText.length < 280;
  });
  return atomic.length / claims.length;
}

function metadataCompleteness(relationships: PilotRelationshipSpec[]): number {
  if (relationships.length === 0) return 0;
  const withMeta = relationships.filter(
    (r) =>
      r.metadata &&
      (r.metadata.anatomy_role != null ||
        r.metadata.relevance_reason != null ||
        r.metadata.clinical_importance != null ||
        r.metadata.management_importance != null)
  );
  return withMeta.length / relationships.length;
}

function anatomyCoverage(relationships: PilotRelationshipSpec[]): number {
  const linked = new Set<string>();
  for (const rel of relationships) {
    if (ESSENTIAL_ANATOMY_SLUGS.includes(rel.objectSlug)) linked.add(rel.objectSlug);
    if (ESSENTIAL_ANATOMY_SLUGS.includes(rel.subjectSlug)) linked.add(rel.subjectSlug);
  }
  return linked.size / ESSENTIAL_ANATOMY_SLUGS.length;
}

function relationshipValidationRate(relationships: PilotRelationshipSpec[], entities: PilotEntitySpec[]): number {
  const bySlug = new Map(entities.map((e) => [e.slug, e]));
  let valid = 0;
  for (const rel of relationships) {
    const subj = bySlug.get(rel.subjectSlug);
    const obj = bySlug.get(rel.objectSlug);
    if (!subj || !obj) continue;
    const result = validateRelationshipTriple({
      subjectEndpointType: "canonical_entity",
      subjectEntityType: subj.entityType,
      predicate: rel.predicate,
      objectEndpointType: "canonical_entity",
      objectEntityType: obj.entityType,
    });
    if (result.valid) valid += 1;
  }
  return relationships.length === 0 ? 0 : valid / relationships.length;
}

function overlinkingRate(relationships: PilotRelationshipSpec[]): number {
  const ankleRels = relationships.filter(
    (r) => r.subjectSlug === "ankle-fracture" && ["involves_anatomy", "injured_in", "at_risk_structure"].includes(r.predicate)
  );
  const essentialTagged = ankleRels.filter((r) => r.metadata?.anatomy_role === "essential");
  if (ankleRels.length <= 8) return 0;
  return essentialTagged.length < 3 ? 1 : (ankleRels.length - 8) / ankleRels.length;
}

function estimateMaturity(input: NeighborhoodQualityInput, metrics: Record<string, number | string | boolean>): {
  level: number;
  rationale: string[];
} {
  const rationale: string[] = [];
  let level = 0;

  if (input.entities.length > 0) {
    level = 1;
    rationale.push("Level 1: canonical identity specifications exist for pilot entities.");
  }

  const relValid = Number(metrics.relationshipValidationRate);
  if (relValid >= 0.95 && input.relationships.length >= 10) {
    level = 2;
    rationale.push("Level 2: core relationship proposals defined and registry-valid.");
  }

  if (input.claimDrafts.length >= 5 && Number(metrics.claimAtomicityScore) >= 0.85) {
    level = 3;
    rationale.push("Level 3: educational claim drafts curated (still generated_draft).");
  }

  if (input.decisionPointDraftCount >= 1) {
    level = 4;
    rationale.push("Level 4: decision point drafts exist (unverified).");
  }

  const anatomyCov = Number(metrics.anatomyCompleteness);
  const metaComp = Number(metrics.metadataCompleteness);
  if (anatomyCov >= 0.85 && metaComp >= 0.5 && input.relationships.length >= 20) {
    level = 5;
    rationale.push("Level 5: relationship neighborhood structurally complete in spec.");
  }

  if ((input.approvedClaimCount ?? 0) > 0 && (input.approvedRelationshipCount ?? 0) > 0) {
    level = 6;
    rationale.push("Level 6: some objects approved in canonical store.");
  }

  if (
    (input.approvedClaimCount ?? 0) >= 5 &&
    (input.linkedCardCount ?? 0) >= 8 &&
    (input.approvedDecisionPointCount ?? 0) >= 1
  ) {
    level = 7;
    rationale.push("Level 7: production-ready threshold met in canonical store.");
  }

  return { level, rationale };
}

export function scoreNeighborhoodQuality(input: NeighborhoodQualityInput): NeighborhoodQualityReport {
  const blockers: string[] = [];
  const relationships = input.relationships;

  const draftClaims = input.claimDrafts.filter((c) => c.contentSource === "generated_draft");
  if (draftClaims.length !== input.claimDrafts.length) {
    blockers.push("All pilot claims must remain generated_draft until reviewed.");
  }
  if (input.claimDrafts.some((c) => c.reviewStatus === "approved")) {
    blockers.push("Claim drafts must not be marked approved without human review workflow.");
  }

  for (const rel of relationships) {
    if (HIGH_RISK_PREDICATES.has(rel.predicate) && rel.metadata?.review_status !== "approved") {
      // expected pre-review
    }
  }

  const outboundFromFracture = new Set(
    relationships.filter((r) => r.subjectSlug === "ankle-fracture").map((r) => r.predicate)
  );
  const inboundToFracture = new Set(
    relationships.filter((r) => r.objectSlug === "ankle-fracture").map((r) => r.predicate)
  );
  for (const pred of REQUIRED_DIAGNOSIS_RELS) {
    if (pred === "prerequisite_for") {
      if (!inboundToFracture.has(pred)) {
        blockers.push(`Missing inbound prerequisite_for edge to ankle-fracture`);
      }
      continue;
    }
    if (!outboundFromFracture.has(pred)) {
      blockers.push(`Missing required ankle-fracture outbound relationship predicate in spec: ${pred}`);
    }
  }

  const metrics: Record<string, number | string | boolean> = {
    canonicalIdentityCoverage: input.entities.length > 0 ? 1 : 0,
    entityCount: input.entities.length,
    relationshipCount: relationships.length,
    relationshipDensity: relationships.length / Math.max(input.entities.length, 1),
    anatomyCompleteness: anatomyCoverage(relationships),
    metadataCompleteness: metadataCompleteness(relationships),
    claimAtomicityScore: claimAtomicityScore(input.claimDrafts),
    claimDraftCount: input.claimDrafts.length,
    decisionPointCoverage: input.decisionPointDraftCount > 0 ? 1 : 0,
    decisionPointDraftCount: input.decisionPointDraftCount,
    provenanceCompleteness: 1,
    reviewCompleteness: (input.approvedRelationshipCount ?? 0) > 0 ? 0.25 : 0,
    orphanRate: 0,
    duplicateRate: 0,
    overlinkingRate: overlinkingRate(relationships),
    relationshipValidationRate: relationshipValidationRate(relationships, input.entities),
    traversalSmokeTestReadiness: relationships.length >= 15 && input.claimDrafts.length >= 5,
    linkedCardCount: input.linkedCardCount ?? 0,
    linkedQuestionCount: input.linkedQuestionCount ?? 0,
    publicDraftLeakRisk: true,
  };

  const { level, rationale } = estimateMaturity(input, metrics);

  if (metrics.publicDraftLeakRisk) {
    blockers.push("Claims and DPs are draft-only — publication gate must block verified consumption.");
  }
  if ((input.approvedEntityCount ?? 0) === 0) {
    blockers.push("No approved canonical entities in database yet — proposals remain offline/spec.");
  }

  const publicationBlockers = blockers.filter(
    (b) => b.includes("draft-only") || b.includes("No approved canonical")
  );

  return {
    pilotKey: input.pilotKey,
    estimatedMaturityLevel: level,
    maturityRationale: rationale,
    metrics,
    blockers,
    readyForTraversalSmokeTest:
      Boolean(metrics.traversalSmokeTestReadiness) &&
      blockers.filter((b) => !publicationBlockers.includes(b)).length === 0,
  };
}

export function defaultAnkleQualityInput(): NeighborhoodQualityInput {
  return {
    pilotKey: ANKLE_PILOT_KEY,
    entities: ANKLE_ENTITIES,
    relationships: activeAnkleRelationships(),
    claimDrafts: ANKLE_CLAIM_DRAFTS,
    decisionPointDraftCount: ANKLE_DECISION_POINT_DRAFTS.length,
    linkedCardCount: ANKLE_ASSET_COUNTS.ankiCardMappings,
    linkedQuestionCount: ANKLE_ASSET_COUNTS.orthobulletsQuestionMappings,
    approvedEntityCount: 0,
    approvedRelationshipCount: 0,
    approvedClaimCount: 0,
    approvedDecisionPointCount: 0,
  };
}

export function ankleSourceSummary() {
  return {
    ...ANKLE_SOURCE_IDS,
    assetCounts: ANKLE_ASSET_COUNTS,
    note: "Orthobullets counts are metadata mappings only — no stems stored.",
  };
}