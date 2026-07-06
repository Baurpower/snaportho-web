/**
 * Evidence Packet Builder — runs collectors, normalizes, deduplicates, assembles packet.
 */

import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { analyzeGaps } from "../kg-compiler/gap-analyzer.ts";
import { resolveTopic } from "../kg-compiler/topic-registry.ts";
import { loadPilotProposals } from "../kg-factory/persist.ts";
import { MIN_COMPILER_VERSION, SUPPORTED_ONTOLOGY_VERSION } from "../kg-agent-framework/versioning.ts";
import { DEFAULT_COLLECTORS } from "./collectors/index.ts";
import type { CollectorContext } from "./collectors/types.ts";
import { stableEvidenceId } from "./evidence-id.ts";
import {
  EVIDENCE_PACKET_VERSION,
  EVIDENCE_REGISTRY_VERSION,
  type EvidenceAssetLink,
  type EvidenceAuditEntry,
  type EvidenceCanonicalSnapshot,
  type EvidenceItem,
  type EvidenceQualitySummary,
  type EvidenceReviewHistory,
  type EvidenceSignal,
  type EvidenceSource,
  type EvidenceWarning,
  type KnowledgeEvidencePacket,
} from "./evidence-packet.ts";
import { OB_FORBIDDEN_PAYLOAD_KEYS } from "./collectors/orthobullets-metadata-collector.ts";

export type BuildEvidencePacketOptions = {
  topic: string;
  dbBacked?: boolean;
  includeStatic?: boolean;
  includeProposals?: boolean;
  includeQuality?: boolean;
  strict?: boolean;
  createdAt?: string;
};

export type BuildEvidencePacketResult = {
  packet: KnowledgeEvidencePacket;
  databaseModified: false;
};

function dedupeEvidenceItems(items: EvidenceItem[]): EvidenceItem[] {
  const byId = new Map<string, EvidenceItem>();
  for (const item of items) {
    if (!byId.has(item.evidenceId)) byId.set(item.evidenceId, item);
  }
  return [...byId.values()].sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
}

function dedupeSources(sources: EvidenceSource[]): EvidenceSource[] {
  const byId = new Map<string, EvidenceSource>();
  for (const s of sources) {
    const key = `${s.sourceType}:${s.sourceId}`;
    if (!byId.has(key)) byId.set(key, s);
  }
  return [...byId.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

function validateObSafety(items: EvidenceItem[]): EvidenceWarning[] {
  const warnings: EvidenceWarning[] = [];
  for (const item of items) {
    if (item.sourceType !== "orthobullets_question") continue;
    for (const key of OB_FORBIDDEN_PAYLOAD_KEYS) {
      if (key in item.payload) {
        warnings.push({
          code: "OB_FORBIDDEN_CONTENT",
          message: `Orthobullets evidence item ${item.evidenceId} contains forbidden field: ${key}`,
          severity: "error",
        });
      }
    }
  }
  return warnings;
}

function buildAssetSignals(items: EvidenceItem[], topicKey: string): EvidenceAssetLink[] {
  const signals: EvidenceAssetLink[] = [];
  const anki = items.find((e) => e.extractionMethod === "mapping_count" && e.sourceType === "anki_card");
  if (anki) {
    signals.push({
      assetType: "anki_card",
      sourceId: String(anki.sourceId),
      mappedEntitySlug: topicKey,
      mappingCount: Number(anki.payload.mappedCardCount ?? 0),
      confidenceHint: anki.confidenceHint,
      metadataOnly: true,
    });
  }
  const ob = items.find(
    (e) => e.extractionMethod === "mapping_count" && e.sourceType === "orthobullets_question"
  );
  if (ob) {
    signals.push({
      assetType: "orthobullets_question",
      sourceId: String(ob.sourceId),
      mappedEntitySlug: topicKey,
      mappingCount: Number(ob.payload.mappedQuestionCount ?? 0),
      confidenceHint: ob.confidenceHint,
      metadataOnly: true,
    });
  }
  const caseprep = items.find((e) => e.sourceType === "caseprep");
  if (caseprep) {
    signals.push({
      assetType: "caseprep",
      sourceId: String(caseprep.sourceId),
      mappedEntitySlug: topicKey,
      mappingCount: 1,
      confidenceHint: caseprep.confidenceHint,
      metadataOnly: true,
    });
  }
  return signals;
}

function buildExtractedSignals(items: EvidenceItem[]): EvidenceSignal[] {
  return items
    .filter((e) => e.tags.includes("asset_signal") || e.sourceType === "quality_signal")
    .map((e) => ({
      signalId: stableEvidenceId("signal", e.evidenceId, "extract"),
      signalType: e.sourceType,
      sourceEvidenceIds: [e.evidenceId],
      summary: e.summary,
      strength: e.confidenceHint,
      metadata: { extractionMethod: e.extractionMethod },
    }));
}

async function loadProposalsForPacket(
  topicKey: string,
  pilotKey: string,
  dbBacked: boolean,
  buildProposals: () => Promise<ProposalRecord[]>
): Promise<ProposalRecord[]> {
  if (dbBacked) {
    const fromDb = await loadPilotProposals(pilotKey);
    if (fromDb.length > 0) return fromDb;
  }
  return await buildProposals();
}

export async function buildEvidencePacket(
  options: BuildEvidencePacketOptions
): Promise<BuildEvidencePacketResult> {
  const topic = resolveTopic(options.topic);
  if (!topic) {
    throw new Error(`Unknown topic: ${options.topic}`);
  }

  const collectedAt = options.createdAt ?? new Date().toISOString();
  const auditTrail: EvidenceAuditEntry[] = [];
  const allWarnings: EvidenceWarning[] = [];
  const allSources: EvidenceSource[] = [];
  const allItems: EvidenceItem[] = [];

  const collectorContext: CollectorContext = {
    topicKey: topic.topicKey,
    pilotKey: topic.pilotKey,
    displayName: topic.displayName,
    primaryEntitySlug: topic.primaryEntitySlug,
    targetMaturityLevel: topic.targetMaturityLevel,
    sources: topic.sources,
    aliases: topic.aliases,
    dbBacked: options.dbBacked ?? false,
    includeStatic: options.includeStatic ?? true,
    includeProposals: options.includeProposals ?? true,
    includeQuality: options.includeQuality ?? true,
    collectedAt,
  };

  auditTrail.push({
    stage: "init",
    timestamp: collectedAt,
    action: "build_started",
    detail: topic.topicKey,
  });

  for (const collector of DEFAULT_COLLECTORS) {
    const result = await collector.collect(collectorContext);
    allSources.push(...result.sources);
    allItems.push(...result.items);
    allWarnings.push(...result.warnings);
    auditTrail.push({
      stage: "collect",
      timestamp: new Date().toISOString(),
      action: "collector_complete",
      detail: result.auditDetail,
      collectorId: result.collectorId,
    });
  }

  const sourceEvidence = dedupeEvidenceItems(allItems);
  const sourceManifest = dedupeSources(allSources);
  allWarnings.push(...validateObSafety(sourceEvidence));

  if (options.strict && allWarnings.some((w) => w.severity === "error")) {
    throw new Error(
      `Evidence packet build failed strict mode: ${allWarnings.filter((w) => w.severity === "error").map((w) => w.code).join(", ")}`
    );
  }

  const snapshotItem = sourceEvidence.find(
    (e) => e.sourceType === "canonical_snapshot" && e.extractionMethod === "neighborhood_counts"
  );
  const entityIndexItem = sourceEvidence.find(
    (e) => e.sourceType === "canonical_snapshot" && e.extractionMethod === "entity_index"
  );

  const canonicalSnapshot: EvidenceCanonicalSnapshot = {
    source: (snapshotItem?.payload.source as EvidenceCanonicalSnapshot["source"]) ?? "missing",
    entityCount: Number(snapshotItem?.payload.entityCount ?? 0),
    relationshipCount: Number(snapshotItem?.payload.relationshipCount ?? 0),
    claimCount: Number(snapshotItem?.payload.claimCount ?? 0),
    decisionPointCount: Number(snapshotItem?.payload.decisionPointCount ?? 0),
    primaryEntitySlug: topic.primaryEntitySlug,
    entitySlugs: (entityIndexItem?.payload.entitySlugs as string[]) ?? [],
    loaded: snapshotItem != null,
  };

  const includeProposals = options.includeProposals ?? true;
  const existingProposals = includeProposals
    ? await loadProposalsForPacket(topic.topicKey, topic.pilotKey, collectorContext.dbBacked, topic.buildProposals)
    : [];

  const snapshot = topic.loadSnapshot();
  const includeQuality = options.includeQuality ?? true;
  const gaps = includeQuality ? analyzeGaps(snapshot, existingProposals) : [];

  const gapsByKind = gaps.reduce<Record<string, number>>((acc, g) => {
    acc[g.kind] = (acc[g.kind] ?? 0) + 1;
    return acc;
  }, {});
  const gapsByPriority = gaps.reduce<Record<string, number>>((acc, g) => {
    acc[g.priority] = (acc[g.priority] ?? 0) + 1;
    return acc;
  }, {});

  const safetyItem = sourceEvidence.find((e) => e.extractionMethod === "safety_flags");
  const safetySignals = (safetyItem?.payload.flags as string[]) ?? [];

  const qualitySignals: EvidenceQualitySummary = {
    gapCount: gaps.length,
    gapsByKind,
    gapsByPriority,
    estimatedMaturityLevel: sourceEvidence.find((e) => e.extractionMethod === "gap_summary")?.payload
      .estimatedMaturityLevel as number | undefined,
    qualityWarnings: allWarnings.filter((w) => w.severity !== "info").map((w) => w.message),
    safetyFlags: safetySignals,
  };

  const reviewHistory: EvidenceReviewHistory[] = existingProposals.map((p) => ({
    proposalFingerprint: p.proposal_fingerprint,
    reviewStatus: p.review_status,
    reviewedBy: p.reviewed_by,
    reviewedAt: p.reviewed_at,
    curationRoute: String(p.metadata?.curation_route ?? ""),
    clinicalVerification: Boolean(p.metadata?.clinical_verification),
  }));

  const packetId = stableEvidenceId("packet", topic.topicKey, EVIDENCE_PACKET_VERSION);

  const packet: KnowledgeEvidencePacket = {
    packetId,
    topicId: topic.topicKey,
    createdAt: collectedAt,
    packetVersion: EVIDENCE_PACKET_VERSION,
    ontologyVersion: SUPPORTED_ONTOLOGY_VERSION,
    compilerVersion: MIN_COMPILER_VERSION,
    registryVersion: EVIDENCE_REGISTRY_VERSION,
    topicContext: {
      topicKey: topic.topicKey,
      pilotKey: topic.pilotKey,
      displayName: topic.displayName,
      primaryEntitySlug: topic.primaryEntitySlug,
      targetMaturityLevel: topic.targetMaturityLevel,
      curriculumNodeSlug: topic.sources.curriculumNodeSlug,
      prepareTopicId: topic.sources.prepareTopicId,
      casePrepSlug: topic.sources.casePrepSlug,
      aliases: topic.aliases,
    },
    sourceManifest,
    canonicalSnapshot,
    sourceEvidence,
    extractedSignals: buildExtractedSignals(sourceEvidence),
    assetSignals: buildAssetSignals(sourceEvidence, topic.topicKey),
    existingProposals,
    reviewHistory,
    qualitySignals,
    safetySignals,
    gaps,
    warnings: allWarnings,
    auditTrail: [
      ...auditTrail,
      {
        stage: "assemble",
        timestamp: new Date().toISOString(),
        action: "packet_assembled",
        detail: `${sourceEvidence.length} items, ${gaps.length} gaps`,
      },
    ],
    databaseModified: false,
  };

  return { packet, databaseModified: false };
}