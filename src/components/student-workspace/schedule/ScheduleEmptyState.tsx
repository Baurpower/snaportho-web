"use client";

import { CalendarPlus2 } from "lucide-react";

export function ScheduleEmptyState({
  onAddEntry,
}: {
  onAddEntry: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-5 py-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <CalendarPlus2 className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
        Build your weekly rhythm
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Add repeating blocks or one-off dates so today&apos;s plan stays visible.
      </p>
      <button
        type="button"
        onClick={onAddEntry}
        className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Add schedule entry
      </button>
    </div>
  );
}
