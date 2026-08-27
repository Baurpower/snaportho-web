"use client";

import { useId, useState } from "react";

import {
  type ApproachDecision,
  type ApproachOption,
  normalizeApproachRisks,
  texts,
} from "./approach-decision";

function statusLabel(
  option: ApproachOption,
  selected: boolean,
  selectedFromCase: boolean,
) {
  if (selected)
    return selectedFromCase ? "Selected from case description" : "Selected approach";
  if (option.role === "primary") return "Primary option";
  if (option.role === "conditional") return "Conditional option";
  return "Alternative approach";
}

function BulletList({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-slate-800">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ApproachCard({
  option,
  selected,
  expanded,
  onToggle,
  selectedFromCase = false,
  summaryOnly = false,
}: {
  option: ApproachOption;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  selectedFromCase?: boolean;
  summaryOnly?: boolean;
}) {
  const risks = normalizeApproachRisks(option.structures_at_risk);
  const indications = texts(option.selection_indications);
  const positioning = texts(option.positioning);
  const layers = texts(option.layers);
  const exposure = texts(option.exposure);
  const landmarks = texts(option.landmarks);
  const pitfalls = [
    ...texts(option.pitfalls),
    ...texts(option.selection_limitations),
  ];
  const titleId = option.approach_id ?? option.name ?? "approach";

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        selected
          ? "border-emerald-300 bg-emerald-50/60"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-black text-slate-950">{option.name}</h3>
        <div className="flex flex-wrap justify-end gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
              selected
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            {statusLabel(option, selected, selectedFromCase)}
          </span>
        </div>
      </div>

      {indications.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-slate-700">
          <strong>Consider when:</strong> {indications.join(" ")}
        </p>
      ) : null}

      {summaryOnly && positioning.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-slate-700">
          <strong>Position:</strong> {positioning[0]}
        </p>
      ) : null}

      {(!expanded || summaryOnly) && risks.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-slate-700">
          <strong>Structures at risk:</strong>{" "}
          {risks
            .slice(0, 3)
            .map((risk) => risk.name)
            .join(" · ")}
        </p>
      ) : null}

      {expanded && !summaryOnly ? (
        <div id={`${titleId}-details`} className="mt-1">
          <BulletList label="Positioning" items={positioning} />
          <BulletList label="Interval / layers" items={layers} />
          <BulletList label="Exposure" items={exposure} />
          <BulletList label="Landmarks" items={landmarks} />
          {risks.length > 0 ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Protect these
              </p>
              <ul className="mt-1.5 space-y-2">
                {risks.map((risk) => (
                  <li
                    key={`${risk.name}:${risk.why ?? ""}`}
                    className="rounded-xl bg-white/70 p-3 text-sm leading-6 text-slate-800"
                  >
                    <span className="font-bold text-slate-950">{risk.name}</span>
                    {risk.why ? (
                      <span className="text-slate-700"> — {risk.why}</span>
                    ) : null}
                    {risk.protection ? (
                      <p className="mt-1 text-emerald-800">
                        <span className="font-semibold">Avoid it:</span>{" "}
                        {risk.protection}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <BulletList label="Pitfalls" items={pitfalls} />
        </div>
      ) : null}

      {summaryOnly ? null : (
        <button
          type="button"
          className="mt-3 text-xs font-bold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
          aria-expanded={expanded}
          aria-controls={`${titleId}-details`}
          onClick={onToggle}
        >
          {expanded ? "Hide details" : "Show positioning and interval"}
        </button>
      )}
    </article>
  );
}

function ApproachSwitcher({
  approaches,
  activeId,
  onSelect,
}: {
  approaches: ApproachOption[];
  activeId: string | null;
  onSelect: (option: ApproachOption) => void;
}) {
  const selectorId = useId();
  if (approaches.length < 2) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
      <label
        htmlFor={selectorId}
        className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 sm:hidden"
      >
        Switch approach
      </label>
      <select
        id={selectorId}
        value={activeId ?? ""}
        onChange={(event) => {
          const option = approaches.find(
            (candidate) =>
              (candidate.approach_id ?? candidate.name) === event.target.value,
          );
          if (option) onSelect(option);
        }}
        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:hidden"
      >
        {!activeId ? <option value="">Choose an approach</option> : null}
        {approaches.map((option) => {
          const id = option.approach_id ?? option.name ?? "";
          return id ? (
            <option key={id} value={id}>
              {option.name ?? id}
            </option>
          ) : null;
        })}
      </select>

      <div
        className="hidden flex-wrap gap-1.5 sm:flex"
        role="tablist"
        aria-label="Surgical approaches"
      >
        {approaches.map((option) => {
          const id = option.approach_id ?? option.name ?? "";
          if (!id) return null;
          const selected = id === activeId;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(option)}
              className={`rounded-lg border px-3 py-2 text-left text-xs font-bold leading-4 transition focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
                selected
                  ? "border-emerald-300 bg-white text-emerald-900 shadow-sm"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
              }`}
            >
              {option.name ?? id}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ApproachDecisionSection({
  payload,
  summaryOnly = false,
  onActiveApproachChange,
}: {
  payload?: Record<string, unknown>;
  summaryOnly?: boolean;
  onActiveApproachChange?: (option: ApproachOption) => void;
}) {
  const decision = (payload ?? {}) as ApproachDecision;
  const approaches = decision.approaches ?? [];
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const serverSelectedId =
    decision.selected_approach_ids?.[0] ?? decision.selected_approach_id ?? null;
  const [chosenActiveId, setChosenActiveId] = useState<string | null>(null);
  const activeId = chosenActiveId ?? serverSelectedId;

  if (!approaches.length) return null;

  const isExpanded = (option: ApproachOption) => {
    const id = option.approach_id ?? option.name ?? "";
    if (id in expandedIds) return expandedIds[id];
    if (
      decision.selected_approach_ids?.includes(option.approach_id ?? "") ||
      (decision.selected_approach_id &&
        decision.selected_approach_id === option.approach_id)
    ) {
      return true;
    }
    if (!decision.selected_approach_id && approaches.length === 1) return true;
    return false;
  };

  const chooseApproach = (option: ApproachOption) => {
    const id = option.approach_id ?? option.name;
    if (!id) return;
    setChosenActiveId(id);
    setExpandedIds((prev) => ({ ...prev, [id]: true }));
    onActiveApproachChange?.(option);
  };

  return (
    <div className="space-y-4">
      {decision.message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-950">
          {decision.message}
        </div>
      ) : null}
      <ApproachSwitcher
        approaches={approaches}
        activeId={activeId}
        onSelect={chooseApproach}
      />
      {activeId ? (
        <div className="w-full">
          {approaches
            .filter(
              (option) => (option.approach_id ?? option.name) === activeId,
            )
            .map((option) => {
              const id = option.approach_id ?? option.name ?? "approach";
              return (
                <ApproachCard
                  key={id}
                  option={option}
                  selected
                  selectedFromCase={activeId === serverSelectedId}
                  expanded={isExpanded(option)}
                  summaryOnly={summaryOnly}
                  onToggle={() =>
                    setExpandedIds((prev) => ({
                      ...prev,
                      [id]: !isExpanded(option),
                    }))
                  }
                />
              );
            })}
        </div>
      ) : null}
    </div>
  );
}
