"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";
import type {
  StudentWorkspaceChecklistItem,
  StudentWorkspaceChecklistState,
} from "@/lib/student-workspace/types";

/**
 * Phone version of the daily success checklist.
 *
 * Same API contract as the desktop card; the layout drops the long headline
 * copy for a progress ring-style counter and gives each habit a full-width,
 * 56px-tall tap target.
 */
export function MobileDailyChecklist({
  items,
  initialState,
  today,
}: {
  items: StudentWorkspaceChecklistItem[];
  initialState: StudentWorkspaceChecklistState[];
  today: string;
}) {
  const [state, setState] = useState(initialState);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stateByItemId = useMemo(
    () => new Map(state.map((entry) => [entry.checklist_item_id, entry])),
    [state]
  );
  const completedCount = items.filter(
    (item) => stateByItemId.get(item.id)?.is_completed
  ).length;
  const allComplete = items.length > 0 && completedCount === items.length;

  async function toggleItem(item: StudentWorkspaceChecklistItem) {
    const nextCompleted = !stateByItemId.get(item.id)?.is_completed;
    setSavingId(item.id);
    setError(null);

    try {
      const response = await fetch("/api/student-workspace/checklists/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist_item_id: item.id,
          state_date: today,
          is_completed: nextCompleted,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? "Unable to update checklist item.");
      }

      setState((current) => [
        ...current.filter(
          (entry) => entry.checklist_item_id !== result.state.checklist_item_id
        ),
        result.state,
      ]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update checklist item."
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section
      id="mobile-daily-success-checklist"
      className={`scroll-mt-28 rounded-2xl border p-4 shadow-sm transition ${
        allComplete
          ? "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_55%,#eff6ff_100%)]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Daily success checklist
          </p>
          <h2 className="mt-0.5 text-[17px] font-bold leading-tight tracking-tight text-slate-950">
            Today&apos;s four habits
          </h2>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full border text-center ${
            allComplete
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-slate-50 text-slate-900"
          }`}
        >
          <span className="text-[15px] font-black leading-none tabular-nums">
            {completedCount}
          </span>
          <span className="text-[10px] leading-none text-slate-400">
            of {items.length}
          </span>
        </div>
      </div>

      {allComplete ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[13px] font-semibold text-emerald-900">
          <Sparkles className="h-4 w-4 shrink-0" />
          Daily win unlocked. Keep the streak going.
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const isComplete = !!stateByItemId.get(item.id)?.is_completed;
          const isSaving = savingId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => void toggleItem(item)}
              disabled={!!savingId}
              aria-pressed={isComplete}
              className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                isComplete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-slate-200 bg-slate-50 text-slate-900 active:bg-white"
              } disabled:opacity-70`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                ) : isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300" />
                )}
              </span>
              <span
                className={`min-w-0 flex-1 text-[15px] font-semibold leading-snug ${
                  isComplete ? "line-through decoration-emerald-500/40" : ""
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
