"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { buildCaseReadinessHref } from "@/components/student-workspace/prepare/prepare-routes";
import {
  FUNDAMENTALS_TRACK_IDS,
  SUBSPECIALTY_TRACK_IDS,
  type CurriculumTrackFilterId,
} from "@/components/student-workspace/prepare/rotation-track-mapping";
import {
  getTopicById,
  getTopicsByTrack,
  getTrackById,
  type CurriculumTopic,
  type StudyMode,
} from "@/lib/student-curriculum";
import { getLearningPathWeeks } from "@/lib/student-curriculum/learning-paths";
import type { StudentWorkspaceCurriculumProgress } from "@/lib/student-workspace/curriculum-progress";

type TopicStatus = "completed" | "in_progress" | "not_started";

function getOrderedTopicsForTrack(trackId: string): CurriculumTopic[] {
  const seen = new Set<string>();
  const ordered: CurriculumTopic[] = [];

  for (const week of getLearningPathWeeks(trackId)) {
    for (const topicId of week.topicIds) {
      const topic = getTopicById(topicId);
      if (topic && !seen.has(topicId)) {
        ordered.push(topic);
        seen.add(topicId);
      }
    }
  }

  for (const topic of getTopicsByTrack(trackId)) {
    if (!seen.has(topic.id)) {
      ordered.push(topic);
      seen.add(topic.id);
    }
  }

  return ordered;
}

function StatusDot({ status }: { status: TopicStatus }) {
  if (status === "completed") {
    return (
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </span>
    );
  }
  if (status === "in_progress") {
    return <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-amber-400" />;
  }
  return (
    <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-slate-300 bg-white" />
  );
}

function TrackRow({
  trackId,
  progressMap,
  isActive,
  defaultExpanded,
  mode,
  selectedMinutes,
}: {
  trackId: string;
  progressMap: Map<string, TopicStatus>;
  isActive: boolean;
  defaultExpanded: boolean;
  mode: StudyMode;
  selectedMinutes: number;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const track = getTrackById(trackId);
  const topics = getOrderedTopicsForTrack(trackId);

  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);

  if (!track) return null;

  const exploredCount = topics.filter((topic) => progressMap.has(topic.id)).length;
  const completedCount = topics.filter(
    (topic) => progressMap.get(topic.id) === "completed"
  ).length;
  const percent =
    topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        isActive ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex min-h-14 w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-bold tracking-tight text-slate-950">
              {track.title}
            </h3>
            {isActive ? (
              <span className="shrink-0 rounded-full bg-sky-200 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-sky-800">
                Current
              </span>
            ) : null}
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 w-full max-w-28 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-slate-500">
              {exploredCount === 0
                ? `${topics.length} topics`
                : `${exploredCount}/${topics.length}`}
            </span>
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded ? (
        <div className="border-t border-slate-200 bg-white/60 px-2 py-1.5">
          {topics.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-slate-500">
              Topics for this service are coming soon.
            </p>
          ) : (
            topics.map((topic) => (
              <Link
                key={topic.id}
                href={buildCaseReadinessHref({
                  topicId: topic.id,
                  mode,
                  time: selectedMinutes,
                })}
                className="flex min-h-12 items-center gap-2.5 rounded-lg px-2 py-2 active:bg-slate-100"
              >
                <StatusDot status={progressMap.get(topic.id) ?? "not_started"} />
                <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-slate-900">
                  {topic.title}
                </span>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Phone version of the orthopaedic roadmap.
 *
 * Desktop shows a 12-dot coverage strip per track, which is unreadable at phone
 * width; this swaps it for a progress bar plus an explored count, and gives each
 * topic row a 48px tap target.
 */
export function MobileKnowledgeMap({
  topicProgress,
  completedTopicIds,
  activeTrackId,
  mode,
  selectedMinutes,
}: {
  topicProgress: StudentWorkspaceCurriculumProgress[];
  completedTopicIds: string[];
  activeTrackId: CurriculumTrackFilterId | null;
  mode: StudyMode;
  selectedMinutes: number;
}) {
  const completedSet = new Set(completedTopicIds);
  const progressMap = new Map<string, TopicStatus>(
    topicProgress.map((entry) => [
      entry.topic_id,
      entry.status === "completed" || completedSet.has(entry.topic_id)
        ? "completed"
        : "in_progress",
    ])
  );

  const subspecialtyTracks = SUBSPECIALTY_TRACK_IDS.filter((id) =>
    getTrackById(id)
  );
  const fundamentalsTracks = FUNDAMENTALS_TRACK_IDS.filter((id) =>
    getTrackById(id)
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Orthopaedic roadmap
      </p>
      <h2 className="mt-1 text-xl font-black leading-tight tracking-tight text-slate-950">
        Where you are in orthopaedics
      </h2>
      <p className="mt-1.5 text-[13px] leading-6 text-slate-600">
        Tap a subspecialty to see your coverage and jump into a session.
      </p>

      <div className="mt-3 space-y-2">
        {subspecialtyTracks.map((trackId) => (
          <TrackRow
            key={trackId}
            trackId={trackId}
            progressMap={progressMap}
            isActive={trackId === activeTrackId}
            defaultExpanded={trackId === activeTrackId}
            mode={mode}
            selectedMinutes={selectedMinutes}
          />
        ))}
      </div>

      {fundamentalsTracks.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Fundamentals
          </p>
          <div className="space-y-2">
            {fundamentalsTracks.map((trackId) => (
              <TrackRow
                key={trackId}
                trackId={trackId}
                progressMap={progressMap}
                isActive={trackId === activeTrackId}
                defaultExpanded={trackId === activeTrackId}
                mode={mode}
                selectedMinutes={selectedMinutes}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
