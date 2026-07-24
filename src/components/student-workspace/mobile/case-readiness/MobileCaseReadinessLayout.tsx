"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { MOBILE_STICKY_OFFSET } from "@/components/student-workspace/mobile/StudentWorkspaceMobileChrome";
import { buildCaseReadinessHref } from "@/components/student-workspace/prepare/prepare-routes";
import type { CaseReadinessSession } from "@/lib/student-curriculum";

/**
 * Phone header for a case readiness session: back link, title, and the session
 * metadata as a single scrollable chip row instead of the desktop block of
 * wrapping pills.
 */
export function MobileCaseReadinessHeader({
  session,
}: {
  session: CaseReadinessSession;
}) {
  const modeLabel =
    session.mode === "deep" ? "Deep readiness" : "Fast readiness";

  return (
    // min-w-0: keeps the nowrap metadata chip scroller from stretching this grid item
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Link
        href="/student-workspace/prepare"
        className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Prepare
      </Link>

      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {session.track.title}
      </p>
      <h2 className="mt-1 text-xl font-black leading-tight tracking-tight text-slate-950">
        {session.title}
      </h2>
      <p className="mt-1.5 text-[13px] leading-6 text-slate-600">
        {session.subtitle}
      </p>

      <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-1.5">
          {[modeLabel, `${session.selectedMinutes} min`, session.track.title].map(
            (chip) => (
              <span
                key={chip}
                className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-700"
              >
                {chip}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Compact progress strip that sticks under the mobile app header while the
 * student scrolls the checklist, so completion stays visible without scrolling
 * back to a sidebar that does not exist on a phone.
 */
export function MobileReadinessProgressBar({
  completedCount,
  totalCount,
  isSaving,
}: {
  completedCount: number;
  totalCount: number;
  isSaving: boolean;
}) {
  const percent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div
      className="sticky z-20 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur"
      style={{ top: MOBILE_STICKY_OFFSET }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-slate-900">
          {completedCount} of {totalCount} reviewed
        </p>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {percent}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function MobileReadinessConfidence({
  confidence,
  onChange,
}: {
  confidence: "comfortable" | "maybe" | "not-ready" | null;
  onChange: (next: "comfortable" | "maybe" | "not-ready") => void;
}) {
  const options: Array<{
    id: "comfortable" | "maybe" | "not-ready";
    label: string;
    tone: string;
  }> = [
    {
      id: "comfortable",
      label: "Ready",
      tone: "border-emerald-300 bg-emerald-50 text-emerald-900",
    },
    { id: "maybe", label: "Maybe", tone: "border-amber-300 bg-amber-50 text-amber-900" },
    {
      id: "not-ready",
      label: "Not yet",
      tone: "border-rose-300 bg-rose-50 text-rose-900",
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Confidence check
      </p>
      <h3 className="mt-0.5 text-[15px] font-bold tracking-tight text-slate-950">
        Could you present this case tomorrow?
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {options.map((option) => {
          const active = confidence === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={active}
              className={`min-h-11 rounded-xl border text-[14px] font-semibold transition ${
                active
                  ? option.tone
                  : "border-slate-200 bg-white text-slate-600 active:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function MobileSessionAside({
  session,
  children,
}: {
  session: CaseReadinessSession;
  children?: ReactNode;
}) {
  const nextTopic = session.nextRecommendedTopic?.topic;
  const nextTopicReason = session.nextRecommendedTopic?.reasons[0]?.label;

  return (
    <>
      {children}

      {session.topic.commonCases.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Common cases
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {session.topic.commonCases.slice(0, 4).map((curriculumCase) => (
              <span
                key={curriculumCase.id}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-700"
              >
                {curriculumCase.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {session.relatedTopics.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Related topics
          </p>
          <div className="mt-2 space-y-1.5">
            {session.relatedTopics.map((topic) => (
              <Link
                key={topic.id}
                href={buildCaseReadinessHref({
                  topicId: topic.id,
                  mode: session.mode,
                  time: session.selectedMinutes,
                })}
                className="flex min-h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-[14px] font-semibold text-slate-900 active:bg-sky-50"
              >
                {topic.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Next step
        </p>
        {nextTopic ? (
          <div className="mt-2">
            <p className="text-[14px] font-semibold text-slate-950">
              Continue with {nextTopic.title}
            </p>
            {nextTopicReason ? (
              <p className="mt-0.5 text-[12px] leading-5 text-slate-500">
                {nextTopicReason}
              </p>
            ) : null}
            <Link
              href={buildCaseReadinessHref({
                topicId: nextTopic.id,
                mode: session.mode,
                time: session.selectedMinutes,
              })}
              className="mt-2.5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-[15px] font-semibold text-white transition active:bg-slate-800"
            >
              Continue
            </Link>
          </div>
        ) : null}
        <Link
          href="/student-workspace/prepare"
          className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[15px] font-semibold text-slate-900 transition active:bg-slate-100"
        >
          Return to curriculum
        </Link>
      </section>
    </>
  );
}
