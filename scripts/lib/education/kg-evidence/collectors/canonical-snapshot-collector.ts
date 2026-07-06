import { loadDbNeighborhoodSnapshot } from "../../kg-compiler/db-snapshot.ts";
import { resolveTopic } from "../../kg-compiler/topic-registry.ts";
import { loadPilotProposals } from "../../kg-factory/persist.ts";
import { stableEvidenceId } from "../evidence-id.ts";
import type { EvidenceCollector, CollectorContext, CollectorResult } from "./types.ts";

export const canonicalSnapshotCollector: EvidenceCollector = {
  id: "canonical-snapshot-collector",

  async collect(context: CollectorContext): Promise<CollectorResult> {
    const warnings: CollectorResult["warnings"] = [];
    const sources: CollectorResult["sources"] = [];
    const items: CollectorResult["items"] = [];

    const topic = resolveTopic(context.topicKey);
    if (!topic) {
      warnings.push({
        code: "TOPIC_NOT_REGISTERED",
        message: `Topic ${context.topicKey} not in registry`,
        collectorId: this.id,
        severity: "error",
      });
      return { collectorId: this.id, sources, items, warnings, auditDetail: "unknown topic" };
    }

    let snapshot = topic.loadSnapshot();
    let source: "spec" | "database" = "spec";

    if (context.dbBacked) {
      const proposals = await loadPilotProposals(topic.pilotKey);
      const dbResult = await loadDbNeighborhoodSnapshot(topic, proposals);
      if (dbResult.loaded) {
        snapshot = dbResult.snapshot;
        source = "database";
      } else {
        warnings.push({
          code: "DB_SNAPSHOT_UNAVAILABLE",
          message: "DB-backed requested but canonical snapshot not loaded; using spec fallback",
          collectorId: this.id,
          severity: "warning",
        });
      }
    }

    const sourceId = `${context.pilotKey}:${source}`;
    sources.push({
      sourceId,
      sourceType: "canonical_snapshot",
      label: `Canonical neighborhood snapshot (${source})`,
      path: source === "database" ? "canonical_entities + canonical_relationships" : "kg-ankle-pilot-spec.ts",
      copyrightPolicy: "spec_snapshot",
      trustTier: "primary",
    });

    items.push({
      evidenceId: stableEvidenceId("canonical_snapshot", context.pilotKey, "neighborhood_counts", source),
      sourceType: "canonical_snapshot",
      sourceId: context.pilotKey,
      extractionMethod: "neighborhood_counts",
      copyrightPolicy: "spec_snapshot",
      confidenceHint: source === "database" ? 0.95 : 0.88,
      provenanceHint: `canonical_snapshot:${source}`,
      label: "Neighborhood entity/relationship counts",
      summary: `${snapshot.entities.length} entities, ${snapshot.relationships.length} relationships from ${source}`,
      payload: {
        source,
        entityCount: snapshot.entities.length,
        relationshipCount: snapshot.relationships.length,
        claimCount: snapshot.claims.length,
        decisionPointCount: snapshot.decisionPoints.length,
        primaryEntitySlug: snapshot.primaryEntitySlug,
        verified: false,
      },
      tags: ["canonical", "snapshot", source],
      collectedAt: context.collectedAt,
    });

    items.push({
      evidenceId: stableEvidenceId("canonical_snapshot", context.pilotKey, "entity_index", source),
      sourceType: "canonical_snapshot",
      sourceId: context.pilotKey,
      extractionMethod: "entity_index",
      copyrightPolicy: "spec_snapshot",
      confidenceHint: 0.9,
      provenanceHint: `entity_slugs:${source}`,
      label: "Entity slug index",
      summary: `${snapshot.entities.length} entity slug(s) in neighborhood`,
      payload: {
        entitySlugs: snapshot.entities.map((e) => e.slug).sort(),
        entityTypes: Object.fromEntries(
          snapshot.entities.map((e) => [e.slug, e.entityType])
        ),
      },
      tags: ["canonical", "entity_index"],
      collectedAt: context.collectedAt,
    });

    return {
      collectorId: this.id,
      sources,
      items,
      warnings,
      auditDetail: `source=${source} entities=${snapshot.entities.length}`,
    };
  },
};