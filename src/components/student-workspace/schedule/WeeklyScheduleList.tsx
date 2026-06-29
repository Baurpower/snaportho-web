"use client";

import { getDatesForWeek } from "@/lib/student-workspace/date";
import type {
  StudentWorkspaceResolvedScheduleEntry,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";
import { WeeklyScheduleDay } from "@/components/student-workspace/schedule/WeeklyScheduleDay";

export function WeeklyScheduleList({
  resolvedEntries,
  rotations,
  weekStart,
  busy,
  onEdit,
  onDelete,
}: {
  resolvedEntries: StudentWorkspaceResolvedScheduleEntry[];
  rotations: StudentWorkspaceRotation[];
  weekStart: string;
  busy?: boolean;
  onEdit: (entry: StudentWorkspaceResolvedScheduleEntry) => void;
  onDelete: (entry: StudentWorkspaceResolvedScheduleEntry) => Promise<void>;
}) {
  const weekDates = getDatesForWeek(weekStart);

  return (
    <div className="grid gap-4">
      {weekDates.map((dateKey) => (
        <WeeklyScheduleDay
          key={dateKey}
          dateKey={dateKey}
          rotations={rotations}
          entries={resolvedEntries.filter((entry) => entry.occurs_on === dateKey)}
          busy={busy}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
