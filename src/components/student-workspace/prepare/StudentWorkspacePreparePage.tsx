"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CasePrepLauncher } from "@/components/student-workspace/prepare/CasePrepLauncher";
import { LearningPathPanel } from "@/components/student-workspace/prepare/LearningPathPanel";
import { RotationPrepDashboard } from "@/components/student-workspace/prepare/RotationPrepDashboard";
import { RotationReadinessPanel } from "@/components/student-workspace/prepare/RotationReadinessPanel";
import { TodaysPreparationPanel } from "@/components/student-workspace/prepare/TodaysPreparationPanel";
import {
  buildRotationReadiness,
  buildWeekByDate,
  chooseMostRelevantEntry,
  inferServiceLabel,
  inferTomorrowEntryId,
  inferTopicLabel,
} from "@/components/student-workspace/prepare/prepare-content";
import { StudentWorkspaceChrome } from "@/components/student-workspace/shell/StudentWorkspaceChrome";
import {
  inferTrackIdFromRotation,
  type CurriculumTrackFilterId,
} from "@/components/student-workspace/prepare/rotation-track-mapping";
import { buildLearningPathView } from "@/lib/student-curriculum/learning-paths";
import { buildTodaysPreparationCards } from "@/lib/student-curriculum/prep-recommendations";
import { buildRotationPrepProfile } from "@/lib/student-curriculum/rotation-prep-profile";
import {
  getCurriculumOverview,
  getRelatedTopics,
  getRecommendedNextTopics,
  getTopicById,
  getTopicsByTrack,
  searchCurriculumTopics,
  type CurriculumSearchResult,
} from "@/lib/student-curriculum";
import { addDaysToDateKey, formatLongDateOnly } from "@/lib/student-workspace/date";
import { getNextRotation } from "@/lib/student-workspace/progress";
import { resolveScheduleEntriesForWeek } from "@/lib/student-workspace/schedule-resolver";
import type { PrepareContextState, PreparePageProps } from "@/components/student-workspace/prepare/types";

const CurriculumHub = dynamic(
  () =>
    import("@/components/student-workspace/prepare/CurriculumHub").then(
      (module) => module.CurriculumHub
    ),
  {
    loading: () => (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-48 rounded-full bg-slate-200" />
        <div className="mt-4 h-4 w-full rounded-full bg-slate-100" />
        <div className="mt-2 h-4 w-5/6 rounded-full bg-slate-100" />
      </section>
    ),
  }
);

export function StudentWorkspacePreparePage({
  rotations,
  today,
  currentRotationId,
  weekStart,
  tomorrowWeekStart,
  currentWeekEntries,
  tomorrowWeekEntries,
  progressSnapshot,
}: PreparePageProps) {
  const todayPlusOne = addDaysToDateKey(today, 1);
  const currentRotation =
    rotations.find((rotation) => rotation.id === currentRotationId) ?? null;
  const nextRotation = getNextRotation(rotations, today);
  const currentWeekResolved = useMemo(
    () => resolveScheduleEntriesForWeek(currentWeekEntries, weekStart),
    [currentWeekEntries, weekStart]
  );
  const tomorrowWeekResolved = useMemo(
    () => resolveScheduleEntriesForWeek(tomorrowWeekEntries, tomorrowWeekStart),
    [tomorrowWeekEntries, tomorrowWeekStart]
  );
  const tomorrowEntries = useMemo(
    () => tomorrowWeekResolved.filter((entry) => entry.occurs_on === todayPlusOne),
    [tomorrowWeekResolved, todayPlusOne]
  );
  const tomorrowEntry = useMemo(
    () => chooseMostRelevantEntry(tomorrowEntries),
    [tomorrowEntries]
  );
  const weekByDate = useMemo(
    () => buildWeekByDate(currentWeekResolved),
    [currentWeekResolved]
  );
  const initialTomorrowEntryId = inferTomorrowEntryId({
    currentWeekResolved,
    tomorrowWeekResolved,
    tomorrowEntries,
    weekByDate,
  });
  const initialService = inferServiceLabel(currentRotation);
  const initialTopic = inferTopicLabel({
    tomorrowEntry,
    currentRotation,
    service: initialService,
  });
  const initialTopicMatch =
    searchCurriculumTopics(initialTopic, { limit: 1 })[0] ??
    searchCurriculumTopics(initialService, { limit: 1 })[0];
  const initialSelectedTopicId = initialTopicMatch?.topic.id;
  const initialSelectedTopicTitle = initialTopicMatch?.topic.title ?? initialTopic;

  const [topicValue, setTopicValue] = useState(initialSelectedTopicTitle);
  const [context, setContext] = useState<PrepareContextState>({
    rotationId: currentRotationId,
    service: initialService,
    tomorrowEntryId: initialTomorrowEntryId,
    attending: "",
    timeAvailable: "15m",
    preparationMode: "quick",
    studyMode: "fast",
    selectedTopic: initialSelectedTopicTitle,
    selectedTopicId: initialSelectedTopicId,
  });
  const deferredTopicValue = useDeferredValue(topicValue);

  const selectedRotation =
    rotations.find((rotation) => rotation.id === context.rotationId) ?? null;
  const activeRotationTrackId: CurriculumTrackFilterId | null =
    inferTrackIdFromRotation(selectedRotation ?? currentRotation);
  const inferredService =
    selectedRotation?.service?.trim() || context.service.trim() || initialService;
  const searchResults = useMemo(
    () => searchCurriculumTopics(deferredTopicValue, { limit: 6 }),
    [deferredTopicValue]
  );
  const selectedCurriculumTopic =
    (context.selectedTopicId ? getTopicById(context.selectedTopicId) : undefined) ??
    (topicValue.trim() === initialSelectedTopicTitle ? initialTopicMatch?.topic : undefined);
  const selectedTopic =
    selectedCurriculumTopic?.title ?? (topicValue.trim() || initialTopic);
  const activeTrackId =
    selectedCurriculumTopic?.trackId ?? searchResults[0]?.topic.trackId;
  const curriculumOverview = useMemo(() => getCurriculumOverview(), []);
  const relatedTopics = useMemo(
    () =>
      selectedCurriculumTopic ? getRelatedTopics(selectedCurriculumTopic.id) : [],
    [selectedCurriculumTopic]
  );
  const completedTopicIds = progressSnapshot.completedTopicIds;
  const recommendedTopics = useMemo(
    () =>
      getRecommendedNextTopics({
        currentTopicId: selectedCurriculumTopic?.id,
        trackId: activeTrackId ?? activeRotationTrackId ?? undefined,
        completedTopicIds,
        limit: 4,
      }),
    [
      selectedCurriculumTopic?.id,
      activeTrackId,
      activeRotationTrackId,
      completedTopicIds,
    ]
  );
  const activeMode = context.studyMode ?? "fast";
  const selectedMinutes = Number.parseInt(context.timeAvailable, 10) || 15;
  const continueTopicId =
    recommendedTopics[0]?.topic.id ??
    selectedCurriculumTopic?.id ??
    curriculumOverview[0]?.suggestedStartTopic?.id;
  const rotationQuickPicks = useMemo(
    () =>
      activeRotationTrackId
        ? getTopicsByTrack(activeRotationTrackId).slice(0, 4)
        : [],
    [activeRotationTrackId]
  );
  const readinessItems = useMemo(
    () =>
      buildRotationReadiness({
        today,
        currentRotation: selectedRotation ?? currentRotation,
        nextRotation,
        selectedTopic,
        currentWeekResolved,
      }),
    [
      today,
      selectedRotation,
      currentRotation,
      nextRotation,
      selectedTopic,
      currentWeekResolved,
    ]
  );
  const rotationPrepProfile = useMemo(
    () =>
      activeRotationTrackId
        ? buildRotationPrepProfile(activeRotationTrackId)
        : null,
    [activeRotationTrackId]
  );
  const learningPath = useMemo(
    () =>
      activeRotationTrackId
        ? buildLearningPathView({
            trackId: activeRotationTrackId,
            completedTopicIds,
          })
        : null,
    [activeRotationTrackId, completedTopicIds]
  );
  const todaysPrepCards = useMemo(
    () =>
      buildTodaysPreparationCards({
        trackId: activeRotationTrackId,
        completedTopicIds,
        topicProgress: progressSnapshot.topicProgress,
        tomorrowEntry,
        scheduleCasesToReview: tomorrowEntry?.cases_to_review,
        scheduleTomorrowPrep: tomorrowEntry?.tomorrow_prep,
        studyMode: activeMode,
        selectedMinutes,
        inferredTopicId: initialSelectedTopicId,
      }),
    [
      activeRotationTrackId,
      completedTopicIds,
      progressSnapshot.topicProgress,
      tomorrowEntry,
      activeMode,
      selectedMinutes,
      initialSelectedTopicId,
    ]
  );

  const trackProgressLabel =
    learningPath && learningPath.totalTopics > 0
      ? `${learningPath.completedTopics}/${learningPath.totalTopics} topics completed on this rotation path`
      : undefined;

  useEffect(() => {
    setContext((current) => ({
      ...current,
      service: inferredService,
      selectedTopic,
      selectedTopicId: selectedCurriculumTopic?.id,
    }));
  }, [inferredService, selectedCurriculumTopic?.id, selectedTopic]);

  function handleTopicInputChange(value: string) {
    setTopicValue(value);
    setContext((current) => ({
      ...current,
      selectedTopic: value,
      selectedTopicId: undefined,
    }));
  }

  function handleTopicSelect(result: CurriculumSearchResult) {
    handleTopicPick(result.topic);
  }

  function handleTopicPick(topic: { id: string; title: string }) {
    setTopicValue(topic.title);
    setContext((current) => ({
      ...current,
      selectedTopic: topic.title,
      selectedTopicId: topic.id,
    }));
  }

  return (
    <StudentWorkspaceChrome
      badge="Case & Rotation Prep"
      title="What should I study for tomorrow?"
      description="A rotation-driven surgical preparation workspace with today's priorities, guided learning paths, and persistent progress."
    >
      <div className="grid gap-6">
        <TodaysPreparationPanel
          cards={todaysPrepCards}
          rotationLabel={
            selectedRotation?.title ?? currentRotation?.title ?? "General Orthopaedics"
          }
          tomorrowLabel={
            tomorrowEntry?.title ?? formatLongDateOnly(todayPlusOne)
          }
          studyMode={activeMode}
          selectedMinutes={selectedMinutes}
        />

        {rotationPrepProfile ? (
          <RotationPrepDashboard
            profile={rotationPrepProfile}
            rotationTitle={
              selectedRotation?.title ?? currentRotation?.title ?? "Current rotation"
            }
            serviceLabel={inferredService}
            studyMode={activeMode}
            selectedMinutes={selectedMinutes}
            trackProgressLabel={trackProgressLabel}
          />
        ) : null}

        {learningPath ? (
          <LearningPathPanel
            learningPath={learningPath}
            completedTopicIds={completedTopicIds}
            studyMode={activeMode}
            selectedMinutes={selectedMinutes}
          />
        ) : null}

        <CasePrepLauncher
          topicValue={topicValue}
          onTopicChange={handleTopicInputChange}
          onTopicSelect={handleTopicSelect}
          onTopicPick={handleTopicPick}
          searchResults={searchResults}
          hasSearched={deferredTopicValue.trim().length > 0}
          selectedTopic={selectedCurriculumTopic}
          relatedTopics={relatedTopics}
          rotationQuickPicks={rotationQuickPicks}
          context={context}
          rotationOptions={rotations.map((rotation) => ({ value: rotation.id, label: rotation.title }))}
          onChange={setContext}
          selectedMinutes={selectedMinutes}
        />

        <CurriculumHub
          overview={curriculumOverview}
          recommendations={recommendedTopics}
          mode={activeMode}
          continueTopicId={continueTopicId}
          selectedMinutes={selectedMinutes}
          activeTrackId={activeRotationTrackId}
          rotationService={inferredService}
        />

        <RotationReadinessPanel items={readinessItems} />
      </div>
    </StudentWorkspaceChrome>
  );
}