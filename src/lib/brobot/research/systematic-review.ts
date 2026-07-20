import { z } from 'zod';

const text = z.string().trim().default('');
const list = z.array(z.string().trim()).default([]);

export const ReviewQuestionSchema = z.object({
  title: text, framework: z.enum(['PICO', 'PECO', 'SPIDER']), population: text,
  intervention: text, comparator: text, outcome: text, design: text,
  rationale: text, knownReviews: text, dateBoundary: text,
});

export const FeasibilitySchema = z.object({
  scores: z.object({ novelty: z.number().min(0).max(100), clinicalImportance: z.number().min(0).max(100), publicationPotential: z.number().min(0).max(100), sufficientEvidence: z.number().min(0).max(100), redundancyRisk: z.number().min(0).max(100) }),
  screeningBurden: z.enum(['low', 'moderate', 'high', 'very high']), estimatedTimeline: text,
  estimatedStudies: text, reviewerDifficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  recommendation: z.enum(['Proceed', 'Proceed with modifications', 'Narrow the question', 'Expand the question', 'Choose a different topic']),
  summary: text, reasoning: list, changes: list, reviewerChallenge: text, assumptions: list,
});

export const FeasibilityRequestSchema = z.object({
  question: ReviewQuestionSchema,
  papers: z.array(z.object({ title: text, authors: list, journal: text, year: z.number().nullable(), abstract: text, doi: text.optional() })).max(30),
});

export type ReviewQuestion = z.infer<typeof ReviewQuestionSchema>;
export type Feasibility = z.infer<typeof FeasibilitySchema>;

export const EMPTY_REVIEW_QUESTION: ReviewQuestion = { title: '', framework: 'PICO', population: '', intervention: '', comparator: '', outcome: '', design: '', rationale: '', knownReviews: '', dateBoundary: '' };

export type ReviewProject = {
  question: ReviewQuestion; feasibility: Feasibility | null;
  completedSteps: string[]; prismaItems: Record<string, boolean>; updatedAt: string;
};

export function feasibilityPrompt(input: z.infer<typeof FeasibilityRequestSchema>) {
  return `You are a senior systematic-review mentor. Challenge this proposed medical review before the student invests months of work. Explain why every recommendation matters. Evaluate novelty, clinical value, redundancy, likely primary evidence, realistic screening burden, and publication potential. Supplied DOI records are a convenience sample, not an exhaustive search; never claim novelty is proven. Ask the decisive reviewer question: \"What does this add?\" Recommend proceeding only when the rationale supports it. Return concise, actionable guidance.\n\nQUESTION:\n${JSON.stringify(input.question, null, 2)}\n\nKNOWN LITERATURE:\n${JSON.stringify(input.papers, null, 2)}`;
}

export const WORKFLOW_STEPS = [
  ['question', 'Research question'], ['protocol', 'Protocol'], ['eligibility', 'Eligibility criteria'], ['databases', 'Database selection'],
  ['strategy', 'Search strategy'], ['search', 'Search complete'], ['deduplication', 'Deduplication'], ['title', 'Title screening'],
  ['abstract', 'Abstract screening'], ['full-text', 'Full-text review'], ['diagram', 'PRISMA diagram'], ['extraction', 'Data extraction'],
  ['bias', 'Risk of bias'], ['synthesis', 'Evidence synthesis'], ['meta', 'Meta-analysis decision'], ['grade', 'GRADE assessment'],
  ['manuscript', 'Manuscript'], ['submission', 'Submission ready'],
] as const;

export const PRISMA_ITEMS = [
  ['rationale', 'Rationale explains why the review is needed'], ['objectives', 'Objectives use an explicit framework'],
  ['protocol', 'Protocol and registration are documented'], ['eligibility', 'Eligibility criteria are reproducible'],
  ['sources', 'All information sources and last-search dates are recorded'], ['strategy', 'Full reproducible search strategy is saved'],
  ['selection', 'Selection process and reviewers are described'], ['collection', 'Data collection process is documented'],
  ['bias', 'Risk-of-bias method matches study design'], ['synthesis', 'Synthesis methods are prespecified'],
  ['flow', 'Study flow and exclusion reasons are complete'], ['certainty', 'Certainty of evidence is assessed'],
] as const;
