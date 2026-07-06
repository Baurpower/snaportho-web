"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { buildCaseReadinessHref } from "@/components/student-workspace/prepare/prepare-routes";
import type { TodaysPrepCard } from "@/lib/student-curriculum/prep-recommendations";
import type { StudyMode } from "@/lib/student-curriculum";

const KIND_LABELS: Record<TodaysPrepCard["kind"], string> = {
  continue: "Resume",
  cases: "Cases",
  anatomy: "Anatomy",
  procedures: "Procedures",
  oite: "OITE",
  complications: "Complications",
  checklist: "Checklist",
  quick_review: "Quick review",
};

export function TodaysPreparationPanel({
  cards,
  rotationLabel,
  tomorrowLabel,
  studyMode,
  selectedMinutes,
}: {
  cards: TodaysPrepCard[];
  rotationLabel: string;
  tomorrowLabel: string;
  studyMode: StudyMode;
  selectedMinutes: number;
}) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[2rem] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
            Today&apos;s Preparation
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            What should I study for tomorrow?
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Personalized recommendations for {rotationLabel}. Tomorrow: {tomorrowLabel}.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-900">
          <CalendarClock className="h-4 w-4" />
          {selectedMinutes} min {studyMode === "deep" ? "deep study" : "fast prep"}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const href =
            card.href ??
            (card.topicId
              ? buildCaseReadinessHref({
                  topicId: card.topicId,
                  mode: card.kind === "quick_review" ? "fast" : studyMode,
                  time:
                    card.kind === "quick_review" ? 5 : selectedMinutes,
                })
              : null);

          const content = (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {KIND_LABELS[card.kind]}
              </p>
              <h3 className="mt-2 text-base font-black tracking-tight text-slate-950">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {card.description}
              </p>
              {card.meta ? (
                <p className="mt-3 text-xs font-semibold text-sky-700">
                  {card.meta}
                </p>
              ) : null}
              {href ? (
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                  Open session
                  <ArrowRight className="h-4 w-4" />
                </span>
              ) : null}
            </>
          );

          if (href) {
            return (
              <Link
                key={card.id}
                href={href}
                className="rounded-[1.25rem] border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:bg-sky-50"
              >
                {content}
              </Link>
            );
          }

          return (
            <div
              key={card.id}
              className="rounded-[1.25rem] border border-slate-200 bg-white p-4"
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}