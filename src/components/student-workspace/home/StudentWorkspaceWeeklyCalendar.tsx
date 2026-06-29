"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StudentPlanWeekButton } from "@/components/student-workspace/home/StudentPlanWeekButton";
import { StudentPrepWeekPanel } from "@/components/student-workspace/home/StudentPrepWeekPanel";
import { StudentWeeklyDayCard } from "@/components/student-workspace/home/StudentWeeklyDayCard";
import {
  addDaysToDateKey,
  formatDateOnly,
  getDatesForWeek,
  getStartOfWeekDateKey,
  getWeekdayLabel,
  getWeekdayFromDateKey,
} from "@/lib/student-workspace/date";
import { resolveScheduleEntriesForWeek } from "@/lib/student-workspace/schedule-resolver";
import type { StudentWorkspaceScheduleEntry } from "@/lib/student-workspace/types";

function getSelectedDateForWeek(weekDates: string[], today: string) {
  return weekDates.includes(today) ? today : weekDates[0];
}

export function StudentWorkspaceWeeklyCalendar({
  initialEntries,
  today,
  initialWeekStart,
}: {
  initialEntries: StudentWorkspaceScheduleEntry[];
  today: string;
  initialWeekStart: string;
}) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [entries, setEntries] = useState(initialEntries);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() =>
    getSelectedDateForWeek(getDatesForWeek(initialWeekStart), today)
  );
  const [error, setError] = useState<string | null>(null);

  const weekDates = useMemo(() => getDatesForWeek(weekStart), [weekStart]);
  const currentWeekStart = useMemo(() => getStartOfWeekDateKey(today), [today]);
  const isCurrentWeek = weekStart === currentWeekStart;
  const resolvedEntries = useMemo(
    () => resolveScheduleEntriesForWeek(entries, weekStart),
    [entries, weekStart]
  );

  async function loadWeek(nextWeekStart: string) {
    setLoadingWeek(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/student-workspace/schedule?week_start=${encodeURIComponent(nextWeekStart)}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? "Unable to load that week.");
      }

      const nextWeekDates = getDatesForWeek(result.week_start);
      setWeekStart(result.week_start);
      setEntries(result.entries);
      setSelectedDate(getSelectedDateForWeek(nextWeekDates, today));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load that week.");
    } finally {
      setLoadingWeek(false);
    }
  }

  async function reloadWeek() {
    const response = await fetch(
      `/api/student-workspace/schedule?week_start=${encodeURIComponent(weekStart)}`
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error ?? "Unable to refresh this week.");
    }

    setEntries(result.entries);
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5 xl:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadWeek(addDaysToDateKey(weekStart, -7))}
              disabled={loadingWeek}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => void loadWeek(addDaysToDateKey(weekStart, 7))}
              disabled={loadingWeek}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              aria-label="Next week"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Schedule
            </p>
            <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                  This Week
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDateOnly(weekDates[0])}-{formatDateOnly(weekDates[6])}
                </p>
              </div>

                      <StudentPlanWeekButton
                isOpen={showPlanner}
                onClick={() => {
                  setShowPlanner((current) => !current);
                  setError(null);
                }}
              />

              {!isCurrentWeek ? (
                <button
                  type="button"
                  onClick={() => void loadWeek(currentWeekStart)}
                  disabled={loadingWeek}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                >
                  Current week
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 hidden md:block">
        <div className="grid grid-cols-7 gap-2 lg:gap-3 xl:gap-4">
          {weekDates.map((dateKey) => (
            <StudentWeeklyDayCard
              key={dateKey}
              dateKey={dateKey}
              weekday={getWeekdayFromDateKey(dateKey)}
              entries={resolvedEntries.filter((entry) => entry.occurs_on === dateKey)}
              isToday={dateKey === today}
              isSelected={dateKey === selectedDate}
              onClick={() => {
                setSelectedDate(dateKey);
                setShowPlanner(true);
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 md:hidden">
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex gap-3">
            {weekDates.map((dateKey) => (
              <div key={dateKey} className="w-[15.5rem] shrink-0">
                <StudentWeeklyDayCard
                  dateKey={dateKey}
                  weekday={getWeekdayFromDateKey(dateKey)}
                  entries={resolvedEntries.filter(
                    (entry) => entry.occurs_on === dateKey
                  )}
                  isToday={dateKey === today}
                  isSelected={dateKey === selectedDate}
                  onClick={() => {
                    setSelectedDate(dateKey);
                    setShowPlanner(true);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {showPlanner ? (
        <StudentPrepWeekPanel
          days={weekDates.map((dateKey) => ({
            date: dateKey,
            dayKey: getWeekdayLabel(getWeekdayFromDateKey(dateKey)),
          }))}
          entries={resolvedEntries}
          initialActiveDate={selectedDate}
          onClose={() => setShowPlanner(false)}
          onSaved={reloadWeek}
        />
      ) : null}
    </section>
  );
}
