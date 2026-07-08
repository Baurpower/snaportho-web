import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleDot,
  Clock3,
  Flag,
  Footprints,
  Gauge,
  Mountain,
  Moon,
  Target,
  Sparkles,
} from "lucide-react";
import {
  compareDateOnly,
  formatDateOnly,
  getInclusiveDaySpan,
} from "@/lib/student-workspace/date";
import type {
  FourthYearProgressState,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";

export function StudentWorkspaceProgressOverview({
  progress,
  rotations,
  today,
}: {
  progress: FourthYearProgressState;
  rotations: StudentWorkspaceRotation[];
  today: string;
}) {
  const hasRotations = rotations.length > 0;
  const currentRotationLabel =
    progress.status === "completed"
      ? "Fourth year complete"
      : progress.status === "not_started"
        ? "Fourth year starts soon"
        : progress.currentRotation?.title ?? "No active rotation today";
  const rotationProgressLabel =
    progress.currentRotationIndex !== null
      ? `Rotation ${progress.currentRotationIndex + 1} of ${Math.max(
          progress.rotationCount,
          1
        )}`
      : progress.rotationCount > 0
        ? `0 of ${progress.rotationCount} rotations active`
        : "Add your first rotation";
  const currentRotationTotalDays = progress.currentRotation
    ? getInclusiveDaySpan(
        progress.currentRotation.start_date,
        progress.currentRotation.end_date
      )
    : null;
  const currentRotationDay =
    progress.currentRotation &&
    progress.status === "in_progress" &&
    compareDateOnly(today, progress.currentRotation.start_date) >= 0
      ? Math.max(1, getInclusiveDaySpan(progress.currentRotation.start_date, today))
      : null;
  const currentRotationProgressPercent =
    currentRotationDay && currentRotationTotalDays
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((currentRotationDay / currentRotationTotalDays) * 100)
          )
        )
      : null;
  const nextMilestoneLabel =
    progress.nextRotation?.title ??
    progress.nextBreakRotation?.title ??
    "Keep building your rotation map";
  const nextMilestoneDetail =
    progress.nextRotation && progress.daysUntilNextRotation !== null
      ? `Starts in ${progress.daysUntilNextRotation} day${progress.daysUntilNextRotation === 1 ? "" : "s"}`
      : progress.nextBreakRotation && progress.daysUntilNextBreak !== null
        ? `Break in ${progress.daysUntilNextBreak} day${progress.daysUntilNextBreak === 1 ? "" : "s"}`
        : hasRotations
          ? "Add the next milestone when your schedule updates."
          : "Add rotations in Profile to unlock this.";
  const yearPercentLabel = `${progress.percentComplete}% complete`;
  const seasonLabel =
    progress.currentRotationIndex !== null
      ? `${progress.currentRotationIndex + 1} / ${Math.max(progress.rotationCount, 1)}`
      : progress.rotationCount > 0
        ? `0 / ${progress.rotationCount}`
        : "—";
  const compactMetrics: Array<{
    label: string;
    value: string;
    icon: typeof Clock3;
  }> = [
    {
      label: "Days left in fourth year",
      value: progress.remainingDays !== null ? `${progress.remainingDays}` : "—",
      icon: Clock3,
    },
    {
      label: "Ortho days left",
      value: progress.orthoDaysRemaining !== null ? `${progress.orthoDaysRemaining}` : "—",
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
        progress.daysUntilNextBreak !== null ? `${progress.daysUntilNextBreak}d` : "—",
      icon: Moon,
    },
    {
      label: "Rotation season",
      value: rotationProgressLabel.replace("Rotation ", ""),
      icon: Flag,
    },
  ];

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.2),transparent_26%),linear-gradient(135deg,#020617_0%,#0f172a_62%,#172554_100%)] px-4 py-4 text-white sm:px-5 sm:py-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.9fr)] lg:items-start">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              <Sparkles className="h-3.5 w-3.5" />
              Fourth-Year Progress
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-[1.75rem]">
              {currentRotationLabel}
            </h2>
            <p className="mt-1 text-sm font-medium text-sky-100">
              {yearPercentLabel}
            </p>

            <Link
              href="#daily-success-checklist"
              className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Review today&apos;s plan
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="mt-3 h-2.5 max-w-3xl overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 transition-[width]"
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <JourneyPanel
                label="Current block"
                value={progress.currentRotation?.title ?? "No active block"}
                detail={
                  progress.currentRotation
                    ? `${formatDateOnly(progress.currentRotation.start_date)} to ${formatDateOnly(
                        progress.currentRotation.end_date
                      )}`
                    : "Add rotations in Profile to unlock this."
                }
                icon={<CircleDot className="h-4 w-4" />}
              />
              <JourneyPanel
                label="Rotation season"
                value={seasonLabel}
                detail={
                  progress.rotationCount > 0
                    ? `${progress.rotationCount} total rotation${progress.rotationCount === 1 ? "" : "s"} tracked`
                    : "Start by adding your first rotation."
                }
                icon={<Footprints className="h-4 w-4" />}
              />
              <JourneyPanel
                label="Next milestone"
                value={nextMilestoneLabel}
                detail={nextMilestoneDetail}
                icon={<Target className="h-4 w-4" />}
              />
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-3.5 backdrop-blur lg:mt-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100/80">
                Today
              </p>
              <div className="mt-1.5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-black tracking-tight text-white">
                    {progress.currentRotation
                      ? currentRotationDay ?? "—"
                      : progress.status === "completed"
                        ? "Done"
                        : "Prep"}
                  </p>
                  <p className="text-sm text-slate-300">
                    {progress.currentRotation && currentRotationTotalDays
                      ? `Day ${currentRotationDay ?? "—"} / ${currentRotationTotalDays}`
                      : progress.status === "not_started"
                        ? "Fourth year starts soon"
                        : progress.status === "completed"
                          ? "Fourth year finished"
                          : "Use this week to get ahead"}
                  </p>
                </div>
                <Gauge className="h-5 w-5 text-sky-200" />
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-300 to-emerald-300 transition-[width]"
                style={{ width: `${currentRotationProgressPercent ?? progress.percentComplete}%` }}
              />
            </div>

            <div className="grid gap-2">
              {compactMetrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label}
                    className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
                  >
                    <div className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-200">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-sky-200" />
                      <span className="truncate">{metric.label}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{metric.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function JourneyPanel({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur">
      <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100/80">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-sm font-semibold text-white">{value}</p>
      {detail ? <p className="mt-1 text-sm text-slate-300">{detail}</p> : null}
    </div>
  );
}
