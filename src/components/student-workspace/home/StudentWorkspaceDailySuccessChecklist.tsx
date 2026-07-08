"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";
import type {
  StudentWorkspaceChecklistItem,
  StudentWorkspaceChecklistState,
} from "@/lib/student-workspace/types";

export function StudentWorkspaceDailySuccessChecklist({
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

      setState((current) => {
        const next = current.filter(
          (entry) => entry.checklist_item_id !== result.state.checklist_item_id
        );
        return [...next, result.state];
      });
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
      id="daily-success-checklist"
      className={`rounded-[2rem] border p-4 shadow-sm transition-all sm:p-5 ${
        allComplete
          ? "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_45%,#eff6ff_100%)]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            <Sparkles className="h-3.5 w-3.5" />
            Daily Success Checklist
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            The four habits that make teams want you back.
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">
            Check these off before the day gets away from you.
          </p>
        </div>

        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Today
          </p>
          <p className="mt-1 text-lg font-bold tracking-tight text-slate-950">
            {completedCount}/{items.length}
          </p>
        </div>
      </div>

      {allComplete ? (
        <div className="mt-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-900">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4" />
            Daily win unlocked
          </div>
          <p className="mt-1 text-sm leading-6">
            You showed up like the student every resident wants back. Keep the
            streak going tomorrow.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2.5">
        {items.map((item, index) => {
          const isComplete = !!stateByItemId.get(item.id)?.is_completed;
          const isSaving = savingId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => void toggleItem(item)}
              disabled={!!savingId}
              className={`flex min-h-14 items-center gap-3 rounded-[1.25rem] border px-3.5 py-3 text-left transition ${
                isComplete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white"
              } disabled:opacity-70`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                ) : isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Habit {index + 1}
                </p>
                <p className="mt-1 text-base font-semibold text-current">
                  {item.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
