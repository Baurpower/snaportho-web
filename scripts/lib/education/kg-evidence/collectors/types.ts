import type { EvidenceItem, EvidenceSource, EvidenceWarning } from "../evidence-packet.ts";

export type CollectorContext = {
  topicKey: string;
  pilotKey: string;
  displayName: string;
  primaryEntitySlug: string;
  targetMaturityLevel: number;
  sources: Record<string, string>;
  aliases: string[];
  dbBacked: boolean;
  includeStatic: boolean;
  includeProposals: boolean;
  includeQuality: boolean;
  collectedAt: string;
};

export type CollectorResult = {
  collectorId: string;
  sources: EvidenceSource[];
  items: EvidenceItem[];
  warnings: EvidenceWarning[];
  auditDetail: string;
};

export interface EvidenceCollector {
  readonly id: string;
  collect(context: CollectorContext): Promise<CollectorResult>;
}