"use client";

import { useState } from "react";

import {
  type ApproachDecision,
  type ApproachOption,
  normalizeApproachRisks,
  sourceLabel,
  texts,
} from "./approach-decision";

function statusLabel(option: ApproachOption, selected: boolean) {
  if (selected) return "Selected from case description";
  if (option.content_status === "coverage_gap")
    return "Known option · module incomplete";
  if (option.role === "primary") return "Current curated approach";
  if (option.role === "conditional") return "Conditional option";
  return "Alternative approach";
}

function isPendingReview(option: ApproachOption) {
  const status = option.review_status ?? "";
  return status === "agent_review_pending" || status === "pending";
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
}: {
  option: ApproachOption;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const incomplete = option.content_status === "coverage_gap";
  const pending = !incomplete && isPendingReview(option);
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
  const sources = texts(option.source_urls);
  const titleId = option.approach_id ?? option.name ?? "approach";

  return (
    <article
      className={`rounded-2xl border p-4 ${
        selected
          ? "border-emerald-300 bg-emerald-50/60"
          : incomplete
            ? "border-amber-200 bg-amber-50/40"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-black text-slate-950">{option.name}</h3>
        <div className="flex flex-wrap justify-end gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
              incomplete
                ? "bg-amber-100 text-amber-900"
                : selected
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            {statusLabel(option, selected)}
          </span>
          {pending ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">
              Curated · review pending
            </span>
          ) : null}
        </div>
      </div>

      {indications.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-slate-700">
          <strong>Consider when:</strong> {indications.join(" ")}
        </p>
      ) : null}

      {!expanded && risks.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-slate-700">
          <strong>Structures at risk:</strong>{" "}
          {risks
            .slice(0, 3)
            .map((risk) => risk.name)
            .join(" · ")}
        </p>
      ) : null}

      {expanded ? (
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
          {sources.length > 0 ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Sources
              </p>
              <ul className="mt-1.5 space-y-1">
                {sources.map((url) => (
                  <li key={url}>
                    <a
                      className="text-xs font-semibold text-teal-800 underline decoration-teal-200 underline-offset-2"
                      href={url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {sourceLabel(url)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {incomplete ? (
            <p className="mt-3 text-xs font-semibold leading-5 text-amber-900">
              {option.coverage_notes || pitfalls[0]}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className="mt-3 text-xs font-bold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
        aria-expanded={expanded}
        aria-controls={`${titleId}-details`}
        onClick={onToggle}
      >
        {expanded ? "Hide details" : "Show positioning, interval, and sources"}
      </button>
    </article>
  );
}

export function ApproachDecisionSection({
  payload,
  originalPrompt,
  onChoose,
}: {
  payload?: Record<string, unknown>;
  originalPrompt: string;
  onChoose: (prompt: string) => void;
}) {
  const decision = (payload ?? {}) as ApproachDecision;
  const approaches = decision.approaches ?? [];
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [chosenIds, setChosenIds] = useState<string[]>(
    decision.selected_approach_ids ??
      (decision.selected_approach_id ? [decision.selected_approach_id] : []),
  );

  if (!approaches.length) return null;

  const isExpanded = (option: ApproachOption) => {
    const id = option.approach_id ?? option.name ?? "";
    if (id in expandedIds) return expandedIds[id];
    if (decision.selected_approach_ids?.includes(option.approach_id ?? "") || (decision.selected_approach_id && decision.selected_approach_id === option.approach_id)) {
      return true;
    }
    if (!decision.selected_approach_id && approaches.length === 1) return true;
    return false;
  };

  return (
    <div className="space-y-4">
      {decision.message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-950">
          {decision.message}
        </div>
      ) : null}
      {decision.status === "choice_required" ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
          <p className="text-sm font-black text-slate-950">
            Quick follow-up: which approach should I prepare?
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Select one or more. Multiple selections create a side-by-side comparison.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {approaches.map((option) => {
              const id = option.approach_id ?? "";
              if (!id) return null;
              const checked = chosenIds.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={checked}
                  onClick={() =>
                    setChosenIds((current) =>
                      checked
                        ? current.filter((value) => value !== id)
                        : [...current, id],
                    )
                  }
                  className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                    checked
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-teal-200 bg-white text-teal-900 hover:border-teal-500"
                  }`}
                >
                  {option.name ?? id}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={chosenIds.length === 0}
            onClick={() => {
              const names = approaches
                .filter((option) => chosenIds.includes(option.approach_id ?? ""))
                .map((option) => option.name)
                .filter(Boolean)
                .join(" and ");
              onChoose(`${originalPrompt}. Prepare and compare these approaches: ${names}.`);
            }}
            className="mt-3 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {chosenIds.length > 1
              ? `Compare ${chosenIds.length} approaches`
              : "Prepare selected approach"}
          </button>
        </div>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {approaches.map((option) => {
          const id = option.approach_id ?? option.name ?? "approach";
          return (
            <ApproachCard
              key={id}
              option={option}
              selected={(decision.selected_approach_ids ?? [decision.selected_approach_id]).includes(option.approach_id)}
              expanded={isExpanded(option)}
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
