type ApproachOption = {
  approach_id?: string;
  name?: string;
  role?: string;
  content_status?: string;
  selection_indications?: string[];
  selection_limitations?: string[];
  exposure?: string[];
  structures_at_risk?: Array<{ structure?: string; name?: string }>;
  coverage_notes?: string;
};

type ApproachDecision = {
  status?: string;
  selected_approach_id?: string | null;
  message?: string;
  approaches?: ApproachOption[];
  coverage?: {
    complete_count?: number;
    known_count?: number;
    gap_count?: number;
  };
};

function statusLabel(option: ApproachOption, selected: boolean) {
  if (selected) return "Selected from case description";
  if (option.content_status === "coverage_gap")
    return "Known option · module incomplete";
  if (option.role === "primary") return "Current curated approach";
  if (option.role === "conditional") return "Conditional option";
  return "Alternative approach";
}

export function ApproachDecisionSection({
  payload,
}: {
  payload?: Record<string, unknown>;
}) {
  const decision = (payload ?? {}) as ApproachDecision;
  const approaches = decision.approaches ?? [];
  if (!approaches.length) return null;

  return (
    <div className="space-y-4">
      {decision.message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-950">
          {decision.message}
        </div>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {approaches.map((option) => {
          const selected = decision.selected_approach_id === option.approach_id;
          const incomplete = option.content_status === "coverage_gap";
          const risks = (option.structures_at_risk ?? [])
            .map((risk) => risk.structure ?? risk.name)
            .filter(Boolean)
            .slice(0, 3);
          return (
            <article
              key={option.approach_id ?? option.name}
              className={`rounded-2xl border p-4 ${
                selected
                  ? "border-emerald-300 bg-emerald-50/60"
                  : incomplete
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-black text-slate-950">
                  {option.name}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    incomplete
                      ? "bg-amber-100 text-amber-900"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {statusLabel(option, selected)}
                </span>
              </div>
              {(option.selection_indications ?? []).length > 0 ? (
                <p className="mt-3 text-xs leading-5 text-slate-700">
                  <strong>Consider when:</strong>{" "}
                  {option.selection_indications!.join(" ")}
                </p>
              ) : null}
              {(option.exposure ?? []).length > 0 ? (
                <p className="mt-3 text-sm leading-6 text-slate-800">
                  {option.exposure![0]}
                </p>
              ) : null}
              {risks.length > 0 ? (
                <p className="mt-3 text-xs leading-5 text-slate-700">
                  <strong>Structures at risk:</strong> {risks.join(" · ")}
                </p>
              ) : null}
              {incomplete ? (
                <p className="mt-3 text-xs font-semibold leading-5 text-amber-900">
                  {option.coverage_notes || option.selection_limitations?.[0]}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
      {decision.coverage?.gap_count ? (
        <p className="text-xs leading-5 text-slate-500">
          {decision.coverage.complete_count ?? 0} of{" "}
          {decision.coverage.known_count ?? approaches.length} known approach
          modules currently have detailed curated coverage.
        </p>
      ) : null}
    </div>
  );
}
