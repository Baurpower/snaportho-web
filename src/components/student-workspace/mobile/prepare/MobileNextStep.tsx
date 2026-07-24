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

/**
 * Phone version of the "next step" hero. Desktop floats the Study now button
 * beside the topic title; on a phone that button wraps into an awkward orphan,
 * so it becomes a full-width action under the topic.
 */
export function MobileNextStep({
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
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Start here
        </p>
        <h2 className="mt-1 text-xl font-black leading-tight tracking-tight text-slate-950">
          Know where you fit in orthopaedics
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-slate-600">
          Pick a subspecialty below, or search for any diagnosis, procedure, or
          common case to launch a structured study session.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {lastStudiedTopic
          ? "Continue where you left off"
          : `Start your ${rotationTitle ?? "rotation"}`}
      </p>
      <h2 className="mt-1 text-xl font-black leading-tight tracking-tight text-slate-950">
        {topic.title}
      </h2>
      <p className="mt-1 text-[13px] text-slate-600">
        {topic.trackTitle} ·{" "}
        {lastStudiedTopic ? "Last studied" : "Suggested starting point"}
      </p>

      <Link
        href={buildCaseReadinessHref({
          topicId: topic.id,
          mode,
          time: selectedMinutes,
        })}
        className="mt-3.5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-[15px] font-semibold text-white transition active:bg-slate-800"
      >
        Study now
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
