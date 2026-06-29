import { redirect } from "next/navigation";
import { requireStudentWorkspaceUser } from "@/lib/student-workspace/access";
import {
  getDateKeyForTimeZone,
  getStartOfWeekDateKey,
  resolveStudentWorkspaceTimeZone,
} from "@/lib/student-workspace/date";
import {
  getStudentWorkspaceOnboardingStep,
  isStudentWorkspaceEligibleYear,
  type StudentWorkspaceOnboardingStep,
} from "@/lib/student-workspace/journey";
import { ensureStudentWorkspaceProfile } from "@/lib/student-workspace/profile";
import { getFourthYearProgress } from "@/lib/student-workspace/progress";
import { getStudentWorkspaceRotations } from "@/lib/student-workspace/rotations";
import type {
  FourthYearProgressState,
  StudentWorkspaceProfile,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";
import { createClient } from "@/utils/supabase/server";

type StudentWorkspaceBaseState = {
  profile: StudentWorkspaceProfile;
  rotations: StudentWorkspaceRotation[];
  onboardingStep: StudentWorkspaceOnboardingStep;
};

export type StudentWorkspaceEntryState =
  | { kind: "landing" }
  | ({ kind: "graduation_gate" } & StudentWorkspaceBaseState)
  | ({ kind: "early_access" } & StudentWorkspaceBaseState)
  | ({ kind: "onboarding" } & StudentWorkspaceBaseState)
  | ({
      kind: "dashboard";
      userId: string;
      today: string;
      weekStart: string;
      progress: FourthYearProgressState;
    } & StudentWorkspaceBaseState);

export type StudentWorkspaceDashboardState = Extract<
  StudentWorkspaceEntryState,
  { kind: "dashboard" }
>;

export async function getStudentWorkspaceEntryState(options?: {
  touchLastOpenedAt?: boolean;
}): Promise<StudentWorkspaceEntryState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { kind: "landing" };
  }

  const profile = await ensureStudentWorkspaceProfile(user.id, {
    touchLastOpenedAt: options?.touchLastOpenedAt,
  });
  const rotations = await getStudentWorkspaceRotations(user.id);
  const onboardingStep = getStudentWorkspaceOnboardingStep(profile, rotations);

  if (!profile.expected_graduation_year) {
    return {
      kind: "graduation_gate",
      profile,
      rotations,
      onboardingStep,
    };
  }

  if (!isStudentWorkspaceEligibleYear(profile.expected_graduation_year)) {
    return {
      kind: "early_access",
      profile,
      rotations,
      onboardingStep,
    };
  }

  if (onboardingStep !== "dashboard") {
    return {
      kind: "onboarding",
      profile,
      rotations,
      onboardingStep,
    };
  }

  const timeZone = resolveStudentWorkspaceTimeZone(profile.timezone);
  const today = getDateKeyForTimeZone(timeZone);
  const weekStart = getStartOfWeekDateKey(today);

  return {
    kind: "dashboard",
    userId: user.id,
    profile,
    rotations,
    onboardingStep,
    today,
    weekStart,
    progress: getFourthYearProgress(rotations, profile, today),
  };
}

export async function getStudentWorkspaceDashboardState(
  returnTo: string,
  options?: { touchLastOpenedAt?: boolean }
): Promise<StudentWorkspaceDashboardState> {
  const { user } = await requireStudentWorkspaceUser(returnTo);
  const profile = await ensureStudentWorkspaceProfile(user.id, {
    touchLastOpenedAt: options?.touchLastOpenedAt,
  });
  const rotations = await getStudentWorkspaceRotations(user.id);
  const onboardingStep = getStudentWorkspaceOnboardingStep(profile, rotations);

  if (
    !profile.expected_graduation_year ||
    !isStudentWorkspaceEligibleYear(profile.expected_graduation_year) ||
    onboardingStep !== "dashboard"
  ) {
    redirect("/student-workspace");
  }

  const timeZone = resolveStudentWorkspaceTimeZone(profile.timezone);
  const today = getDateKeyForTimeZone(timeZone);
  const weekStart = getStartOfWeekDateKey(today);

  return {
    kind: "dashboard",
    userId: user.id,
    profile,
    rotations,
    onboardingStep,
    today,
    weekStart,
    progress: getFourthYearProgress(rotations, profile, today),
  };
}
