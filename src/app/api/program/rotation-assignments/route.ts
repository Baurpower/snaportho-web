import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";

type PostBody = {
  membershipId?: string | null;
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

async function ensureMembershipInProgram(
  membershipId: string,
  programId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("program_memberships")
    .select("id, program_id, roster_id, display_name, grad_year, role, user_id")
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
    .select("id, program_id, name, short_name, category, color")
    .eq("id", rotationId)
    .eq("program_id", programId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate rotation: ${error.message}`);
  }

  return data;
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

    const body = (await request.json().catch(() => null)) as PostBody | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const membershipId = normalizeNullableString(body.membershipId);
    const rotationId = normalizeNullableString(body.rotationId);
    const siteLabel = normalizeNullableString(body.siteLabel);
    const teamLabel = normalizeNullableString(body.teamLabel);
    const notes = normalizeNullableString(body.notes);

    if (!membershipId) {
      return NextResponse.json(
        { error: "membershipId is required." },
        { status: 400 }
      );
    }

    if (!rotationId) {
      return NextResponse.json(
        { error: "rotationId is required." },
        { status: 400 }
      );
    }

    if (!isValidDate(body.startDate) || !isValidDate(body.endDate)) {
      return NextResponse.json(
        { error: "startDate and endDate must be YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (body.startDate > body.endDate) {
      return NextResponse.json(
        { error: "startDate must be on or before endDate." },
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

    const insertPayload = {
  program_id: activeMembership.program_id,
  program_membership_id: membership.id,
  roster_id: membership.roster_id ?? null,
  rotation_id: rotation.id,
  start_date: body.startDate,
  end_date: body.endDate,
  site_label: siteLabel ?? null,
  team_label: teamLabel ?? null,
  notes: notes ?? null,
  created_by: user.id,
};

    const { data: inserted, error: insertError } = await supabase
      .from("rotation_assignments")
      .insert(insertPayload)
      .select(`
        id,
        program_membership_id,
        roster_id,
        start_date,
        end_date,
        site_label,
        team_label,
        notes
      `)
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create rotation assignment: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Rotation assignment created successfully.",
        assignment: {
          id: inserted.id,
          membershipId: inserted.program_membership_id ?? null,
          rosterId: inserted.roster_id ?? null,
          memberName: membership.display_name ?? null,
          gradYear: membership.grad_year ?? null,
          role: membership.role ?? null,
          userId: membership.user_id ?? null,
          startDate: inserted.start_date ?? null,
          endDate: inserted.end_date ?? null,
          siteLabel: inserted.site_label ?? null,
          teamLabel: inserted.team_label ?? null,
          notes: inserted.notes ?? null,
          rotation: {
            id: rotation.id,
            name: rotation.name ?? null,
            short_name: rotation.short_name ?? null,
            category: rotation.category ?? null,
            color: rotation.color ?? null,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create rotation assignment.",
      },
      { status: 500 }
    );
  }
}