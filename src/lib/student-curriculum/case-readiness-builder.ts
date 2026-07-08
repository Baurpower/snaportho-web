import {
  getRecommendedNextTopics,
  getRelatedTopics,
  getStudyTemplate,
  getTopicById,
  getTrackById,
} from "@/lib/student-curriculum/curriculum-recommendations";
import {
  buildSurvivalSections,
  type SurvivalSection,
} from "@/lib/student-curriculum/survival-sections";
import { buildTopicBrobotActions } from "@/lib/student-curriculum/topic-brobot-actions";
import type { StudentCasePrepContext } from "@/lib/student-curriculum/student-caseprep-context";
import type {
  CurriculumRecommendation,
  CurriculumTopic,
  CurriculumTrack,
  DeepStudyTemplate,
  FastStudyTemplate,
  StudyMode,
} from "@/lib/student-curriculum/curriculum-types";

export const CASE_READINESS_OBJECTIVE_KINDS = [
  "injury",
  "anatomy",
  "imaging",
  "indication",
  "caseFlow",
  "complications",
  "residentQuestions",
  "tomorrowFocus",
] as const;

export type CaseReadinessObjectiveKind =
  (typeof CASE_READINESS_OBJECTIVE_KINDS)[number];

export const CASE_READINESS_SOURCE_FIELDS = [
  "oneLiner",
  "mustKnow",
  "anatomy",
  "anatomyFocus",
  "caseSteps",
  "pimpQuestions",
  "orSurvivalTips",
  "learningObjectives",
  "classification",
  "imaging",
  "decisionMaking",
  "treatmentOptions",
  "surgicalApproach",
  "complications",
  "boardPearls",
  "selfCheckQuestions",
  "commonCases",
] as const;

export type CaseReadinessSourceField =
  (typeof CASE_READINESS_SOURCE_FIELDS)[number];

export const CASE_READINESS_ACTION_KINDS = [
  "explain",
  "quiz",
  "ask",
  "anatomy",
  "caseFlow",
] as const;

export type CaseReadinessActionKind =
  (typeof CASE_READINESS_ACTION_KINDS)[number];

export type CaseReadinessBrobotAction = {
  label: string;
  prompt: string;
  actionKind: CaseReadinessActionKind;
  brobotMode: "or_prep" | "clinic" | "consult" | "general";
  responseDepth: "quick" | "standard" | "deep";
  studyMode: StudyMode;
  selectedMinutes: number;
  objectiveKind: CaseReadinessObjectiveKind;
};

export type CaseReadinessObjective = {
  id: string;
  objectiveKind: CaseReadinessObjectiveKind;
  title: string;
  description: string;
  bullets: string[];
  pearl?: string;
  commonMistake?: string;
  brobotActions: CaseReadinessBrobotAction[];
  sourceFields: CaseReadinessSourceField[];
  mode: StudyMode;
  estimatedMinutes?: number;
  completionLabel?: string;
};

export type CaseReadinessLaunchContext = {
  selectedMinutes: number;
};

export type CaseReadinessSession = {
  topic: CurriculumTopic;
  track: CurriculumTrack;
  mode: StudyMode;
  estimatedMinutes: number;
  selectedMinutes: number;
  title: string;
  subtitle: string;
  objectives: CaseReadinessObjective[];
  survivalSections: SurvivalSection[];
  topicBrobotActions: CaseReadinessBrobotAction[];
  casePrepContext: StudentCasePrepContext;
  relatedTopics: CurriculumTopic[];
  nextRecommendedTopic?: CurriculumRecommendation;
  nextTopicId?: string;
  launchContext: CaseReadinessLaunchContext;
};

type ObjectiveBuildContext = {
  topic: CurriculumTopic;
  track: CurriculumTrack;
  mode: StudyMode;
  selectedMinutes: number;
  fastTemplate: FastStudyTemplate;
  deepTemplate: DeepStudyTemplate;
};

type ObjectiveConfig = {
  id: string;
  objectiveKind: CaseReadinessObjectiveKind;
  title: string;
  description: string;
  bullets: string[];
  pearl?: string;
  commonMistake?: string;
  sourceFields: CaseReadinessSourceField[];
  estimatedMinutes?: number;
  completionLabel?: string;
};

const DEFAULT_MINUTES_BY_MODE: Record<StudyMode, number> = {
  fast: 15,
  deep: 45,
};

const OBJECTIVE_WEIGHTS: Record<CaseReadinessObjectiveKind, number> = {
  injury: 1,
  anatomy: 1,
  imaging: 1,
  indication: 1,
  caseFlow: 2,
  complications: 1,
  residentQuestions: 1,
  tomorrowFocus: 1,
};

function compactList(values: Array<string | undefined>, limit: number): string[] {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, limit);
}

function summarizeCaseNames(topic: CurriculumTopic, limit: number): string[] {
  return topic.commonCases
    .slice(0, limit)
    .map((curriculumCase) => curriculumCase.name.trim())
    .filter(Boolean);
}

function estimateObjectiveMinutes(
  selectedMinutes: number,
  objectiveKind: CaseReadinessObjectiveKind
) {
  const totalWeight = Object.values(OBJECTIVE_WEIGHTS).reduce(
    (sum, value) => sum + value,
    0
  );

  return Math.max(
    1,
    Math.round((selectedMinutes * OBJECTIVE_WEIGHTS[objectiveKind]) / totalWeight)
  );
}

function getObjectivePearl(
  deepTemplate: DeepStudyTemplate,
  index = 0
): string | undefined {
  return deepTemplate.boardPearls[index]?.trim() || undefined;
}

function getNeutralCommonMistake(
  objectiveKind: CaseReadinessObjectiveKind
): string | undefined {
  switch (objectiveKind) {
    case "injury":
      return "Do not move on until you can explain the problem in one clean sentence.";
    case "anatomy":
      return "Do not try to memorize every structure. Focus on landmarks that change the exam, image read, or case discussion.";
    case "imaging":
      return "Do not stop at naming the study. Be ready to say what finding matters.";
    case "indication":
      return "Do not list treatments before you can explain why the team is choosing this path.";
    case "caseFlow":
      return "Do not chase every technical detail. Stay oriented to the purpose of each phase.";
    case "complications":
      return "Do not memorize a long list. Focus on the pitfalls most likely to change what the team watches.";
    case "residentQuestions":
      return "Do not prepare only definitions. Prepare short explanations you can say out loud.";
    case "tomorrowFocus":
      return "Do not walk in trying to know everything. Walk in knowing what you want to notice.";
    default:
      return undefined;
  }
}

function getObjectiveCompletionLabel(
  objectiveKind: CaseReadinessObjectiveKind
): string {
  switch (objectiveKind) {
    case "injury":
      return "I can explain the problem";
    case "anatomy":
      return "I can point out the anatomy";
    case "imaging":
      return "I can read the key imaging";
    case "indication":
      return "I can explain the treatment logic";
    case "caseFlow":
      return "I can follow the case flow";
    case "complications":
      return "I can name the main pitfalls";
    case "residentQuestions":
      return "I can answer the common questions";
    case "tomorrowFocus":
      return "I know what to watch tomorrow";
  }
}

function buildPromptEnvelope(params: {
  topic: CurriculumTopic;
  track: CurriculumTrack;
  studyMode: StudyMode;
  selectedMinutes: number;
  objective: Pick<
    CaseReadinessObjective,
    "objectiveKind" | "title" | "bullets" | "pearl" | "commonMistake"
  >;
  exactAsk: string;
}) {
  const bulletBlock = params.objective.bullets
    .map((bullet) => `- ${bullet}`)
    .join("\n");
  const pearlLine = params.objective.pearl
    ? `Pearl: ${params.objective.pearl}\n`
    : "";
  const mistakeLine = params.objective.commonMistake
    ? `Common mistake: ${params.objective.commonMistake}\n`
    : "";

  return [
    `You are helping an MS4 / medical student on orthopaedics prepare for tomorrow's case.`,
    `Topic: ${params.topic.title}`,
    `Track: ${params.track.title}`,
    `Subspecialty: ${params.topic.subspecialty}`,
    `Study mode: ${params.studyMode}`,
    `Selected study time: ${params.selectedMinutes} minutes`,
    `Objective: ${params.objective.title}`,
    `Objective kind: ${params.objective.objectiveKind}`,
    `Current objective bullets:`,
    bulletBlock,
    pearlLine ? pearlLine.trimEnd() : undefined,
    mistakeLine ? mistakeLine.trimEnd() : undefined,
    params.exactAsk,
    `Stay tightly scoped to this objective. Do not switch into a broad topic overview unless explicitly needed to answer this objective.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildBrobotActions(params: {
  topic: CurriculumTopic;
  track: CurriculumTrack;
  studyMode: StudyMode;
  selectedMinutes: number;
  objective: Pick<
    CaseReadinessObjective,
    "objectiveKind" | "title" | "bullets" | "pearl" | "commonMistake"
  >;
}): CaseReadinessBrobotAction[] {
  const responseDepth =
    params.studyMode === "deep" ? "deep" : "standard";
  const quickDepth =
    params.studyMode === "deep" ? "standard" : "quick";
  const casePrepMode =
    params.objective.objectiveKind === "anatomy" ? "general" : "or_prep";

  return [
    {
      label: "Explain More",
      actionKind: params.objective.objectiveKind === "anatomy"
        ? "anatomy"
        : "explain",
      brobotMode: casePrepMode,
      responseDepth,
      studyMode: params.studyMode,
      selectedMinutes: params.selectedMinutes,
      objectiveKind: params.objective.objectiveKind,
      prompt: buildPromptEnvelope({
        topic: params.topic,
        track: params.track,
        studyMode: params.studyMode,
        selectedMinutes: params.selectedMinutes,
        objective: params.objective,
        exactAsk:
          "Explain this objective only. Keep it concise, clinically useful, and focused on what the student should understand before tomorrow.",
      }),
    },
    {
      label: "Quiz Me",
      actionKind: "quiz",
      brobotMode: casePrepMode,
      responseDepth: quickDepth,
      studyMode: params.studyMode,
      selectedMinutes: params.selectedMinutes,
      objectiveKind: params.objective.objectiveKind,
      prompt: buildPromptEnvelope({
        topic: params.topic,
        track: params.track,
        studyMode: params.studyMode,
        selectedMinutes: params.selectedMinutes,
        objective: params.objective,
        exactAsk:
          "Ask 3 to 5 short questions based only on this objective. Start with the highest-yield question first and wait for my answers if the chat flow allows it.",
      }),
    },
    {
      label: params.objective.objectiveKind === "caseFlow"
        ? "Walk Me Through It"
        : params.objective.objectiveKind === "anatomy"
          ? "Show Anatomy"
          : "Ask BroBot",
      actionKind: params.objective.objectiveKind === "caseFlow"
        ? "caseFlow"
        : params.objective.objectiveKind === "anatomy"
          ? "anatomy"
          : "ask",
      brobotMode: casePrepMode,
      responseDepth: quickDepth,
      studyMode: params.studyMode,
      selectedMinutes: params.selectedMinutes,
      objectiveKind: params.objective.objectiveKind,
      prompt: buildPromptEnvelope({
        topic: params.topic,
        track: params.track,
        studyMode: params.studyMode,
        selectedMinutes: params.selectedMinutes,
        objective: params.objective,
        exactAsk:
          "Help me clarify exactly what I still need to know for this objective before tomorrow. Keep the answer scoped to this objective and end with the one thing I should pay attention to next.",
      }),
    },
  ];
}

function buildObjective(
  context: ObjectiveBuildContext,
  config: ObjectiveConfig
): CaseReadinessObjective {
  const objective: CaseReadinessObjective = {
    ...config,
    mode: context.mode,
    estimatedMinutes:
      config.estimatedMinutes ??
      estimateObjectiveMinutes(context.selectedMinutes, config.objectiveKind),
    completionLabel:
      config.completionLabel ??
      getObjectiveCompletionLabel(config.objectiveKind),
    brobotActions: [],
  };

  objective.brobotActions = buildBrobotActions({
    topic: context.topic,
    track: context.track,
    studyMode: context.mode,
    selectedMinutes: context.selectedMinutes,
    objective,
  });

  return objective;
}

function buildFastObjectives(context: ObjectiveBuildContext) {
  const { topic, fastTemplate, deepTemplate } = context;
  const commonCases = summarizeCaseNames(topic, 2);

  return [
    buildObjective(context, {
      id: "explain-injury",
      objectiveKind: "injury",
      title: "Explain the injury or diagnosis",
      description: "Be able to say what this is and why the team cares about it before tomorrow.",
      bullets: compactList(
        [
          fastTemplate.oneLiner,
          fastTemplate.mustKnow[0],
          topic.learningObjectives[0]?.objective,
        ],
        3
      ),
      pearl: getObjectivePearl(deepTemplate, 0),
      commonMistake: getNeutralCommonMistake("injury"),
      sourceFields: ["oneLiner", "mustKnow", "learningObjectives", "boardPearls"],
    }),
    buildObjective(context, {
      id: "must-see-anatomy",
      objectiveKind: "anatomy",
      title: "Know the must-see anatomy",
      description: "Know the anatomy landmarks you should be able to point out or mention.",
      bullets: compactList(fastTemplate.anatomyFocus, 3),
      pearl: getObjectivePearl(deepTemplate, 0),
      commonMistake: getNeutralCommonMistake("anatomy"),
      sourceFields: ["anatomyFocus", "boardPearls"],
    }),
    buildObjective(context, {
      id: "read-imaging",
      objectiveKind: "imaging",
      title: "Read the key imaging",
      description: "Know the study and the finding you should be ready to describe.",
      bullets: compactList(
        [
          deepTemplate.imaging[0],
          deepTemplate.imaging[1],
          "Use this section to identify the one finding that changes what the team does next.",
        ],
        3
      ),
      commonMistake: getNeutralCommonMistake("imaging"),
      sourceFields: ["imaging"],
    }),
    buildObjective(context, {
      id: "treatment-needed",
      objectiveKind: "indication",
      title: "Explain why treatment is needed",
      description: "Be able to give the one-sentence reason the current plan makes sense.",
      bullets: compactList(
        [
          deepTemplate.decisionMaking[0],
          deepTemplate.decisionMaking[1],
          "Focus on the treatment rationale, not a full treatment menu.",
        ],
        3
      ),
      commonMistake: getNeutralCommonMistake("indication"),
      sourceFields: ["decisionMaking"],
    }),
    buildObjective(context, {
      id: "walk-through-case",
      objectiveKind: "caseFlow",
      title: "Walk through the case",
      description: "Know the 3 to 4 steps you should follow in clinic or the OR.",
      bullets: compactList(
        [...fastTemplate.caseSteps, fastTemplate.orSurvivalTips[0]],
        4
      ),
      commonMistake: getNeutralCommonMistake("caseFlow"),
      sourceFields: ["caseSteps", "orSurvivalTips"],
    }),
    buildObjective(context, {
      id: "what-can-go-wrong",
      objectiveKind: "complications",
      title: "Know what can go wrong",
      description: "Know the one or two pitfalls that should stay in your head tomorrow.",
      bullets: compactList(deepTemplate.complications, 2),
      pearl: getObjectivePearl(deepTemplate, 1),
      commonMistake: getNeutralCommonMistake("complications"),
      sourceFields: ["complications", "boardPearls"],
    }),
    buildObjective(context, {
      id: "resident-questions",
      objectiveKind: "residentQuestions",
      title: "Answer common resident questions",
      description: "Be ready for the first questions a resident is likely to ask.",
      bullets: compactList(fastTemplate.pimpQuestions, 3),
      commonMistake: getNeutralCommonMistake("residentQuestions"),
      sourceFields: ["pimpQuestions"],
    }),
    buildObjective(context, {
      id: "watch-tomorrow",
      objectiveKind: "tomorrowFocus",
      title: "Know what to watch tomorrow",
      description: "Know what to notice in real time so the case reinforces what you studied.",
      bullets: compactList(
        [
          ...fastTemplate.orSurvivalTips,
          commonCases[0]
            ? `If this turns into a common case like ${commonCases.join(" or ")}, notice how the team frames the problem and next step.`
            : undefined,
        ],
        3
      ),
      commonMistake: getNeutralCommonMistake("tomorrowFocus"),
      sourceFields: ["orSurvivalTips", "commonCases"],
    }),
  ];
}

function buildDeepObjectives(context: ObjectiveBuildContext) {
  const { topic, fastTemplate, deepTemplate } = context;
  const commonCases = summarizeCaseNames(topic, 2);

  return [
    buildObjective(context, {
      id: "explain-injury",
      objectiveKind: "injury",
      title: "Explain the injury or diagnosis",
      description: "Be able to orient yourself to the case and explain the clinical problem clearly.",
      bullets: compactList(
        [
          deepTemplate.overviewPrompt,
          fastTemplate.oneLiner,
          topic.learningObjectives[0]?.objective,
        ],
        3
      ),
      pearl: getObjectivePearl(deepTemplate, 0),
      commonMistake: getNeutralCommonMistake("injury"),
      sourceFields: ["oneLiner", "learningObjectives", "boardPearls"],
    }),
    buildObjective(context, {
      id: "must-see-anatomy",
      objectiveKind: "anatomy",
      title: "Know the must-see anatomy",
      description: "Know the anatomy that matters for exam, imaging, and the procedure discussion.",
      bullets: compactList(
        [...deepTemplate.anatomy, ...fastTemplate.anatomyFocus],
        5
      ),
      pearl: getObjectivePearl(deepTemplate, 0),
      commonMistake: getNeutralCommonMistake("anatomy"),
      sourceFields: ["anatomy", "anatomyFocus", "boardPearls"],
    }),
    buildObjective(context, {
      id: "read-imaging",
      objectiveKind: "imaging",
      title: "Read the key imaging",
      description: "Know how imaging supports the diagnosis and how it shapes the next decision.",
      bullets: compactList(
        [...deepTemplate.imaging, ...deepTemplate.classification],
        5
      ),
      commonMistake: getNeutralCommonMistake("imaging"),
      sourceFields: ["imaging", "classification"],
    }),
    buildObjective(context, {
      id: "treatment-needed",
      objectiveKind: "indication",
      title: "Explain why treatment is needed",
      description: "Know the decision-making logic and the main operative versus nonoperative fork.",
      bullets: compactList(
        [
          ...deepTemplate.decisionMaking,
          ...deepTemplate.treatmentOptions,
        ],
        5
      ),
      pearl: getObjectivePearl(deepTemplate, 1),
      commonMistake: getNeutralCommonMistake("indication"),
      sourceFields: ["decisionMaking", "treatmentOptions", "boardPearls"],
    }),
    buildObjective(context, {
      id: "walk-through-case",
      objectiveKind: "caseFlow",
      title: "Walk through the case",
      description: "Know the flow well enough to follow what the team is doing and why.",
      bullets: compactList(
        [
          ...fastTemplate.caseSteps,
          ...deepTemplate.surgicalApproach,
        ],
        5
      ),
      commonMistake: getNeutralCommonMistake("caseFlow"),
      sourceFields: ["caseSteps", "surgicalApproach"],
    }),
    buildObjective(context, {
      id: "what-can-go-wrong",
      objectiveKind: "complications",
      title: "Know what can go wrong",
      description: "Know the important complications and the pitfalls the team is trying to avoid.",
      bullets: compactList(deepTemplate.complications, 4),
      pearl: getObjectivePearl(deepTemplate, 2) ?? getObjectivePearl(deepTemplate, 1),
      commonMistake: getNeutralCommonMistake("complications"),
      sourceFields: ["complications", "boardPearls"],
    }),
    buildObjective(context, {
      id: "resident-questions",
      objectiveKind: "residentQuestions",
      title: "Answer common resident questions",
      description: "Be ready for both the high-yield questions and the tougher follow-up questions.",
      bullets: compactList(
        [...fastTemplate.pimpQuestions, ...deepTemplate.selfCheckQuestions],
        5
      ),
      commonMistake: getNeutralCommonMistake("residentQuestions"),
      sourceFields: ["pimpQuestions", "selfCheckQuestions"],
    }),
    buildObjective(context, {
      id: "watch-tomorrow",
      objectiveKind: "tomorrowFocus",
      title: "Know what to watch tomorrow",
      description: "Know what to pay attention to so the live case deepens your understanding.",
      bullets: compactList(
        [
          ...fastTemplate.orSurvivalTips,
          commonCases[0]
            ? `If this case looks like ${commonCases.join(" or ")}, pay attention to how imaging, anatomy, and the final plan connect.`
            : undefined,
          "Use this section to identify what you still need to clarify before the case.",
        ],
        4
      ),
      commonMistake: getNeutralCommonMistake("tomorrowFocus"),
      sourceFields: ["orSurvivalTips", "commonCases"],
    }),
  ];
}

export function resolveCaseReadinessMinutes(
  mode: StudyMode,
  requestedMinutes?: number
) {
  if (requestedMinutes === 5 || requestedMinutes === 15 || requestedMinutes === 45 || requestedMinutes === 90) {
    return requestedMinutes;
  }

  return DEFAULT_MINUTES_BY_MODE[mode];
}

export function buildCaseReadinessSession(
  topicId: string,
  mode: StudyMode,
  options?: {
    selectedMinutes?: number;
    completedTopicIds?: string[];
    casePrepContext?: StudentCasePrepContext;
  }
): CaseReadinessSession | null {
  const topic = getTopicById(topicId);
  if (!topic) {
    return null;
  }

  const track = getTrackById(topic.trackId);
  if (!track) {
    return null;
  }

  const fastTemplate = getStudyTemplate(topicId, "fast") ?? topic.fastStudyTemplate;
  const deepTemplate = getStudyTemplate(topicId, "deep") ?? topic.deepStudyTemplate;
  const selectedMinutes = resolveCaseReadinessMinutes(mode, options?.selectedMinutes);
  const relatedTopics = getRelatedTopics(topicId).slice(0, 4);
  const completedTopicIds = options?.completedTopicIds ?? [];
  const nextRecommendedTopic = getRecommendedNextTopics({
    currentTopicId: topicId,
    trackId: topic.trackId,
    completedTopicIds,
    limit: 1,
  })[0];
  const casePrepContext =
    options?.casePrepContext ?? {
      status: "unavailable" as const,
      slug: null,
      title: null,
      message:
        "Certified CasePrep content is unavailable for this topic. This session uses the student curriculum templates.",
      sections: [],
    };
  const context: ObjectiveBuildContext = {
    topic,
    track,
    mode,
    selectedMinutes,
    fastTemplate,
    deepTemplate,
  };

  const relatedTopicTitles = new Map(
    relatedTopics.map((t) => [t.id, t.title])
  );

  const survivalSections = buildSurvivalSections({
    topic,
    fastTemplate,
    deepTemplate,
    certifiedSections: casePrepContext.sections,
    relatedTopicTitles,
  });

  return {
    topic,
    track,
    mode,
    estimatedMinutes: selectedMinutes,
    selectedMinutes,
    title: topic.title,
    subtitle:
      mode === "deep"
        ? `Deep readiness for a ${selectedMinutes}-minute study block. Focus on decision-making, case flow, and what will be hardest to explain tomorrow.`
        : `Fast readiness for a ${selectedMinutes}-minute survival-prep pass. Focus on the one-liner, anatomy, imaging, treatment rationale, and what to watch tomorrow.`,
    objectives:
      mode === "deep"
        ? buildDeepObjectives(context)
        : buildFastObjectives(context),
    survivalSections,
    topicBrobotActions: buildTopicBrobotActions({
      topic,
      track,
      studyMode: mode,
      selectedMinutes,
    }),
    casePrepContext,
    relatedTopics,
    nextRecommendedTopic,
    nextTopicId: nextRecommendedTopic?.topic.id,
    launchContext: {
      selectedMinutes,
    },
  };
}
