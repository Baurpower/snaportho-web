"use client";

import type {
  StudentWorkspaceProfile,
  StudentWorkspaceResolvedScheduleEntry,
  StudentWorkspaceRotation,
  StudentWorkspaceScheduleEntry,
} from "@/lib/student-workspace/types";
import type { StudentWorkspacePrepareProgressSnapshot } from "@/lib/student-workspace/curriculum-progress";

export type PrepareModeId =
  | "deep_dive"
  | "dont_look_stupid"
  | "service_survival"
  | "review_week";

export type PrepareTimeAvailable = "2m" | "5m" | "15m" | "45m" | "90m";

export type PrepareIntensity = "quick" | "standard" | "deep";

export type PrepareContextState = {
  rotationId: string | null;
  service: string;
  tomorrowEntryId: string | null;
  attending: string;
  timeAvailable: PrepareTimeAvailable;
  preparationMode: PrepareIntensity;
  clinicalMomentId?: ClinicalMomentId;
  selectedTopic?: string;
  selectedTopicId?: string;
  studyMode?: StudyModeId;
};

export type StudyModeId = "fast" | "deep";

export type StudyTemplateSection = {
  id: string;
  title: string;
  detail: string;
};

export type ClinicalMomentId =
  | "tonight_preparing"
  | "tomorrow_morning"
  | "outside_or"
  | "clinic_downtime"
  | "between_cases"
  | "after_getting_pimped"
  | "five_minute_study"
  | "weekend_deep_learning"
  | "new_rotation"
  | "rotation_wrap_up";

export type PrepareContextDisplay = {
  currentRotation: string;
  tomorrow: string;
  currentService: string;
  nextClinicalMoment: string;
  availableTime: string;
  confidence: number;
};

export type PreparationResource = {
  label: string;
  href?: string;
  kind?: "brobot" | "caseprep" | "reference" | "video" | "audio" | "notes";
};

export type ClinicalMomentDefinition = {
  id: ClinicalMomentId;
  label: string;
  shortLabel: string;
  defaultTimeAvailable: PrepareTimeAvailable;
  recommendedDepth: PrepareIntensity;
};

export type MomentRecommendation = {
  momentId: ClinicalMomentId;
  momentLabel: string;
  heading: string;
  title: string;
  estimatedTime: string;
  rationale: string;
  confidence: number;
  benefits: string[];
  ctaLabel: string;
};

export type WorkflowStepStatus = "not_started" | "active" | "completed";

export type GuidedWorkflowStep = {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  completionLabel: string;
  resources: PreparationResource[];
  brobotActions: Array<{
    label: string;
    prompt: string;
    mode: "or_prep" | "clinic" | "consult" | "general";
    depth: "quick" | "standard" | "deep";
  }>;
  casePrepActionLabel?: string;
};

export type ReadinessSignal = {
  id: string;
  label: string;
  complete: boolean;
};

export type RecentLearningItem = {
  id: string;
  title: string;
  detail: string;
  actionLabel: string;
  confidence?: number;
};

export type WorkflowStepDefinition = {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  resources: string[];
  brobotActions: Array<{
    label: string;
    prompt: string;
    mode: "or_prep" | "clinic" | "consult" | "general";
    depth: "quick" | "standard" | "deep";
  }>;
};

export type PrepModeDefinition = {
  id: PrepareModeId;
  title: string;
  tagline: string;
  description: string;
  durationLabel: string;
  useCases: string[];
  featureBullets: string[];
  ctaLabel: string;
};

export type PreparePageProps = {
  profile: StudentWorkspaceProfile;
  rotations: StudentWorkspaceRotation[];
  today: string;
  currentRotationId: string | null;
  weekStart: string;
  tomorrowWeekStart: string;
  currentWeekEntries: StudentWorkspaceScheduleEntry[];
  tomorrowWeekEntries: StudentWorkspaceScheduleEntry[];
  progressSnapshot: StudentWorkspacePrepareProgressSnapshot;
};

export type DerivedScheduleData = {
  currentWeekResolved: StudentWorkspaceResolvedScheduleEntry[];
  tomorrowWeekResolved: StudentWorkspaceResolvedScheduleEntry[];
  tomorrowEntries: StudentWorkspaceResolvedScheduleEntry[];
  weekByDate: Map<string, StudentWorkspaceResolvedScheduleEntry[]>;
};
