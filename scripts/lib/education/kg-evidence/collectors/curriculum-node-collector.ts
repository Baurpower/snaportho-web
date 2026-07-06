import { stableEvidenceId } from "../evidence-id.ts";
import type { EvidenceCollector, CollectorContext, CollectorResult } from "./types.ts";

export const curriculumNodeCollector: EvidenceCollector = {
  id: "curriculum-node-collector",

  async collect(context: CollectorContext): Promise<CollectorResult> {
    const warnings: CollectorResult["warnings"] = [];
    const sources: CollectorResult["sources"] = [];
    const items: CollectorResult["items"] = [];

    const nodeSlug = context.sources.curriculumNodeSlug;
    if (!nodeSlug) {
      warnings.push({
        code: "CURRICULUM_NODE_MISSING",
        message: `Topic ${context.topicKey} has no curriculumNodeSlug mapping`,
        collectorId: this.id,
        severity: "warning",
      });
      return { collectorId: this.id, sources, items, warnings, auditDetail: "no node slug" };
    }

    sources.push({
      sourceId: nodeSlug,
      sourceType: "curriculum_node",
      label: `Curriculum node: ${nodeSlug}`,
      path: "curriculum_nodes.slug",
      copyrightPolicy: "reference_link_only",
      trustTier: "primary",
    });

    items.push({
      evidenceId: stableEvidenceId("curriculum_node", nodeSlug, "slug_mapping"),
      sourceType: "curriculum_node",
      sourceId: nodeSlug,
      path: "curriculum_nodes.slug",
      extractionMethod: "slug_mapping",
      copyrightPolicy: "reference_link_only",
      confidenceHint: 0.95,
      provenanceHint: `curriculum_node:${nodeSlug}`,
      label: `Curriculum node mapping`,
      summary: `Primary curriculum node ${nodeSlug} maps to entity ${context.primaryEntitySlug}`,
      payload: {
        curriculumNodeSlug: nodeSlug,
        primaryEntitySlug: context.primaryEntitySlug,
        topicKey: context.topicKey,
        pilotKey: context.pilotKey,
        prepareTopicId: context.sources.prepareTopicId ?? null,
        legacyRetargetKey: context.sources.legacyRetargetProposalKey ?? null,
      },
      tags: ["curriculum", "node_mapping", context.topicKey],
      collectedAt: context.collectedAt,
    });

    if (context.aliases.length > 0) {
      items.push({
        evidenceId: stableEvidenceId("curriculum_node", nodeSlug, "alias_index"),
        sourceType: "curriculum_node",
        sourceId: nodeSlug,
        extractionMethod: "alias_index",
        copyrightPolicy: "reference_link_only",
        confidenceHint: 0.9,
        provenanceHint: `curriculum_node_aliases:${nodeSlug}`,
        label: "Topic aliases",
        summary: `${context.aliases.length} topic alias(es) for resolution`,
        payload: { aliases: context.aliases },
        tags: ["curriculum", "aliases"],
        collectedAt: context.collectedAt,
      });
    }

    return {
      collectorId: this.id,
      sources,
      items,
      warnings,
      auditDetail: `node=${nodeSlug}`,
    };
  },
};