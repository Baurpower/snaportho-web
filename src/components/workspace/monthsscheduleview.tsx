"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Bell,
  Slice,
  Clock3,
  Stethoscope,
  ClipboardList,
  UserRound,
  MapPin,
  BadgeCheck,
  Palmtree,
} from "lucide-react";
import DayDetailsModal from "@/components/workspace/shared/daydetailsmodal";
import type { TimeOffItem } from "@/lib/db/time-off";

export type { TimeOffItem };

export type ProgramCallItem = {
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

export type UserCalendarEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color?: string | null;
  kind: "rotation" | "call" | "event";
  category?: string | null;
  membershipId?: string | null;
  residentName?: string | null;
  callRole?: "Primary" | "Backup" | null;
  location?: string | null;
  attending?: string | null;
  notes?: string | null;
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
  programCallsByMonthKey: Record<string, ProgramCallItem[]>;
  timeOffByMonthKey: Record<string, TimeOffItem[]>;
  loading?: boolean;
  rotationLoading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  currentMembershipId?: string | null;
  currentDisplayName?: string | null;
};

type DayModalData = {
  dateKey: string;
  monthLabel: string;
  events: UserCalendarEvent[];
  rotationOverlaps: RotationTimelineEvent[];
  programCalls: ProgramCallItem[];
  myTimeOff: TimeOffItem[];
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

function formatLongDate(dateString: string) {
  const date = toLocalDate(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortRange(startDate: string, endDate: string) {
  const start = toLocalDate(startDate);
  const end = toLocalDate(endDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", { month: "short" })} ${start.getDate()} – ${end.getDate()}`;
  }

  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
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

function getDayCategory(events: UserCalendarEvent[]): "or" | "clinic" | "custom" | null {
  const normalized = events.map((e) => ({
    category: (e.category ?? "").trim().toLowerCase(),
    title: (e.title ?? "").trim().toLowerCase(),
  }));
  if (normalized.some((e) => e.category === "or" || e.title === "or")) return "or";
  if (normalized.some((e) => e.category === "clinic" || e.title === "clinic")) return "clinic";
  if (normalized.some((e) => e.category === "custom" || (!["", "or", "clinic"].includes(e.category) && e.title !== "or" && e.title !== "clinic"))) return "custom";
  return null;
}

function getDayTone(category: "or" | "clinic" | "custom" | null) {
  switch (category) {
    case "or":
      return { bg: "bg-slate-200", border: "border-slate-300", pill: "bg-slate-800 text-white", strip: "bg-slate-700", chip: "bg-slate-800 text-white" };
    case "clinic":
      return { bg: "bg-sky-50/90", border: "border-sky-200", pill: "bg-sky-100 text-sky-700", strip: "bg-sky-500", chip: "bg-sky-600 text-white" };
    case "custom":
      return { bg: "bg-violet-50/90", border: "border-violet-200", pill: "bg-violet-100 text-violet-700", strip: "bg-violet-500", chip: "bg-violet-600 text-white" };
    default:
      return { bg: "bg-white", border: "border-slate-200", pill: "bg-slate-100 text-slate-700", strip: "bg-slate-200", chip: "bg-slate-100 text-slate-700" };
  }
}

function getDayTypeBadgeClasses(dayType: "or" | "clinic" | "custom" | null) {
  if (dayType === "or") return "bg-slate-800 text-white";
  if (dayType === "clinic") return "bg-sky-600 text-white";
  if (dayType === "custom") return "bg-violet-600 text-white";
  return "bg-slate-100 text-slate-700";
}

function areDatesTouchingOrOverlapping(aEnd: string, bStart: string) {
  const a = toLocalDate(aEnd);
  const b = toLocalDate(bStart);
  const nextDay = addDays(a, 1);
  return b <= nextDay;
}

function mergeRotationTimelineEvents(events: RotationTimelineEvent[]): RotationTimelineEvent[] {
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
      (last.color ?? "").trim().toLowerCase() === (current.color ?? "").trim().toLowerCase() &&
      areDatesTouchingOrOverlapping(last.endDate, current.startDate);
    if (sameRotation) {
      if (current.endDate > last.endDate) last.endDate = current.endDate;
      continue;
    }
    merged.push({ ...current });
  }
  return merged;
}

function normalizeProgramCallToEvent(call: ProgramCallItem): UserCalendarEvent {
  return {
    id: call.id,
    title: call.callType ?? "Call",
    startDate: call.callDate ?? "",
    endDate: call.callDate ?? "",
    kind: "call",
    category: call.callType ?? null,
    membershipId: call.membershipId,
    residentName: call.residentName,
    callRole: call.callType === "Primary" || call.callType === "Backup" ? call.callType : null,
    location: call.site ?? null,
    notes: call.notes ?? null,
  };
}

function getCallLevel(call: UserCalendarEvent): 1 | 2 {
  if (call.callRole === "Backup") return 2;
  if (call.callRole === "Primary") return 1;
  const raw = `${call.title ?? ""} ${call.category ?? ""}`.toLowerCase();
  if (raw.includes("backup") || raw.includes("back up") || raw.includes("back-up") || raw.includes("secondary") || raw.includes("2")) return 2;
  return 1;
}

function getDayCallLevel(calls: UserCalendarEvent[]): 1 | 2 | null {
  if (calls.length === 0) return null;
  return calls.some((call) => getCallLevel(call) === 1) ? 1 : 2;
}

function getProgramCallsByDate(calls: ProgramCallItem[]) {
  const map = new Map<string, ProgramCallItem[]>();
  for (const call of calls) {
    if (!call.callDate) continue;
    const existing = map.get(call.callDate) ?? [];
    existing.push(call);
    map.set(call.callDate, existing);
  }
  for (const [key, value] of map.entries()) {
    value.sort((a, b) => {
      if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
      if ((a.callType ?? "") !== (b.callType ?? "")) return (a.callType ?? "").localeCompare(b.callType ?? "");
      return a.residentName.localeCompare(b.residentName);
    });
    map.set(key, value);
  }
  return map;
}

function getSingleProgramCallByRole(calls: ProgramCallItem[], role: "Primary" | "Backup"): ProgramCallItem | null {
  return calls.find((call) => call.callType === role) ?? null;
}

function getTimeOffByDate(items: TimeOffItem[]) {
  const map = new Map<string, TimeOffItem[]>();
  for (const item of items) {
    if (!item.startDate || !item.endDate) continue;
    let cursor = toLocalDate(item.startDate);
    const end = toLocalDate(item.endDate);
    while (cursor <= end) {
      const key = toDateKey(cursor);
      const existing = map.get(key) ?? [];
      existing.push(item);
      map.set(key, existing);
      cursor = addDays(cursor, 1);
    }
  }
  return map;
}

function DetailField({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2">
        {icon ? <div className="text-slate-500">{icon}</div> : null}
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      </div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function CallAssignmentCard({ role, call }: { role: "Primary" | "Backup"; call: ProgramCallItem | null }) {
  const isPrimary = role === "Primary";
  const me = call?.isMine ?? false;

  return (
    <div className={`rounded-[1.35rem] border p-4 ${me ? "border-sky-300 bg-sky-50" : isPrimary ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{role}</p>
            {me ? (
              <span className="inline-flex items-center rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Me</span>
            ) : null}
          </div>
          <p className="mt-2 text-base font-bold text-slate-950">
            {call ? (call.isMine ? "Me" : call.residentName) : `No ${role.toLowerCase()} assigned`}
          </p>
          <div className="mt-2 space-y-1">
            {call?.trainingLevel ? <p className="text-xs text-slate-500">{call.trainingLevel}</p> : null}
            {call?.site ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                <span>{call.site}</span>
              </div>
            ) : null}
            {call?.isHomeCall ? <p className="text-xs text-slate-500">Home call</p> : null}
          </div>
          {call?.notes ? <p className="mt-2 text-xs text-slate-500">{call.notes}</p> : null}
        </div>
        <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${me ? "bg-sky-600 text-white" : isPrimary ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
          {isPrimary ? <Bell className="h-5 w-5" /> : <Slice className="h-5 w-5" />}
        </div>
      </div>
    </div>
  );
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
  const rotationEvents = useMemo(() => mergeRotationTimelineEvents(rotationTimelineEvents), [rotationTimelineEvents]);
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
          <div className="rounded-xl bg-sky-50 p-2 text-sky-700"><CalendarDays className="h-4 w-4" /></div>
          <span>Loading rotations...</span>
        </div>
      </div>
    );
  }

  if (rotationEvents.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="rounded-xl bg-sky-50 p-2 text-sky-700"><CalendarDays className="h-4 w-4" /></div>
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
                style={{ left: `${segment.leftPct}%`, width: `${segment.widthPct}%` }}
              >
                <div className="flex h-full items-center px-2.5">
                  <span className="text-[11px] font-semibold text-slate-600">{segment.label}</span>
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
              <div key={`${rotation.title}-${rotation.startDate}-${rotation.endDate}`} className={`grid gap-2 ${TIMELINE_GRID} md:items-center`}>
                <div className="min-w-0 pr-1">
                  <p className="truncate text-sm font-bold text-slate-900">{rotation.title}</p>
                  <p className="text-xs text-slate-500">{formatShortRange(rotation.startDate, rotation.endDate)}</p>
                </div>
                <div className="relative h-9 rounded-xl bg-slate-100">
                  <div
                    className="absolute top-1 flex h-7 items-center rounded-lg px-3 shadow-sm"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: color }}
                  >
                    <span className="truncate text-xs font-bold text-white">{rotation.title}</span>
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

function getDateCircleClasses(category: "or" | "clinic" | "custom" | null, isToday: boolean, inMonth: boolean) {
  if (!inMonth) return "bg-slate-100/70 text-slate-300";
  if (isToday) return "bg-rose-500 text-white shadow-md ring-2 ring-rose-200";
  switch (category) {
    case "or": return "bg-slate-100 text-slate-900";
    case "clinic": return "bg-sky-100 text-sky-900";
    case "custom": return "bg-violet-100 text-violet-900";
    default: return "bg-slate-100 text-slate-700";
  }
}

function MonthCard({
  month,
  events,
  rotationTimelineEvents,
  programCalls,
  timeOffItems,
  onOpenDay,
}: {
  month: AheadMonth;
  events: UserCalendarEvent[];
  rotationTimelineEvents: RotationTimelineEvent[];
  programCalls: ProgramCallItem[];
  timeOffItems: TimeOffItem[];
  onOpenDay: (data: DayModalData) => void;
}) {
  const weeks = useMemo(() => buildCalendarWeeksSunday(month.year, month.monthIndex), [month.year, month.monthIndex]);
  const todayKey = toDateKey(new Date());
  const callsByDate = useMemo(() => getProgramCallsByDate(programCalls), [programCalls]);
  const timeOffByDate = useMemo(() => getTimeOffByDate(timeOffItems), [timeOffItems]);

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

  const rotationOverlapsByDate = useMemo(() => {
    const map = new Map<string, RotationTimelineEvent[]>();
    const monthStart = toDateKey(startOfMonth(month.year, month.monthIndex));
    const monthEnd = toDateKey(endOfMonth(month.year, month.monthIndex));
    for (const rotation of rotationTimelineEvents) {
      if (rotation.endDate < monthStart || rotation.startDate > monthEnd) continue;
      const start = rotation.startDate < monthStart ? monthStart : rotation.startDate;
      const end = rotation.endDate > monthEnd ? monthEnd : rotation.endDate;
      let cursor = toLocalDate(start);
      const endDate = toLocalDate(end);
      while (cursor <= endDate) {
        const key = toDateKey(cursor);
        const existing = map.get(key) ?? [];
        existing.push(rotation);
        map.set(key, existing);
        cursor = addDays(cursor, 1);
      }
    }
    return map;
  }, [month.year, month.monthIndex, rotationTimelineEvents]);

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4">
        <p className="text-lg font-bold tracking-tight text-slate-950">
          {new Date(month.year, month.monthIndex, 1).toLocaleDateString("en-US", { month: "long" })}
        </p>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{month.year}</p>
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
            <div key={`${month.label}-week-${weekIndex}`} className="grid grid-cols-7 gap-1.5">
              {week.map((date) => {
                const key = toDateKey(date);
                const inMonth = isSameMonth(date, month.year, month.monthIndex);
                const isToday = key === todayKey;

                const dayProgramCalls = callsByDate.get(key) ?? [];
                const myProgramCalls = dayProgramCalls.filter((call) => call.isMine);
                const myCallEvents = myProgramCalls.map(normalizeProgramCallToEvent);

                const dayEvents = dayEventsByDate.get(key) ?? [];
                const dayCategory = getDayCategory(dayEvents);
                const tone = getDayTone(dayCategory);

                const hasMyCall = inMonth && myProgramCalls.length > 0;
                const myCallLevel = getDayCallLevel(myCallEvents);
                const myDayTimeOff = inMonth ? (timeOffByDate.get(key) ?? []) : [];
                const hasTimeOff = myDayTimeOff.length > 0;

                const dayBorderClass = !inMonth
                  ? "border-transparent"
                  : isToday
                  ? "border-rose-500"
                  : hasMyCall
                  ? "border-sky-400"
                  : hasTimeOff
                  ? "border-emerald-300"
                  : tone.border;

                const dayRingClass = inMonth && isToday
                  ? "ring-2 ring-rose-300 ring-offset-1 shadow-[0_0_0_3px_rgba(244,63,94,0.12)]"
                  : hasMyCall
                  ? "ring-1 ring-sky-300 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.08)]"
                  : hasTimeOff
                  ? "ring-1 ring-emerald-200 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]"
                  : "";

                const dayBgClass = inMonth
                  ? hasTimeOff && !hasMyCall
                    ? "bg-emerald-50/80"
                    : tone.bg
                  : "bg-slate-50/70";

                const baseClasses = [
                  "relative h-[108px] overflow-hidden rounded-[1.05rem] border p-2.5 transition-all",
                  dayBgClass,
                  dayBorderClass,
                  dayRingClass,
                ];

                if (inMonth) baseClasses.push("cursor-pointer");
                if (inMonth && !hasMyCall && !hasTimeOff && !isToday) {
                  baseClasses.push("hover:border-slate-300 hover:shadow-sm");
                }

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!inMonth}
                    onClick={() =>
                      inMonth
                        ? onOpenDay({
                            dateKey: key,
                            monthLabel: month.label,
                            events: dayEvents,
                            programCalls: dayProgramCalls,
                            rotationOverlaps: rotationOverlapsByDate.get(key) ?? [],
                            myTimeOff: myDayTimeOff,
                          })
                        : undefined
                    }
                    className={baseClasses.join(" ")}
                  >
                    {inMonth ? (
                      <div
                        className={[
                          "pointer-events-none absolute inset-x-0 bottom-0 h-1.5",
                          hasTimeOff && !hasMyCall
                            ? "bg-emerald-400"
                            : dayCategory
                            ? tone.strip
                            : "bg-slate-200",
                        ].join(" ")}
                      />
                    ) : null}

                    <div className="relative z-10 flex h-full flex-col">
                      <div className="flex justify-between">
                        <span
                          className={[
                            "inline-flex h-8 min-w-[30px] items-center justify-center rounded-full px-1.5 text-xs font-bold transition-colors",
                            getDateCircleClasses(dayCategory, isToday, inMonth),
                          ].join(" ")}
                        >
                          {date.getDate()}
                        </span>
                      </div>

                      <div className="flex flex-1 items-center justify-center pb-6 pt-1">
                        {hasMyCall && myCallLevel ? (
                          <div
                            className={["flex items-center justify-center", myCallLevel === 1 ? "text-sky-700" : "text-sky-600"].join(" ")}
                            title={myCallLevel === 1 ? "My primary call" : "My backup call"}
                          >
                            {myCallLevel === 1 ? <Bell className="h-8 w-8" /> : <Slice className="h-8 w-8" />}
                          </div>
                        ) : hasTimeOff ? (
                          <div className="flex items-center justify-center text-emerald-600" title="My time-off">
                            <Palmtree className="h-8 w-8" />
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {inMonth && dayCategory && !hasTimeOff ? (
                      <div className="absolute inset-x-1.5 bottom-2 z-10 flex justify-center">
                        <span className={["inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]", tone.chip].join(" ")}>
                          {dayCategory === "or" ? "OR" : dayCategory === "clinic" ? "Clinic" : "Custom"}
                        </span>
                      </div>
                    ) : inMonth && hasTimeOff ? (
                      <div className="absolute inset-x-1.5 bottom-2 z-10 flex justify-center">
                        <span className="inline-flex rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                          Time-Off
                        </span>
                      </div>
                    ) : null}
                  </button>
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
        My primary call
      </div>
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
        <Slice className="h-4 w-4 text-slate-700" />
        My backup call
      </div>
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
        <Palmtree className="h-4 w-4 text-emerald-600" />
        My time-off
      </div>
      <div className="h-4 w-px bg-slate-200" />
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span className="h-3 w-3 rounded-full bg-slate-700" />
        OR
      </div>
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span className="h-3 w-3 rounded-full bg-sky-500" />
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
  programCallsByMonthKey,
  timeOffByMonthKey,
  loading = false,
  rotationLoading = false,
  onPrevious,
  onNext,
}: MonthsScheduleViewProps) {
  const [selectedDay, setSelectedDay] = useState<DayModalData | null>(null);

  const rangeLabel = useMemo(() => {
    if (months.length === 0) return "Upcoming Months";
    return `${months[0].label} – ${months[months.length - 1].label}`;
  }, [months]);

  const primaryCall = useMemo(() => getSingleProgramCallByRole(selectedDay?.programCalls ?? [], "Primary"), [selectedDay]);
  const backupCall = useMemo(() => getSingleProgramCallByRole(selectedDay?.programCalls ?? [], "Backup"), [selectedDay]);
  const scheduleEvents = useMemo(() => selectedDay?.events ?? [], [selectedDay]);
  const dayType = useMemo(() => getDayCategory(scheduleEvents), [scheduleEvents]);

  return (
    <>
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
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Visible Range</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-950">{rangeLabel}</p>
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
                    const programCalls = programCallsByMonthKey[key] ?? [];
                    const timeOffItems = timeOffByMonthKey[key] ?? [];

                    return (
                      <MonthCard
                        key={key}
                        month={month}
                        events={events}
                        rotationTimelineEvents={rotationTimelineEvents}
                        programCalls={programCalls}
                        timeOffItems={timeOffItems}
                        onOpenDay={setSelectedDay}
                      />
                    );
                  })}
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>

      <DayDetailsModal
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title="Day details"
        subtitle={selectedDay ? selectedDay.monthLabel : undefined}
        dateLabel={selectedDay ? formatLongDate(selectedDay.dateKey) : "—"}
      >
        {() =>
          selectedDay ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                  <CalendarDays className="h-4 w-4" />
                  {selectedDay.dateKey}
                </div>
                {dayType ? (
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${getDayTypeBadgeClasses(dayType)}`}>
                    <BadgeCheck className="h-4 w-4" />
                    {dayType === "or" ? "OR Day" : dayType === "clinic" ? "Clinic Day" : "Custom Day"}
                  </div>
                ) : null}
                {selectedDay.myTimeOff.length > 0 ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                    <Palmtree className="h-4 w-4" />
                    Time-Off
                  </div>
                ) : null}
              </div>

              {/* Time-off detail card */}
              {selectedDay.myTimeOff.length > 0 ? (
                <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <Palmtree className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-bold text-emerald-900">My Time-Off</p>
                  </div>
                  <div className="space-y-2">
                    {selectedDay.myTimeOff.map((item) => (
                      <div key={item.id} className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5">
                        <p className="text-sm font-semibold capitalize text-emerald-900">
  {item.type ?? "Time-off"}
</p>
{item.notes ? (
  <p className="mt-0.5 text-xs text-emerald-600">{item.notes}</p>
) : null}
                        <p className="mt-1 text-xs text-emerald-500">
  {item.startDate && item.endDate
    ? formatShortRange(item.startDate, item.endDate)
    : "—"}
</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <CallAssignmentCard role="Primary" call={primaryCall} />
                <CallAssignmentCard role="Backup" call={backupCall} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailField
                  label="Rotation coverage"
                  icon={<Clock3 className="h-4 w-4" />}
                  value={
                    selectedDay.rotationOverlaps.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDay.rotationOverlaps.map((rotation) => (
                          <div key={rotation.id} className="text-sm">
                            <div className="font-semibold text-slate-900">{rotation.title}</div>
                            <div className="mt-1 text-xs text-slate-500">{formatShortRange(rotation.startDate, rotation.endDate)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      "No overlapping rotation"
                    )
                  }
                />
                <DetailField
                  label="Day type"
                  icon={<Stethoscope className="h-4 w-4" />}
                  value={dayType ? (dayType === "or" ? "OR" : dayType === "clinic" ? "Clinic" : "Custom") : "No event category"}
                />
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-bold text-slate-900">Schedule details</p>
                  </div>
                </div>
                <div className="space-y-3 px-4 py-4">
                  {scheduleEvents.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      No OR, clinic, or custom events for this day.
                    </div>
                  ) : (
                    scheduleEvents.map((event) => (
                      <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">{event.title ?? "Event"}</p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Stethoscope className="h-3.5 w-3.5" />
                            <span><span className="font-semibold text-slate-700">Category:</span> {event.category ?? "—"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5" />
                            <span><span className="font-semibold text-slate-700">Location:</span> {event.location ?? "—"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <UserRound className="h-3.5 w-3.5" />
                            <span><span className="font-semibold text-slate-700">Attending:</span> {event.attending ?? "—"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span><span className="font-semibold text-slate-700">Date:</span> {event.startDate}</span>
                          </div>
                        </div>
                        {event.notes ? <p className="mt-3 text-xs text-slate-500">{event.notes}</p> : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null
        }
      </DayDetailsModal>
    </>
  );
}