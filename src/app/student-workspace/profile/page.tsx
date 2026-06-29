import { StudentWorkspaceProfilePage } from "@/components/student-workspace/profile/StudentWorkspaceProfilePage";
import { StudentWorkspaceTimezoneSync } from "@/components/student-workspace/StudentWorkspaceTimezoneSync";
import { getStudentWorkspaceDashboardState } from "@/lib/student-workspace/page-state";

export default async function StudentWorkspaceProfileRoute() {
  const state = await getStudentWorkspaceDashboardState(
    "/student-workspace/profile"
  );

  return (
    <>
      <StudentWorkspaceTimezoneSync profileTimeZone={state.profile.timezone} />
      <StudentWorkspaceProfilePage
        profile={state.profile}
        rotations={state.rotations}
        today={state.today}
      />
    </>
  );
}
