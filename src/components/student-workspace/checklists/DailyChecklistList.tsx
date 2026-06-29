"use client";

import type {
  StudentWorkspaceChecklistItem,
  StudentWorkspaceChecklistState,
} from "@/lib/student-workspace/types";
import { ChecklistItemRow } from "@/components/student-workspace/checklists/ChecklistItemRow";

export function DailyChecklistList({
  items,
  stateByItemId,
  busy,
  onToggle,
}: {
  items: StudentWorkspaceChecklistItem[];
  stateByItemId: Map<string, StudentWorkspaceChecklistState>;
  busy?: boolean;
  onToggle: (item: StudentWorkspaceChecklistItem, nextCompleted: boolean) => Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        This template does not have any items yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <ChecklistItemRow
          key={item.id}
          item={item}
          state={stateByItemId.get(item.id) ?? null}
          busy={busy}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
