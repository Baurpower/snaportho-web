"use client";

import { ChevronDown, Circle, CircleCheckBig } from "lucide-react";
import { CaseReadinessActions } from "@/components/student-workspace/case-readiness/CaseReadinessActions";
import type { CaseReadinessObjective } from "@/lib/student-curriculum";

export function ReadinessObjectiveCard({
  objective,
  expanded,
  completed,
  onToggleExpanded,
  onToggleCompleted,
  onBrobotLaunch,
}: {
  objective: CaseReadinessObjective;
  expanded: boolean;
  completed: boolean;
  onToggleExpanded: () => void;
  onToggleCompleted: () => void;
  onBrobotLaunch?: () => void;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <button
          type="button"
          onClick={onToggleCompleted}
          aria-pressed={completed}
          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:text-sky-600"
        >
          {completed ? (
            <CircleCheckBig className="h-6 w-6 text-sky-600" />
          ) : (
            <Circle className="h-6 w-6" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex w-full items-start justify-between gap-3 text-left"
          >
            <div className="min-w-0">
              <h3 className="text-base font-black tracking-tight text-slate-950">
                {objective.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {objective.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {objective.estimatedMinutes ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {objective.estimatedMinutes} min
                  </span>
                ) : null}
                {objective.completionLabel ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {objective.completionLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                  completed
                    ? "bg-sky-50 text-sky-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {completed ? "Reviewed" : "Not reviewed"}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {expanded ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <ul className="space-y-2">
                {objective.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2 text-sm leading-6 text-slate-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              {objective.pearl ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                    Pearl
                  </p>
                  <p className="mt-1 text-sm leading-6 text-emerald-950">
                    {objective.pearl}
                  </p>
                </div>
              ) : null}

              {objective.commonMistake ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                    Common mistake
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-950">
                    {objective.commonMistake}
                  </p>
                </div>
              ) : null}

              <div className="mt-4">
                <CaseReadinessActions
                  actions={objective.brobotActions}
                  onLaunch={onBrobotLaunch}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
