import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";

type PostBody = {
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

async function ensureRosterByMembershipInProgram(
  membershipId: string,
  programId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("program_roster")
    .select(`
      id,
      program_id,
      full_name,
      first_name,
      last_name,
      grad_year,
      role,
      program_membership_id
    `)
    .eq("program_membership_id", membershipId)
    .eq("program_id", programId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate roster: ${error.message}`);
  }

  return data;
}

async function ensureRosterInProgram(rosterId: string, programId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("program_roster")
    .select(`
      id,
      program_id,
      full_name,
      first_name,
      last_name,
      grad_year,
      role,
      program_membership_id
    `)
    .eq("id", rosterId)
    .eq("program_id", programId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate roster: ${error.message}`);
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

function getRosterDisplayName(roster: {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
}) {
  const fallbackName = [roster.first_name, roster.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return roster.full_name ?? (fallbackName || null);
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
    const rosterId = normalizeNullableString(body.rosterId);
    const rotationId = normalizeNullableString(body.rotationId);
    const siteLabel = normalizeNullableString(body.siteLabel);
    const teamLabel = normalizeNullableString(body.teamLabel);
    const notes = normalizeNullableString(body.notes);

    if (!rosterId && !membershipId) {
      return NextResponse.json(
        { error: "rosterId is required (membershipId accepted for legacy compatibility)." },
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

    const roster = rosterId
      ? await ensureRosterInProgram(rosterId, activeMembership.program_id)
      : membershipId
      ? await ensureRosterByMembershipInProgram(
          membershipId,
          activeMembership.program_id
        )
      : null;

    if (!roster) {
      return NextResponse.json(
        { error: "Resident roster record does not belong to this program." },
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
      roster_id: roster.id,
      program_membership_id: roster.program_membership_id ?? null,
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
          membershipId: inserted.roster_id ?? null,
          programMembershipId: inserted.program_membership_id ?? null,
          rosterId: inserted.roster_id ?? null,
          memberName: getRosterDisplayName(roster),
          gradYear: roster.grad_year ?? null,
          role: roster.role ?? null,
          userId: null,
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const activeMembership = await getActiveMembershipForUser(user.id);

    if (!activeMembership?.program_id) {
      return NextResponse.json({ assignments: [] }, { status: 200 });
    }

    const searchParams = request.nextUrl.searchParams;
    const monthStart = searchParams.get("monthStart");
    const monthEnd = searchParams.get("monthEnd");

    if (!monthStart || !monthEnd) {
      return NextResponse.json(
        { error: "monthStart and monthEnd are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("rotation_assignments")
      .select(`
        id,
        program_id,
        roster_id,
        program_membership_id,
        rotation_id,
        start_date,
        end_date,
        site_label,
        team_label,
        notes,
        rotations (
          id,
          name,
          short_name,
          category,
          color
        )
      `)
      .eq("program_id", activeMembership.program_id)
      .lte("start_date", monthEnd)
      .gte("end_date", monthStart)
      .order("start_date", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const assignments = (data ?? []).map((row) => {
      const rotation = Array.isArray(row.rotations)
        ? row.rotations[0]
        : row.rotations;

      return {
        id: row.id,
        rosterId: row.roster_id,
        // Compatibility field: `membershipId` mirrors roster identity for older clients.
        membershipId: row.roster_id,
        programMembershipId: row.program_membership_id,
        rotationId: row.rotation_id,
        startDate: row.start_date,
        endDate: row.end_date,
        siteLabel: row.site_label,
        teamLabel: row.team_label,
        notes: row.notes,
        rotation: rotation
          ? {
              id: rotation.id,
              name: rotation.name,
              shortName: rotation.short_name,
              category: rotation.category,
              color: rotation.color,
            }
          : null,
      };
    });

    return NextResponse.json({ assignments }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load rotation assignments.",
      },
      { status: 500 }
    );
  }
}
