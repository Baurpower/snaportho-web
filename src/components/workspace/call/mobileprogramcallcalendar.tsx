"use client";

import React, { useMemo } from "react";
import { PhoneCall } from "lucide-react";
import type { ProgramCallItem } from "@/components/workspace/call/callmonthcalendar";

export interface MobileProgramCallCalendarProps {
  year: number;
  monthIndex: number;
  calls: ProgramCallItem[];
  loading?: boolean;
  onSelectDate?: (dateKey: string) => void;
}

/**
 * Mobile-only compact month calendar for the "Program" view of the Call Calendar.
 * - 7-column grid, very small cells suitable for phone.
 * - Shows date number + compact call labels (last name + tiny chip).
 * - My calls visually emphasized.
 * - Overflow per day shown as +N.
 * - Tapping a day calls onSelectDate (reuses existing detail flow).
 * - No horizontal scroll. Purely presentational.
 * - Does not use any desktop calendar component or min-w wrappers.
 */

export function MobileProgramCallCalendar({
  year,
  monthIndex,
  calls,
  loading = false,
  onSelectDate,
}: MobileProgramCallCalendarProps) {
  const weeks = useMemo(
    () => buildCalendarWeeksSunday(year, monthIndex),
    [year, monthIndex]
  );

  const todayKey = toDateKey(new Date());

  const callsByDate = useMemo(() => {
    const map = new Map<string, ProgramCallItem[]>();
    for (const call of calls) {
      if (!call.callDate) continue;
      const existing = map.get(call.callDate) ?? [];
      existing.push(call);
      map.set(call.callDate, existing);
    }
    // Sort: my calls first, then name
    for (const [key, list] of map.entries()) {
      list.sort((a, b) => {
        if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
        return getLastName(a.residentName).localeCompare(getLastName(b.residentName));
      });
      map.set(key, list);
    }
    return map;
  }, [calls]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Loading calendar...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {/* Weekday headers - compact */}
      <div className="grid grid-cols-7 gap-0.5 mb-1 text-center text-[9px] font-bold uppercase tracking-widest text-slate-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="space-y-0.5">
        {weeks.map((week, weekIndex) => (
          <div key={`w-${weekIndex}`} className="grid grid-cols-7 gap-0.5">
            {week.map((date) => {
              const key = toDateKey(date);
              const inMonth = isSameMonth(date, year, monthIndex);
              const isToday = key === todayKey;
              const dayCalls = callsByDate.get(key) ?? [];
              const myCalls = dayCalls.filter((c) => c.isMine);
              const hasMyCall = myCalls.length > 0;

              // Visible calls: my first, then others (limit display)
              const displayCalls = [...myCalls, ...dayCalls.filter((c) => !c.isMine)];
              const MAX_VISIBLE = 3;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => inMonth && onSelectDate?.(key)}
                  disabled={!inMonth}
                  className={[
                    "min-h-[68px] rounded-xl border p-1 text-left transition text-[10px] leading-tight",
                    inMonth
                      ? "border-slate-200 bg-white active:bg-slate-50"
                      : "border-transparent bg-slate-50/50 text-slate-300",
                    isToday && inMonth ? "ring-1 ring-sky-400" : "",
                    hasMyCall && inMonth ? "border-sky-300 bg-sky-50/40" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={[
                        "font-semibold tabular-nums",
                        inMonth ? "text-slate-700" : "text-slate-300",
                        isToday ? "text-sky-600" : "",
                      ].join(" ")}
                    >
                      {date.getDate()}
                    </span>

                    {dayCalls.length > 0 && inMonth && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-800 px-1 py-px text-[8px] font-bold text-white">
                        <PhoneCall className="h-2 w-2" />
                        {dayCalls.length}
                      </span>
                    )}
                  </div>

                  {inMonth && displayCalls.length > 0 && (
                    <div className="mt-0.5 space-y-0.5 overflow-hidden">
                      {displayCalls.slice(0, MAX_VISIBLE).map((call, idx) => {
                        const isMy = call.isMine;
                        const last = getLastName(call.residentName);
                        const type = call.callType ? call.callType.slice(0, 3) : "";
                        return (
                          <div
                            key={idx}
                            className={[
                              "truncate rounded px-1 py-px text-[9px] leading-none",
                              isMy
                                ? "bg-sky-200 text-sky-800 font-medium"
                                : "bg-slate-100 text-slate-600",
                            ].join(" ")}
                            title={call.residentName}
                          >
                            {last}
                            {type && <span className="ml-0.5 opacity-70">·{type}</span>}
                            {call.isHomeCall && <span className="ml-0.5 opacity-70">H</span>}
                          </div>
                        );
                      })}
                      {displayCalls.length > MAX_VISIBLE && (
                        <div className="text-[8px] text-slate-400 pl-1">
                          +{displayCalls.length - MAX_VISIBLE}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Small pure helpers (mobile-only, duplicated from desktop for independence) ---

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
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
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function isSameMonth(date: Date, year: number, monthIndex: number) {
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}

function getLastName(fullName: string) {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
}
