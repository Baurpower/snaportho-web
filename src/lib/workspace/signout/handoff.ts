/**
 * Handoff document builder for ortho rounds.
 * Pure: turns live cards into a location-ordered multi-column print model.
 * No LLM — structured data only.
 */

import { rosterTableColumns, type RosterRowModel } from "@/lib/workspace/signout/roster";
import type { SignoutCard, SignoutSeverity } from "@/lib/workspace/signout/types";

const SEVERITY_ORDER: Record<SignoutSeverity, number> = {
  unstable: 0,
  watcher: 1,
  stable: 2,
};

export type HandoffMode = "rounds" | "overnight";

export type HandoffRow = {
  cardId: string;
  severity: SignoutSeverity;
  severityLetter: string;
  location: string;
  attending: string;
  patient: string;
  surgeryLine: string;
  podLabel: string | null;
  weightBearing: string[];
  clinical: string;
  labs: string;
  plan: string;
  dispo: string;
  tags: string[];
  pinned: boolean;
};

export type HandoffGroup = {
  locationKey: string;
  locationLabel: string;
  rows: HandoffRow[];
};

export type HandoffActionItem = {
  patient: string;
  location: string;
  text: string;
};

export type HandoffCounts = {
  active: number;
  unstable: number;
  watcher: number;
  stable: number;
  openItems: number;
};

export type HandoffDocument = {
  meta: {
    serviceName: string;
    generatedAt: Date;
    mode: HandoffMode;
    counts: HandoffCounts;
  };
  groups: HandoffGroup[];
  actionRollup: HandoffActionItem[];
};

const CRITICAL_RE = /\b(SICU|MICU|CICU|CCU|ICU|PACU|OR)\b/i;
const ED_RE = /\b(ED|ER|EMERGENCY)\b/i;

function normalizeLocation(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Bucket for walking-path order: critical care → ED → wards → unknown. */
export function locationBucket(location: string): number {
  const loc = location.trim();
  if (!loc) return 3;
  if (CRITICAL_RE.test(loc)) return 0;
  if (ED_RE.test(loc)) return 1;
  return 2;
}

function severityOrder(sev: SignoutSeverity): number {
  return SEVERITY_ORDER[sev];
}

function severityLetter(sev: SignoutSeverity): string {
  if (sev === "unstable") return "U";
  if (sev === "watcher") return "W";
  return "S";
}

/**
 * Sort active cards for walking rounds:
 * location bucket → location string → severity → pin → name.
 */
export function sortForRounds(cards: SignoutCard[]): SignoutCard[] {
  return [...cards].sort((a, b) => {
    const locA = normalizeLocation(a.location);
    const locB = normalizeLocation(b.location);
    const bucket = locationBucket(locA) - locationBucket(locB);
    if (bucket !== 0) return bucket;
    const locCmp = locA.localeCompare(locB, undefined, { numeric: true, sensitivity: "base" });
    if (locCmp !== 0) return locCmp;
    const sev = severityOrder(a.severity) - severityOrder(b.severity);
    if (sev !== 0) return sev;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.handle.localeCompare(b.handle, undefined, { sensitivity: "base" });
  });
}

function surgeryLine(card: SignoutCard, row: RosterRowModel): string {
  if (row.nonOp || card.managementMode === "nonop") {
    return row.surgery ? `Non-op · ${row.surgery}` : "Non-op";
  }
  return row.surgery || "";
}

function toHandoffRow(card: SignoutCard): HandoffRow {
  const { clinical, labs, plan, dispo, row } = rosterTableColumns(card);
  return {
    cardId: card.id,
    severity: card.severity,
    severityLetter: severityLetter(card.severity),
    location: row.location,
    attending: row.attending,
    patient: row.patient,
    surgeryLine: surgeryLine(card, row),
    podLabel: row.podLabel,
    weightBearing: row.weightBearing,
    clinical,
    labs,
    plan,
    dispo,
    tags: row.tags,
    pinned: card.pinned,
  };
}

/** Group already-sorted cards by display location (empty → "No location"). */
export function groupByLocation(cards: SignoutCard[]): HandoffGroup[] {
  const groups: HandoffGroup[] = [];
  let current: HandoffGroup | null = null;

  for (const card of cards) {
    const label = normalizeLocation(card.location) || "No location";
    const key = label.toUpperCase();
    if (!current || current.locationKey !== key) {
      current = { locationKey: key, locationLabel: label, rows: [] };
      groups.push(current);
    }
    current.rows.push(toHandoffRow(card));
  }
  return groups;
}

export function buildHandoffDocument(input: {
  serviceName: string;
  cards: SignoutCard[];
  generatedAt?: Date;
  mode?: HandoffMode;
  /** When false, include discharged. Default true = active only. */
  activeOnly?: boolean;
}): HandoffDocument {
  const generatedAt = input.generatedAt ?? new Date();
  const mode = input.mode ?? "rounds";
  const activeOnly = input.activeOnly !== false;

  const pool = activeOnly
    ? input.cards.filter((c) => c.status === "active")
    : [...input.cards];

  const sorted = sortForRounds(pool);
  const groups = groupByLocation(sorted);

  const counts: HandoffCounts = {
    active: pool.filter((c) => c.status === "active").length,
    unstable: 0,
    watcher: 0,
    stable: 0,
    openItems: 0,
  };
  for (const c of pool) {
    if (c.severity === "unstable") counts.unstable += 1;
    else if (c.severity === "watcher") counts.watcher += 1;
    else counts.stable += 1;
  }

  const actionRollup: HandoffActionItem[] = [];
  for (const g of groups) {
    for (const row of g.rows) {
      const openLines = row.plan
        .concat("\n", row.dispo)
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("☐ "));
      for (const line of openLines) {
        counts.openItems += 1;
        actionRollup.push({
          patient: row.patient,
          location: row.location,
          text: line.replace(/^☐\s*/, ""),
        });
      }
    }
  }

  return {
    meta: {
      serviceName: input.serviceName,
      generatedAt,
      mode,
      counts,
    },
    groups,
    actionRollup,
  };
}

/** Format generatedAt for the print header. */
export function formatHandoffTimestamp(d: Date): string {
  try {
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return d.toISOString();
  }
}
