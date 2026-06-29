"use client";

export function WorkflowProgress({
  title,
  subtitle,
  currentStep,
  totalSteps,
  completeCount,
}: {
  title: string;
  subtitle: string;
  currentStep: number;
  totalSteps: number;
  completeCount: number;
}) {
  const progressPercent =
    totalSteps === 0 ? 0 : Math.round((completeCount / totalSteps) * 100);

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Workflow Progress
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Ready Meter
          </p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {progressPercent}%
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-3 rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-slate-950 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-700">
        <span>
          Step {currentStep} of {Math.max(totalSteps, 1)}
        </span>
        <span>{completeCount} completed</span>
      </div>
    </div>
  );
}
