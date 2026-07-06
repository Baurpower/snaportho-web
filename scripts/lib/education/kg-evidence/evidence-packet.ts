/**
 * Knowledge Factory Evidence Packet — standardized read-only input bundle.
 * Not canonical truth; reproducible source context for compiler and agents.
 */

import type { ProposalRecord } from "../../../kg-automation-common.ts";
import type { OntologyGap } from "../kg-compiler/types.ts";

export const EVIDENCE_PACKET_VERSION = "1.0.0" as const;
export const EVIDENCE_REGISTRY_VERSION = "2026-07-05" as const;

export type EvidenceCopyrightPolicy =
  | "internal_draft_only"
  | "metadata_only"
  | "reference_link_only"
  | "spec_snapshot"
  | "user_generated";

export type EvidenceSourceType =
  | "static_prepare"
  | "curriculum_node"
  | "anki_card"
  | "orthobullets_question"
  | "caseprep"
  | "canonical_snapshot"
  | "proposal_history"
  | "review_history"
  | "quality_signal"
  | "spec_pilot";

export type EvidenceSource = {
  sourceId: string;
  sourceType: EvidenceSourceType;
  label: string;
  path?: string;
  copyrightPolicy: EvidenceCopyrightPolicy;
  trustTier: "primary" | "secondary" | "derived";
};

export type EvidenceItem = {
  evidenceId: string;
  sourceType: EvidenceSourceType;
  sourceId: string;
  path?: string;
  extractionMethod: string;
  copyrightPolicy: EvidenceCopyrightPolicy;
  confidenceHint: number;
  provenanceHint: string;
  label: string;
  summary: string;
  payload: Record<string, unknown>;
  tags: string[];
  collectedAt: string;
};

export type EvidenceSignal = {
  signalId: string;
  signalType: string;
  sourceEvidenceIds: string[];
  summary: string;
  strength: number;
  metadata: Record<string, unknown>;
};

export type EvidenceBundle = {
  bundleId: string;
  label: string;
  evidenceItemIds: string[];
  summary: string;
};

export type EvidenceTopicContext = {
  topicKey: string;
  pilotKey: string;
  displayName: string;
  primaryEntitySlug: string;
  targetMaturityLevel: number;
  curriculumNodeSlug?: string;
  prepareTopicId?: string;
  casePrepSlug?: string;
  aliases: string[];
};

export type EvidenceAssetLink = {
  assetType: "anki_card" | "orthobullets_question" | "caseprep";
  sourceId: string;
  mappedEntitySlug?: string;
  mappingCount: number;
  confidenceHint: number;
  metadataOnly: boolean;
};

export type EvidenceReviewHistory = {
  proposalFingerprint: string;
  reviewStatus: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  curationRoute?: string;
  clinicalVerification: boolean;
};

export type EvidenceCanonicalSnapshot = {
  source: "spec" | "database" | "missing";
  entityCount: number;
  relationshipCount: number;
  claimCount: number;
  decisionPointCount: number;
  primaryEntitySlug: string;
  entitySlugs: string[];
  loaded: boolean;
};

export type EvidenceQualitySummary = {
  gapCount: number;
  gapsByKind: Record<string, number>;
  gapsByPriority: Record<string, number>;
  estimatedMaturityLevel?: number;
  qualityWarnings: string[];
  safetyFlags: string[];
};

export type EvidenceAuditEntry = {
  stage: string;
  timestamp: string;
  action: string;
  detail: string;
  collectorId?: string;
};

export type EvidenceWarning = {
  code: string;
  message: string;
  collectorId?: string;
  severity: "info" | "warning" | "error";
};

export type KnowledgeEvidencePacket = {
  packetId: string;
  topicId: string;
  createdAt: string;
  packetVersion: typeof EVIDENCE_PACKET_VERSION;
  ontologyVersion: string;
  compilerVersion: string;
  registryVersion: string;
  topicContext: EvidenceTopicContext;
  sourceManifest: EvidenceSource[];
  canonicalSnapshot: EvidenceCanonicalSnapshot;
  sourceEvidence: EvidenceItem[];
  extractedSignals: EvidenceSignal[];
  assetSignals: EvidenceAssetLink[];
  existingProposals: ProposalRecord[];
  reviewHistory: EvidenceReviewHistory[];
  qualitySignals: EvidenceQualitySummary;
  safetySignals: string[];
  gaps: OntologyGap[];
  warnings: EvidenceWarning[];
  auditTrail: EvidenceAuditEntry[];
  databaseModified: false;
};

/** Subset passed to agents with assignment-scoped evidence references. */
export type EvidenceAgentContext = {
  evidencePacketId: string;
  relevantEvidenceItemIds: string[];
  sourceEvidenceSummary: string;
  canonicalSnapshotSummary: string;
  confidenceHints: Record<string, number>;
  provenanceHints: string[];
  safetySignals: string[];
};

export type EvidencePacketManifest = {
  packetId: string;
  topicId: string;
  createdAt: string;
  packetVersion: string;
  sourceCount: number;
  evidenceItemCount: number;
  signalCount: number;
  proposalCount: number;
  gapCount: number;
  warningCount: number;
  collectorsRun: string[];
  databaseModified: false;
};