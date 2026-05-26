import type { SupabaseClient } from "@supabase/supabase-js";
import { requireWorkspacePermission } from "@/lib/workspace/access-control";

export type RotationSettingsAccessLevel = "read" | "edit";

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
  void supabase;

  try {
    const permission =
      level === "edit" ? "canManageRotations" : "canViewWorkspace";

    const access = await requireWorkspacePermission({
      userId,
      programId,
      permission,
      allowUnlinkedRoster: level === "read",
    });

    return {
      ok: true,
      status: 200,
      error: null,
      membership: access.membership,
      roster: access.roster,
      rosterRole: access.accessContext.rosterRole,
      membershipRole: access.accessContext.membershipRole,
      effectiveRole:
        access.accessContext.rosterRole ?? access.accessContext.membershipRole,
      canManageRotationSettings: access.permissions.canManageRotations,
    };
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const permissionError = error as Error & { status?: number };
      return {
        ok: false,
        status: permissionError.status ?? 403,
        error: permissionError.message,
        membership: null,
        roster: null,
        rosterRole: null,
        membershipRole: null,
        effectiveRole: null,
        canManageRotationSettings: false,
      };
    }

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
}
