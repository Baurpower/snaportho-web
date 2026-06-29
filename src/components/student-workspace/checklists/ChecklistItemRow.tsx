"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type {
  StudentWorkspaceChecklistItem,
  StudentWorkspaceChecklistState,
} from "@/lib/student-workspace/types";

export function ChecklistItemRow({
  item,
  state,
  busy,
  onToggle,
}: {
  item: StudentWorkspaceChecklistItem;
  state: StudentWorkspaceChecklistState | null;
  busy?: boolean;
  onToggle: (item: StudentWorkspaceChecklistItem, nextCompleted: boolean) => Promise<void>;
}) {
  const isCompleted = state?.is_completed ?? false;

  return (
    <button
      type="button"
      onClick={() => onToggle(item, !isCompleted)}
      disabled={busy}
      className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
    >
      <div className="mt-0.5 text-emerald-600">
        {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${isCompleted ? "text-slate-500 line-through" : "text-slate-900"}`}>
          {item.label}
        </p>
        {item.details ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">{item.details}</p>
        ) : null}
      </div>
    </button>
  );
}
