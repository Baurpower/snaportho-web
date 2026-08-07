/**
 * Day counters from a calendar date facet.
 * - Surgery: POD 0 = day of surgery; a future date is pre-op.
 * - Non-op: Day 0 = treatment start day; auto-counts days on therapy.
 * Pure and timezone-naive (compares calendar dates), so it's stable and testable.
 */

export type PodInfo = {
  label: string; // "POD 3", "Pre-op", "Day of surgery"
  days: number; // signed: negative = pre-op / not started yet
  preOp: boolean;
};

/** Days-on-therapy info for non-op management (same date math as POD). */
export type TxDayInfo = {
  label: string; // "Day 3", "Start day", "Starts in 2d"
  days: number; // signed: negative = not started yet
  started: boolean;
};

function atMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Calendar-day delta: today − date (negative if date is in the future). */
export function calendarDaysSince(
  isoDate: string | null | undefined,
  now = new Date()
): number | null {
  if (!isoDate) return null;
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.round((atMidnight(now) - atMidnight(parsed)) / 86_400_000);
}

/** Compute POD from an ISO date (YYYY-MM-DD). Returns null when no/invalid date. */
export function computePod(surgeryDate: string | null | undefined, now = new Date()): PodInfo | null {
  const days = calendarDaysSince(surgeryDate, now);
  if (days === null) return null;

  if (days < 0) {
    return { label: `Pre-op (${-days}d)`, days, preOp: true };
  }
  if (days === 0) return { label: "Day of surgery", days, preOp: false };
  return { label: `POD ${days}`, days, preOp: false };
}

/** Short chip label for dense views (POD n / Pre-op / DOS). */
export function podChip(surgeryDate: string | null | undefined, now = new Date()): string | null {
  const info = computePod(surgeryDate, now);
  if (!info) return null;
  if (info.preOp) return "Pre-op";
  if (info.days === 0) return "DOS";
  return `POD ${info.days}`;
}

/**
 * Days since non-op treatment start (reuses surgery_date facet as start date).
 * Day 0 = started today; Day 3 = three calendar days on therapy.
 */
export function computeTxDay(
  startDate: string | null | undefined,
  now = new Date()
): TxDayInfo | null {
  const days = calendarDaysSince(startDate, now);
  if (days === null) return null;

  if (days < 0) {
    return { label: `Starts in ${-days}d`, days, started: false };
  }
  if (days === 0) return { label: "Start day", days, started: true };
  return { label: `Day ${days}`, days, started: true };
}

/** Short chip for non-op day count (Day n / Start / Soon). */
export function txDayChip(startDate: string | null | undefined, now = new Date()): string | null {
  const info = computeTxDay(startDate, now);
  if (!info) return null;
  if (!info.started) return `Starts ${-info.days}d`;
  if (info.days === 0) return "Day 0";
  return `Day ${info.days}`;
}

/** Planned return-to-OR countdown relative to next_surgery_date. */
export type NextOrInfo = {
  label: string; // "Next OR (3d)", "Next OR today", "s/p reop POD 2"
  days: number;
  upcoming: boolean; // true when date is today or future
};

export function computeNextOr(
  nextSurgeryDate: string | null | undefined,
  now = new Date()
): NextOrInfo | null {
  const days = calendarDaysSince(nextSurgeryDate, now);
  if (days === null) return null;
  if (days < 0) {
    return { label: `Next OR (${-days}d)`, days, upcoming: true };
  }
  if (days === 0) return { label: "Next OR today", days, upcoming: true };
  return { label: `s/p reop POD ${days}`, days, upcoming: false };
}

export function nextOrChip(
  nextSurgeryDate: string | null | undefined,
  now = new Date()
): string | null {
  return computeNextOr(nextSurgeryDate, now)?.label ?? null;
}

/** Format an ISO date as M/D for compact display. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
