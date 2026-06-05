import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashInviteToken } from "@/lib/invites";
import {
  resolvePgyFromSources,
  resolveTrainingLevelFromSources,
} from "@/lib/workspace/pgy";

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
        claimed_by_user_id?: string | null;
        program_membership_id?: string | null;
      }
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        full_name: string | null;
        grad_year: number | null;
        email: string | null;
        claimed_by_user_id?: string | null;
        program_membership_id?: string | null;
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
        email,
        claimed_by_user_id,
        program_membership_id
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

  if (invite.revoked_at) throw new Error("Invite has been revoked.");
  if (invite.claimed_at) throw new Error("Invite has already been claimed.");
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
    const adminSupabase = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const inviteToken =
      req.nextUrl.searchParams.get("inviteToken")?.trim() ?? null;

    const [
      { data: profile, error: profileError },
      { data: workspaceState, error: workspaceStateError },
      { data: membership, error: membershipError },
      { data: programs, error: programsError },
    ] = await Promise.all([
      adminSupabase
        .from("user_profiles")
        .select(
          `
          full_name,
          email,
          training_level,
          institution,
          city,
          pgy_year,
          grad_year,
          is_profile_complete
        `
        )
        .eq("user_id", user.id)
        .maybeSingle(),

      adminSupabase
        .from("workspace_user_state")
        .select(
          `
          user_id,
          onboarding_completed,
          first_entered_at,
          last_entered_at
        `
        )
        .eq("user_id", user.id)
        .maybeSingle(),

      adminSupabase
        .from("program_memberships")
        .select(
          `
          id,
          program_id,
          role,
          grad_year,
          display_name,
          is_active,
          created_at
        `
        )
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      adminSupabase
        .from("programs")
        .select(
          `
          id,
          name,
          institution_name,
          city,
          state,
          timezone,
          is_active
        `
        )
        .eq("is_active", true)
        .order("state", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
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
      return NextResponse.json(
        { error: programsError.message },
        { status: 500 }
      );
    }

    let linkedRoster: {
      id: string;
      program_id: string;
      program_membership_id: string | null;
      claimed_by_user_id: string | null;
      claimed_at: string | null;
    } | null = null;

    if (membership?.id) {
      const { data: rosterLink, error: rosterLinkError } =
        await adminSupabase
          .from("program_roster")
          .select(
            `
            id,
            program_id,
            program_membership_id,
            claimed_by_user_id,
            claimed_at
          `
          )
          .eq("program_membership_id", membership.id)
          .eq("program_id", membership.program_id)
          .eq("claimed_by_user_id", user.id)
          .maybeSingle();

      if (rosterLinkError) {
        return NextResponse.json(
          { error: rosterLinkError.message },
          { status: 500 }
        );
      }

      linkedRoster = rosterLink;
    }

    const realOnboardingCompleted =
      !!membership?.id &&
      !!linkedRoster?.id &&
      linkedRoster.program_membership_id === membership.id &&
      linkedRoster.program_id === membership.program_id &&
      linkedRoster.claimed_by_user_id === user.id;

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

    const resolvedGradYear =
      profile?.grad_year ??
      membership?.grad_year ??
      inviteContext?.rosterGradYear ??
      null;

    const resolvedPgyYear = resolvePgyFromSources({
      gradYear: resolvedGradYear,
      storedPgyYear: profile?.pgy_year ?? null,
      trainingLevel: profile?.training_level ?? null,
    });

    const resolvedTrainingLevel = resolveTrainingLevelFromSources({
      gradYear: resolvedGradYear,
      storedPgyYear: profile?.pgy_year ?? null,
      trainingLevel: profile?.training_level ?? null,
    });

    return NextResponse.json({
      profile: {
        fullName:
          profile?.full_name ??
          inviteContext?.rosterFullName ??
          user.user_metadata?.full_name ??
          null,

        email:
          profile?.email ??
          inviteContext?.rosterEmail ??
          user.email ??
          null,

        trainingLevel: resolvedTrainingLevel,

        institution: profile?.institution ?? null,

        city: profile?.city ?? null,

        pgyYear: resolvedPgyYear,

        gradYear:
          resolvedGradYear ??
          inviteContext?.rosterGradYear ??
          null,

        isProfileComplete:
          profile?.is_profile_complete ?? false,
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
        onboardingCompleted: realOnboardingCompleted,

        selectedProgramId:
          inviteContext?.programId ??
          membership?.program_id ??
          null,

        membershipId:
          realOnboardingCompleted
            ? membership?.id ?? null
            : null,

        rosterId:
          realOnboardingCompleted
            ? linkedRoster?.id ?? null
            : null,

        storedOnboardingCompleted:
          workspaceState?.onboarding_completed ?? false,
      },

      inviteContext,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected server error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
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
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    if (email.length < 3) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (programMode !== "select") {
      return NextResponse.json({ error: "Invalid program mode." }, { status: 400 });
    }

    if (!selectedProgramId) {
      return NextResponse.json({ error: "Please select a program." }, { status: 400 });
    }

    if (!inviteToken) {
      return NextResponse.json(
        {
          error:
            "Workspace access requires a program invite. Please use your invite link or request access from your program administrator.",
        },
        { status: 403 }
      );
    }

    const inviteContext = await loadInviteByToken(inviteToken);

    if (inviteContext.programId !== selectedProgramId) {
      return NextResponse.json(
        { error: "Selected program does not match this invite." },
        { status: 400 }
      );
    }

    const { data: selectedProgram, error: selectedProgramError } =
      await adminSupabase
        .from("programs")
        .select("id, name, institution_name, city, state, timezone, is_active")
        .eq("id", selectedProgramId)
        .eq("is_active", true)
        .maybeSingle();

    if (selectedProgramError) {
      return NextResponse.json({ error: selectedProgramError.message }, { status: 500 });
    }

    if (!selectedProgram) {
      return NextResponse.json(
        { error: "Selected program was not found." },
        { status: 400 }
      );
    }

    const { data: rosterClaim, error: rosterClaimError } = await adminSupabase
      .from("program_roster")
      .select("id, program_id, claimed_by_user_id, program_membership_id")
      .eq("id", inviteContext.rosterId)
      .eq("program_id", inviteContext.programId)
      .maybeSingle();

    if (rosterClaimError) {
      return NextResponse.json({ error: rosterClaimError.message }, { status: 500 });
    }

    if (!rosterClaim) {
      return NextResponse.json({ error: "Roster record not found." }, { status: 404 });
    }

    if (
      rosterClaim.claimed_by_user_id &&
      rosterClaim.claimed_by_user_id !== user.id
    ) {
      return NextResponse.json(
        { error: "This roster spot has already been claimed by another account." },
        { status: 409 }
      );
    }

    const { data: existingProfile, error: existingProfileError } =
      await adminSupabase
        .from("user_profiles")
        .select(
          "user_id, training_level, institution, city, country, subspecialty_interest, receive_emails, pgy_year, grad_year"
        )
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingProfileError) {
      return NextResponse.json({ error: existingProfileError.message }, { status: 500 });
    }

    const resolvedGradYear =
      inputGradYear ??
      inviteContext.roster.grad_year ??
      existingProfile?.grad_year ??
      null;

    const resolvedPgyYear = resolvePgyFromSources({
      gradYear: resolvedGradYear,
      storedPgyYear: inputPgyYear ?? existingProfile?.pgy_year ?? null,
      trainingLevel: existingProfile?.training_level ?? null,
    });

    const resolvedTrainingLevel = resolveTrainingLevelFromSources({
      gradYear: resolvedGradYear,
      storedPgyYear: inputPgyYear ?? existingProfile?.pgy_year ?? null,
      trainingLevel: existingProfile?.training_level ?? null,
    });

    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const { error: profileUpsertError } = await adminSupabase
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          full_name: fullName,
          email,
          training_level: resolvedTrainingLevel,
          institution:
            selectedProgram.institution_name ?? existingProfile?.institution ?? null,
          city: selectedProgram.city ?? existingProfile?.city ?? null,
          country: existingProfile?.country ?? null,
          subspecialty_interest:
            existingProfile?.subspecialty_interest ?? null,
          receive_emails: existingProfile?.receive_emails ?? null,
          is_profile_complete: true,
          pgy_year: resolvedPgyYear,
          grad_year: resolvedGradYear,
        },
        { onConflict: "user_id" }
      );

    if (profileUpsertError) {
      return NextResponse.json({ error: profileUpsertError.message }, { status: 500 });
    }

    let membershipId: string | null = rosterClaim.program_membership_id ?? null;

    if (membershipId) {
      const { data: existingLinkedMembership, error: linkedMembershipError } =
        await adminSupabase
          .from("program_memberships")
          .select("id, user_id, program_id")
          .eq("id", membershipId)
          .maybeSingle();

      if (linkedMembershipError) {
        return NextResponse.json({ error: linkedMembershipError.message }, { status: 500 });
      }

      if (
        existingLinkedMembership?.user_id &&
        existingLinkedMembership.user_id !== user.id
      ) {
        return NextResponse.json(
          { error: "This roster spot is already linked to another account." },
          { status: 409 }
        );
      }

      const { error: updateLinkedMembershipError } = await adminSupabase
        .from("program_memberships")
        .update({
          user_id: user.id,
          program_id: inviteContext.programId,
          role: "resident",
          grad_year: resolvedGradYear ?? inviteContext.roster.grad_year ?? null,
          display_name: fullName,
          is_active: true,
          start_date: today,
          updated_at: now,
        })
        .eq("id", membershipId);

      if (updateLinkedMembershipError) {
        return NextResponse.json(
          { error: updateLinkedMembershipError.message },
          { status: 500 }
        );
      }
    } else {
      const { data: existingUserMembership, error: existingUserMembershipError } =
        await adminSupabase
          .from("program_memberships")
          .select("id")
          .eq("user_id", user.id)
          .eq("program_id", inviteContext.programId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (existingUserMembershipError) {
        return NextResponse.json(
          { error: existingUserMembershipError.message },
          { status: 500 }
        );
      }

      if (existingUserMembership) {
        membershipId = existingUserMembership.id;

        const { error: updateMembershipError } = await adminSupabase
          .from("program_memberships")
          .update({
            role: "resident",
            grad_year: resolvedGradYear ?? inviteContext.roster.grad_year ?? null,
            display_name: fullName,
            is_active: true,
            updated_at: now,
          })
          .eq("id", membershipId);

        if (updateMembershipError) {
          return NextResponse.json({ error: updateMembershipError.message }, { status: 500 });
        }
      } else {
        const { data: insertedMembership, error: insertMembershipError } =
          await adminSupabase
            .from("program_memberships")
            .insert({
              program_id: inviteContext.programId,
              user_id: user.id,
              role: "resident",
              grad_year: resolvedGradYear ?? inviteContext.roster.grad_year ?? null,
              display_name: fullName,
              is_active: true,
              start_date: today,
              created_at: now,
              updated_at: now,
            })
            .select("id")
            .single();

        if (insertMembershipError) {
          return NextResponse.json({ error: insertMembershipError.message }, { status: 500 });
        }

        membershipId = insertedMembership.id;
      }
    }

    if (!membershipId) {
      return NextResponse.json(
        { error: "Failed to create program membership." },
        { status: 500 }
      );
    }

    const { error: claimRosterError } = await adminSupabase
      .from("program_roster")
      .update({
        program_membership_id: membershipId,
        claimed_by_user_id: user.id,
        claimed_at: now,
        updated_at: now,
      })
      .eq("id", inviteContext.rosterId)
      .eq("program_id", inviteContext.programId);

    if (claimRosterError) {
      return NextResponse.json({ error: claimRosterError.message }, { status: 500 });
    }

    const { error: backfillRotationsError } = await adminSupabase
      .from("rotation_assignments")
      .update({
        program_membership_id: membershipId,
        updated_at: now,
      })
      .eq("program_id", inviteContext.programId)
      .eq("roster_id", inviteContext.rosterId);

    if (backfillRotationsError) {
      return NextResponse.json({ error: backfillRotationsError.message }, { status: 500 });
    }

    const { error: backfillCallsError } = await adminSupabase
  .from("call_assignments")
  .update({
    program_membership_id: membershipId,
    updated_at: now,
  })
  .eq("program_id", inviteContext.programId)
  .eq("roster_id", inviteContext.rosterId);

if (backfillCallsError) {
  return NextResponse.json(
    { error: backfillCallsError.message },
    { status: 500 }
  );
}

    const { error: claimInviteError } = await adminSupabase
      .from("program_invites")
      .update({
        claimed_at: now,
      })
      .eq("id", inviteContext.inviteId);

    if (claimInviteError) {
      return NextResponse.json({ error: claimInviteError.message }, { status: 500 });
    }

    const { data: existingWorkspaceState, error: workspaceLookupError } =
      await adminSupabase
        .from("workspace_user_state")
        .select("user_id, first_entered_at")
        .eq("user_id", user.id)
        .maybeSingle();

    if (workspaceLookupError) {
      return NextResponse.json({ error: workspaceLookupError.message }, { status: 500 });
    }

    const { error: workspaceUpsertError } = await adminSupabase
      .from("workspace_user_state")
      .upsert(
        {
          user_id: user.id,
          onboarding_completed: true,
          first_entered_at: existingWorkspaceState?.first_entered_at ?? now,
          last_entered_at: now,
          updated_at: now,
        },
        { onConflict: "user_id" }
      );

    if (workspaceUpsertError) {
      return NextResponse.json({ error: workspaceUpsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      selectedProgramId,
      membershipId,
      rosterId: inviteContext.rosterId,
      selectedProgram: {
        id: selectedProgram.id,
        name: selectedProgram.name,
        institutionName: selectedProgram.institution_name,
        city: selectedProgram.city ?? null,
        state: selectedProgram.state ?? null,
        timezone: selectedProgram.timezone ?? null,
      },
      inviteClaimed: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
