/**
 * POD derived from the surgery date. POD 0 = day of surgery; a future date is pre-op.
 * Pure and timezone-naive (compares calendar dates), so it's stable and testable.
 */

export type PodInfo = {
  label: string; // "POD 3", "Pre-op", "Day of surgery"
  days: number; // signed: negative = pre-op
  preOp: boolean;
};

function atMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Compute POD from an ISO date (YYYY-MM-DD). Returns null when no/invalid date. */
export function computePod(surgeryDate: string | null | undefined, now = new Date()): PodInfo | null {
  if (!surgeryDate) return null;
  const parsed = new Date(`${surgeryDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  const days = Math.round((atMidnight(now) - atMidnight(parsed)) / 86_400_000);
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

/** Format an ISO date as M/D for compact display. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
