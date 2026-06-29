"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CaseReadinessSession } from "@/lib/student-curriculum";

export function CaseReadinessHeader({
  session,
}: {
  session: CaseReadinessSession;
}) {
  const modeLabel =
    session.mode === "deep" ? "Deep Readiness" : "Fast Readiness";

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/student-workspace/prepare"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Prepare
          </Link>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {session.track.title}
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {session.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {session.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
            {modeLabel}
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
            {session.selectedMinutes} min selected
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
            {session.track.title}
          </div>
        </div>
      </div>
    </section>
  );
}
