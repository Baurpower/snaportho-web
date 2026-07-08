import { z } from 'zod';

import {
  CurriculumExplainEmphasisSchema,
  CurriculumStudyResponseSchema,
} from './curriculum-types';

const OrthobulletsChoiceSchema = z.object({
  key: z.string().trim().min(1).max(32).optional(),
  label: z.string().trim().min(1).max(32).nullable().optional(),
  text: z.string().trim().min(1).max(4000),
  isSelected: z.boolean().nullable().optional(),
  isCorrect: z.boolean().nullable().optional(),
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
  caption: z.string().trim().max(1000).nullable().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const OrthobulletsDebugSchema = z.object({
  matchedSelectors: z.record(z.string(), z.array(z.string())).default({}),
  extractorVersion: z.string().trim().min(1).max(64),
});

export const OrthobulletsPageContextSchema = z.object({
  source: z.enum(['orthobullets', 'rock']).default('orthobullets'),
  provider: z.enum(['orthobullets', 'rock']).default('orthobullets'),
  mode: z.enum(['question', 'curriculum_content', 'topic_page']).default('question'),
  pageUrl: z.string().trim().url(),
  sourceUrl: z.string().trim().url().optional(),
  pageKind: z.string().trim().min(1).max(80).default('unknown'),
  questionId: z.string().trim().min(1).max(64).nullable().optional(),
  topicId: z.string().trim().min(1).max(64).nullable().optional(),
  title: z.string().trim().min(1).max(300).nullable().optional(),
  breadcrumbs: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  authors: z.array(z.string().trim().min(1).max(200)).max(12).default([]).optional(),
  date: z.string().trim().min(1).max(120).nullable().optional(),
  sectionHeadings: z.array(z.string().trim().min(1).max(240)).max(40).default([]).optional(),
  contentText: z.string().trim().min(1).max(16000).nullable().optional(),
  contentMarkdown: z.string().trim().min(1).max(16000).nullable().optional(),
  references: z.array(z.string().trim().min(1).max(1200)).max(40).default([]).optional(),
  referencesCount: z.number().int().min(0).max(100).optional(),
  tablesCount: z.number().int().min(0).max(50).optional(),
  questionCount: z.number().int().min(0).max(9999).optional(),
  cardCount: z.number().int().min(0).max(9999).optional(),
  videoCount: z.number().int().min(0).max(9999).optional(),
  contentSections: z.array(z.object({
    heading: z.string().trim().min(1).max(240),
    text: z.string().trim().min(1).max(4000),
  })).max(24).default([]).optional(),
  learningObjectives: z.array(z.string().trim().min(1).max(400)).max(20).default([]).optional(),
  tablesMarkdown: z.array(z.string().trim().min(1).max(2000)).max(8).default([]).optional(),
  stem: z.string().trim().min(1).max(12000).optional(),
  answerChoices: z.array(OrthobulletsChoiceSchema).max(12).default([]),
  selectedAnswerKey: z.string().trim().min(1).max(32).nullable().optional(),
  correctAnswerKey: z.string().trim().min(1).max(32).nullable().optional(),
  selectedAnswer: z.string().trim().min(1).max(4000).nullable().optional(),
  correctAnswer: z.string().trim().min(1).max(4000).nullable().optional(),
  percentDistribution: z.array(OrthobulletsPercentDistributionSchema).max(12).default([]),
  explanationText: z.string().trim().min(1).max(16000).nullable().optional(),
  explanation: z.string().trim().min(1).max(16000).nullable().optional(),
  linkedConcepts: z.array(OrthobulletsLinkedConceptSchema).max(20).default([]),
  images: z.array(OrthobulletsImageMetadataSchema).max(20).default([]),
  raw: z.object({
    providerSpecific: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  extractionWarnings: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  debug: OrthobulletsDebugSchema.optional(),
});

export const OrthobulletsExplainRequestSchema = z.object({
  pageContext: OrthobulletsPageContextSchema,
  emphasis: CurriculumExplainEmphasisSchema.optional(),
});

export const OrthobulletsHintRequestSchema = z.object({
  pageContext: OrthobulletsPageContextSchema,
  hintLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  selectedAnswerKey: z.string().trim().min(1).max(32).optional(),
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
  boardTrap: z.string().trim().min(1).max(500).optional(),
  // The single highest-yield, memorable teaching takeaway.
  boardPearl: z.string().trim().min(1).max(500),
  studyNext: z.array(z.string().trim().min(1).max(240)).max(6).default([]),
  warnings: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  usage: z.object({
    remainingToday: z.number().int().min(0).nullable(),
    dailyCap: z.number().int().min(0).nullable(),
    unlimited: z.boolean(),
  }).optional(),
});

export const OrthobulletsChatTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
});

const OrthobulletsChatExplanationSchema = OrthobulletsExplainResponseSchema.omit({
  explanationId: true,
  usage: true,
});

const CurriculumChatStudySchema = CurriculumStudyResponseSchema.omit({
  explanationId: true,
  usage: true,
});

export const OrthobulletsChatRequestSchema = z.object({
  pageContext: OrthobulletsPageContextSchema,
  explanation: OrthobulletsChatExplanationSchema.optional(),
  curriculumStudy: CurriculumChatStudySchema.optional(),
  emphasis: CurriculumExplainEmphasisSchema.optional(),
  history: z.array(OrthobulletsChatTurnSchema).max(12).default([]),
  userMessage: z.string().trim().min(1).max(1000),
}).superRefine((value, ctx) => {
  const hasQuestion = Boolean(value.explanation);
  const hasCurriculum = Boolean(value.curriculumStudy);
  if (hasQuestion === hasCurriculum) {
    ctx.addIssue({
      code: 'custom',
      message: 'Provide exactly one of explanation or curriculumStudy.',
      path: ['explanation'],
    });
  }
});

export const OrthobulletsChatResponseSchema = z.object({
  responseId: z.string().uuid(),
  answer: z.string().trim().min(1).max(2400),
  suggestedPrompts: z.array(z.string().trim().min(1).max(160)).max(4).default([]),
  warnings: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  usage: z.object({
    remainingToday: z.number().int().min(0).nullable(),
    dailyCap: z.number().int().min(0).nullable(),
    unlimited: z.boolean(),
  }).optional(),
});

export const OrthobulletsHintResponseSchema = z.object({
  hintId: z.string().uuid(),
  hintLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: z.string().trim().min(1).max(120),
  hint: z.string().trim().min(1).max(800),
  avoidRevealingAnswer: z.boolean(),
  nextActionLabel: z.string().trim().min(1).max(80).optional(),
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
export type OrthobulletsHintRequest = z.infer<typeof OrthobulletsHintRequestSchema>;
export type OrthobulletsHintResponse = z.infer<typeof OrthobulletsHintResponseSchema>;
export type OrthobulletsChatTurn = z.infer<typeof OrthobulletsChatTurnSchema>;
export type OrthobulletsChatRequest = z.infer<typeof OrthobulletsChatRequestSchema>;
export type OrthobulletsChatResponse = z.infer<typeof OrthobulletsChatResponseSchema>;

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
