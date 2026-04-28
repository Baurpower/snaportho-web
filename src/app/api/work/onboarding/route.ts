import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashInviteToken } from "@/lib/invites";

type ProgramMode = "select" | "request";

type PostBody = {
  profile?: {
    fullName?: string | null;
    email?: string | null;
    pgyYear?: number | null;
    gradYear?: number | null;
  };
  programMode?: ProgramMode;
  selectedProgramId?: string | null;
  inviteToken?: string | null;
  requestedProgram?: {
    name?: string | null;
    institution?: string | null;
    city?: string | null;
    state?: string | null;
    notes?: string | null;
  };
};

type InvitePreview = {
  id: string;
  program_id: string;
  roster_id: string;
  claimed_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  program_roster:
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        full_name: string | null;
        grad_year: number | null;
        email: string | null;
      }
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        full_name: string | null;
        grad_year: number | null;
        email: string | null;
      }[]
    | null;
  programs:
    | {
        id: string;
        name: string | null;
        institution_name: string | null;
        city: string | null;
        state: string | null;
        timezone: string | null;
      }
    | {
        id: string;
        name: string | null;
        institution_name: string | null;
        city: string | null;
        state: string | null;
        timezone: string | null;
      }[]
    | null;
};

function getAcademicYearEnd(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 6 ? year + 1 : year;
}

function derivePgyYearFromGradYear(gradYear: number | null | undefined) {
  if (!gradYear) return null;

  const academicYearEnd = getAcademicYearEnd();
  const pgy = academicYearEnd - gradYear + 5;

  if (pgy < 1 || pgy > 10) return null;
  return pgy;
}

function deriveTrainingLevel(pgyYear: number | null | undefined) {
  if (!pgyYear || pgyYear < 1) return null;
  return `PGY-${pgyYear}`;
}

function normalizeNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function loadInviteByToken(token: string) {
  const adminSupabase = createAdminClient();
  const tokenHash = hashInviteToken(token);

  const { data, error } = await adminSupabase
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

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Invite not found.");

  const invite = data as InvitePreview;

  if (invite.revoked_at) {
    throw new Error("Invite has been revoked.");
  }

  if (invite.claimed_at) {
    throw new Error("Invite has already been claimed.");
  }

  if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
    throw new Error("Invite has expired.");
  }

  const roster = Array.isArray(invite.program_roster)
    ? invite.program_roster[0]
    : invite.program_roster;

  const program = Array.isArray(invite.programs)
    ? invite.programs[0]
    : invite.programs;

  if (!roster) throw new Error("Invite roster record not found.");
  if (!program) throw new Error("Invite program record not found.");

  return {
    inviteId: invite.id,
    programId: invite.program_id,
    rosterId: invite.roster_id,
    roster,
    program,
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const inviteToken = req.nextUrl.searchParams.get("inviteToken")?.trim() ?? null;

    const [
      { data: profile, error: profileError },
      { data: workspaceState, error: workspaceStateError },
      { data: membership, error: membershipError },
      { data: programs, error: programsError },
    ] = await Promise.all([
      supabase
        .from("user_profiles")
        .select(
          "full_name, email, training_level, institution, city, pgy_year, grad_year, is_profile_complete"
        )
        .eq("user_id", user.id)
        .maybeSingle(),

      supabase
        .from("workspace_user_state")
        .select("user_id, onboarding_completed, first_entered_at, last_entered_at")
        .eq("user_id", user.id)
        .maybeSingle(),

      supabase
        .from("program_memberships")
        .select("id, program_id, roster_id, role, grad_year, display_name, is_active, created_at")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("programs")
        .select("id, name, institution_name, city, state, timezone, is_active")
        .eq("is_active", true)
        .order("state", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (workspaceStateError) {
      return NextResponse.json(
        { error: workspaceStateError.message },
        { status: 500 }
      );
    }

    if (membershipError) {
      return NextResponse.json(
        { error: membershipError.message },
        { status: 500 }
      );
    }

    if (programsError) {
      return NextResponse.json({ error: programsError.message }, { status: 500 });
    }

    let inviteContext: null | {
      inviteToken: string;
      inviteId: string;
      rosterId: string;
      programId: string;
      rosterFullName: string | null;
      rosterEmail: string | null;
      rosterGradYear: number | null;
      program: {
        id: string;
        name: string | null;
        institutionName: string | null;
        city: string | null;
        state: string | null;
        timezone: string | null;
      };
    } = null;

    if (inviteToken) {
      const invite = await loadInviteByToken(inviteToken);

      inviteContext = {
        inviteToken,
        inviteId: invite.inviteId,
        rosterId: invite.rosterId,
        programId: invite.programId,
        rosterFullName: invite.roster.full_name ?? null,
        rosterEmail: invite.roster.email ?? null,
        rosterGradYear: invite.roster.grad_year ?? null,
        program: {
          id: invite.program.id,
          name: invite.program.name,
          institutionName: invite.program.institution_name,
          city: invite.program.city,
          state: invite.program.state,
          timezone: invite.program.timezone,
        },
      };
    }

    const resolvedGradYear = profile?.grad_year ?? membership?.grad_year ?? null;
    const resolvedPgyYear =
      profile?.pgy_year ?? derivePgyYearFromGradYear(resolvedGradYear);
    const resolvedTrainingLevel =
      profile?.training_level ?? deriveTrainingLevel(resolvedPgyYear);

    return NextResponse.json({
      profile: {
        fullName: profile?.full_name ?? user.user_metadata?.full_name ?? null,
        email: profile?.email ?? user.email ?? null,
        trainingLevel: resolvedTrainingLevel,
        institution: profile?.institution ?? null,
        city: profile?.city ?? null,
        pgyYear: resolvedPgyYear,
        gradYear: resolvedGradYear,
        isProfileComplete: profile?.is_profile_complete ?? false,
      },
      programs: (programs ?? []).map((program) => ({
        id: program.id,
        name: program.name,
        institutionName: program.institution_name,
        city: program.city ?? null,
        state: program.state ?? null,
        timezone: program.timezone ?? null,
      })),
      existingWorkspaceState: {
        onboardingCompleted: workspaceState?.onboarding_completed ?? false,
        selectedProgramId: membership?.program_id ?? null,
        membershipId: membership?.id ?? null,
      },
      inviteContext,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as PostBody;

    const fullName = body.profile?.fullName?.trim() ?? "";
    const email = body.profile?.email?.trim() || user.email || "";
    const inputPgyYear = normalizeNullableNumber(body.profile?.pgyYear);
    const inputGradYear = normalizeNullableNumber(body.profile?.gradYear);
    const programMode = body.programMode;
    const selectedProgramId = body.selectedProgramId ?? null;
    const inviteToken = body.inviteToken?.trim() ?? null;

    if (fullName.length < 2) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    if (email.length < 3) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    if (programMode !== "select" && programMode !== "request") {
      return NextResponse.json(
        { error: "Invalid program mode." },
        { status: 400 }
      );
    }

    if (programMode === "request") {
      return NextResponse.json(
        { error: "Program requests are not configured yet." },
        { status: 400 }
      );
    }

    if (!selectedProgramId) {
      return NextResponse.json(
        { error: "Please select a program." },
        { status: 400 }
      );
    }

    let inviteContext: Awaited<ReturnType<typeof loadInviteByToken>> | null = null;

    if (inviteToken) {
      inviteContext = await loadInviteByToken(inviteToken);

      if (inviteContext.programId !== selectedProgramId) {
        return NextResponse.json(
          { error: "Selected program does not match this invite." },
          { status: 400 }
        );
      }
    }

    const { data: selectedProgram, error: selectedProgramError } = await supabase
      .from("programs")
      .select("id, name, institution_name, city, state, timezone, is_active")
      .eq("id", selectedProgramId)
      .eq("is_active", true)
      .maybeSingle();

    if (selectedProgramError) {
      return NextResponse.json(
        { error: selectedProgramError.message },
        { status: 500 }
      );
    }

    if (!selectedProgram) {
      return NextResponse.json(
        { error: "Selected program was not found." },
        { status: 400 }
      );
    }

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("user_profiles")
      .select(
        "user_id, training_level, institution, city, country, subspecialty_interest, receive_emails, pgy_year, grad_year"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingProfileError) {
      return NextResponse.json(
        { error: existingProfileError.message },
        { status: 500 }
      );
    }

    const resolvedGradYear =
      inputGradYear ??
      inviteContext?.roster.grad_year ??
      existingProfile?.grad_year ??
      null;

    const resolvedPgyYear =
      derivePgyYearFromGradYear(resolvedGradYear) ??
      inputPgyYear ??
      existingProfile?.pgy_year ??
      null;

    const resolvedTrainingLevel =
      deriveTrainingLevel(resolvedPgyYear) ??
      existingProfile?.training_level ??
      null;

    const { error: profileUpsertError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          full_name: fullName,
          email,
          training_level: resolvedTrainingLevel,
          institution:
            selectedProgram.institution_name ??
            existingProfile?.institution ??
            null,
          city: selectedProgram.city ?? existingProfile?.city ?? null,
          country: existingProfile?.country ?? null,
          subspecialty_interest: existingProfile?.subspecialty_interest ?? null,
          receive_emails: existingProfile?.receive_emails ?? null,
          is_profile_complete: true,
          pgy_year: resolvedPgyYear,
          grad_year: resolvedGradYear,
        },
        { onConflict: "user_id" }
      );

    if (profileUpsertError) {
      return NextResponse.json(
        { error: profileUpsertError.message },
        { status: 500 }
      );
    }

    let membershipId: string | null = null;

    if (inviteContext) {
      const { data: rosterMembership, error: rosterMembershipError } =
        await adminSupabase
          .from("program_memberships")
          .select("id, user_id")
          .eq("program_id", inviteContext.programId)
          .eq("roster_id", inviteContext.rosterId)
          .maybeSingle();

      if (rosterMembershipError) {
        return NextResponse.json(
          { error: rosterMembershipError.message },
          { status: 500 }
        );
      }

      const membershipPayload = {
        program_id: inviteContext.programId,
        roster_id: inviteContext.rosterId,
        user_id: user.id,
        role: "resident",
        grad_year: resolvedGradYear ?? inviteContext.roster.grad_year ?? null,
        display_name: fullName,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (rosterMembership) {
        const { error: membershipUpdateError } = await adminSupabase
          .from("program_memberships")
          .update(membershipPayload)
          .eq("id", rosterMembership.id);

        if (membershipUpdateError) {
          return NextResponse.json(
            { error: membershipUpdateError.message },
            { status: 500 }
          );
        }

        membershipId = rosterMembership.id;
      } else {
        const { data: insertedMembership, error: membershipInsertError } =
          await adminSupabase
            .from("program_memberships")
            .insert({
              ...membershipPayload,
              start_date: new Date().toISOString().slice(0, 10),
              created_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (membershipInsertError) {
          return NextResponse.json(
            { error: membershipInsertError.message },
            { status: 500 }
          );
        }

        membershipId = insertedMembership.id;
      }
            if (!membershipId) {
        return NextResponse.json(
          { error: "Failed to resolve membership for invite claim." },
          { status: 500 }
        );
      }

      const { error: backfillAssignmentsError } = await adminSupabase
  .from("rotation_assignments")
  .update({
    program_membership_id: membershipId,
    updated_at: new Date().toISOString(),
  })
  .eq("program_id", inviteContext.programId)
  .eq("roster_id", inviteContext.rosterId)
  .is("program_membership_id", null);

      if (backfillAssignmentsError) {
        return NextResponse.json(
          { error: backfillAssignmentsError.message },
          { status: 500 }
        );
      }

      const { error: claimInviteError } = await adminSupabase
        .from("program_invites")
        .update({
          claimed_at: new Date().toISOString(),
        })
        .eq("id", inviteContext.inviteId);

      if (claimInviteError) {
        return NextResponse.json(
          { error: claimInviteError.message },
          { status: 500 }
        );
      }

      const { error: claimRosterError } = await adminSupabase
        .from("program_roster")
        .update({
          claimed_by_user_id: user.id,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", inviteContext.rosterId);

      if (claimRosterError) {
        return NextResponse.json(
          { error: claimRosterError.message },
          { status: 500 }
        );
      }
    } else {
      const { data: existingMembership, error: existingMembershipError } =
        await supabase
          .from("program_memberships")
          .select("id, program_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (existingMembershipError) {
        return NextResponse.json(
          { error: existingMembershipError.message },
          { status: 500 }
        );
      }

      if (existingMembership) {
        const { error: membershipUpdateError } = await supabase
          .from("program_memberships")
          .update({
            program_id: selectedProgramId,
            grad_year: resolvedGradYear,
            display_name: fullName,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingMembership.id);

        if (membershipUpdateError) {
          return NextResponse.json(
            { error: membershipUpdateError.message },
            { status: 500 }
          );
        }

        membershipId = existingMembership.id;
      } else {
        const { data: insertedMembership, error: membershipInsertError } =
          await supabase
            .from("program_memberships")
            .insert({
              program_id: selectedProgramId,
              user_id: user.id,
              role: "resident",
              grad_year: resolvedGradYear,
              display_name: fullName,
              is_active: true,
              start_date: new Date().toISOString().slice(0, 10),
            })
            .select("id")
            .single();

        if (membershipInsertError) {
          return NextResponse.json(
            { error: membershipInsertError.message },
            { status: 500 }
          );
        }

        membershipId = insertedMembership.id;
      }
    }

    const now = new Date().toISOString();

    const { data: existingWorkspaceState, error: workspaceStateLookupError } =
      await supabase
        .from("workspace_user_state")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (workspaceStateLookupError) {
      return NextResponse.json(
        { error: workspaceStateLookupError.message },
        { status: 500 }
      );
    }

    if (existingWorkspaceState) {
      const { error: workspaceUpdateError } = await supabase
        .from("workspace_user_state")
        .update({
          onboarding_completed: true,
          last_entered_at: now,
          updated_at: now,
        })
        .eq("user_id", user.id);

      if (workspaceUpdateError) {
        return NextResponse.json(
          { error: workspaceUpdateError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: workspaceInsertError } = await supabase
        .from("workspace_user_state")
        .insert({
          user_id: user.id,
          onboarding_completed: true,
          first_entered_at: now,
          last_entered_at: now,
          updated_at: now,
        });

      if (workspaceInsertError) {
        return NextResponse.json(
          { error: workspaceInsertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      selectedProgramId,
      membershipId,
      selectedProgram: {
        id: selectedProgram.id,
        name: selectedProgram.name,
        institutionName: selectedProgram.institution_name,
        city: selectedProgram.city ?? null,
        state: selectedProgram.state ?? null,
        timezone: selectedProgram.timezone ?? null,
      },
      inviteClaimed: !!inviteContext,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}