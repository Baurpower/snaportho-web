import { requestCasePrepV2 } from "@/lib/caseprep-v2/client";
import type { CasePrepV2Normalized } from "@/lib/caseprep-v2/schema";
import { getTopicById } from "@/lib/student-curriculum/curriculum-recommendations";

export type StudentCasePrepContextStatus =
  | "certified"
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
    };
  }

  try {
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
    };
  }
}
