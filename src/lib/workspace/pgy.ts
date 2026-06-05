export type EffectiveDateInput = Date | string | null | undefined;
export type ResidentStatusLabel =
  | "PGY-1"
  | "PGY-2"
  | "PGY-3"
  | "PGY-4"
  | "PGY-5"
  | "Grad"
  | "Unknown";

export type ResidentStatusDetails = {
  statusLabel: ResidentStatusLabel;
  pgyYear: number | null;
  isGraduated: boolean;
  isActiveResident: boolean;
  graduationDate: string | null;
  academicYearStart: number | null;
  academicYearEnd: number | null;
};

const RESIDENT_SCHEDULE_ROLES = new Set(["resident", "chief_resident", "chief"]);

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

function parseDateString(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);

  if (
    !isValidDate(date) ||
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function toEffectiveDate(
  effectiveDate: EffectiveDateInput = new Date()
): Date | null {
  if (effectiveDate instanceof Date) {
    return isValidDate(effectiveDate) ? new Date(effectiveDate) : null;
  }

  if (typeof effectiveDate === "string") {
    return parseDateString(effectiveDate);
  }

  if (effectiveDate === null || effectiveDate === undefined) {
    return new Date();
  }

  return null;
}

export function getAcademicYearStart(
  effectiveDate: EffectiveDateInput = new Date()
): number | null {
  const date = toEffectiveDate(effectiveDate);
  if (!date) return null;

  const year = date.getFullYear();
  const julyFirst = new Date(year, 6, 1);
  return date >= julyFirst ? year : year - 1;
}

export function getAcademicYearEnd(
  effectiveDate: EffectiveDateInput = new Date()
): number | null {
  const startYear = getAcademicYearStart(effectiveDate);
  return startYear === null ? null : startYear + 1;
}

export function getGraduationDateFromGradYear(
  gradYear: number | null | undefined
): string | null {
  if (typeof gradYear !== "number" || !Number.isInteger(gradYear)) return null;
  return `${gradYear}-07-01`;
}

/**
 * 5-year residency examples using July 1 rollover:
 * - grad_year 2028 on 2026-06-30 => PGY-3
 * - grad_year 2028 on 2026-07-01 => PGY-4
 * - grad_year 2028 on 2027-07-01 => PGY-5
 */
export function getPgyFromGradYear(
  gradYear: number | null | undefined,
  effectiveDate: EffectiveDateInput = new Date()
): number | null {
  if (typeof gradYear !== "number" || !Number.isInteger(gradYear)) return null;

  const academicYearEnd = getAcademicYearEnd(effectiveDate);
  if (academicYearEnd === null) return null;

  const pgy = academicYearEnd - gradYear + 5;

  if (!Number.isInteger(pgy) || pgy < 1 || pgy > 5) return null;
  return pgy;
}

export function getResidentStatusDetails(
  gradYear: number | null | undefined,
  effectiveDate: EffectiveDateInput = new Date()
): ResidentStatusDetails {
  const graduationDate = getGraduationDateFromGradYear(gradYear);
  const academicYearStart = getAcademicYearStart(effectiveDate);
  const academicYearEnd = getAcademicYearEnd(effectiveDate);
  const pgyYear = getPgyFromGradYear(gradYear, effectiveDate);

  if (pgyYear !== null) {
    return {
      statusLabel: `PGY-${pgyYear}` as ResidentStatusLabel,
      pgyYear,
      isGraduated: false,
      isActiveResident: true,
      graduationDate,
      academicYearStart,
      academicYearEnd,
    };
  }

  if (graduationDate) {
    const effective = toEffectiveDate(effectiveDate);
    if (effective) {
      const graduation = toEffectiveDate(graduationDate);
      if (graduation && effective >= graduation) {
        return {
          statusLabel: "Grad",
          pgyYear: null,
          isGraduated: true,
          isActiveResident: false,
          graduationDate,
          academicYearStart,
          academicYearEnd,
        };
      }
    }
  }

  return {
    statusLabel: "Unknown",
    pgyYear: null,
    isGraduated: false,
    isActiveResident: false,
    graduationDate,
    academicYearStart,
    academicYearEnd,
  };
}

export function getResidentStatusFromGradYear(
  gradYear: number | null | undefined,
  effectiveDate: EffectiveDateInput = new Date()
): ResidentStatusLabel {
  return getResidentStatusDetails(gradYear, effectiveDate).statusLabel;
}

export function isGraduatedFromGradYear(
  gradYear: number | null | undefined,
  effectiveDate: EffectiveDateInput = new Date()
): boolean {
  return getResidentStatusDetails(gradYear, effectiveDate).isGraduated;
}

export function isActiveResidentFromGradYear(
  gradYear: number | null | undefined,
  effectiveDate: EffectiveDateInput = new Date()
): boolean {
  return getResidentStatusDetails(gradYear, effectiveDate).isActiveResident;
}

export function getTrainingLevelFromPgy(
  pgy: number | null | undefined
): string | null {
  if (typeof pgy !== "number" || !Number.isInteger(pgy) || pgy < 1) return null;
  return `PGY-${pgy}`;
}

export function parsePgyFromTrainingLevel(
  trainingLevel: string | null | undefined
): number | null {
  if (typeof trainingLevel !== "string") return null;

  const match = trainingLevel.match(/(\d+)/);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function resolvePgyFromSources(params: {
  gradYear?: number | null;
  effectiveDate?: EffectiveDateInput;
  storedPgyYear?: number | null;
  trainingLevel?: string | null;
}): number | null {
  if (typeof params.gradYear === "number" && Number.isInteger(params.gradYear)) {
    return getResidentStatusDetails(params.gradYear, params.effectiveDate).pgyYear;
  }

  if (
    typeof params.storedPgyYear === "number" &&
    Number.isInteger(params.storedPgyYear) &&
    params.storedPgyYear > 0
  ) {
    return params.storedPgyYear;
  }

  return parsePgyFromTrainingLevel(params.trainingLevel);
}

export function resolveTrainingLevelFromSources(params: {
  gradYear?: number | null;
  effectiveDate?: EffectiveDateInput;
  storedPgyYear?: number | null;
  trainingLevel?: string | null;
}): string | null {
  if (typeof params.gradYear === "number" && Number.isInteger(params.gradYear)) {
    const status = getResidentStatusFromGradYear(
      params.gradYear,
      params.effectiveDate
    );

    return status === "Unknown" ? params.trainingLevel ?? null : status;
  }

  const pgy = resolvePgyFromSources(params);
  return getTrainingLevelFromPgy(pgy) ?? params.trainingLevel ?? null;
}

export function calculatePgyForDateRange(params: {
  gradYear: number | null | undefined;
  startDate?: string | null;
  endDate?: string | null;
}): number | null {
  const effectiveDate = params.startDate ?? params.endDate ?? null;
  return getPgyFromGradYear(params.gradYear, effectiveDate);
}

export function normalizeProgramRole(role: string | null | undefined): string | null {
  if (typeof role !== "string") return null;

  const normalized = role.trim().toLowerCase().replace(/[-\s]+/g, "_");
  return normalized || null;
}

export function isResidentScheduleRole(role: string | null | undefined): boolean {
  const normalized = normalizeProgramRole(role);
  return normalized ? RESIDENT_SCHEDULE_ROLES.has(normalized) : false;
}

export function isVisibleResidentForAcademicYear(params: {
  gradYear: number | null | undefined;
  role: string | null | undefined;
  academicYearStart: number;
}): boolean {
  if (!Number.isInteger(params.academicYearStart)) return false;
  if (!isResidentScheduleRole(params.role)) return false;
  if (typeof params.gradYear !== "number" || !Number.isInteger(params.gradYear)) return false;
  if (params.gradYear <= params.academicYearStart) return false;

  return (
    getPgyFromGradYear(params.gradYear, `${params.academicYearStart}-07-01`) !== null
  );
}
