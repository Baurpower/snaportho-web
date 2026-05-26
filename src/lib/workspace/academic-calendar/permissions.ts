import type { SupabaseClient } from "@supabase/supabase-js";
import { requireWorkspacePermission } from "@/lib/workspace/access-control";

export type AcademicCalendarPermissionLevel = "view" | "edit" | "admin";

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
  void supabase;

  try {
    const permission =
      level === "view" ? "canViewAcademicCalendar" : "canEditAcademicEvents";

    const access = await requireWorkspacePermission({
      userId,
      programId,
      permission,
      allowUnlinkedRoster: true,
    });

    return {
      ok: true,
      role: access.accessContext.rosterRole ?? access.accessContext.membershipRole,
      membership: access.membership,
      error: null,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        ok: false,
        role: null,
        membership: null,
        error: error.message,
      };
    }

    return {
      ok: false,
      role: null,
      membership: null,
      error: "Failed to verify program access",
    };
  }
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
