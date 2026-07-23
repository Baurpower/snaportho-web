"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buildCaseReadinessHref } from "@/components/student-workspace/prepare/prepare-routes";
import { CasePrepStatusBanner } from "@/components/student-workspace/case-readiness/CasePrepStatusBanner";
import { CaseReadinessHeader } from "@/components/student-workspace/case-readiness/CaseReadinessHeader";
import { CaseReadinessProgress } from "@/components/student-workspace/case-readiness/CaseReadinessProgress";
import { ReadinessConfidenceWidget } from "@/components/student-workspace/case-readiness/ReadinessConfidenceWidget";
import { ReadinessObjectiveCard } from "@/components/student-workspace/case-readiness/ReadinessObjectiveCard";
import { CuratedCasePrepDocument } from "@/components/student-workspace/case-readiness/CuratedCasePrepDocument";
import { CasePrepV11Document } from "@/components/student-workspace/case-readiness/CasePrepV11Document";
import { CasePrepStreamPanel } from "@/components/student-workspace/case-readiness/CasePrepStreamPanel";
import { StudentWorkspaceChrome } from "@/components/student-workspace/shell/StudentWorkspaceChrome";
import {
  normalizeStudyGuideCompletionIds,
  type CaseReadinessSession,
} from "@/lib/student-curriculum";

async function persistProgress(payload: {
  topicId: string;
  trackId: string;
  studyMode: "fast" | "deep";
  selectedMinutes: number;
  completedObjectiveIds: string[];
  totalObjectives: number;
  incrementBrobotSessions?: boolean;
}) {
  const response = await fetch("/api/student-workspace/curriculum-progress", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topicId: payload.topicId,
      trackId: payload.trackId,
      studyMode: payload.studyMode,
      selectedMinutes: payload.selectedMinutes,
      completedObjectiveIds: payload.completedObjectiveIds,
      totalObjectives: payload.totalObjectives,
      incrementBrobotSessions: payload.incrementBrobotSessions,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to save progress");
  }
}

export function CaseReadinessPage({
  session,
  initialCompletedObjectiveIds = [],
  casePrepStreamEnabled = false,
}: {
  session: CaseReadinessSession | null;
  initialCompletedObjectiveIds?: string[];
  casePrepStreamEnabled?: boolean;
}) {
  const validInitialCompletedIds = useMemo(
    () =>
      normalizeStudyGuideCompletionIds(
        initialCompletedObjectiveIds,
        session?.studyGuideSections ?? []
      ),
    [initialCompletedObjectiveIds, session]
  );
  const [completedIds, setCompletedIds] = useState<string[]>(
    validInitialCompletedIds
  );
  const [expandedIds, setExpandedIds] = useState<string[]>(
    session?.studyGuideSections[0] ? [session.studyGuideSections[0].id] : []
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [readinessConfidence, setReadinessConfidence] = useState<
    "comfortable" | "maybe" | "not-ready" | null
  >(null);
  const completedSet = new Set(completedIds);
  const expandedSet = new Set(expandedIds);

  const syncProgress = useCallback(
    async (
      nextCompletedIds: string[],
      options?: { incrementBrobotSessions?: boolean }
    ) => {
      if (!session) return;
      const validCompletedIds = normalizeStudyGuideCompletionIds(
        nextCompletedIds,
        session.studyGuideSections
      );
      setIsSaving(true);
      setSaveError(null);
      try {
        await persistProgress({
          topicId: session.topic.id,
          trackId: session.track.id,
          studyMode: session.mode,
          selectedMinutes: session.selectedMinutes,
          completedObjectiveIds: validCompletedIds,
          totalObjectives: session.studyGuideSections.length,
          incrementBrobotSessions: options?.incrementBrobotSessions,
        });
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Failed to save progress"
        );
      } finally {
        setIsSaving(false);
      }
    },
    [session]
  );

  useEffect(() => {
    if (!session) return;
    setCompletedIds(validInitialCompletedIds);
    void syncProgress(validInitialCompletedIds);
  }, [session, validInitialCompletedIds, syncProgress]);

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
        <CasePrepStatusBanner context={session.casePrepContext} />

        {session.casePrepContext.status === "preview" && session.casePrepContext.v11 ? (
          casePrepStreamEnabled ? (
            <CasePrepStreamPanel
              prompt={session.casePrepContext.title ?? session.topic.title}
            />
          ) : (
            <CasePrepV11Document data={session.casePrepContext.v11} />
          )
        ) : null}

        {session.casePrepContext.status === "certified" ? (
          <CuratedCasePrepDocument context={session.casePrepContext} />
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4">
            {session.casePrepContext.status !== "certified" && session.casePrepContext.status !== "preview"
              ? session.studyGuideSections.map((objective) => (
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
                onToggleCompleted={() => {
                  const nextCompletedIds = completedSet.has(objective.id)
                    ? completedIds.filter((id) => id !== objective.id)
                    : [...completedIds, objective.id];
                  setCompletedIds(nextCompletedIds);
                  void syncProgress(nextCompletedIds);
                }}
                onBrobotLaunch={() =>
                  void syncProgress(completedIds, { incrementBrobotSessions: true })
                }
              />
                ))
              : null}
          </div>

          <div className="grid content-start gap-4">
            <ReadinessConfidenceWidget
              confidence={readinessConfidence}
              onChange={setReadinessConfidence}
            />
            <CaseReadinessProgress
              completedCount={completedIds.length}
              totalCount={session.studyGuideSections.length}
              persisted
              isSaving={isSaving}
            />
            {saveError ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {saveError}
              </p>
            ) : null}

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
                      href={buildCaseReadinessHref({
                        topicId: topic.id,
                        mode: session.mode,
                        time: session.selectedMinutes,
                      })}
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
                      href={buildCaseReadinessHref({
                        topicId: nextTopic.id,
                        mode: session.mode,
                        time: session.selectedMinutes,
                      })}
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
