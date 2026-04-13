"use client";

import React, { useMemo } from "react";
import { CalendarDays, PhoneCall } from "lucide-react";

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

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function startOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1);
}

function endOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0);
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

function isSameMonth(date: Date, year: number, monthIndex: number) {
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}

function getCallTone(call: ProgramCallItem) {
  if (call.isMine) {
    return {
      card: "border-sky-300 bg-sky-50",
      chip: "bg-sky-600 text-white",
      text: "text-sky-950",
    };
  }

  if (call.isHomeCall) {
    return {
      card: "border-violet-200 bg-violet-50",
      chip: "bg-violet-600 text-white",
      text: "text-violet-950",
    };
  }

  return {
    card: "border-slate-200 bg-slate-50",
    chip: "bg-slate-900 text-white",
    text: "text-slate-900",
  };
}

export default function CallMonthCalendar({
  year,
  monthIndex,
  calls,
  loading,
  onSelectDate,
}: {
  year: number;
  monthIndex: number;
  calls: ProgramCallItem[];
  loading?: boolean;
  onSelectDate?: (dateKey: string) => void;
}) {
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

    for (const [key, value] of map.entries()) {
      value.sort((a, b) => {
        if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
        return a.residentName.localeCompare(b.residentName);
      });
      map.set(key, value);
    }

    return map;
  }, [calls]);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-4 py-4 md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Program Call Calendar
              </h2>
              <p className="mt-1 text-xs text-slate-500 md:text-sm">
                Your call is highlighted first, with the rest of the program visible in the same day.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 text-sm text-slate-500">Loading program call...</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 px-4 py-4 md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950">
              Program Call Calendar
            </h2>
            <p className="mt-1 text-xs text-slate-500 md:text-sm">
              Your call is highlighted first, with the rest of the program visible in the same day.
            </p>
          </div>
        </div>
      </div>

      <div className="px-2 pb-2 pt-2 md:px-3">
        <div className="mb-1.5 grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="py-1 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1">
              {week.map((date) => {
                const key = toDateKey(date);
                const inMonth = isSameMonth(date, year, monthIndex);
                const isToday = key === todayKey;
                const dayCalls = callsByDate.get(key) ?? [];
                const myCalls = dayCalls.filter((call) => call.isMine);
                const otherCalls = dayCalls.filter((call) => !call.isMine);
                const visibleCalls = [...myCalls, ...otherCalls];

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => inMonth && onSelectDate?.(key)}
                    className={[
                      "h-[138px] rounded-[1rem] border px-2 py-1.5 text-left transition md:h-[144px] xl:h-[148px]",
                      inMonth
                        ? "border-slate-200 bg-white hover:border-slate-300"
                        : "border-transparent bg-slate-50/60",
                      isToday && inMonth ? "ring-2 ring-sky-300" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span
                        className={[
                          "text-[11px] font-semibold",
                          inMonth ? "text-slate-700" : "text-slate-300",
                        ].join(" ")}
                      >
                        {date.getDate()}
                      </span>

                      {dayCalls.length > 0 && inMonth ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                          <PhoneCall className="h-2.5 w-2.5" />
                          {dayCalls.length}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-1.5 h-[102px] space-y-1 overflow-y-auto pr-0.5 md:h-[108px] xl:h-[112px]">
                      {visibleCalls.map((call) => {
                        const tone = getCallTone(call);

                        return (
                          <div
                            key={call.id}
                            className={`rounded-lg border px-2 py-1.5 ${tone.card}`}
                            title={`${call.residentName} • ${call.callType ?? "Call"} • ${call.site ?? "No site"}`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                <p className={`truncate text-[10px] font-semibold ${tone.text}`}>
                                  {call.residentName}
                                </p>
                                <p className="truncate text-[9px] text-slate-500">
                                  {call.callType ?? "Call"}
                                </p>
                              </div>

                              {call.isMine ? (
                                <span
                                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] ${tone.chip}`}
                                >
                                  Mine
                                </span>
                              ) : call.trainingLevel ? (
                                <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                                  {call.trainingLevel}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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