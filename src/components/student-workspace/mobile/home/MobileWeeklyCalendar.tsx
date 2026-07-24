"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
} from "lucide-react";
import { StudentPrepWeekPanel } from "@/components/student-workspace/home/StudentPrepWeekPanel";
import {
  addDaysToDateKey,
  formatDateOnly,
  formatDayOfMonth,
  formatTimeOnly,
  getDatesForWeek,
  getStartOfWeekDateKey,
  getWeekdayFromDateKey,
  getWeekdayLabel,
} from "@/lib/student-workspace/date";
import { resolveScheduleEntriesForWeek } from "@/lib/student-workspace/schedule-resolver";
import type {
  StudentWorkspaceResolvedScheduleEntry,
  StudentWorkspaceScheduleEntry,
} from "@/lib/student-workspace/types";

function getEntryTone(entry: StudentWorkspaceResolvedScheduleEntry) {
  switch (entry.entry_type) {
    case "or":
      return "border-slate-300 bg-slate-100 text-slate-900";
    case "clinic":
    case "away_rotation":
    case "rotation":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "call":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "conference":
      return "border-indigo-200 bg-indigo-50 text-indigo-900";
    case "study":
    case "research":
    case "interview":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "personal":
    case "off":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

function getSelectedDateForWeek(weekDates: string[], today: string) {
  return weekDates.includes(today) ? today : weekDates[0];
}

/**
 * Phone version of the weekly schedule.
 *
 * Desktop shows seven columns at once; the current mobile fallback is a
 * horizontal scroller of full day cards, which means the student swipes past
 * six irrelevant days to reach today. This inverts that: a compact day strip
 * for navigation, and the selected day's agenda rendered full width underneath.
 */
export function MobileWeeklyCalendar({
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
  const selectedEntries = useMemo(
    () => resolvedEntries.filter((entry) => entry.occurs_on === selectedDate),
    [resolvedEntries, selectedDate]
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

      setWeekStart(result.week_start);
      setEntries(result.entries);
      setSelectedDate(
        getSelectedDateForWeek(getDatesForWeek(result.week_start), today)
      );
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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Schedule
          </p>
          <h2 className="mt-0.5 text-[17px] font-bold leading-tight tracking-tight text-slate-950">
            {isCurrentWeek ? "This week" : "Week of"}
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {formatDateOnly(weekDates[0])} – {formatDateOnly(weekDates[6])}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => void loadWeek(addDaysToDateKey(weekStart, -7))}
            disabled={loadingWeek}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition active:bg-slate-100 disabled:opacity-50"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => void loadWeek(addDaysToDateKey(weekStart, 7))}
            disabled={loadingWeek}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition active:bg-slate-100 disabled:opacity-50"
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!isCurrentWeek ? (
        <button
          type="button"
          onClick={() => void loadWeek(currentWeekStart)}
          disabled={loadingWeek}
          className="mt-3 inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-700 transition active:bg-slate-200 disabled:opacity-50"
        >
          Back to current week
        </button>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-7 gap-1">
        {weekDates.map((dateKey) => {
          const dayEntries = resolvedEntries.filter(
            (entry) => entry.occurs_on === dateKey
          );
          const isSelected = dateKey === selectedDate;
          const isToday = dateKey === today;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => setSelectedDate(dateKey)}
              aria-pressed={isSelected}
              className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-1 rounded-xl border py-1.5 transition ${
                isSelected
                  ? "border-slate-900 bg-slate-950 text-white"
                  : isToday
                    ? "border-slate-300 bg-slate-50 text-slate-900"
                    : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <span
                className={`text-[9px] font-semibold uppercase tracking-[0.08em] ${
                  isSelected ? "text-slate-300" : "text-slate-400"
                }`}
              >
                {getWeekdayLabel(getWeekdayFromDateKey(dateKey)).slice(0, 1)}
              </span>
              <span className="text-[15px] font-bold leading-none tabular-nums">
                {formatDayOfMonth(dateKey)}
              </span>
              <span className="flex h-1 items-center gap-0.5">
                {dayEntries.slice(0, 3).map((entry) => (
                  <span
                    key={`${entry.id}-${entry.occurs_on}`}
                    className={`h-1 w-1 rounded-full ${
                      isSelected ? "bg-sky-300" : "bg-slate-400"
                    }`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-slate-950">
            {selectedDate === today ? "Today" : formatDateOnly(selectedDate)}
            {selectedDate === today ? (
              <span className="ml-1.5 font-normal text-slate-500">
                {formatDateOnly(selectedDate)}
              </span>
            ) : null}
          </p>
          {loadingWeek ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : null}
        </div>

        <div className="mt-2.5 space-y-2">
          {selectedEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-5 text-center">
              <p className="text-[14px] font-semibold text-slate-900">
                Nothing planned
              </p>
              <p className="mt-0.5 text-[12px] text-slate-500">
                Add a plan so tomorrow is not a surprise.
              </p>
            </div>
          ) : (
            selectedEntries.map((entry) => (
              <div
                key={`${entry.id}-${entry.occurs_on}`}
                className={`rounded-xl border px-3.5 py-3 ${getEntryTone(entry)}`}
              >
                <p className="text-[15px] font-semibold leading-snug">
                  {entry.title}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] opacity-80">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {entry.is_all_day
                      ? "All day"
                      : `${formatTimeOnly(entry.start_time)} – ${formatTimeOnly(entry.end_time)}`}
                  </span>
                  {entry.location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {entry.location}
                    </span>
                  ) : null}
                </div>
                {entry.today_focus ? (
                  <p className="mt-1.5 text-[12px] font-medium leading-5 opacity-80">
                    {entry.today_focus}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setShowPlanner((current) => !current);
          setError(null);
        }}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-[15px] font-semibold text-white transition active:bg-slate-800"
      >
        <CalendarDays className="h-4 w-4" />
        {showPlanner ? "Hide week planner" : "Plan this week"}
      </button>

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
