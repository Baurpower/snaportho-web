"use client";

import type { ClinicalMomentDefinition, ClinicalMomentId } from "@/components/student-workspace/prepare/types";

export function WorkflowLauncher({
  moments,
  onLaunch,
}: {
  moments: ClinicalMomentDefinition[];
  onLaunch: (momentId: ClinicalMomentId) => void;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Looking for something else?
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        Other clinical moments
      </h2>
      <div className="mt-5 flex flex-wrap gap-2">
        {moments.map((moment) => (
          <button
            key={moment.id}
            type="button"
            onClick={() => onLaunch(moment.id)}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            {moment.label}
          </button>
        ))}
      </div>
    </section>
  );
}
