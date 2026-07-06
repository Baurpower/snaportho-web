/**
 * Hand & Wrist cluster topic definitions for topic-registry.ts.
 */

import type { TopicDefinition } from "./kg-compiler/topic-registry.ts";
import type { NeighborhoodSnapshot } from "./kg-compiler/types.ts";
import { getHandWristPilotSpec, listHandWristFactoryTopicKeys } from "./kg-hand-wrist-pilot-spec.ts";
import type { HandWristPilotSpec } from "./kg-hand-wrist-pilot-spec-factory.ts";

function buildSnapshotFromHandWristSpec(spec: HandWristPilotSpec, topicKey: string): NeighborhoodSnapshot {
  return {
    topicKey,
    pilotKey: spec.pilotKey,
    displayName: spec.entities.find((e) => e.slug === topicKey)?.preferredLabel ?? topicKey,
    primaryEntitySlug: topicKey,
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
      casePrepSlug: spec.sourceIds.casePrepSlug,
    },
  };
}

export function buildHandWristTopicDefinitions(): TopicDefinition[] {
  return listHandWristFactoryTopicKeys().map((topicKey) => {
    const spec = getHandWristPilotSpec(topicKey)!;
    const displayName = spec.entities.find((e) => e.slug === topicKey)?.preferredLabel ?? topicKey;
    return {
      topicKey,
      pilotKey: spec.pilotKey,
      displayName,
      primaryEntitySlug: topicKey,
      targetMaturityLevel: 7,
      aliases: [
        displayName.toLowerCase(),
        spec.sourceIds.curriculumNodeSlug,
        spec.pilotKey,
        `${topicKey}-neighborhood`,
      ],
      sources: {
        curriculumNodeSlug: spec.sourceIds.curriculumNodeSlug,
        prepareTopicId: spec.sourceIds.prepareTopicId,
        casePrepSlug: spec.sourceIds.casePrepSlug,
        legacyRetargetProposalKey: spec.sourceIds.legacyRetargetProposalKey,
      },
      loadSnapshot: () => buildSnapshotFromHandWristSpec(spec, topicKey),
      buildProposals: async () => {
        const { buildHandWristProposalPacket } = await import("./kg-factory/proposal-builder.ts");
        return buildHandWristProposalPacket(topicKey).proposals;
      },
    };
  });
}