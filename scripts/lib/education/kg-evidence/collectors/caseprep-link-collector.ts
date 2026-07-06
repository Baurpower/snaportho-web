import { stableEvidenceId } from "../evidence-id.ts";
import type { EvidenceCollector, CollectorContext, CollectorResult } from "./types.ts";

const CASEPREP_MAPPINGS: Record<string, { slug: string; displayName: string }> = {
  "ankle-fracture": { slug: "ankle-fracture-orif", displayName: "Ankle Fracture ORIF" },
};

export const caseprepLinkCollector: EvidenceCollector = {
  id: "caseprep-link-collector",

  async collect(context: CollectorContext): Promise<CollectorResult> {
    const warnings: CollectorResult["warnings"] = [];
    const sources: CollectorResult["sources"] = [];
    const items: CollectorResult["items"] = [];

    const mapping =
      CASEPREP_MAPPINGS[context.topicKey] ??
      (context.sources.casePrepSlug
        ? { slug: context.sources.casePrepSlug, displayName: context.displayName }
        : undefined);

    if (!mapping) {
      warnings.push({
        code: "CASEPREP_LINK_MISSING",
        message: `No CasePrep mapping for topic ${context.topicKey}`,
        collectorId: this.id,
        severity: "info",
      });
      return { collectorId: this.id, sources, items, warnings, auditDetail: "no mapping" };
    }

    const sourceId = mapping.slug;
    sources.push({
      sourceId,
      sourceType: "caseprep",
      label: `CasePrep: ${mapping.displayName}`,
      path: "src/lib/student-curriculum/caseprep-topic-mapping.ts",
      copyrightPolicy: "reference_link_only",
      trustTier: "secondary",
    });

    items.push({
      evidenceId: stableEvidenceId("caseprep", sourceId, "topic_link"),
      sourceType: "caseprep",
      sourceId,
      path: "src/lib/student-curriculum/caseprep-topic-mapping.ts",
      extractionMethod: "topic_link",
      copyrightPolicy: "reference_link_only",
      confidenceHint: 0.93,
      provenanceHint: `caseprep:${sourceId}`,
      label: mapping.displayName,
      summary: `CasePrep module ${sourceId} linked to Prepare topic ${context.topicKey}`,
      payload: {
        casePrepSlug: sourceId,
        displayName: mapping.displayName,
        topicId: context.topicKey,
        linkType: "procedure_case",
      },
      tags: ["caseprep", "asset_link"],
      collectedAt: context.collectedAt,
    });

    return {
      collectorId: this.id,
      sources,
      items,
      warnings,
      auditDetail: `slug=${sourceId}`,
    };
  },
};