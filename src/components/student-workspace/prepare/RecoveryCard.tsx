"use client";

import { LifeBuoy } from "lucide-react";
import { BroBotLaunchButton } from "@/components/student-workspace/prepare/BroBotLaunchButton";

export function RecoveryCard({
  service,
  tomorrowLabel,
}: {
  service: string;
  tomorrowLabel: string;
}) {
  return (
    <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5 shadow-sm sm:p-6">
      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
        <LifeBuoy className="h-3.5 w-3.5" />
        Recovery Moment
      </div>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
        I got pimped.
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        The highest-value return moment is right after a miss. One tap should help the student explain it, quiz it, save it, and see it again tomorrow.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <BroBotLaunchButton
          label="Recover this topic"
          prompt={`I got pimped on ${service}${tomorrowLabel ? ` around ${tomorrowLabel}` : ""}. Explain it simply, then quiz me, then summarize what I should remember tomorrow.`}
          mode="general"
          depth="quick"
        />
      </div>
    </section>
  );
}
