"use client";

import { useState } from "react";
import { Check, ChevronDown, Pencil, Pin, PinOff, Plus, Trash2, X } from "lucide-react";

import {
  DIAGNOSTIC_STATUSES,
  PT_RECOMMENDATIONS,
  createDiagnosticItem,
  diagnosticItemSummary,
  formatDiagnosticDate,
  sortDiagnosticItems,
} from "@/lib/workspace/signout/diagnostics";
import type {
  DiagnosticItem,
  DiagnosticItemType,
  SignoutDiagnostics,
} from "@/lib/workspace/signout/types";

type Props = {
  diagnostics: SignoutDiagnostics;
  onChange: (next: SignoutDiagnostics) => void;
};

const TYPE_LABEL: Record<DiagnosticItemType, string> = {
  lab: "Lab",
  imaging: "Imaging",
  pt: "PT",
  other: "Other",
};

export function DiagnosticsPanel({ diagnostics, onChange }: Props) {
  const [draft, setDraft] = useState<DiagnosticItem | null>(null);
  const [labValue, setLabValue] = useState("");
  const [showAll, setShowAll] = useState(false);

  const sorted = sortDiagnosticItems(diagnostics.items);
  const visible = showAll ? sorted : sorted.slice(0, 5);

  function begin(type: DiagnosticItemType = "lab") {
    setDraft(createDiagnosticItem(type));
    setLabValue("");
  }

  function edit(item: DiagnosticItem) {
    setDraft(structuredClone(item));
    setLabValue("");
  }

  function save() {
    if (!draft || !draft.label.trim()) return;
    let nextDraft = { ...draft, label: draft.label.trim(), details: draft.details.trim() };
    if (draft.type === "lab" && labValue.trim()) {
      nextDraft = {
        ...nextDraft,
        labValues: [
          { id: crypto.randomUUID(), value: labValue.trim(), date: draft.date },
          ...nextDraft.labValues,
        ].slice(0, 20),
      };
    }
    const exists = diagnostics.items.some((item) => item.id === nextDraft.id);
    onChange({
      version: 1,
      items: exists
        ? diagnostics.items.map((item) => (item.id === nextDraft.id ? nextDraft : item))
        : [...diagnostics.items, nextDraft],
    });
    setDraft(null);
    setLabValue("");
  }

  function remove(id: string) {
    onChange({ version: 1, items: diagnostics.items.filter((item) => item.id !== id) });
    setDraft(null);
  }

  function togglePin(item: DiagnosticItem) {
    onChange({
      version: 1,
      items: diagnostics.items.map((entry) =>
        entry.id === item.id ? { ...entry, pinned: !entry.pinned } : entry
      ),
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-slate-700">Tracked items</p>
          <p className="text-[11px] text-slate-500">One date, status, and update per item.</p>
        </div>
        {!draft && (
          <button
            type="button"
            onClick={() => begin()}
            className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:border-blue-400"
          >
            <Plus className="h-3.5 w-3.5" /> Add item
          </button>
        )}
      </div>

      {draft && (
        <div className="mt-2 rounded-lg border border-blue-200 bg-white p-2.5 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)_9rem_9rem]">
            <label className="text-[11px] font-bold uppercase text-slate-500">
              Type
              <select
                value={draft.type}
                onChange={(e) => {
                  const type = e.target.value as DiagnosticItemType;
                  setDraft({
                    ...draft,
                    type,
                    label: type === "pt" && !draft.label ? "PT" : draft.label,
                    status: DIAGNOSTIC_STATUSES[type][0],
                  });
                }}
                className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-normal normal-case text-slate-900"
              >
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-bold uppercase text-slate-500">
              Item
              <input
                autoFocus
                value={draft.label}
                maxLength={120}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder={draft.type === "lab" ? "Hgb, WBC, CRP…" : draft.type === "imaging" ? "MRI right knee" : "Item name"}
                className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm font-normal normal-case text-slate-900"
              />
            </label>
            <label className="text-[11px] font-bold uppercase text-slate-500">
              Date
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm font-normal normal-case text-slate-900"
              />
            </label>
            <label className="text-[11px] font-bold uppercase text-slate-500">
              Status
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-normal normal-case text-slate-900"
              >
                {DIAGNOSTIC_STATUSES[draft.type].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>

          {draft.type === "lab" && (
            <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_2fr]">
              <label className="text-[11px] font-bold uppercase text-slate-500">
                New value
                <input
                  value={labValue}
                  maxLength={80}
                  onChange={(e) => setLabValue(e.target.value)}
                  placeholder="8.1, pending, positive…"
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm font-normal normal-case text-slate-900"
                />
              </label>
              <DetailsField draft={draft} setDraft={setDraft} />
            </div>
          )}

          {draft.type === "pt" && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-bold uppercase text-slate-500">
                Distance walked
                <input
                  value={draft.ptDistance}
                  maxLength={80}
                  onChange={(e) => setDraft({ ...draft, ptDistance: e.target.value })}
                  placeholder="40 ft, unable…"
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm font-normal normal-case text-slate-900"
                />
              </label>
              <label className="text-[11px] font-bold uppercase text-slate-500">
                Recommendation
                <input
                  value={draft.ptRecommendation}
                  onChange={(e) => setDraft({ ...draft, ptRecommendation: e.target.value })}
                  list="pt-recommendations"
                  placeholder="SNF, home…"
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm font-normal normal-case text-slate-900"
                />
                <datalist id="pt-recommendations">
                  {PT_RECOMMENDATIONS.map((recommendation) => <option key={recommendation} value={recommendation} />)}
                </datalist>
              </label>
            </div>
          )}

          {draft.type !== "lab" && draft.type !== "pt" && (
            <div className="mt-2"><DetailsField draft={draft} setDraft={setDraft} /></div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={draft.pinned ? "Unmark important" : "Mark important"}
                onClick={() => setDraft({ ...draft, pinned: !draft.pinned })}
                className={`rounded p-1.5 ${draft.pinned ? "text-amber-500" : "text-slate-400 hover:text-amber-500"}`}
              >
                {draft.pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
              </button>
              {diagnostics.items.some((item) => item.id === draft.id) && (
                <button type="button" aria-label="Delete item" onClick={() => remove(draft.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setDraft(null)} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button type="button" disabled={!draft.label.trim()} onClick={save} className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40">
                <Check className="h-3.5 w-3.5" /> Save item
              </button>
            </div>
          </div>
        </div>
      )}

      {!draft && visible.length === 0 && (
        <button type="button" onClick={() => begin()} className="mt-2 w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-500 hover:border-blue-300 hover:text-blue-700">
          No tracked items yet. Add only what matters for this patient.
        </button>
      )}

      {!draft && visible.length > 0 && (
        <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200 bg-white">
          {visible.map((item) => (
            <div key={item.id} className="flex items-start gap-2 px-2.5 py-2">
              <button type="button" aria-label={item.pinned ? "Unmark important" : "Mark important"} onClick={() => togglePin(item)} className={`mt-0.5 ${item.pinned ? "text-amber-500" : "text-slate-300 hover:text-amber-500"}`}>
                {item.pinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={() => edit(item)} className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">{TYPE_LABEL[item.type]}</span>
                  <span className="text-sm font-semibold text-slate-900">{diagnosticItemSummary(item) || item.label}</span>
                  <span className="text-[11px] font-semibold text-blue-700">{item.status}</span>
                  {item.date && <span className="text-[11px] text-slate-400">{formatDiagnosticDate(item.date)}</span>}
                </div>
                {item.type !== "imaging" && item.details && <p className="mt-0.5 truncate text-xs text-slate-500">{item.details}</p>}
              </button>
              <button type="button" aria-label={`Edit ${item.label}`} onClick={() => edit(item)} className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-700">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!draft && sorted.length > 5 && (
        <button type="button" onClick={() => setShowAll((value) => !value)} className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <ChevronDown className={`h-3.5 w-3.5 transition ${showAll ? "rotate-180" : ""}`} />
          {showAll ? "Show less" : `Show ${sorted.length - 5} more`}
        </button>
      )}
    </div>
  );
}

export function DiagnosticsSummary({ diagnostics, onEdit }: { diagnostics: SignoutDiagnostics; onEdit: () => void }) {
  const items = sortDiagnosticItems(diagnostics.items).slice(0, 4);
  if (items.length === 0) return null;
  return (
    <button type="button" onClick={onEdit} className="mt-2 block w-full rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-2 text-left hover:border-slate-200">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tracked diagnostics</p>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex min-w-0 items-baseline gap-2 text-xs">
            <span className="w-14 shrink-0 font-bold uppercase text-slate-400">{TYPE_LABEL[item.type]}</span>
            <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{diagnosticItemSummary(item) || item.label}</span>
            <span className="shrink-0 font-semibold text-blue-700">{item.status}</span>
            {item.date && <span className="shrink-0 text-slate-400">{formatDiagnosticDate(item.date)}</span>}
          </div>
        ))}
      </div>
      {diagnostics.items.length > 4 && <p className="mt-1 text-[11px] text-slate-400">+{diagnostics.items.length - 4} more</p>}
    </button>
  );
}

function DetailsField({ draft, setDraft }: { draft: DiagnosticItem; setDraft: (item: DiagnosticItem) => void }) {
  return (
    <label className="block text-[11px] font-bold uppercase text-slate-500">
      Details
      <input
        value={draft.details}
        maxLength={2000}
        onChange={(e) => setDraft({ ...draft, details: e.target.value })}
        placeholder={draft.type === "imaging" ? "Read pending, team impression…" : "Optional note"}
        className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm font-normal normal-case text-slate-900"
      />
    </label>
  );
}
