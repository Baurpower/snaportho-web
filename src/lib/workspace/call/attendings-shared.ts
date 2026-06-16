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
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  isActive?: boolean;
};

export type NormalizedProgramAttendingInput = ProgramAttendingInputShape & {
  fullName: string;
  firstName: string;
  lastName: string;
  displayName: string;
  isActive: boolean;
};

type AttendingNameLike = {
  fullName?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  attendingName?: string | null;
  attendingDisplayName?: string | null;
  attendingFirstName?: string | null;
  attendingLastName?: string | null;
};

function cleanNamePart(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseProgramAttendingFullName(fullName: string | null | undefined) {
  const parts = cleanNamePart(fullName).split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? "",
    lastName: parts[parts.length - 1] ?? "",
  };
}

export function composeProgramAttendingFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
) {
  return [cleanNamePart(firstName), cleanNamePart(lastName)]
    .filter(Boolean)
    .join(" ");
}

export function getAttendingDisplayName(attending: AttendingNameLike) {
  const displayName =
    cleanNamePart(attending.displayName) ||
    cleanNamePart(attending.attendingDisplayName);
  if (displayName) return displayName;

  const fullName =
    cleanNamePart(attending.fullName) || cleanNamePart(attending.attendingName);
  if (fullName) return fullName;

  const firstName =
    cleanNamePart(attending.firstName) ||
    cleanNamePart(attending.attendingFirstName);
  const lastName =
    cleanNamePart(attending.lastName) ||
    cleanNamePart(attending.attendingLastName);
  const composed = composeProgramAttendingFullName(firstName, lastName);

  return composed || "Unnamed Attending";
}

export function getAttendingLastName(attending: AttendingNameLike) {
  const structured =
    cleanNamePart(attending.lastName) ||
    cleanNamePart(attending.attendingLastName);
  if (structured) return structured;

  return parseProgramAttendingFullName(getAttendingDisplayName(attending)).lastName;
}

export function getAttendingShortName(
  attending: AttendingNameLike,
  options: { disambiguate?: boolean } = {}
) {
  const lastName = getAttendingLastName(attending);
  if (!lastName) return getAttendingDisplayName(attending);

  if (!options.disambiguate) return lastName;

  const firstName =
    cleanNamePart(attending.firstName) ||
    cleanNamePart(attending.attendingFirstName) ||
    parseProgramAttendingFullName(getAttendingDisplayName(attending)).firstName;
  const firstInitial = firstName ? `${firstName[0]?.toUpperCase()}.` : "";

  return [firstInitial, lastName].filter(Boolean).join(" ") || lastName;
}

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

export function normalizeProgramAttendingInput(
  input: ProgramAttendingInputShape | null | undefined
): NormalizedProgramAttendingInput | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const rawFullName = cleanNamePart(input.fullName);
  const parsedFullName = parseProgramAttendingFullName(rawFullName);
  const firstName = cleanNamePart(input.firstName) || parsedFullName.firstName;
  const lastName = cleanNamePart(input.lastName) || parsedFullName.lastName;
  const fullName =
    rawFullName || composeProgramAttendingFullName(firstName, lastName);
  const rawDisplayName =
    typeof input.displayName === "string" ? input.displayName.trim() : "";

  if (!firstName || !lastName || !fullName) {
    return null;
  }

  return {
    ...input,
    firstName,
    lastName,
    fullName,
    displayName: rawDisplayName.length > 0 ? rawDisplayName : fullName,
    isActive: input.isActive ?? true,
  };
}

export function isValidMonthKey(value: string | null | undefined): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) return false;
  const monthNumber = Number(value.slice(5, 7));
  return monthNumber >= 1 && monthNumber <= 12;
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
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
  slotId?: string | null;
};

export type ProgramAttendingCoverageSlotInput = {
  name: string;
  abbreviation: string;
  color?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  description?: string | null;
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
  const slotKeys = new Set<string>();

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
    const slotId =
      typeof raw.slotId === "string" && raw.slotId.trim().length > 0
        ? raw.slotId.trim()
        : null;

    if (!isValidDateString(coverageDate) || coverageDate < monthStart || coverageDate > monthEnd) {
      return null;
    }

    if (typeof attendingId !== "string" || attendingId.trim().length === 0) {
      return null;
    }

    // Dedupe key now includes slotId when present (slot-aware)
    const dedupeKey = slotId
      ? `${coverageDate}__${coverageScope}__slot:${slotId}__${attendingId.trim()}__${isDefault ? "1" : "0"}`
      : `${coverageDate}__${coverageScope}__${attendingId.trim()}__${isDefault ? "1" : "0"}`;
    if (seenKeys.has(dedupeKey)) {
      return null;
    }
    seenKeys.add(dedupeKey);

    const slotKey = slotId
      ? `${coverageDate}__${coverageScope}__slot:${slotId}`
      : `${coverageDate}__${coverageScope}__legacy`;
    if (slotKeys.has(slotKey)) {
      return null;
    }
    slotKeys.add(slotKey);

    normalized.push({
      coverageDate,
      attendingId: attendingId.trim(),
      coverageScope,
      isDefault,
      slotId,
    });
  }

  return normalized;
}

export function normalizeProgramAttendingCoverageSlotInput<T extends ProgramAttendingCoverageSlotInput>(
  input: T | null | undefined
): T | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const abbreviation = typeof input.abbreviation === "string" ? input.abbreviation.trim() : "";

  if (!name || !abbreviation) {
    return null;
  }

  return {
    ...input,
    name,
    abbreviation: abbreviation.toUpperCase(),
    color: input.color ?? null,
    isActive: input.isActive ?? true,
    sortOrder: typeof input.sortOrder === "number" ? input.sortOrder : 0,
    description: input.description ?? null,
  };
}
