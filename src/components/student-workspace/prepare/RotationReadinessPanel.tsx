"use client";

export function RotationReadinessPanel({
  items,
}: {
  items: Array<{ label: string; value: string; helper: string }>;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Rotation Readiness
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Add rotations in your profile to see block timing and service context here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Rotation Readiness
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Rotation context alongside the curriculum — block timing, transitions, and this week&apos;s focus.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {item.label}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{item.value}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{item.helper}</p>
          </div>
        ))}
      </div>
    </section>
  );
}