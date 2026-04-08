"use client";

import AddTimeOffForm from "@/components/workspace/time-off/addtimeoffform";

export default function TimeOffAddPage() {
  return (
    <main className="min-w-0">
      <section className="px-6 pb-14 pt-10 md:px-10 md:pb-16 md:pt-12">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur md:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200/80">
              Time-Off
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
              Add Time-Off
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
              Submit personal or conference time away, choose whether you are
              using PTO, and build the request with a clean date-range planner.
            </p>
          </div>

          <AddTimeOffForm />
        </div>
      </section>
    </main>
  );
}