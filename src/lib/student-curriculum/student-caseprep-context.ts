import { requestCasePrepV2 } from "@/lib/caseprep-v2/client";
import { requestCasePrepWebV11 } from "@/lib/caseprep-v1-1/client";
import { isCasePrepWebV11Enabled } from "@/lib/caseprep-v1-1/flags";
import type { CasePrepWebV11 } from "@/lib/caseprep-v1-1/schema";
import type { CasePrepV2Normalized } from "@/lib/caseprep-v2/schema";
import { getTopicById } from "@/lib/student-curriculum/curriculum-recommendations";

export type StudentCasePrepContextStatus =
  | "certified"
  | "preview"
  | "fallback"
  | "clarification"
  | "unavailable";

export type StudentCasePrepContext = {
  status: StudentCasePrepContextStatus;
  slug: string | null;
  title: string | null;
  message: string;
  sourceType: CasePrepV2Normalized["source_type"];
  entityKind: "procedure" | "approach" | null;
  requestedApproach: string | null;
  revisionId: string | null;
  payloadHash: string | null;
  citations: CasePrepV2Normalized["citations"];
  alternatives: CasePrepV2Normalized["alternatives"];
  payload: unknown | null;
  sections: Array<{ label: string; content: string }>;
  v11: CasePrepWebV11 | null;
};

function payloadSections(payload: unknown): Array<{ label: string; content: string }> {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const modules =
    record.modules && typeof record.modules === "object"
      ? (record.modules as Record<string, unknown>)
      : record.sections && typeof record.sections === "object"
        ? (record.sections as Record<string, unknown>)
      : record;
  return Object.entries(modules)
    .filter(([, value]) =>
      (Array.isArray(value) && value.length > 0) ||
      (value !== null && typeof value === "object" && Object.keys(value).length > 0)
    )
    .map(([key, value]) => ({
      label: key.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()),
      content: (Array.isArray(value) ? value : Object.entries(value as Record<string, unknown>))
        .map((item) =>
          typeof item === "string"
            ? item
            : Array.isArray(item)
              ? `${item[0]}: ${
                  typeof item[1] === "string"
                    ? item[1]
                    : JSON.stringify(item[1])
                }`
            : item && typeof item === "object"
              ? Object.values(item as Record<string, unknown>)
                  .filter((part) => typeof part === "string")
                  .join(": ")
              : ""
        )
        .filter(Boolean)
        .join("\n"),
    }));
}

export async function getStudentCasePrepContext(
  topicId: string
): Promise<StudentCasePrepContext> {
  const topic = getTopicById(topicId);
  if (!topic) {
    return {
      status: "unavailable",
      slug: null,
      title: null,
      message: "Case Prep is not available for this topic.",
      sourceType: "unavailable",
      entityKind: null,
      requestedApproach: null,
      revisionId: null,
      payloadHash: null,
      citations: [],
      alternatives: [],
      payload: null,
      sections: [],
      v11: null,
    };
  }

  try {
    if (isCasePrepWebV11Enabled()) {
      const preview = await requestCasePrepWebV11(topic.title);
      return {
        status: preview.content_status === "clarification" ? "clarification" : "preview",
        slug: preview.case.canonical_slug,
        title: preview.case.canonical_name ?? topic.title,
        message:
          preview.content_status === "clarification"
            ? preview.case.clarification_reason ?? "Choose an approach to continue."
            : "Faster parallel CasePrep preview",
        sourceType: "rag_fallback",
        entityKind: "procedure",
        requestedApproach: preview.case.approach,
        revisionId: null,
        payloadHash: null,
        citations: preview.sources.map((source) => ({
          source_id: source.source_id,
          title: source.title,
          url: source.url || null,
          section: null,
          chunk_id: null,
        })),
        alternatives: [],
        payload: preview,
        sections: [],
        v11: preview.content_status === "preview" ? preview : null,
      };
    }
    const result = await requestCasePrepV2({
      prompt: topic.title,
      entrySurface: "case_readiness",
      trainingLevel: "medical_student",
      casePrepSessionId: `case-readiness:${topicId}`,
    });
    const sections = payloadSections(result.payload);
    return {
      status:
        result.source_type === "curated"
          ? "certified"
          : result.requires_clarification
            ? "clarification"
            : result.source_type === "rag_fallback"
              ? "fallback"
              : "unavailable",
      slug: result.canonical_slug ?? null,
      title: result.canonical_name ?? null,
      message:
        result.source_type === "curated"
          ? "Curated Case Prep"
          : result.requires_clarification
            ? result.clarification_reason ?? "Choose an approach to continue."
            : result.source_type === "rag_fallback"
              ? "AI-assisted fallback"
              : "Case not yet available",
      sourceType: result.source_type,
      entityKind: result.entity_kind ?? null,
      requestedApproach: result.requested_approach ?? null,
      revisionId: result.revision_id ?? null,
      payloadHash: result.payload_hash ?? null,
      citations: result.citations,
      alternatives: result.alternatives,
      payload: result.payload,
      sections,
      v11: null,
    };
  } catch {
    return {
      status: "unavailable",
      slug: null,
      title: topic.title,
      message: "Case Prep is temporarily unavailable.",
      sourceType: "unavailable",
      entityKind: null,
      requestedApproach: null,
      revisionId: null,
      payloadHash: null,
      citations: [],
      alternatives: [],
      payload: null,
      sections: [],
      v11: null,
    };
  }
}
