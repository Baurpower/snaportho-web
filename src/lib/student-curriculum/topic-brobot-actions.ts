import type { CaseReadinessBrobotAction } from "@/lib/student-curriculum/case-readiness-builder";
import type { StudyMode } from "@/lib/student-curriculum/curriculum-types";
import type {
  CurriculumTopic,
  CurriculumTrack,
} from "@/lib/student-curriculum/curriculum-types";

function buildTopicPrompt(params: {
  topic: CurriculumTopic;
  track: CurriculumTrack;
  studyMode: StudyMode;
  selectedMinutes: number;
  ask: string;
}): string {
  return [
    `You are helping an MS4 / medical student on orthopaedics prepare for tomorrow.`,
    `Topic: ${params.topic.title}`,
    `Track: ${params.track.title}`,
    `Subspecialty: ${params.topic.subspecialty}`,
    `Study mode: ${params.studyMode}`,
    `Selected study time: ${params.selectedMinutes} minutes`,
    params.ask,
    `Stay tightly scoped to this topic and speak like an attending teaching on service.`,
  ].join("\n");
}

export function buildTopicBrobotActions(params: {
  topic: CurriculumTopic;
  track: CurriculumTrack;
  studyMode: StudyMode;
  selectedMinutes: number;
}): CaseReadinessBrobotAction[] {
  const responseDepth = params.studyMode === "deep" ? "deep" : "standard";
  const quickDepth = params.studyMode === "deep" ? "standard" : "quick";

  const actions: Array<{
    label: string;
    actionKind: CaseReadinessBrobotAction["actionKind"];
    brobotMode: CaseReadinessBrobotAction["brobotMode"];
    responseDepth: CaseReadinessBrobotAction["responseDepth"];
    ask: string;
  }> = [
    {
      label: "Explain this procedure",
      actionKind: "explain",
      brobotMode: "or_prep",
      responseDepth,
      ask: "Explain this procedure at the level of a subintern preparing for tomorrow. Cover indications, key steps, and what to notice in the OR.",
    },
    {
      label: "Quiz me",
      actionKind: "quiz",
      brobotMode: "or_prep",
      responseDepth: quickDepth,
      ask: "Quiz me with 5 high-yield questions on this topic. Start with the most likely attending question.",
    },
    {
      label: "Ask attending-style questions",
      actionKind: "ask",
      brobotMode: "or_prep",
      responseDepth: quickDepth,
      ask: "Ask me attending-style questions one at a time and coach my answers. Focus on decision-making and pitfalls.",
    },
    {
      label: "Review anatomy",
      actionKind: "anatomy",
      brobotMode: "general",
      responseDepth,
      ask: "Review the surgical anatomy I need for this topic. Tell me what to point out on imaging, exam, or in the OR.",
    },
    {
      label: "Discuss complications",
      actionKind: "explain",
      brobotMode: "or_prep",
      responseDepth,
      ask: "Discuss the most important complications and pitfalls for this topic. Tell me what the team watches for postoperatively.",
    },
    {
      label: "Review indications",
      actionKind: "explain",
      brobotMode: "clinic",
      responseDepth,
      ask: "Review indications and contraindications for this topic. Help me explain why the team chose operative versus nonoperative management.",
    },
    {
      label: "Compare treatment options",
      actionKind: "ask",
      brobotMode: "consult",
      responseDepth,
      ask: "Compare the main treatment options for this topic and explain how attendings choose between them.",
    },
  ];

  return actions.map((action) => ({
    label: action.label,
    actionKind: action.actionKind,
    brobotMode: action.brobotMode,
    responseDepth: action.responseDepth,
    studyMode: params.studyMode,
    selectedMinutes: params.selectedMinutes,
    objectiveKind: "tomorrowFocus",
    prompt: buildTopicPrompt({
      topic: params.topic,
      track: params.track,
      studyMode: params.studyMode,
      selectedMinutes: params.selectedMinutes,
      ask: action.ask,
    }),
  }));
}