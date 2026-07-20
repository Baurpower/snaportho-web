import { z } from 'zod';

const text = z.string().trim().default('');
const textList = z.array(z.string().trim()).default([]);

export const ResearchQuestionSchema = z.object({
  title: text,
  objective: text,
  hypothesis: text,
  clinicalQuestion: text,
  population: text,
  intervention: text,
  comparator: text,
  primaryOutcome: text,
  secondaryOutcomes: textList,
  studyType: text,
  specialty: text,
  keywords: textList,
});

export const PaperMetadataSchema = z.object({
  id: z.string().trim().min(1),
  source: z.enum(['doi', 'pmid', 'url', 'manual']),
  sourceValue: z.string().trim().min(1),
  doi: text.optional(),
  pmid: text.optional(),
  title: text,
  authors: textList,
  journal: text,
  year: z.number().int().min(1800).max(2200).nullable().default(null),
  abstract: text,
});

export const EvidenceRowSchema = z.object({
  paperId: z.string(), author: text, year: text, journal: text, country: text,
  studyDesign: text, levelOfEvidence: text, population: text, sampleSize: text,
  intervention: text, comparator: text, primaryOutcome: text, keyFindings: text,
  limitations: textList, majorBiases: textList, followUp: text, statisticalMethods: textList,
  clinicalTakeaway: text, relevance: text, similarityScore: z.number().min(0).max(100),
  noveltyImpact: z.enum(['strengthens', 'weakens', 'duplicates', 'methodology', 'neutral']),
  rationaleEffect: text, missingVariables: textList, suggestedOutcomeChanges: textList,
});

export const LiteratureSynthesisSchema = z.object({
  evidence: z.array(EvidenceRowSchema),
  landscape: text,
  consensus: textList,
  controversies: textList,
  knowledgeGaps: textList,
  methodologicalPatterns: z.object({
    inclusionCriteria: textList, exclusionCriteria: textList, followUp: textList,
    databases: textList, statistics: textList, matchingMethods: textList,
    adjustmentVariables: textList, subgroupAnalyses: textList,
  }),
  outcomeMeasures: textList,
  evidenceQuality: z.object({ rating: z.enum(['very low', 'low', 'moderate', 'high']), explanation: text }),
  publicationTrends: z.array(z.object({ type: text, count: z.number().int().min(0) })),
  novelty: z.object({
    score: z.number().min(0).max(100), explanation: text, publicationRisk: z.enum(['low', 'moderate', 'high']),
    similarity: text, missingContribution: text, potentialImpact: text,
    confidence: z.number().min(0).max(100), assumptions: textList,
  }),
  methodologyRecommendations: z.array(z.object({ area: text, recommendation: text, evidenceBasis: text, priority: z.enum(['high', 'medium', 'low']) })),
  researchGaps: z.array(z.object({ opportunity: text, rationale: text, confidence: z.enum(['high', 'medium', 'low']) })),
  actionItems: textList,
  backgroundOutline: textList,
  introductionSkeleton: textList,
  potentialDiscussionCitations: z.array(z.object({ paperId: z.string(), use: text })),
});

export const LiteratureReviewRequestSchema = z.object({
  question: ResearchQuestionSchema,
  papers: z.array(PaperMetadataSchema).min(1).max(30),
});

export type ResearchQuestion = z.infer<typeof ResearchQuestionSchema>;
export type PaperMetadata = z.infer<typeof PaperMetadataSchema>;
export type LiteratureSynthesis = z.infer<typeof LiteratureSynthesisSchema>;

export const LiteratureReviewEvaluationInputsSchema = z.object({
  literatureReview: z.string().trim().min(80, 'Paste a literature review of at least 80 characters.'),
  researchQuestion: text,
  targetJournal: text,
  manuscriptTitle: text,
  abstract: text,
  additionalContext: text,
});

const EvaluationDimensionSchema = z.object({
  score: z.number().min(0).max(100),
  assessment: z.string(),
  recommendations: textList,
});

export const LiteratureReviewEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  overallImpression: z.object({ verdict: z.string(), assessment: z.string() }),
  completeness: EvaluationDimensionSchema,
  scientificNarrative: EvaluationDimensionSchema,
  knowledgeGap: EvaluationDimensionSchema,
  criticalAppraisal: EvaluationDimensionSchema,
  journalFit: EvaluationDimensionSchema,
  revisionPriorities: z.object({
    highImpact: textList,
    mediumImpact: textList,
    minorImprovements: textList,
  }),
  evidenceLimitations: textList,
});

export type LiteratureReviewEvaluationInputs = z.infer<typeof LiteratureReviewEvaluationInputsSchema>;
export type LiteratureReviewEvaluation = z.infer<typeof LiteratureReviewEvaluationSchema>;

export const EMPTY_RESEARCH_QUESTION: ResearchQuestion = {
  title: '', objective: '', hypothesis: '', clinicalQuestion: '', population: '', intervention: '', comparator: '',
  primaryOutcome: '', secondaryOutcomes: [], studyType: '', specialty: 'Orthopaedic Surgery', keywords: [],
};

export function normalizeDoi(value: string) {
  return value.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim();
}

export function literatureReviewPrompt(input: z.infer<typeof LiteratureReviewRequestSchema>) {
  return `You are an experienced academic medical research mentor. Evaluate whether the proposed project is novel, clinically meaningful, methodologically feasible, and publishable. Integrate the supplied studies; do not merely summarize them.\n\nRules:\n- Use only facts in the supplied metadata/abstracts. Never invent full-text details.\n- Use an empty string/list when a detail is unavailable and explicitly include missing-data assumptions.\n- Similarity and novelty are calibrated estimates, never claims of exhaustive coverage.\n- Identify whether each paper strengthens, weakens, duplicates, or changes the proposed project.\n- Ground every methodology recommendation in the supplied evidence when possible.\n- Treat this as a narrative evidence map, not a completed systematic review.\n\nPROJECT:\n${JSON.stringify(input.question, null, 2)}\n\nSTUDIES:\n${JSON.stringify(input.papers, null, 2)}`;
}

export function literatureReviewEvaluationPrompt(input: LiteratureReviewEvaluationInputs) {
  return `You are BroBot, an experienced medical research mentor and rigorous journal reviewer. Evaluate the supplied literature review, summary, or notes. Refine the author's reasoning; do not replace it and do not create a new review.

REVIEW PRINCIPLES
- Judge whether the review would convince an experienced reviewer that the authors understand the field.
- Evaluate completeness cautiously. You may identify categories of evidence or likely landmark areas that appear absent, but never invent specific missing citations or claim the search is exhaustive.
- Distinguish synthesis from paper-by-paper summary. Assess whether the evidence forms a coherent scientific narrative.
- Determine whether the knowledge gap is clear, believable, clinically meaningful, and supported by the reviewed evidence.
- Assess whether study quality, design, sample size, bias, follow-up, generalizability, level of evidence, and conflicting findings receive appropriate weight.
- If a target journal is supplied, assess likely breadth, depth, tone, and structural fit. Do not invent journal rules.
- Use the title and abstract only to assess alignment. Use additional context for design, scope, inclusion criteria, search strategy, PRISMA intent, word limit, or reviewer concerns.
- Prioritize recommendations into high-impact, medium-impact, and minor improvements. Explain what to change and why.
- Use only the supplied content. Clearly identify limitations caused by missing search methods, citations, or full-text information.

REVIEW MATERIAL
${JSON.stringify(input, null, 2)}`;
}
