"use client";

import { useMemo, useState } from "react";
import { Pin, ChevronUp, ChevronDown, Square } from "lucide-react";

import type { SignoutCard, UpdateCardPatch } from "@/lib/workspace/signout/types";
import type { SaveCardResult } from "@/components/workspace/signout/api";
import { SEVERITY_META, nextSeverity } from "@/components/workspace/signout/severity";
import { computePod, podChip } from "@/lib/workspace/signout/pod";
import { countTodos, extractTags } from "@/lib/workspace/signout/tokens";

type SortKey = "severity" | "location" | "handle" | "attending" | "pod";

type Props = {
  cards: SignoutCard[];
  onSaveCard: (cardId: string, patch: UpdateCardPatch) => Promise<SaveCardResult>;
  onOpenCard: (cardId: string) => void;
};

function firstLine(text: string): string {
  // First non-empty, non-header line — the one-liner summary.
  return (
    text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith("#")) ?? ""
  );
}

function podDays(card: SignoutCard): number {
  const p = computePod(card.surgeryDate);
  return p ? p.days : Number.NEGATIVE_INFINITY;
}

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
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <th className="px-2 py-2">
              <SortHead label="Sev" active={sortKey === "severity"} asc={asc} onClick={() => toggleSort("severity")} />
            </th>
            <th className="px-2 py-2">
              <SortHead label="Loc" active={sortKey === "location"} asc={asc} onClick={() => toggleSort("location")} />
            </th>
            <th className="px-2 py-2">
              <SortHead label="Patient" active={sortKey === "handle"} asc={asc} onClick={() => toggleSort("handle")} />
            </th>
            <th className="px-2 py-2">
              <SortHead label="Attending" active={sortKey === "attending"} asc={asc} onClick={() => toggleSort("attending")} />
            </th>
            <th className="px-2 py-2">
              <SortHead label="POD" active={sortKey === "pod"} asc={asc} onClick={() => toggleSort("pod")} />
            </th>
            <th className="px-2 py-2">Sign-out</th>
            <th className="px-2 py-2">To-do</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((card) => {
            const meta = SEVERITY_META[card.severity];
            const pod = podChip(card.surgeryDate);
            const preOp = computePod(card.surgeryDate)?.preOp ?? false;
            const todos = countTodos(card.body);
            const tags = extractTags(card.body);
            return (
              <tr
                key={card.id}
                className={`border-b border-slate-100 align-top last:border-0 hover:bg-slate-50 ${
                  card.status === "discharged" ? "opacity-50" : ""
                }`}
              >
                <td className="px-2 py-2">
                  <button
                    type="button"
                    aria-label={`Severity: ${meta.label}. Click to change.`}
                    onClick={() => void onSaveCard(card.id, { severity: nextSeverity(card.severity) })}
                    className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${meta.dot}`}
                  />
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-slate-600">
                  {card.location || <span className="text-slate-300">—</span>}
                </td>
                <td className="whitespace-nowrap px-2 py-2 font-bold text-slate-900">
                  <span className="inline-flex items-center gap-1">
                    {card.pinned && <Pin className="h-3 w-3 text-amber-500" />}
                    {card.handle}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-slate-600">
                  {card.attending || <span className="text-slate-300">—</span>}
                </td>
                <td className="whitespace-nowrap px-2 py-2">
                  {pod ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        preOp ? "bg-purple-50 text-purple-800" : "bg-blue-50 text-blue-800"
                      }`}
                    >
                      {pod}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="max-w-[280px] px-2 py-2">
                  <button
                    type="button"
                    onClick={() => onOpenCard(card.id)}
                    className="block max-w-full truncate text-left text-slate-700 hover:text-slate-900 hover:underline"
                  >
                    {firstLine(card.body) || <span className="text-slate-400">Add sign-out…</span>}
                  </button>
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-[11px]">
                  {todos.open > 0 && (
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <Square className="h-3 w-3" />
                      {todos.open}
                    </span>
                  )}
                  {tags.map((t) => (
                    <span key={t} className="ml-1 text-slate-400">
                      #{t}
                    </span>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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
      className={`inline-flex items-center gap-0.5 ${active ? "text-slate-700" : ""}`}
    >
      {label}
      {active && (asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </button>
  );
}
