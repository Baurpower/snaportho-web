"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  PencilLine,
  Route,
  Sparkles,
} from "lucide-react";
import type {
  FourthYearProgressState,
  StudentWorkspaceChecklistItem,
  StudentWorkspaceChecklistState,
  StudentWorkspaceChecklistTemplate,
  StudentWorkspaceProfile,
  StudentWorkspaceRotation,
  StudentWorkspaceScheduleEntry,
  StudentWorkspaceTask,
} from "@/lib/student-workspace/types";
import { StudentWorkspaceDailyGrid } from "@/components/student-workspace/StudentWorkspaceDailyGrid";
import { RotationList } from "@/components/student-workspace/rotations/RotationList";
import { StudentWorkspaceProfileSettingsPanel } from "@/components/student-workspace/StudentWorkspaceProfileSettingsPanel";

export function StudentWorkspaceDashboard({
  profile,
  rotations,
  progress,
  scheduleEntries,
  checklistTemplates,
  checklistItems,
  checklistState,
  tasks,
  today,
  weekStart,
}: {
  profile: StudentWorkspaceProfile;
  rotations: StudentWorkspaceRotation[];
  progress: FourthYearProgressState;
  scheduleEntries: StudentWorkspaceScheduleEntry[];
  checklistTemplates: StudentWorkspaceChecklistTemplate[];
  checklistItems: StudentWorkspaceChecklistItem[];
  checklistState: StudentWorkspaceChecklistState[];
  tasks: StudentWorkspaceTask[];
  today: string;
  weekStart: string;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showRotations, setShowRotations] = useState(false);
  const scheduleCount = scheduleEntries.length;
  const completedChecklistCount = useMemo(
    () => checklistState.filter((entry) => entry.is_completed).length,
    [checklistState]
  );
  const openTaskCount = useMemo(
    () => tasks.filter((task) => task.status === "open").length,
    [tasks]
  );

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 px-6 py-7 text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:px-8 sm:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(255,255,255,0.08),transparent_20%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              <Sparkles className="h-3.5 w-3.5" />
              Student Workspace
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Welcome back, {profile.display_name ?? "future orthopod"}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {progress.currentRotation
                ? `${progress.currentRotation.title} is the block in front of you right now.`
                : "Your fourth-year dashboard is set up and ready for the week ahead."}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowSettings((current) => !current)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                <PencilLine className="h-4 w-4" />
                {showSettings ? "Hide settings" : "Edit profile"}
              </button>
              <button
                type="button"
                onClick={() => setShowRotations((current) => !current)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Route className="h-4 w-4" />
                {showRotations ? "Hide rotations" : "Manage rotations"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <HeroMetric
              label="Current rotation"
              value={progress.currentRotation?.title ?? "No active block"}
            />
            <HeroMetric
              label="Days remaining"
              value={
                progress.remainingDays !== null
                  ? `${progress.remainingDays}`
                  : "—"
              }
            />
            <HeroMetric
              label="Year progress"
              value={`${progress.percentComplete}%`}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <FocusCard
          title="Today’s focus"
          value={progress.currentRotation?.title ?? "Stay organized"}
          description="Keep the current block, if any, front and center."
        />
        <FocusCard
          title="Weekly schedule"
          value={`${scheduleCount} item${scheduleCount === 1 ? "" : "s"}`}
          description="Your recurring structure and one-off dates are ready."
        />
        <FocusCard
          title="Checklist"
          value={`${completedChecklistCount} done`}
          description="Daily follow-through stays visible at a glance."
        />
        <FocusCard
          title="Tasks"
          value={`${openTaskCount} open`}
          description="Loose ends stay close so they actually get finished."
        />
      </section>

      {showSettings ? (
        <StudentWorkspaceProfileSettingsPanel profile={profile} />
      ) : null}

      <StudentWorkspaceDailyGrid
        profile={profile}
        rotations={rotations}
        scheduleEntries={scheduleEntries}
        checklistTemplates={checklistTemplates}
        checklistItems={checklistItems}
        checklistState={checklistState}
        tasks={tasks}
        today={today}
        weekStart={weekStart}
        currentRotationId={progress.currentRotation?.id ?? null}
      />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Rotations
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Keep the season visible without letting it take over the page.
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowRotations((current) => !current)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {showRotations ? "Hide rotation manager" : "Open rotation manager"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <CompactStat
            label="Tracked rotations"
            value={`${rotations.length}`}
            icon={<Route className="h-4 w-4" />}
          />
          <CompactStat
            label="Current block"
            value={progress.currentRotation?.title ?? "Nothing active"}
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <CompactStat
            label="Next up"
            value={progress.nextRotation?.title ?? "Nothing queued yet"}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </div>
      </section>

      {showRotations ? (
        <RotationList profile={profile} initialRotations={rotations} today={today} />
      ) : null}
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function FocusCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <p className="mt-3 text-xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function CompactStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}
