"use client";

import Link from "next/link";
import { MessageSquare, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { buildCaseReadinessHref } from "@/components/student-workspace/prepare/prepare-routes";
import { savePendingBroBotRequest } from "@/lib/brobot/pending-request";
import type { RotationPrepProfile } from "@/lib/student-curriculum/rotation-prep-profile";
import type { StudyMode } from "@/lib/student-curriculum";

function PrepList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RotationPrepDashboard({
  profile,
  rotationTitle,
  serviceLabel,
  studyMode,
  selectedMinutes,
  trackProgressLabel,
}: {
  profile: RotationPrepProfile;
  rotationTitle: string;
  serviceLabel: string;
  studyMode: StudyMode;
  selectedMinutes: number;
  trackProgressLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const startTopic = profile.suggestedStartTopic ?? profile.highYieldTopics[0];

  function launchBrobotAssistant() {
    savePendingBroBotRequest({
      prompt: [
        `I am on my ${profile.trackTitle} rotation and need a focused preparation plan for tomorrow.`,
        `Current rotation: ${rotationTitle}. Service: ${serviceLabel}.`,
        `Give me today's highest-yield cases, anatomy, procedures, attending questions, and complications to review.`,
        `Organize the answer like a surgical mentor preparing a subintern the night before cases.`,
      ].join("\n"),
      mode: "or_prep",
      responseDepth: studyMode === "deep" ? "deep" : "standard",
      trainingLevel: "med_student",
      sourceRoute: pathname || "/student-workspace/prepare",
    });
    router.push("/brobot/chat");
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Current Rotation
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {profile.trackTitle}
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {rotationTitle} · {serviceLabel}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {profile.rotationFocus}
          </p>
          {trackProgressLabel ? (
            <p className="mt-2 text-sm font-semibold text-sky-800">
              {trackProgressLabel}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {startTopic ? (
            <Link
              href={buildCaseReadinessHref({
                topicId: startTopic.id,
                mode: studyMode,
                time: selectedMinutes,
              })}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Start {startTopic.title}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={launchBrobotAssistant}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            <MessageSquare className="h-4 w-4" />
            {profile.brobotAssistantLabel}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <PrepList title="Today's recommended cases" items={profile.recommendedCases} />
        <PrepList title="Common procedures" items={profile.commonProcedures} />
        <PrepList title="High-yield anatomy" items={profile.anatomyHighlights} />
        <PrepList title="Attending questions" items={profile.attendingQuestions} />
        <PrepList title="Complication review" items={profile.complicationReview} />
        <PrepList title="Implant review" items={profile.implantReview} />
        <PrepList title="Classification review" items={profile.classificationReview} />
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-700" />
          <p className="text-sm font-semibold text-slate-900">
            High-yield topics for this service
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.highYieldTopics.map((topic) => (
            <Link
              key={topic.id}
              href={buildCaseReadinessHref({
                topicId: topic.id,
                mode: studyMode,
                time: selectedMinutes,
              })}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
            >
              {topic.title}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}