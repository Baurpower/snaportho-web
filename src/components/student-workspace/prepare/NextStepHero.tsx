"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buildCaseReadinessHref } from "@/components/student-workspace/prepare/prepare-routes";
import type { StudyMode } from "@/lib/student-curriculum";

type TopicRef = {
  id: string;
  title: string;
  trackTitle: string;
};

function HeroTopicCard({
  topic,
  label,
  sublabel,
  mode,
  selectedMinutes,
}: {
  topic: TopicRef;
  label: string;
  sublabel: string;
  mode: StudyMode;
  selectedMinutes: number;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-950">
            {topic.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {topic.trackTitle} · {sublabel}
          </p>
        </div>
        <Link
          href={buildCaseReadinessHref({
            topicId: topic.id,
            mode,
            time: selectedMinutes,
          })}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Study now
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function NextStepHero({
  lastStudiedTopic,
  suggestedTopic,
  rotationTitle,
  mode,
  selectedMinutes,
}: {
  lastStudiedTopic: TopicRef | null;
  suggestedTopic: TopicRef | null;
  rotationTitle: string | null;
  mode: StudyMode;
  selectedMinutes: number;
}) {
  const topic = lastStudiedTopic ?? suggestedTopic;

  if (!topic) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Start here
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Know where you fit in orthopaedics
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Pick a subspecialty below, or search for any diagnosis, procedure, or common case to launch a structured study session.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <HeroTopicCard
        topic={topic}
        label={lastStudiedTopic ? "Continue where you left off" : `Start your ${rotationTitle ?? "rotation"}`}
        sublabel={lastStudiedTopic ? "Last studied" : "Suggested starting point"}
        mode={mode}
        selectedMinutes={selectedMinutes}
      />
    </section>
  );
}
