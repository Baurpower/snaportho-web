"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { buildCaseReadinessHref } from "@/components/student-workspace/prepare/prepare-routes";
import {
  SUBSPECIALTY_TRACK_IDS,
  FUNDAMENTALS_TRACK_IDS,
  type CurriculumTrackFilterId,
} from "@/components/student-workspace/prepare/rotation-track-mapping";
import {
  getTopicsByTrack,
  getTopicById,
  getTrackById,
} from "@/lib/student-curriculum";
import { getLearningPathWeeks } from "@/lib/student-curriculum/learning-paths";
import type {
  CurriculumTopic,
  StudyMode,
} from "@/lib/student-curriculum";
import type { StudentWorkspaceCurriculumProgress } from "@/lib/student-workspace/curriculum-progress";

type TopicStatus = "completed" | "in_progress" | "not_started";

function getTopicStatus(
  topicId: string,
  progressMap: Map<string, TopicStatus>
): TopicStatus {
  return progressMap.get(topicId) ?? "not_started";
}

function getOrderedTopicsForTrack(trackId: string): CurriculumTopic[] {
  const weeks = getLearningPathWeeks(trackId);
  const seen = new Set<string>();
  const ordered: CurriculumTopic[] = [];

  for (const week of weeks) {
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
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500">
        <span className="h-2 w-2 rounded-full bg-white" />
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400" />
    );
  }
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white" />
  );
}

function CoverageBar({
  topics,
  progressMap,
}: {
  topics: CurriculumTopic[];
  progressMap: Map<string, TopicStatus>;
}) {
  const displayed = topics.slice(0, 12);
  return (
    <div className="flex items-center gap-1">
      {displayed.map((topic) => {
        const status = getTopicStatus(topic.id, progressMap);
        return <StatusDot key={topic.id} status={status} />;
      })}
      {topics.length > 12 ? (
        <span className="ml-1 text-[11px] text-slate-400">
          +{topics.length - 12}
        </span>
      ) : null}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  completed: "Done",
  in_progress: "Started",
  not_started: "Not started",
};

const STATUS_COLOR: Record<TopicStatus, string> = {
  completed: "text-emerald-700",
  in_progress: "text-amber-700",
  not_started: "text-slate-400",
};

function TrackTopicRow({
  topic,
  status,
  mode,
  selectedMinutes,
}: {
  topic: CurriculumTopic;
  status: TopicStatus;
  mode: StudyMode;
  selectedMinutes: number;
}) {
  return (
    <Link
      href={buildCaseReadinessHref({ topicId: topic.id, mode, time: selectedMinutes })}
      className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-100"
    >
      <StatusDot status={status} />
      <span className="flex-1 text-sm font-semibold text-slate-900">
        {topic.title}
      </span>
      <span className={`text-xs font-semibold ${STATUS_COLOR[status]}`}>
        {STATUS_LABEL[status]}
      </span>
    </Link>
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

  const exploredCount = topics.filter(
    (t) => progressMap.has(t.id)
  ).length;
  const completedCount = topics.filter(
    (t) => progressMap.get(t.id) === "completed"
  ).length;

  return (
    <div
      className={`rounded-[1.5rem] border transition ${
        isActive
          ? "border-sky-300 bg-sky-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 px-4 py-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-base font-black tracking-tight text-slate-950">
              {track.title}
            </h3>
            {isActive ? (
              <span className="rounded-full bg-sky-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-sky-800">
                Current rotation
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <CoverageBar topics={topics} progressMap={progressMap} />
            <span className="text-[11px] font-semibold text-slate-500">
              {exploredCount === 0
                ? `${topics.length} topics`
                : completedCount === topics.length
                  ? `All ${topics.length} completed`
                  : `${exploredCount} of ${topics.length} explored`}
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
        <div className="border-t border-slate-200 px-3 pb-3 pt-1">
          {topics.length === 0 ? (
            <p className="px-2 py-3 text-sm text-slate-500">
              Topics for this service are coming soon.
            </p>
          ) : (
            <div className="space-y-0.5">
              {topics.map((topic) => (
                <TrackTopicRow
                  key={topic.id}
                  topic={topic}
                  status={getTopicStatus(topic.id, progressMap)}
                  mode={mode}
                  selectedMinutes={selectedMinutes}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function OrthoKnowledgeMap({
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
    topicProgress.map((p) => [
      p.topic_id,
      p.status === "completed" || completedSet.has(p.topic_id)
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
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Orthopaedic Roadmap
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        Where you are in orthopaedics
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Open any subspecialty to see your topic coverage and jump directly into a study session.
      </p>

      <div className="mt-5 space-y-2">
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
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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
