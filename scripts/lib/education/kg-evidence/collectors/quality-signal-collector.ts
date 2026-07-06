import { analyzeGaps } from "../../kg-compiler/gap-analyzer.ts";
import { resolveTopic } from "../../kg-compiler/topic-registry.ts";
import { loadPilotProposals } from "../../kg-factory/persist.ts";
import { scoreNeighborhoodQuality } from "../../kg-neighborhood-quality.ts";
import { HIGH_RISK_PREDICATES } from "../../kg-relationship-registry.ts";
import { stableEvidenceId } from "../evidence-id.ts";
import type { EvidenceCollector, CollectorContext, CollectorResult } from "./types.ts";

export const qualitySignalCollector: EvidenceCollector = {
  id: "quality-signal-collector",

  async collect(context: CollectorContext): Promise<CollectorResult> {
    const warnings: CollectorResult["warnings"] = [];
    const sources: CollectorResult["sources"] = [];
    const items: CollectorResult["items"] = [];

    if (!context.includeQuality) {
      return {
        collectorId: this.id,
        sources,
        items,
        warnings,
        auditDetail: "skipped — includeQuality=false",
      };
    }

    const topic = resolveTopic(context.topicKey);
    if (!topic) {
      return { collectorId: this.id, sources, items, warnings, auditDetail: "unknown topic" };
    }

    let snapshot = topic.loadSnapshot();
    let proposals = await topic.buildProposals();

    if (context.dbBacked) {
      const fromDb = await loadPilotProposals(topic.pilotKey);
      if (fromDb.length > 0) proposals = fromDb;
      const { loadDbNeighborhoodSnapshot } = await import("../../kg-compiler/db-snapshot.ts");
      const dbResult = await loadDbNeighborhoodSnapshot(topic, proposals);
      if (dbResult.loaded) snapshot = dbResult.snapshot;
    }

    const gaps = analyzeGaps(snapshot, proposals);
    const gapsByKind = gaps.reduce<Record<string, number>>((acc, g) => {
      acc[g.kind] = (acc[g.kind] ?? 0) + 1;
      return acc;
    }, {});
    const gapsByPriority = gaps.reduce<Record<string, number>>((acc, g) => {
      acc[g.priority] = (acc[g.priority] ?? 0) + 1;
      return acc;
    }, {});

    const safetyFlags: string[] = [];
    for (const rel of snapshot.relationships) {
      if (HIGH_RISK_PREDICATES.has(rel.predicate)) {
        safetyFlags.push(`high_risk_predicate:${rel.predicate}:${rel.subjectSlug}->${rel.objectSlug}`);
      }
    }
    for (const dp of snapshot.decisionPoints) {
      if (dp.requiresAttendingReview) {
        safetyFlags.push(`attending_gated_dp:${dp.draftId}`);
      }
    }

    let estimatedMaturity: number | undefined;
    if (context.topicKey === "ankle-fracture") {
      const { ANKLE_CLAIM_DRAFTS, ANKLE_ENTITIES, activeAnkleRelationships } = await import(
        "../../kg-ankle-pilot-spec.ts"
      );
      const quality = scoreNeighborhoodQuality({
        pilotKey: context.pilotKey,
        entities: ANKLE_ENTITIES,
        relationships: activeAnkleRelationships(),
        claimDrafts: ANKLE_CLAIM_DRAFTS,
        decisionPointDraftCount: snapshot.decisionPoints.length,
        linkedCardCount: snapshot.assets.ankiCardMappings,
        linkedQuestionCount: snapshot.assets.orthobulletsQuestionMappings,
      });
      estimatedMaturity = quality.estimatedMaturityLevel;
    }

    const sourceId = `${context.pilotKey}:quality`;
    sources.push({
      sourceId,
      sourceType: "quality_signal",
      label: "Ontology quality signals",
      path: "kg-compiler/gap-analyzer.ts",
      copyrightPolicy: "spec_snapshot",
      trustTier: "derived",
    });

    items.push({
      evidenceId: stableEvidenceId("quality_signal", context.pilotKey, "gap_summary"),
      sourceType: "quality_signal",
      sourceId: context.pilotKey,
      extractionMethod: "gap_summary",
      copyrightPolicy: "spec_snapshot",
      confidenceHint: 0.9,
      provenanceHint: `ontology_gaps:${context.pilotKey}`,
      label: "Ontology gap summary",
      summary: `${gaps.length} gap(s) across ${Object.keys(gapsByKind).length} kind(s)`,
      payload: {
        gapCount: gaps.length,
        gapsByKind,
        gapsByPriority,
        topGaps: gaps.slice(0, 8).map((g) => ({
          id: g.id,
          kind: g.kind,
          priority: g.priority,
          reason: g.reason,
        })),
        estimatedMaturityLevel: estimatedMaturity,
      },
      tags: ["quality", "gaps"],
      collectedAt: context.collectedAt,
    });

    if (safetyFlags.length > 0) {
      items.push({
        evidenceId: stableEvidenceId("quality_signal", context.pilotKey, "safety_flags"),
        sourceType: "quality_signal",
        sourceId: context.pilotKey,
        extractionMethod: "safety_flags",
        copyrightPolicy: "spec_snapshot",
        confidenceHint: 0.95,
        provenanceHint: `safety_flags:${context.pilotKey}`,
        label: "Safety flags",
        summary: `${safetyFlags.length} safety flag(s) from snapshot`,
        payload: { flags: safetyFlags },
        tags: ["quality", "safety"],
        collectedAt: context.collectedAt,
      });
    }

    return {
      collectorId: this.id,
      sources,
      items,
      warnings,
      auditDetail: `gaps=${gaps.length} safety=${safetyFlags.length}`,
    };
  },
};