/**
 * Adult Reconstruction cluster topic definitions for topic-registry.ts.
 */

import type { TopicDefinition } from "./kg-compiler/topic-registry.ts";
import type { NeighborhoodSnapshot } from "./kg-compiler/types.ts";
import { ADULT_RECONSTRUCTION_TOPIC_CATALOG } from "./kg-adult-reconstruction-topic-catalog.ts";
import { getAdultReconstructionPilotSpec } from "./kg-adult-reconstruction-pilot-loader.ts";

function buildSnapshotFromReconSpec(topicKey: string): NeighborhoodSnapshot {
  const spec = getAdultReconstructionPilotSpec(topicKey);
  if (!spec) throw new Error(`Unknown adult reconstruction topic: ${topicKey}`);

  const entry = ADULT_RECONSTRUCTION_TOPIC_CATALOG.find((t) => t.topicKey === topicKey)!;

  return {
    topicKey: entry.topicKey,
    pilotKey: spec.pilotKey,
    displayName: entry.displayName,
    primaryEntitySlug: entry.primaryEntitySlug,
    targetMaturityLevel: entry.maturityTarget,
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

export function buildAdultReconstructionTopicDefinitions(): TopicDefinition[] {
  return ADULT_RECONSTRUCTION_TOPIC_CATALOG.map((entry) => {
    const spec = getAdultReconstructionPilotSpec(entry.topicKey)!;
    return {
      topicKey: entry.topicKey,
      pilotKey: spec.pilotKey,
      displayName: entry.displayName,
      primaryEntitySlug: entry.primaryEntitySlug,
      targetMaturityLevel: entry.maturityTarget,
      aliases: [entry.displayName.toLowerCase(), entry.curriculumNodeSlug, `${entry.topicKey}-neighborhood`],
      sources: {
        curriculumNodeSlug: spec.sourceIds.curriculumNodeSlug,
        prepareTopicId: spec.sourceIds.prepareTopicId,
        legacyRetargetProposalKey: spec.sourceIds.legacyRetargetProposalKey,
      },
      loadSnapshot: () => buildSnapshotFromReconSpec(entry.topicKey),
      buildProposals: async () => {
        const { buildAdultReconstructionProposalPacket } = await import("./kg-factory/proposal-builder.ts");
        return buildAdultReconstructionProposalPacket(entry.topicKey).proposals;
      },
    };
  });
}

export function listAdultReconstructionTopicKeys(): string[] {
  return ADULT_RECONSTRUCTION_TOPIC_CATALOG.map((t) => t.topicKey);
}