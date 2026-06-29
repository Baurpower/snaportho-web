import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CalendarCheck2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  MessageSquareQuote,
  NotebookPen,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    title: "Learn from residents",
    description:
      "Centralized advice from residents who have already completed the rotation.",
    icon: MessageSquareQuote,
  },
  {
    title: "Follow curated playbooks",
    description:
      "Know exactly what to prepare before day one and throughout every week.",
    icon: BookOpenCheck,
  },
  {
    title: "Perform like a sub-I",
    description:
      "Keep everything needed to excel in one place, right when you need it.",
    icon: GraduationCap,
  },
];

const HERO_BULLETS = [
  "Stand out to residents",
  "Earn stronger evaluations",
  "Crush every rotation",
  "Never show up unprepared",
];

const PREVIEW_ITEMS = [
  { label: "Resident advice", icon: MessageSquareQuote },
  { label: "Attending pearls", icon: ShieldCheck },
  { label: "Cases to review", icon: NotebookPen },
  { label: "Daily checklist", icon: ClipboardCheck },
  { label: "Weekly goals", icon: CalendarCheck2 },
  { label: "Notes", icon: FileText },
  { label: "Tasks", icon: BadgeCheck },
];

export function StudentWorkspaceLandingPage() {
  const redirectTo = encodeURIComponent("/student-workspace");

  return (
    <div className="grid gap-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 px-6 py-12 text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:px-8 sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(180deg,rgba(15,23,42,0),rgba(15,23,42,0.24))]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200">
              <Sparkles className="h-3.5 w-3.5" />
              Class of 2027 Early Access
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Crush every fourth-year rotation.
            </h1>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4">
              {HERO_BULLETS.map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-3 text-sm font-medium text-slate-100 sm:text-base"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-8 max-w-xl text-sm text-slate-300 sm:text-base">
              One workspace built specifically for fourth-year medical students.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/auth/sign-up?redirectTo=${redirectTo}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Get Early Access
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/auth/sign-in?redirectTo=${redirectTo}`}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">
                    Rotation Success System
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-white">
                    Away Rotation
                  </h2>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                  Ready for rounds
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                {PREVIEW_ITEMS.map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3"
                  >
                    <div className="flex items-center gap-3 text-sm text-slate-100">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-sky-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span>{label}</span>
                    </div>
                    <BadgeCheck className="h-4 w-4 text-emerald-300" />
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Goal
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    Be the student they remember.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Focus
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    Cases before clinic.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Today
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    Show up prepared.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 pt-2 md:grid-cols-3">
        {FEATURES.map(({ title, description, icon: Icon }) => (
          <div
            key={title}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
