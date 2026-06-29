import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  ensureStudentWorkspaceProfile,
  updateStudentWorkspaceProfile,
} from "@/lib/student-workspace/profile";
import {
  compareDateOnly,
  isValidDateOnlyString,
  isValidTimeZone,
} from "@/lib/student-workspace/date";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";

type PatchBody = {
  display_name?: string | null;
  med_school_year?: string | null;
  target_specialty?: string | null;
  timezone?: string | null;
  expected_graduation_year?: number | null;
  fourth_year_start_date?: string | null;
  fourth_year_end_date?: string | null;
  onboarding_completed?: boolean;
  onboarding_step?: string | null;
};

function normalizeOptionalBoolean(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error("onboarding_completed must be a boolean.");
  }
  return value;
}

function normalizeNullableString(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error("Expected a string value.");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalDate(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error("Expected a date string.");
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isValidDateOnlyString(trimmed)) {
    throw new Error("Dates must use valid YYYY-MM-DD format.");
  }
  return trimmed;
}

function normalizeOptionalTimeZone(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error("timezone must be a string.");
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isValidTimeZone(trimmed)) {
    throw new Error("timezone must be a valid IANA timezone.");
  }
  return trimmed;
}

function normalizeOptionalGraduationYear(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 2025 ||
    value > 2100
  ) {
    throw new Error("expected_graduation_year must be a valid four-digit year.");
  }
  return value;
}

function validateDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
) {
  if (startDate && endDate && compareDateOnly(endDate, startDate) < 0) {
    throw new Error(
      "Fourth-year end date cannot be earlier than fourth-year start date."
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const bodyResult = await parseStudentWorkspaceJsonBody<PatchBody>(request);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    const fourthYearStartDate = normalizeOptionalDate(body.fourth_year_start_date);
    const fourthYearEndDate = normalizeOptionalDate(body.fourth_year_end_date);
    const onboardingCompleted = normalizeOptionalBoolean(
      body.onboarding_completed
    );
    const timezone = normalizeOptionalTimeZone(body.timezone);
    const expectedGraduationYear = normalizeOptionalGraduationYear(
      body.expected_graduation_year
    );
    validateDateRange(fourthYearStartDate, fourthYearEndDate);

    await ensureStudentWorkspaceProfile(user.id);

    const profile = await updateStudentWorkspaceProfile(user.id, {
      display_name: normalizeNullableString(body.display_name),
      med_school_year: normalizeNullableString(body.med_school_year),
      target_specialty: normalizeNullableString(body.target_specialty),
      timezone,
      expected_graduation_year: expectedGraduationYear,
      fourth_year_start_date: fourthYearStartDate,
      fourth_year_end_date: fourthYearEndDate,
      onboarding_completed: onboardingCompleted,
      onboarding_step: normalizeNullableString(body.onboarding_step),
    });

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update onboarding state" },
      { status: 500 }
    );
  }
}
