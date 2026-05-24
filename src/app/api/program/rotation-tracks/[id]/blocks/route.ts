import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { requireRotationSettingsAccess } from "@/lib/workspace/rotations/permissions";
import {
  getRotationTrackById,
  listRotationTrackBlocks,
  replaceRotationTrackBlocks,
} from "@/lib/workspace/rotations/tracks";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PutBlocksBody = {
  blocks?: Array<{
    id?: string;
    rotationId?: string;
    startDate?: string;
    endDate?: string;
    siteLabel?: string | null;
    teamLabel?: string | null;
    notes?: string | null;
    sortOrder?: number | null;
  }>;
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
        { error: access.error ?? "You do not have access to these track blocks." },
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

    const items = await listRotationTrackBlocks(supabase, {
      programId: activeMembership.program_id,
      trackId,
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load rotation track blocks",
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
        { error: access.error ?? "You do not have permission to manage track blocks." },
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

    const body = (await request.json().catch(() => null)) as PutBlocksBody | null;

    if (!body || !Array.isArray(body.blocks)) {
      return NextResponse.json({ error: "blocks is required." }, { status: 400 });
    }

    const malformedBlock = body.blocks.find(
      (block) =>
        typeof block.rotationId !== "string" ||
        !block.rotationId.trim() ||
        typeof block.startDate !== "string" ||
        typeof block.endDate !== "string" ||
        (block.sortOrder !== undefined &&
          block.sortOrder !== null &&
          (typeof block.sortOrder !== "number" || !Number.isInteger(block.sortOrder)))
    );

    if (malformedBlock) {
      return NextResponse.json(
        {
          error:
            "Each block must include rotationId, startDate, endDate, and an integer sortOrder when provided.",
        },
        { status: 400 }
      );
    }

    const items = await replaceRotationTrackBlocks(supabase, activeMembership.program_id, {
      trackId,
      blocks: body.blocks.map((block, index) => ({
        id: block.id,
        rotationId: block.rotationId!,
        startDate: block.startDate!,
        endDate: block.endDate!,
        siteLabel: block.siteLabel ?? null,
        teamLabel: block.teamLabel ?? null,
        notes: block.notes ?? null,
        sortOrder: block.sortOrder ?? index,
      })),
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save rotation track blocks",
      },
      { status: 500 }
    );
  }
}
