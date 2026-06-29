import { StudentWorkspaceTimezoneSync } from "@/components/student-workspace/StudentWorkspaceTimezoneSync";
import { StudentWorkspacePreparePage } from "@/components/student-workspace/prepare/StudentWorkspacePreparePage";
import {
  addDaysToDateKey,
  getStartOfWeekDateKey,
} from "@/lib/student-workspace/date";
import { getStudentWorkspaceDashboardState } from "@/lib/student-workspace/page-state";
import { getStudentWorkspaceScheduleEntriesForWeek } from "@/lib/student-workspace/schedule";

export default async function StudentWorkspacePrepareRoute() {
  const state = await getStudentWorkspaceDashboardState(
    "/student-workspace/prepare"
  );
  const tomorrow = addDaysToDateKey(state.today, 1);
  const tomorrowWeekStart = getStartOfWeekDateKey(tomorrow);
  const [currentWeekEntries, tomorrowWeekEntries] =
    await Promise.all([
      getStudentWorkspaceScheduleEntriesForWeek(state.userId, state.weekStart),
      getStudentWorkspaceScheduleEntriesForWeek(state.userId, tomorrowWeekStart),
    ]);

  return (
    <>
      <StudentWorkspaceTimezoneSync profileTimeZone={state.profile.timezone} />
      <StudentWorkspacePreparePage
        profile={state.profile}
        rotations={state.rotations}
        today={state.today}
        currentRotationId={state.progress.currentRotation?.id ?? null}
        weekStart={state.weekStart}
        tomorrowWeekStart={tomorrowWeekStart}
        currentWeekEntries={currentWeekEntries}
        tomorrowWeekEntries={tomorrowWeekEntries}
      />
    </>
  );
}
