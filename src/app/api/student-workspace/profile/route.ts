import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  createStudentWorkspaceProfile,
  ensureStudentWorkspaceProfile,
  getStudentWorkspaceProfileByUserId,
  updateStudentWorkspaceProfile,
} from "@/lib/student-workspace/profile";
import { isValidTimeZone } from "@/lib/student-workspace/date";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";

type PatchBody = {
  timezone?: string | null;
  expected_graduation_year?: number | null;
};

export async function GET() {
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

    const profile = await getStudentWorkspaceProfileByUserId(user.id);

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load profile",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
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

    const existing = await getStudentWorkspaceProfileByUserId(user.id);
    if (existing) {
      return NextResponse.json({ profile: existing }, { status: 200 });
    }

    const profile = await createStudentWorkspaceProfile({
      user_id: user.id,
      last_opened_at: new Date().toISOString(),
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create profile",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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

    const { timezone, expected_graduation_year } = bodyResult.data;
    if (
      timezone !== undefined &&
      timezone !== null &&
      (typeof timezone !== "string" || !isValidTimeZone(timezone.trim()))
    ) {
      return NextResponse.json(
        { error: "timezone must be a valid IANA timezone." },
        { status: 400 }
      );
    }

    if (
      expected_graduation_year !== undefined &&
      expected_graduation_year !== null &&
      (!Number.isInteger(expected_graduation_year) ||
        expected_graduation_year < 2025 ||
        expected_graduation_year > 2100)
    ) {
      return NextResponse.json(
        { error: "expected_graduation_year must be a valid four-digit year." },
        { status: 400 }
      );
    }

    await ensureStudentWorkspaceProfile(user.id);

    const profile = await updateStudentWorkspaceProfile(user.id, {
      timezone:
        timezone === undefined
          ? undefined
          : timezone === null
            ? null
            : timezone.trim(),
      expected_graduation_year:
        expected_graduation_year === undefined
          ? undefined
          : expected_graduation_year,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
