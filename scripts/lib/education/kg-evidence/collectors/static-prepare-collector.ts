import { stableEvidenceId } from "../evidence-id.ts";
import type { EvidenceCollector, CollectorContext, CollectorResult } from "./types.ts";
import { loadPrepareTopicSlice } from "../prepare-topic-slices.ts";

export const staticPrepareCollector: EvidenceCollector = {
  id: "static-prepare-collector",

  async collect(context: CollectorContext): Promise<CollectorResult> {
    const warnings: CollectorResult["warnings"] = [];
    const sources: CollectorResult["sources"] = [];
    const items: CollectorResult["items"] = [];

    if (!context.includeStatic) {
      return {
        collectorId: this.id,
        sources,
        items,
        warnings,
        auditDetail: "skipped — includeStatic=false",
      };
    }

    const slice = loadPrepareTopicSlice(context.topicKey);
    if (!slice) {
      warnings.push({
        code: "PREPARE_SLICE_MISSING",
        message: `No static Prepare slice registered for topic ${context.topicKey}`,
        collectorId: this.id,
        severity: "warning",
      });
      return { collectorId: this.id, sources, items, warnings, auditDetail: "no slice" };
    }

    const sourceId = slice.topicId;
    const path = slice.sourcePath;
    sources.push({
      sourceId,
      sourceType: "static_prepare",
      label: `Prepare topic: ${slice.title}`,
      path,
      copyrightPolicy: "internal_draft_only",
      trustTier: "primary",
    });

    const sections = [
      { key: "fast", label: "Fast study template", payload: slice.fast },
      { key: "deep", label: "Deep study template", payload: slice.deep },
      {
        key: "learning_objectives",
        label: "Learning objectives",
        payload: { objectives: slice.learningObjectives },
      },
      { key: "metadata", label: "Topic metadata", payload: { tags: slice.tags, trackId: slice.trackId, subspecialty: slice.subspecialty } },
    ];

    for (const section of sections) {
      items.push({
        evidenceId: stableEvidenceId("static_prepare", sourceId, "section_extract", section.key),
        sourceType: "static_prepare",
        sourceId,
        path,
        extractionMethod: "section_extract",
        copyrightPolicy: "internal_draft_only",
        confidenceHint: 0.88,
        provenanceHint: `internal_draft_source:${path}#${section.key}`,
        label: `${slice.title} — ${section.label}`,
        summary: `Static Prepare ${section.label} for ${slice.title}`,
        payload: {
          section: section.key,
          contentRole: "internal_draft_source",
          verified: false,
          publishable: false,
          ...section.payload,
        },
        tags: ["prepare", "internal_draft", context.topicKey],
        collectedAt: context.collectedAt,
      });
    }

    return {
      collectorId: this.id,
      sources,
      items,
      warnings,
      auditDetail: `${items.length} section(s) from ${path}`,
    };
  },
};