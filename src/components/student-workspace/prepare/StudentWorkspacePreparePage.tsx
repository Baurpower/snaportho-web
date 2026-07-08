"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CasePrepLauncher } from "@/components/student-workspace/prepare/CasePrepLauncher";
import { NextStepHero } from "@/components/student-workspace/prepare/NextStepHero";
import { OrthoKnowledgeMap } from "@/components/student-workspace/prepare/OrthoKnowledgeMap";
import { RotationPrepDashboard } from "@/components/student-workspace/prepare/RotationPrepDashboard";
import {
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
import { buildRotationPrepProfile } from "@/lib/student-curriculum/rotation-prep-profile";
import {
  getCurriculumOverview,
  getRelatedTopics,
  getTopicById,
  getTopicsByTrack,
  getTrackById,
  searchCurriculumTopics,
  type CurriculumSearchResult,
} from "@/lib/student-curriculum";
import { addDaysToDateKey } from "@/lib/student-workspace/date";
import { resolveScheduleEntriesForWeek } from "@/lib/student-workspace/schedule-resolver";
import type { PrepareContextState, PreparePageProps } from "@/components/student-workspace/prepare/types";

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
  const relatedTopics = useMemo(
    () =>
      selectedCurriculumTopic ? getRelatedTopics(selectedCurriculumTopic.id) : [],
    [selectedCurriculumTopic]
  );
  const activeMode = context.studyMode ?? "fast";
  const selectedMinutes = Number.parseInt(context.timeAvailable, 10) || 15;
  const rotationQuickPicks = useMemo(
    () =>
      activeRotationTrackId
        ? getTopicsByTrack(activeRotationTrackId).slice(0, 4)
        : [],
    [activeRotationTrackId]
  );
  const rotationPrepProfile = useMemo(
    () =>
      activeRotationTrackId
        ? buildRotationPrepProfile(activeRotationTrackId)
        : null,
    [activeRotationTrackId]
  );
  const curriculumOverview = useMemo(() => getCurriculumOverview(), []);

  // Derive the topic to show in NextStepHero
  const lastStudiedCurriculumTopic = progressSnapshot.topicProgress[0]
    ? getTopicById(progressSnapshot.topicProgress[0].topic_id)
    : null;
  const lastStudiedTrack = lastStudiedCurriculumTopic
    ? getTrackById(lastStudiedCurriculumTopic.trackId)
    : null;
  const lastStudiedTopic =
    lastStudiedCurriculumTopic && lastStudiedTrack
      ? {
          id: lastStudiedCurriculumTopic.id,
          title: lastStudiedCurriculumTopic.title,
          trackTitle: lastStudiedTrack.title,
        }
      : null;

  const suggestedStartTopic =
    rotationPrepProfile?.suggestedStartTopic ??
    curriculumOverview.find((ov) => ov.track.id === activeRotationTrackId)
      ?.suggestedStartTopic ??
    curriculumOverview[0]?.suggestedStartTopic;
  const suggestedStartTrack = suggestedStartTopic
    ? getTrackById(suggestedStartTopic.trackId)
    : null;
  const suggestedTopic =
    suggestedStartTopic && suggestedStartTrack
      ? {
          id: suggestedStartTopic.id,
          title: suggestedStartTopic.title,
          trackTitle: suggestedStartTrack.title,
        }
      : null;

  const rotationTitle =
    selectedRotation?.title ?? currentRotation?.title ?? null;

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
      badge="Prepare"
      title="Your orthopaedic roadmap"
      description="See where you are, what you know, and what to study next."
    >
      <div className="grid gap-6">
        <NextStepHero
          lastStudiedTopic={lastStudiedTopic}
          suggestedTopic={suggestedTopic}
          rotationTitle={rotationTitle}
          mode={activeMode}
          selectedMinutes={selectedMinutes}
        />

        <OrthoKnowledgeMap
          topicProgress={progressSnapshot.topicProgress}
          completedTopicIds={progressSnapshot.completedTopicIds}
          activeTrackId={activeRotationTrackId}
          mode={activeMode}
          selectedMinutes={selectedMinutes}
        />

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
          rotationOptions={rotations.map((rotation) => ({
            value: rotation.id,
            label: rotation.title,
          }))}
          onChange={setContext}
          selectedMinutes={selectedMinutes}
        />

        {rotationPrepProfile ? (
          <RotationPrepDashboard
            profile={rotationPrepProfile}
            rotationTitle={rotationTitle ?? "Current rotation"}
            serviceLabel={inferredService}
            studyMode={activeMode}
            selectedMinutes={selectedMinutes}
          />
        ) : null}
      </div>
    </StudentWorkspaceChrome>
  );
}
