"use client";

import { CalendarPlus2 } from "lucide-react";

type RotationEmptyStateProps = {
  onAddRotation: () => void;
};

export function RotationEmptyState({
  onAddRotation,
}: RotationEmptyStateProps) {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <CalendarPlus2 className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
        Add your first fourth-year rotation
      </h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
        Start with the blocks you already know. Student Workspace will use them
        to anchor progress, show what is current, and make the year feel more
        manageable day to day.
      </p>
      <button
        type="button"
        onClick={onAddRotation}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Add rotation
      </button>
    </section>
  );
}
