"use client";

import Link from "next/link";
import { buildCaseReadinessHref } from "@/components/student-workspace/prepare/prepare-routes";
import type { LearningPathView } from "@/lib/student-curriculum/learning-paths";
import type { StudyMode } from "@/lib/student-curriculum";

export function LearningPathPanel({
  learningPath,
  completedTopicIds,
  studyMode,
  selectedMinutes,
}: {
  learningPath: LearningPathView;
  completedTopicIds: string[];
  studyMode: StudyMode;
  selectedMinutes: number;
}) {
  const completedSet = new Set(completedTopicIds);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Learning Path
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {learningPath.trackTitle} rotation progression
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Week {learningPath.currentWeek} focus · {learningPath.completedTopics}/
            {learningPath.totalTopics} topics completed
          </p>
        </div>
        {learningPath.currentTopic ? (
          <Link
            href={buildCaseReadinessHref({
              topicId: learningPath.currentTopic.id,
              mode: studyMode,
              time: selectedMinutes,
            })}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Continue {learningPath.currentTopic.title}
          </Link>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4">
        {learningPath.weeks.map((week) => (
          <div
            key={week.week}
            className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Week {week.week}
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">
                  {week.label}
                </h3>
              </div>
              <p className="text-sm font-semibold text-slate-600">
                {week.completedCount}/{week.totalCount} complete
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {week.topics.map((topic) => {
                const completed = completedSet.has(topic.id);
                return (
                  <Link
                    key={topic.id}
                    href={buildCaseReadinessHref({
                      topicId: topic.id,
                      mode: studyMode,
                      time: selectedMinutes,
                    })}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      completed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                    }`}
                  >
                    {topic.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}