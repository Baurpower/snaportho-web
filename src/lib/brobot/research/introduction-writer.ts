import { z } from 'zod';

const text = z.string().trim().default('');
const textList = z.array(z.string().trim()).default([]);
const score = z.number().min(0).max(100);

export const INTRODUCTION_REVISION_MODES = [
  'generate_from_scratch',
  'improve_existing',
  'compare_versions',
  'major_issues_only',
  'line_by_line',
  'journal_refinement',
  'reviewer_response',
] as const;

export const IntroductionInputsSchema = z.object({
  studyTitle: text,
  studyBackground: text,
  currentEvidence: text,
  knowledgeGap: text,
  clinicalImportance: text,
  population: text,
  expectedAudience: text,
  researchObjective: z.string().trim().min(1, 'Research objective is required.'),
  hypothesis: text,
  clinicalQuestion: text,
  targetJournal: z.string().trim().min(1, 'Target journal is required.'),
  specialty: z.string().trim().min(1, 'Specialty is required.'),
  studyDesign: z.string().trim().min(1, 'Study design is required.'),
  primaryOutcome: z.string().trim().min(1, 'Primary outcome is required.'),
  secondaryOutcomes: textList,
  literatureReview: z.string().trim().min(1, 'Module 1 literature review is required.'),
  existingDraft: text,
  comparisonDraft: text,
  keywords: textList,
  reviewerComments: text,
  revisionMode: z.enum(INTRODUCTION_REVISION_MODES).default('generate_from_scratch'),
  targetWordMin: z.number().int().min(150).max(1000).default(350),
  targetWordMax: z.number().int().min(200).max(1200).default(450),
}).superRefine((value, context) => {
  if (value.targetWordMin >= value.targetWordMax) {
    context.addIssue({ code: 'custom', path: ['targetWordMax'], message: 'Maximum must exceed minimum.' });
  }
  if (value.revisionMode !== 'generate_from_scratch' && !value.existingDraft) {
    context.addIssue({ code: 'custom', path: ['existingDraft'], message: 'This revision mode requires an existing draft.' });
  }
  if (value.revisionMode === 'compare_versions' && !value.comparisonDraft) {
    context.addIssue({ code: 'custom', path: ['comparisonDraft'], message: 'Add a second version to compare.' });
  }
});

const RatedDimensionSchema = z.object({
  name: z.string(),
  score,
  finding: z.string(),
  recommendation: z.string(),
  why: z.string(),
});

export const IntroductionAnalysisSchema = z.object({
  manuscript: z.object({
    title: z.string(),
    paragraphs: z.array(z.object({
      role: z.enum(['broad_context', 'current_knowledge', 'knowledge_gap', 'objective']),
      text: z.string(),
    })).length(4),
  }),
  paragraphTeaching: z.array(z.object({
    role: z.enum(['broad_context', 'current_knowledge', 'knowledge_gap', 'objective']),
    purpose: z.string(),
    strengths: textList,
    weaknesses: textList,
    argumentContribution: z.string(),
    placementReason: z.string(),
  })).length(4),
  overallScore: score,
  writingCoach: z.array(RatedDimensionSchema),
  argumentStrength: z.array(RatedDimensionSchema).length(6),
  gapAnalysis: z.array(RatedDimensionSchema),
  objectiveAssessment: z.array(RatedDimensionSchema),
  journalMatch: z.object({
    score,
    summary: z.string(),
    tone: z.string(),
    structure: z.string(),
    length: z.string(),
    technicalLanguage: z.string(),
    paragraphOrganization: z.string(),
    claimConservatism: z.string(),
    objectiveWording: z.string(),
    scientificVoice: z.string(),
    recommendations: textList,
  }),
  problemStatement: z.object({ score, evaluation: z.string(), revision: z.string(), why: z.string() }),
  argumentMap: z.array(z.object({ step: z.number().int().min(1).max(4), claim: z.string(), supportsNext: z.string() })).length(4),
  citationOpportunities: z.array(z.object({ paragraph: z.number().int().min(1).max(4), claim: z.string(), evidenceNeeded: z.string(), suggestedSourceIds: textList })),
  revisionPriorities: z.array(z.object({ priority: z.enum(['high', 'medium', 'low']), action: z.string(), why: z.string() })),
  revisionChecklist: textList,
  comparisonSummary: text,
  limitations: textList,
});

export type IntroductionInputs = z.infer<typeof IntroductionInputsSchema>;
export type IntroductionAnalysis = z.infer<typeof IntroductionAnalysisSchema>;

export const IntroductionReviewInputsSchema = z.object({
  introduction: z.string().trim().min(80, 'Paste an introduction of at least 80 characters.'),
  targetJournal: text,
  manuscriptTitle: text,
  abstract: text,
  additionalContext: text,
});

const ReviewDimensionSchema = z.object({
  score,
  assessment: z.string(),
  recommendations: textList,
});

export const IntroductionReviewSchema = z.object({
  overallScore: score,
  overallImpression: z.object({
    verdict: z.string(),
    assessment: z.string(),
  }),
  narrativeFlow: ReviewDimensionSchema,
  knowledgeGap: ReviewDimensionSchema,
  studyObjective: ReviewDimensionSchema,
  journalFit: ReviewDimensionSchema,
  clarityConciseness: ReviewDimensionSchema,
  credibility: ReviewDimensionSchema,
  revisionPriorities: z.object({
    highImpact: textList,
    mediumImpact: textList,
    minorEdits: textList,
  }),
});

export type IntroductionReviewInputs = z.infer<typeof IntroductionReviewInputsSchema>;
export type IntroductionReview = z.infer<typeof IntroductionReviewSchema>;

export function introductionReviewPrompt(input: IntroductionReviewInputs) {
  return `You are BroBot, an experienced medical research mentor and rigorous journal reviewer. Evaluate the supplied scientific introduction; do not rewrite it wholesale and do not act as a grammar checker.

REVIEW PRINCIPLES
- Judge whether the introduction builds a logical argument from a broad clinical problem to current evidence, a credible knowledge gap, and a precise study objective.
- Explain whether the introduction creates confidence before the reviewer reaches Methods.
- Give specific, actionable feedback grounded only in the supplied text. Never invent citations, study details, journal requirements, or facts.
- If a target journal is supplied, assess likely fit cautiously. Distinguish general editorial expectations from verified journal rules.
- Use the title and abstract only to assess alignment. Use additional context to understand audience, design, tone, word limits, or reviewer concerns.
- Assess narrative flow, knowledge-gap clarity, objective alignment, journal fit, clarity and concision, and credibility separately.
- Prioritize revisions into high-impact, medium-impact, and minor edits. High-impact revisions should address argument, rationale, or alignment—not copyediting.
- Be direct, constructive, and educational. For every recommendation, make clear what should change and why.

MANUSCRIPT CONTEXT
${JSON.stringify(input, null, 2)}`;
}

export const EMPTY_INTRODUCTION_INPUTS: IntroductionInputs = {
  studyTitle: '', studyBackground: '', currentEvidence: '', knowledgeGap: '', clinicalImportance: '', population: '', expectedAudience: '',
  researchObjective: '', hypothesis: '', clinicalQuestion: '', targetJournal: 'JBJS',
  specialty: 'Orthopaedic Surgery', studyDesign: '', primaryOutcome: '', secondaryOutcomes: [], literatureReview: '',
  existingDraft: '', comparisonDraft: '', keywords: [], reviewerComments: '', revisionMode: 'generate_from_scratch',
  targetWordMin: 350, targetWordMax: 450,
};

export function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function introductionLengthStatus(value: string, minimum: number, maximum: number) {
  const words = countWords(value);
  if (words < minimum) return { words, status: 'too_short' as const, message: `${minimum - words} words below target` };
  if (words > maximum) return { words, status: 'too_long' as const, message: `${words - maximum} words above target` };
  return { words, status: 'on_target' as const, message: 'Within journal target' };
}

export function introductionWriterPrompt(input: IntroductionInputs) {
  return `You are BroBot, an experienced medical research mentor. Help the student produce a publication-quality introduction while teaching the reasoning behind every major recommendation. You are an editor and mentor, not a ghostwriter.\n\nCORE MODEL\nAn introduction is a four-paragraph argument, not a literature review: (1) broad clinical context, (2) current knowledge, (3) authentic knowledge gap, (4) problem statement and objective. It must answer what problem exists, why it matters, what is known, what is unknown, and why this study is needed now. The reviewer should finish thinking the study needs to be done.\n\nREQUIREMENTS\n- Return exactly four manuscript paragraphs and keep the manuscript between ${input.targetWordMin} and ${input.targetWordMax} words.\n- Keep educational commentary out of manuscript text; place it in the structured teaching fields.\n- Adapt structural characteristics to ${input.targetJournal}: tone, concision, citation density, clinical/statistical emphasis, paragraph rhythm, conservative claims, and objective wording. Do not imitate or quote published text.\n- Use only facts found in the supplied project information and literature review. Never invent prevalence, effect sizes, findings, citations, or journal rules. Mark unsupported claims as citation opportunities instead of fabricating support.\n- Treat the supplied literature review as a bounded evidence set, not an exhaustive search. Calibrate novelty and explicitly flag uncertainty.\n- Every recommendation must say what to change and WHY it improves the argument or teaches a transferable principle. Avoid generic advice.\n- Assess these six argument questions separately and in this order: Why care? Why now? Why this population? Why this methodology? Why this outcome? Why does the gap matter?\n- Assess gap credibility, literature support, clinical meaning, novelty, overselling, and likely reviewer agreement.\n- Assess objective specificity, relevance, measurability, introduction consistency, methods consistency, realism, and wording.\n- Flag verbosity, redundancy, passive voice, overstatement, unsupported claims, buzzwords, empty sentences, weak transitions, and formulaic AI-like phrasing when present.\n- Revision mode: ${input.revisionMode}. For compare mode, explain which version makes the stronger evidence-grounded argument. For reviewer-response mode, address comments without claiming compliance that is not demonstrated.\n\nPROJECT INPUTS\n${JSON.stringify(input, null, 2)}`;
}
