"use client";

import { CalendarDays, Clock3, MapPin } from "lucide-react";
import {
  formatDateOnly,
  formatTimeOnly,
  getWeekdayLabel,
} from "@/lib/student-workspace/date";
import type { StudentWorkspaceResolvedScheduleEntry } from "@/lib/student-workspace/types";

function getEntryTone(entry: StudentWorkspaceResolvedScheduleEntry) {
  switch (entry.entry_type) {
    case "or":
      return "border-slate-300 bg-slate-100 text-slate-900";
    case "clinic":
    case "away_rotation":
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
    case "rotation":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

export function StudentWeeklyDayCard({
  dateKey,
  weekday,
  entries,
  isToday,
  isSelected,
  onClick,
}: {
  dateKey: string;
  weekday: number;
  entries: StudentWorkspaceResolvedScheduleEntry[];
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[180px] w-full min-w-0 flex-col rounded-[1.25rem] border p-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:p-3 xl:min-h-[210px] ${
        isSelected
          ? "border-slate-900 bg-white"
          : isToday
            ? "border-slate-200 bg-white ring-2 ring-slate-900/10"
            : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500/80">
            {getWeekdayLabel(weekday)}
          </p>
          <p className="mt-1 text-base font-bold tracking-tight text-slate-950">
            {formatDateOnly(dateKey)}
          </p>
        </div>

        {isToday ? (
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            Today
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex-1 space-y-2">
        {entries.length === 0 ? (
          <div className="flex h-full min-h-24 flex-col justify-between rounded-2xl border border-dashed border-slate-200/80 bg-white px-3 py-3">
            <p className="text-sm font-semibold text-slate-900">No plans yet</p>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              + Add plan
            </div>
          </div>
        ) : (
          entries.slice(0, 3).map((entry) => (
            <div
              key={`${entry.id}-${entry.occurs_on}`}
              className={`rounded-2xl border px-3 py-2.5 ${getEntryTone(entry)}`}
            >
              <p className="line-clamp-2 text-sm font-semibold leading-5">{entry.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] opacity-80">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {entry.is_all_day
                    ? "All day"
                    : `${formatTimeOnly(entry.start_time)} to ${formatTimeOnly(entry.end_time)}`}
                </span>
                {entry.location ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {entry.location}
                  </span>
                ) : null}
              </div>
              {entry.today_focus ? (
                <p className="mt-2 line-clamp-2 text-[11px] font-medium opacity-80">
                  {entry.today_focus}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>

      {entries.length > 3 ? (
        <div className="mt-3 text-xs font-semibold text-slate-400">
          +{entries.length - 3} more
        </div>
      ) : null}
    </button>
  );
}
