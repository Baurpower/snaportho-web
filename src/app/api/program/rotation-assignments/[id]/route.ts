import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PatchBody = {
  membershipId?: string | null;
  rosterId?: string | null;
  rotationId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  siteLabel?: string | null;
  teamLabel?: string | null;
  notes?: string | null;
};

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

async function getAssignmentForProgram(
  assignmentId: string,
  programId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rotation_assignments")
    .select(`
      id,
      program_membership_id,
      roster_id,
      rotation_id,
      start_date,
      end_date,
      site_label,
      team_label,
      notes,
      program_memberships!inner (
        id,
        program_id,
        display_name,
        grad_year,
        role,
        user_id
      ),
      rotations (
        id,
        name,
        short_name,
        category,
        color
      )
    `)
    .eq("id", assignmentId)
    .eq("program_memberships.program_id", programId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load rotation assignment: ${error.message}`);
  }

  return data;
}

async function ensureMembershipInProgram(
  membershipId: string,
  programId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("program_memberships")
    .select("id, program_id, roster_id")
    .eq("id", membershipId)
    .eq("program_id", programId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate membership: ${error.message}`);
  }

  return data;
}

async function ensureRotationInProgram(rotationId: string, programId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rotations")
    .select("id, program_id")
    .eq("id", rotationId)
    .eq("program_id", programId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate rotation: ${error.message}`);
  }

  return data;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: assignmentId } = await context.params;

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

    const assignment = await getAssignmentForProgram(
      assignmentId,
      activeMembership.program_id
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "Rotation assignment not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        assignment: {
          id: assignment.id,
          membershipId: assignment.program_membership_id ?? null,
          rosterId: assignment.roster_id ?? null,
          rotationId: assignment.rotation_id ?? null,
          startDate: assignment.start_date ?? null,
          endDate: assignment.end_date ?? null,
          siteLabel: assignment.site_label ?? null,
          teamLabel: assignment.team_label ?? null,
          notes: assignment.notes ?? null,
          member: Array.isArray(assignment.program_memberships)
            ? assignment.program_memberships[0] ?? null
            : assignment.program_memberships ?? null,
          rotation: Array.isArray(assignment.rotations)
            ? assignment.rotations[0] ?? null
            : assignment.rotations ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load rotation assignment.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: assignmentId } = await context.params;

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

    const existingAssignment = await getAssignmentForProgram(
      assignmentId,
      activeMembership.program_id
    );

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Rotation assignment not found." },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => null)) as PatchBody | null;

    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    const membershipId = normalizeNullableString(body.membershipId);
    const rosterId = normalizeNullableString(body.rosterId);
    const rotationId = normalizeNullableString(body.rotationId);
    const siteLabel = normalizeNullableString(body.siteLabel);
    const teamLabel = normalizeNullableString(body.teamLabel);
    const notes = normalizeNullableString(body.notes);

    if (membershipId !== undefined) {
      if (membershipId === null) {
        return NextResponse.json(
          { error: "membershipId cannot be null." },
          { status: 400 }
        );
      }

      const membership = await ensureMembershipInProgram(
        membershipId,
        activeMembership.program_id
      );

      if (!membership) {
        return NextResponse.json(
          { error: "membershipId does not belong to this program." },
          { status: 400 }
        );
      }

      updates.program_membership_id = membership.id;
      updates.roster_id = membership.roster_id ?? null;
    }

    if (rosterId !== undefined && membershipId === undefined) {
      updates.roster_id = rosterId;
    }

    if (rotationId !== undefined) {
      if (rotationId === null) {
        return NextResponse.json(
          { error: "rotationId cannot be null." },
          { status: 400 }
        );
      }

      const rotation = await ensureRotationInProgram(
        rotationId,
        activeMembership.program_id
      );

      if (!rotation) {
        return NextResponse.json(
          { error: "rotationId does not belong to this program." },
          { status: 400 }
        );
      }

      updates.rotation_id = rotation.id;
    }

    if (body.startDate !== undefined) {
      if (body.startDate !== null && !isValidDate(body.startDate)) {
        return NextResponse.json(
          { error: "startDate must be YYYY-MM-DD." },
          { status: 400 }
        );
      }
      updates.start_date = body.startDate;
    }

    if (body.endDate !== undefined) {
      if (body.endDate !== null && !isValidDate(body.endDate)) {
        return NextResponse.json(
          { error: "endDate must be YYYY-MM-DD." },
          { status: 400 }
        );
      }
      updates.end_date = body.endDate;
    }

    if (siteLabel !== undefined) updates.site_label = siteLabel;
    if (teamLabel !== undefined) updates.team_label = teamLabel;
    if (notes !== undefined) updates.notes = notes;

    const nextStartDate = (updates.start_date ??
      existingAssignment.start_date) as string | null;
    const nextEndDate = (updates.end_date ??
      existingAssignment.end_date) as string | null;

    if (!nextStartDate || !nextEndDate) {
      return NextResponse.json(
        { error: "Rotation assignments must have both startDate and endDate." },
        { status: 400 }
      );
    }

    if (nextStartDate > nextEndDate) {
      return NextResponse.json(
        { error: "startDate must be on or before endDate." },
        { status: 400 }
      );
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields were provided to update." },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("rotation_assignments")
      .update(updates)
      .eq("id", assignmentId)
      .select(`
        id,
        program_membership_id,
        roster_id,
        rotation_id,
        start_date,
        end_date,
        site_label,
        team_label,
        notes
      `)
      .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        {
          error: `Failed to update rotation assignment: ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Rotation assignment updated successfully.",
        assignment: {
          id: updated?.id ?? assignmentId,
          membershipId: updated?.program_membership_id ?? null,
          rosterId: updated?.roster_id ?? null,
          rotationId: updated?.rotation_id ?? null,
          startDate: updated?.start_date ?? null,
          endDate: updated?.end_date ?? null,
          siteLabel: updated?.site_label ?? null,
          teamLabel: updated?.team_label ?? null,
          notes: updated?.notes ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update rotation assignment.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id: assignmentId } = await context.params;

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

    const existingAssignment = await getAssignmentForProgram(
      assignmentId,
      activeMembership.program_id
    );

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Rotation assignment not found." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("rotation_assignments")
      .delete()
      .eq("id", assignmentId);

    if (deleteError) {
      return NextResponse.json(
        {
          error: `Failed to delete rotation assignment: ${deleteError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Rotation assignment deleted successfully.",
        deletedId: assignmentId,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete rotation assignment.",
      },
      { status: 500 }
    );
  }
}