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

/**
 * Phone version of a readiness objective.
 *
 * Desktop puts the "Reviewed" pill and chevron in a shrink-0 column beside the
 * title, which crushes the title to a few characters at 375px. Here the status
 * moves to its own row under the metadata chips, and the completion toggle is a
 * full-width row so it can be hit while walking to the OR.
 */
export function MobileObjectiveCard({
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
    <article
      className={`overflow-hidden rounded-2xl border shadow-sm ${
        completed ? "border-sky-200 bg-sky-50/40" : "border-slate-200 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        className="w-full px-4 py-3.5 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-[16px] font-black leading-snug tracking-tight text-slate-950">
            {objective.title}
          </h3>
          <ChevronDown
            className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>

        <p className="mt-1 text-[13px] leading-6 text-slate-600">
          {objective.description}
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
            {objective.estimatedMinutes} min
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
            {objective.importance.replace("-", " ")}
          </span>
          {objective.completionLabel ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
              {objective.completionLabel}
            </span>
          ) : null}
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-slate-200 bg-white px-4 py-3.5">
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-800">
              Learning objective
            </p>
            <p className="mt-1 text-[13px] leading-6 text-sky-950">
              {objective.learningObjective}
            </p>
          </div>

          <div className="mt-3 grid gap-2.5">
            {objective.content.map((contentBlock) => {
              const style = BLOCK_STYLES[contentBlock.kind];
              return (
                <section
                  key={`${objective.id}-${contentBlock.kind}-${contentBlock.title}`}
                  className={`rounded-xl border ${style.border} ${style.background} px-3.5 py-3`}
                >
                  <h4
                    className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${style.label}`}
                  >
                    {contentBlock.title}
                  </h4>
                  <ul className="mt-2 space-y-2">
                    {contentBlock.items.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2 text-[13px] leading-6 text-slate-700"
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

          <div className="mt-3">
            <CaseReadinessActions
              actions={objective.brobotActions}
              onLaunch={onBrobotLaunch}
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onToggleCompleted}
        aria-pressed={completed}
        className={`flex min-h-12 w-full items-center justify-center gap-2 border-t text-[14px] font-semibold transition ${
          completed
            ? "border-sky-200 bg-sky-100/60 text-sky-800 active:bg-sky-100"
            : "border-slate-200 bg-slate-50 text-slate-600 active:bg-slate-100"
        }`}
      >
        {completed ? (
          <CircleCheckBig className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
        {completed ? "Reviewed" : "Mark reviewed"}
      </button>
    </article>
  );
}
