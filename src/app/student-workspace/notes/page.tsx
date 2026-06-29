import { StudentWorkspaceNotesPage } from "@/components/student-workspace/notes/StudentWorkspaceNotesPage";
import { StudentWorkspaceTimezoneSync } from "@/components/student-workspace/StudentWorkspaceTimezoneSync";
import { getStudentWorkspaceDashboardState } from "@/lib/student-workspace/page-state";

export default async function StudentWorkspaceNotesRoute() {
  const state = await getStudentWorkspaceDashboardState(
    "/student-workspace/notes"
  );

  return (
    <>
      <StudentWorkspaceTimezoneSync profileTimeZone={state.profile.timezone} />
      <StudentWorkspaceNotesPage />
    </>
  );
}
