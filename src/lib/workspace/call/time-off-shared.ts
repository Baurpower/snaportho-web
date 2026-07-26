/**
 * Client-safe time-off types and pure helpers.
 *
 * IMPORTANT: Do not import server-only modules here (cookie/header helpers or
 * server Supabase clients). Client components may import freely from here.
 *
 * Server DB helpers live in ./time-off.ts and re-export these symbols.
 */

export type TimeOffType =
  | "personal"
  | "conference"
  | "vacation"
  | "sick"
  | "other";

export type ApprovalStatus = "requested" | "approved" | "denied";

export type ConstraintLevel = "hard" | "soft" | "informational";

/**
 * Canonical availability_events.source_kind values allowed by
 * availability_events_source_kind_check in production:
 *   official | self_reported | preference
 */
export const AVAILABILITY_SOURCE_KINDS = [
  "official",
  "self_reported",
  "preference",
] as const;

export type AvailabilitySourceKind = (typeof AVAILABILITY_SOURCE_KINDS)[number];

/** Program-admin / bulk-entered approved time off. */
export const PROGRAM_TIME_OFF_SOURCE_KIND: AvailabilitySourceKind = "official";

/** Resident self-service requests. */
export const SELF_TIME_OFF_SOURCE_KIND: AvailabilitySourceKind = "self_reported";

export const AVAILABILITY_EVENT_TYPES = [
  "pto",
  "conference",
  "weekend_off",
  "vacation",
  "personal",
  "sick",
  "other",
] as const;

export function isAvailabilitySourceKind(
  value: string | null | undefined
): value is AvailabilitySourceKind {
  return (
    typeof value === "string" &&
    (AVAILABILITY_SOURCE_KINDS as readonly string[]).includes(value)
  );
}

/** Event types that may consume PTO when using_pto=true. */
export const PTO_CONSUMING_EVENT_TYPES = new Set<string>([
  "vacation",
  "personal",
  "pto",
  "sick",
]);

export function assertUsingPtoAllowed(eventType: string, usingPto: boolean) {
  if (usingPto && !PTO_CONSUMING_EVENT_TYPES.has(eventType)) {
    throw new Error(
      `using_pto=true is not allowed for event_type=${eventType}`
    );
  }
}

/**
 * Inclusive calendar-day expansion used by createTimeOffEvent and imports.
 * Weekend = Saturday (6) or Sunday (0) in local date arithmetic.
 */
export function enumerateTimeOffDates(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Invalid date range: ${startDate}..${endDate}`);
  }
  if (start > end) {
    throw new Error(`start_date ${startDate} is after end_date ${endDate}`);
  }

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

export function buildHoustonMethodistImportKey(input: {
  rosterId: string;
  eventType: string;
  startDate: string;
  endDate: string;
}) {
  return `[snaportho-import:houston-methodist-2026-27:${input.rosterId}:${input.eventType}:${input.startDate}:${input.endDate}]`;
}

export function timeOffImportIdentity(input: {
  programId: string;
  rosterId: string;
  eventType: string;
  startDate: string;
  endDate: string;
  title?: string | null;
  sourceKind: string;
}) {
  return {
    programId: input.programId,
    rosterId: input.rosterId,
    eventType: input.eventType,
    startDate: input.startDate,
    endDate: input.endDate,
    normalizedTitle: (input.title ?? "").trim().toLowerCase(),
    sourceKind: input.sourceKind,
  };
}

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

export function mapEventTypeToFrontendType(eventType: string): TimeOffType {
  if (eventType === "conference") return "conference";
  if (eventType === "vacation") return "vacation";
  if (eventType === "sick") return "sick";
  if (eventType === "other") return "other";
  return "personal";
}

export function getTimeOffTypeLabel(
  eventType: TimeOffType | string | null | undefined
) {
  if (eventType === "conference") return "Conference";
  if (eventType === "vacation") return "Vacation";
  if (eventType === "sick") return "Sick";
  if (eventType === "other") return "Other";
  return "Personal";
}

export function normalizeApprovalStatus(
  value: string | null | undefined
): ApprovalStatus | null {
  if (!value) return null;
  if (value === "requested") return "requested";
  if (value === "approved") return "approved";
  if (value === "denied") return "denied";
  return null;
}

export function approvalStatusToBoolean(
  value: ApprovalStatus | null
): boolean | null {
  if (value === "approved") return true;
  if (value === "denied") return false;
  return null;
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

  return enumerateTimeOffDates(startDate, endDate).map((day) => ({
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
