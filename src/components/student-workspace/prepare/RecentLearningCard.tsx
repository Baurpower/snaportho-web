"use client";

import { ArrowRight } from "lucide-react";
import type { RecentLearningItem } from "@/components/student-workspace/prepare/types";

export function RecentLearningCard({ items }: { items: RecentLearningItem[] }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Recent Learning
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        The system should remember what you learned
      </h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {item.title}
              </p>
              {typeof item.confidence === "number" ? (
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  Confidence {item.confidence}%
                </div>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{item.detail}</p>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              <ArrowRight className="h-4 w-4" />
              {item.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
