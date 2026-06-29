"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CalendarDays, Clock3, Flag } from "lucide-react";
import { formatDateOnly } from "@/lib/student-workspace/date";
import {
  getDaysRemaining,
  getFourthYearProgress,
} from "@/lib/student-workspace/progress";
import type {
  StudentWorkspaceProfile,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";

type RotationProgressSummaryProps = {
  profile: StudentWorkspaceProfile;
  rotations: StudentWorkspaceRotation[];
  today: string;
};

export function RotationProgressSummary({
  profile,
  rotations,
  today,
}: RotationProgressSummaryProps) {
  const progress = getFourthYearProgress(rotations, profile, today);
  const daysRemainingInRotation = getDaysRemaining(progress.currentRotation, today);

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Fourth-Year Progress
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {progress.status === "completed"
              ? "Fourth year completed"
              : progress.status === "not_started"
                ? "Fourth year not started yet"
                : progress.currentRotation?.title ?? "No active rotation today"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {progress.configured
              ? `${progress.percentComplete}% of your fourth year is complete.`
              : "Add fourth-year start and end dates in your profile to unlock the full year progress bar."}
          </p>
        </div>

        {progress.hasOverlapConflict ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Overlapping rotation dates detected
          </div>
        ) : null}
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-slate-900 transition-[width]"
          style={{ width: `${progress.percentComplete}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStat
          icon={<Flag className="h-4 w-4" />}
          label="Rotation"
          value={
            progress.currentRotationIndex !== null
              ? `${progress.currentRotationIndex + 1} of ${Math.max(
                  progress.rotationCount,
                  1
                )}`
              : progress.status === "completed" && progress.rotationCount > 0
                ? `${progress.rotationCount} of ${progress.rotationCount}`
              : progress.rotationCount > 0
                ? `0 of ${progress.rotationCount}`
                : "No rotations yet"
          }
        />
        <SummaryStat
          icon={<Clock3 className="h-4 w-4" />}
          label="Days left in block"
          value={
            daysRemainingInRotation !== null ? `${daysRemainingInRotation}` : "No active block"
          }
        />
        <SummaryStat
          icon={<CalendarDays className="h-4 w-4" />}
          label="Current rotation"
          value={progress.currentRotation?.title ?? "No active block"}
        />
        <SummaryStat
          icon={<CalendarDays className="h-4 w-4" />}
          label="Next rotation"
          value={progress.nextRotation?.title ?? "Nothing queued yet"}
          detail={
            progress.nextRotation
              ? `${formatDateOnly(progress.nextRotation.start_date)} to ${formatDateOnly(
                  progress.nextRotation.end_date
                )}`
              : undefined
          }
        />
      </div>
    </section>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-base font-semibold text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}
