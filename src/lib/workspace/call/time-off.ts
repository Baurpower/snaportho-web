// lib/db/time-off.ts
import { createClient } from "@/utils/supabase/server";

export type TimeOffType =
  | "personal"
  | "conference"
  | "vacation"
  | "sick"
  | "other";

export type ApprovalStatus = "requested" | "approved" | "denied";

export type ConstraintLevel = "hard" | "soft" | "informational";

export const PROGRAM_TIME_OFF_EDITOR_ROLES = new Set([
  "admin",
  "program_admin",
  "coordinator",
  "chief",
  "chief_resident",
  "faculty",
  "faculty_lead",
]);

export function normalizeProgramScopedRole(role: string | null | undefined) {
  if (typeof role !== "string") return null;

  const normalized = role.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return normalized.length > 0 ? normalized : null;
}

export function canManageProgramTimeOff(params: {
  rosterRole?: string | null;
  membershipRole?: string | null;
  isRosterAdmin?: boolean | null;
}) {
  const rosterRole = normalizeProgramScopedRole(params.rosterRole);
  const membershipRole = normalizeProgramScopedRole(params.membershipRole);

  return {
    rosterRole,
    membershipRole,
    canManage: Boolean(params.isRosterAdmin),
  };
}

export type TimeOffItem = {
  id: string;
  membershipId: string | null; // compatibility
  rosterId: string | null;
  programMembershipId: string | null;
  residentName: string;
  trainingLevel: string | null;
  classYear: number | null;
  userId: string | null;
  type: TimeOffType;
  usingPto: boolean;
  startDate: string | null;
  endDate: string | null;
  title: string | null;
  location: string | null;
  notes: string | null;
  approvalStatus: ApprovalStatus | null;
  approved?: boolean | null;
  isMine: boolean;
};

export type TimeOffMonthResponse = {
  monthStart: string;
  monthEnd: string;
  myMembershipId: string | null;
  myRosterId: string | null;
  items: TimeOffItem[];
};

export type CreateTimeOffInput = {
  programId: string;
  rosterId: string;
  membershipId?: string | null;
  createdByUserId: string;
  eventType: TimeOffType;
  usingPto?: boolean;
  sourceKind: string;
  constraintLevel: ConstraintLevel | string;
  title?: string | null;
  notes?: string | null;
  location?: string | null;
  startDate: string;
  endDate: string;
  approvalStatus?: ApprovalStatus;
};

function mapEventTypeToFrontendType(eventType: string): TimeOffType {
  if (eventType === "conference") return "conference";
  if (eventType === "vacation") return "vacation";
  if (eventType === "sick") return "sick";
  if (eventType === "other") return "other";
  return "personal";
}

export function getTimeOffTypeLabel(eventType: TimeOffType | string | null | undefined) {
  if (eventType === "conference") return "Conference";
  if (eventType === "vacation") return "Vacation";
  if (eventType === "sick") return "Sick";
  if (eventType === "other") return "Other";
  return "Personal";
}

function normalizeApprovalStatus(
  value: string | null | undefined
): ApprovalStatus | null {
  if (!value) return null;
  if (value === "requested") return "requested";
  if (value === "approved") return "approved";
  if (value === "denied") return "denied";
  return null;
}

function approvalStatusToBoolean(
  value: ApprovalStatus | null
): boolean | null {
  if (value === "approved") return true;
  if (value === "denied") return false;
  return null;
}

function enumerateDates(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const rows: { off_date: string; is_weekend: boolean }[] = [];

  const cursor = new Date(start);

  while (cursor <= end) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    const dd = String(cursor.getDate()).padStart(2, "0");
    const off_date = `${yyyy}-${mm}-${dd}`;
    const day = cursor.getDay();

    rows.push({
      off_date,
      is_weekend: day === 0 || day === 6,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return rows;
}

type RawDayRow = {
  event_id: string;
  membership_id: string | null;
  roster_id: string | null;
  off_date: string;
  event_type: string;
  source_kind: string;
  constraint_level: string;
  is_weekend: boolean;
  availability_events: {
    id: string;
    membership_id: string;
    roster_id: string | null;
    start_date: string;
    end_date: string;
    title: string | null;
    location: string | null;
    notes: string | null;
    created_by_user_id: string | null;
    approval_status: string | null;
    using_pto: boolean | null;
  } | null;
  program_memberships: {
    id: string;
    user_id: string | null;
    role: string | null;
    grad_year: number | null;
    display_name: string | null;
  } | null;
};

export async function getProgramTimeOffMonth(params: {
  programId: string;
  monthStart: string;
  monthEnd: string;
  myMembershipId: string | null;
  myRosterId?: string | null;
}): Promise<TimeOffMonthResponse> {
  const supabase = await createClient();
  const { programId, monthStart, monthEnd, myMembershipId, myRosterId = null } = params;

  const { data, error } = await supabase
    .from("availability_event_days")
    .select(`
      event_id,
      membership_id,
      roster_id,
      off_date,
      event_type,
      source_kind,
      constraint_level,
      is_weekend,
      availability_events (
        id,
        membership_id,
        roster_id,
        start_date,
        end_date,
        title,
        location,
        notes,
        created_by_user_id,
        approval_status,
        using_pto
      ),
      program_memberships (
        id,
        user_id,
        role,
        grad_year,
        display_name
      )
    `)
    .eq("program_id", programId)
    .gte("off_date", monthStart)
    .lte("off_date", monthEnd)
    .order("off_date", { ascending: true });

  if (error) {
    console.error("getProgramTimeOffMonth query error", {
      programId,
      monthStart,
      monthEnd,
      myMembershipId,
      error,
    });
    throw new Error(`Failed to load time-off month: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as RawDayRow[];
  const membershipIds = Array.from(
    new Set(
      rows
        .map(
          (row) =>
            row.membership_id ?? row.availability_events?.membership_id ?? null
        )
        .filter(Boolean)
    )
  ) as string[];
  const rosterIds = Array.from(
    new Set(
      rows
        .map((row) => row.roster_id ?? row.availability_events?.roster_id ?? null)
        .filter(Boolean)
    )
  ) as string[];
  const rosterByMembershipId = new Map<
    string,
    { id: string; full_name: string | null; first_name: string | null; last_name: string | null }
  >();
  const rosterById = new Map<
    string,
    { id: string; full_name: string | null; first_name: string | null; last_name: string | null }
  >();

  if (membershipIds.length > 0 || rosterIds.length > 0) {
    let rosterQuery = supabase
      .from("program_roster")
      .select("id, program_membership_id, full_name, first_name, last_name")
      .eq("program_id", programId);

    if (membershipIds.length > 0 && rosterIds.length > 0) {
      rosterQuery = rosterQuery.or(
        `program_membership_id.in.(${membershipIds.join(",")}),id.in.(${rosterIds.join(",")})`
      );
    } else if (membershipIds.length > 0) {
      rosterQuery = rosterQuery.in("program_membership_id", membershipIds);
    } else {
      rosterQuery = rosterQuery.in("id", rosterIds);
    }

    const { data: rosterRows, error: rosterError } = await rosterQuery;

    if (rosterError) {
      throw new Error(`Failed to map time-off roster rows: ${rosterError.message}`);
    }

    for (const row of rosterRows ?? []) {
      const normalized = {
        id: String(row.id),
        full_name: row.full_name ?? null,
        first_name: row.first_name ?? null,
        last_name: row.last_name ?? null,
      };

      rosterById.set(normalized.id, normalized);
      if (row.program_membership_id) {
        rosterByMembershipId.set(String(row.program_membership_id), normalized);
      }
    }
  }

  const byEventId = new Map<string, TimeOffItem>();

  for (const row of rows) {
    const event = row.availability_events;
    const membership = row.program_memberships;

    if (!event) {
      console.warn("Skipping time-off row because availability_events is null", {
        event_id: row.event_id,
        off_date: row.off_date,
        row,
      });
      continue;
    }

    const approvalStatus = normalizeApprovalStatus(event.approval_status);

    if (!byEventId.has(row.event_id)) {
      const effectiveMembershipId =
        membership?.id ?? event.membership_id ?? row.membership_id ?? null;
      const effectiveRosterId = row.roster_id ?? event.roster_id ?? null;
      const roster =
        (effectiveRosterId ? rosterById.get(effectiveRosterId) ?? null : null) ??
        (effectiveMembershipId
          ? rosterByMembershipId.get(effectiveMembershipId) ?? null
          : null) ?? (effectiveRosterId ? { id: effectiveRosterId, full_name: null, first_name: null, last_name: null } : null);
      const rosterDisplayName =
        roster?.full_name ??
        [roster?.first_name, roster?.last_name].filter(Boolean).join(" ").trim() ??
        null;
      const item: TimeOffItem = {
        id: event.id,
        membershipId: effectiveRosterId ?? roster?.id ?? effectiveMembershipId,
        rosterId: effectiveRosterId ?? roster?.id ?? null,
        programMembershipId: effectiveMembershipId,
        residentName: rosterDisplayName || membership?.display_name || "Unknown Resident",
        trainingLevel: membership?.role ?? null,
        classYear: membership?.grad_year ?? null,
        userId: membership?.user_id ?? event.created_by_user_id ?? null,
        type: mapEventTypeToFrontendType(row.event_type),
        usingPto: Boolean(event.using_pto),
        startDate: event.start_date ?? null,
        endDate: event.end_date ?? null,
        title: event.title ?? null,
        location: event.location ?? null,
        notes: event.notes ?? null,
        approvalStatus,
        approved: approvalStatusToBoolean(approvalStatus),
        isMine:
          (!!myRosterId &&
            ((row.roster_id ?? null) === myRosterId ||
              (event.roster_id ?? null) === myRosterId ||
              (roster?.id ?? null) === myRosterId)) ||
          (!!myMembershipId &&
            ((membership?.id ?? null) === myMembershipId ||
              (event.membership_id ?? null) === myMembershipId ||
              (row.membership_id ?? null) === myMembershipId)),
      };

      console.log("Mapped time-off item", item);
      byEventId.set(row.event_id, item);
    }
  }

  const items = Array.from(byEventId.values());

  return {
    monthStart,
    monthEnd,
    myMembershipId,
    myRosterId,
    items,
  };
}

export async function createTimeOffEvent(input: CreateTimeOffInput) {
  const supabase = await createClient();

  const {
    programId,
    rosterId,
    membershipId = null,
    createdByUserId,
    eventType,
    usingPto = false,
    sourceKind,
    constraintLevel,
    title,
    notes,
    location,
    startDate,
    endDate,
    approvalStatus = "requested",
  } = input;

  const { data: existingEvent, error: existingEventError } = await supabase
    .from("availability_events")
    .select(`
      id,
      program_id,
      membership_id,
      roster_id,
      event_type,
      using_pto,
      source_kind,
      constraint_level,
      title,
      notes,
      location,
      start_date,
      end_date,
      created_by_user_id,
      approval_status
    `)
    .eq("program_id", programId)
    .eq("roster_id", rosterId)
    .eq("event_type", eventType)
    .eq("start_date", startDate)
    .eq("end_date", endDate)
    .neq("approval_status", "denied")
    .maybeSingle();

  if (existingEventError) {
    throw new Error(
      `Failed to check for duplicate time-off event: ${existingEventError.message}`
    );
  }

  if (existingEvent) {
    const dayRows = enumerateDates(startDate, endDate).map((day) => ({
      event_id: existingEvent.id,
      program_id: programId,
      membership_id: membershipId,
      roster_id: rosterId,
      off_date: day.off_date,
      event_type: eventType,
      source_kind: sourceKind,
      constraint_level: constraintLevel,
      is_weekend: day.is_weekend,
    }));

    return {
      created: false,
      event: existingEvent,
      dayCount: dayRows.length,
      dayRows,
    };
  }

  const { data: event, error: eventError } = await supabase
    .from("availability_events")
    .insert({
      program_id: programId,
      membership_id: membershipId,
      roster_id: rosterId,
      event_type: eventType,
      using_pto: usingPto,
      source_kind: sourceKind,
      constraint_level: constraintLevel,
      title: title ?? null,
      notes: notes ?? null,
      location: location ?? null,
      start_date: startDate,
      end_date: endDate,
      created_by_user_id: createdByUserId,
      approval_status: approvalStatus,
    })
    .select("id")
    .single();

  if (eventError || !event) {
    console.error("createTimeOffEvent availability_events insert error", {
      eventError,
      event,
    });
    throw new Error(
      `Failed to create time-off event: ${eventError?.message ?? "Unknown error"}`
    );
  }

  const dayRows = buildAvailabilityEventDayRows({
    eventId: event.id,
    programId,
    membershipId,
    rosterId,
    eventType,
    sourceKind,
    constraintLevel,
    startDate,
    endDate,
  });

  const { error: daysError } = await supabase
    .from("availability_event_days")
    .insert(dayRows);

  if (daysError) {
    console.error("createTimeOffEvent availability_event_days insert error", {
      daysError,
      dayRows,
    });
    throw new Error(`Failed to create time-off day rows: ${daysError.message}`);
  }

  return {
    created: true,
    event: {
      id: event.id,
      program_id: programId,
      membership_id: membershipId,
      roster_id: rosterId,
      event_type: eventType,
      using_pto: usingPto,
      source_kind: sourceKind,
      constraint_level: constraintLevel,
      title: title ?? null,
      notes: notes ?? null,
      location: location ?? null,
      start_date: startDate,
      end_date: endDate,
      created_by_user_id: createdByUserId,
      approval_status: approvalStatus,
    },
    dayCount: dayRows.length,
    dayRows,
  };
}

export function buildAvailabilityEventDayRows(input: {
  eventId: string;
  programId: string;
  membershipId?: string | null;
  rosterId: string;
  eventType: TimeOffType;
  sourceKind: string;
  constraintLevel: ConstraintLevel | string;
  startDate: string;
  endDate: string;
}) {
  const {
    eventId,
    programId,
    membershipId = null,
    rosterId,
    eventType,
    sourceKind,
    constraintLevel,
    startDate,
    endDate,
  } = input;

  return enumerateDates(startDate, endDate).map((day) => ({
    event_id: eventId,
    program_id: programId,
    membership_id: membershipId,
    roster_id: rosterId,
    off_date: day.off_date,
    event_type: eventType,
    source_kind: sourceKind,
    constraint_level: constraintLevel,
    is_weekend: day.is_weekend,
  }));
}

export async function syncAvailabilityEventDays(input: {
  eventId: string;
  programId: string;
  membershipId?: string | null;
  rosterId: string;
  eventType: TimeOffType;
  sourceKind: string;
  constraintLevel: ConstraintLevel | string;
  startDate: string;
  endDate: string;
}) {
  const supabase = await createClient();
  const dayRows = buildAvailabilityEventDayRows(input);

  const { error: deleteError } = await supabase
    .from("availability_event_days")
    .delete()
    .eq("event_id", input.eventId)
    .eq("program_id", input.programId);

  if (deleteError) {
    throw new Error(
      `Failed to clear time-off day rows before sync: ${deleteError.message}`
    );
  }

  const { error: insertError } = await supabase
    .from("availability_event_days")
    .insert(dayRows);

  if (insertError) {
    throw new Error(`Failed to sync time-off day rows: ${insertError.message}`);
  }

  return {
    dayCount: dayRows.length,
    dayRows,
  };
}
