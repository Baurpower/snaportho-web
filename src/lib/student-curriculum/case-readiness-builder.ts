import {
  getRecommendedNextTopics,
  getRelatedTopics,
  getStudyTemplate,
  getTopicById,
  getTrackById,
} from "@/lib/student-curriculum/curriculum-recommendations";
import type { StudentCasePrepContext } from "@/lib/student-curriculum/student-caseprep-context";
import type {
  CurriculumRecommendation,
  CurriculumTopic,
  CurriculumTrack,
  DeepStudyTemplate,
  FastStudyTemplate,
  StudyMode,
} from "@/lib/student-curriculum/curriculum-types";

export const STUDY_GUIDE_TOPIC_TYPES = [
  "basic-science",
  "anatomy",
  "pathology",
  "trauma",
  "clinic",
  "procedure",
  "implant",
  "approach",
  "rehabilitation",
] as const;

export type StudyGuideTopicType = (typeof STUDY_GUIDE_TOPIC_TYPES)[number];

export const STUDY_GUIDE_SECTION_KINDS = [
  "biology",
  "recognition",
  "anatomy",
  "imaging",
  "classification",
  "decision-making",
  "case-flow",
  "technique",
  "exposure",
  "implants",
  "failure-modes",
  "examination",
  "diagnostics",
  "treatment",
  "rehabilitation",
  "complications",
  "next-steps",
] as const;

export type StudyGuideSectionKind = (typeof STUDY_GUIDE_SECTION_KINDS)[number];

export const STUDY_GUIDE_IMPORTANCE_LEVELS = [
  "must-know",
  "core",
  "stretch",
] as const;

export type StudyGuideImportance = (typeof STUDY_GUIDE_IMPORTANCE_LEVELS)[number];

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
  objectiveKind: StudyGuideSectionKind;
};

export const STUDY_GUIDE_BLOCK_KINDS = [
  "key-concepts",
  "recognize",
  "say-out-loud",
  "application",
  "common-confusion",
  "numbers-classifications",
  "self-check",
] as const;

export type StudyGuideBlockKind = (typeof STUDY_GUIDE_BLOCK_KINDS)[number];

export type StudyGuideContentBlock = {
  kind: StudyGuideBlockKind;
  title: string;
  items: string[];
};

export type StudyGuideSection = {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  learningObjective: string;
  content: StudyGuideContentBlock[];
  importance: StudyGuideImportance;
  sectionKind: StudyGuideSectionKind;
  guideType: StudyGuideTopicType;
  completionLabel: string;
  brobotActions: CaseReadinessBrobotAction[];
  sourceFields: CaseReadinessSourceField[];
  mode: StudyMode;
};

export type CaseReadinessObjective = StudyGuideSection;
export type CaseReadinessObjectiveKind = StudyGuideSectionKind;

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
  guideType: StudyGuideTopicType;
  objectives: StudyGuideSection[];
  studyGuideSections: StudyGuideSection[];
  casePrepContext: StudentCasePrepContext;
  relatedTopics: CurriculumTopic[];
  nextRecommendedTopic?: CurriculumRecommendation;
  nextTopicId?: string;
  launchContext: CaseReadinessLaunchContext;
};

type GuideBuildContext = {
  topic: CurriculumTopic;
  track: CurriculumTrack;
  mode: StudyMode;
  selectedMinutes: number;
  fastTemplate: FastStudyTemplate;
  deepTemplate: DeepStudyTemplate;
  guideType: StudyGuideTopicType;
};

type SectionConfig = {
  id: string;
  sectionKind: StudyGuideSectionKind;
  title: string;
  description: string;
  learningObjective: string;
  content?: string[];
  blocks?: StudyGuideContentBlock[];
  importance?: StudyGuideImportance;
  sourceFields: CaseReadinessSourceField[];
  completionLabel?: string;
};

const DEFAULT_MINUTES_BY_MODE: Record<StudyMode, number> = {
  fast: 15,
  deep: 45,
};

const IMPORTANCE_WEIGHTS: Record<StudyGuideImportance, number> = {
  "must-know": 2,
  core: 1,
  stretch: 0.75,
};

function compactList(values: Array<string | undefined>, limit: number): string[] {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, limit);
}

function block(
  kind: StudyGuideBlockKind,
  title: string,
  items: Array<string | undefined>
): StudyGuideContentBlock {
  return {
    kind,
    title,
    items: compactList(items, 8),
  };
}

function blocksHaveContent(blocks: StudyGuideContentBlock[] | undefined): boolean {
  return Boolean(blocks?.some((contentBlock) => contentBlock.items.length > 0));
}

function defaultBlocks(items: string[] | undefined): StudyGuideContentBlock[] {
  return items && items.length > 0
    ? [block("key-concepts", "Key concepts", items)]
    : [];
}

function splitDelimited(items: string[]): string[] {
  return items.flatMap((item) =>
    item
      .split(/[,;]/)
      .map((section) => section.trim())
      .filter(Boolean)
  );
}

function includesAny(value: string, fragments: string[]): boolean {
  const lower = value.toLowerCase();
  return fragments.some((fragment) => lower.includes(fragment));
}

function topicText(topic: CurriculumTopic): string {
  return [
    topic.id,
    topic.title,
    topic.trackId,
    topic.subspecialty,
    ...topic.tags,
    ...topic.aliases,
  ]
    .join(" ")
    .toLowerCase();
}

export function detectStudyGuideTopicType(topic: CurriculumTopic): StudyGuideTopicType {
  const text = topicText(topic);

  if (includesAny(text, ["fracture healing", "bone remodeling", "biology", "osteoblast", "osteoclast", "callus"])) {
    return "basic-science";
  }

  if (includesAny(text, ["approach", "exposure"])) {
    return "approach";
  }

  if (includesAny(text, ["implant", "stem fixation", "femoral stem", "component", "arthroplasty"])) {
    return "implant";
  }

  if (includesAny(text, ["rehab", "rehabilitation", "therapy", "sprain", "postoperative protocol"])) {
    return "rehabilitation";
  }

  if (includesAny(text, ["fracture", "dislocation", "trauma", "compartment", "open injury"])) {
    return "trauma";
  }

  if (includesAny(text, ["release", "repair", "orif", "fixation", "reconstruction", "debridement", "osteotomy", "fusion"])) {
    return "procedure";
  }

  if (includesAny(text, ["syndrome", "infection", "tumor", "arthritis", "oa", "disease", "pathology"])) {
    return "clinic";
  }

  if (includesAny(text, ["anatomy", "nerve", "artery", "plexus", "muscle", "tendon"])) {
    return "anatomy";
  }

  return "pathology";
}

function estimateSectionMinutes(params: {
  selectedMinutes: number;
  totalWeight: number;
  importance: StudyGuideImportance;
  remainingMinutes: number;
  isLast: boolean;
}) {
  if (params.isLast) {
    return Math.max(1, params.remainingMinutes);
  }

  return Math.max(
    1,
    Math.round(
      (params.selectedMinutes * IMPORTANCE_WEIGHTS[params.importance]) /
        params.totalWeight
    )
  );
}

function buildPromptEnvelope(params: {
  topic: CurriculumTopic;
  track: CurriculumTrack;
  studyMode: StudyMode;
  selectedMinutes: number;
  section: Pick<
    StudyGuideSection,
    "sectionKind" | "title" | "learningObjective" | "content" | "importance" | "guideType"
  >;
  exactAsk: string;
}) {
  const contentBlock = params.section.content
    .map((contentBlock) => {
      const items = contentBlock.items.map((item) => `  - ${item}`).join("\n");
      return `${contentBlock.title}:\n${items}`;
    })
    .join("\n");

  return [
    "You are helping an MS4 / medical student on orthopaedics prepare for tomorrow.",
    `Topic: ${params.topic.title}`,
    `Track: ${params.track.title}`,
    `Subspecialty: ${params.topic.subspecialty}`,
    `Guide type: ${params.section.guideType}`,
    `Study mode: ${params.studyMode}`,
    `Selected study time: ${params.selectedMinutes} minutes`,
    `Study guide section: ${params.section.title}`,
    `Section kind: ${params.section.sectionKind}`,
    `Importance: ${params.section.importance}`,
    `Learning objective: ${params.section.learningObjective}`,
    "Current section content:",
    contentBlock,
    params.exactAsk,
    "Stay tightly scoped to this study guide section. Teach what would make the learner noticeably better tomorrow.",
  ].join("\n");
}

function buildBrobotActions(params: {
  topic: CurriculumTopic;
  track: CurriculumTrack;
  studyMode: StudyMode;
  selectedMinutes: number;
  section: StudyGuideSection;
}): CaseReadinessBrobotAction[] {
  const responseDepth = params.studyMode === "deep" ? "deep" : "standard";
  const quickDepth = params.studyMode === "deep" ? "standard" : "quick";
  const brobotMode =
    params.section.guideType === "clinic"
      ? "clinic"
      : params.section.guideType === "anatomy" || params.section.sectionKind === "anatomy"
        ? "general"
        : "or_prep";
  const actionKind =
    params.section.sectionKind === "anatomy"
      ? "anatomy"
      : params.section.sectionKind === "case-flow" || params.section.sectionKind === "technique"
        ? "caseFlow"
        : "explain";

  return [
    {
      label: `Explain ${params.section.title}`,
      actionKind,
      brobotMode,
      responseDepth,
      studyMode: params.studyMode,
      selectedMinutes: params.selectedMinutes,
      objectiveKind: params.section.sectionKind,
      prompt: buildPromptEnvelope({
        topic: params.topic,
        track: params.track,
        studyMode: params.studyMode,
        selectedMinutes: params.selectedMinutes,
        section: params.section,
        exactAsk:
          "Explain this section only. Keep it concise, clinically useful, and focused on tomorrow's study needs.",
      }),
    },
    {
      label: `Quiz me on ${params.section.title}`,
      actionKind: "quiz",
      brobotMode,
      responseDepth: quickDepth,
      studyMode: params.studyMode,
      selectedMinutes: params.selectedMinutes,
      objectiveKind: params.section.sectionKind,
      prompt: buildPromptEnvelope({
        topic: params.topic,
        track: params.track,
        studyMode: params.studyMode,
        selectedMinutes: params.selectedMinutes,
        section: params.section,
        exactAsk:
          "Ask 3 to 5 short questions based only on this section. Start with recognition, then explanation, then application.",
      }),
    },
    {
      label:
        params.section.sectionKind === "case-flow" || params.section.sectionKind === "technique"
          ? `Walk through ${params.section.title}`
          : params.section.sectionKind === "anatomy"
            ? `Review anatomy for ${params.section.title}`
            : `Deep dive: ${params.section.title}`,
      actionKind:
        params.section.sectionKind === "case-flow" || params.section.sectionKind === "technique"
          ? "caseFlow"
          : params.section.sectionKind === "anatomy"
            ? "anatomy"
            : "ask",
      brobotMode,
      responseDepth: quickDepth,
      studyMode: params.studyMode,
      selectedMinutes: params.selectedMinutes,
      objectiveKind: params.section.sectionKind,
      prompt: buildPromptEnvelope({
        topic: params.topic,
        track: params.track,
        studyMode: params.studyMode,
        selectedMinutes: params.selectedMinutes,
        section: params.section,
        exactAsk:
          "Help me clarify what I still need to know for this section before tomorrow. End with the one mistake I should avoid.",
      }),
    },
  ];
}

function buildSections(context: GuideBuildContext, configs: SectionConfig[]): StudyGuideSection[] {
  const activeConfigs = configs.filter(
    (config) => blocksHaveContent(config.blocks) || (config.content?.length ?? 0) > 0
  );
  const totalWeight = activeConfigs.reduce(
    (sum, config) => sum + IMPORTANCE_WEIGHTS[config.importance ?? "core"],
    0
  );
  let remainingMinutes = context.selectedMinutes;

  return activeConfigs.map((config, index) => {
      const importance = config.importance ?? "core";
      const estimatedMinutes = estimateSectionMinutes({
        selectedMinutes: context.selectedMinutes,
        totalWeight,
        importance,
        remainingMinutes,
        isLast: index === activeConfigs.length - 1,
      });
      remainingMinutes -= estimatedMinutes;
      const content = config.blocks ?? defaultBlocks(config.content);
      const section: StudyGuideSection = {
        id: config.id,
        title: config.title,
        description: config.description,
        estimatedMinutes,
        learningObjective: config.learningObjective,
        content,
        importance,
        sectionKind: config.sectionKind,
        guideType: context.guideType,
        completionLabel:
          config.completionLabel ??
          `I can explain ${config.title.toLowerCase()}`,
        brobotActions: [],
        sourceFields: config.sourceFields,
        mode: context.mode,
      };

      section.brobotActions = buildBrobotActions({
        topic: context.topic,
        track: context.track,
        studyMode: context.mode,
        selectedMinutes: context.selectedMinutes,
        section,
      });

      return section;
    });
}

function learningObjectives(topic: CurriculumTopic, limit = 3): string[] {
  return compactList(topic.learningObjectives.map((objective) => objective.objective), limit);
}

function topicSectionId(topic: CurriculumTopic, semanticId: string): string {
  return `${topic.id}__${semanticId}`;
}

function buildTopicSpecificGuide(context: GuideBuildContext): StudyGuideSection[] | null {
  const { topic } = context;

  switch (topic.id) {
    case "fracture-healing":
      return buildSections(context, [
        {
          id: topicSectionId(topic, "primary-vs-secondary-healing"),
          sectionKind: "classification",
          title: "Distinguish primary from secondary bone healing",
          description: "This is the language that connects fixation stability to what kind of healing you expect to see.",
          learningObjective: "Explain when fracture healing occurs with direct remodeling versus callus formation.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Primary healing occurs with very low strain and stable compression; there is little visible callus.",
              "Secondary healing occurs with relative stability; callus bridges the fracture through staged repair.",
              "The fixation construct changes the biology you expect to see on follow-up films.",
            ]),
            block("say-out-loud", "What to say out loud", [
              "Primary healing is direct bone remodeling across a stable fracture gap.",
              "Secondary healing uses callus because controlled motion stimulates endochondral repair.",
            ]),
            block("common-confusion", "Common confusion", [
              "No callus after rigid compression is not automatically failure; it may reflect primary healing.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["classification", "surgicalApproach", "boardPearls"],
          completionLabel: "I can compare primary and secondary healing",
        },
        {
          id: topicSectionId(topic, "secondary-healing-stages"),
          sectionKind: "biology",
          title: "Sequence the stages of secondary healing",
          description: "The stages explain why fracture appearance and mechanical strength change over time.",
          learningObjective: "Describe inflammation, soft callus, hard callus, and remodeling in order.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Inflammation recruits cells and creates the early repair environment.",
              "Soft callus provides early bridging but is not mechanically mature.",
              "Hard callus mineralizes and increases stability.",
              "Remodeling reshapes bone along stress over months to years.",
            ]),
            block("recognize", "What to recognize", [
              "Early x-rays may lag behind symptoms and biology.",
              "Bridging callus across cortices is more reassuring than callus in only one view.",
            ]),
            block("self-check", "Self-check question", [
              "Why might a fracture feel better before the x-ray looks fully healed?",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["mustKnow", "imaging", "learningObjectives"],
          completionLabel: "I can sequence secondary healing",
        },
        {
          id: topicSectionId(topic, "mechanical-strain-environment"),
          sectionKind: "decision-making",
          title: "Explain why excessive strain prevents bone formation",
          description: "Mechanical environment is the bridge between fracture biology and fixation decisions.",
          learningObjective: "Connect stability, gap size, and interfragmentary strain to union or nonunion.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Bone formation tolerates less strain than fibrous tissue.",
              "Large gaps and unstable constructs can keep strain too high for mineralized callus.",
              "Relative stability is useful when motion is controlled, not uncontrolled.",
            ]),
            block("application", "Clinical application", [
              "Hypertrophic nonunion suggests biology is present but stability is inadequate.",
              "Atrophic nonunion suggests biology, blood supply, or infection must be addressed.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["decisionMaking", "treatmentOptions", "complications"],
          completionLabel: "I can connect strain to union",
        },
        {
          id: topicSectionId(topic, "delayed-union-nonunion-malunion"),
          sectionKind: "failure-modes",
          title: "Recognize delayed union, nonunion, and malunion",
          description: "These failure states are the clinical reason fracture-healing biology matters.",
          learningObjective: "Define the major healing failure states and the first question each should trigger.",
          blocks: [
            block("recognize", "What to recognize", [
              "Delayed union means healing is slower than expected but still progressing.",
              "Nonunion means progression has stalled and needs a mechanical or biologic explanation.",
              "Malunion means the fracture healed in an unacceptable position.",
            ]),
            block("say-out-loud", "What to say out loud", [
              "For nonunion, ask whether the problem is stability, biology, infection, or host factors.",
            ]),
            block("self-check", "Self-check question", [
              "Which is more likely to need improved stability: hypertrophic or atrophic nonunion?",
            ]),
          ],
          importance: "core",
          sourceFields: ["complications", "decisionMaking", "selfCheckQuestions"],
          completionLabel: "I can recognize healing failure states",
        },
      ]);

    case "bone-remodeling":
      return buildSections(context, [
        {
          id: topicSectionId(topic, "osteoblast-osteoclast-coupling"),
          sectionKind: "biology",
          title: "Explain osteoblast and osteoclast coupling",
          description: "Remodeling is easier to understand when formation and resorption are linked instead of memorized separately.",
          learningObjective: "Describe how osteoclast resorption and osteoblast formation reshape bone.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Osteoclasts resorb bone; osteoblasts form osteoid and mineralize new bone.",
              "Remodeling replaces old or stressed bone while preserving overall structure.",
              "Turnover is influenced by load, hormones, age, and biology.",
            ]),
            block("self-check", "Self-check question", [
              "What cell resorbs bone?",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["mustKnow", "anatomy", "selfCheckQuestions"],
          completionLabel: "I can explain cellular remodeling",
        },
        {
          id: topicSectionId(topic, "wolff-law-load-adaptation"),
          sectionKind: "decision-making",
          title: "Apply Wolff law to loading and stress",
          description: "This turns an abstract basic-science idea into something useful in clinic and fracture care.",
          learningObjective: "Explain how bone adapts to mechanical load and reduced load.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Bone strengthens along repeated stress and weakens when load is removed.",
              "Alignment and load direction influence how remodeling appears over time.",
              "Remodeling is powerful in children but limited by age, location, and deformity plane.",
            ]),
            block("application", "Clinical application", [
              "Stress reaction, pediatric deformity correction, and post-fracture remodeling all use the same load-response concept.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["decisionMaking", "treatmentOptions", "boardPearls"],
          completionLabel: "I can apply Wolff law clinically",
        },
        {
          id: topicSectionId(topic, "remodeling-limitations"),
          sectionKind: "failure-modes",
          title: "Know when remodeling will not rescue alignment",
          description: "Learners often overgeneralize remodeling; this section keeps the concept clinically honest.",
          learningObjective: "Name factors that limit remodeling potential.",
          blocks: [
            block("recognize", "What to recognize", [
              "Older patients remodel less than children.",
              "Deformity near a growing physis remodels more than midshaft deformity.",
              "Rotational deformity is less forgiving than angular deformity.",
            ]),
            block("common-confusion", "Common confusion", [
              "Remodeling does not mean any malalignment can be ignored.",
            ]),
          ],
          importance: "core",
          sourceFields: ["classification", "complications", "boardPearls"],
          completionLabel: "I know remodeling limitations",
        },
      ]);

    case "carpal-tunnel-syndrome":
      return buildSections(context, [
        {
          id: topicSectionId(topic, "classic-symptoms-distribution"),
          sectionKind: "recognition",
          title: "Recognize the median-nerve symptom pattern",
          description: "CTS is usually a clinical diagnosis, so the history has to come first.",
          learningObjective: "Identify classic carpal tunnel symptoms and severity clues.",
          blocks: [
            block("recognize", "What to recognize", [
              "Numbness and paresthesias in the thumb, index, middle, and radial ring finger.",
              "Night symptoms or shaking the hand out are classic.",
              "Thenar weakness or atrophy suggests more advanced compression.",
            ]),
            block("common-confusion", "Common confusion", [
              "Whole-hand numbness, neck pain, or ulnar-sided symptoms should make you consider mimics.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["oneLiner", "mustKnow", "classification"],
          completionLabel: "I can recognize CTS symptoms",
        },
        {
          id: topicSectionId(topic, "focused-exam-provocative-tests"),
          sectionKind: "examination",
          title: "Perform a focused CTS exam",
          description: "The exam should confirm distribution, severity, and alternate diagnoses.",
          learningObjective: "Describe the exam maneuvers and motor findings that matter for CTS.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Check median sensory distribution and compare sides.",
              "Assess thenar bulk and thumb abduction strength.",
              "Use provocative maneuvers as supporting data, not the whole diagnosis.",
            ]),
            block("say-out-loud", "What to say out loud", [
              "I would document sensation, thenar strength/atrophy, and provocative testing, then screen for cervical or ulnar mimics.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["caseSteps", "anatomyFocus", "anatomy"],
          completionLabel: "I can examine CTS",
        },
        {
          id: topicSectionId(topic, "electrodiagnostics-severity"),
          sectionKind: "diagnostics",
          title: "Know when electrodiagnostics help",
          description: "Testing is most useful when the diagnosis is unclear, severity matters, or surgery is being considered.",
          learningObjective: "Explain when EMG/NCS is helpful in CTS workup.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Many classic cases are diagnosed clinically.",
              "Electrodiagnostics can confirm diagnosis, grade severity, and evaluate mimics.",
              "Severe findings or denervation support urgency of decompression.",
            ]),
            block("self-check", "Self-check question", [
              "When would you order EMG before treating CTS?",
            ]),
          ],
          importance: "core",
          sourceFields: ["imaging", "decisionMaking", "selfCheckQuestions"],
          completionLabel: "I can use electrodiagnostics appropriately",
        },
        {
          id: topicSectionId(topic, "operative-indications"),
          sectionKind: "treatment",
          title: "Explain indications for carpal tunnel release",
          description: "Treatment should follow severity, chronicity, and failure of nonoperative care.",
          learningObjective: "Distinguish splinting/injection candidates from patients who need release.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Night splinting is common first-line treatment for mild symptoms.",
              "Injection can be diagnostic and therapeutic in selected patients.",
              "Thenar weakness, atrophy, severe studies, or persistent symptoms despite nonoperative care support release.",
            ]),
            block("say-out-loud", "What to say out loud", [
              "Surgery is to decompress the median nerve by releasing the transverse carpal ligament.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["treatmentOptions", "decisionMaking"],
          completionLabel: "I can explain release indications",
        },
        {
          id: topicSectionId(topic, "release-anatomy-danger-structures"),
          sectionKind: "technique",
          title: "Identify structures released during carpal tunnel surgery",
          description: "You do not need every technical detail, but you should know the target and what must be protected.",
          learningObjective: "Describe the goal of carpal tunnel release and the key structure at risk.",
          blocks: [
            block("application", "Clinical or operative application", [
              "The transverse carpal ligament is released to decompress the median nerve.",
              "The recurrent motor branch is a key danger structure.",
              "Persistent symptoms, pillar pain, and nerve injury are complications to remember.",
            ]),
            block("common-confusion", "Common confusion", [
              "The operation is not a tendon release; the goal is median nerve decompression.",
            ]),
          ],
          importance: "core",
          sourceFields: ["surgicalApproach", "complications", "boardPearls"],
          completionLabel: "I can describe release anatomy",
        },
      ]);

    case "distal-radius-fracture":
      return buildSections(context, [
        {
          id: topicSectionId(topic, "mechanism-pattern-and-exam"),
          sectionKind: "recognition",
          title: "Connect mechanism, deformity, and median nerve exam",
          description: "The first pass should identify the injury pattern and urgent neurovascular issues.",
          learningObjective: "Present the injury mechanism, deformity, and median nerve status clearly.",
          blocks: [
            block("recognize", "What to recognize", [
              "FOOSH mechanism with wrist pain, swelling, deformity, or loss of motion.",
              "Median nerve symptoms can change urgency.",
              "Open injury, skin pressure, and high-energy mechanism should raise concern.",
            ]),
            block("say-out-loud", "What to say out loud", [
              "This is a distal radius fracture; I would document skin, median nerve function, and distal perfusion before and after reduction.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["oneLiner", "mustKnow", "caseSteps"],
          completionLabel: "I can present the initial injury",
        },
        {
          id: topicSectionId(topic, "unstable-radiographic-signs"),
          sectionKind: "imaging",
          title: "Recognize radiographic signs of an unstable distal radius fracture",
          description: "Imaging determines whether reduction, casting, CT, or fixation is likely.",
          learningObjective: "Name the x-ray features that push distal radius fractures toward instability or surgery.",
          blocks: [
            block("recognize", "What to recognize", [
              "Dorsal or volar displacement and loss of radial height, inclination, or volar tilt.",
              "Intra-articular extension or step-off.",
              "Dorsal comminution, DRUJ concerns, or complex articular pattern.",
            ]),
            block("numbers-classifications", "Key numbers or classifications", [
              "Extra-articular versus intra-articular.",
              "Dorsally displaced versus volarly displaced.",
              "CT helps define complex articular injury.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["imaging", "classification", "decisionMaking"],
          completionLabel: "I can identify unstable imaging",
        },
        {
          id: topicSectionId(topic, "reduction-and-splinting-goals"),
          sectionKind: "case-flow",
          title: "State reduction and splinting goals",
          description: "The learner should know the ED priorities before memorizing operative options.",
          learningObjective: "Explain the immediate management steps after diagnosis.",
          blocks: [
            block("application", "Clinical application", [
              "Reduce when displaced or when skin/median nerve status demands it.",
              "Recheck neurovascular status after reduction.",
              "Splint, elevate, encourage finger motion, and arrange follow-up imaging.",
            ]),
            block("common-confusion", "Common confusion", [
              "A splint is not the endpoint; loss of reduction can occur and needs follow-up.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["caseSteps", "treatmentOptions"],
          completionLabel: "I can state initial management",
        },
        {
          id: topicSectionId(topic, "operative-fixation-indications"),
          sectionKind: "decision-making",
          title: "Explain why fixation may be needed",
          description: "Operative indications make more sense when tied to alignment, stability, joint congruity, and patient demand.",
          learningObjective: "Describe the main reasons a distal radius fracture may need fixation.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Unacceptable alignment after reduction.",
              "Unstable pattern likely to redisplace.",
              "Articular incongruity in an active patient.",
              "Median neuropathy or associated injuries can change urgency.",
            ]),
            block("self-check", "Self-check question", [
              "What defines instability in this patient, not just on the x-ray?",
            ]),
          ],
          importance: "core",
          sourceFields: ["decisionMaking", "treatmentOptions", "selfCheckQuestions"],
          completionLabel: "I can explain fixation indications",
        },
        {
          id: topicSectionId(topic, "complications-follow-up"),
          sectionKind: "complications",
          title: "Remember complications that change follow-up",
          description: "These are the issues that make a student sound clinically oriented on rounds or in clinic.",
          learningObjective: "Name the complications to monitor after distal radius fracture.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Loss of reduction.",
              "Median neuropathy.",
              "CRPS and stiffness.",
              "Tendon irritation after volar plating.",
            ]),
            block("application", "Clinical application", [
              "Ask about finger motion, numbness, swelling, pain control, and splint fit.",
            ]),
          ],
          importance: "core",
          sourceFields: ["complications", "boardPearls"],
          completionLabel: "I can monitor the main complications",
        },
      ]);

    case "posterior-hip-approach":
      return buildSections(context, [
        {
          id: topicSectionId(topic, "positioning-and-landmarks"),
          sectionKind: "exposure",
          title: "Set up lateral positioning and posterior landmarks",
          description: "Positioning and landmarks determine whether the rest of the exposure makes sense.",
          learningObjective: "Describe lateral positioning and the surface landmarks for the posterior hip approach.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Patient is commonly positioned lateral decubitus.",
              "Greater trochanter is the key bony landmark.",
              "Incision and deep work orient around the posterior aspect of the greater trochanter.",
            ]),
            block("application", "Clinical or operative application", [
              "Watch how the pelvis is stabilized before prepping and draping.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["anatomyFocus", "surgicalApproach", "caseSteps"],
          completionLabel: "I can orient the approach",
        },
        {
          id: topicSectionId(topic, "superficial-and-deep-exposure"),
          sectionKind: "exposure",
          title: "Follow superficial and deep exposure",
          description: "The approach becomes less mysterious when each layer is tied to its purpose.",
          learningObjective: "Walk through gluteus maximus split, short external rotator release, and capsulotomy.",
          blocks: [
            block("application", "Clinical or operative application", [
              "Split gluteus maximus in line with fibers.",
              "Identify, release, and tag short external rotators.",
              "Open the posterior capsule to access the hip joint.",
            ]),
            block("say-out-loud", "What to say out loud", [
              "The tagged rotators and capsule are important because they are repaired later for stability.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["surgicalApproach"],
          completionLabel: "I can follow the exposure",
        },
        {
          id: topicSectionId(topic, "short-external-rotators-and-capsule"),
          sectionKind: "anatomy",
          title: "Identify short external rotators and capsule",
          description: "These structures are not trivia; they are the soft-tissue repair that helps posterior stability.",
          learningObjective: "Name the posterior soft tissues released and repaired during the approach.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Piriformis and the short external rotators are posterior landmarks.",
              "The posterior capsule is opened for access and commonly repaired.",
              "Tagging sutures help find and repair these structures at closure.",
            ]),
            block("common-confusion", "Common confusion", [
              "The posterior approach does not mean cutting the abductors as the main exposure.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["anatomy", "anatomyFocus", "surgicalApproach"],
          completionLabel: "I can name the released structures",
        },
        {
          id: topicSectionId(topic, "sciatic-nerve-danger-zone"),
          sectionKind: "complications",
          title: "Protect the sciatic nerve danger zone",
          description: "The sciatic nerve is the must-not-miss danger structure for a posterior hip approach.",
          learningObjective: "Explain where the sciatic nerve is at risk and how the team avoids injuring it.",
          blocks: [
            block("recognize", "What to recognize", [
              "The sciatic nerve lies posterior and medial relative to the short external rotator region.",
              "Blind medial dissection and aggressive retraction increase risk.",
            ]),
            block("say-out-loud", "What to say out loud", [
              "I am watching the relationship between the short external rotators and sciatic nerve before deep medial work.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["complications", "boardPearls", "anatomy"],
          completionLabel: "I can identify the danger zone",
        },
        {
          id: topicSectionId(topic, "closure-and-stability"),
          sectionKind: "technique",
          title: "Connect closure to posterior stability",
          description: "Closure is part of the operation's stability strategy, not just the end of the case.",
          learningObjective: "Explain why posterior capsule and rotator repair matter after posterior approach THA.",
          blocks: [
            block("application", "Clinical or operative application", [
              "Posterior capsule and short external rotators are repaired when possible.",
              "Soft-tissue tension, component position, and precautions all affect stability.",
              "Posterior dislocation risk is the complication to connect back to closure.",
            ]),
            block("self-check", "Self-check question", [
              "Why does posterior repair matter after the implants are already in?",
            ]),
          ],
          importance: "core",
          sourceFields: ["treatmentOptions", "complications", "selfCheckQuestions"],
          completionLabel: "I can explain posterior repair",
        },
      ]);

    case "total-hip-implant-fixation":
      return buildSections(context, [
        {
          id: topicSectionId(topic, "cemented-vs-cementless-fixation"),
          sectionKind: "implants",
          title: "Compare cemented and cementless fixation",
          description: "This is the core framework for understanding how THA implants become stable.",
          learningObjective: "Distinguish cement interlock from cementless press-fit and biologic ingrowth.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Cemented fixation uses cement interlock between implant and bone.",
              "Cementless fixation needs initial mechanical stability followed by bone ongrowth or ingrowth.",
              "Bone quality and patient factors influence fixation choice.",
            ]),
            block("say-out-loud", "What to say out loud", [
              "Cementless implants are not stable because bone has grown in on day one; they need initial press-fit stability first.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["classification", "treatmentOptions", "boardPearls"],
          completionLabel: "I can compare fixation types",
        },
        {
          id: topicSectionId(topic, "stem-geometry-load-transfer"),
          sectionKind: "implants",
          title: "Explain stem geometry and load transfer",
          description: "Stem shape determines where forces enter the femur and what fixation zone matters.",
          learningObjective: "Explain proximal versus distal fixation and why geometry matters.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Some stems gain stability proximally; others gain more distal fixation.",
              "Load transfer affects stress shielding, thigh pain, and fixation behavior.",
              "Femoral morphology and bone quality influence stem choice.",
            ]),
            block("common-confusion", "Common confusion", [
              "A bigger stem is not automatically a better stem; fixation location and bone match matter.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["anatomy", "decisionMaking", "surgicalApproach"],
          completionLabel: "I can explain stem fixation",
        },
        {
          id: topicSectionId(topic, "acetabular-fixation-concepts"),
          sectionKind: "implants",
          title: "Understand acetabular cup fixation",
          description: "Students often focus on the stem and forget the acetabular side of fixation.",
          learningObjective: "Describe press-fit cup fixation and why screw augmentation may be used.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Cementless cups rely on host bone contact and initial press-fit.",
              "Screws can augment initial stability in selected situations.",
              "Cup position matters for stability, wear, and impingement.",
            ]),
            block("application", "Clinical or operative application", [
              "On post-op x-ray, look at cup inclination, version conceptually, and seating.",
            ]),
          ],
          importance: "core",
          sourceFields: ["anatomyFocus", "surgicalApproach", "imaging"],
          completionLabel: "I can describe cup fixation",
        },
        {
          id: topicSectionId(topic, "radiographic-fixation-loosening"),
          sectionKind: "imaging",
          title: "Recognize radiographic fixation and loosening signs",
          description: "This is what turns implant concepts into a usable clinic skill.",
          learningObjective: "Identify basic x-ray clues for stable fixation, loosening, or migration.",
          blocks: [
            block("recognize", "What to recognize", [
              "Radiolucent lines can suggest poor fixation or loosening when progressive.",
              "Stem subsidence or component migration is concerning.",
              "Spot welds can support biologic fixation around cementless stems.",
              "Stress shielding reflects altered load transfer.",
            ]),
            block("self-check", "Self-check question", [
              "What finding worries you more: a stable nonprogressive line or progressive migration?",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["imaging", "complications", "selfCheckQuestions"],
          completionLabel: "I can read fixation x-rays",
        },
        {
          id: topicSectionId(topic, "patient-bone-factors"),
          sectionKind: "decision-making",
          title: "Use patient and bone factors to explain implant choice",
          description: "Implant choice should sound like a patient-specific decision, not a brand preference.",
          learningObjective: "Explain how age, bone quality, morphology, and revision context affect fixation strategy.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Poor bone quality may favor cemented fixation or alter implant choice.",
              "Femoral morphology affects broaching and stem fit.",
              "Revision and fracture contexts change fixation priorities.",
            ]),
            block("say-out-loud", "What to say out loud", [
              "I would connect implant choice to bone quality, anatomy, and the need for durable initial stability.",
            ]),
          ],
          importance: "core",
          sourceFields: ["decisionMaking", "treatmentOptions"],
          completionLabel: "I can explain implant choice",
        },
      ]);

    case "postoperative-acl-rehabilitation":
      return buildSections(context, [
        {
          id: topicSectionId(topic, "early-swelling-extension-quad-control"),
          sectionKind: "rehabilitation",
          title: "Prioritize swelling control, extension, and quad activation",
          description: "Early rehab success is less about doing more and more about restoring the right basics.",
          learningObjective: "Name the immediate goals after ACL reconstruction.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Quiet effusion and pain allow better quadriceps activation.",
              "Full extension early is a major priority.",
              "Quad control and safe gait come before athletic progression.",
            ]),
            block("common-confusion", "Common confusion", [
              "Early impressive flexion does not compensate for loss of terminal extension.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["mustKnow", "boardPearls"],
          completionLabel: "I can name early rehab priorities",
        },
        {
          id: topicSectionId(topic, "first-postop-visit-checklist"),
          sectionKind: "examination",
          title: "Assess the first post-op ACL visit",
          description: "This is the practical checklist that makes a student useful in sports clinic.",
          learningObjective: "Perform a focused early post-op assessment after ACL reconstruction.",
          blocks: [
            block("recognize", "What to recognize", [
              "Incision problems, calf symptoms, large effusion, or uncontrolled pain.",
              "Loss of extension or poor quad activation.",
              "Brace and crutch use that does not match the protocol.",
            ]),
            block("application", "Clinical application", [
              "Check incisions, effusion, extension, flexion, straight-leg raise, gait, and PT progress.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["caseSteps", "decisionMaking"],
          completionLabel: "I can assess the early visit",
        },
        {
          id: topicSectionId(topic, "staged-progression"),
          sectionKind: "rehabilitation",
          title: "Explain staged progression to running and sport",
          description: "Return is criteria-based because graft biology and neuromuscular control recover on different timelines.",
          learningObjective: "Describe the progression from ROM to strengthening to running/agility to sport testing.",
          blocks: [
            block("key-concepts", "Key concepts", [
              "Early phase: swelling, extension, gait, quad activation.",
              "Middle phase: strength, motion, balance, and controlled loading.",
              "Later phase: running, agility, plyometrics, and sport-specific testing.",
              "Return to sport should be criteria-based, not just date-based.",
            ]),
            block("say-out-loud", "What to say out loud", [
              "Feeling good is not the same as being ready for pivoting sport.",
            ]),
          ],
          importance: "must-know",
          sourceFields: ["classification", "treatmentOptions", "orSurvivalTips"],
          completionLabel: "I can explain staged rehab",
        },
        {
          id: topicSectionId(topic, "meniscus-graft-modifiers"),
          sectionKind: "decision-making",
          title: "Adjust rehab for meniscus repair and graft factors",
          description: "Associated procedures and graft considerations explain why protocols differ between patients.",
          learningObjective: "Explain why meniscus repair, graft choice, and fixation can change restrictions.",
          blocks: [
            block("application", "Clinical application", [
              "Meniscus repair may restrict flexion or weight-bearing depending on surgeon protocol.",
              "Graft fixation and biology shape early protection.",
              "Sport demands influence later testing and counseling.",
            ]),
            block("self-check", "Self-check question", [
              "Why might two ACL patients have different brace or weight-bearing instructions?",
            ]),
          ],
          importance: "core",
          sourceFields: ["anatomy", "decisionMaking", "surgicalApproach", "selfCheckQuestions"],
          completionLabel: "I can explain protocol differences",
        },
        {
          id: topicSectionId(topic, "warning-signs-and-complications"),
          sectionKind: "complications",
          title: "Recognize warning signs during ACL rehab",
          description: "Complications are the reason early follow-up is more than a formality.",
          learningObjective: "Name the post-op findings that should trigger concern or escalation.",
          blocks: [
            block("recognize", "What to recognize", [
              "Arthrofibrosis or persistent loss of extension.",
              "Persistent effusion and quad inhibition.",
              "Signs of infection or DVT.",
              "Recurrent instability or unsafe early pivoting.",
            ]),
            block("self-check", "Self-check question", [
              "What is the problem with pushing through a swollen knee that cannot fully extend?",
            ]),
          ],
          importance: "core",
          sourceFields: ["complications", "boardPearls"],
          completionLabel: "I can recognize rehab warning signs",
        },
      ]);

    default:
      return null;
  }
}

function buildBasicScienceGuide(context: GuideBuildContext): StudyGuideSection[] {
  const { topic, fastTemplate, deepTemplate } = context;
  return buildSections(context, [
    {
      id: "core-biology",
      sectionKind: "biology",
      title: "Phases and biology",
      description: "Understand the biologic sequence well enough to explain it out loud.",
      learningObjective: learningObjectives(topic, 1)[0] ?? `Explain the biology of ${topic.title}.`,
      content: compactList([
        fastTemplate.oneLiner,
        ...splitDelimited(fastTemplate.mustKnow),
        ...deepTemplate.classification,
      ], context.mode === "deep" ? 6 : 4),
      importance: "must-know",
      sourceFields: ["oneLiner", "mustKnow", "classification"],
      completionLabel: "I can explain the biology",
    },
    {
      id: "repair-drivers",
      sectionKind: "decision-making",
      title: "Factors affecting repair",
      description: "Connect biology, mechanics, host factors, and failure of healing.",
      learningObjective: learningObjectives(topic, 2)[1] ?? "Explain what changes the expected course.",
      content: compactList([
        ...deepTemplate.decisionMaking,
        ...deepTemplate.treatmentOptions,
        ...deepTemplate.boardPearls,
      ], context.mode === "deep" ? 6 : 4),
      importance: "must-know",
      sourceFields: ["decisionMaking", "treatmentOptions", "boardPearls"],
      completionLabel: "I can name the repair drivers",
    },
    {
      id: "recognize-failure",
      sectionKind: "failure-modes",
      title: "Delayed union and nonunion",
      description: "Know how the concept shows up clinically and on follow-up.",
      learningObjective: learningObjectives(topic, 3)[2] ?? "Recognize the important failure pattern.",
      content: compactList([
        ...deepTemplate.complications,
        ...deepTemplate.imaging,
        ...fastTemplate.caseSteps,
      ], context.mode === "deep" ? 6 : 4),
      importance: "core",
      sourceFields: ["complications", "imaging", "caseSteps"],
      completionLabel: "I can recognize healing problems",
    },
    {
      id: "self-check",
      sectionKind: "next-steps",
      title: "Explain it tomorrow",
      description: "Convert facts into answers you can use during teaching or rounds.",
      learningObjective: "Answer the highest-yield explanation questions without drifting into trivia.",
      content: compactList([
        ...fastTemplate.pimpQuestions,
        ...deepTemplate.selfCheckQuestions,
      ], context.mode === "deep" ? 5 : 3),
      importance: "stretch",
      sourceFields: ["pimpQuestions", "selfCheckQuestions"],
      completionLabel: "I can answer the check questions",
    },
  ]);
}

function buildTraumaGuide(context: GuideBuildContext): StudyGuideSection[] {
  const { topic, fastTemplate, deepTemplate } = context;
  return buildSections(context, [
    {
      id: "recognize-injury",
      sectionKind: "recognition",
      title: "Recognize the injury",
      description: "Know the mechanism, pattern, and why this problem matters.",
      learningObjective: learningObjectives(topic, 1)[0] ?? `Recognize ${topic.title}.`,
      content: compactList([
        fastTemplate.oneLiner,
        ...splitDelimited(fastTemplate.mustKnow),
        ...deepTemplate.classification,
      ], context.mode === "deep" ? 6 : 4),
      importance: "must-know",
      sourceFields: ["oneLiner", "mustKnow", "classification"],
      completionLabel: "I can recognize the injury",
    },
    {
      id: "key-anatomy",
      sectionKind: "anatomy",
      title: "Anatomy that changes management",
      description: "Focus on structures that affect reduction, fixation, urgency, or exam.",
      learningObjective: "Identify the anatomy that changes what the team does next.",
      content: compactList([
        ...fastTemplate.anatomyFocus,
        ...deepTemplate.anatomy,
      ], context.mode === "deep" ? 6 : 4),
      importance: "must-know",
      sourceFields: ["anatomyFocus", "anatomy"],
      completionLabel: "I can point out the key anatomy",
    },
    {
      id: "imaging-read",
      sectionKind: "imaging",
      title: "Read the key imaging",
      description: "Know the views, findings, and measurements that drive the plan.",
      learningObjective: learningObjectives(topic, 2)[1] ?? "Read the imaging that changes management.",
      content: compactList([
        ...deepTemplate.imaging,
        ...deepTemplate.classification,
        ...deepTemplate.decisionMaking,
      ], context.mode === "deep" ? 7 : 4),
      importance: "must-know",
      sourceFields: ["imaging", "classification", "decisionMaking"],
      completionLabel: "I can read the imaging",
    },
    {
      id: "initial-plan",
      sectionKind: "case-flow",
      title: "Initial management flow",
      description: "Walk through the first practical steps from presentation to plan.",
      learningObjective: learningObjectives(topic, 3)[2] ?? "Describe the management flow.",
      content: compactList([
        ...fastTemplate.caseSteps,
        ...deepTemplate.treatmentOptions,
      ], context.mode === "deep" ? 7 : 4),
      importance: "core",
      sourceFields: ["caseSteps", "treatmentOptions"],
      completionLabel: "I can walk through the plan",
    },
    {
      id: "complications",
      sectionKind: "complications",
      title: "Complications to avoid",
      description: "Know the complications and traps that should stay in your head tomorrow.",
      learningObjective: "Name the complication most likely to change monitoring or counseling.",
      content: compactList([
        ...deepTemplate.complications,
        ...deepTemplate.boardPearls,
      ], context.mode === "deep" ? 6 : 3),
      importance: "core",
      sourceFields: ["complications", "boardPearls"],
      completionLabel: "I can name the main complications",
    },
  ]);
}

function buildClinicGuide(context: GuideBuildContext): StudyGuideSection[] {
  const { topic, fastTemplate, deepTemplate } = context;
  return buildSections(context, [
    {
      id: "symptoms-pattern",
      sectionKind: "recognition",
      title: "Symptoms and pattern",
      description: "Recognize the clinical story before jumping to treatment.",
      learningObjective: learningObjectives(topic, 1)[0] ?? `Recognize ${topic.title}.`,
      content: compactList([
        fastTemplate.oneLiner,
        ...splitDelimited(fastTemplate.mustKnow),
        ...deepTemplate.classification,
      ], context.mode === "deep" ? 6 : 4),
      importance: "must-know",
      sourceFields: ["oneLiner", "mustKnow", "classification"],
      completionLabel: "I can recognize the pattern",
    },
    {
      id: "exam",
      sectionKind: "examination",
      title: "Focused examination",
      description: "Know the exam points that confirm severity or change urgency.",
      learningObjective: learningObjectives(topic, 2)[1] ?? "Perform the focused exam.",
      content: compactList([
        ...fastTemplate.caseSteps,
        ...fastTemplate.anatomyFocus,
        ...deepTemplate.anatomy,
      ], context.mode === "deep" ? 6 : 4),
      importance: "must-know",
      sourceFields: ["caseSteps", "anatomyFocus", "anatomy"],
      completionLabel: "I can do the focused exam",
    },
    {
      id: "diagnostics",
      sectionKind: "diagnostics",
      title: "Diagnostic tests",
      description: "Know when imaging, labs, or electrodiagnostics are actually useful.",
      learningObjective: "Explain which tests help and what they are expected to show.",
      content: compactList([
        ...deepTemplate.imaging,
        ...deepTemplate.decisionMaking,
      ], context.mode === "deep" ? 5 : 3),
      importance: "core",
      sourceFields: ["imaging", "decisionMaking"],
      completionLabel: "I can choose the tests",
    },
    {
      id: "treatment-indications",
      sectionKind: "treatment",
      title: "Treatment indications",
      description: "Know the nonoperative-to-operative ladder and the trigger for escalation.",
      learningObjective: learningObjectives(topic, 3)[2] ?? "Explain the treatment pathway.",
      content: compactList([
        ...deepTemplate.treatmentOptions,
        ...deepTemplate.decisionMaking,
        ...fastTemplate.orSurvivalTips,
      ], context.mode === "deep" ? 7 : 4),
      importance: "must-know",
      sourceFields: ["treatmentOptions", "decisionMaking", "orSurvivalTips"],
      completionLabel: "I can explain treatment indications",
    },
    {
      id: "surgical-technique",
      sectionKind: "technique",
      title: "Surgical technique basics",
      description: "Know the goal of the operation and the danger structure.",
      learningObjective: "Describe the high-level operative goal without pretending to know every step.",
      content: compactList([
        ...deepTemplate.surgicalApproach,
        ...deepTemplate.complications,
        ...deepTemplate.boardPearls,
      ], context.mode === "deep" ? 6 : 3),
      importance: "core",
      sourceFields: ["surgicalApproach", "complications", "boardPearls"],
      completionLabel: "I can state the technique goal",
    },
  ]);
}

function buildProcedureGuide(context: GuideBuildContext): StudyGuideSection[] {
  const { topic, fastTemplate, deepTemplate } = context;
  return buildSections(context, [
    {
      id: "indications",
      sectionKind: "decision-making",
      title: "Indications",
      description: "Know why the patient is having this procedure.",
      learningObjective: learningObjectives(topic, 1)[0] ?? "Explain the indication.",
      content: compactList([
        fastTemplate.oneLiner,
        ...deepTemplate.decisionMaking,
        ...deepTemplate.treatmentOptions,
      ], context.mode === "deep" ? 6 : 4),
      importance: "must-know",
      sourceFields: ["oneLiner", "decisionMaking", "treatmentOptions"],
      completionLabel: "I can explain the indication",
    },
    {
      id: "operative-anatomy",
      sectionKind: "anatomy",
      title: "Operative anatomy",
      description: "Know landmarks, danger structures, and what the approach is trying to protect.",
      learningObjective: "Identify the anatomy that matters during the procedure.",
      content: compactList([
        ...fastTemplate.anatomyFocus,
        ...deepTemplate.anatomy,
      ], context.mode === "deep" ? 6 : 4),
      importance: "must-know",
      sourceFields: ["anatomyFocus", "anatomy"],
      completionLabel: "I can name the operative anatomy",
    },
    {
      id: "operative-sequence",
      sectionKind: "technique",
      title: "Operative sequence",
      description: "Follow the case at the level of goals and transitions.",
      learningObjective: "Walk through the major phases of the procedure.",
      content: compactList([
        ...fastTemplate.caseSteps,
        ...deepTemplate.surgicalApproach,
      ], context.mode === "deep" ? 7 : 4),
      importance: "must-know",
      sourceFields: ["caseSteps", "surgicalApproach"],
      completionLabel: "I can follow the sequence",
    },
    {
      id: "pitfalls",
      sectionKind: "complications",
      title: "Pitfalls and complications",
      description: "Know what the team is trying hardest to avoid.",
      learningObjective: "Name the complications that shape intra-op and post-op decisions.",
      content: compactList([
        ...deepTemplate.complications,
        ...deepTemplate.boardPearls,
      ], context.mode === "deep" ? 6 : 3),
      importance: "core",
      sourceFields: ["complications", "boardPearls"],
      completionLabel: "I can name the pitfalls",
    },
  ]);
}

function buildImplantGuide(context: GuideBuildContext): StudyGuideSection[] {
  const { fastTemplate, deepTemplate } = context;
  return buildSections(context, [
    {
      id: "implant-indications",
      sectionKind: "decision-making",
      title: "Indications and goals",
      description: "Know the clinical problem the implant is solving.",
      learningObjective: "Explain why this implant or reconstruction strategy is being considered.",
      content: compactList([
        fastTemplate.oneLiner,
        ...deepTemplate.decisionMaking,
        ...deepTemplate.treatmentOptions,
      ], context.mode === "deep" ? 6 : 4),
      importance: "must-know",
      sourceFields: ["oneLiner", "decisionMaking", "treatmentOptions"],
      completionLabel: "I can explain the implant goal",
    },
    {
      id: "implant-anatomy",
      sectionKind: "anatomy",
      title: "Anatomy and component position",
      description: "Connect anatomy to sizing, fixation, and safe placement.",
      learningObjective: "Identify the landmarks that guide component positioning.",
      content: compactList([
        ...fastTemplate.anatomyFocus,
        ...deepTemplate.anatomy,
        ...deepTemplate.surgicalApproach,
      ], context.mode === "deep" ? 7 : 4),
      importance: "must-know",
      sourceFields: ["anatomyFocus", "anatomy", "surgicalApproach"],
      completionLabel: "I can connect anatomy to position",
    },
    {
      id: "sizing-fixation",
      sectionKind: "implants",
      title: "Sizing and fixation concepts",
      description: "Know the vocabulary of implant stability without overclaiming technical detail.",
      learningObjective: "Describe the core sizing or fixation concept.",
      content: compactList([
        ...deepTemplate.classification,
        ...deepTemplate.treatmentOptions,
        ...fastTemplate.caseSteps,
      ], context.mode === "deep" ? 6 : 4),
      importance: "core",
      sourceFields: ["classification", "treatmentOptions", "caseSteps"],
      completionLabel: "I can describe fixation concepts",
    },
    {
      id: "failure-modes",
      sectionKind: "failure-modes",
      title: "Failure modes",
      description: "Know the complications, x-ray concerns, and revision triggers.",
      learningObjective: "Recognize what implant failure or early complication would look like.",
      content: compactList([
        ...deepTemplate.complications,
        ...deepTemplate.imaging,
        ...deepTemplate.boardPearls,
      ], context.mode === "deep" ? 7 : 4),
      importance: "core",
      sourceFields: ["complications", "imaging", "boardPearls"],
      completionLabel: "I can name failure modes",
    },
  ]);
}

function buildApproachGuide(context: GuideBuildContext): StudyGuideSection[] {
  const { fastTemplate, deepTemplate } = context;
  return buildSections(context, [
    {
      id: "exposure",
      sectionKind: "exposure",
      title: "Exposure",
      description: "Know what interval or corridor the team is using and why.",
      learningObjective: "Describe the exposure at a high level.",
      content: compactList([
        ...deepTemplate.surgicalApproach,
        ...fastTemplate.caseSteps,
      ], context.mode === "deep" ? 6 : 4),
      importance: "must-know",
      sourceFields: ["surgicalApproach", "caseSteps"],
      completionLabel: "I can describe the exposure",
    },
    {
      id: "approach-anatomy",
      sectionKind: "anatomy",
      title: "Anatomy and landmarks",
      description: "Know the landmark anatomy before asking about instruments or implants.",
      learningObjective: "Identify the key landmarks and structures at risk.",
      content: compactList([
        ...fastTemplate.anatomyFocus,
        ...deepTemplate.anatomy,
      ], context.mode === "deep" ? 7 : 4),
      importance: "must-know",
      sourceFields: ["anatomyFocus", "anatomy"],
      completionLabel: "I can name the landmarks",
    },
    {
      id: "danger-zones",
      sectionKind: "complications",
      title: "Danger zones",
      description: "Know the structures and mistakes that make the approach unsafe.",
      learningObjective: "Name the danger structures and what happens if they are injured.",
      content: compactList([
        ...deepTemplate.complications,
        ...deepTemplate.boardPearls,
        ...fastTemplate.orSurvivalTips,
      ], context.mode === "deep" ? 6 : 4),
      importance: "core",
      sourceFields: ["complications", "boardPearls", "orSurvivalTips"],
      completionLabel: "I can name the danger zones",
    },
    {
      id: "closure-next-steps",
      sectionKind: "next-steps",
      title: "Implants and closure context",
      description: "Understand what the exposure enables and what the team checks afterward.",
      learningObjective: "Explain how the approach connects to fixation, implant work, or closure.",
      content: compactList([
        ...deepTemplate.treatmentOptions,
        ...deepTemplate.imaging,
        ...deepTemplate.selfCheckQuestions,
      ], context.mode === "deep" ? 6 : 3),
      importance: "stretch",
      sourceFields: ["treatmentOptions", "imaging", "selfCheckQuestions"],
      completionLabel: "I can connect exposure to next steps",
    },
  ]);
}

function buildRehabilitationGuide(context: GuideBuildContext): StudyGuideSection[] {
  const { topic, fastTemplate, deepTemplate } = context;
  return buildSections(context, [
    {
      id: "functional-problem",
      sectionKind: "recognition",
      title: "Functional problem",
      description: "Recognize what limitation the rehab plan is addressing.",
      learningObjective: learningObjectives(topic, 1)[0] ?? "Identify the functional problem.",
      content: compactList([
        fastTemplate.oneLiner,
        ...splitDelimited(fastTemplate.mustKnow),
      ], context.mode === "deep" ? 5 : 3),
      importance: "must-know",
      sourceFields: ["oneLiner", "mustKnow"],
      completionLabel: "I can identify the problem",
    },
    {
      id: "exam-milestones",
      sectionKind: "examination",
      title: "Exam and milestones",
      description: "Know what progress looks like and what should trigger concern.",
      learningObjective: learningObjectives(topic, 2)[1] ?? "Assess recovery progress.",
      content: compactList([
        ...fastTemplate.caseSteps,
        ...deepTemplate.decisionMaking,
      ], context.mode === "deep" ? 6 : 4),
      importance: "must-know",
      sourceFields: ["caseSteps", "decisionMaking"],
      completionLabel: "I can assess milestones",
    },
    {
      id: "rehab-plan",
      sectionKind: "rehabilitation",
      title: "Rehab plan",
      description: "Know the staged activity plan and patient counseling points.",
      learningObjective: learningObjectives(topic, 3)[2] ?? "Explain the rehab plan.",
      content: compactList([
        ...deepTemplate.treatmentOptions,
        ...fastTemplate.orSurvivalTips,
        ...deepTemplate.boardPearls,
      ], context.mode === "deep" ? 6 : 4),
      importance: "core",
      sourceFields: ["treatmentOptions", "orSurvivalTips", "boardPearls"],
      completionLabel: "I can explain the rehab plan",
    },
  ]);
}

function buildAnatomyGuide(context: GuideBuildContext): StudyGuideSection[] {
  const { fastTemplate, deepTemplate } = context;
  return buildSections(context, [
    {
      id: "structures",
      sectionKind: "anatomy",
      title: "Key structures",
      description: "Learn the structures that repeatedly show up in exam, imaging, and procedures.",
      learningObjective: "Identify the must-see structures.",
      content: compactList([
        ...fastTemplate.anatomyFocus,
        ...deepTemplate.anatomy,
      ], context.mode === "deep" ? 7 : 4),
      importance: "must-know",
      sourceFields: ["anatomyFocus", "anatomy"],
      completionLabel: "I can identify the structures",
    },
    {
      id: "clinical-relevance",
      sectionKind: "recognition",
      title: "Clinical relevance",
      description: "Tie anatomy to symptoms, injuries, and decisions.",
      learningObjective: "Explain why this anatomy matters clinically.",
      content: compactList([
        fastTemplate.oneLiner,
        ...deepTemplate.decisionMaking,
        ...deepTemplate.boardPearls,
      ], context.mode === "deep" ? 6 : 4),
      importance: "must-know",
      sourceFields: ["oneLiner", "decisionMaking", "boardPearls"],
      completionLabel: "I can explain why it matters",
    },
    {
      id: "danger-structures",
      sectionKind: "complications",
      title: "Danger structures",
      description: "Know what can be injured and how that would present.",
      learningObjective: "Name the structures at risk and their clinical consequences.",
      content: compactList([
        ...deepTemplate.complications,
        ...fastTemplate.orSurvivalTips,
        ...deepTemplate.selfCheckQuestions,
      ], context.mode === "deep" ? 6 : 3),
      importance: "core",
      sourceFields: ["complications", "orSurvivalTips", "selfCheckQuestions"],
      completionLabel: "I can name danger structures",
    },
  ]);
}

function buildPathologyGuide(context: GuideBuildContext): StudyGuideSection[] {
  const { topic, fastTemplate, deepTemplate } = context;
  return buildSections(context, [
    {
      id: "pathophysiology",
      sectionKind: "biology",
      title: "Pathophysiology",
      description: "Understand what is going wrong before memorizing management.",
      learningObjective: learningObjectives(topic, 1)[0] ?? `Explain ${topic.title}.`,
      content: compactList([
        fastTemplate.oneLiner,
        ...splitDelimited(fastTemplate.mustKnow),
        ...deepTemplate.classification,
      ], context.mode === "deep" ? 6 : 4),
      importance: "must-know",
      sourceFields: ["oneLiner", "mustKnow", "classification"],
      completionLabel: "I can explain the pathophysiology",
    },
    {
      id: "findings",
      sectionKind: "diagnostics",
      title: "Findings to recognize",
      description: "Know the exam, imaging, or lab findings that support the diagnosis.",
      learningObjective: "Recognize the findings that make this diagnosis likely.",
      content: compactList([
        ...fastTemplate.caseSteps,
        ...deepTemplate.imaging,
        ...deepTemplate.anatomy,
      ], context.mode === "deep" ? 7 : 4),
      importance: "must-know",
      sourceFields: ["caseSteps", "imaging", "anatomy"],
      completionLabel: "I can recognize the findings",
    },
    {
      id: "algorithm",
      sectionKind: "treatment",
      title: "Treatment algorithm",
      description: "Know the key decision points and escalation pathway.",
      learningObjective: learningObjectives(topic, 3)[2] ?? "Explain the treatment algorithm.",
      content: compactList([
        ...deepTemplate.decisionMaking,
        ...deepTemplate.treatmentOptions,
      ], context.mode === "deep" ? 6 : 4),
      importance: "core",
      sourceFields: ["decisionMaking", "treatmentOptions"],
      completionLabel: "I can explain the algorithm",
    },
    {
      id: "watch-outs",
      sectionKind: "complications",
      title: "Watch-outs",
      description: "Know the complication, mimic, or late consequence that changes follow-up.",
      learningObjective: "Name the pitfall that would change patient care.",
      content: compactList([
        ...deepTemplate.complications,
        ...deepTemplate.boardPearls,
      ], context.mode === "deep" ? 5 : 3),
      importance: "core",
      sourceFields: ["complications", "boardPearls"],
      completionLabel: "I can name the watch-outs",
    },
  ]);
}

function buildStudyGuideSections(context: GuideBuildContext): StudyGuideSection[] {
  const topicSpecificGuide = buildTopicSpecificGuide(context);
  if (topicSpecificGuide) {
    return topicSpecificGuide;
  }

  switch (context.guideType) {
    case "basic-science":
      return buildBasicScienceGuide(context);
    case "anatomy":
      return buildAnatomyGuide(context);
    case "trauma":
      return buildTraumaGuide(context);
    case "clinic":
      return buildClinicGuide(context);
    case "procedure":
      return buildProcedureGuide(context);
    case "implant":
      return buildImplantGuide(context);
    case "approach":
      return buildApproachGuide(context);
    case "rehabilitation":
      return buildRehabilitationGuide(context);
    case "pathology":
      return buildPathologyGuide(context);
  }
}

export function normalizeStudyGuideCompletionIds(
  completedIds: string[],
  sections: Array<Pick<StudyGuideSection, "id">>
): string[] {
  const currentIds = new Set(sections.map((section) => section.id));
  return completedIds.filter((id, index, array) => {
    return currentIds.has(id) && array.indexOf(id) === index;
  });
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
      message: "Case Prep is not yet available for this topic.",
      sourceType: "unavailable" as const,
      entityKind: null,
      requestedApproach: null,
      revisionId: null,
      payloadHash: null,
      citations: [],
      alternatives: [],
      payload: null,
      sections: [],
      v11: null,
    };
  const guideType = detectStudyGuideTopicType(topic);
  const context: GuideBuildContext = {
    topic,
    track,
    mode,
    selectedMinutes,
    fastTemplate,
    deepTemplate,
    guideType,
  };
  const studyGuideSections = buildStudyGuideSections(context);

  return {
    topic,
    track,
    mode,
    estimatedMinutes: selectedMinutes,
    selectedMinutes,
    title: topic.title,
    subtitle:
      mode === "deep"
        ? `Deep study guide for a ${selectedMinutes}-minute block. Focus on the sections that make this ${guideType} topic easier to explain tomorrow.`
        : `Fast study guide for a ${selectedMinutes}-minute pass. Focus on recognition, explanation, and the next useful action for this ${guideType} topic.`,
    guideType,
    objectives: studyGuideSections,
    studyGuideSections,
    casePrepContext,
    relatedTopics,
    nextRecommendedTopic,
    nextTopicId: nextRecommendedTopic?.topic.id,
    launchContext: {
      selectedMinutes,
    },
  };
}
