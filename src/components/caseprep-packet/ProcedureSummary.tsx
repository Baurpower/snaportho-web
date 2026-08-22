import type { PacketItem } from "@/lib/caseprep-v1-1/stream-schema";

import {
  type ApproachDecision,
  caseFrameFromOverview,
  normalizeApproachRisks,
  texts,
} from "./approach-decision";

export function ProcedureSummary({
  items,
  decision,
}: {
  items: PacketItem[];
  decision?: Record<string, unknown>;
}) {
  const approach = (decision ?? {}) as ApproachDecision;
  const frameItem = items.find(
    (item) => item.category === "summary" || item.question === "Case",
  );
  const mustKnows = items.filter(
    (item) => item.category === "must_know" || item.category === "must_know_anatomy",
  );
  const fallback = items.filter((item) => item !== frameItem && !mustKnows.includes(item));
  const frame = caseFrameFromOverview(
    frameItem?.answer || (mustKnows.length === 0 ? items.map((item) => item.answer).join(" ") : ""),
  );
  const bullets =
    mustKnows.length > 0
      ? mustKnows.map((item) => item.answer)
      : fallback.map((item) => item.answer).filter(Boolean);

  const selected = (approach.approaches ?? []).find(
    (option) => option.approach_id === approach.selected_approach_id,
  );
  const selectedRisks = selected
    ? normalizeApproachRisks(selected.structures_at_risk).slice(0, 3)
    : [];
  const selectedPositioning = selected ? texts(selected.positioning).slice(0, 1) : [];
  const choiceRequired = approach.status === "choice_required" && !selected;

  return (
    <div className="space-y-4">
      {frame ? (
        <p className="text-sm leading-7 text-slate-800">{frame}</p>
      ) : null}

      {choiceRequired ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-950">
          Confirm the planned approach above. These notes follow the certified
          packet until an approach is named.
        </p>
      ) : null}

      {bullets.length > 0 ? (
        <ol className="space-y-2.5">
          {bullets.map((bullet, index) => (
            <li key={`${index}:${bullet.slice(0, 40)}`} className="flex gap-2.5 text-sm leading-6">
              <span className="shrink-0 font-black text-emerald-700">{index + 1}.</span>
              <span className="text-slate-800">{bullet}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {selected ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
            For the selected approach
          </p>
          <p className="mt-1 text-sm font-bold text-slate-950">{selected.name}</p>
          {selectedPositioning.map((line) => (
            <p key={line} className="mt-1 text-sm leading-6 text-slate-800">
              {line}
            </p>
          ))}
          {selectedRisks.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {selectedRisks.map((risk) => (
                <li key={risk.name} className="text-sm leading-6 text-slate-800">
                  <span className="font-semibold text-slate-950">{risk.name}.</span>
                  {risk.why ? <span> {risk.why}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
