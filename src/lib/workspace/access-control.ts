import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type WorkspaceMode = "admin" | "resident";

type ProgramMembershipRow = {
  id: string;
  program_id: string | null;
  user_id: string | null;
  role: string | null;
  grad_year: number | null;
  display_name: string | null;
  is_active: boolean | null;
  start_date: string | null;
  end_date: string | null;
};

type ProgramRosterRow = {
  id: string;
  program_id: string | null;
  program_membership_id: string | null;
  claimed_by_user_id: string | null;
  claimed_at: string | null;
  full_name: string | null;
  role: string | null;
  isAdmin: boolean | null;
  grad_year: number | null;
};

export type WorkspaceAccessContext = {
  userId: string;
  programId: string;
  membershipId: string | null;
  rosterId: string | null;
  isRosterLinked: boolean;
  isAdmin: boolean;
  mode: WorkspaceMode;
  membershipRole: string | null;
  rosterRole: string | null;
  membership: ProgramMembershipRow;
  roster: ProgramRosterRow | null;
};

export type WorkspacePermissions = {
  mode: WorkspaceMode;
  canViewWorkspace: boolean;
  canViewCallSchedule: boolean;
  canViewTimeOff: boolean;
  canViewAcademicCalendar: boolean;
  canRequestCoverage: boolean;
  canRespondToCoverageRequests: boolean;
  canApproveSwaps: boolean;
  canEditCallAssignments: boolean;
  canCreatePersonalCallEntry: boolean;
  canUploadCallSchedule: boolean;
  canManageCallRules: boolean;
  canExportProgramCallCalendar: boolean;
  canSyncOwnCalendar: boolean;
  canSyncProgramCalendar: boolean;
  canRequestTimeOff: boolean;
  canEditOwnTimeOff: boolean;
  canApproveTimeOff: boolean;
  canUploadTimeOff: boolean;
  canManageRotations: boolean;
  canManageRoster: boolean;
  canManageProgramSettings: boolean;
  canCreateAcademicEvents: boolean;
  canEditAcademicEvents: boolean;
  canDeleteAcademicEvents: boolean;
  canCreateProgramAttending: boolean;
  canViewAttendingPreferences: boolean;
  canCreateAttendingPreferences: boolean;
  canEditAttendingPreferences: boolean;
  canManageAttendingPreferenceCards: boolean;
};

export type WorkspaceAccessResult = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: NonNullable<
    Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>>["data"]["user"]
  >;
  state: {
    user_id: string;
    onboarding_completed: boolean;
  };
  membership: ProgramMembershipRow;
  roster: ProgramRosterRow | null;
  accessContext: WorkspaceAccessContext;
  permissions: WorkspacePermissions;
};

export class WorkspacePermissionError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "WorkspacePermissionError";
    this.status = status;
  }
}

function selectActiveMembership(rows: ProgramMembershipRow[]) {
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

function buildWorkspaceAccessContext(params: {
  userId: string;
  membership: ProgramMembershipRow;
  roster: ProgramRosterRow | null;
}): WorkspaceAccessContext | null {
  const { userId, membership, roster } = params;

  if (!membership.program_id) {
    return null;
  }

  const isAdmin = Boolean(roster?.isAdmin);
  const mode: WorkspaceMode = isAdmin ? "admin" : "resident";

  return {
    userId,
    programId: membership.program_id,
    membershipId: membership.id ?? null,
    rosterId: roster?.id ?? null,
    isRosterLinked: Boolean(roster?.id),
    isAdmin,
    mode,
    membershipRole: membership.role ?? null,
    rosterRole: roster?.role ?? null,
    membership,
    roster,
  };
}

export function getWorkspacePermissions(
  accessContext: WorkspaceAccessContext | null
): WorkspacePermissions {
  const canViewWorkspace = Boolean(accessContext?.programId);
  const isRosterLinked = Boolean(accessContext?.isRosterLinked);
  const isAdmin = Boolean(accessContext?.isAdmin);
  const mode: WorkspaceMode = accessContext?.mode ?? "resident";

  return {
    mode,
    canViewWorkspace,
    canViewCallSchedule: canViewWorkspace,
    canViewTimeOff: canViewWorkspace,
    canViewAcademicCalendar: canViewWorkspace,
    canRequestCoverage: canViewWorkspace && isRosterLinked,
    canRespondToCoverageRequests: canViewWorkspace && isRosterLinked,
    canApproveSwaps: canViewWorkspace && isAdmin,
    canEditCallAssignments: canViewWorkspace && isAdmin,
    canCreatePersonalCallEntry: canViewWorkspace && isRosterLinked,
    canUploadCallSchedule: canViewWorkspace && isAdmin,
    canManageCallRules: canViewWorkspace && isAdmin,
    canExportProgramCallCalendar: canViewWorkspace && isAdmin,
    canSyncOwnCalendar: canViewWorkspace && isRosterLinked,
    canSyncProgramCalendar: canViewWorkspace && isAdmin,
    canRequestTimeOff: canViewWorkspace && isRosterLinked,
    canEditOwnTimeOff: canViewWorkspace && isRosterLinked,
    canApproveTimeOff: canViewWorkspace && isAdmin,
    canUploadTimeOff: canViewWorkspace && isAdmin,
    canManageRotations: canViewWorkspace && isAdmin,
    canManageRoster: canViewWorkspace && isAdmin,
    canManageProgramSettings: canViewWorkspace && isAdmin,
    canCreateAcademicEvents: canViewWorkspace && isAdmin,
    canEditAcademicEvents: canViewWorkspace && isAdmin,
    canDeleteAcademicEvents: canViewWorkspace && isAdmin,
    // Attending Preferences — all active program members in v1
    canCreateProgramAttending: canViewWorkspace,
    canViewAttendingPreferences: canViewWorkspace,
    canCreateAttendingPreferences: canViewWorkspace,
    canEditAttendingPreferences: canViewWorkspace,
    canManageAttendingPreferenceCards: canViewWorkspace,
  };
}

export async function getWorkspaceAccessContext(params: {
  userId: string;
  programId?: string | null;
}) {
  const adminSupabase = createAdminClient();

  const { data: membershipRows, error: membershipError } = await adminSupabase
    .from("program_memberships")
    .select(
      "id, program_id, user_id, role, grad_year, display_name, is_active, start_date, end_date"
    )
    .eq("user_id", params.userId)
    .eq("is_active", true)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false });

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const memberships = (membershipRows ?? []) as ProgramMembershipRow[];

  const membership = params.programId
    ? selectActiveMembership(
        memberships.filter((row) => row.program_id === params.programId)
      )
    : selectActiveMembership(memberships);

  if (!membership || !membership.program_id) {
    return {
      accessContext: null,
      permissions: getWorkspacePermissions(null),
      membership: null,
      roster: null,
    };
  }

  const { data: rosterRow, error: rosterError } = await adminSupabase
    .from("program_roster")
    .select(
      "id, program_id, program_membership_id, claimed_by_user_id, claimed_at, full_name, role, isAdmin, grad_year"
    )
    .eq("program_id", membership.program_id)
    .eq("claimed_by_user_id", params.userId)
    .maybeSingle();

  if (rosterError) {
    throw new Error(rosterError.message);
  }

  const roster = (rosterRow ?? null) as ProgramRosterRow | null;
  const accessContext = buildWorkspaceAccessContext({
    userId: params.userId,
    membership,
    roster,
  });

  return {
    accessContext,
    permissions: getWorkspacePermissions(accessContext),
    membership,
    roster,
  };
}

type RequireWorkspaceAccessOptions = {
  updateLastEnteredAt?: boolean;
  allowUnlinkedRoster?: boolean;
};

export async function requireWorkspaceAccess(
  options: RequireWorkspaceAccessOptions = {}
): Promise<WorkspaceAccessResult> {
  const { updateLastEnteredAt = false, allowUnlinkedRoster = false } = options;

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/work/welcome");
  }

  const { accessContext, permissions, membership, roster } =
    await getWorkspaceAccessContext({
      userId: user.id,
    });

  if (!membership || !accessContext || !permissions.canViewWorkspace) {
    redirect("/work/onboarding");
  }

  if (!roster && !allowUnlinkedRoster) {
    redirect("/work/onboarding");
  }

  const adminSupabase = createAdminClient();
  const now = new Date().toISOString();
  const onboardingCompleted = Boolean(roster?.id);

  const { data: existingState, error: stateLookupError } = await adminSupabase
    .from("workspace_user_state")
    .select("user_id, first_entered_at, last_entered_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (stateLookupError) {
    throw new Error(stateLookupError.message);
  }

  if (onboardingCompleted) {
    const { error: stateUpsertError } = await adminSupabase
      .from("workspace_user_state")
      .upsert(
        {
          user_id: user.id,
          onboarding_completed: true,
          first_entered_at: existingState?.first_entered_at ?? now,
          last_entered_at: updateLastEnteredAt
            ? now
            : existingState?.last_entered_at ?? now,
          updated_at: now,
        },
        { onConflict: "user_id" }
      );

    if (stateUpsertError) {
      throw new Error(stateUpsertError.message);
    }
  }

  return {
    supabase,
    user,
    state: {
      user_id: user.id,
      onboarding_completed: onboardingCompleted,
    },
    membership,
    roster,
    accessContext,
    permissions,
  };
}

export async function requireWorkspacePermission(params: {
  userId: string;
  permission: keyof WorkspacePermissions;
  programId?: string | null;
  allowUnlinkedRoster?: boolean;
}) {
  const {
    accessContext,
    permissions,
    membership,
    roster,
  } = await getWorkspaceAccessContext({
    userId: params.userId,
    programId: params.programId ?? null,
  });

  if (!accessContext || !membership) {
    throw new WorkspacePermissionError("No active workspace access found.", 403);
  }

  if (params.programId && accessContext.programId !== params.programId) {
    throw new WorkspacePermissionError(
      "You do not have access to this workspace program.",
      403
    );
  }

  if (!params.allowUnlinkedRoster && !accessContext.isRosterLinked) {
    throw new WorkspacePermissionError(
      "A linked program roster is required for this workspace action.",
      403
    );
  }

  if (!permissions[params.permission]) {
    throw new WorkspacePermissionError(
      "You do not have permission to perform this workspace action.",
      403
    );
  }

  return {
    accessContext,
    permissions,
    membership,
    roster,
  };
}
