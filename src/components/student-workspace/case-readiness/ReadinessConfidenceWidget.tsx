"use client";

import { AlertCircle, CheckCircle2, CircleHelp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Confidence = "comfortable" | "maybe" | "not-ready";

const OPTIONS: Array<{
  value: Confidence;
  label: string;
  Icon: LucideIcon;
  selectedClass: string;
  hoverClass: string;
}> = [
  {
    value: "comfortable",
    label: "Yes",
    Icon: CheckCircle2,
    selectedClass: "border-emerald-400 bg-emerald-50 text-emerald-900",
    hoverClass: "hover:border-emerald-300 hover:bg-emerald-50",
  },
  {
    value: "maybe",
    label: "Maybe",
    Icon: CircleHelp,
    selectedClass: "border-amber-400 bg-amber-50 text-amber-900",
    hoverClass: "hover:border-amber-300 hover:bg-amber-50",
  },
  {
    value: "not-ready",
    label: "No",
    Icon: AlertCircle,
    selectedClass: "border-rose-400 bg-rose-50 text-rose-900",
    hoverClass: "hover:border-rose-300 hover:bg-rose-50",
  },
];

const FOLLOW_UP: Record<Confidence, string> = {
  comfortable: "Good. Use the lowest-confidence guide section for one quick final pass.",
  maybe: "Focus on the must-know sections first, then quiz yourself on the treatment or case-flow section.",
  "not-ready": "Start with the first study guide card and only move on when you can explain it out loud.",
};

export function ReadinessConfidenceWidget({
  confidence,
  onChange,
}: {
  confidence: Confidence | null;
  onChange: (value: Confidence) => void;
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Readiness Check
      </p>
      <h3 className="mt-2 text-sm font-bold leading-5 text-slate-950">
        Would you feel comfortable answering questions about this tomorrow?
      </h3>
      <div className="mt-3 flex gap-2">
        {OPTIONS.map((option) => {
          const selected = confidence === option.value;
          const Icon = option.Icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-center transition ${
                selected
                  ? option.selectedClass
                  : `border-slate-200 bg-slate-50 text-slate-700 ${option.hoverClass}`
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-semibold">{option.label}</span>
            </button>
          );
        })}
      </div>
      {confidence ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {FOLLOW_UP[confidence]}
        </p>
      ) : null}
    </section>
  );
}
