"use client";

import { formatDateOnly, formatLongDateOnly } from "@/lib/student-workspace/date";
import type { PrepareModeId } from "@/components/student-workspace/prepare/types";

const MODE_COPY: Record<PrepareModeId, string> = {
  deep_dive: "Deep Dive",
  dont_look_stupid: "Don't Look Stupid",
  service_survival: "Service Survival",
  review_week: "Review My Week",
};

export function ReviewWeekPanel({
  recommendations,
  onLaunchMode,
}: {
  recommendations: Array<{
    date: string;
    label: string;
    recommendedMode: PrepareModeId;
    focusEntry: { title: string } | null;
  }>;
  onLaunchMode: (modeId: PrepareModeId) => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Review My Week
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            Launchable prep for each day
          </h3>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
          Planner-driven workflow
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {recommendations.map((day) => (
          <div
            key={day.date}
            className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {formatLongDateOnly(day.date)}
            </p>
            <h4 className="mt-2 text-lg font-bold tracking-tight text-slate-950">
              {day.focusEntry?.title ?? `Prep focus for ${formatDateOnly(day.date)}`}
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Recommended: {day.label}
            </p>
            <button
              type="button"
              onClick={() => onLaunchMode(day.recommendedMode)}
              className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Open {MODE_COPY[day.recommendedMode]}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
