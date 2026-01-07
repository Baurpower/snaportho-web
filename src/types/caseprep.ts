// src/types/caseprep.ts

export type ApproachSelection = {
  selected: { id: string; confidence: number; rationale: string }[];
  notes?: string;
};

export type AnatomyQuizQuestion = {
  approach_id: string;
  q: string;
  answer: string;
  tag?: string;
  difficulty?: number;
};

export type HighYieldStructure = {
  name: string;
  type: string;
  why_high_yield?: string;
  when_in_case?: string;
  approach_ids?: string[];
};

export type AnatomyPayload = {
  approachSelection?: ApproachSelection;
  anatomyQuiz?: { questions: AnatomyQuizQuestion[] };
  highYieldAnatomy?: {
    structures?: HighYieldStructure[];
    must_not_miss?: string[];
  };
};

export type BroBotPayload = {
  pimpQuestions: string[];
  otherUsefulFacts: string[];
  anatomy?: AnatomyPayload | null; // ✅ add this
};
