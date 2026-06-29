import type { ReactNode } from "react";
import { FilePlus2, Pin, StickyNote } from "lucide-react";
import { StudentWorkspaceChrome } from "@/components/student-workspace/shell/StudentWorkspaceChrome";

export function StudentWorkspaceNotesPage() {
  return (
    <StudentWorkspaceChrome
      badge="Notes"
      title="Notes home"
      description="A future-ready place for pearls, reminders, case takeaways, and whatever you do not want to lose between rotations."
    >
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            <FilePlus2 className="h-3.5 w-3.5" />
            Quick note
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            Capture something fast
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Quick capture is coming next. This space is reserved for the kind of
            note you need to save before the moment disappears.
          </p>

          <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
            <p className="text-base font-semibold text-slate-900">
              Notes will live here
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Think resident pearls, attending preferences, case reminders, and
              the details you want ready before tomorrow starts.
            </p>
          </div>
        </section>

        <div className="grid gap-6">
          <NotesPanel
            icon={<Pin className="h-4 w-4" />}
            eyebrow="Pinned notes"
            title="Nothing pinned yet"
            description="Pin the notes you want available before rounds, call, clinic, or the OR."
          />
          <NotesPanel
            icon={<StickyNote className="h-4 w-4" />}
            eyebrow="Recent notes"
            title="Your recent note activity will appear here"
            description="This page is intentionally simple for V1, but it is already structured for future MyCases and personal-note expansion."
          />
        </div>
      </div>
    </StudentWorkspaceChrome>
  );
}

function NotesPanel({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
        {icon}
        {eyebrow}
      </div>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </section>
  );
}
