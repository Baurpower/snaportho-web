"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, MessageSquare, Sparkles } from "lucide-react";
import { buildCaseReadinessHref } from "@/components/student-workspace/prepare/prepare-routes";
import { savePendingBroBotRequest } from "@/lib/brobot/pending-request";
import type { RotationPrepProfile } from "@/lib/student-curriculum/rotation-prep-profile";
import type { StudyMode } from "@/lib/student-curriculum";

function PrepAccordion({
  title,
  items,
  defaultOpen = false,
}: {
  title: string;
  items: string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-3.5 text-left"
      >
        <span className="min-w-0 truncate text-[14px] font-semibold text-slate-900">
          {title}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
            {items.length}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open ? (
        <ul className="space-y-1.5 border-t border-slate-200 px-3.5 py-3">
          {items.map((item) => (
            <li key={item} className="text-[13px] leading-6 text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Phone version of the rotation prep dashboard. The desktop grid of seven
 * always-open prep lists becomes a stack of accordions so the student can see
 * every category at once and open only what they need before rounds.
 */
export function MobileRotationPrep({
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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Current rotation
      </p>
      <h2 className="mt-1 text-xl font-black leading-tight tracking-tight text-slate-950">
        {profile.trackTitle}
      </h2>
      <p className="mt-1 text-[13px] font-semibold text-slate-700">
        {rotationTitle} · {serviceLabel}
      </p>
      <p className="mt-2 text-[13px] leading-6 text-slate-600">
        {profile.rotationFocus}
      </p>
      {trackProgressLabel ? (
        <p className="mt-1.5 text-[13px] font-semibold text-sky-800">
          {trackProgressLabel}
        </p>
      ) : null}

      <div className="mt-3.5 space-y-2">
        {startTopic ? (
          <Link
            href={buildCaseReadinessHref({
              topicId: startTopic.id,
              mode: studyMode,
              time: selectedMinutes,
            })}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-center text-[15px] font-semibold text-white transition active:bg-slate-800"
          >
            Start {startTopic.title}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={launchBrobotAssistant}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[15px] font-semibold text-slate-900 transition active:bg-slate-100"
        >
          <MessageSquare className="h-4 w-4" />
          {profile.brobotAssistantLabel}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <PrepAccordion
          title="Today's recommended cases"
          items={profile.recommendedCases}
          defaultOpen
        />
        <PrepAccordion title="Common procedures" items={profile.commonProcedures} />
        <PrepAccordion
          title="High-yield anatomy"
          items={profile.anatomyHighlights}
        />
        <PrepAccordion
          title="Attending questions"
          items={profile.attendingQuestions}
        />
        <PrepAccordion
          title="Complication review"
          items={profile.complicationReview}
        />
        <PrepAccordion title="Implant review" items={profile.implantReview} />
        <PrepAccordion
          title="Classification review"
          items={profile.classificationReview}
        />
      </div>

      {profile.highYieldTopics.length > 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-sky-700" />
            <p className="text-[13px] font-semibold text-slate-900">
              High-yield topics for this service
            </p>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {profile.highYieldTopics.map((topic) => (
              <Link
                key={topic.id}
                href={buildCaseReadinessHref({
                  topicId: topic.id,
                  mode: studyMode,
                  time: selectedMinutes,
                })}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700"
              >
                {topic.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
