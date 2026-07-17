"use client";

import { ChevronDown, Circle, CircleCheckBig } from "lucide-react";
import { CaseReadinessActions } from "@/components/student-workspace/case-readiness/CaseReadinessActions";
import type {
  CaseReadinessObjective,
  StudyGuideBlockKind,
} from "@/lib/student-curriculum";

const BLOCK_STYLES: Record<
  StudyGuideBlockKind,
  { border: string; background: string; label: string; marker: string }
> = {
  "key-concepts": {
    border: "border-slate-200",
    background: "bg-white",
    label: "text-slate-700",
    marker: "bg-slate-400",
  },
  recognize: {
    border: "border-sky-200",
    background: "bg-sky-50",
    label: "text-sky-900",
    marker: "bg-sky-500",
  },
  "say-out-loud": {
    border: "border-indigo-200",
    background: "bg-indigo-50",
    label: "text-indigo-900",
    marker: "bg-indigo-500",
  },
  application: {
    border: "border-emerald-200",
    background: "bg-emerald-50",
    label: "text-emerald-900",
    marker: "bg-emerald-500",
  },
  "common-confusion": {
    border: "border-amber-200",
    background: "bg-amber-50",
    label: "text-amber-900",
    marker: "bg-amber-500",
  },
  "numbers-classifications": {
    border: "border-violet-200",
    background: "bg-violet-50",
    label: "text-violet-900",
    marker: "bg-violet-500",
  },
  "self-check": {
    border: "border-rose-200",
    background: "bg-rose-50",
    label: "text-rose-900",
    marker: "bg-rose-500",
  },
};

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
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {objective.estimatedMinutes} min
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {objective.importance.replace("-", " ")}
                </span>
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
              <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
                  Learning objective
                </p>
                <p className="mt-1 text-sm leading-6 text-sky-950">
                  {objective.learningObjective}
                </p>
              </div>

              <div className="grid gap-3">
                {objective.content.map((contentBlock) => {
                  const style = BLOCK_STYLES[contentBlock.kind];
                  return (
                    <section
                      key={`${objective.id}-${contentBlock.kind}-${contentBlock.title}`}
                      className={`rounded-2xl border ${style.border} ${style.background} px-4 py-3`}
                    >
                      <h4
                        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${style.label}`}
                      >
                        {contentBlock.title}
                      </h4>
                      <ul className="mt-2 space-y-2">
                        {contentBlock.items.map((item) => (
                          <li
                            key={item}
                            className="flex gap-2 text-sm leading-6 text-slate-700"
                          >
                            <span
                              className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${style.marker}`}
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>

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
