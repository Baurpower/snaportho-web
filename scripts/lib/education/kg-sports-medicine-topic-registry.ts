/**
 * Sports Medicine cluster topic definitions for topic-registry.ts.
 */

import type { TopicDefinition } from "./kg-compiler/topic-registry.ts";
import { getSportsPilotSpec, listSportsTopicKeys } from "./kg-sports-medicine-pilot-spec.ts";
import type { NeighborhoodSnapshot } from "./kg-compiler/types.ts";

function buildSnapshotFromSportsSpec(topicKey: string): NeighborhoodSnapshot {
  const spec = getSportsPilotSpec(topicKey);
  if (!spec) throw new Error(`Unknown sports topic: ${topicKey}`);

  return {
    topicKey: spec.seed.topicKey,
    pilotKey: spec.pilotKey,
    displayName: spec.seed.displayName,
    primaryEntitySlug: spec.seed.primaryEntitySlug,
    targetMaturityLevel: 7,
    entities: spec.entities.map((e) => ({
      slug: e.slug,
      entityType: e.entityType,
      preferredLabel: e.preferredLabel,
      description: e.description,
      metadata: e.metadata ?? {},
      source: "spec" as const,
    })),
    relationships: spec.relationships.map((r) => ({
      subjectSlug: r.subjectSlug,
      predicate: r.predicate,
      objectSlug: r.objectSlug,
      metadata: r.metadata,
      source: "spec" as const,
    })),
    claims: spec.claimDrafts.map((c) => ({
      draftId: c.draftId,
      claimType: c.claimType,
      claimText: c.claimText,
      primaryEntitySlug: c.primaryEntitySlug,
      importanceLevel: c.importanceLevel,
      contentSource: c.contentSource,
      reviewStatus: c.reviewStatus,
      metadata: {
        contextRelevance: c.contextRelevance,
        sourceNote: c.sourceNote,
      },
    })),
    decisionPoints: spec.decisionPointDrafts.map((dp) => ({
      draftId: dp.draftId,
      subjectEntitySlug: dp.subjectEntitySlug,
      patternType: dp.patternType,
      trigger: dp.trigger,
      action: dp.action,
      urgency: dp.urgency,
      safetyCriticality: dp.safetyCriticality,
      requiresAttendingReview: dp.requiresAttendingReview,
    })),
    assets: {
      ankiCardMappings: spec.assetCounts.ankiCardMappings,
      orthobulletsQuestionMappings: spec.assetCounts.orthobulletsQuestionMappings,
      linkedCardProposals: 0,
      linkedQuestionProposals: 0,
    },
    sources: {
      curriculumNodeSlug: spec.sourceIds.curriculumNodeSlug,
      prepareTopicId: spec.sourceIds.prepareTopicId,
    },
  };
}

export function buildSportsMedicineTopicDefinitions(): TopicDefinition[] {
  return listSportsTopicKeys().map((topicKey) => {
    const spec = getSportsPilotSpec(topicKey)!;
    return {
      topicKey: spec.seed.topicKey,
      pilotKey: spec.pilotKey,
      displayName: spec.seed.displayName,
      primaryEntitySlug: spec.seed.primaryEntitySlug,
      targetMaturityLevel: 7,
      aliases: spec.seed.aliases,
      sources: {
        curriculumNodeSlug: spec.sourceIds.curriculumNodeSlug,
        prepareTopicId: spec.sourceIds.prepareTopicId,
        legacyRetargetProposalKey: spec.sourceIds.legacyRetargetProposalKey,
      },
      loadSnapshot: () => buildSnapshotFromSportsSpec(topicKey),
      buildProposals: async () => {
        const { buildSportsMedicineProposalPacket } = await import("./kg-factory/proposal-builder.ts");
        return buildSportsMedicineProposalPacket(topicKey).proposals;
      },
    };
  });
}