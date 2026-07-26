/**
 * Shared Time-Off display helpers for personal planner + program dashboard.
 */

import type {
  ApprovalStatus,
  TimeOffItem,
  TimeOffMonthResponse,
  TimeOffType,
} from "@/lib/workspace/call/time-off-shared";
import { getTimeOffTypeLabel } from "@/lib/workspace/call/time-off-shared";

export type { ApprovalStatus, TimeOffItem, TimeOffMonthResponse, TimeOffType };

export type ProgramTimeOffViewMode = "calendar" | "list" | "resident";

export type ProgramTimeOffFilters = {
  residentQuery: string;
  types: Set<TimeOffType> | null; // null = all
  statuses: Set<ApprovalStatus> | null;
  usingPto: "all" | "yes" | "no";
};

export function createDefaultProgramFilters(): ProgramTimeOffFilters {
  return {
    residentQuery: "",
    types: null,
    statuses: null,
    usingPto: "all",
  };
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthRange(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    monthStart: start.toISOString().slice(0, 10),
    monthEnd: end.toISOString().slice(0, 10),
  };
}

export function formatShortDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate) return "—";

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate ?? startDate}T00:00:00`);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const sameDay = sameMonth && start.getDate() === end.getDate();

  if (sameDay) {
    return start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${end.getDate()}, ${end.getFullYear()}`;
  }

  if (sameYear) {
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} – ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function enumerateDateKeys(startDate: string | null, endDate: string | null) {
  if (!startDate) return [] as string[];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate ?? startDate}T00:00:00`);
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function getDayCount(startDate: string | null, endDate: string | null) {
  return enumerateDateKeys(startDate, endDate).length;
}

export function sortByStartDate(items: TimeOffItem[]) {
  return [...items].sort((a, b) =>
    (a.startDate ?? "").localeCompare(b.startDate ?? "")
  );
}

function isApprovalStatus(value: unknown): value is ApprovalStatus {
  return value === "requested" || value === "approved" || value === "denied";
}

function isTimeOffType(value: unknown): value is TimeOffType {
  return (
    value === "personal" ||
    value === "conference" ||
    value === "vacation" ||
    value === "sick" ||
    value === "other"
  );
}

export function normalizeTimeOffMonthResponse(payload: unknown): TimeOffMonthResponse {
  const safePayload =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const rawItems = Array.isArray(safePayload.items) ? safePayload.items : [];

  const items: TimeOffItem[] = rawItems.map((raw, index) => {
    const item =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

    return {
      id: typeof item.id === "string" ? item.id : `fallback-${index}`,
      membershipId:
        typeof item.membershipId === "string" ? item.membershipId : null,
      rosterId: typeof item.rosterId === "string" ? item.rosterId : null,
      programMembershipId:
        typeof item.programMembershipId === "string"
          ? item.programMembershipId
          : null,
      residentName:
        typeof item.residentName === "string"
          ? item.residentName
          : "Unknown Resident",
      trainingLevel:
        typeof item.trainingLevel === "string" ? item.trainingLevel : null,
      classYear: typeof item.classYear === "number" ? item.classYear : null,
      userId: typeof item.userId === "string" ? item.userId : null,
      type: isTimeOffType(item.type) ? item.type : "personal",
      usingPto: Boolean(item.usingPto),
      startDate: typeof item.startDate === "string" ? item.startDate : null,
      endDate: typeof item.endDate === "string" ? item.endDate : null,
      title: typeof item.title === "string" ? item.title : null,
      location: typeof item.location === "string" ? item.location : null,
      notes: typeof item.notes === "string" ? item.notes : null,
      approvalStatus: isApprovalStatus(item.approvalStatus)
        ? item.approvalStatus
        : null,
      approved: typeof item.approved === "boolean" ? item.approved : null,
      isMine: Boolean(item.isMine),
    };
  });

  return {
    monthStart:
      typeof safePayload.monthStart === "string" ? safePayload.monthStart : "",
    monthEnd:
      typeof safePayload.monthEnd === "string" ? safePayload.monthEnd : "",
    myMembershipId:
      typeof safePayload.myMembershipId === "string"
        ? safePayload.myMembershipId
        : null,
    myRosterId:
      typeof safePayload.myRosterId === "string" ? safePayload.myRosterId : null,
    items,
  };
}

export function mergeTimeOffItems(itemLists: TimeOffItem[][]) {
  const byId = new Map<string, TimeOffItem>();
  for (const list of itemLists) {
    for (const item of list) {
      byId.set(item.id, item);
    }
  }
  return sortByStartDate(Array.from(byId.values()));
}

export type TimeOffTone = {
  card: string;
  badge: string;
  text: string;
  label: string;
  dot: string;
};

export function getTimeOffTone(
  item: Pick<TimeOffItem, "type" | "isMine">
): TimeOffTone {
  if (item.type === "conference") {
    return {
      card: item.isMine
        ? "border-violet-300 bg-violet-50"
        : "border-violet-200 bg-violet-50/70",
      badge: "bg-violet-600 text-white",
      text: "text-violet-950",
      label: getTimeOffTypeLabel("conference"),
      dot: "bg-violet-500",
    };
  }
  if (item.type === "vacation") {
    return {
      card: item.isMine
        ? "border-sky-300 bg-sky-50"
        : "border-sky-200 bg-sky-50/70",
      badge: "bg-sky-600 text-white",
      text: "text-sky-950",
      label: getTimeOffTypeLabel("vacation"),
      dot: "bg-sky-500",
    };
  }
  if (item.type === "sick") {
    return {
      card: item.isMine
        ? "border-rose-300 bg-rose-50"
        : "border-rose-200 bg-rose-50/70",
      badge: "bg-rose-600 text-white",
      text: "text-rose-950",
      label: getTimeOffTypeLabel("sick"),
      dot: "bg-rose-500",
    };
  }
  if (item.type === "other") {
    return {
      card: item.isMine
        ? "border-amber-300 bg-amber-50"
        : "border-amber-200 bg-amber-50/70",
      badge: "bg-amber-600 text-white",
      text: "text-amber-950",
      label: getTimeOffTypeLabel("other"),
      dot: "bg-amber-500",
    };
  }
  return {
    card: item.isMine
      ? "border-slate-300 bg-slate-100"
      : "border-slate-200 bg-slate-50",
    badge: "bg-slate-900 text-white",
    text: "text-slate-950",
    label: getTimeOffTypeLabel(item.type),
    dot: "bg-slate-500",
  };
}

export function getApprovalTone(status: ApprovalStatus | null | undefined) {
  if (status === "approved") {
    return {
      label: "Approved",
      className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    };
  }
  if (status === "denied") {
    return {
      label: "Denied",
      className: "bg-rose-100 text-rose-700 border border-rose-200",
    };
  }
  return {
    label: "Requested",
    className: "bg-amber-100 text-amber-700 border border-amber-200",
  };
}

export function filterProgramTimeOffItems(
  items: TimeOffItem[],
  filters: ProgramTimeOffFilters
) {
  const q = filters.residentQuery.trim().toLowerCase();
  return items.filter((item) => {
    if (q) {
      const hay = `${item.residentName} ${item.title ?? ""} ${item.notes ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.types && filters.types.size > 0 && !filters.types.has(item.type)) {
      return false;
    }
    if (
      filters.statuses &&
      filters.statuses.size > 0 &&
      (!item.approvalStatus || !filters.statuses.has(item.approvalStatus))
    ) {
      return false;
    }
    if (filters.usingPto === "yes" && !item.usingPto) return false;
    if (filters.usingPto === "no" && item.usingPto) return false;
    return true;
  });
}

export function buildProgramKpis(items: TimeOffItem[], todayKey: string) {
  const pending = items.filter((i) => i.approvalStatus === "requested").length;
  const approvedDays = items
    .filter((i) => i.approvalStatus === "approved" || i.approvalStatus == null)
    .reduce((sum, i) => sum + getDayCount(i.startDate, i.endDate), 0);
  const conferenceDays = items
    .filter((i) => i.type === "conference")
    .reduce((sum, i) => sum + getDayCount(i.startDate, i.endDate), 0);
  const ptoDays = items
    .filter((i) => i.usingPto)
    .reduce((sum, i) => sum + getDayCount(i.startDate, i.endDate), 0);

  const outTodayRoster = new Set<string>();
  for (const item of items) {
    if (item.approvalStatus === "denied") continue;
    const keys = enumerateDateKeys(item.startDate, item.endDate);
    if (keys.includes(todayKey)) {
      outTodayRoster.add(item.rosterId ?? item.id);
    }
  }

  return {
    eventCount: items.length,
    pending,
    outToday: outTodayRoster.size,
    approvedDays,
    conferenceDays,
    ptoDays,
  };
}

export function groupItemsByResident(items: TimeOffItem[]) {
  const map = new Map<
    string,
    {
      key: string;
      rosterId: string | null;
      residentName: string;
      items: TimeOffItem[];
      ptoDays: number;
      conferenceDays: number;
      totalDays: number;
    }
  >();

  for (const item of items) {
    const key = item.rosterId ?? `membership:${item.programMembershipId ?? item.id}`;
    const existing = map.get(key);
    const days = getDayCount(item.startDate, item.endDate);
    if (!existing) {
      map.set(key, {
        key,
        rosterId: item.rosterId,
        residentName: item.residentName,
        items: [item],
        ptoDays: item.usingPto ? days : 0,
        conferenceDays: item.type === "conference" ? days : 0,
        totalDays: days,
      });
    } else {
      existing.items.push(item);
      existing.totalDays += days;
      if (item.usingPto) existing.ptoDays += days;
      if (item.type === "conference") existing.conferenceDays += days;
    }
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      items: sortByStartDate(group.items),
    }))
    .sort((a, b) => a.residentName.localeCompare(b.residentName));
}

export function itemsForDate(items: TimeOffItem[], dateKey: string) {
  return sortByStartDate(
    items.filter((item) => {
      if (item.approvalStatus === "denied") return false;
      return enumerateDateKeys(item.startDate, item.endDate).includes(dateKey);
    })
  );
}

export function buildMonthCells(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay(); // 0 Sun
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<{ dateKey: string | null; day: number | null }> = [];

  for (let i = 0; i < startPad; i++) {
    cells.push({ dateKey: null, day: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ dateKey, day });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: null, day: null });
  }
  return cells;
}

export function findOverlappingPairs(items: TimeOffItem[]) {
  const byRoster = new Map<string, TimeOffItem[]>();
  for (const item of items) {
    const key = item.rosterId ?? item.id;
    const list = byRoster.get(key) ?? [];
    list.push(item);
    byRoster.set(key, list);
  }

  const pairs: Array<{ a: TimeOffItem; b: TimeOffItem }> = [];
  for (const list of byRoster.values()) {
    const sorted = sortByStartDate(list);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        if (!a.startDate || !a.endDate || !b.startDate || !b.endDate) continue;
        if (a.startDate <= b.endDate && a.endDate >= b.startDate) {
          pairs.push({ a, b });
        }
      }
    }
  }
  return pairs;
}
