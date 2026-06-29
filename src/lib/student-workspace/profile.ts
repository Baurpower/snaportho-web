import { createClient } from "@/utils/supabase/server";
import type {
  StudentWorkspaceProfile,
  StudentWorkspaceProfileInsert,
  StudentWorkspaceProfileUpdate,
} from "@/lib/student-workspace/types";
import {
  compareDateOnly,
  isValidDateOnlyString,
  isValidTimeZone,
} from "@/lib/student-workspace/date";

function normalizeString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalDate(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isValidDateOnlyString(trimmed)) {
    throw new Error("Dates must use valid YYYY-MM-DD format.");
  }
  return trimmed;
}

function normalizeOptionalTimeZone(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isValidTimeZone(trimmed)) {
    throw new Error("Timezone must be a valid IANA timezone.");
  }
  return trimmed;
}

function normalizeOptionalGraduationYear(value: number | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 2025 || value > 2100) {
    throw new Error("Expected graduation year must be a valid four-digit year.");
  }
  return value;
}

function validateProfileDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
) {
  if (startDate && endDate && compareDateOnly(endDate, startDate) < 0) {
    throw new Error(
      "Fourth-year end date cannot be earlier than fourth-year start date."
    );
  }
}

export async function getStudentWorkspaceProfileByUserId(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as StudentWorkspaceProfile | null;
}

export async function createStudentWorkspaceProfile(
  input: StudentWorkspaceProfileInsert
) {
  const supabase = await createClient();
  const fourthYearStartDate = normalizeOptionalDate(
    input.fourth_year_start_date
  );
  const fourthYearEndDate = normalizeOptionalDate(input.fourth_year_end_date);
  validateProfileDateRange(fourthYearStartDate, fourthYearEndDate);

  const payload = {
    user_id: input.user_id,
    display_name: normalizeString(input.display_name),
    med_school_year: normalizeString(input.med_school_year),
    target_specialty: normalizeString(input.target_specialty),
    timezone: normalizeOptionalTimeZone(input.timezone) ?? null,
    expected_graduation_year:
      normalizeOptionalGraduationYear(input.expected_graduation_year) ?? null,
    fourth_year_start_date: fourthYearStartDate ?? null,
    fourth_year_end_date: fourthYearEndDate ?? null,
    onboarding_completed: input.onboarding_completed ?? false,
    onboarding_step: normalizeString(input.onboarding_step),
    last_opened_at: input.last_opened_at ?? null,
  };

  const { data, error } = await supabase
    .from("student_workspace_profiles")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as StudentWorkspaceProfile;
}

export async function ensureStudentWorkspaceProfile(
  userId: string,
  options?: { touchLastOpenedAt?: boolean }
) {
  const existing = await getStudentWorkspaceProfileByUserId(userId);

  if (!existing) {
    return createStudentWorkspaceProfile({
      user_id: userId,
      last_opened_at: options?.touchLastOpenedAt ? new Date().toISOString() : null,
    });
  }

  if (!options?.touchLastOpenedAt) {
    return existing;
  }

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("student_workspace_profiles")
    .update({ last_opened_at: nowIso })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as StudentWorkspaceProfile;
}

export async function updateStudentWorkspaceProfile(
  userId: string,
  updates: StudentWorkspaceProfileUpdate
) {
  const supabase = await createClient();
  const existing = await getStudentWorkspaceProfileByUserId(userId);
  if (!existing) {
    throw new Error("Student Workspace profile not found.");
  }

  const nextStartDate = normalizeOptionalDate(updates.fourth_year_start_date);
  const nextEndDate = normalizeOptionalDate(updates.fourth_year_end_date);
  const effectiveStartDate =
    nextStartDate === undefined
      ? existing.fourth_year_start_date
      : nextStartDate;
  const effectiveEndDate =
    nextEndDate === undefined ? existing.fourth_year_end_date : nextEndDate;
  validateProfileDateRange(effectiveStartDate, effectiveEndDate);

  const payload = {
    display_name:
      updates.display_name === undefined
        ? undefined
        : normalizeString(updates.display_name),
    med_school_year:
      updates.med_school_year === undefined
        ? undefined
        : normalizeString(updates.med_school_year),
    target_specialty:
      updates.target_specialty === undefined
        ? undefined
        : normalizeString(updates.target_specialty),
    timezone:
      updates.timezone === undefined
        ? undefined
        : normalizeOptionalTimeZone(updates.timezone),
    expected_graduation_year:
      updates.expected_graduation_year === undefined
        ? undefined
        : normalizeOptionalGraduationYear(updates.expected_graduation_year),
    fourth_year_start_date:
      nextStartDate === undefined ? undefined : nextStartDate,
    fourth_year_end_date:
      nextEndDate === undefined ? undefined : nextEndDate,
    onboarding_completed:
      updates.onboarding_completed === undefined
        ? undefined
        : updates.onboarding_completed,
    onboarding_step:
      updates.onboarding_step === undefined
        ? undefined
        : normalizeString(updates.onboarding_step),
    last_opened_at:
      updates.last_opened_at === undefined ? undefined : updates.last_opened_at,
  };

  const { data, error } = await supabase
    .from("student_workspace_profiles")
    .update(payload)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as StudentWorkspaceProfile;
}
