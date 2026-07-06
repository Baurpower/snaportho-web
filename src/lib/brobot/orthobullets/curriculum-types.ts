import { z } from 'zod';

export const CurriculumExplainEmphasisSchema = z.enum(['high_yield', 'clinical', 'boards', 'or']);
export type CurriculumExplainEmphasis = z.infer<typeof CurriculumExplainEmphasisSchema>;

const MustKnowGroupSchema = z.object({
  title: z.string().trim().min(1).max(120),
  bullets: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
});

const AttendingQuestionSchema = z.object({
  question: z.string().trim().min(1).max(240),
  answer: z.string().trim().min(1).max(400),
  difficulty: z.enum(['MS3', 'PGY1', 'PGY2+']),
});

const MiniQuizItemSchema = z.object({
  question: z.string().trim().min(1).max(240),
  choices: z.array(z.string().trim().min(1).max(160)).max(6).optional(),
  answer: z.string().trim().min(1).max(160),
  explanation: z.string().trim().min(1).max(400),
});

const LearningObjectiveCoverageSchema = z.object({
  objective: z.string().trim().min(1).max(300),
  status: z.enum(['covered', 'partial', 'not_covered']).optional(),
  highYieldPoint: z.string().trim().min(1).max(240).optional(),
});

const ComparisonTableSchema = z.object({
  headers: z.array(z.string().trim().min(1).max(80)).min(2).max(8),
  rows: z.array(z.array(z.string().trim().min(1).max(160)).min(2).max(8)).max(12),
});

export const CurriculumStudyResponseSchema = z.object({
  responseKind: z.literal('curriculum'),
  explanationId: z.string().uuid(),
  emphasis: CurriculumExplainEmphasisSchema,
  oneSentenceTakeaway: z.string().trim().min(1).max(280),
  inThirtySeconds: z.array(z.string().trim().min(1).max(200)).min(1).max(6),
  mustKnow: z.array(MustKnowGroupSchema).max(6).default([]),
  clinicalPearls: z.array(z.string().trim().min(1).max(240)).max(8).default([]),
  commonMistakes: z.array(z.string().trim().min(1).max(240)).max(8).default([]),
  attendingQuestions: z.array(AttendingQuestionSchema).max(6).default([]),
  testableFacts: z.array(z.string().trim().min(1).max(240)).max(10).default([]),
  miniQuiz: z.array(MiniQuizItemSchema).max(4).default([]),
  memoryHooks: z.array(z.string().trim().min(1).max(240)).max(6).default([]),
  suggestedFollowUps: z.array(z.string().trim().min(1).max(200)).max(8).default([]),
  nextReviewTopics: z.array(z.string().trim().min(1).max(160)).max(6).default([]),
  learningObjectives: z.array(LearningObjectiveCoverageSchema).max(12).default([]),
  comparisonTable: ComparisonTableSchema.optional(),
  deepDive: z.array(z.string().trim().min(1).max(300)).max(8).default([]),
  referencesNote: z.string().trim().min(1).max(400).optional(),
  fallbackBullets: z.array(z.string().trim().min(1).max(240)).max(6).optional(),
  parseError: z.string().trim().min(1).max(300).optional(),
  warnings: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  usage: z
    .object({
      remainingToday: z.number().int().min(0).nullable(),
      dailyCap: z.number().int().min(0).nullable(),
      unlimited: z.boolean(),
    })
    .optional(),
});

export const CurriculumExplainRequestSchema = z.object({
  pageContext: z.any(),
  emphasis: CurriculumExplainEmphasisSchema.default('high_yield'),
});

export type CurriculumStudyResponse = z.infer<typeof CurriculumStudyResponseSchema>;

export type CurriculumStudyPayload = Omit<CurriculumStudyResponse, 'explanationId' | 'usage' | 'responseKind'>;

export function isCurriculumStudyResponse(
  value: { responseKind?: string } | null | undefined
): value is CurriculumStudyResponse {
  return value?.responseKind === 'curriculum';
}