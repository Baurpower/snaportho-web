"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Layers3,
  ZoomIn,
  ZoomOut,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  PlanWeekButton,
  WeekPlannerPanel,
  type PlannerDay,
} from "@/components/workspace/weekplanner";
import {
  WeekScheduleView,
  type WeekDayCard,
} from "@/components/workspace/weekscheduleview";
import {
  MonthsScheduleView,
  type UserCalendarEvent,
  type RotationTimelineEvent,
} from "@/components/workspace/monthsscheduleview";
import type { TimeOffItem } from "@/lib/db/time-off";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38 } },
};

type ViewMode = "week" | "ahead";

type SummaryResponse = {
  membership: {
    id: string;
    programId: string | null;
    role: string | null;
    trainingLevel: string | null;
    classYear: number | null;
    displayName: string | null;
    program: {
      id: string;
      name: string | null;
      slug: string | null;
      institutionName: string | null;
      timezone: string | null;
    } | null;
  } | null;
  currentRotation: {
    id: string;
    name: string | null;
    shortName: string | null;
    category: string | null;
    color: string | null;
    startDate: string | null;
    endDate: string | null;
    siteLabel: string | null;
    teamLabel: string | null;
    notes: string | null;
  } | null;
  nextRotation: {
    id: string;
    name: string | null;
    shortName: string | null;
    category: string | null;
    color: string | null;
    startDate: string | null;
    endDate: string | null;
    siteLabel: string | null;
    teamLabel: string | null;
    notes: string | null;
  } | null;
  nextCall: {
    id: string;
    callType: string | null;
    callDate: string | null;
    startDatetime: string | null;
    endDatetime: string | null;
    site: string | null;
    isHomeCall: boolean | null;
    notes: string | null;
  } | null;
};

type WeekScheduleResponse = {
  weekStart: string;
  weekEnd: string;
  days: Array<{
    date: string;
    dayKey: string;
    primaryLabel: string | null;
    dayCategory: "OR" | "Clinic" | "Custom" | null;
    customTitle: string | null;
    location: string | null;
    attending: string | null;
    rotationPill: string | null;
    rotationColor: string | null;
    hasCall: boolean;
    callLabel: string | null;
  }>;
};

type MonthLiteResponse = {
  monthStart: string;
  monthEnd: string;
  membership: {
    id: string;
    displayName: string | null;
    trainingLevel: string | null;
    classYear: number | null;
  } | null;
  rotations: Array<{
    id: string;
    title: string;
    startDate: string | null;
    endDate: string | null;
    color: string | null;
  }>;
  calls: Array<{
    id: string;
    title: string | null;
    date: string | null;
    callType?: string | null;
    startDatetime?: string | null;
    endDatetime?: string | null;
    site?: string | null;
    isHomeCall?: boolean | null;
    notes?: string | null;
  }>;
  events: Array<{
    id: string;
    title: string | null;
    date: string | null;
    category: string | null;
    startTime?: string | null;
    endTime?: string | null;
    isAllDay?: boolean | null;
    location?: string | null;
    description?: string | null;
    attending?: string | null;
  }>;
  timeOff: TimeOffItem[];
};

type RotationTimelineResponse = {
  start: string;
  end: string;
  fetchStart?: string;
  fetchEnd?: string;
  membership: {
    id: string;
    displayName: string | null;
    trainingLevel: string | null;
    classYear: number | null;
  } | null;
  rotations: Array<{
    id: string;
    title: string;
    startDate: string | null;
    endDate: string | null;
    color: string | null;
    siteLabel: string | null;
    teamLabel: string | null;
    rotation: {
      id: string;
      name: string | null;
      shortName: string | null;
      color: string | null;
    } | null;
  }>;
};

type MonthlyCoverageResponse = {
  groups: Array<{
    rotationId: string;
    rotation: string;
    shortName: string | null;
    category: string | null;
    color: string | null;
    residents: Array<{
      membershipId: string;
      resident: string;
      level: string;
      service: string | null;
      startDate: string;
      endDate: string;
    }>;
  }>;
};

type ProgramCallItem = {
  id: string;
  membershipId: string | null;
  residentName: string;
  trainingLevel: string | null;
  classYear: number | null;
  userId: string | null;
  callType: string | null;
  callDate: string | null;
  startDatetime: string | null;
  endDatetime: string | null;
  site: string | null;
  isHomeCall: boolean | null;
  notes: string | null;
  isMine: boolean;
};

type AheadMonth = {
  year: number;
  monthIndex: number;
  label: string;
};

function getMonthKey(input: { year: number; monthIndex: number }) {
  return `${input.year}-${input.monthIndex}`;
}

function formatShortDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMonthLabel(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getMonthRange(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    monthStart: start.toISOString().slice(0, 10),
    monthEnd: end.toISOString().slice(0, 10),
  };
}

function addWeeks(baseDate: Date, weeks: number) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

function addMonths(baseDate: Date, months: number) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + months, 1);
}

function getWeekRangeFromOffset(offset = 0) {
  const now = new Date();
  const base = addWeeks(now, offset);

  const utcDate = new Date(
    Date.UTC(base.getFullYear(), base.getMonth(), base.getDate())
  );

  const day = utcDate.getUTCDay();

  const weekStart = new Date(utcDate);
  weekStart.setUTCDate(utcDate.getUTCDate() - day);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
  };
}

function buildAheadMonths(count = 3, startOffset = 0): AheadMonth[] {
  const now = new Date();
  const startDate = addMonths(now, startOffset);

  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + index,
      1
    );
    return {
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
      label: formatMonthLabel(date.getFullYear(), date.getMonth()),
    };
  });
}

function normalizeColorToTone(color: string | null | undefined) {
  if (!color) return "bg-slate-100 text-slate-900 border-slate-200";

  const normalized = color.toLowerCase();

  if (
    normalized.includes("sky") ||
    normalized.includes("blue") ||
    normalized.startsWith("#")
  ) {
    return "bg-sky-100 text-sky-900 border-sky-200";
  }
  if (normalized.includes("emerald") || normalized.includes("green")) {
    return "bg-emerald-100 text-emerald-950 border-emerald-200";
  }
  if (normalized.includes("violet") || normalized.includes("purple")) {
    return "bg-violet-100 text-violet-950 border-violet-200";
  }
  if (normalized.includes("amber") || normalized.includes("yellow")) {
    return "bg-amber-100 text-amber-950 border-amber-200";
  }
  if (normalized.includes("rose") || normalized.includes("red")) {
    return "bg-rose-100 text-rose-950 border-rose-200";
  }

  return "bg-slate-100 text-slate-900 border-slate-200";
}

function getTimelineRange(months: AheadMonth[]) {
  if (months.length === 0) {
    const now = new Date();
    const year = now.getFullYear();
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    };
  }

  const first = months[0];
  const last = months[months.length - 1];

  const start = new Date(first.year, first.monthIndex, 1);
  const end = new Date(last.year, last.monthIndex + 1, 0);

  const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(start.getDate()).padStart(2, "0")}`;

  const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(end.getDate()).padStart(2, "0")}`;

  return {
    start: startKey,
    end: endKey,
  };
}

function buildMonthEvents(data: MonthLiteResponse | null): UserCalendarEvent[] {
  if (!data) return [];

  const callEvents: UserCalendarEvent[] = data.calls
    .filter((item) => item.date)
    .map(
      (item): UserCalendarEvent => ({
        id: `call-${item.id}`,
        title: item.title ?? "Call",
        startDate: item.date!,
        endDate: item.date!,
        color: "slate",
        kind: "call",
        category: item.callType ?? null,
        location: item.site ?? null,
        notes: item.notes ?? null,
      })
    );

  const scheduleEvents: UserCalendarEvent[] = data.events
    .filter((item) => item.date)
    .map(
      (item): UserCalendarEvent => ({
        id: `event-${item.id}`,
        title: item.title ?? "Event",
        startDate: item.date!,
        endDate: item.date!,
        color:
          item.category?.toLowerCase() === "or"
            ? "sky"
            : item.category?.toLowerCase() === "clinic"
            ? "emerald"
            : "violet",
        kind: "event",
        category: item.category ?? null,
        location: item.location ?? null,
        attending: item.attending ?? null,
        notes: item.description ?? null,
      })
    );

  return [...callEvents, ...scheduleEvents].sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
    if (a.kind !== b.kind) {
      const rank = { rotation: 0, call: 1, event: 2 };
      return rank[a.kind] - rank[b.kind];
    }
    return a.title.localeCompare(b.title);
  });
}

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getUserScheduleLabelForDay(
  day:
    | {
        dayCategory: "OR" | "Clinic" | "Custom" | null;
        primaryLabel: string | null;
        customTitle: string | null;
      }
    | null
    | undefined
) {
  if (!day) return "Not planned";
  if (day.dayCategory === "OR") return "OR";
  if (day.dayCategory === "Clinic") return "Clinic";
  if (day.dayCategory === "Custom") {
    return day.customTitle?.trim() || day.primaryLabel?.trim() || "Custom";
  }
  return "Not planned";
}

function formatTodayCallSummary(calls: ProgramCallItem[]) {
  if (calls.length === 0) return "No call assigned today";

  const primary = calls.find((call) => call.callType === "Primary");
  const backup = calls.find((call) => call.callType === "Backup");

  const primaryLabel = primary
    ? `Primary: ${primary.isMine ? "Me" : primary.residentName}`
    : "Primary: —";

  const backupLabel = backup
    ? `Backup: ${backup.isMine ? "Me" : backup.residentName}`
    : "Backup: —";

  return `${primaryLabel} · ${backupLabel}`;
}

function StatCard({
  title,
  value,
  subtitle,
  loading = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/95 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.16)] backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {title}
      </p>

      {loading ? (
        <>
          <div className="mt-4 h-8 w-36 animate-pulse rounded-xl bg-slate-200" />
          <div className="mt-3 h-4 w-28 animate-pulse rounded-lg bg-slate-100" />
        </>
      ) : (
        <>
          <p className="mt-3 text-[1.9rem] font-black tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        </>
      )}
    </div>
  );
}

function ViewToggle({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2rem] border border-slate-200/90 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

function RotationsPanel({
  months,
  activeMonthIndex,
  setActiveMonthIndex,
  coverageByMonth,
  coverageLoading,
}: {
  months: AheadMonth[];
  activeMonthIndex: number;
  setActiveMonthIndex: React.Dispatch<React.SetStateAction<number>>;
  coverageByMonth: Record<string, MonthlyCoverageResponse | null>;
  coverageLoading: boolean;
}) {
  const activeMonth = months[activeMonthIndex] ?? null;
  const activeKey = activeMonth ? getMonthKey(activeMonth) : "";
  const coverage = activeKey ? coverageByMonth[activeKey] ?? null : null;

  const groupedRotations = useMemo(() => {
    if (!coverage) return [];

    return coverage.groups.map((group) => ({
      rotation: group.shortName ?? group.rotation,
      tone: normalizeColorToTone(group.color),
      residents: group.residents.map((resident) => ({
        resident: resident.resident,
        level: resident.level,
        service: resident.service ?? "—",
      })),
    }));
  }, [coverage]);

  if (!activeMonth) {
    return (
      <SectionShell>
        <div className="px-5 py-6 text-sm text-slate-500">No months available.</div>
      </SectionShell>
    );
  }

  return (
    <SectionShell className="overflow-hidden">
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-5 py-5 md:px-6 md:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3 text-slate-950">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold tracking-tight">Rotations</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Quick monthly coverage across the program
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveMonthIndex((prev) => Math.max(prev - 1, 0))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 disabled:opacity-35"
              disabled={activeMonthIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="min-w-[150px] px-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Active Month
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-950">
                {activeMonth.label}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setActiveMonthIndex((prev) => Math.min(prev + 1, months.length - 1))
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 disabled:opacity-35"
              disabled={activeMonthIndex === months.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {months.map((month, index) => (
            <button
              key={getMonthKey(month)}
              type="button"
              onClick={() => setActiveMonthIndex(index)}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                index === activeMonthIndex
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {month.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 md:px-5 md:py-5">
        <div className="mb-4 flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Rotation Coverage
          </p>
          <p className="text-xs text-slate-500">
            {coverageLoading ? "Loading..." : `${groupedRotations.length} rotations`}
          </p>
        </div>

        {coverageLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Loading monthly coverage...
          </div>
        ) : groupedRotations.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No coverage found for this month.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {groupedRotations.map((group) => (
              <div
                key={`${activeKey}-${group.rotation}`}
                className="relative overflow-hidden rounded-[1.55rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 ${group.tone
                    .replace(/text-\S+/g, "")
                    .replace(/border-\S+/g, "")
                    .trim()}`}
                />

                <div className="pt-2">
                  <h4 className="text-[1.85rem] font-black leading-none tracking-[-0.03em] text-slate-950">
                    {group.rotation}
                  </h4>
                  <p className="mt-2 text-sm font-medium text-slate-400">
                    {group.residents.length} resident
                    {group.residents.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="mt-5 space-y-2">
                  {group.residents.map((resident) => (
                    <div
                      key={`${group.rotation}-${resident.resident}-${resident.level}`}
                      className="rounded-[1rem] border border-slate-200 bg-slate-50/80 px-3.5 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {resident.resident}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {resident.service}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
                          {resident.level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionShell>
  );
}

export default function SnapOrthoWorkspaceHomeDraft() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [weekData, setWeekData] = useState<WeekScheduleResponse | null>(null);

  const [summaryLoading, setSummaryLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(false);
  const [rotationLoading, setRotationLoading] = useState(false);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [todayCallsLoading, setTodayCallsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [weekOffset, setWeekOffset] = useState(0);
  const [aheadStartOffset, setAheadStartOffset] = useState(0);
  const [activeMonthIndex, setActiveMonthIndex] = useState(0);
  const [isPlanningWeek, setIsPlanningWeek] = useState(false);

  const [programCallsByMonthKey, setProgramCallsByMonthKey] = useState<
    Record<string, ProgramCallItem[]>
  >({});

  const aheadMonths = useMemo(
    () => buildAheadMonths(3, aheadStartOffset),
    [aheadStartOffset]
  );

  const [monthDataByKey, setMonthDataByKey] = useState<
    Record<string, MonthLiteResponse | null>
  >({});

  const [rotationTimelineEvents, setRotationTimelineEvents] = useState<
    RotationTimelineEvent[]
  >([]);

  const [coverageByMonth, setCoverageByMonth] = useState<
    Record<string, MonthlyCoverageResponse | null>
  >({});

  const [timeOffByMonthKey, setTimeOffByMonthKey] = useState<
    Record<string, TimeOffItem[]>
  >({});

  const visibleWeekRange = useMemo(
    () => getWeekRangeFromOffset(weekOffset),
    [weekOffset]
  );

  const plannerDays = useMemo<PlannerDay[]>(
    () =>
      (weekData?.days ?? []).map((day) => ({
        date: day.date,
        dayKey: day.dayKey,
      })),
    [weekData]
  );

  const weekCards = useMemo<WeekDayCard[]>(
    () => (weekData?.days ?? []).map((day) => ({ ...day })),
    [weekData]
  );

  const monthEventsByKey = useMemo<Record<string, UserCalendarEvent[]>>(() => {
    const mapped: Record<string, UserCalendarEvent[]> = {};

    for (const month of aheadMonths) {
      const key = getMonthKey(month);
      mapped[key] = buildMonthEvents(monthDataByKey[key] ?? null);
    }

    return mapped;
  }, [aheadMonths, monthDataByKey]);

  useEffect(() => {
    setActiveMonthIndex(0);
  }, [aheadStartOffset]);

  useEffect(() => {
    if (viewMode !== "week") {
      setIsPlanningWeek(false);
    }
  }, [viewMode]);

  async function reloadWeek() {
    const response = await fetch(
      `/api/me/week-lite?weekStart=${visibleWeekRange.weekStart}&weekEnd=${visibleWeekRange.weekEnd}`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to reload week schedule");
    }

    setWeekData(payload);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        setSummaryLoading(true);
        setError(null);

        const response = await fetch("/api/me/summary", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to load summary");
        }

        const data: SummaryResponse = await response.json();

        if (!cancelled) {
          setSummary(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load summary");
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWeek() {
      try {
        setWeekLoading(true);

        const response = await fetch(
          `/api/me/week-lite?weekStart=${visibleWeekRange.weekStart}&weekEnd=${visibleWeekRange.weekEnd}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to load week schedule");
        }

        const data: WeekScheduleResponse = await response.json();

        if (!cancelled) {
          setWeekData(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load week schedule");
        }
      } finally {
        if (!cancelled) {
          setWeekLoading(false);
        }
      }
    }

    loadWeek();

    return () => {
      cancelled = true;
    };
  }, [visibleWeekRange.weekStart, visibleWeekRange.weekEnd]);

  useEffect(() => {
    let cancelled = false;

    async function loadMonths() {
      if (viewMode !== "ahead") return;

      try {
        setMonthLoading(true);

        const monthsToFetch = aheadMonths.filter((month) => {
          const key = getMonthKey(month);
          return !(key in monthDataByKey);
        });

        if (monthsToFetch.length === 0) return;

        const results = await Promise.all(
          monthsToFetch.map(async (month) => {
            const key = getMonthKey(month);
            const { monthStart, monthEnd } = getMonthRange(month.year, month.monthIndex);

            const response = await fetch(
              `/api/me/month-lite?monthStart=${monthStart}&monthEnd=${monthEnd}`,
              {
                credentials: "include",
                cache: "no-store",
              }
            );

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
              throw new Error(payload?.error ?? `Failed to load month ${month.label}`);
            }

            const data = payload as MonthLiteResponse;

            return {
              key,
              data,
              timeOff: Array.isArray(data.timeOff) ? data.timeOff : [],
            };
          })
        );

        if (!cancelled) {
          setMonthDataByKey((prev) => {
            const next = { ...prev };
            for (const result of results) {
              next[result.key] = result.data;
            }
            return next;
          });

          setTimeOffByMonthKey((prev) => {
            const next = { ...prev };
            for (const result of results) {
              next[result.key] = result.timeOff;
            }
            return next;
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load monthly schedule"
          );
        }
      } finally {
        if (!cancelled) {
          setMonthLoading(false);
        }
      }
    }

    loadMonths();

    return () => {
      cancelled = true;
    };
  }, [viewMode, aheadMonths, monthDataByKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadRotationTimeline() {
      if (viewMode !== "ahead") return;

      try {
        setRotationLoading(true);

        const { start, end } = getTimelineRange(aheadMonths);

        const response = await fetch(`/api/me/rotations?start=${start}&end=${end}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to load rotation timeline");
        }

        const data: RotationTimelineResponse = await response.json();

        const mapped: RotationTimelineEvent[] = (data.rotations ?? [])
          .filter((item) => item.startDate && item.endDate)
          .map((item) => ({
            id: item.id,
            title:
              item.rotation?.shortName ??
              item.rotation?.name ??
              item.title ??
              item.teamLabel ??
              item.siteLabel ??
              "Rotation",
            startDate: item.startDate!,
            endDate: item.endDate!,
            color: item.rotation?.color ?? item.color ?? "sky",
          }));

        if (!cancelled) {
          setRotationTimelineEvents(mapped);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load rotation timeline"
          );
        }
      } finally {
        if (!cancelled) {
          setRotationLoading(false);
        }
      }
    }

    loadRotationTimeline();

    return () => {
      cancelled = true;
    };
  }, [viewMode, aheadMonths]);

  useEffect(() => {
    let cancelled = false;

    async function loadProgramCalls() {
      if (viewMode !== "ahead") return;

      try {
        const monthsToFetch = aheadMonths.filter((month) => {
          const key = getMonthKey(month);
          return !(key in programCallsByMonthKey);
        });

        if (monthsToFetch.length === 0) return;

        const results = await Promise.all(
          monthsToFetch.map(async (month) => {
            const key = getMonthKey(month);
            const { monthStart, monthEnd } = getMonthRange(month.year, month.monthIndex);

            const response = await fetch(
              `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
              {
                credentials: "include",
                cache: "no-store",
              }
            );

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
              throw new Error(
                payload?.error ?? `Failed to load program calls for ${month.label}`
              );
            }

            return {
              key,
              calls: Array.isArray(payload?.calls)
                ? (payload.calls as ProgramCallItem[])
                : [],
            };
          })
        );

        if (!cancelled) {
          setProgramCallsByMonthKey((prev) => {
            const next = { ...prev };
            for (const result of results) {
              next[result.key] = result.calls;
            }
            return next;
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load monthly program calls"
          );
        }
      }
    }

    loadProgramCalls();

    return () => {
      cancelled = true;
    };
  }, [viewMode, aheadMonths, programCallsByMonthKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadTodayMonthProgramCalls() {
      try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${now.getMonth()}`;

        if (programCallsByMonthKey[monthKey]) return;

        setTodayCallsLoading(true);

        const { monthStart, monthEnd } = getMonthRange(
          now.getFullYear(),
          now.getMonth()
        );

        const response = await fetch(
          `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load today's program calls");
        }

        if (!cancelled) {
          setProgramCallsByMonthKey((prev) => ({
            ...prev,
            [monthKey]: Array.isArray(payload?.calls)
              ? (payload.calls as ProgramCallItem[])
              : [],
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load today's program calls"
          );
        }
      } finally {
        if (!cancelled) {
          setTodayCallsLoading(false);
        }
      }
    }

    loadTodayMonthProgramCalls();

    return () => {
      cancelled = true;
    };
  }, [programCallsByMonthKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadCoverageForActiveMonth() {
      const activeMonth = aheadMonths[activeMonthIndex];
      if (!activeMonth) return;

      const key = getMonthKey(activeMonth);

      if (coverageByMonth[key]) return;

      try {
        setCoverageLoading(true);

        const { monthStart, monthEnd } = getMonthRange(
          activeMonth.year,
          activeMonth.monthIndex
        );

        const response = await fetch(
          `/api/program/coverage?monthStart=${monthStart}&monthEnd=${monthEnd}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to load monthly coverage");
        }

        const data: MonthlyCoverageResponse = await response.json();

        if (!cancelled) {
          setCoverageByMonth((prev) => ({
            ...prev,
            [key]: data,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load monthly coverage"
          );
        }
      } finally {
        if (!cancelled) {
          setCoverageLoading(false);
        }
      }
    }

    loadCoverageForActiveMonth();

    return () => {
      cancelled = true;
    };
  }, [activeMonthIndex, aheadMonths, coverageByMonth]);

  const weekHeaderLabel = useMemo(() => {
    const start = new Date(`${visibleWeekRange.weekStart}T00:00:00`);
    const end = new Date(`${visibleWeekRange.weekEnd}T00:00:00`);

    const sameMonth = start.getMonth() === end.getMonth();
    const sameYear = start.getFullYear() === end.getFullYear();

    if (sameMonth && sameYear) {
      return `${start.toLocaleDateString("en-US", {
        month: "long",
      })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }

    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }, [visibleWeekRange.weekStart, visibleWeekRange.weekEnd]);

  const aheadHeaderLabel = useMemo(() => {
    if (aheadMonths.length === 0) return "3 Months";
    return `${aheadMonths[0].label} – ${aheadMonths[aheadMonths.length - 1].label}`;
  }, [aheadMonths]);

  const todayKey = useMemo(() => getTodayDateKey(), []);

  const todayWeekDay = useMemo(() => {
    return weekData?.days.find((day) => day.date === todayKey) ?? null;
  }, [weekData, todayKey]);

  const todayMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}`;
  }, []);

  const todayProgramCalls = useMemo(() => {
    const monthCalls = programCallsByMonthKey[todayMonthKey] ?? [];
    return monthCalls.filter((call) => call.callDate === todayKey);
  }, [programCallsByMonthKey, todayMonthKey, todayKey]);

  const todayScheduleLabel = useMemo(() => {
    return getUserScheduleLabelForDay(todayWeekDay);
  }, [todayWeekDay]);

  const todayCallSummary = useMemo(() => {
    return formatTodayCallSummary(todayProgramCalls);
  }, [todayProgramCalls]);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-100 text-slate-900">
      <section className="relative overflow-hidden px-4 pb-8 pt-8 sm:px-6 md:px-8 md:pb-10 md:pt-10 xl:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.08),transparent_18%)]" />

        <div className="relative mx-auto max-w-[1480px]">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_28px_80px_rgba(2,8,23,0.38)] backdrop-blur md:p-8 xl:p-9"
          >
            <div className="flex flex-col gap-7">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                  <Layers3 className="h-4 w-4" />
                  SnapOrtho
                </div>

                <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl xl:text-6xl">
                  Workspace
                </h1>

                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                  A clean, fast view of your schedule with the things you actually
                  need first.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  title="Current Rotation"
                  value={
                    summary?.currentRotation?.shortName ??
                    summary?.currentRotation?.name ??
                    "—"
                  }
                  subtitle={
                    summary?.currentRotation
                      ? `${formatShortDate(
                          summary.currentRotation.startDate
                        )} – ${formatShortDate(summary.currentRotation.endDate)}`
                      : "No current rotation"
                  }
                  loading={summaryLoading}
                />

                <StatCard
                  title="Next Call"
                  value={formatShortDate(summary?.nextCall?.callDate)}
                  subtitle={
                    summary?.nextCall?.callType ??
                    summary?.nextCall?.site ??
                    "No upcoming call"
                  }
                  loading={summaryLoading}
                />

                <StatCard
                  title="Today"
                  value={todayScheduleLabel}
                  subtitle={todayCallSummary}
                  loading={weekLoading || todayCallsLoading}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 md:px-8 md:pb-16 xl:px-10">
        <div className="mx-auto max-w-[1480px] space-y-6">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
              {error}
            </div>
          ) : null}

          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <SectionShell className="p-4 md:p-5 xl:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  {viewMode === "week" ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setWeekOffset((prev) => prev - 1)}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                        aria-label="Previous week"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setWeekOffset((prev) => prev + 1)}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                        aria-label="Next week"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Schedule
                    </p>

                    <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                      <div className="min-w-0">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                          {viewMode === "week" ? "This week" : "What’s ahead"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {viewMode === "week" ? weekHeaderLabel : aheadHeaderLabel}
                        </p>
                      </div>

                      {viewMode === "week" ? (
                        <PlanWeekButton
                          isOpen={isPlanningWeek}
                          onClick={() => setIsPlanningWeek((prev) => !prev)}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex w-full items-center justify-start lg:w-auto lg:justify-end">
                  <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1.5">
                    <ViewToggle
                      active={viewMode === "week"}
                      label="Current Week"
                      icon={<ZoomIn className="h-4 w-4" />}
                      onClick={() => setViewMode("week")}
                    />
                    <ViewToggle
                      active={viewMode === "ahead"}
                      label="Months Ahead"
                      icon={<ZoomOut className="h-4 w-4" />}
                      onClick={() => setViewMode("ahead")}
                    />
                  </div>
                </div>
              </div>

              {viewMode === "week" && isPlanningWeek ? (
                <div className="mt-6">
                  <WeekPlannerPanel
                    days={plannerDays}
                    onClose={() => setIsPlanningWeek(false)}
                    onCreated={async () => {
                      await reloadWeek();
                    }}
                  />
                </div>
              ) : null}

              <div className="mt-6">
                {viewMode === "week" ? (
                  <WeekScheduleView days={weekCards} loading={weekLoading} />
                ) : (
                  <MonthsScheduleView
                    months={aheadMonths}
                    monthDataByKey={monthEventsByKey}
                    rotationTimelineEvents={rotationTimelineEvents}
                    programCallsByMonthKey={programCallsByMonthKey}
                    timeOffByMonthKey={timeOffByMonthKey}
                    loading={monthLoading}
                    rotationLoading={rotationLoading}
                    onPrevious={() => setAheadStartOffset((prev) => prev - 1)}
                    onNext={() => setAheadStartOffset((prev) => prev + 1)}
                    currentMembershipId={summary?.membership?.id ?? null}
                    currentDisplayName={summary?.membership?.displayName ?? null}
                  />
                )}
              </div>

              <div className="mt-8">
                <RotationsPanel
                  months={aheadMonths}
                  activeMonthIndex={activeMonthIndex}
                  setActiveMonthIndex={setActiveMonthIndex}
                  coverageByMonth={coverageByMonth}
                  coverageLoading={coverageLoading}
                />
              </div>
            </SectionShell>
          </motion.div>
        </div>
      </section>
    </main>
  );
}