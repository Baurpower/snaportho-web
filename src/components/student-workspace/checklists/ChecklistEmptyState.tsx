"use client";

import { ClipboardList } from "lucide-react";

export function ChecklistEmptyState({
  onCreateTemplate,
}: {
  onCreateTemplate: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-5 py-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <ClipboardList className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
        Build today&apos;s checklist
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Start with one reusable template for your daily routine or a specific rotation.
      </p>
      <button
        type="button"
        onClick={onCreateTemplate}
        className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Create checklist template
      </button>
    </div>
  );
}
