import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { requireRotationSettingsAccess } from "@/lib/workspace/rotations/permissions";
import {
  deleteRotationTrack,
  getRotationTrackById,
  updateRotationTrack,
} from "@/lib/workspace/rotations/tracks";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PatchTrackBody = {
  name?: string;
  description?: string | null;
  targetPgyYear?: number | null;
  sortOrder?: number | null;
  isActive?: boolean;
};

function isValidTargetPgyYear(value: unknown): value is number | null | undefined {
  if (value === null || value === undefined) return true;
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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
        { error: access.error ?? "You do not have permission to manage rotation tracks." },
        { status: access.status }
      );
    }

    const existingTrack = await getRotationTrackById(supabase, {
      programId: activeMembership.program_id,
      trackId,
    });

    if (!existingTrack) {
      return NextResponse.json({ error: "Rotation track not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as PatchTrackBody | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (!isValidTargetPgyYear(body.targetPgyYear)) {
      return NextResponse.json(
        { error: "targetPgyYear must be null or between 1 and 5." },
        { status: 400 }
      );
    }

    if (
      body.sortOrder !== undefined &&
      (typeof body.sortOrder !== "number" || !Number.isInteger(body.sortOrder))
    ) {
      return NextResponse.json(
        { error: "sortOrder must be an integer when provided." },
        { status: 400 }
      );
    }

    if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean when provided." },
        { status: 400 }
      );
    }

    const item = await updateRotationTrack(
      supabase,
      activeMembership.program_id,
      trackId,
      {
        name: body.name,
        description: body.description,
        targetPgyYear: body.targetPgyYear,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
        updatedBy: user.id,
      }
    );

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update rotation track";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
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
        { error: access.error ?? "You do not have permission to manage rotation tracks." },
        { status: access.status }
      );
    }

    const existingTrack = await getRotationTrackById(supabase, {
      programId: activeMembership.program_id,
      trackId,
    });

    if (!existingTrack) {
      return NextResponse.json({ error: "Rotation track not found." }, { status: 404 });
    }

    await deleteRotationTrack(supabase, activeMembership.program_id, trackId);

    return NextResponse.json({ item: { id: trackId } }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete rotation track";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
