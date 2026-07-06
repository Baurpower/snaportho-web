import type {
  CurriculumTopic,
  DeepStudyTemplate,
  FastStudyTemplate,
} from "@/lib/student-curriculum/curriculum-types";

export type ProcedurePrepModuleId =
  | "procedureOverview"
  | "indications"
  | "surgicalAnatomy"
  | "patientPositioning"
  | "orSetup"
  | "equipment"
  | "instruments"
  | "implantSystems"
  | "surgicalSteps"
  | "criticalDecisionPoints"
  | "attendingQuestions"
  | "complications"
  | "postoperativeManagement"
  | "rehabilitation"
  | "keyLiterature"
  | "relatedCases";

export type ProcedurePrepModule = {
  id: ProcedurePrepModuleId;
  title: string;
  summary: string;
  bullets: string[];
  hasContent: boolean;
};

function compact(values: Array<string | undefined>, limit = 6): string[] {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, limit);
}

export function buildProcedurePrepModules(params: {
  topic: CurriculumTopic;
  fastTemplate: FastStudyTemplate;
  deepTemplate: DeepStudyTemplate;
  certifiedSections?: Array<{ label: string; content: string }>;
}): ProcedurePrepModule[] {
  const { topic, fastTemplate, deepTemplate, certifiedSections } = params;
  const certifiedByLabel = new Map(
    (certifiedSections ?? []).map((section) => [
      section.label.toLowerCase(),
      section.content,
    ])
  );

  function certifiedBullets(...labels: string[]): string[] {
    for (const label of labels) {
      const content = certifiedByLabel.get(label.toLowerCase());
      if (content?.trim()) {
        return content
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 6);
      }
    }
    return [];
  }

  const modules: Array<Omit<ProcedurePrepModule, "hasContent">> = [
    {
      id: "procedureOverview",
      title: "Procedure Overview",
      summary: "What this case is and why it matters on service.",
      bullets: compact([
        fastTemplate.oneLiner,
        fastTemplate.overviewPrompt,
        topic.learningObjectives[0]?.objective,
        ...certifiedBullets("overview", "procedure overview"),
      ]),
    },
    {
      id: "indications",
      title: "Indications",
      summary: "When operative or nonoperative management makes sense.",
      bullets: compact([
        ...deepTemplate.decisionMaking,
        ...certifiedBullets("indications", "indication"),
      ]),
    },
    {
      id: "surgicalAnatomy",
      title: "Surgical Anatomy",
      summary: "Structures to localize, protect, and discuss confidently.",
      bullets: compact([
        ...deepTemplate.anatomy,
        ...fastTemplate.anatomyFocus,
        ...certifiedBullets("anatomy", "surgical anatomy"),
      ]),
    },
    {
      id: "patientPositioning",
      title: "Patient Positioning",
      summary: "How the patient is positioned and what that changes.",
      bullets: compact([
        fastTemplate.orSurvivalTips[0],
        "Confirm positioning goals before draping and know what exposure you are buying.",
        ...certifiedBullets("positioning", "patient positioning"),
      ], 4),
    },
    {
      id: "orSetup",
      title: "OR Setup",
      summary: "Room setup and workflow expectations.",
      bullets: compact(fastTemplate.orSurvivalTips, 4),
    },
    {
      id: "equipment",
      title: "Equipment",
      summary: "Equipment you should recognize on the field.",
      bullets: compact([
        fastTemplate.orSurvivalTips[1],
        ...certifiedBullets("equipment"),
      ], 4),
    },
    {
      id: "instruments",
      title: "Instruments",
      summary: "Common instruments and what they are used for.",
      bullets: compact([
        ...deepTemplate.surgicalApproach.slice(0, 2),
        ...certifiedBullets("instruments"),
      ], 4),
    },
    {
      id: "implantSystems",
      title: "Implant Systems",
      summary: "Implants and fixation choices worth recognizing.",
      bullets: compact([
        ...deepTemplate.treatmentOptions.filter((item) =>
          /fix|plate|screw|nail|stem|component|anchor|graft/i.test(item)
        ),
        ...certifiedBullets("implants", "implant systems"),
      ]),
    },
    {
      id: "surgicalSteps",
      title: "Surgical Steps",
      summary: "High-level operative flow without getting lost in minutiae.",
      bullets: compact([
        ...fastTemplate.caseSteps,
        ...deepTemplate.surgicalApproach,
        ...certifiedBullets("surgical steps", "operative steps"),
      ]),
    },
    {
      id: "criticalDecisionPoints",
      title: "Critical Decision Points",
      summary: "Forks in the road that change the plan.",
      bullets: compact([
        ...deepTemplate.decisionMaking,
        ...deepTemplate.classification.slice(0, 2),
        ...certifiedBullets("decision points", "critical decision points"),
      ]),
    },
    {
      id: "attendingQuestions",
      title: "Common Attending Questions",
      summary: "Questions you should be ready to answer out loud.",
      bullets: compact([
        ...fastTemplate.pimpQuestions,
        ...deepTemplate.selfCheckQuestions,
        ...certifiedBullets("attending questions", "pimp questions"),
      ]),
    },
    {
      id: "complications",
      title: "Complications",
      summary: "Pitfalls, complications, and what the team watches for.",
      bullets: compact([
        ...deepTemplate.complications,
        ...certifiedBullets("complications"),
      ]),
    },
    {
      id: "postoperativeManagement",
      title: "Postoperative Management",
      summary: "Immediate postop priorities and monitoring.",
      bullets: compact([
        deepTemplate.boardPearls[0],
        fastTemplate.orSurvivalTips[fastTemplate.orSurvivalTips.length - 1],
        ...certifiedBullets("postoperative management", "postop"),
      ], 4),
    },
    {
      id: "rehabilitation",
      title: "Rehabilitation",
      summary: "Early mobilization and therapy talking points.",
      bullets: compact([
        deepTemplate.boardPearls[1],
        ...certifiedBullets("rehabilitation", "rehab"),
      ], 4),
    },
    {
      id: "keyLiterature",
      title: "Key Literature",
      summary: "Evidence anchors and board-level pearls.",
      bullets: compact(deepTemplate.boardPearls, 4),
    },
    {
      id: "relatedCases",
      title: "Related Cases",
      summary: "Common clinical scenarios that reinforce this topic.",
      bullets: compact(
        topic.commonCases.flatMap((curriculumCase) => [
          curriculumCase.name,
          curriculumCase.scenario,
        ])
      ),
    },
  ];

  return modules.map((module) => ({
    ...module,
    hasContent: module.bullets.length > 0,
  }));
}