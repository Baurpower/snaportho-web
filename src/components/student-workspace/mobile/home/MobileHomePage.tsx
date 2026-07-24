"use client";

import { useState } from "react";
import { ChevronDown, NotebookPen } from "lucide-react";
import { StudentWorkspaceMobileChrome } from "@/components/student-workspace/mobile/StudentWorkspaceMobileChrome";
import { MobileDailyChecklist } from "@/components/student-workspace/mobile/home/MobileDailyChecklist";
import { MobileProgressOverview } from "@/components/student-workspace/mobile/home/MobileProgressOverview";
import { MobileWeeklyCalendar } from "@/components/student-workspace/mobile/home/MobileWeeklyCalendar";
import { formatDateOnly } from "@/lib/student-workspace/date";
import type {
  FourthYearProgressState,
  StudentWorkspaceChecklistItem,
  StudentWorkspaceChecklistState,
  StudentWorkspaceProfile,
  StudentWorkspaceRotation,
  StudentWorkspaceScheduleEntry,
} from "@/lib/student-workspace/types";

const TEAM_PRINCIPLES = [
  {
    title: "Stay prepared",
    description:
      "Use trusted resources, review the cases in front of you, and walk in with a plan instead of hoping to figure it out in real time.",
  },
  {
    title: "Stay coachable",
    description:
      "Ask thoughtful questions, own your mistakes, and let every rotation make you sharper than the one before it.",
  },
  {
    title: "Stay yourself",
    description:
      "Do not lose yourself trying to impress everyone. Take care of yourself, lean on mentors, and remember that consistency matters more than one perfect day.",
  },
];

export function MobileHomePage({
  profile,
  rotations,
  progress,
  scheduleEntries,
  successChecklistItems,
  successChecklistState,
  today,
  weekStart,
}: {
  profile: StudentWorkspaceProfile;
  rotations: StudentWorkspaceRotation[];
  progress: FourthYearProgressState;
  scheduleEntries: StudentWorkspaceScheduleEntry[];
  successChecklistItems: StudentWorkspaceChecklistItem[];
  successChecklistState: StudentWorkspaceChecklistState[];
  today: string;
  weekStart: string;
}) {
  const firstName = (profile.display_name ?? "future orthopod").split(" ")[0];

  return (
    <StudentWorkspaceMobileChrome
      badge="Today"
      title={`Hi, ${firstName}`}
      actions={
        <div className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-right">
          <p className="text-[13px] font-semibold leading-none text-slate-950">
            {formatDateOnly(today)}
          </p>
        </div>
      }
    >
      <div className="grid gap-4">
        <MobileProgressOverview
          progress={progress}
          rotations={rotations}
          today={today}
        />

        <MobileWeeklyCalendar
          initialEntries={scheduleEntries}
          today={today}
          initialWeekStart={weekStart}
        />

        <MobileDailyChecklist
          items={successChecklistItems}
          initialState={successChecklistState}
          today={today}
        />

        <TeamMessage />
      </div>
    </StudentWorkspaceMobileChrome>
  );
}

/**
 * The desktop home ends with a long letter from the SnapOrtho team. It is worth
 * keeping, but on a phone it is several screens of scrolling past the parts a
 * student opens the app for, so it collapses by default.
 */
function TeamMessage() {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 px-4 py-4 text-white">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">
          <NotebookPen className="h-3 w-3" />
          From the SnapOrtho team
        </div>
        <h2 className="mt-2.5 text-xl font-black leading-tight tracking-tight">
          Keep showing up.
        </h2>
        <p className="mt-1.5 text-[13px] leading-6 text-slate-300">
          The students residents remember are not the ones who knew everything on
          day one. They are the ones who prepared, stayed humble, improved each
          week, and were genuinely great to work with.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-2 px-4 text-[14px] font-semibold text-slate-900"
      >
        {open ? "Hide the rest" : "Read the rest"}
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="space-y-2.5 border-t border-slate-200 px-4 py-4">
          {TEAM_PRINCIPLES.map((principle) => (
            <div
              key={principle.title}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
            >
              <h3 className="text-[15px] font-bold tracking-tight text-slate-950">
                {principle.title}
              </h3>
              <p className="mt-1 text-[13px] leading-6 text-slate-600">
                {principle.description}
              </p>
            </div>
          ))}

          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              The long game
            </p>
            <div className="mt-2 space-y-2 text-[13px] leading-6 text-slate-600">
              <p>
                Orthopaedic surgery is one of the most rewarding specialties, and
                one of the most competitive. No one gets there alone.
              </p>
              <p>
                Some rotations will go exactly how you hoped. Some will not. What
                matters is that you keep improving, come back stronger the next
                day, and stay around people who want to teach.
              </p>
              <p className="font-medium text-slate-900">
                Good luck. We&apos;re rooting for you.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
