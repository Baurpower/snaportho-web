import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { requireRotationSettingsAccess } from "@/lib/workspace/rotations/permissions";
import {
  getAcademicStartYear,
  getRotationSettingsOverviewData,
  parseAcademicYearStart,
} from "@/lib/workspace/rotations/tracks";

export async function GET(request: NextRequest) {
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
        {
          program: null,
          academicYearStart: null,
          academicYearLabel: null,
          members: [],
          rotations: [],
          tracks: [],
          trackBlocks: [],
          trackMemberships: [],
          assignments: [],
          permissions: {
            canManageRotationSettings: false,
          },
        },
        { status: 200 }
      );
    }

    const access = await requireRotationSettingsAccess({
      supabase,
      userId: user.id,
      programId: activeMembership.program_id,
      level: "read",
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error ?? "You do not have access to these rotation settings." },
        { status: access.status }
      );
    }

    const requestedAcademicYearStart = request.nextUrl.searchParams.get("academicYearStart");
    const academicYearStart =
      parseAcademicYearStart(requestedAcademicYearStart) ?? getAcademicStartYear();

    const payload = await getRotationSettingsOverviewData(supabase, {
      programId: activeMembership.program_id,
      academicYearStart,
      canManageRotationSettings: access.canManageRotationSettings,
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load rotation settings overview",
      },
      { status: 500 }
    );
  }
}
