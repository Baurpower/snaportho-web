import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashInviteToken } from "@/lib/invites";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const tokenHash = hashInviteToken(token);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("program_invites")
      .select(`
        id,
        program_id,
        roster_id,
        claimed_at,
        revoked_at,
        expires_at,
        program_roster (
          id,
          first_name,
          last_name,
          full_name,
          grad_year,
          email
        ),
        programs (
          id,
          name,
          institution_name,
          city,
          state,
          timezone
        )
      `)
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (data.revoked_at) {
      return NextResponse.json({ error: "Invite has been revoked" }, { status: 410 });
    }

    if (data.claimed_at) {
      return NextResponse.json({ error: "Invite has already been claimed" }, { status: 410 });
    }

    if (data.expires_at && new Date(data.expires_at) <= new Date()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
    }

    const roster = Array.isArray(data.program_roster)
      ? data.program_roster[0]
      : data.program_roster;

    const program = Array.isArray(data.programs)
      ? data.programs[0]
      : data.programs;

    return NextResponse.json({
      ok: true,
      invite: {
        inviteId: data.id,
        rosterId: data.roster_id,
        programId: data.program_id,
        fullName: roster?.full_name ?? null,
        firstName: roster?.first_name ?? null,
        lastName: roster?.last_name ?? null,
        gradYear: roster?.grad_year ?? null,
        email: roster?.email ?? null,
        program: program
          ? {
              id: program.id,
              name: program.name,
              institutionName: program.institution_name,
              city: program.city,
              state: program.state,
              timezone: program.timezone,
            }
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}