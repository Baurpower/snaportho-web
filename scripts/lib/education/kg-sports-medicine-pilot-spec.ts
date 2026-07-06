/**
 * Sports Medicine Prepare cluster — pilot spec factory.
 * Generates neighborhood snapshots and proposal packets for all registered conditions.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  FOOT_ANKLE_REFERENCE_RELATIONSHIPS,
  LE_KNEE_REFERENCE_RELATIONSHIPS,
  SPORTS_SHARED_ANATOMY_ENTITIES,
  SPORTS_SHARED_ANATOMY_RELATIONSHIPS,
  sharedFootAnkleAnatomyForSportsSibling,
  sharedLeKneeAnatomyForSportsSibling,
  sharedSportsAnatomyEntitiesForSibling,
  sharedUeShoulderElbowAnatomyForSportsSibling,
  UE_SHOULDER_REFERENCE_RELATIONSHIPS,
} from "./kg-sports-medicine-shared-anatomy.ts";
import {
  buildClaimsForSeed,
  buildDecisionPointsForSeed,
  buildRelationshipsForSeed,
  getPilotKeyForSeed,
  SPORTS_CONDITION_SEEDS,
  type SportsConditionSeed,
  type SportsRegion,
} from "./kg-sports-medicine-condition-registry.ts";

export type SportsPilotSpec = {
  seed: SportsConditionSeed;
  pilotKey: string;
  sourceIds: {
    curriculumNodeSlug: string;
    prepareTopicId: string;
    legacyRetargetProposalKey: string;
  };
  assetCounts: { ankiCardMappings: number; orthobulletsQuestionMappings: number };
  entities: PilotEntitySpec[];
  relationships: PilotRelationshipSpec[];
  claimDrafts: PilotClaimDraft[];
  decisionPointDrafts: PilotDecisionPointDraft[];
};

function anatomyForRegion(seed: SportsConditionSeed, pilotKey: string): PilotEntitySpec[] {
  const isOwner = seed.isSharedAnatomyOwner === true;
  const sportsAnatomy = isOwner
    ? SPORTS_SHARED_ANATOMY_ENTITIES.map((e) => ({ ...e, metadata: { ...e.metadata, pilot: pilotKey } }))
    : sharedSportsAnatomyEntitiesForSibling(pilotKey);

  const regional: PilotEntitySpec[] = [];
  if (seed.region === "knee") {
    regional.push(...sharedLeKneeAnatomyForSportsSibling(pilotKey));
  }
  if (seed.region === "shoulder" || seed.region === "elbow") {
    regional.push(...sharedUeShoulderElbowAnatomyForSportsSibling(pilotKey));
  }
  if (seed.region === "foot_ankle") {
    regional.push(...sharedFootAnkleAnatomyForSportsSibling(pilotKey));
  }
  return [...sportsAnatomy, ...regional];
}

function baseRelationshipsForRegion(seed: SportsConditionSeed, pilotKey: string): PilotRelationshipSpec[] {
  const isOwner = seed.isSharedAnatomyOwner === true;
  const sportsRels = isOwner
    ? SPORTS_SHARED_ANATOMY_RELATIONSHIPS
    : SPORTS_SHARED_ANATOMY_RELATIONSHIPS.map((r) => ({
        ...r,
        metadata: { ...r.metadata, shared_reference: true },
      }));

  const regional: PilotRelationshipSpec[] = [];
  if (seed.region === "knee") regional.push(...LE_KNEE_REFERENCE_RELATIONSHIPS);
  if (seed.region === "shoulder") regional.push(...UE_SHOULDER_REFERENCE_RELATIONSHIPS);
  if (seed.region === "foot_ankle") regional.push(...FOOT_ANKLE_REFERENCE_RELATIONSHIPS);

  return [...sportsRels, ...regional, ...buildRelationshipsForSeed(seed, pilotKey)];
}

function crossNeighborhoodReferenceEntities(seed: SportsConditionSeed, pilotKey: string): PilotEntitySpec[] {
  const linkedSlugs = [...new Set([...seed.crossNeighborhoodSlugs, ...seed.traumaCrossLinks])];
  return linkedSlugs.map((slug) => ({
    slug,
    entityType: "condition" as const,
    preferredLabel: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Cross-neighborhood reference to canonical condition ${slug}.`,
    metadata: {
      shared_reference: true,
      cross_neighborhood: true,
      owner_pilot: slug.endsWith("-fracture") || slug.endsWith("-injury") ? `${slug}-neighborhood` : `${slug}-neighborhood`,
      pilot: pilotKey,
    },
  }));
}

export function buildSportsPilotSpec(seed: SportsConditionSeed): SportsPilotSpec {
  const pilotKey = getPilotKeyForSeed(seed);
  const entities = [
    ...anatomyForRegion(seed, pilotKey),
    ...seed.specificEntities,
    ...crossNeighborhoodReferenceEntities(seed, pilotKey),
  ];
  const relationships = baseRelationshipsForRegion(seed, pilotKey);

  return {
    seed,
    pilotKey,
    sourceIds: {
      curriculumNodeSlug: seed.curriculumNodeSlug,
      prepareTopicId: seed.prepareTopicId,
      legacyRetargetProposalKey: `retarget:${seed.curriculumNodeSlug}`,
    },
    assetCounts: {
      ankiCardMappings: seed.ankiCount,
      orthobulletsQuestionMappings: seed.obCount,
    },
    entities,
    relationships,
    claimDrafts: buildClaimsForSeed(seed),
    decisionPointDrafts: buildDecisionPointsForSeed(seed),
  };
}

export const SPORTS_PILOT_SPECS: Record<string, SportsPilotSpec> = Object.fromEntries(
  SPORTS_CONDITION_SEEDS.map((seed) => [seed.topicKey, buildSportsPilotSpec(seed)])
);

export function getSportsPilotSpec(topicKey: string): SportsPilotSpec | undefined {
  return SPORTS_PILOT_SPECS[topicKey];
}

export function activeSportsRelationships(topicKey: string): PilotRelationshipSpec[] {
  const spec = getSportsPilotSpec(topicKey);
  if (!spec) return [];
  return spec.relationships.filter((r) => !r.metadata?.disabled);
}

export function listSportsTopicKeys(): string[] {
  return SPORTS_CONDITION_SEEDS.map((s) => s.topicKey);
}

export function listSportsTopicsByRegion(region: SportsRegion): SportsConditionSeed[] {
  return SPORTS_CONDITION_SEEDS.filter((s) => s.region === region);
}