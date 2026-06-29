"use client";

import Link from "next/link";
import { getTopicsByTrack } from "@/lib/student-curriculum";
import type {
  CurriculumRecommendation,
  StudyMode,
  CurriculumTrackOverview,
} from "@/lib/student-curriculum";

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function CurriculumHub({
  overview,
  recommendations,
  mode,
  continueTopicId,
  selectedMinutes,
}: {
  overview: CurriculumTrackOverview[];
  recommendations: CurriculumRecommendation[];
  mode: StudyMode;
  continueTopicId?: string;
  selectedMinutes: number;
}) {
  const continueHref = continueTopicId
    ? `/student-workspace/case-readiness/${continueTopicId}?mode=${mode}&time=${selectedMinutes}`
    : null;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Student Ortho Curriculum
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            A real curriculum map, not placeholder cards
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Browse the actual curriculum tracks, start from the recommended topic for each service, and keep moving with real next-topic recommendations.
          </p>
        </div>
        {continueHref ? (
          <Link
            href={continueHref}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Continue Curriculum
          </Link>
        ) : null}
      </div>

      {recommendations.length > 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Suggested next topics
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Based on the selected topic, track context, and student-friendly progression.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {recommendations.slice(0, 3).map((recommendation) => (
              <div
                key={recommendation.topic.id}
                className="rounded-[1.25rem] border border-slate-200 bg-white p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {recommendation.track.title}
                </p>
                <h3 className="mt-1 text-base font-black tracking-tight text-slate-950">
                  {recommendation.topic.title}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recommendation.reasons.slice(0, 2).map((reason) => (
                    <span
                      key={`${recommendation.topic.id}-${reason.code}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {reason.label}
                    </span>
                  ))}
                </div>
                <div className="mt-4">
                  <Link
                    href={`/student-workspace/case-readiness/${recommendation.topic.id}?mode=${mode}&time=${selectedMinutes}`}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Continue
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {overview.map((trackOverview) => {
          const topics = getTopicsByTrack(trackOverview.track.id);
          const commonCases = Array.from(
            new Set(
              topics.flatMap((topic) =>
                topic.commonCases.map((curriculumCase) => curriculumCase.name)
              )
            )
          ).slice(0, 3);

          const highYieldTopics = topics.slice(0, 3);
          const launchHref = trackOverview.suggestedStartTopic
            ? `/student-workspace/case-readiness/${trackOverview.suggestedStartTopic.id}?mode=${mode}&time=${selectedMinutes}`
            : null;

          return (
            <div
              key={trackOverview.track.id}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-950">
                    {trackOverview.track.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {trackOverview.track.description}
                  </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {trackOverview.topicCount} topics
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Fast study
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {formatMinutes(trackOverview.estimatedFastMinutes)}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Deep study
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {formatMinutes(trackOverview.estimatedDeepMinutes)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Suggested start
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {trackOverview.suggestedStartTopic?.title ?? "Start with the fundamentals"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {trackOverview.track.rotationRelevance}
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Common student cases
                  </p>
                  <div className="mt-2 space-y-2">
                    {commonCases.length > 0 ? (
                      commonCases.map((caseName) => (
                        <div key={caseName} className="text-sm text-slate-700">
                          {caseName}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500">
                        Case names will appear here as topics in this track expand.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    High-yield topics
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {highYieldTopics.map((topic) => (
                      <span
                        key={topic.id}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
                      >
                        {topic.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {launchHref ? (
                  <Link
                    href={launchHref}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                  >
                    Study {trackOverview.track.title}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-400"
                  >
                    Study {trackOverview.track.title}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
