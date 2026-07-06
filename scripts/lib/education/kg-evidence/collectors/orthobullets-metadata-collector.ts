import { resolveTopic } from "../../kg-compiler/topic-registry.ts";
import { stableEvidenceId } from "../evidence-id.ts";
import type { EvidenceCollector, CollectorContext, CollectorResult } from "./types.ts";

/** Forbidden fields — Orthobullets collector must never emit these. */
export const OB_FORBIDDEN_PAYLOAD_KEYS = [
  "stem",
  "question_stem",
  "answer",
  "answers",
  "explanation",
  "rationale",
  "discussion",
  "choices",
  "options",
] as const;

export const orthobulletsMetadataCollector: EvidenceCollector = {
  id: "orthobullets-metadata-collector",

  async collect(context: CollectorContext): Promise<CollectorResult> {
    const warnings: CollectorResult["warnings"] = [];
    const sources: CollectorResult["sources"] = [];
    const items: CollectorResult["items"] = [];

    const nodeSlug = context.sources.curriculumNodeSlug ?? context.topicKey;
    const topic = resolveTopic(context.topicKey);
    const questionCount = topic?.loadSnapshot().assets.orthobulletsQuestionMappings ?? 0;

    const sourceId = `ob:${nodeSlug}`;
    sources.push({
      sourceId,
      sourceType: "orthobullets_question",
      label: `Orthobullets question mappings for ${nodeSlug}`,
      path: "external_questions + curriculum_node mapping",
      copyrightPolicy: "metadata_only",
      trustTier: "secondary",
    });

    items.push({
      evidenceId: stableEvidenceId("orthobullets_question", nodeSlug, "mapping_count"),
      sourceType: "orthobullets_question",
      sourceId: nodeSlug,
      extractionMethod: "mapping_count",
      copyrightPolicy: "metadata_only",
      confidenceHint: questionCount > 0 ? 0.9 : 0.5,
      provenanceHint: `orthobullets_mapping:${nodeSlug}`,
      label: "Orthobullets question mapping count",
      summary: `${questionCount} Orthobullets question mapping(s) for ${nodeSlug} (metadata only — no stems/answers)`,
      payload: {
        curriculumNodeSlug: nodeSlug,
        mappedQuestionCount: questionCount,
        prepareTopicId: context.sources.prepareTopicId ?? null,
        storesQuestionStem: false,
        storesAnswer: false,
        storesExplanation: false,
        signalType: "mapping_count",
      },
      tags: ["orthobullets", "metadata_only", "asset_signal"],
      collectedAt: context.collectedAt,
    });

    if (questionCount === 0) {
      warnings.push({
        code: "OB_MAPPINGS_ZERO",
        message: `No Orthobullets mapping count available for topic ${context.topicKey}`,
        collectorId: this.id,
        severity: "info",
      });
    }

    return {
      collectorId: this.id,
      sources,
      items,
      warnings,
      auditDetail: `questions=${questionCount}`,
    };
  },
};