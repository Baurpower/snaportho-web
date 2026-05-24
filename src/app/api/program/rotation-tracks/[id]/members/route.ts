import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { requireRotationSettingsAccess } from "@/lib/workspace/rotations/permissions";
import {
  getRotationTrackById,
  listRotationTrackMemberships,
  replaceRotationTrackMemberships,
} from "@/lib/workspace/rotations/tracks";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PutMembersBody = {
  rosterIds?: string[];
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: trackId } = await context.params;
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
        { error: access.error ?? "You do not have access to these track memberships." },
        { status: access.status }
      );
    }

    const track = await getRotationTrackById(supabase, {
      programId: activeMembership.program_id,
      trackId,
    });

    if (!track) {
      return NextResponse.json({ error: "Rotation track not found." }, { status: 404 });
    }

    const items = await listRotationTrackMemberships(supabase, {
      programId: activeMembership.program_id,
      trackId,
      effectiveDate: `${track.academicYearStart}-07-01`,
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load rotation track memberships",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id: trackId } = await context.params;
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
        { error: access.error ?? "You do not have permission to manage track memberships." },
        { status: access.status }
      );
    }

    const track = await getRotationTrackById(supabase, {
      programId: activeMembership.program_id,
      trackId,
    });

    if (!track) {
      return NextResponse.json({ error: "Rotation track not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as PutMembersBody | null;

    if (!body || !Array.isArray(body.rosterIds)) {
      return NextResponse.json({ error: "rosterIds is required." }, { status: 400 });
    }

    if (body.rosterIds.some((rosterId) => typeof rosterId !== "string" || !rosterId.trim())) {
      return NextResponse.json(
        { error: "Each rosterId must be a non-empty string." },
        { status: 400 }
      );
    }

    const items = await replaceRotationTrackMemberships(
      supabase,
      activeMembership.program_id,
      {
        trackId,
        rosterIds: body.rosterIds,
      }
    );

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save rotation track memberships",
      },
      { status: 500 }
    );
  }
}
