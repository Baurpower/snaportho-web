import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { requireRotationSettingsAccess } from "@/lib/workspace/rotations/permissions";
import {
  createRotationTrack,
  getAcademicStartYear,
  listRotationTracks,
  parseAcademicYearStart,
} from "@/lib/workspace/rotations/tracks";

type CreateTrackBody = {
  academicYearStart?: number | string | null;
  name?: string | null;
  description?: string | null;
  targetPgyYear?: number | null;
  sortOrder?: number | null;
};

function isValidTargetPgyYear(value: unknown): value is number | null | undefined {
  if (value === null || value === undefined) return true;
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

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
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const access = await requireRotationSettingsAccess({
      supabase,
      userId: user.id,
      programId: activeMembership.program_id,
      level: "read",
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error ?? "You do not have access to these rotation tracks." },
        { status: access.status }
      );
    }

    const academicYearStart =
      parseAcademicYearStart(request.nextUrl.searchParams.get("academicYearStart")) ??
      getAcademicStartYear();

    const items = await listRotationTracks(supabase, {
      programId: activeMembership.program_id,
      academicYearStart,
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load rotation tracks",
      },
      { status: 500 }
    );
  }
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
        { error: access.error ?? "You do not have permission to manage rotation tracks." },
        { status: access.status }
      );
    }

    const body = (await request.json().catch(() => null)) as CreateTrackBody | null;

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

    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }

    if (!isValidTargetPgyYear(body.targetPgyYear)) {
      return NextResponse.json(
        { error: "targetPgyYear must be null or between 1 and 5." },
        { status: 400 }
      );
    }

    const item = await createRotationTrack(supabase, activeMembership.program_id, {
      academicYearStart,
      name: body.name,
      description: body.description ?? null,
      targetPgyYear: body.targetPgyYear ?? null,
      sortOrder:
        typeof body.sortOrder === "number" && Number.isInteger(body.sortOrder)
          ? body.sortOrder
          : 0,
      createdBy: user.id,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create rotation track",
      },
      { status: 500 }
    );
  }
}
