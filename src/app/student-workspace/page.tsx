import { StudentWorkspaceEarlyAccessNotice } from "@/components/student-workspace/StudentWorkspaceEarlyAccessNotice";
import { StudentWorkspaceFrame } from "@/components/student-workspace/StudentWorkspaceFrame";
import { StudentWorkspaceGraduationGate } from "@/components/student-workspace/StudentWorkspaceGraduationGate";
import { StudentWorkspaceHomePage } from "@/components/student-workspace/home/StudentWorkspaceHomePage";
import { StudentWorkspaceLandingPage } from "@/components/student-workspace/StudentWorkspaceLandingPage";
import { StudentWorkspaceOnboardingFlow } from "@/components/student-workspace/StudentWorkspaceOnboardingFlow";
import { StudentWorkspaceTimezoneSync } from "@/components/student-workspace/StudentWorkspaceTimezoneSync";
import {
  ensureStudentWorkspaceDailySuccessChecklist,
  getStudentWorkspaceChecklistStateForDate,
} from "@/lib/student-workspace/checklists";
import { getStudentWorkspaceEntryState } from "@/lib/student-workspace/page-state";
import { getStudentWorkspaceScheduleEntriesForWeek } from "@/lib/student-workspace/schedule";

export default async function StudentWorkspacePage() {
  const state = await getStudentWorkspaceEntryState({ touchLastOpenedAt: true });

  if (state.kind === "landing") {
    return (
      <StudentWorkspaceFrame>
        <StudentWorkspaceLandingPage />
      </StudentWorkspaceFrame>
    );
  }

  if (state.kind === "graduation_gate") {
    return (
      <>
        <StudentWorkspaceTimezoneSync profileTimeZone={state.profile.timezone} />
        <StudentWorkspaceFrame>
          <StudentWorkspaceGraduationGate
            initialYear={state.profile.expected_graduation_year}
          />
        </StudentWorkspaceFrame>
      </>
    );
  }

  if (state.kind === "early_access") {
    const expectedGraduationYear = state.profile.expected_graduation_year ?? 2027;

    return (
      <>
        <StudentWorkspaceTimezoneSync profileTimeZone={state.profile.timezone} />
        <StudentWorkspaceFrame>
          <StudentWorkspaceEarlyAccessNotice
            expectedGraduationYear={expectedGraduationYear}
          />
        </StudentWorkspaceFrame>
      </>
    );
  }

  if (state.kind === "onboarding") {
    const onboardingStep =
      state.onboardingStep === "profile" ||
      state.onboardingStep === "timeline" ||
      state.onboardingStep === "first_rotation"
        ? state.onboardingStep
        : "profile";

    return (
      <>
        <StudentWorkspaceTimezoneSync profileTimeZone={state.profile.timezone} />
        <StudentWorkspaceFrame>
          <StudentWorkspaceOnboardingFlow
            profile={state.profile}
            step={onboardingStep}
          />
        </StudentWorkspaceFrame>
      </>
    );
  }

  const [scheduleEntries, successChecklist, checklistState] =
    await Promise.all([
      getStudentWorkspaceScheduleEntriesForWeek(state.userId, state.weekStart),
      ensureStudentWorkspaceDailySuccessChecklist(state.userId),
      getStudentWorkspaceChecklistStateForDate(state.userId, state.today),
    ]);

  return (
    <>
      <StudentWorkspaceTimezoneSync profileTimeZone={state.profile.timezone} />
      <StudentWorkspaceHomePage
        profile={state.profile}
        rotations={state.rotations}
        progress={state.progress}
        scheduleEntries={scheduleEntries}
        successChecklistItems={successChecklist.items}
        successChecklistState={checklistState.filter((entry) =>
          successChecklist.items.some((item) => item.id === entry.checklist_item_id)
        )}
        today={state.today}
        weekStart={state.weekStart}
      />
    </>
  );
}
