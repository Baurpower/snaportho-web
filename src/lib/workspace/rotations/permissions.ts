import type { SupabaseClient } from "@supabase/supabase-js";

export const ROTATION_SETTINGS_EDITOR_ROLES = new Set([
  "admin",
  "program_admin",
  "coordinator",
  "chief",
  "chief_resident",
  "faculty",
  "faculty_lead",
]);

export type RotationSettingsAccessLevel = "read" | "edit";

type MembershipAccessRow = {
  id: string;
  role: string | null;
  is_active: boolean | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
};

type RosterAccessRow = {
  id: string;
  role: string | null;
};

export function normalizeProgramScopedRole(role: string | null | undefined) {
  if (typeof role !== "string") return null;

  const normalized = role.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return normalized.length > 0 ? normalized : null;
}

export function canManageRotationSettings(params: {
  rosterRole?: string | null;
  membershipRole?: string | null;
}) {
  const rosterRole = normalizeProgramScopedRole(params.rosterRole);
  const membershipRole = normalizeProgramScopedRole(params.membershipRole);
  const effectiveRole = rosterRole ?? membershipRole ?? null;

  return {
    rosterRole,
    membershipRole,
    effectiveRole,
    canManage:
      (rosterRole ? ROTATION_SETTINGS_EDITOR_ROLES.has(rosterRole) : false) ||
      (!rosterRole && membershipRole
        ? ROTATION_SETTINGS_EDITOR_ROLES.has(membershipRole)
        : false),
  };
}

function pickActiveMembership(rows: MembershipAccessRow[]) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    rows.find((row) => {
      const activeOk = row.is_active === true;
      const startsOk = !row.start_date || row.start_date <= today;
      const endsOk = !row.end_date || row.end_date >= today;
      return activeOk && startsOk && endsOk;
    }) ??
    rows.find((row) => row.is_active === true) ??
    null
  );
}

export async function requireRotationSettingsAccess({
  supabase,
  userId,
  programId,
  level = "read",
}: {
  supabase: SupabaseClient;
  userId: string;
  programId: string;
  level?: RotationSettingsAccessLevel;
}) {
  const { data: membershipRows, error: membershipError } = await supabase
    .from("program_memberships")
    .select("id, role, is_active, start_date, end_date, created_at")
    .eq("program_id", programId)
    .eq("user_id", userId)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false });

  if (membershipError) {
    return {
      ok: false,
      status: 500,
      error: "Failed to verify program access",
      membership: null,
      roster: null,
      rosterRole: null,
      membershipRole: null,
      effectiveRole: null,
      canManageRotationSettings: false,
    };
  }

  const membership = pickActiveMembership(
    (membershipRows ?? []) as MembershipAccessRow[]
  );

  if (!membership) {
    return {
      ok: false,
      status: 403,
      error: "You do not have access to this program's rotation settings",
      membership: null,
      roster: null,
      rosterRole: null,
      membershipRole: null,
      effectiveRole: null,
      canManageRotationSettings: false,
    };
  }

  const { data: roster, error: rosterError } = await supabase
    .from("program_roster")
    .select("id, role")
    .eq("program_id", programId)
    .eq("claimed_by_user_id", userId)
    .maybeSingle();

  if (rosterError) {
    return {
      ok: false,
      status: 500,
      error: "Failed to verify program roster access",
      membership: null,
      roster: null,
      rosterRole: null,
      membershipRole: null,
      effectiveRole: null,
      canManageRotationSettings: false,
    };
  }

  const permission = canManageRotationSettings({
    rosterRole: (roster as RosterAccessRow | null)?.role ?? null,
    membershipRole: membership.role ?? null,
  });

  if (level === "edit" && !permission.canManage) {
    return {
      ok: false,
      status: 403,
      error: "You do not have permission to manage rotation settings",
      membership,
      roster: (roster as RosterAccessRow | null) ?? null,
      rosterRole: permission.rosterRole,
      membershipRole: permission.membershipRole,
      effectiveRole: permission.effectiveRole,
      canManageRotationSettings: false,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    membership,
    roster: (roster as RosterAccessRow | null) ?? null,
    rosterRole: permission.rosterRole,
    membershipRole: permission.membershipRole,
    effectiveRole: permission.effectiveRole,
    canManageRotationSettings: permission.canManage,
  };
}
