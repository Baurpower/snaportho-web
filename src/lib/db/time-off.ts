// lib/db/time-off.ts
import { createClient } from "@/utils/supabase/server";

export type TimeOffType = "personal" | "conference";

export type ApprovalStatus = "requested" | "approved" | "denied";

export type ConstraintLevel = "hard" | "soft" | "informational";

export type TimeOffItem = {
  id: string;
  membershipId: string | null;
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
  items: TimeOffItem[];
};

export type CreateTimeOffInput = {
  programId: string;
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
  off_date: string;
  event_type: string;
  source_kind: string;
  constraint_level: string;
  is_weekend: boolean;
  availability_events: {
    id: string;
    membership_id: string;
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
}): Promise<TimeOffMonthResponse> {
  const supabase = await createClient();
  const { programId, monthStart, monthEnd, myMembershipId } = params;

  const { data, error } = await supabase
    .from("availability_event_days")
    .select(`
      event_id,
      off_date,
      event_type,
      source_kind,
      constraint_level,
      is_weekend,
      availability_events:event_id (
        id,
        membership_id,
        start_date,
        end_date,
        title,
        location,
        notes,
        created_by_user_id,
        approval_status,
        using_pto
      ),
      program_memberships:membership_id (
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
    throw new Error(`Failed to load time-off month: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as RawDayRow[];
  const byEventId = new Map<string, TimeOffItem>();

  for (const row of rows) {
    const event = row.availability_events;
    const membership = row.program_memberships;

    if (!event) continue;

    const approvalStatus = normalizeApprovalStatus(event.approval_status);

    if (!byEventId.has(row.event_id)) {
      byEventId.set(row.event_id, {
        id: event.id,
        membershipId: membership?.id ?? event.membership_id ?? null,
        residentName: membership?.display_name ?? "Unknown Resident",
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
          !!myMembershipId &&
          (membership?.id === myMembershipId ||
            event.membership_id === myMembershipId),
      });
    }
  }

  return {
    monthStart,
    monthEnd,
    myMembershipId,
    items: Array.from(byEventId.values()),
  };
}

export async function createTimeOffEvent(input: CreateTimeOffInput) {
  const supabase = await createClient();

  const {
    programId,
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
    throw new Error(
      `Failed to create time-off event: ${eventError?.message ?? "Unknown error"}`
    );
  }

  const dayRows = enumerateDates(startDate, endDate).map((day) => ({
    event_id: event.id,
    program_id: programId,
    membership_id: membershipId,
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
    throw new Error(`Failed to create time-off day rows: ${daysError.message}`);
  }

  return { id: event.id };
}