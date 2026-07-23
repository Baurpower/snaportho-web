import type { CasePrepV11Item as Item, CasePrepWebV11 } from "@/lib/caseprep-v1-1/schema";

const SECTION_LABELS: Record<keyof CasePrepWebV11["sections"], string> = {
  indications: "Indications & Decision-Making",
  anatomy: "Important Anatomy",
  approach: "Surgical Approach",
  operative_steps: "Operative Steps",
  complications: "Complications & Avoidance",
  postoperative_care: "Postoperative Considerations",
};

function QuestionCard({ item, index }: { item: Item; index: number }) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-white p-4" open={index < 3}>
      <summary className="cursor-pointer list-none pr-6 text-sm font-bold leading-6 text-slate-950 marker:hidden">
        <span className="mr-2 text-emerald-700">{index + 1}.</span>
        {item.question}
      </summary>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-sm font-semibold leading-6 text-slate-900">{item.answer}</p>
        {item.supporting_detail ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.supporting_detail}</p>
        ) : null}
      </div>
    </details>
  );
}

export function CasePrepV11Document({ data }: { data: CasePrepWebV11 }) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-emerald-200 bg-emerald-50/40 shadow-sm">
      <header className="border-b border-emerald-100 bg-white px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              CasePrep v1.1 preview
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {data.case.canonical_name ?? data.case.requested_case}
            </h2>
            {data.case.approach ? (
              <p className="mt-1 text-sm capitalize text-slate-600">{data.case.approach} approach</p>
            ) : null}
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            High-yield first
          </span>
        </div>
      </header>

      <div className="grid gap-6 p-5">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Pocket Pimped
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
            High-Yield Questions & Answers
          </h3>
          <div className="mt-4 grid gap-3">
            {data.high_yield_questions.length ? (
              data.high_yield_questions.map((item, index) => (
                <QuestionCard key={item.id} item={item} index={index} />
              ))
            ) : (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                High-yield questions were not available for this case.
              </p>
            )}
          </div>
        </section>

        {(Object.entries(data.sections) as Array<[keyof CasePrepWebV11["sections"], Item[]]>).map(
          ([section, items]) =>
            items.length ? (
              <section key={section} className="border-t border-slate-200 pt-5">
                <h3 className="text-lg font-black tracking-tight text-slate-950">
                  {SECTION_LABELS[section]}
                </h3>
                <div className="mt-3 grid gap-3">
                  {items.map((item, index) => (
                    <QuestionCard key={item.id} item={item} index={index} />
                  ))}
                </div>
              </section>
            ) : null
        )}

        {data.case_specific_pearls.length ? (
          <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <h3 className="font-bold text-sky-950">Case-Specific Pearls</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-sky-900">
              {data.case_specific_pearls.map((pearl) => <li key={pearl}>• {pearl}</li>)}
            </ul>
          </section>
        ) : null}

        {data.sources.some((source) => source.url) ? (
          <section className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sources</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {data.sources.filter((source) => source.url).map((source) => (
                <li key={source.source_id}>
                  <a className="underline" href={source.url} rel="noreferrer" target="_blank">
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </section>
  );
}
