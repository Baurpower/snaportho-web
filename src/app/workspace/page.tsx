import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  NotebookPen,
  Stethoscope,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Workspace",
  description:
    "Choose the SnapOrtho workspace that fits you: residency scheduling or the student rotation workspace.",
};

const WORKSPACES = [
  {
    href: "/work",
    eyebrow: "For residents and programs",
    title: "Residency workspace",
    description:
      "The program workspace for weekly schedules, call, rotations, and coverage.",
    icon: Stethoscope,
    points: [
      { icon: CalendarDays, label: "Weekly schedule and call" },
      { icon: Users, label: "Rotations and coverage" },
    ],
    cta: "Open residency workspace",
  },
  {
    href: "/student-workspace",
    eyebrow: "For fourth-year students",
    title: "Student workspace",
    description:
      "A personal workspace for rotation prep, daily checklists, and notes.",
    icon: GraduationCap,
    points: [
      { icon: ClipboardCheck, label: "Rotation prep and checklists" },
      { icon: NotebookPen, label: "Cases and notes" },
    ],
    cta: "Open student workspace",
  },
] as const;

function Point({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-slate-300">
      <Icon className="h-4 w-4 shrink-0 text-sky-300" />
      <span>{label}</span>
    </li>
  );
}

export default function WorkspaceChooserPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071120] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.08),transparent_18%)]" />

      <section className="relative mx-auto max-w-5xl px-6 pb-20 pt-28 sm:px-8 sm:pt-32">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
          SnapOrtho Workspace
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
          Choose your workspace
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          Residency programs and fourth-year students each have their own space.
          Pick the one that matches where you are.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {WORKSPACES.map((workspace) => {
            const Icon = workspace.icon;

            return (
              <Link
                key={workspace.href}
                href={workspace.href}
                className="group flex h-full flex-col rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.28)] transition hover:border-sky-300/40 hover:bg-white/[0.07] sm:p-8"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sky-200">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                  {workspace.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                  {workspace.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {workspace.description}
                </p>
                <ul className="mt-6 grid gap-2.5">
                  {workspace.points.map((point) => (
                    <Point key={point.label} icon={point.icon} label={point.label} />
                  ))}
                </ul>
                <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  {workspace.cta}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
