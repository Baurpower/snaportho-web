// lib/db/time-off.ts
import { createClient } from "@/utils/supabase/server";

export type TimeOffType = "personal" | "conference";

export type ApprovalStatus = "requested" | "approved" | "denied";

export type ConstraintLevel = "hard" | "soft" | "informational";

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
  membershipId: string;
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
  return "personal";
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
  const rosterByMembershipId = new Map<
    string,
    { id: string; full_name: string | null; first_name: string | null; last_name: string | null }
  >();

  if (membershipIds.length > 0) {
    const { data: rosterRows, error: rosterError } = await supabase
      .from("program_roster")
      .select("id, program_membership_id, full_name, first_name, last_name")
      .eq("program_id", programId)
      .in("program_membership_id", membershipIds);

    if (rosterError) {
      throw new Error(`Failed to map time-off roster rows: ${rosterError.message}`);
    }

    for (const row of rosterRows ?? []) {
      if (row.program_membership_id) {
        rosterByMembershipId.set(String(row.program_membership_id), {
          id: String(row.id),
          full_name: row.full_name ?? null,
          first_name: row.first_name ?? null,
          last_name: row.last_name ?? null,
        });
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
    membershipId,
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

  const dayRows = enumerateDates(startDate, endDate).map((day) => ({
    event_id: event.id,
    program_id: programId,
    membership_id: membershipId,
    roster_id: rosterId,
    off_date: day.off_date,
    event_type: eventType,
    source_kind: sourceKind,
    constraint_level: constraintLevel,
    is_weekend: day.is_weekend,
  }));

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

  return { id: event.id };
}
