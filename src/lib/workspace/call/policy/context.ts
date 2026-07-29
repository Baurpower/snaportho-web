/**
 * Call Hub Policy Engine — SchedulingContext (facts, computed once).
 *
 * Pure: built from in-memory residents + availability + the current assignment
 * snapshot. No DB access, so it runs in the worker, browser, and tests. Rotation
 * facts are derived from `ResidentOption.rotationAssignments` (loaded upstream via
 * the canonical rotation loader), including the academic-year `serviceMonthIndex`
 * that powers temporal predicates like "first Gen-Ortho month".
 */
import type {
  DraftDayAssignment,
  ResidentAvailabilityMap,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import { getResidentPgyYear } from "@/lib/workspace/call/rule-evaluator";

export type ActiveRotation = { id: string | null; name: string | null };

export type SchedulingContext = {
  residentsById: Map<string, ResidentOption>;
  /** Effective PGY of a resident on a given date. */
  pgyOf: (residentId: string, dateKey: string) => number | null;
  /** Rotation(s) active for a resident on a given date. */
  rotationsOn: (residentId: string, dateKey: string) => ActiveRotation[];
  /**
   * 1-based index of `dateKey`'s month among the resident's distinct months on a
   * `tokens`-matching service within the academic year, or 0 if not on that
   * service on `dateKey`.
   */
  serviceMonthIndex: (
    residentId: string,
    dateKey: string,
    tokens: string[]
  ) => number;
  /** True when the resident has no approved time-off on this date. */
  isAvailabilityClear: (residentId: string, dateKey: string) => boolean;
  /** Current assignment for a date (mutable snapshot passed at build time). */
  assignmentOn: (dateKey: string) => DraftDayAssignment | null;
};

/** Normalize a rotation/service name for token matching (lowercase, alphanumeric only). */
export function normalizeServiceName(value: string | null | undefined): string {
  if (!value) return "";
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function rotationName(a: NonNullable<ResidentOption["rotationAssignments"]>[number]) {
  return (
    a.rotationName ??
    a.rotation_name ??
    a.rotationShortName ??
    a.rotation_short_name ??
    null
  );
}

function rotationId(a: NonNullable<ResidentOption["rotationAssignments"]>[number]) {
  return a.rotationId ?? a.rotation_id ?? null;
}

function rotationStart(a: NonNullable<ResidentOption["rotationAssignments"]>[number]) {
  return a.startDate ?? a.start_date ?? null;
}

function rotationEnd(a: NonNullable<ResidentOption["rotationAssignments"]>[number]) {
  return a.endDate ?? a.end_date ?? null;
}

function nameMatchesTokens(name: string | null, tokens: string[]): boolean {
  const normalized = normalizeServiceName(name);
  if (!normalized) return false;
  return tokens.some((token) => normalized.includes(normalizeServiceName(token)));
}

/** Academic-year window (July → June) containing `dateKey`. */
function academicYearRange(dateKey: string): { start: string; end: string } {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const startYear = month >= 7 ? year : year - 1;
  return { start: `${startYear}-07-01`, end: `${startYear + 1}-06-30` };
}

function ymOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** Inclusive list of "YYYY-MM" from startYm to endYm. */
function monthsBetween(startYm: string, endYm: string): string[] {
  if (startYm > endYm) return [];
  const out: string[] = [];
  let year = Number(startYm.slice(0, 4));
  let month = Number(startYm.slice(5, 7));
  const endYear = Number(endYm.slice(0, 4));
  const endMonth = Number(endYm.slice(5, 7));
  while (year < endYear || (year === endYear && month <= endMonth)) {
    out.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

export function buildSchedulingContext(params: {
  residents: ResidentOption[];
  availability?: ResidentAvailabilityMap;
  assignments?: Record<string, DraftDayAssignment>;
}): SchedulingContext {
  const { residents, availability = {}, assignments = {} } = params;

  const residentsById = new Map(residents.map((r) => [r.residentId, r]));

  const pgyCache = new Map<string, number | null>();
  const pgyOf = (residentId: string, dateKey: string): number | null => {
    const key = `${residentId}|${dateKey}`;
    if (pgyCache.has(key)) return pgyCache.get(key) ?? null;
    const resident = residentsById.get(residentId);
    const value = resident ? getResidentPgyYear(resident, dateKey) : null;
    pgyCache.set(key, value);
    return value;
  };

  const rotationsOn = (residentId: string, dateKey: string): ActiveRotation[] => {
    const resident = residentsById.get(residentId);
    if (!resident?.rotationAssignments?.length) return [];
    return resident.rotationAssignments
      .filter((a) => {
        const start = rotationStart(a);
        const end = rotationEnd(a);
        return (!start || start <= dateKey) && (!end || end >= dateKey);
      })
      .map((a) => ({ id: rotationId(a), name: rotationName(a) }));
  };

  // Cache the sorted service-month set per (resident, tokens, academic year).
  const serviceMonthsCache = new Map<string, string[]>();
  const serviceMonthsFor = (
    residentId: string,
    tokens: string[],
    dateKey: string
  ): string[] => {
    const ay = academicYearRange(dateKey);
    const cacheKey = `${residentId}|${tokens.join(",")}|${ay.start}`;
    const cached = serviceMonthsCache.get(cacheKey);
    if (cached) return cached;

    const resident = residentsById.get(residentId);
    const monthSet = new Set<string>();
    for (const a of resident?.rotationAssignments ?? []) {
      if (!nameMatchesTokens(rotationName(a), tokens)) continue;
      const rawStart = rotationStart(a) ?? ay.start;
      const rawEnd = rotationEnd(a) ?? ay.end;
      const start = rawStart < ay.start ? ay.start : rawStart;
      const end = rawEnd > ay.end ? ay.end : rawEnd;
      for (const ym of monthsBetween(ymOf(start), ymOf(end))) monthSet.add(ym);
    }
    const sorted = [...monthSet].sort();
    serviceMonthsCache.set(cacheKey, sorted);
    return sorted;
  };

  const serviceMonthIndex = (
    residentId: string,
    dateKey: string,
    tokens: string[]
  ): number => {
    // Must actually be on a token-matching service on this date.
    const onServiceToday = rotationsOn(residentId, dateKey).some((r) =>
      nameMatchesTokens(r.name, tokens)
    );
    if (!onServiceToday) return 0;
    const months = serviceMonthsFor(residentId, tokens, dateKey);
    const idx = months.indexOf(ymOf(dateKey));
    return idx === -1 ? 0 : idx + 1;
  };

  const isAvailabilityClear = (residentId: string, dateKey: string): boolean => {
    const day = availability?.[residentId]?.[dateKey];
    if (!day) return true;
    return !day.timeOffConflicts.some((c) => c.approvalStatus === "approved");
  };

  const assignmentOn = (dateKey: string): DraftDayAssignment | null =>
    assignments[dateKey] ?? null;

  return {
    residentsById,
    pgyOf,
    rotationsOn,
    serviceMonthIndex,
    isAvailabilityClear,
    assignmentOn,
  };
}
