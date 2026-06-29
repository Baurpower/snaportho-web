"use client";

import { CheckSquare2 } from "lucide-react";

export function TaskEmptyState({
  onAddTask,
}: {
  onAddTask: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-5 py-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <CheckSquare2 className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
        Capture a next step
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Keep small follow-ups and reminders out of your head and in one place.
      </p>
      <button
        type="button"
        onClick={onAddTask}
        className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Add task
      </button>
    </div>
  );
}
