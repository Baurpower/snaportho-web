"use client";

import { Check, Sparkles } from "lucide-react";
import type { PrepModeDefinition, PrepareModeId } from "@/components/student-workspace/prepare/types";

export function PrepModeCard({
  mode,
  selected,
  onSelect,
}: {
  mode: PrepModeDefinition;
  selected: boolean;
  onSelect: (modeId: PrepareModeId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(mode.id)}
      className={`rounded-[1.75rem] border p-5 text-left shadow-sm transition ${
        selected
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]"
          : "border-slate-200 bg-white text-slate-950 hover:-translate-y-0.5 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
              selected ? "text-sky-200" : "text-slate-500"
            }`}
          >
            {mode.durationLabel}
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-tight">
            {mode.title}
          </h3>
          <p
            className={`mt-2 text-sm leading-6 ${
              selected ? "text-slate-200" : "text-slate-600"
            }`}
          >
            {mode.description}
          </p>
        </div>
        <div
          className={`inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border ${
            selected
              ? "border-white/10 bg-white/10 text-sky-200"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {mode.useCases.map((item) => (
          <span
            key={item}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              selected
                ? "bg-white/10 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {item}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-2 text-sm">
        {mode.featureBullets.slice(0, 5).map((item) => (
          <div key={item} className="flex items-start gap-2">
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                selected ? "text-sky-200" : "text-sky-700"
              }`}
            />
            <span className={selected ? "text-slate-100" : "text-slate-700"}>
              {item}
            </span>
          </div>
        ))}
      </div>

      <div
        className={`mt-5 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
          selected
            ? "bg-white text-slate-950"
            : "border border-slate-200 bg-slate-50 text-slate-950"
        }`}
      >
        {mode.ctaLabel}
      </div>
    </button>
  );
}
