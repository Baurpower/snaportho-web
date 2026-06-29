import { z } from 'zod';

const OrthobulletsChoiceSchema = z.object({
  key: z.string().trim().min(1).max(32).optional(),
  text: z.string().trim().min(1).max(4000),
  isSelected: z.boolean().optional(),
  isCorrect: z.boolean().optional(),
});

const OrthobulletsPercentDistributionSchema = z.object({
  answerKey: z.string().trim().min(1).max(32).optional(),
  label: z.string().trim().min(1).max(120).optional(),
  percent: z.number().min(0).max(100).optional(),
});

const OrthobulletsLinkedConceptSchema = z.object({
  label: z.string().trim().min(1).max(240),
  href: z.string().trim().max(2000).optional(),
  kind: z.enum(['oite', 'card', 'topic']).optional(),
});

const OrthobulletsImageMetadataSchema = z.object({
  src: z.string().trim().max(2000).optional(),
  alt: z.string().trim().max(500).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const OrthobulletsDebugSchema = z.object({
  matchedSelectors: z.record(z.string(), z.array(z.string())).default({}),
  extractorVersion: z.string().trim().min(1).max(64),
});

export const OrthobulletsPageContextSchema = z.object({
  source: z.literal('orthobullets'),
  pageUrl: z.string().trim().url(),
  pageKind: z.enum(['review', 'current_test', 'unknown']).default('unknown'),
  questionId: z.string().trim().min(1).max(64).optional(),
  topicId: z.string().trim().min(1).max(64).optional(),
  breadcrumbs: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  stem: z.string().trim().min(1).max(12000).optional(),
  answerChoices: z.array(OrthobulletsChoiceSchema).max(12).default([]),
  selectedAnswerKey: z.string().trim().min(1).max(32).optional(),
  correctAnswerKey: z.string().trim().min(1).max(32).optional(),
  percentDistribution: z.array(OrthobulletsPercentDistributionSchema).max(12).default([]),
  explanationText: z.string().trim().min(1).max(16000).optional(),
  linkedConcepts: z.array(OrthobulletsLinkedConceptSchema).max(20).default([]),
  images: z.array(OrthobulletsImageMetadataSchema).max(20).default([]),
  extractionWarnings: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  debug: OrthobulletsDebugSchema.optional(),
});

export const OrthobulletsExplainRequestSchema = z.object({
  pageContext: OrthobulletsPageContextSchema,
});

export const OrthobulletsExplainResponseSchema = z.object({
  explanationId: z.string().uuid(),
  // 1-2 sentence direct answer: the diagnosis/principle + which choice wins.
  bottomLine: z.string().trim().min(1).max(400),
  // The single concept being tested, named concretely (not a vague topic).
  testedConcept: z.string().trim().min(1).max(200),
  whyCorrect: z.string().trim().min(1).max(2000),
  whyWrong: z.array(
    z.object({
      choiceKey: z.string().trim().min(1).max(32).optional(),
      reason: z.string().trim().min(1).max(600),
      // At most one distractor should be flagged true: the classic
      // board/OITE trap (the choice residents most often pick incorrectly).
      isClassicTrap: z.boolean().optional(),
    })
  ).max(12),
  // The single highest-yield, memorable teaching takeaway.
  boardPearl: z.string().trim().min(1).max(500),
  warnings: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  usage: z.object({
    remainingToday: z.number().int().min(0).nullable(),
    dailyCap: z.number().int().min(0).nullable(),
    unlimited: z.boolean(),
  }).optional(),
});

export type OrthobulletsPageContext = z.infer<typeof OrthobulletsPageContextSchema>;
export type OrthobulletsExplainRequest = z.infer<typeof OrthobulletsExplainRequestSchema>;
export type OrthobulletsExplainResponse = z.infer<typeof OrthobulletsExplainResponseSchema>;

export type OrthobulletsKgLookupResult = {
  matchedQuestionId: string | null;
  curriculumNodeId: string | null;
  curriculumNodeSlug: string | null;
  curriculumNodeTitle: string | null;
  conceptId: string | null;
  canonicalEntityIds: string[];
  sourceQuestionId: string | null;
  sourceTopicSlug: string | null;
  sourceTopicRaw: string | null;
  sourceSpecialty: string | null;
};
