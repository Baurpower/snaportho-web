import { resolveTopic } from "../../kg-compiler/topic-registry.ts";
import { loadPilotProposals } from "../../kg-factory/persist.ts";
import { stableEvidenceId } from "../evidence-id.ts";
import type { EvidenceCollector, CollectorContext, CollectorResult } from "./types.ts";

export const reviewHistoryCollector: EvidenceCollector = {
  id: "review-history-collector",

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
    if (context.dbBacked) {
      const fromDb = await loadPilotProposals(topic.pilotKey);
      if (fromDb.length > 0) proposals = fromDb;
    }

    const reviewed = proposals.filter((p) => p.review_status === "approved" || p.reviewed_at);
    const pending = proposals.filter(
      (p) => p.review_status === "generated" || p.review_status === "pending_review"
    );

    const sourceId = `${context.pilotKey}:review`;
    sources.push({
      sourceId,
      sourceType: "review_history",
      label: "Proposal review history",
      path: "proposal.review_status fields",
      copyrightPolicy: "spec_snapshot",
      trustTier: "derived",
    });

    items.push({
      evidenceId: stableEvidenceId("review_history", context.pilotKey, "status_summary"),
      sourceType: "review_history",
      sourceId: context.pilotKey,
      extractionMethod: "status_summary",
      copyrightPolicy: "spec_snapshot",
      confidenceHint: 0.92,
      provenanceHint: `review_status:${context.pilotKey}`,
      label: "Review status distribution",
      summary: `${reviewed.length} reviewed, ${pending.length} pending of ${proposals.length} proposals`,
      payload: {
        total: proposals.length,
        reviewedCount: reviewed.length,
        pendingCount: pending.length,
        approvedCount: proposals.filter((p) => p.review_status === "approved").length,
        routes: proposals.reduce<Record<string, number>>((acc, p) => {
          const route = String(p.metadata?.curation_route ?? "unrouted");
          acc[route] = (acc[route] ?? 0) + 1;
          return acc;
        }, {}),
      },
      tags: ["review", "history"],
      collectedAt: context.collectedAt,
    });

    return {
      collectorId: this.id,
      sources,
      items,
      warnings,
      auditDetail: `reviewed=${reviewed.length} pending=${pending.length}`,
    };
  },
};