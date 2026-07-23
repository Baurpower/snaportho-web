import { StudentWorkspaceTimezoneSync } from "@/components/student-workspace/StudentWorkspaceTimezoneSync";
import { CaseReadinessPage } from "@/components/student-workspace/case-readiness/CaseReadinessPage";
import {
  buildCaseReadinessSession,
  resolveCaseReadinessMinutes,
  type StudyMode,
} from "@/lib/student-curriculum";
import {
  getStudentWorkspacePrepareProgressSnapshot,
  getTopicCurriculumProgress,
} from "@/lib/student-workspace/curriculum-progress";
import { getStudentWorkspaceDashboardState } from "@/lib/student-workspace/page-state";
import { getStudentCasePrepContext } from "@/lib/student-curriculum/student-caseprep-context";
import { isCasePrepStreamEnabled } from "@/lib/caseprep-v1-1/flags";

function resolveStudyMode(mode: string | undefined): StudyMode {
  return mode === "deep" ? "deep" : "fast";
}

function resolveRequestedMinutes(time: string | undefined) {
  const parsed = Number.parseInt(time ?? "", 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function StudentWorkspaceCaseReadinessRoute({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams?: Promise<{ mode?: string; time?: string }>;
}) {
  const state = await getStudentWorkspaceDashboardState(
    "/student-workspace/case-readiness"
  );
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const mode = resolveStudyMode(resolvedSearchParams?.mode);
  const selectedMinutes = resolveCaseReadinessMinutes(
    mode,
    resolveRequestedMinutes(resolvedSearchParams?.time)
  );

  const [progressSnapshot, topicProgress, casePrepContext] = await Promise.all([
    getStudentWorkspacePrepareProgressSnapshot(state.userId),
    getTopicCurriculumProgress(state.userId, resolvedParams.topicId),
    getStudentCasePrepContext(resolvedParams.topicId),
  ]);

  const session = buildCaseReadinessSession(resolvedParams.topicId, mode, {
    selectedMinutes,
    completedTopicIds: progressSnapshot.completedTopicIds,
    casePrepContext,
  });

  return (
    <>
      <StudentWorkspaceTimezoneSync profileTimeZone={state.profile.timezone} />
      <CaseReadinessPage
        session={session}
        initialCompletedObjectiveIds={topicProgress?.completed_objective_ids ?? []}
        casePrepStreamEnabled={isCasePrepStreamEnabled()}
      />
    </>
  );
}