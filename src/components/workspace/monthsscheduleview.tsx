"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Bell,
  Slice,
} from "lucide-react";

export type UserCalendarEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color?: string | null;
  kind: "rotation" | "call" | "event";
  category?: string | null;
};

export type RotationTimelineEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color?: string | null;
};

export type AheadMonth = {
  year: number;
  monthIndex: number;
  label: string;
};

type MonthsScheduleViewProps = {
  months: AheadMonth[];
  monthDataByKey: Record<string, UserCalendarEvent[]>;
  rotationTimelineEvents: RotationTimelineEvent[];
  loading?: boolean;
  rotationLoading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

const TIMELINE_LABEL_COL = "170px";
const TIMELINE_GRID = `md:grid-cols-[${TIMELINE_LABEL_COL}_minmax(0,1fr)]`;

function toLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1);
}

function endOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0);
}

function startOfWeekSunday(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function clampDate(date: Date, min: Date, max: Date) {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

function isSameMonth(date: Date, year: number, monthIndex: number) {
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}

function buildCalendarWeeksSunday(year: number, monthIndex: number) {
  const monthStart = startOfMonth(year, monthIndex);
  const monthEnd = endOfMonth(year, monthIndex);

  const gridStart = startOfWeekSunday(monthStart);
  const gridEnd = addDays(startOfWeekSunday(monthEnd), 6);

  const weeks: Date[][] = [];
  let cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function getMonthKey(month: AheadMonth) {
  return `${month.year}-${month.monthIndex}`;
}

function normalizeColor(color?: string | null) {
  if (!color) return "#0f172a";
  if (color.startsWith("#")) return color;

  const normalized = color.toLowerCase();

  if (normalized.includes("sky") || normalized.includes("blue")) return "#0ea5e9";
  if (normalized.includes("emerald") || normalized.includes("green")) return "#10b981";
  if (normalized.includes("violet") || normalized.includes("purple")) return "#8b5cf6";
  if (normalized.includes("amber") || normalized.includes("yellow")) return "#f59e0b";
  if (normalized.includes("rose") || normalized.includes("red")) return "#f43f5e";
  if (normalized.includes("slate")) return "#334155";

  return "#0f172a";
}

function getRangeBounds(months: AheadMonth[]) {
  const first = months[0];
  const last = months[months.length - 1];

  const start = startOfMonth(first.year, first.monthIndex);
  const end = endOfMonth(last.year, last.monthIndex);

  return { start, end };
}

function daysBetween(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86400000);
}

function getDayCategory(
  events: UserCalendarEvent[]
): "or" | "clinic" | "custom" | null {
  const normalized = events.map((e) => ({
    category: (e.category ?? "").trim().toLowerCase(),
    title: (e.title ?? "").trim().toLowerCase(),
  }));

  const hasOR = normalized.some(
    (e) => e.category === "or" || e.title === "or"
  );

  const hasClinic = normalized.some(
    (e) => e.category === "clinic" || e.title === "clinic"
  );

  const hasCustom = normalized.some(
    (e) =>
      e.category === "custom" ||
      (!["", "or", "clinic"].includes(e.category) &&
        e.title !== "or" &&
        e.title !== "clinic")
  );

  if (hasOR) return "or";
  if (hasClinic) return "clinic";
  if (hasCustom) return "custom";
  return null;
}

function formatFullRangeLabel(startDate: string, endDate: string) {
  const start = toLocalDate(startDate);
  const end = toLocalDate(endDate);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", {
      month: "short",
    })} ${start.getDate()}–${end.getDate()}`;
  }

  if (sameYear) {
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
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

function areDatesTouchingOrOverlapping(aEnd: string, bStart: string) {
  const a = toLocalDate(aEnd);
  const b = toLocalDate(bStart);

  const nextDay = addDays(a, 1);
  return b <= nextDay;
}

function mergeRotationTimelineEvents(
  events: RotationTimelineEvent[]
): RotationTimelineEvent[] {
  const sorted = events
    .filter((item) => item.startDate && item.endDate)
    .slice()
    .sort((a, b) => {
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      if (a.endDate !== b.endDate) return a.endDate.localeCompare(b.endDate);
      return a.title.localeCompare(b.title);
    });

  const merged: RotationTimelineEvent[] = [];

  for (const current of sorted) {
    const last = merged[merged.length - 1];

    const sameRotation =
      !!last &&
      last.title.trim().toLowerCase() === current.title.trim().toLowerCase() &&
      (last.color ?? "").trim().toLowerCase() ===
        (current.color ?? "").trim().toLowerCase() &&
      areDatesTouchingOrOverlapping(last.endDate, current.startDate);

    if (sameRotation) {
      if (current.endDate > last.endDate) {
        last.endDate = current.endDate;
      }
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}

function getCallLevel(call: UserCalendarEvent): 1 | 2 {
  const raw = `${call.title ?? ""} ${call.category ?? ""}`.toLowerCase();

  if (
    raw.includes("backup") ||
    raw.includes("back up") ||
    raw.includes("back-up") ||
    raw.includes("secondary") ||
    raw.includes("2") ||
    raw.includes("b ")
  ) {
    return 2;
  }

  return 1;
}

function getDayCallLevel(calls: UserCalendarEvent[]): 1 | 2 | null {
  if (calls.length === 0) return null;
  return calls.some((call) => getCallLevel(call) === 1) ? 1 : 2;
}

function getDayTone(category: "or" | "clinic" | "custom" | null) {
  switch (category) {
    case "or":
      return {
        bg: "bg-sky-50/90",
        border: "border-sky-200",
        pill: "bg-sky-100 text-sky-700",
        strip: "bg-sky-500",
        chip: "bg-sky-100 text-sky-700",
      };
    case "clinic":
      return {
        bg: "bg-emerald-50/90",
        border: "border-emerald-200",
        pill: "bg-emerald-100 text-emerald-700",
        strip: "bg-emerald-500",
        chip: "bg-emerald-100 text-emerald-700",
      };
    case "custom":
      return {
        bg: "bg-violet-50/90",
        border: "border-violet-200",
        pill: "bg-violet-100 text-violet-700",
        strip: "bg-violet-500",
        chip: "bg-violet-100 text-violet-700",
      };
    default:
      return {
        bg: "bg-white",
        border: "border-slate-200",
        pill: "bg-slate-100 text-slate-700",
        strip: "bg-slate-200",
        chip: "bg-slate-100 text-slate-700",
      };
  }
}

function RotationTimeline({
  months,
  rotationTimelineEvents,
  loading = false,
}: {
  months: AheadMonth[];
  rotationTimelineEvents: RotationTimelineEvent[];
  loading?: boolean;
}) {
  const rotationEvents = useMemo(
    () => mergeRotationTimelineEvents(rotationTimelineEvents),
    [rotationTimelineEvents]
  );

  const bounds = useMemo(() => getRangeBounds(months), [months]);
  const totalDays = daysBetween(bounds.start, bounds.end) + 1;

  const monthSegments = useMemo(() => {
    return months.map((month) => {
      const monthStart = startOfMonth(month.year, month.monthIndex);
      const monthEnd = endOfMonth(month.year, month.monthIndex);
      const offset = daysBetween(bounds.start, monthStart);
      const width = daysBetween(monthStart, monthEnd) + 1;

      return {
        key: getMonthKey(month),
        label: month.label,
        leftPct: (offset / totalDays) * 100,
        widthPct: (width / totalDays) * 100,
      };
    });
  }, [months, bounds.start, totalDays]);

  if (loading && rotationEvents.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="rounded-xl bg-sky-50 p-2 text-sky-700">
            <CalendarDays className="h-4 w-4" />
          </div>
          <span>Loading rotations...</span>
        </div>
      </div>
    );
  }

  if (rotationEvents.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="rounded-xl bg-sky-50 p-2 text-sky-700">
            <CalendarDays className="h-4 w-4" />
          </div>
          <span>No visible rotations in this range</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <div className="px-4 pb-4 pt-3 md:px-5">
        <div className={`mb-3 grid gap-2 ${TIMELINE_GRID} md:items-center`}>
          <div className="hidden md:block" />
          <div className="relative h-7 overflow-hidden rounded-xl bg-slate-100">
            {monthSegments.map((segment) => (
              <div
                key={segment.key}
                className="absolute top-0 h-full border-r border-white/80"
                style={{
                  left: `${segment.leftPct}%`,
                  width: `${segment.widthPct}%`,
                }}
              >
                <div className="flex h-full items-center px-2.5">
                  <span className="text-[11px] font-semibold text-slate-600">
                    {segment.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {rotationEvents.map((rotation) => {
            const rawStart = toLocalDate(rotation.startDate);
            const rawEnd = toLocalDate(rotation.endDate);

            const visibleStart = clampDate(rawStart, bounds.start, bounds.end);
            const visibleEnd = clampDate(rawEnd, bounds.start, bounds.end);

            const offset = daysBetween(bounds.start, visibleStart);
            const width = daysBetween(visibleStart, visibleEnd) + 1;

            const leftPct = (offset / totalDays) * 100;
            const widthPct = Math.max((width / totalDays) * 100, 2.5);

            const color = normalizeColor(rotation.color);

            return (
              <div
                key={`${rotation.title}-${rotation.startDate}-${rotation.endDate}`}
                className={`grid gap-2 ${TIMELINE_GRID} md:items-center`}
              >
                <div className="min-w-0 pr-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {rotation.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFullRangeLabel(rotation.startDate, rotation.endDate)}
                  </p>
                </div>

                <div className="relative h-9 rounded-xl bg-slate-100">
                  <div
                    className="absolute top-1 flex h-7 items-center rounded-lg px-3 shadow-sm"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      backgroundColor: color,
                    }}
                    title={`${rotation.title}: ${formatFullRangeLabel(
                      rotation.startDate,
                      rotation.endDate
                    )}`}
                  >
                    <span className="truncate text-xs font-bold text-white">
                      {rotation.title}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthCard({
  month,
  events,
}: {
  month: AheadMonth;
  events: UserCalendarEvent[];
}) {
  const weeks = useMemo(
    () => buildCalendarWeeksSunday(month.year, month.monthIndex),
    [month.year, month.monthIndex]
  );

  const todayKey = toDateKey(new Date());

  const callsByDate = useMemo(() => {
    const map = new Map<string, UserCalendarEvent[]>();

    events
      .filter((event) => event.kind === "call")
      .forEach((event) => {
        const key = event.startDate;
        const existing = map.get(key) ?? [];
        existing.push(event);
        map.set(key, existing);
      });

    return map;
  }, [events]);

  const dayEventsByDate = useMemo(() => {
    const map = new Map<string, UserCalendarEvent[]>();

    events
      .filter((event) => event.kind === "event")
      .forEach((event) => {
        const key = event.startDate;
        if (!key) return;

        const existing = map.get(key) ?? [];
        existing.push(event);
        map.set(key, existing);
      });

    return map;
  }, [events]);

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4">
        <p className="text-lg font-bold tracking-tight text-slate-950">
          {new Date(month.year, month.monthIndex, 1).toLocaleDateString("en-US", {
            month: "long",
          })}
        </p>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {month.year}
        </p>
      </div>

      <div className="px-3 pb-3 pt-3">
        <div className="mb-3 grid grid-cols-7 gap-1.5">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="flex justify-center">
              <div className="inline-flex min-w-[38px] items-center justify-center rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700">
                {day}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          {weeks.map((week, weekIndex) => (
            <div
              key={`${month.label}-week-${weekIndex}`}
              className="grid grid-cols-7 gap-1.5"
            >
              {week.map((date) => {
                const key = toDateKey(date);
                const inMonth = isSameMonth(date, month.year, month.monthIndex);
                const isToday = key === todayKey;

                const calls = callsByDate.get(key) ?? [];
                const dayEvents = dayEventsByDate.get(key) ?? [];
                const dayCategory = getDayCategory(dayEvents);
                const tone = getDayTone(dayCategory);

                const hasCall = inMonth && calls.length > 0;
                const callLevel = getDayCallLevel(calls);

                const dayBorderClass = !inMonth
  ? "border-transparent"
  : isToday
  ? "border-rose-500"
  : hasCall
  ? "border-slate-400"
  : tone.border;

const dayRingClass =
  inMonth && isToday
    ? "ring-2 ring-rose-300 ring-offset-1 shadow-[0_0_0_3px_rgba(244,63,94,0.12)]"
    : hasCall
    ? "ring-1 ring-slate-300 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)]"
    : "";

const dayBgClass = inMonth ? tone.bg : "bg-slate-50/70";

const baseClasses = [
  "relative h-[108px] overflow-hidden rounded-[1.05rem] border p-2.5 transition-all",
  dayBgClass,
  dayBorderClass,
  dayRingClass,
];

if (inMonth && !hasCall && !isToday) {
  baseClasses.push("hover:border-slate-300 hover:shadow-sm");
}

                return (
                  <div key={key} className={baseClasses.join(" ")}>
                    {inMonth ? (
                      <div
                        className={[
                          "pointer-events-none absolute inset-x-0 bottom-0 h-1.5",
                          dayCategory ? tone.strip : "bg-slate-200",
                        ].join(" ")}
                      />
                    ) : null}

                    <div className="relative z-10 flex h-full flex-col">
                      <div className="flex justify-between">
                        <span
                          className={[
                            "inline-flex h-8 min-w-[30px] items-center justify-center rounded-full px-1.5 text-xs font-bold transition-colors",
                            inMonth
                              ? tone.pill
                              : "bg-slate-100/70 text-slate-300",
                            isToday && inMonth
                              ? "bg-rose-600 text-white shadow-md ring-2 ring-rose-200"
                              : "",
                          ].join(" ")}
                        >
                          {date.getDate()}
                        </span>
                      </div>

                      <div className="flex flex-1 items-center justify-center pb-6 pt-1">
                        {hasCall && callLevel ? (
                          <div
                            title={callLevel === 1 ? "Primary call" : "Backup call"}
                            className={[
                              "flex items-center justify-center",
                              callLevel === 1 ? "text-slate-900" : "text-slate-700",
                            ].join(" ")}
                          >
                            {callLevel === 1 ? (
                              <Bell className="h-8 w-8" />
                            ) : (
                              <Slice className="h-8 w-8" />
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {inMonth && dayCategory ? (
                      <div className="absolute inset-x-1.5 bottom-2 z-10 flex justify-center">
                        <span
                          className={[
                            "inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                            tone.chip,
                          ].join(" ")}
                        >
                          {dayCategory === "or"
                            ? "OR"
                            : dayCategory === "clinic"
                            ? "Clinic"
                            : "Custom"}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
        <Bell className="h-4 w-4 text-slate-900" />
        Primary call
      </div>

      <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
        <Slice className="h-4 w-4 text-slate-700" />
        Backup call
      </div>

      <div className="h-4 w-px bg-slate-200" />

      <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span className="h-3 w-3 rounded-full bg-sky-500" />
        OR
      </div>

      <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span className="h-3 w-3 rounded-full bg-emerald-500" />
        Clinic
      </div>

      <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span className="h-3 w-3 rounded-full bg-violet-500" />
        Custom
      </div>
    </div>
  );
}

export function MonthsScheduleView({
  months,
  monthDataByKey,
  rotationTimelineEvents,
  loading = false,
  rotationLoading = false,
  onPrevious,
  onNext,
}: MonthsScheduleViewProps) {
  const rangeLabel = useMemo(() => {
    if (months.length === 0) return "Upcoming Months";
    return `${months[0].label} – ${months[months.length - 1].label}`;
  }, [months]);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
        <div className="px-5 pt-5 md:px-6 md:pt-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Legend />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onPrevious}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="min-w-[210px] rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Visible Range
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-950">
                  {rangeLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={onNext}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 pb-5 pt-4 md:px-6 md:pb-6">
          {loading && Object.keys(monthDataByKey).length === 0 ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              Loading monthly schedule...
            </div>
          ) : (
            <>
              <RotationTimeline
                months={months}
                rotationTimelineEvents={rotationTimelineEvents}
                loading={rotationLoading}
              />

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="grid gap-5 xl:grid-cols-3"
              >
                {months.map((month) => {
                  const key = getMonthKey(month);
                  const events = monthDataByKey[key] ?? [];
                  return <MonthCard key={key} month={month} events={events} />;
                })}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}