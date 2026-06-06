export const PROGRAM_ATTENDING_EDITOR_ROLES = new Set([
  "admin",
  "program_admin",
  "coordinator",
  "chief",
  "chief_resident",
  "faculty",
  "faculty_lead",
]);

export const DEFAULT_PROGRAM_ATTENDING_SCOPE = "program_call";

export type ProgramAttendingInputShape = {
  fullName: string;
  displayName?: string | null;
  isActive?: boolean;
};

export function normalizeProgramScopedRole(role: string | null | undefined) {
  if (typeof role !== "string") return null;

  const normalized = role.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return normalized.length > 0 ? normalized : null;
}

export function canManageProgramAttendings(params: {
  rosterRole?: string | null;
  membershipRole?: string | null;
  isRosterAdmin?: boolean | null;
}) {
  const rosterRole = normalizeProgramScopedRole(params.rosterRole);
  const membershipRole = normalizeProgramScopedRole(params.membershipRole);
  const canManage =
    Boolean(params.isRosterAdmin) ||
    (rosterRole ? PROGRAM_ATTENDING_EDITOR_ROLES.has(rosterRole) : false) ||
    (membershipRole ? PROGRAM_ATTENDING_EDITOR_ROLES.has(membershipRole) : false);

  return {
    rosterRole,
    membershipRole,
    canManage,
  };
}

export function normalizeProgramAttendingInput<T extends ProgramAttendingInputShape>(
  input: T | null | undefined
): T | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const fullName =
    typeof input.fullName === "string" ? input.fullName.trim() : "";
  const rawDisplayName =
    typeof input.displayName === "string" ? input.displayName.trim() : "";

  if (!fullName) {
    return null;
  }

  return {
    ...input,
    fullName,
    displayName: rawDisplayName.length > 0 ? rawDisplayName : null,
    isActive: input.isActive ?? true,
  };
}

export function isValidMonthKey(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

export function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const monthEndDate = new Date(Date.UTC(year, monthNumber, 0));
  const monthEnd = monthEndDate.toISOString().slice(0, 10);

  return {
    month,
    monthStart,
    monthEnd,
  };
}

export type ProgramAttendingMonthAssignmentInput = {
  coverageDate: string;
  attendingId: string;
  coverageScope?: string | null;
  isDefault?: boolean;
};

export function normalizeProgramAttendingMonthAssignments(
  value: unknown,
  month: string
): ProgramAttendingMonthAssignmentInput[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const { monthStart, monthEnd } = getMonthRange(month);
  const normalized: ProgramAttendingMonthAssignmentInput[] = [];
  const seenKeys = new Set<string>();
  const defaultKeys = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const raw = item as Record<string, unknown>;
    const coverageDate = raw.coverageDate;
    const attendingId = raw.attendingId;
    const coverageScope =
      typeof raw.coverageScope === "string" && raw.coverageScope.trim().length > 0
        ? raw.coverageScope.trim()
        : DEFAULT_PROGRAM_ATTENDING_SCOPE;
    const isDefault =
      typeof raw.isDefault === "boolean" ? raw.isDefault : true;

    if (!isValidDateString(coverageDate) || coverageDate < monthStart || coverageDate > monthEnd) {
      return null;
    }

    if (typeof attendingId !== "string" || attendingId.trim().length === 0) {
      return null;
    }

    const dedupeKey = `${coverageDate}__${coverageScope}__${attendingId.trim()}__${isDefault ? "1" : "0"}`;
    if (seenKeys.has(dedupeKey)) {
      return null;
    }
    seenKeys.add(dedupeKey);

    if (isDefault) {
      const defaultKey = `${coverageDate}__${coverageScope}`;
      if (defaultKeys.has(defaultKey)) {
        return null;
      }
      defaultKeys.add(defaultKey);
    }

    normalized.push({
      coverageDate,
      attendingId: attendingId.trim(),
      coverageScope,
      isDefault,
    });
  }

  return normalized;
}
