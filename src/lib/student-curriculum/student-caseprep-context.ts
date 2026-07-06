import {
  CasePrepRegistryNotFoundError,
  CasePrepRegistryUpstreamError,
  fetchRegistryProcedure,
} from "@/lib/caseprep-review/client";
import type { ClinicalSection, ClinicalSectionItem } from "@/lib/caseprep-review/types";
import { getCasePrepSlugForTopic } from "@/lib/student-curriculum/caseprep-topic-mapping";

export type StudentCasePrepContextStatus =
  | "certified"
  | "available"
  | "unavailable";

export type StudentCasePrepContext = {
  status: StudentCasePrepContextStatus;
  slug: string | null;
  title: string | null;
  message: string;
  sections: Array<{ label: string; content: string }>;
};

function renderSectionItem(item: ClinicalSectionItem): string {
  switch (item.kind) {
    case "bullet":
    case "text":
      return item.text.trim();
    case "pimp_question":
      return `Q: ${item.question.trim()} A: ${item.answer.trim()}`;
    case "structure_at_risk":
      return `${item.structure}: ${item.why_at_risk.trim()}`;
    case "surgical_layer":
      return `${item.layer_name}: ${item.what_user_should_know.trim()}`;
    case "source":
      return item.title?.trim() || item.url;
    default:
      return "";
  }
}

function renderClinicalSection(section: ClinicalSection): string {
  return section.items
    .map(renderSectionItem)
    .filter(Boolean)
    .join("\n");
}

export async function getStudentCasePrepContext(
  topicId: string
): Promise<StudentCasePrepContext> {
  const slug = getCasePrepSlugForTopic(topicId);
  if (!slug) {
    return {
      status: "unavailable",
      slug: null,
      title: null,
      message:
        "Certified CasePrep content is not mapped for this topic yet. This session uses the student curriculum templates.",
      sections: [],
    };
  }

  try {
    const procedure = await fetchRegistryProcedure(slug);
    const isCertified =
      procedure.review_status === "certified" ||
      procedure.content_status === "certified" ||
      Boolean(procedure.certified_at);

    const sections = procedure.sections
      .filter((section) => !section.is_empty)
      .map((section) => ({
        label: section.label,
        content: renderClinicalSection(section),
      }))
      .filter((section) => section.content.trim().length > 0);

    if (!procedure.is_live || sections.length === 0) {
      return {
        status: "unavailable",
        slug,
        title: procedure.display_name,
        message:
          "CasePrep content exists for this procedure but is not yet live or complete enough for preparation. Using curriculum templates instead.",
        sections: [],
      };
    }

    return {
      status: isCertified ? "certified" : "available",
      slug,
      title: procedure.display_name,
      message: isCertified
        ? "Certified CasePrep content is available for this procedure."
        : "CasePrep registry content is available and will supplement the curriculum session.",
      sections,
    };
  } catch (error) {
    if (
      error instanceof CasePrepRegistryNotFoundError ||
      error instanceof CasePrepRegistryUpstreamError
    ) {
      return {
        status: "unavailable",
        slug,
        title: null,
        message:
          "Certified CasePrep content is unavailable right now. This session uses the student curriculum templates.",
        sections: [],
      };
    }

    throw error;
  }
}