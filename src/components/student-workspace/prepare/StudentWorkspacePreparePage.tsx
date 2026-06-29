"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { CasePrepLauncher } from "@/components/student-workspace/prepare/CasePrepLauncher";
import { CurriculumHub } from "@/components/student-workspace/prepare/CurriculumHub";
import { RotationReadinessPanel } from "@/components/student-workspace/prepare/RotationReadinessPanel";
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
  getCurriculumOverview,
  getRelatedTopics,
  getRecommendedNextTopics,
  getTopicById,
  searchCurriculumTopics,
  type CurriculumSearchResult,
} from "@/lib/student-curriculum";
import { addDaysToDateKey } from "@/lib/student-workspace/date";
import { getNextRotation } from "@/lib/student-workspace/progress";
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
}: PreparePageProps) {
  const todayPlusOne = addDaysToDateKey(today, 1);
  const currentRotation =
    rotations.find((rotation) => rotation.id === currentRotationId) ?? null;
  const nextRotation = getNextRotation(rotations, today);
  const currentWeekResolved = resolveScheduleEntriesForWeek(
    currentWeekEntries,
    weekStart
  );
  const tomorrowWeekResolved = resolveScheduleEntriesForWeek(
    tomorrowWeekEntries,
    tomorrowWeekStart
  );
  const tomorrowEntries = tomorrowWeekResolved.filter(
    (entry) => entry.occurs_on === todayPlusOne
  );
  const weekByDate = buildWeekByDate(currentWeekResolved);
  const initialTomorrowEntryId = inferTomorrowEntryId({
    currentWeekResolved,
    tomorrowWeekResolved,
    tomorrowEntries,
    weekByDate,
  });
  const initialService = inferServiceLabel(currentRotation);
  const initialTopic = inferTopicLabel({
    tomorrowEntry: chooseMostRelevantEntry(tomorrowEntries),
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
  const inferredService =
    selectedRotation?.service?.trim() || context.service.trim() || initialService;
  const searchResults = searchCurriculumTopics(deferredTopicValue, { limit: 6 });
  const selectedCurriculumTopic =
    (context.selectedTopicId ? getTopicById(context.selectedTopicId) : undefined) ??
    (topicValue.trim() === initialSelectedTopicTitle ? initialTopicMatch?.topic : undefined);
  const selectedTopic =
    selectedCurriculumTopic?.title ?? (topicValue.trim() || initialTopic);
  const activeTrackId =
    selectedCurriculumTopic?.trackId ?? searchResults[0]?.topic.trackId;
  const curriculumOverview = getCurriculumOverview();
  const relatedTopics = selectedCurriculumTopic
    ? getRelatedTopics(selectedCurriculumTopic.id)
    : [];
  const recommendedTopics = getRecommendedNextTopics({
    currentTopicId: selectedCurriculumTopic?.id,
    trackId: activeTrackId,
    limit: 4,
  });
  const activeMode = context.studyMode ?? "fast";
  const selectedMinutes = Number.parseInt(context.timeAvailable, 10) || 15;
  const continueTopicId =
    recommendedTopics[0]?.topic.id ??
    selectedCurriculumTopic?.id ??
    curriculumOverview[0]?.suggestedStartTopic?.id;
  const readinessItems = buildRotationReadiness({
    today,
    currentRotation: selectedRotation ?? currentRotation,
    nextRotation,
    selectedTopic,
    currentWeekResolved,
  });

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
    setTopicValue(result.topic.title);
    setContext((current) => ({
      ...current,
      selectedTopic: result.topic.title,
      selectedTopicId: result.topic.id,
    }));
  }

  return (
    <StudentWorkspaceChrome
      badge="Case & Rotation Prep"
      title="Student Ortho Curriculum"
      description="Fast case prep, deep study, and a student-first orthopaedic curriculum built for rotations."
    >
      <div className="grid gap-6">
        <CasePrepLauncher
          topicValue={topicValue}
          onTopicChange={handleTopicInputChange}
          onTopicSelect={handleTopicSelect}
          searchResults={searchResults}
          hasSearched={deferredTopicValue.trim().length > 0}
          selectedTopic={selectedCurriculumTopic}
          relatedTopics={relatedTopics}
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
        />

        <RotationReadinessPanel items={readinessItems} />
      </div>
    </StudentWorkspaceChrome>
  );
}
