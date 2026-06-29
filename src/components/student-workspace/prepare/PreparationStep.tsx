"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { GuidedWorkflowStep } from "@/components/student-workspace/prepare/types";

export function PreparationStep({
  step,
  active,
  complete,
  onSelect,
}: {
  step: GuidedWorkflowStep;
  active: boolean;
  complete: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-[1.25rem] border px-4 py-4 text-left transition ${
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
      }`}
    >
      <div className="pt-0.5">
        {complete ? (
          <CheckCircle2 className={active ? "h-5 w-5 text-sky-200" : "h-5 w-5 text-emerald-600"} />
        ) : (
          <Circle className={active ? "h-5 w-5 text-sky-200" : "h-5 w-5 text-slate-400"} />
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${active ? "text-sky-200" : "text-slate-500"}`}>
          {step.estimatedMinutes} min
        </p>
        <h4 className="mt-1 text-base font-bold tracking-tight">{step.title}</h4>
        <p className={`mt-1 text-sm leading-6 ${active ? "text-slate-200" : "text-slate-600"}`}>
          {step.description}
        </p>
      </div>
    </button>
  );
}
