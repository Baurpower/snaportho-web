import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { createHash, randomBytes } from "node:crypto";

function generateInviteToken() {
  return randomBytes(32).toString("base64url");
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenHint(token: string) {
  return token.slice(-6);
}

type RosterRow = {
  id: string;
  program_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  grad_year: number;
  email: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const userSupabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedUserId = process.env.INVITE_ADMIN_USER_ID;
    if (!allowedUserId) {
      return NextResponse.json(
        { error: "Missing INVITE_ADMIN_USER_ID" },
        { status: 500 }
      );
    }

    if (user.id !== allowedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const programId = body.programId as string | undefined;
    const expiresInDays = Number(body.expiresInDays ?? 30);

    if (!programId) {
      return NextResponse.json(
        { error: "programId is required" },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

    const adminSupabase = createAdminClient();

    const { data: rosterRows, error: rosterError } = await adminSupabase
      .from("program_roster")
      .select("id, program_id, first_name, last_name, full_name, grad_year, email")
      .eq("program_id", programId)
      .order("grad_year", { ascending: false })
      .order("last_name", { ascending: true });

    if (rosterError) {
      return NextResponse.json(
        { error: rosterError.message, step: "load roster" },
        { status: 500 }
      );
    }

    const roster = (rosterRows ?? []) as RosterRow[];

    if (roster.length === 0) {
      return NextResponse.json({
        ok: true,
        createdCount: 0,
        skippedCount: 0,
        invites: [],
        message: "No roster rows found for this program",
      });
    }

    const rosterIds = roster.map((r) => r.id);

    const { data: existingInvites, error: existingInvitesError } =
      await adminSupabase
        .from("program_invites")
        .select("id, roster_id, claimed_at, revoked_at, expires_at")
        .in("roster_id", rosterIds);

    if (existingInvitesError) {
      return NextResponse.json(
        { error: existingInvitesError.message, step: "load existing invites" },
        { status: 500 }
      );
    }

    const now = new Date();

    const activeInviteRosterIds = new Set(
      (existingInvites ?? [])
        .filter((invite) => {
          if (invite.claimed_at) return false;
          if (invite.revoked_at) return false;
          if (!invite.expires_at) return true;
          return new Date(invite.expires_at) > now;
        })
        .map((invite) => invite.roster_id)
    );

    const rowsToCreate = roster.filter((person) => !activeInviteRosterIds.has(person.id));

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const insertRows: {
      program_id: string;
      roster_id: string;
      token_hash: string;
      raw_hint: string;
      expires_at: string;
      created_by: string;
    }[] = [];

    const rawInvites: {
      rosterId: string;
      name: string;
      gradYear: number;
      email: string | null;
      inviteLink: string;
      expiresAt: string;
    }[] = [];

    for (const person of rowsToCreate) {
      const rawToken = generateInviteToken();
      const tokenHash = hashInviteToken(rawToken);

      insertRows.push({
        program_id: person.program_id,
        roster_id: person.id,
        token_hash: tokenHash,
        raw_hint: tokenHint(rawToken),
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      });

      rawInvites.push({
        rosterId: person.id,
        name: person.full_name,
        gradYear: person.grad_year,
        email: person.email,
        inviteLink: `${baseUrl}/join?token=${encodeURIComponent(rawToken)}`,
        expiresAt: expiresAt.toISOString(),
      });
    }

    if (insertRows.length > 0) {
      const { error: insertError } = await adminSupabase
        .from("program_invites")
        .insert(insertRows);

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message, step: "insert invites" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      createdCount: insertRows.length,
      skippedCount: roster.length - insertRows.length,
      invites: rawInvites,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        step: "catch",
      },
      { status: 500 }
    );
  }
}