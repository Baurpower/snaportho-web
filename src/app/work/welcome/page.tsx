"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Layers3,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42 },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

function Pill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-slate-300">
      <span className="text-sky-300">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export default function WorkspaceWelcomePage() {
  const redirectTo = "/work";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071120] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.08),transparent_18%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

      <section className="relative px-6 py-16 sm:px-8 sm:py-20">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl items-center"
        >
          <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div className="max-w-2xl">
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200"
              >
                <Layers3 className="h-4 w-4" />
                SnapOrtho Workspace
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl xl:text-6xl"
              >
                Residency scheduling, simplified.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg"
              >
                One clean place to view your schedule, rotations, and call
                without digging through scattered calendars, screenshots, or
                group messages.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="mt-7 flex flex-wrap gap-3"
              >
                <Pill
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Weekly schedule"
                />
                <Pill
                  icon={<Stethoscope className="h-4 w-4" />}
                  label="Rotations"
                />
                <Pill
                  icon={<Users className="h-4 w-4" />}
                  label="Coverage view"
                />
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="mt-9 flex flex-col gap-3 sm:flex-row"
              >
                <Link
                  href={{
                    pathname: "/auth/sign-in",
                    query: { redirectTo },
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href={{
                    pathname: "/auth/sign-up",
                    query: { redirectTo },
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                >
                  Create account
                </Link>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="mt-5 flex items-start gap-2.5 text-sm text-slate-400"
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <p>
                  Use your existing SnapOrtho account. No separate Workspace
                  login needed.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}