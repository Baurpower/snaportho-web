import type { StudentCasePrepContext } from "@/lib/student-curriculum/student-caseprep-context";
import type { PinnedCasePrepSession } from "@/lib/caseprep-v2/follow-up";

export function createPinnedCasePrepSession(
  context: StudentCasePrepContext,
  options: {
    casePrepSessionId: string;
    trainingLevel: string;
    entrySurface: string;
    currentSection?: string | null;
  }
): PinnedCasePrepSession | null {
  if (
    context.status !== "certified" ||
    !context.slug ||
    !context.title ||
    !context.payloadHash ||
    !context.revisionId
  ) {
    return null;
  }
  return {
    casePrepSessionId: options.casePrepSessionId,
    canonicalSlug: context.slug,
    canonicalName: context.title,
    approachIdentity: context.requestedApproach,
    revisionId: context.revisionId,
    payloadHash: context.payloadHash,
    trainingLevel: options.trainingLevel,
    entrySurface: options.entrySurface,
    currentSection: options.currentSection,
  };
}
