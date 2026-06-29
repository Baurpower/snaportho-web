"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { ReadinessSignal } from "@/components/student-workspace/prepare/types";

export function ReadinessCard({
  readiness,
  score,
}: {
  readiness: ReadinessSignal[];
  score: number;
}) {
  const readyCopy =
    score >= 85
      ? "You are ready."
      : score >= 50
        ? "You are getting ready."
        : "You are not ready yet.";

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Ready for Tomorrow
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">{readyCopy}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Readiness should rise as real preparation gets completed, not because a generic checklist was checked off.
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Readiness
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{score}%</p>
        </div>
      </div>

      <div className="mt-5 h-3 rounded-full bg-slate-100">
        <div
          className="h-3 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${Math.max(6, score)}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3">
        {readiness.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3"
          >
            {item.complete ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <Circle className="h-5 w-5 text-slate-400" />
            )}
            <span className={`text-sm font-semibold ${item.complete ? "text-slate-950" : "text-slate-600"}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
