import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { requireRotationSettingsAccess } from "@/lib/workspace/rotations/permissions";
import {
  importRotationTracksFromYear,
  parseAcademicYearStart,
} from "@/lib/workspace/rotations/tracks";

type ImportTracksBody = {
  fromAcademicYearStart?: number | string | null;
  toAcademicYearStart?: number | string | null;
  copyMemberships?: boolean;
};

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
        { error: access.error ?? "You do not have permission to import rotation tracks." },
        { status: access.status }
      );
    }

    const body = (await request.json().catch(() => null)) as ImportTracksBody | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const fromAcademicYearStart = parseAcademicYearStart(body.fromAcademicYearStart);
    const toAcademicYearStart = parseAcademicYearStart(body.toAcademicYearStart);

    if (fromAcademicYearStart === null || toAcademicYearStart === null) {
      return NextResponse.json(
        { error: "fromAcademicYearStart and toAcademicYearStart must be valid 4-digit integers." },
        { status: 400 }
      );
    }

    if (fromAcademicYearStart === toAcademicYearStart) {
      return NextResponse.json(
        { error: "fromAcademicYearStart and toAcademicYearStart must be different." },
        { status: 400 }
      );
    }

    if (typeof body.copyMemberships !== "boolean") {
      return NextResponse.json(
        { error: "copyMemberships must be a boolean." },
        { status: 400 }
      );
    }

    const summary = await importRotationTracksFromYear(supabase, {
      programId: activeMembership.program_id,
      fromAcademicYearStart,
      toAcademicYearStart,
      copyMemberships: body.copyMemberships,
      createdBy: user.id,
    });

    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import rotation tracks",
      },
      { status: 500 }
    );
  }
}
