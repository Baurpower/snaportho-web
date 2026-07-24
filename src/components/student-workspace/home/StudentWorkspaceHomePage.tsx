import type { ReactNode } from "react";
import { ArrowRight, CalendarCheck2, NotebookPen } from "lucide-react";
import { MobileHomePage } from "@/components/student-workspace/mobile/home/MobileHomePage";
import {
  DesktopOnly,
  MobileOnly,
} from "@/components/student-workspace/mobile/viewport";
import { StudentWorkspaceChrome } from "@/components/student-workspace/shell/StudentWorkspaceChrome";
import { StudentWorkspaceDailySuccessChecklist } from "@/components/student-workspace/home/StudentWorkspaceDailySuccessChecklist";
import { StudentWorkspaceProgressOverview } from "@/components/student-workspace/home/StudentWorkspaceProgressOverview";
import { StudentWorkspaceWeeklyCalendar } from "@/components/student-workspace/home/StudentWorkspaceWeeklyCalendar";
import { formatDateOnly } from "@/lib/student-workspace/date";
import type {
  FourthYearProgressState,
  StudentWorkspaceChecklistItem,
  StudentWorkspaceChecklistState,
  StudentWorkspaceProfile,
  StudentWorkspaceRotation,
  StudentWorkspaceScheduleEntry,
} from "@/lib/student-workspace/types";

type StudentWorkspaceHomePageProps = {
  profile: StudentWorkspaceProfile;
  rotations: StudentWorkspaceRotation[];
  progress: FourthYearProgressState;
  scheduleEntries: StudentWorkspaceScheduleEntry[];
  successChecklistItems: StudentWorkspaceChecklistItem[];
  successChecklistState: StudentWorkspaceChecklistState[];
  today: string;
  weekStart: string;
};

export function StudentWorkspaceHomePage(props: StudentWorkspaceHomePageProps) {
  return (
    <>
      <MobileOnly>
        <MobileHomePage {...props} />
      </MobileOnly>
      <DesktopOnly>
        <DesktopHomePage {...props} />
      </DesktopOnly>
    </>
  );
}

function DesktopHomePage({
  profile,
  rotations,
  progress,
  scheduleEntries,
  successChecklistItems,
  successChecklistState,
  today,
  weekStart,
}: StudentWorkspaceHomePageProps) {
  return (
    <StudentWorkspaceChrome
      badge="Daily dashboard"
      title={`Welcome back, ${profile.display_name ?? "future orthopod"}`}
      description="Know where you are in fourth year, what matters today, and what your week looks like before the day starts moving."
      actions={
        <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Today
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {formatDateOnly(today)}
          </p>
        </div>
      }
    >
      <div className="grid gap-6">
        <StudentWorkspaceProgressOverview
          progress={progress}
          rotations={rotations}
          today={today}
        />

        <StudentWorkspaceWeeklyCalendar
          initialEntries={scheduleEntries}
          today={today}
          initialWeekStart={weekStart}
        />

        <StudentWorkspaceDailySuccessChecklist
          items={successChecklistItems}
          initialState={successChecklistState}
          today={today}
        />

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 px-5 py-5 text-white sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              <NotebookPen className="h-3.5 w-3.5" />
              From the SnapOrtho Team
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-[1.9rem]">
              Keep showing up.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              The students residents remember are not the ones who knew everything on day one. They are the ones who prepared, stayed humble, improved each week, and were genuinely great to work with.
            </p>
          </div>

          <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-3">
              <TeamPrinciple
                title="Stay prepared"
                description="Use trusted resources, review the cases in front of you, and walk in with a plan instead of hoping to figure it out in real time."
                icon={<ArrowRight className="h-4 w-4" />}
              />
              <TeamPrinciple
                title="Stay coachable"
                description="Ask thoughtful questions, own your mistakes, and let every rotation make you sharper than the one before it."
                icon={<CalendarCheck2 className="h-4 w-4" />}
              />
              <TeamPrinciple
                title="Stay yourself"
                description="Do not lose yourself trying to impress everyone. Take care of yourself, lean on mentors, and remember that consistency matters more than one perfect day."
                icon={<NotebookPen className="h-4 w-4" />}
              />
            </div>

            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                The Long Game
              </p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  Orthopaedic surgery is one of the most rewarding specialties, and one of the most competitive. No one gets there alone.
                </p>
                <p>
                  Some rotations will go exactly how you hoped. Some will not. What matters is that you keep improving, come back stronger the next day, and stay around people who want to teach.
                </p>
                <p className="font-medium text-slate-900">
                  Good luck. We’re rooting for you.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </StudentWorkspaceChrome>
  );
}

function TeamPrinciple({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
      <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {icon}
        Principle
      </div>
      <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-950">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
