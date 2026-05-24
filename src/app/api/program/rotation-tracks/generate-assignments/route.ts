import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { requireRotationSettingsAccess } from "@/lib/workspace/rotations/permissions";
import {
  generateRotationAssignmentsFromTracks,
  parseAcademicYearStart,
  type GenerateAssignmentsMode,
} from "@/lib/workspace/rotations/tracks";

type GenerateAssignmentsBody = {
  academicYearStart?: number | string | null;
  trackIds?: string[] | null;
  mode?: GenerateAssignmentsMode;
};

function isValidMode(value: unknown): value is GenerateAssignmentsMode {
  return value === "overwrite_generated" || value === "fill_gaps";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const activeMembership = await getActiveMembershipForUser(user.id);

    if (!activeMembership?.program_id) {
      return NextResponse.json(
        { error: "No active program membership found." },
        { status: 403 }
      );
    }

    const access = await requireRotationSettingsAccess({
      supabase,
      userId: user.id,
      programId: activeMembership.program_id,
      level: "edit",
    });

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.error ?? "You do not have permission to generate rotation assignments.",
        },
        { status: access.status }
      );
    }

    const body = (await request.json().catch(() => null)) as GenerateAssignmentsBody | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const academicYearStart = parseAcademicYearStart(body.academicYearStart);

    if (academicYearStart === null) {
      return NextResponse.json(
        { error: "academicYearStart must be a valid 4-digit integer." },
        { status: 400 }
      );
    }

    if (!isValidMode(body.mode)) {
      return NextResponse.json(
        { error: "mode must be either overwrite_generated or fill_gaps." },
        { status: 400 }
      );
    }

    if (
      body.trackIds !== undefined &&
      body.trackIds !== null &&
      (!Array.isArray(body.trackIds) ||
        body.trackIds.some((trackId) => typeof trackId !== "string" || !trackId.trim()))
    ) {
      return NextResponse.json(
        { error: "trackIds must be an array of non-empty strings when provided." },
        { status: 400 }
      );
    }

    const summary = await generateRotationAssignmentsFromTracks(supabase, {
      programId: activeMembership.program_id,
      academicYearStart,
      trackIds: body.trackIds ?? undefined,
      mode: body.mode,
      createdBy: user.id,
    });

    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate rotation assignments",
      },
      { status: 500 }
    );
  }
}
