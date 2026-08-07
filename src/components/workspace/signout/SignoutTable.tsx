"use client";

import { useMemo, useState } from "react";
import { Pin, ChevronUp, ChevronDown } from "lucide-react";

import type { SignoutCard, UpdateCardPatch } from "@/lib/workspace/signout/types";
import type { SaveCardResult } from "@/components/workspace/signout/api";
import { SEVERITY_META, nextSeverity } from "@/components/workspace/signout/severity";
import { rosterTableColumns, type WbStatus } from "@/lib/workspace/signout/roster";
import { computePod } from "@/lib/workspace/signout/pod";

type SortKey = "severity" | "location" | "handle" | "attending" | "pod";

type Props = {
  cards: SignoutCard[];
  onSaveCard: (cardId: string, patch: UpdateCardPatch) => Promise<SaveCardResult>;
  /** Opens card for multi-section *editing* only — table is for reading. */
  onOpenCard: (cardId: string) => void;
};

const WB_CHIP: Record<WbStatus, string> = {
  NWB: "bg-rose-50 text-rose-800",
  TTWB: "bg-amber-50 text-amber-900",
  PWB: "bg-orange-50 text-orange-900",
  WBAT: "bg-emerald-50 text-emerald-800",
  FWB: "bg-emerald-50 text-emerald-800",
};

function podDays(card: SignoutCard): number {
  const p = computePod(card.surgeryDate);
  return p ? p.days : Number.NEGATIVE_INFINITY;
}

/**
 * Real multi-column roster table (Google Doc sign-out style).
 * Cells wrap full clinical text — no card list, no click-to-read.
 */
export function SignoutTable({ cards, onSaveCard, onOpenCard }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...cards];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "severity")
        cmp = SEVERITY_META[a.severity].order - SEVERITY_META[b.severity].order;
      else if (sortKey === "location") cmp = a.location.localeCompare(b.location);
      else if (sortKey === "handle") cmp = a.handle.localeCompare(b.handle);
      else if (sortKey === "attending") cmp = a.attending.localeCompare(b.attending);
      else if (sortKey === "pod") cmp = podDays(a) - podDays(b);
      if (cmp === 0) cmp = a.location.localeCompare(b.location);
      if (cmp === 0) cmp = a.handle.localeCompare(b.handle);
      return asc ? cmp : -cmp;
    });
    return copy;
  }, [cards, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white shadow-sm">
      <table className="w-full min-w-[960px] border-collapse text-left text-[12px] leading-snug">
        <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-600">
          <tr className="border-b border-slate-300">
            <th className="w-8 border-r border-slate-200 px-1.5 py-2 text-center">
              <SortHead
                label="Sev"
                active={sortKey === "severity"}
                asc={asc}
                onClick={() => toggleSort("severity")}
              />
            </th>
            <th className="w-[4.5rem] border-r border-slate-200 px-2 py-2">
              <SortHead
                label="Loc"
                active={sortKey === "location"}
                asc={asc}
                onClick={() => toggleSort("location")}
              />
            </th>
            <th className="w-[5.5rem] border-r border-slate-200 px-2 py-2">
              <SortHead
                label="Att"
                active={sortKey === "attending"}
                asc={asc}
                onClick={() => toggleSort("attending")}
              />
            </th>
            <th className="w-[8.5rem] border-r border-slate-200 px-2 py-2">
              <SortHead
                label="Patient"
                active={sortKey === "handle"}
                asc={asc}
                onClick={() => toggleSort("handle")}
              />
            </th>
            <th className="w-[7.5rem] border-r border-slate-200 px-2 py-2">
              <SortHead
                label="Surgery"
                active={sortKey === "pod"}
                asc={asc}
                onClick={() => toggleSort("pod")}
              />
            </th>
            <th className="min-w-[12rem] border-r border-slate-200 px-2 py-2 normal-case tracking-normal">
              Clinical
            </th>
            <th className="min-w-[9rem] border-r border-slate-200 px-2 py-2 normal-case tracking-normal">
              Labs / Imaging
            </th>
            <th className="min-w-[9rem] px-2 py-2 normal-case tracking-normal">Plan</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((card) => {
            const meta = SEVERITY_META[card.severity];
            const { clinical, labs, plan, row } = rosterTableColumns(card);
            const preOp = row.pod?.preOp ?? false;
            const discharged = card.status === "discharged";
            const surgeryLabel =
              card.managementMode === "nonop"
                ? row.surgery
                  ? `Non-op · ${row.surgery}`
                  : "Non-op"
                : row.surgery;

            return (
              <tr
                key={card.id}
                className={`border-b border-slate-200 align-top last:border-b-0 hover:bg-slate-50/80 ${
                  discharged ? "opacity-50" : ""
                } ${
                  card.severity === "unstable"
                    ? "bg-red-50/40"
                    : card.severity === "watcher"
                      ? "bg-amber-50/25"
                      : ""
                }`}
              >
                {/* Severity */}
                <td className="border-r border-slate-100 px-1.5 py-2 text-center">
                  <button
                    type="button"
                    aria-label={`Severity: ${meta.label}. Click to change.`}
                    title={`${meta.label} — click to cycle`}
                    onClick={() =>
                      void onSaveCard(card.id, { severity: nextSeverity(card.severity) })
                    }
                    className={`mx-auto block h-3 w-3 rounded-full ${meta.dot} ring-2 ring-offset-1 ${
                      card.severity === "unstable"
                        ? "ring-red-200"
                        : card.severity === "watcher"
                          ? "ring-amber-200"
                          : "ring-transparent"
                    }`}
                  />
                </td>

                {/* Location */}
                <td className="border-r border-slate-100 px-2 py-2 font-semibold text-slate-700">
                  {row.location || <Empty />}
                </td>

                {/* Attending */}
                <td className="border-r border-slate-100 px-2 py-2 text-slate-700">
                  {row.attending || <Empty />}
                </td>

                {/* Patient */}
                <td className="border-r border-slate-100 px-2 py-2">
                  <button
                    type="button"
                    onClick={() => onOpenCard(card.id)}
                    className="text-left font-bold text-slate-900 hover:underline"
                    title="Edit full card"
                  >
                    <span className="inline-flex items-start gap-1">
                      {card.pinned && (
                        <Pin className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                      )}
                      <span className="whitespace-pre-wrap">{row.patient || "—"}</span>
                    </span>
                  </button>
                </td>

                {/* Surgery + POD + next OR + WB */}
                <td className="border-r border-slate-100 px-2 py-2">
                  <div className="flex flex-col gap-1">
                    {surgeryLabel ? (
                      <span className="font-medium text-slate-800 whitespace-pre-wrap">
                        {surgeryLabel}
                      </span>
                    ) : (
                      <Empty />
                    )}
                    {!row.nonOp && row.nextSurgery && (
                      <span className="text-[11px] text-slate-600 whitespace-pre-wrap">
                        → {row.nextSurgery}
                        {row.nextSurgeryDate
                          ? ` · ${row.nextSurgeryDate.slice(5).replace("-", "/")}`
                          : ""}
                      </span>
                    )}
                    {row.podLabel && (
                      <span
                        className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          row.nonOp
                            ? row.txDay?.started
                              ? "bg-teal-50 text-teal-800"
                              : "bg-slate-100 text-slate-700"
                            : preOp
                              ? "bg-purple-50 text-purple-800"
                              : "bg-blue-50 text-blue-800"
                        }`}
                        title={
                          row.nonOp && row.surgeryDate
                            ? `Started ${row.surgeryDate}`
                            : undefined
                        }
                      >
                        {row.nonOp && row.podLabel !== "Non-op"
                          ? `Non-op · ${row.podLabel}`
                          : row.podLabel}
                      </span>
                    )}
                    {row.nextOrLabel && (
                      <span
                        className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          row.nextOr?.upcoming
                            ? "bg-purple-50 text-purple-800"
                            : "bg-indigo-50 text-indigo-800"
                        }`}
                      >
                        {row.nextOrLabel}
                      </span>
                    )}
                    {row.weightBearing.length > 0 && (
                      <div className="flex flex-wrap gap-0.5">
                        {row.weightBearing.map((wb) => (
                          <span
                            key={wb}
                            className={`rounded px-1 py-0.5 text-[10px] font-bold ${WB_CHIP[wb]}`}
                          >
                            {wb}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>

                {/* Clinical narrative — full wrap */}
                <td className="border-r border-slate-100 px-2 py-2 text-slate-800">
                  {clinical ? (
                    <p className="whitespace-pre-wrap">{clinical}</p>
                  ) : (
                    <Empty />
                  )}
                </td>

                {/* Labs / Imaging */}
                <td className="border-r border-slate-100 px-2 py-2 text-slate-800">
                  {labs ? <p className="whitespace-pre-wrap">{labs}</p> : <Empty />}
                </td>

                {/* Plan */}
                <td className="px-2 py-2 text-slate-800">
                  {plan ? (
                    <p className="whitespace-pre-wrap">{plan}</p>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                  {row.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-0.5">
                      {row.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-600"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return <span className="text-slate-300">—</span>;
}

function SortHead({
  label,
  active,
  asc,
  onClick,
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-0.5 ${active ? "text-slate-900" : "text-slate-500"}`}
    >
      {label}
      {active && (asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </button>
  );
}
