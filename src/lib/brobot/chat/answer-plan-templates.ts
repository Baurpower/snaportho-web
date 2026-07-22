import type { BroBotFactoredSetting, BroBotFactoredTask } from './factored-intent';

export type BroBotPlanTemplate = {
  objective: string;
  decisionPivots: string[];
  requiredFacts: string[];
  evidenceQueries: string[];
  uncertainty: string[];
  optionalSections: string[];
  prohibitedContent: string[];
};

export const TASK_PLAN_TEMPLATES: Record<BroBotFactoredTask, BroBotPlanTemplate> = {
  explain: {
    objective: 'Directly explain the requested concept and why it matters.',
    decisionPivots: ['clinical context that changes application'],
    requiredFacts: ['direct definition', 'why the concept matters', 'core mechanism or anatomy', 'clinical application'],
    evidenceQueries: [], uncertainty: [], optionalSections: ['deeper mechanism or anatomy'], prohibitedContent: [],
  },
  compare: {
    objective: 'Directly compare the requested options and identify which is preferred by scenario.',
    decisionPivots: ['decision-changing patient factors', 'decision-changing anatomic factors', 'preferred choice by scenario'],
    requiredFacts: ['options being compared', 'indications', 'advantages', 'disadvantages', 'biomechanics or mechanism', 'complications', 'explanation of why the preferred option changes by scenario'],
    evidenceQueries: [], uncertainty: ['areas where evidence or practice varies'], optionalSections: ['compact comparison table'], prohibitedContent: [],
  },
  decide: {
    objective: 'Answer the requested clinical decision or indications question directly.',
    decisionPivots: ['primary indications', 'contraindications', 'patient or anatomic factors that change the decision'],
    requiredFacts: ['primary indications', 'contraindications', 'alternatives', 'complication tradeoffs', 'current evidence or controversy'],
    evidenceQueries: ['evidence supporting decision-changing factors'], uncertainty: ['uncertainty or controversy relevant to the decision'], optionalSections: ['scenario-based decision framework'], prohibitedContent: [],
  },
  plan: {
    objective: 'Provide an actionable plan focused on the exact requested task.',
    decisionPivots: ['findings that change the plan'], requiredFacts: ['objective', 'critical sequence', 'verification'],
    evidenceQueries: [], uncertainty: ['case details that could change the plan'], optionalSections: ['pitfalls and bailout considerations'], prohibitedContent: [],
  },
  quiz: {
    objective: 'Test the requested concept at the requested learner level.',
    decisionPivots: ['learner response'], requiredFacts: ['tested concept', 'deciding clue', 'common exam trap'],
    evidenceQueries: [], uncertainty: [], optionalSections: ['memory hook'], prohibitedContent: [],
  },
  retrieve_evidence: {
    objective: 'Retrieve and synthesize the requested evidence rather than provide generic search advice.',
    decisionPivots: ['study quality', 'clinical applicability', 'recency'],
    requiredFacts: ['focused evidence question', 'evidence hierarchy', 'claims requiring citations', 'study design, outcomes, and limitations', 'clinical applicability'],
    evidenceQueries: ['verified articles or citations responsive to the question', 'recent comparative evidence when available'],
    uncertainty: ['limitations and unresolved evidence'], optionalSections: ['evidence table'],
    prohibitedContent: ['fabricated citations', 'generic search advice as the final deliverable'],
  },
  counsel: {
    objective: 'Explain the issue and next steps in clear patient-centered language.',
    decisionPivots: ['preferences and goals', 'warning signs requiring escalation'],
    requiredFacts: ['plain-language explanation', 'realistic options', 'benefits and risks', 'expectations', 'warning signs', 'next steps'],
    evidenceQueries: [], uncertainty: ['individual factors that require clinician assessment'], optionalSections: ['questions to discuss with the treating clinician'], prohibitedContent: [],
  },
};

export const SETTING_FACTS: Record<BroBotFactoredSetting, string[]> = {
  or: ['operative objective', 'positioning when relevant', 'approach and exposure', 'named anatomy encountered', 'where structures are encountered and how they are protected', 'critical maneuver or reduction objective', 'fixation or implant decision categories', 'intraoperative verification and checks', 'common pitfalls', 'bailout or salvage considerations'],
  clinic: ['ranked differential', 'distinguishing history', 'discriminating examination', 'initial imaging or workup', 'first-line nonoperative treatment', 'operative or escalation indications', 'red flags', 'follow-up'],
  consult: ['urgency', 'missing critical information', 'immediate actions', 'focused examination', 'imaging or labs', 'assessment', 'management', 'disposition', 'senior or attending escalation'],
  boards: ['tested concept or direct answer', 'deciding stem clue', 'classification or threshold category when relevant', 'treatment or diagnostic pivot', 'why the correct option wins', 'why common distractors fail', 'memory hook', 'common exam trap'],
  research: ['focused evidence question', 'search or retrieval requirement', 'evidence hierarchy', 'claims requiring citations', 'recency requirement', 'study design, outcomes, and limitations', 'clinical applicability'],
  general: [],
};

export const AUDIENCE_FACTS = {
  student: ['orientation and definitions', 'basic anatomy', 'simple decision framework', 'common clinical relevance'],
  junior_resident: ['workflow', 'red flags', 'presentation', 'first-line decisions', 'anatomy and common mistakes'],
  senior_resident: ['decision pivots', 'fixation or implant tradeoffs', 'complications', 'bailouts', 'alternative strategies'],
  attending: ['evidence', 'controversies', 'edge cases', 'revision or salvage', 'tradeoffs'],
} as const;
