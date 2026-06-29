"use client";

export function RotationReadinessPanel({
  items,
}: {
  items: Array<{ label: string; value: string; helper: string }>;
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Rotation Readiness
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Keep rotation context nearby while the curriculum stays primary.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.slice(0, 4).map((item) => (
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
