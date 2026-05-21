export type EffectiveDateInput = Date | string | null | undefined;

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

export function getTrainingLevelFromPgy(
  pgy: number | null | undefined
): string | null {
  if (typeof pgy !== "number" || !Number.isInteger(pgy) || pgy < 1) return null;
  return `PGY-${pgy}`;
}

export function calculatePgyForDateRange(params: {
  gradYear: number | null | undefined;
  startDate?: string | null;
  endDate?: string | null;
}): number | null {
  const effectiveDate = params.startDate ?? params.endDate ?? null;
  return getPgyFromGradYear(params.gradYear, effectiveDate);
}
