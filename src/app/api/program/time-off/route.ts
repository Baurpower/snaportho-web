import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { getResidentStatusDetails } from "@/lib/workspace/pgy";
import {
  canManageProgramTimeOff,
  createTimeOffEvent,
  getTimeOffTypeLabel,
  TimeOffType,
  ApprovalStatus,
  ConstraintLevel,
} from "@/lib/workspace/call/time-off";

type CreateBody = {
  rosterId?: string;
  programMembershipId?: string | null;
  eventType: TimeOffType;
  usingPto?: boolean;
  sourceKind?: string;
  constraintLevel?: ConstraintLevel | string;
  title?: string | null;
  notes?: string | null;
  location?: string | null;
  startDate: string;
  endDate: string;
  approvalStatus?: ApprovalStatus;
};

type ProgramRosterSetupRow = {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  program_membership_id?: string | null;
  grad_year?: number | null;
  is_active?: boolean | null;
  start_date?: string | null;
  end_date?: string | null;
  active_start_date?: string | null;
  active_end_date?: string | null;
};

function getTimeOffStatusDisplay(gradYear: number | null, effectiveDate: string) {
  const status = getResidentStatusDetails(gradYear, effectiveDate);

  return {
    residentStatus: status.statusLabel,
    pgyYear: status.pgyYear,
    trainingLevel: status.statusLabel === "Unknown" ? null : status.statusLabel,
    isGraduated: status.isGraduated,
    isActiveResident: status.isActiveResident,
    graduationDate: status.graduationDate,
  };
}

function logProgramTimeOffPermissionGate(params: {
  userId: string;
  programId: string | null | undefined;
  rosterId: string | null | undefined;
  rosterRole: string | null | undefined;
  membershipId: string | null | undefined;
  membershipRole: string | null | undefined;
  canManageProgramTimeOff: boolean;
}) {
  if (process.env.NODE_ENV === "production") return;

  console.log("program_time_off_permission_gate", params);
}

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id) {
      return NextResponse.json(
        {
          canManageProgramTimeOff: false,
          rosterId: null,
          rosterRole: null,
          programMembershipId: null,
          membershipRole: null,
          residents: [],
        },
        { status: 200 }
      );
    }

    const resolvedPermission = canManageProgramTimeOff({
      rosterRole: membership.roster?.role ?? null,
      membershipRole: membership.role ?? null,
      isRosterAdmin: membership.roster?.isAdmin ?? false,
    });

    logProgramTimeOffPermissionGate({
      userId: user.id,
      programId: membership.program_id,
      rosterId: membership.roster_id ?? null,
      rosterRole: resolvedPermission.rosterRole,
      membershipId: membership.id ?? null,
      membershipRole: resolvedPermission.membershipRole,
      canManageProgramTimeOff: resolvedPermission.canManage,
    });

    if (!resolvedPermission.canManage) {
      return NextResponse.json(
        {
          canManageProgramTimeOff: false,
          rosterId: membership.roster_id ?? null,
          rosterRole: resolvedPermission.rosterRole,
          programMembershipId: membership.id ?? null,
          membershipRole: resolvedPermission.membershipRole,
          residents: [],
        },
        { status: 200 }
      );
    }

    const { data: residentRows, error: residentError } = await supabase
      .from("program_roster")
      .select("*")
      .eq("program_id", membership.program_id)
      .order("grad_year", { ascending: true, nullsFirst: false })
      .order("last_name", { ascending: true, nullsFirst: false })
      .order("first_name", { ascending: true, nullsFirst: false });

    if (residentError) {
      return NextResponse.json(
        { error: `Failed to load program roster: ${residentError.message}` },
        { status: 500 }
      );
    }

    const effectiveDate = new Date().toISOString().slice(0, 10);

    return NextResponse.json(
      {
        canManageProgramTimeOff: resolvedPermission.canManage,
        rosterId: membership.roster_id ?? null,
        rosterRole: resolvedPermission.rosterRole,
        programMembershipId: membership.id ?? null,
        membershipRole: resolvedPermission.membershipRole,
        residents: ((residentRows ?? []) as ProgramRosterSetupRow[]).map((resident) => ({
          ...getTimeOffStatusDisplay(resident.grad_year ?? null, effectiveDate),
          rosterId: resident.id,
          programMembershipId: resident.program_membership_id ?? null,
          displayName:
            resident.full_name ||
            [resident.first_name, resident.last_name].filter(Boolean).join(" ") ||
            "Unknown Resident",
          gradYear: resident.grad_year ?? null,
          isActive: resident.is_active ?? null,
          rosterStartDate:
            resident.start_date ?? resident.active_start_date ?? null,
          rosterEndDate: resident.end_date ?? resident.active_end_date ?? null,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load time-off setup",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id || !membership?.id) {
      return NextResponse.json(
        { error: "No active program membership found" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as CreateBody;

    if (!body?.eventType || !body?.startDate || !body?.endDate) {
      return NextResponse.json(
        { error: "eventType, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    if (!isValidDateString(body.startDate) || !isValidDateString(body.endDate)) {
      return NextResponse.json(
        { error: "startDate and endDate must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (body.endDate < body.startDate) {
      return NextResponse.json(
        { error: "endDate cannot be before startDate" },
        { status: 400 }
      );
    }

    const isProgramQuickAddTarget =
      typeof body.rosterId === "string" && body.rosterId.trim().length > 0;

    const resolvedPermission = canManageProgramTimeOff({
      rosterRole: membership.roster?.role ?? null,
      membershipRole: membership.role ?? null,
      isRosterAdmin: membership.roster?.isAdmin ?? false,
    });

    logProgramTimeOffPermissionGate({
      userId: user.id,
      programId: membership.program_id,
      rosterId: membership.roster_id ?? null,
      rosterRole: resolvedPermission.rosterRole,
      membershipId: membership.id ?? null,
      membershipRole: resolvedPermission.membershipRole,
      canManageProgramTimeOff: resolvedPermission.canManage,
    });

    if (isProgramQuickAddTarget && !resolvedPermission.canManage) {
      return NextResponse.json(
        { error: "You do not have permission to create time off for other residents" },
        { status: 403 }
      );
    }

    let targetRosterId = membership.roster_id ?? null;
    let targetProgramMembershipId = membership.id;

    if (isProgramQuickAddTarget) {
      const { data: rosterRow, error: rosterLookupError } = await supabase
        .from("program_roster")
        .select("id, program_id, program_membership_id")
        .eq("id", body.rosterId!)
        .eq("program_id", membership.program_id)
        .maybeSingle();

      if (rosterLookupError) {
        return NextResponse.json(
          { error: `Failed to resolve roster identity: ${rosterLookupError.message}` },
          { status: 500 }
        );
      }

      if (!rosterRow) {
        return NextResponse.json(
          { error: "The selected resident does not belong to this program" },
          { status: 404 }
        );
      }

      targetRosterId = rosterRow.id;
      targetProgramMembershipId = rosterRow.program_membership_id ?? null;
    } else if (!targetRosterId) {
      const { data: rosterRow, error: rosterLookupError } = await supabase
        .from("program_roster")
        .select("id")
        .eq("program_id", membership.program_id)
        .eq("program_membership_id", membership.id)
        .maybeSingle();

      if (rosterLookupError) {
        return NextResponse.json(
          { error: `Failed to resolve roster identity: ${rosterLookupError.message}` },
          { status: 500 }
        );
      }

      targetRosterId = rosterRow?.id ?? null;
    }

    if (!targetRosterId) {
      return NextResponse.json(
        { error: "No roster row is linked to the selected resident." },
        { status: 400 }
      );
    }

    const { data: targetRoster, error: targetRosterError } = await supabase
      .from("program_roster")
      .select("id, grad_year")
      .eq("id", targetRosterId)
      .eq("program_id", membership.program_id)
      .maybeSingle();

    if (targetRosterError) {
      return NextResponse.json(
        { error: `Failed to resolve resident graduation status: ${targetRosterError.message}` },
        { status: 500 }
      );
    }

    if (!targetRoster) {
      return NextResponse.json(
        { error: "The selected resident does not belong to this program" },
        { status: 404 }
      );
    }

    const requestStatus = getResidentStatusDetails(
      targetRoster.grad_year ?? null,
      body.startDate
    );

    if (!requestStatus.isActiveResident) {
      return NextResponse.json(
        {
          error:
            requestStatus.isGraduated
              ? "Graduated residents cannot receive new time-off requests."
              : "Resident graduation status is unknown. Add a valid graduation year before creating time off.",
        },
        { status: 400 }
      );
    }

    const isProgramCreated = isProgramQuickAddTarget;
    const approvalStatus =
      body.approvalStatus ??
      (isProgramCreated ? "approved" : "requested");
    const sourceKind = body.sourceKind ?? (isProgramCreated ? "program_quick_add" : "self_reported");
    const constraintLevel = body.constraintLevel ?? (approvalStatus === "approved" ? "hard" : "soft");

    const result = await createTimeOffEvent({
      programId: membership.program_id,
      rosterId: targetRosterId,
      membershipId: targetProgramMembershipId,
      createdByUserId: user.id,
      eventType: body.eventType,
      usingPto: body.usingPto ?? false,
      sourceKind,
      constraintLevel,
      title: body.title ?? null,
      notes: body.notes ?? null,
      location: body.location ?? null,
      startDate: body.startDate,
      endDate: body.endDate,
      approvalStatus,
    });

    return NextResponse.json(
      {
        created: result.created,
        event: result.event,
        dayCount: result.dayCount,
        dayRows: result.dayRows,
        summary: {
          residentRosterId: targetRosterId,
          programMembershipId: targetProgramMembershipId,
          eventType: body.eventType,
          eventTypeLabel: getTimeOffTypeLabel(body.eventType),
          startDate: body.startDate,
          endDate: body.endDate,
          approvalStatus,
        },
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create time-off event",
      },
      { status: 500 }
    );
  }
}
