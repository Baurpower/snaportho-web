"use client";

export function CaseReadinessProgress({
  completedCount,
  totalCount,
}: {
  completedCount: number;
  totalCount: number;
}) {
  const percent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Checklist Progress
          </p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">
            {completedCount} / {totalCount} Reviewed
          </h3>
        </div>
        <div className="text-right">
          <p className="text-xl font-black tracking-tight text-slate-950">
            {percent}%
          </p>
          <p className="text-xs text-slate-500">Local checklist only</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}
