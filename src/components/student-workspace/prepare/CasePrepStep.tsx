"use client";

import { ArrowUpRight, BookCopy } from "lucide-react";

export function CasePrepStep({ label }: { label: string }) {
  return (
    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
        <BookCopy className="h-3.5 w-3.5" />
        CasePrep Step
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        CasePrep should appear inside the workflow when the current step needs procedure-specific structure or anatomy.
      </p>
      <button
        type="button"
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-100"
      >
        <ArrowUpRight className="h-4 w-4" />
        {label}
      </button>
    </div>
  );
}
