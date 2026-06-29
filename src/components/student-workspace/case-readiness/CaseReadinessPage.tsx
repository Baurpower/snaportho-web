"use client";

import { useState } from "react";
import Link from "next/link";
import { CaseReadinessHeader } from "@/components/student-workspace/case-readiness/CaseReadinessHeader";
import { CaseReadinessProgress } from "@/components/student-workspace/case-readiness/CaseReadinessProgress";
import { ReadinessObjectiveCard } from "@/components/student-workspace/case-readiness/ReadinessObjectiveCard";
import { StudentWorkspaceChrome } from "@/components/student-workspace/shell/StudentWorkspaceChrome";
import type { CaseReadinessSession } from "@/lib/student-curriculum";

export function CaseReadinessPage({
  session,
}: {
  session: CaseReadinessSession | null;
}) {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>(
    session?.objectives[0] ? [session.objectives[0].id] : []
  );
  const completedSet = new Set(completedIds);
  const expandedSet = new Set(expandedIds);

  if (!session) {
    return (
      <StudentWorkspaceChrome
        badge="Case Readiness"
        title="Topic not found"
        description="We could not build a readiness session for that topic."
      >
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            That case readiness session is not available
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Return to Prepare and search by diagnosis, procedure, or common case.
          </p>
          <div className="mt-5">
            <Link
              href="/student-workspace/prepare"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to Prepare
            </Link>
          </div>
        </section>
      </StudentWorkspaceChrome>
    );
  }

  const nextTopic = session.nextRecommendedTopic?.topic;
  const nextTopicReason = session.nextRecommendedTopic?.reasons[0]?.label;

  return (
    <StudentWorkspaceChrome
      badge="Case Readiness"
      title="What do I need to know before tomorrow?"
      description="Work through a focused readiness checklist, mark off what you understand, and use BroBot only when you need targeted help."
    >
      <div className="grid gap-5">
        <CaseReadinessHeader session={session} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4">
            {session.objectives.map((objective) => (
              <ReadinessObjectiveCard
                key={objective.id}
                objective={objective}
                expanded={expandedSet.has(objective.id)}
                completed={completedSet.has(objective.id)}
                onToggleExpanded={() =>
                  setExpandedIds((current) =>
                    current.includes(objective.id)
                      ? current.filter((id) => id !== objective.id)
                      : [...current, objective.id]
                  )
                }
                onToggleCompleted={() =>
                  setCompletedIds((current) =>
                    current.includes(objective.id)
                      ? current.filter((id) => id !== objective.id)
                      : [...current, objective.id]
                  )
                }
              />
            ))}
          </div>

          <div className="grid content-start gap-4">
            <CaseReadinessProgress
              completedCount={completedIds.length}
              totalCount={session.objectives.length}
            />

            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Session snapshot
              </p>
              <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">
                {session.topic.title}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {session.track.title} · {session.selectedMinutes} min plan
              </p>

              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Common cases
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {session.topic.commonCases.slice(0, 3).map((curriculumCase) => (
                    <span
                      key={curriculumCase.id}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {curriculumCase.name}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {session.relatedTopics.length > 0 ? (
              <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Related topics
                </p>
                <div className="mt-3 space-y-2">
                  {session.relatedTopics.map((topic) => (
                    <Link
                      key={topic.id}
                      href={`/student-workspace/case-readiness/${topic.id}?mode=${session.mode}&time=${session.selectedMinutes}`}
                      className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-sky-300 hover:bg-sky-50"
                    >
                      {topic.title}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Next step
              </p>
              <div className="mt-3 flex flex-col gap-3">
                {nextTopic ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-950">
                      Continue with {nextTopic.title}
                    </p>
                    {nextTopicReason ? (
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {nextTopicReason}
                      </p>
                    ) : null}
                    <Link
                      href={`/student-workspace/case-readiness/${nextTopic.id}?mode=${session.mode}&time=${session.selectedMinutes}`}
                      className="mt-3 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Continue with {nextTopic.title}
                    </Link>
                  </div>
                ) : null}
                <Link
                  href="/student-workspace/prepare"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Return to curriculum
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </StudentWorkspaceChrome>
  );
}
