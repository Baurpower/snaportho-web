import { resolveTopic } from "../../kg-compiler/topic-registry.ts";
import { loadPilotProposals } from "../../kg-factory/persist.ts";
import { stableEvidenceId } from "../evidence-id.ts";
import type { EvidenceCollector, CollectorContext, CollectorResult } from "./types.ts";

export const proposalHistoryCollector: EvidenceCollector = {
  id: "proposal-history-collector",

  async collect(context: CollectorContext): Promise<CollectorResult> {
    const warnings: CollectorResult["warnings"] = [];
    const sources: CollectorResult["sources"] = [];
    const items: CollectorResult["items"] = [];

    if (!context.includeProposals) {
      return {
        collectorId: this.id,
        sources,
        items,
        warnings,
        auditDetail: "skipped — includeProposals=false",
      };
    }

    const topic = resolveTopic(context.topicKey);
    if (!topic) {
      return { collectorId: this.id, sources, items, warnings, auditDetail: "unknown topic" };
    }

    let proposals = await topic.buildProposals();
    let source: "spec" | "database" = "spec";

    if (context.dbBacked) {
      const fromDb = await loadPilotProposals(topic.pilotKey);
      if (fromDb.length > 0) {
        proposals = fromDb;
        source = "database";
      }
    }

    const sourceId = `${context.pilotKey}:proposals:${source}`;
    sources.push({
      sourceId,
      sourceType: "proposal_history",
      label: `Proposal packet (${source})`,
      path: source === "database" ? "kg_automation_proposals" : "kg-factory/proposal-builder.ts",
      copyrightPolicy: "spec_snapshot",
      trustTier: "derived",
    });

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const p of proposals) {
      byType[p.proposal_type] = (byType[p.proposal_type] ?? 0) + 1;
      byStatus[p.review_status] = (byStatus[p.review_status] ?? 0) + 1;
    }

    items.push({
      evidenceId: stableEvidenceId("proposal_history", context.pilotKey, "packet_summary", source),
      sourceType: "proposal_history",
      sourceId: context.pilotKey,
      extractionMethod: "packet_summary",
      copyrightPolicy: "spec_snapshot",
      confidenceHint: 0.9,
      provenanceHint: `proposal_packet:${source}`,
      label: "Proposal packet summary",
      summary: `${proposals.length} proposal(s) from ${source}`,
      payload: {
        source,
        totalProposals: proposals.length,
        byType,
        byStatus,
        fingerprints: proposals.map((p) => p.proposal_fingerprint).sort(),
      },
      tags: ["proposals", "history"],
      collectedAt: context.collectedAt,
    });

    return {
      collectorId: this.id,
      sources,
      items,
      warnings,
      auditDetail: `proposals=${proposals.length} source=${source}`,
    };
  },
};