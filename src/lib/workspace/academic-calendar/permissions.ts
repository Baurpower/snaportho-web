import type { SupabaseClient } from "@supabase/supabase-js";

export type AcademicCalendarPermissionLevel = "view" | "edit" | "admin";

export type WorkspaceRole =
  | "owner"
  | "admin"
  | "program_admin"
  | "coordinator"
  | "faculty"
  | "chief"
  | "chief_resident"
  | "resident"
  | "member"
  | string;

const EDIT_ROLES = new Set<WorkspaceRole>([
  "owner",
  "admin",
  "program_admin",
  "coordinator",
  "faculty",
  "chief",
  "chief_resident",
]);

const ADMIN_ROLES = new Set<WorkspaceRole>([
  "owner",
  "admin",
  "program_admin",
  "coordinator",
]);

export async function getUserProgramRole(
  supabase: SupabaseClient,
  userId: string,
  programId: string
) {
  const { data, error } = await supabase
    .from("program_memberships")
    .select("id, role, status")
    .eq("program_id", programId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      role: null,
      membership: null,
      error,
    };
  }

  return {
    role: data?.role ?? null,
    membership: data ?? null,
    error: null,
  };
}

export function roleCanAccessAcademicCalendar(
  role: string | null,
  level: AcademicCalendarPermissionLevel
) {
  if (!role) return false;

  if (level === "view") {
    return true;
  }

  if (level === "edit") {
    return EDIT_ROLES.has(role);
  }

  if (level === "admin") {
    return ADMIN_ROLES.has(role);
  }

  return false;
}

export async function requireAcademicCalendarAccess({
  supabase,
  userId,
  programId,
  level = "view",
}: {
  supabase: SupabaseClient;
  userId: string;
  programId: string;
  level?: AcademicCalendarPermissionLevel;
}) {
  const { role, membership, error } = await getUserProgramRole(
    supabase,
    userId,
    programId
  );

  if (error) {
    return {
      ok: false,
      role: null,
      membership: null,
      error: "Failed to verify program access",
    };
  }

  if (!membership || !roleCanAccessAcademicCalendar(role, level)) {
    return {
      ok: false,
      role,
      membership,
      error: "You do not have access to this academic calendar",
    };
  }

  return {
    ok: true,
    role,
    membership,
    error: null,
  };
}

export async function getProgramIdForAcademicEvent(
  supabase: SupabaseClient,
  eventId: string
) {
  const { data, error } = await supabase
    .from("academic_events")
    .select("program_id")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !data) {
    return {
      programId: null,
      error: error ?? new Error("Academic event not found"),
    };
  }

  return {
    programId: data.program_id as string,
    error: null,
  };
}