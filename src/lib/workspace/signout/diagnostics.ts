import type {
  DiagnosticItem,
  DiagnosticItemType,
  DiagnosticLabValue,
  SignoutDiagnostics,
} from "./types";

export const EMPTY_DIAGNOSTICS: SignoutDiagnostics = { version: 1, items: [] };

export const DIAGNOSTIC_STATUSES: Record<DiagnosticItemType, string[]> = {
  lab: ["Current", "Pending", "Recheck", "Resolved"],
  imaging: ["Needed", "Ordered", "Scheduled", "Performed", "Prelim", "Final", "Reviewed"],
  pt: ["Pending", "Seen", "Cleared", "Follow-up"],
  other: ["Pending", "Active", "Complete"],
};

export const PT_RECOMMENDATIONS = [
  "Pending",
  "Home",
  "Home with assistance",
  "Home health",
  "SNF",
  "Acute rehab",
] as const;

export function todayIso(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function createDiagnosticItem(type: DiagnosticItemType = "lab"): DiagnosticItem {
  return {
    id: crypto.randomUUID(),
    type,
    label: type === "pt" ? "PT" : "",
    date: todayIso(),
    status: DIAGNOSTIC_STATUSES[type][0],
    details: "",
    pinned: false,
    labValues: [],
    ptDistance: "",
    ptRecommendation: "",
  };
}

function safeString(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isIsoDate(value: string): boolean {
  return value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeDiagnostics(value: unknown): SignoutDiagnostics {
  if (!value || typeof value !== "object") return EMPTY_DIAGNOSTICS;
  const raw = value as { version?: unknown; items?: unknown };
  if (raw.version !== 1 || !Array.isArray(raw.items)) return EMPTY_DIAGNOSTICS;
  const items: DiagnosticItem[] = [];
  for (const entry of raw.items.slice(0, 80)) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    if (!["lab", "imaging", "pt", "other"].includes(String(item.type))) continue;
    const type = item.type as DiagnosticItemType;
    const date = safeString(item.date, 10);
    const labValues: DiagnosticLabValue[] = Array.isArray(item.labValues)
      ? item.labValues.slice(0, 20).flatMap((rawValue) => {
          if (!rawValue || typeof rawValue !== "object") return [];
          const lab = rawValue as Record<string, unknown>;
          const labDate = safeString(lab.date, 10);
          const labValue = safeString(lab.value, 80);
          if (!labValue || !isIsoDate(labDate)) return [];
          return [{ id: safeString(lab.id, 80) || crypto.randomUUID(), value: labValue, date: labDate }];
        })
      : [];
    items.push({
      id: safeString(item.id, 80) || crypto.randomUUID(),
      type,
      label: safeString(item.label, 120),
      date: isIsoDate(date) ? date : "",
      status: safeString(item.status, 40),
      details: safeString(item.details, 2000),
      pinned: item.pinned === true,
      labValues,
      ptDistance: safeString(item.ptDistance, 80),
      ptRecommendation: safeString(item.ptRecommendation, 120),
    });
  }
  return { version: 1, items };
}

export function formatDiagnosticDate(date: string): string {
  if (!date) return "";
  const [, month, day] = date.split("-");
  return month && day ? `${Number(month)}/${Number(day)}` : date;
}

function numeric(value: string): number | null {
  if (!/^-?\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function labTrend(values: DiagnosticLabValue[]): "up" | "down" | "flat" | null {
  if (values.length < 2) return null;
  const latest = numeric(values[0].value);
  const previous = numeric(values[1].value);
  if (latest === null || previous === null) return null;
  return latest > previous ? "up" : latest < previous ? "down" : "flat";
}

export function diagnosticItemSummary(item: DiagnosticItem): string {
  if (item.type === "lab") {
    const history = item.labValues.slice(0, 3).map((v) => v.value).join(" ← ");
    const trend = labTrend(item.labValues);
    return [item.label, history, trend === "up" ? "↑" : trend === "down" ? "↓" : trend === "flat" ? "→" : ""]
      .filter(Boolean).join(" ");
  }
  if (item.type === "pt") {
    return [item.ptDistance ? `${item.ptDistance}` : "", item.ptRecommendation].filter(Boolean).join(" · ");
  }
  return [item.label, item.details].filter(Boolean).join(": ");
}

function isPending(item: DiagnosticItem): boolean {
  return /pending|needed|ordered|scheduled|performed|prelim|recheck|follow-up/i.test(item.status);
}

export function sortDiagnosticItems(items: DiagnosticItem[]): DiagnosticItem[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (isPending(a) !== isPending(b)) return isPending(a) ? -1 : 1;
    return b.date.localeCompare(a.date);
  });
}

export function formatDiagnosticsText(diagnostics: SignoutDiagnostics, limit?: number): string {
  const items = sortDiagnosticItems(diagnostics.items).slice(0, limit);
  return items.map((item) => {
    const meta = [formatDiagnosticDate(item.date), item.status].filter(Boolean).join(", ");
    const summary = diagnosticItemSummary(item);
    const prefix = item.pinned ? "★ " : "";
    return `${prefix}${summary}${meta ? ` (${meta})` : ""}`;
  }).join("\n");
}
