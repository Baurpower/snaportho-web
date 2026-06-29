"use client";

import { MapPin, Pencil, Repeat, Trash2 } from "lucide-react";
import {
  formatDateOnly,
  formatTimeOnly,
  getWeekdayLabel,
} from "@/lib/student-workspace/date";
import type {
  StudentWorkspaceResolvedScheduleEntry,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";

export function ScheduleEntryCard({
  entry,
  rotations,
  busy,
  onEdit,
  onDelete,
}: {
  entry: StudentWorkspaceResolvedScheduleEntry;
  rotations: StudentWorkspaceRotation[];
  busy?: boolean;
  onEdit: (entry: StudentWorkspaceResolvedScheduleEntry) => void;
  onDelete: (entry: StudentWorkspaceResolvedScheduleEntry) => Promise<void>;
}) {
  const linkedRotation = rotations.find(
    (rotation) => rotation.id === entry.rotation_id
  );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            {entry.entry_type}
            {entry.specific_date ? (
              <span>{formatDateOnly(entry.specific_date)}</span>
            ) : entry.weekday !== null ? (
              <span>{getWeekdayLabel(entry.weekday)}</span>
            ) : null}
          </div>
          <h4 className="mt-3 text-base font-semibold text-slate-950">
            {entry.title}
          </h4>
          <p className="mt-1 text-sm text-slate-600">
            {entry.is_all_day
              ? "All day"
              : `${formatTimeOnly(entry.start_time)} to ${formatTimeOnly(entry.end_time)}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(entry)}
            disabled={busy}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Edit schedule entry"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(entry)}
            disabled={busy}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            aria-label="Delete schedule entry"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
        {entry.weekday !== null ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
            <Repeat className="h-4 w-4 text-slate-400" />
            Repeats weekly
          </span>
        ) : null}
        {entry.location ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
            <MapPin className="h-4 w-4 text-slate-400" />
            {entry.location}
          </span>
        ) : null}
        {linkedRotation ? (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-800">
            {linkedRotation.title}
          </span>
        ) : null}
      </div>

      {entry.notes ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">{entry.notes}</p>
      ) : null}
    </article>
  );
}
