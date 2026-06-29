import type {
  StudentWorkspaceProfile,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";

export const STUDENT_WORKSPACE_EARLY_ACCESS_YEAR = 2027;

export type StudentWorkspaceOnboardingStep =
  | "graduation_year"
  | "profile"
  | "timeline"
  | "first_rotation"
  | "dashboard";

export function isStudentWorkspaceEligibleYear(
  expectedGraduationYear: number | null | undefined
) {
  return expectedGraduationYear === STUDENT_WORKSPACE_EARLY_ACCESS_YEAR;
}

export function getStudentWorkspaceOnboardingStep(
  profile: StudentWorkspaceProfile,
  rotations: StudentWorkspaceRotation[]
): StudentWorkspaceOnboardingStep {
  if (!profile.expected_graduation_year) {
    return "graduation_year";
  }

  if (!isStudentWorkspaceEligibleYear(profile.expected_graduation_year)) {
    return "graduation_year";
  }

  if (!profile.display_name || !profile.target_specialty) {
    return "profile";
  }

  if (!profile.fourth_year_start_date || !profile.fourth_year_end_date) {
    return "timeline";
  }

  if (rotations.length === 0) {
    return "first_rotation";
  }

  return "dashboard";
}
