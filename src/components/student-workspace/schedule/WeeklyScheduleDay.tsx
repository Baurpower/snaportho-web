"use client";

import { formatLongDateOnly } from "@/lib/student-workspace/date";
import type {
  StudentWorkspaceResolvedScheduleEntry,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";
import { ScheduleEntryCard } from "@/components/student-workspace/schedule/ScheduleEntryCard";

export function WeeklyScheduleDay({
  dateKey,
  entries,
  rotations,
  busy,
  onEdit,
  onDelete,
}: {
  dateKey: string;
  entries: StudentWorkspaceResolvedScheduleEntry[];
  rotations: StudentWorkspaceRotation[];
  busy?: boolean;
  onEdit: (entry: StudentWorkspaceResolvedScheduleEntry) => void;
  onDelete: (entry: StudentWorkspaceResolvedScheduleEntry) => Promise<void>;
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
        {formatLongDateOnly(dateKey)}
      </h3>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Nothing scheduled yet.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {entries.map((entry) => (
            <ScheduleEntryCard
              key={entry.id}
              entry={entry}
              rotations={rotations}
              busy={busy}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
