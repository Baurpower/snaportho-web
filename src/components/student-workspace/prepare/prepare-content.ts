import {
  addDaysToDateKey,
  compareDateOnly,
  formatLongDateOnly,
} from "@/lib/student-workspace/date";
import {
  getStudyTemplate,
  type DeepStudyTemplate,
  type FastStudyTemplate,
} from "@/lib/student-curriculum";
import type {
  StudentWorkspaceResolvedScheduleEntry,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";
import type {
  DerivedScheduleData,
  PrepModeDefinition,
  StudyModeId,
  StudyTemplateSection,
} from "@/components/student-workspace/prepare/types";

const ENTRY_PRIORITY: Record<string, number> = {
  or: 100,
  clinic: 90,
  call: 80,
  conference: 70,
  rotation: 60,
  study: 50,
  research: 40,
  personal: 30,
  off: 20,
  other: 10,
};

export const PREP_MODE_DEFINITIONS: PrepModeDefinition[] = [
  {
    id: "dont_look_stupid",
    title: "Don't Look Stupid",
    tagline: "Fast prep for tomorrow",
    description:
      "A quick, high-yield pass through what matters most before you walk into clinic, rounds, or the OR.",
    durationLabel: "5-15 minutes",
    useCases: ["Before tomorrow", "Between cases", "Quick reset"],
    featureBullets: [
      "Focus on the next clinical moment",
      "Review the most likely questions",
      "Walk in with a cleaner plan",
    ],
    ctaLabel: "Start quick prep",
  },
  {
    id: "deep_dive",
    title: "Deep Dive",
    tagline: "Structured topic mastery",
    description:
      "Use a longer study block to understand the case, anatomy, and decision-making well enough to build real confidence.",
    durationLabel: "30-60 minutes",
    useCases: ["Weekend study", "Away prep", "Case review"],
    featureBullets: [
      "Go beyond survival-mode prep",
      "Build durable understanding",
      "Connect cases to core orthopaedic themes",
    ],
    ctaLabel: "Start deep study",
  },
  {
    id: "service_survival",
    title: "Service Survival",
    tagline: "Rotation-specific readiness",
    description:
      "Orient quickly to the workflow, expectations, and day-to-day rhythm of the service you are about to join.",
    durationLabel: "10-20 minutes",
    useCases: ["New rotation", "First week", "Service reset"],
    featureBullets: [
      "Get clear on the workflow",
      "Know what the team values",
      "Prepare like a student who belongs there",
    ],
    ctaLabel: "Prep the service",
  },
  {
    id: "review_week",
    title: "Review the Week",
    tagline: "Turn experience into progress",
    description:
      "Look back at what you saw, what tripped you up, and what you want to tighten before next week starts.",
    durationLabel: "10-15 minutes",
    useCases: ["Friday reset", "Weekend wrap-up", "After a rough day"],
    featureBullets: [
      "Capture what you learned",
      "Spot the gaps early",
      "Come back stronger next week",
    ],
    ctaLabel: "Review and reset",
  },
];

export function chooseMostRelevantEntry(
  entries: StudentWorkspaceResolvedScheduleEntry[]
) {
  return [...entries].sort((left, right) => {
    const leftPriority = ENTRY_PRIORITY[left.entry_type] ?? 0;
    const rightPriority = ENTRY_PRIORITY[right.entry_type] ?? 0;
    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }
    if (left.is_all_day !== right.is_all_day) {
      return left.is_all_day ? 1 : -1;
    }
    return left.start_time.localeCompare(right.start_time);
  })[0] ?? null;
}

export function buildWeekByDate(
  entries: StudentWorkspaceResolvedScheduleEntry[]
) {
  const map = new Map<string, StudentWorkspaceResolvedScheduleEntry[]>();
  for (const entry of entries) {
    const existing = map.get(entry.occurs_on) ?? [];
    existing.push(entry);
    map.set(entry.occurs_on, existing);
  }
  return map;
}

export function inferServiceLabel(
  rotation: StudentWorkspaceRotation | null,
  fallback = "General Orthopaedics"
) {
  return rotation?.service?.trim() || rotation?.title?.trim() || fallback;
}

export function inferTomorrowEntryId(schedule: DerivedScheduleData) {
  return chooseMostRelevantEntry(schedule.tomorrowEntries)?.id ?? null;
}

export function inferTopicLabel(params: {
  tomorrowEntry: StudentWorkspaceResolvedScheduleEntry | null;
  currentRotation: StudentWorkspaceRotation | null;
  service: string;
}) {
  return (
    params.tomorrowEntry?.title?.trim() ||
    params.currentRotation?.title?.trim() ||
    params.service ||
    "Orthopaedic topic"
  );
}

export function getStudyModeCopy(mode: StudyModeId) {
  if (mode === "deep") {
    return {
      title: "Deep Case Study",
      subtitle: "30-60+ minute structured learning for understanding the case, not just surviving it.",
      ctaLabel: "Start Deep Mode",
    };
  }

  return {
    title: "Fast Case Prep",
    subtitle: "5-15 minute student-focused prep for tomorrow's OR, clinic, or rounds.",
    ctaLabel: "Start Fast Mode",
  };
}

function buildFastTemplateSections(
  template: FastStudyTemplate
): StudyTemplateSection[] {
  return [
    {
      id: "overview",
      title: "Overview",
      detail: template.overviewPrompt,
    },
    {
      id: "must-know",
      title: "Must know",
      detail: template.mustKnow.join(" • "),
    },
    {
      id: "anatomy",
      title: "Anatomy focus",
      detail: template.anatomyFocus.join(" • "),
    },
    {
      id: "case-steps",
      title: "Case flow",
      detail: template.caseSteps.join(" • "),
    },
    {
      id: "pimp-questions",
      title: "Pimp questions",
      detail: template.pimpQuestions.join(" • "),
    },
    {
      id: "or-survival",
      title: "OR survival",
      detail: template.orSurvivalTips.join(" • "),
    },
    {
      id: "one-liner",
      title: "One-liner",
      detail: template.oneLiner,
    },
  ];
}

function buildDeepTemplateSections(
  template: DeepStudyTemplate
): StudyTemplateSection[] {
  return [
    {
      id: "overview",
      title: "Overview",
      detail: template.overviewPrompt,
    },
    {
      id: "anatomy",
      title: "Anatomy",
      detail: template.anatomy.join(" • "),
    },
    {
      id: "classification",
      title: "Classification",
      detail: template.classification.join(" • "),
    },
    {
      id: "imaging",
      title: "Imaging",
      detail: template.imaging.join(" • "),
    },
    {
      id: "decision-making",
      title: "Decision-making",
      detail: template.decisionMaking.join(" • "),
    },
    {
      id: "treatment",
      title: "Treatment options",
      detail: template.treatmentOptions.join(" • "),
    },
    {
      id: "surgical-approach",
      title: "Surgical approach",
      detail: template.surgicalApproach.join(" • "),
    },
    {
      id: "complications",
      title: "Complications",
      detail: template.complications.join(" • "),
    },
    {
      id: "board-pearls",
      title: "Board pearls",
      detail: template.boardPearls.join(" • "),
    },
    {
      id: "self-check",
      title: "Self-check",
      detail: template.selfCheckQuestions.join(" • "),
    },
  ];
}

function buildFallbackTemplate(params: {
  mode: StudyModeId;
  topicLabel: string;
  service: string;
}): StudyTemplateSection[] {
  const { mode, topicLabel, service } = params;

  if (mode === "deep") {
    return [
      {
        id: "overview",
        title: "Overview",
        detail: `Build a structured understanding of ${topicLabel} with emphasis on why it shows up on ${service}.`,
      },
      {
        id: "anatomy",
        title: "Anatomy",
        detail: "Start with the local anatomy, stabilizers, and structures at risk.",
      },
      {
        id: "decision-making",
        title: "Decision-making",
        detail: "Work through imaging, classification language, and the main treatment forks.",
      },
      {
        id: "self-check",
        title: "Self-check",
        detail: "Finish with likely pimp questions and the next related diagnosis to review.",
      },
    ];
  }

  return [
    {
      id: "overview",
      title: "Overview",
      detail: `Get the essentials of ${topicLabel} before clinic, rounds, or the OR.`,
    },
    {
      id: "must-know",
      title: "Must know",
      detail: "Focus on the core diagnosis, the anatomy to point out, and the one-liner you can present confidently.",
    },
    {
      id: "case-flow",
      title: "Case flow",
      detail: "Review the likely setup, common pitfalls, and the first questions a resident may ask.",
    },
  ];
}

export function buildStudyTemplate(params: {
  mode: StudyModeId;
  topicId?: string;
  topicLabel: string;
  service: string;
}): StudyTemplateSection[] {
  if (!params.topicId) {
    return buildFallbackTemplate(params);
  }

  if (params.mode === "deep") {
    const template = getStudyTemplate(params.topicId, "deep");
    return template
      ? buildDeepTemplateSections(template)
      : buildFallbackTemplate(params);
  }

  const template = getStudyTemplate(params.topicId, "fast");
  return template ? buildFastTemplateSections(template) : buildFallbackTemplate(params);
}

export function buildRotationReadiness(params: {
  today: string;
  currentRotation: StudentWorkspaceRotation | null;
  nextRotation: StudentWorkspaceRotation | null;
  selectedTopic: string;
  currentWeekResolved: StudentWorkspaceResolvedScheduleEntry[];
}) {
  const daysRemaining = params.currentRotation
    ? Math.max(0, compareDateOnly(params.today, params.currentRotation.end_date) * -1 + 1)
    : null;
  const daysUntilNextRotation = params.nextRotation
    ? Math.max(0, compareDateOnly(params.today, params.nextRotation.start_date))
    : null;
  const breakEntry =
    params.currentWeekResolved.find((entry) => entry.entry_type === "off") ?? null;
  const thisWeeksFocus =
    chooseMostRelevantEntry(params.currentWeekResolved)?.title ??
    (params.selectedTopic ? `Study ${params.selectedTopic}` : "Keep case prep moving");

  return [
    {
      label: "Current rotation",
      value: params.currentRotation?.title ?? "No active rotation",
      helper: params.currentRotation?.service ?? "Add rotations to tailor the curriculum",
    },
    {
      label: "Days remaining",
      value: daysRemaining === null ? "—" : `${daysRemaining}`,
      helper: params.currentRotation ? "Current block runway" : "No active block",
    },
    {
      label: "Next rotation",
      value: params.nextRotation?.title ?? "Nothing queued",
      helper: params.nextRotation?.service ?? "No next block yet",
    },
    {
      label: "Days until next rotation",
      value: daysUntilNextRotation === null ? "—" : `${daysUntilNextRotation}`,
      helper: "Transition countdown",
    },
    {
      label: "Days until break",
      value: breakEntry ? "This week" : "—",
      helper: breakEntry ? breakEntry.title : "No break this week",
    },
    {
      label: "This week's focus",
      value: thisWeeksFocus,
      helper: "Based on rotation and schedule",
    },
    {
      label: "Weak areas",
      value: params.selectedTopic ? `Need more reps in ${params.selectedTopic}` : "Anatomy and pimp questions",
      helper: "What to tighten up next",
    },
  ];
}

export function buildLauncherPrompt(params: {
  mode: StudyModeId;
  topicId?: string;
  topicLabel: string;
  service: string;
  rotation: StudentWorkspaceRotation | null;
  timeAvailable: string;
  attending: string;
}) {
  const rotationLabel = params.rotation?.title ?? "unknown rotation";
  const attendingLine = params.attending.trim()
    ? `Attending context: ${params.attending.trim()}.`
    : "";

  if (params.mode === "deep") {
    const template = params.topicId
      ? getStudyTemplate(params.topicId, "deep")
      : undefined;
    const structureLine = template
      ? `Use this study structure: overview, anatomy (${template.anatomy.join("; ")}), classification (${template.classification.join("; ")}), imaging, decision-making, treatment options, surgical approach, complications, board pearls, and self-check questions.`
      : "Use a structured deep-study format with anatomy, imaging, decision-making, treatment options, complications, and self-check questions.";
    return `Create a deep orthopaedic case study for ${params.topicLabel}. Rotation: ${rotationLabel}. Service: ${params.service}. Time available: ${params.timeAvailable}. ${attendingLine} ${structureLine} Keep it optimized for a fourth-year medical student and tie the explanation to what matters on service.`;
  }

  const template = params.topicId
    ? getStudyTemplate(params.topicId, "fast")
    : undefined;
  const structureLine = template
    ? `Use this prep structure: overview, must-know points (${template.mustKnow.join("; ")}), anatomy focus, case flow, pimp questions, OR survival tips, and a one-liner summary.`
    : "Use a fast-prep format with must-know points, anatomy focus, case flow, pimp questions, OR survival tips, and a one-liner summary.";
  return `Create a fast orthopaedic case prep for ${params.topicLabel}. Rotation: ${rotationLabel}. Service: ${params.service}. Time available: ${params.timeAvailable}. ${attendingLine} ${structureLine} Keep it optimized for a fourth-year medical student and focused on what to say, notice, and remember quickly.`;
}

export function buildCurriculumContinuePrompt(params: {
  service: string;
  selectedTopic: string;
  nextTopic?: string;
  trackTitle?: string;
}) {
  return `Continue my orthopaedic student curriculum. Current service: ${params.service}. Current topic: ${params.selectedTopic || "student orthopaedics fundamentals"}. Suggested next topic: ${params.nextTopic || params.selectedTopic || "highest-yield foundational topic"}. ${params.trackTitle ? `Focus track: ${params.trackTitle}.` : ""} Teach at the level of a fourth-year medical student and organize the answer into a guided study session with review questions at the end.`;
}

export function getCompactContextSummary(params: {
  today: string;
  tomorrowEntry: StudentWorkspaceResolvedScheduleEntry | null;
  currentRotation: StudentWorkspaceRotation | null;
  service: string;
  timeAvailable: string;
  readiness: number;
}) {
  return [
    { label: "Current Rotation", value: params.currentRotation?.title ?? "No active rotation" },
    { label: "Tomorrow", value: params.tomorrowEntry?.title ?? formatLongDateOnly(addDaysToDateKey(params.today, 1)) },
    { label: "Current Service", value: params.service },
    { label: "Available Time", value: params.timeAvailable },
    { label: "Confidence", value: `${params.readiness}%` },
  ];
}

export function getOverrideRotationOptions(rotations: StudentWorkspaceRotation[]) {
  return rotations.map((rotation) => ({
    value: rotation.id,
    label: rotation.title,
  }));
}

export function getOverrideTomorrowOptions(entries: StudentWorkspaceResolvedScheduleEntry[]) {
  return entries.map((entry) => ({
    value: entry.id,
    label: entry.title,
  }));
}
