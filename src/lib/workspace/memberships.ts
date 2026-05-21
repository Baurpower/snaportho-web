import { createClient } from "@/utils/supabase/server";

type ProgramRow = {
  id: string;
  name: string | null;
  slug: string | null;
  institution_name: string | null;
  timezone: string | null;
};

type ProgramRosterRow = {
  id: string;
  program_id: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  grad_year: number | null;
  role: string | null;
  claimed_by_user_id: string | null;
  program_membership_id: string | null;
};

type ActiveMembershipRaw = {
  id: string;
  program_id: string | null;
  user_id: string | null;
  role: string | null;
  grad_year: number | null;
  display_name: string | null;
  is_active: boolean | null;
  start_date: string | null;
  end_date: string | null;
  programs: ProgramRow | ProgramRow[] | null;
};

export type ActiveMembership = {
  id: string;
  program_id: string | null;
  roster_id: string | null;
  user_id: string | null;
  role: string | null;
  grad_year: number | null;
  display_name: string | null;
  is_active: boolean | null;
  start_date: string | null;
  end_date: string | null;
  programs: ProgramRow | null;
  roster: ProgramRosterRow | null;
};

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function getActiveMembershipForUser(
  userId: string
): Promise<ActiveMembership | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("program_memberships")
    .select(`
      id,
      program_id,
      user_id,
      role,
      grad_year,
      display_name,
      is_active,
      start_date,
      end_date,
      programs (
        id,
        name,
        slug,
        institution_name,
        timezone
      )
    `)
    .eq("user_id", userId)
    .order("start_date", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to fetch memberships: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as ActiveMembershipRaw[];

  const activeMembership =
    rows.find((row) => {
      const activeOk = row.is_active === true;
      const startsOk = !row.start_date || row.start_date <= today;
      const endsOk = !row.end_date || row.end_date >= today;
      return activeOk && startsOk && endsOk;
    }) ?? null;

  if (!activeMembership) return null;

  const normalizedProgram = normalizeOne(activeMembership.programs);

  const { data: rosterData, error: rosterError } = await supabase
    .from("program_roster")
    .select(`
      id,
      program_id,
      full_name,
      first_name,
      last_name,
      grad_year,
      role,
      claimed_by_user_id,
      program_membership_id
    `)
    .eq("program_membership_id", activeMembership.id)
    .eq("claimed_by_user_id", userId)
    .maybeSingle();

  if (rosterError) {
    throw new Error(`Failed to fetch linked roster: ${rosterError.message}`);
  }

  let normalizedRoster = normalizeOne(
    rosterData as ProgramRosterRow | ProgramRosterRow[] | null
  );

  if (!normalizedRoster && activeMembership.program_id) {
    const { data: fallbackRosterData, error: fallbackRosterError } = await supabase
      .from("program_roster")
      .select(`
        id,
        program_id,
        full_name,
        first_name,
        last_name,
        grad_year,
        role,
        claimed_by_user_id,
        program_membership_id
      `)
      .eq("program_id", activeMembership.program_id)
      .eq("claimed_by_user_id", userId)
      .maybeSingle();

    if (fallbackRosterError) {
      throw new Error(
        `Failed to fetch fallback linked roster: ${fallbackRosterError.message}`
      );
    }

    normalizedRoster = normalizeOne(
      fallbackRosterData as ProgramRosterRow | ProgramRosterRow[] | null
    );
  }

  return {
    id: activeMembership.id,
    program_id: activeMembership.program_id,
    roster_id: normalizedRoster?.id ?? null,
    user_id: activeMembership.user_id,
    role: activeMembership.role,
    grad_year: activeMembership.grad_year,
    display_name: activeMembership.display_name,
    is_active: activeMembership.is_active,
    start_date: activeMembership.start_date,
    end_date: activeMembership.end_date,
    programs: normalizedProgram,
    roster: normalizedRoster,
  };
}
