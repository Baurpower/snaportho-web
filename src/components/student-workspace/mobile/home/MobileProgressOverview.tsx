import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Flag,
  Moon,
  Mountain,
} from "lucide-react";
import Link from "next/link";
import {
  compareDateOnly,
  formatDateOnly,
  getInclusiveDaySpan,
} from "@/lib/student-workspace/date";
import type {
  FourthYearProgressState,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";

/**
 * Phone version of the fourth-year progress hero.
 *
 * The desktop card puts three "journey panels" and five metric rows side by
 * side. On a phone that stacks into roughly a full screen of chrome before the
 * student sees anything actionable, so this keeps only the answer to "where am
 * I today" above the fold and pushes the rest into one swipeable metric row.
 */
export function MobileProgressOverview({
  progress,
  rotations,
  today,
}: {
  progress: FourthYearProgressState;
  rotations: StudentWorkspaceRotation[];
  today: string;
}) {
  const hasRotations = rotations.length > 0;
  const headline =
    progress.status === "completed"
      ? "Fourth year complete"
      : progress.status === "not_started"
        ? "Fourth year starts soon"
        : (progress.currentRotation?.title ?? "No active rotation today");

  const totalDays = progress.currentRotation
    ? getInclusiveDaySpan(
        progress.currentRotation.start_date,
        progress.currentRotation.end_date
      )
    : null;
  const currentDay =
    progress.currentRotation &&
    progress.status === "in_progress" &&
    compareDateOnly(today, progress.currentRotation.start_date) >= 0
      ? Math.max(
          1,
          getInclusiveDaySpan(progress.currentRotation.start_date, today)
        )
      : null;

  const metrics: Array<{ label: string; value: string; icon: typeof Clock3 }> = [
    {
      label: "Days left",
      value: progress.remainingDays !== null ? `${progress.remainingDays}` : "—",
      icon: Clock3,
    },
    {
      label: "Ortho days",
      value:
        progress.orthoDaysRemaining !== null
          ? `${progress.orthoDaysRemaining}`
          : "—",
      icon: Mountain,
    },
    {
      label: "Next rotation",
      value:
        progress.daysUntilNextRotation !== null
          ? `${progress.daysUntilNextRotation}d`
          : "—",
      icon: CalendarDays,
    },
    {
      label: "Next break",
      value:
        progress.daysUntilNextBreak !== null
          ? `${progress.daysUntilNextBreak}d`
          : "—",
      icon: Moon,
    },
    {
      label: "Season",
      value:
        progress.currentRotationIndex !== null
          ? `${progress.currentRotationIndex + 1}/${Math.max(progress.rotationCount, 1)}`
          : progress.rotationCount > 0
            ? `0/${progress.rotationCount}`
            : "—",
      icon: Flag,
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#020617_0%,#0f172a_62%,#172554_100%)] text-white shadow-sm">
      <div className="px-4 pb-4 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
          Fourth-year progress
        </p>
        <h2 className="mt-1.5 text-xl font-black leading-tight tracking-tight">
          {headline}
        </h2>

        <div className="mt-1 flex items-baseline gap-2 text-[13px] text-sky-100">
          <span className="font-semibold">{progress.percentComplete}% complete</span>
          {progress.currentRotation && totalDays ? (
            <span className="text-slate-400">
              · Day {currentDay ?? "—"} of {totalDays}
            </span>
          ) : null}
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300"
            style={{ width: `${progress.percentComplete}%` }}
          />
        </div>

        {progress.currentRotation ? (
          <p className="mt-2.5 text-[12px] text-slate-400">
            {formatDateOnly(progress.currentRotation.start_date)} –{" "}
            {formatDateOnly(progress.currentRotation.end_date)}
          </p>
        ) : (
          <p className="mt-2.5 text-[12px] text-slate-400">
            {hasRotations
              ? "No rotation covers today."
              : "Add rotations in Profile to unlock your timeline."}
          </p>
        )}

        <Link
          href="#mobile-daily-success-checklist"
          className="mt-3.5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-[15px] font-semibold text-slate-950 transition active:bg-slate-200"
        >
          Review today&apos;s plan
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="min-w-[6.25rem] shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{metric.label}</span>
                </div>
                <p className="mt-1 text-lg font-black leading-none tracking-tight">
                  {metric.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
