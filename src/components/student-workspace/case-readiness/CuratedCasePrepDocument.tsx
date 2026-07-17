import type { StudentCasePrepContext } from "@/lib/student-curriculum/student-caseprep-context";

export function CuratedCasePrepDocument({
  context,
}: {
  context: StudentCasePrepContext;
}) {
  return (
    <section className="rounded-[1.75rem] border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Curated Case Prep
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {context.title}
          </h2>
          {context.requestedApproach ? (
            <p className="mt-1 text-sm capitalize text-slate-600">
              {context.requestedApproach} approach scope
            </p>
          ) : null}
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          Trusted core
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        {context.sections.map((section) => (
          <section key={section.label} className="rounded-2xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-950">{section.label}</h3>
            <div className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
              {section.content.split("\n").map((line, index) => (
                <p key={`${section.label}-${index}`}>{line}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {context.citations.length > 0 ? (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sources</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {context.citations.map((citation) => (
              <li key={citation.source_id}>
                {citation.url ? (
                  <a className="underline" href={citation.url} rel="noreferrer" target="_blank">
                    {citation.title || citation.source_id}
                  </a>
                ) : (
                  citation.title || citation.source_id
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <input
        type="hidden"
        name="casePrepBinding"
        value={context.revisionId ?? context.payloadHash ?? ""}
        readOnly
      />
    </section>
  );
}
