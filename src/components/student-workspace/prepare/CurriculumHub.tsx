"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { buildCaseReadinessHref } from "@/components/student-workspace/prepare/prepare-routes";
import {
  FUNDAMENTALS_TRACK_IDS,
  SUBSPECIALTY_TRACK_IDS,
  type CurriculumTrackFilterId,
} from "@/components/student-workspace/prepare/rotation-track-mapping";
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

type TrackFilterOption = {
  id: CurriculumTrackFilterId | "all" | "fundamentals";
  label: string;
};

const TRACK_FILTER_LABELS: Record<CurriculumTrackFilterId, string> = {
  trauma: "Trauma",
  hand: "Hand",
  spine: "Spine",
  "adult-reconstruction": "Adult Reconstruction",
  sports: "Sports",
  pediatrics: "Pediatrics",
  "foot-ankle": "Foot & Ankle",
  "shoulder-elbow": "Shoulder & Elbow",
  tumor: "Oncology",
  "basic-science": "Basic Science / OITE",
  "or-fundamentals": "OR Fundamentals",
  "clinic-fundamentals": "Clinic Fundamentals",
};

const TRACK_FILTER_OPTIONS: TrackFilterOption[] = [
  { id: "all", label: "All services" },
  ...SUBSPECIALTY_TRACK_IDS.map((trackId) => ({
    id: trackId,
    label: TRACK_FILTER_LABELS[trackId],
  })),
  { id: "fundamentals", label: "Fundamentals" },
];

function matchesTrackFilter(
  trackId: string,
  filter: TrackFilterOption["id"]
): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "fundamentals") {
    return (FUNDAMENTALS_TRACK_IDS as readonly string[]).includes(trackId);
  }

  return trackId === filter;
}

function TopicLink({
  topicId,
  title,
  mode,
  selectedMinutes,
}: {
  topicId: string;
  title: string;
  mode: StudyMode;
  selectedMinutes: number;
}) {
  if (!topicId.trim() || !title.trim()) {
    return null;
  }

  return (
    <Link
      href={buildCaseReadinessHref({ topicId, mode, time: selectedMinutes })}
      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-slate-950"
    >
      {title}
    </Link>
  );
}

export function CurriculumHub({
  overview,
  recommendations,
  mode,
  continueTopicId,
  selectedMinutes,
  activeTrackId,
  rotationService,
}: {
  overview: CurriculumTrackOverview[];
  recommendations: CurriculumRecommendation[];
  mode: StudyMode;
  continueTopicId?: string;
  selectedMinutes: number;
  activeTrackId?: CurriculumTrackFilterId | null;
  rotationService?: string;
}) {
  const [trackFilter, setTrackFilter] = useState<TrackFilterOption["id"]>(
    activeTrackId ?? "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTrackIds, setExpandedTrackIds] = useState<string[]>(
    activeTrackId ? [activeTrackId] : []
  );

  useEffect(() => {
    if (activeTrackId) {
      setTrackFilter(activeTrackId);
      setExpandedTrackIds((current) =>
        current.includes(activeTrackId) ? current : [...current, activeTrackId]
      );
    }
  }, [activeTrackId]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredOverview = useMemo(() => {
    return overview.filter((trackOverview) => {
      if (!matchesTrackFilter(trackOverview.track.id, trackFilter)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const topics = getTopicsByTrack(trackOverview.track.id);
      const haystack = [
        trackOverview.track.title,
        trackOverview.track.description,
        trackOverview.track.rotationRelevance,
        ...topics.flatMap((topic) => [
          topic.title,
          topic.subspecialty,
          ...topic.tags,
          ...topic.commonCases.map((curriculumCase) => curriculumCase.name),
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [overview, trackFilter, normalizedQuery]);

  const subspecialtyTracks = filteredOverview.filter((trackOverview) =>
    (SUBSPECIALTY_TRACK_IDS as readonly string[]).includes(
      trackOverview.track.id
    )
  );
  const fundamentalsTracks = filteredOverview.filter((trackOverview) =>
    (FUNDAMENTALS_TRACK_IDS as readonly string[]).includes(
      trackOverview.track.id
    )
  );

  const continueHref = continueTopicId
    ? buildCaseReadinessHref({
        topicId: continueTopicId,
        mode,
        time: selectedMinutes,
      })
    : null;

  function toggleTrackExpanded(trackId: string) {
    setExpandedTrackIds((current) =>
      current.includes(trackId)
        ? current.filter((id) => id !== trackId)
        : [...current, trackId]
    );
  }

  function renderTrackCard(trackOverview: CurriculumTrackOverview) {
    const topics = getTopicsByTrack(trackOverview.track.id);
    const commonCases = Array.from(
      new Set(
        topics.flatMap((topic) =>
          topic.commonCases.map((curriculumCase) => curriculumCase.name)
        )
      )
    ).slice(0, 3);
    const highYieldTopics = topics.slice(0, 3);
    const isExpanded = expandedTrackIds.includes(trackOverview.track.id);
    const launchHref = trackOverview.suggestedStartTopic?.id
      ? buildCaseReadinessHref({
          topicId: trackOverview.suggestedStartTopic.id,
          mode,
          time: selectedMinutes,
        })
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
          {trackOverview.suggestedStartTopic ? (
            <Link
              href={buildCaseReadinessHref({
                topicId: trackOverview.suggestedStartTopic.id,
                mode,
                time: selectedMinutes,
              })}
              className="mt-1 block text-sm font-semibold text-slate-950 transition hover:text-sky-700"
            >
              {trackOverview.suggestedStartTopic.title}
            </Link>
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Topics for this service are being expanded.
            </p>
          )}
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
                  No common cases listed for this service yet.
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
                <TopicLink
                  key={topic.id}
                  topicId={topic.id}
                  title={topic.title}
                  mode={mode}
                  selectedMinutes={selectedMinutes}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => toggleTrackExpanded(trackOverview.track.id)}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
        >
          <ChevronDown
            className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`}
          />
          {isExpanded ? "Hide all topics" : `Browse all ${topics.length} topics`}
        </button>

        {isExpanded ? (
          <div className="mt-3 space-y-2 rounded-[1.25rem] border border-slate-200 bg-white p-3">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={buildCaseReadinessHref({
                  topicId: topic.id,
                  mode,
                  time: selectedMinutes,
                })}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:border-sky-300 hover:bg-sky-50"
              >
                <span>{topic.title}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {topic.estimatedFastMinutes}m fast
                </span>
              </Link>
            ))}
          </div>
        ) : null}

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
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Student Ortho Curriculum
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Browse by subspecialty and service
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Filter by the rotation you are on, search by case or procedure, and
            jump into structured readiness sessions for each topic.
          </p>
          {rotationService ? (
            <p className="mt-2 text-sm font-semibold text-sky-800">
              Current rotation service: {rotationService}
            </p>
          ) : null}
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

      <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Filter curriculum
        </label>
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search services, cases, or procedures..."
            className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {TRACK_FILTER_OPTIONS.map((option) => {
            const active = trackFilter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTrackFilter(option.id)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {recommendations.length > 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Suggested next topics
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Based on the selected topic, track context, and student-friendly
                progression.
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
                    href={buildCaseReadinessHref({
                      topicId: recommendation.topic.id,
                      mode,
                      time: selectedMinutes,
                    })}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Continue
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Select a topic above or filter by your current service to see suggested
          next steps.
        </div>
      )}

      {filteredOverview.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          No curriculum tracks match that filter. Try a different service or clear
          your search.
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          {subspecialtyTracks.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Subspecialty services
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {subspecialtyTracks.map(renderTrackCard)}
              </div>
            </div>
          ) : null}

          {fundamentalsTracks.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Fundamentals
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {fundamentalsTracks.map(renderTrackCard)}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}