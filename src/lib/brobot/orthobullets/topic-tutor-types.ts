import { z } from 'zod';

import { OrthobulletsPageContextSchema } from './types';

// Orthobullets Page Mode — active-reading tutor for topic pages. Kept in its
// own schema/prompt/parser (not shared with ROCK's curriculum_content path
// or the question-tutor path) so the two modes can't accidentally end up
// reusing the same generic "teach this page" prompt.
export const OrthobulletsTopicActionSchema = z.enum([
  'quiz_me',
  'find_answer',
  'explain_section',
  'what_tested',
  'attending_question',
  'explain_images',
  'board_traps',
  'save_missed',
]);
export type OrthobulletsTopicAction = z.infer<typeof OrthobulletsTopicActionSchema>;

export const OrthobulletsTopicProgressSchema = z.object({
  sectionsCompleted: z.array(z.string().trim().min(1).max(240)).max(40).default([]),
  conceptsMastered: z.array(z.string().trim().min(1).max(160)).max(60).default([]),
  conceptsMissed: z.array(z.string().trim().min(1).max(160)).max(60).default([]),
  savedPearls: z.array(z.string().trim().min(1).max(300)).max(40).default([]),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).default(1),
});
export type OrthobulletsTopicProgress = z.infer<typeof OrthobulletsTopicProgressSchema>;

export const OrthobulletsTopicTutorTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
});
export type OrthobulletsTopicTutorTurn = z.infer<typeof OrthobulletsTopicTutorTurnSchema>;

export const OrthobulletsTopicTutorRequestSchema = z.object({
  pageContext: OrthobulletsPageContextSchema,
  action: OrthobulletsTopicActionSchema.optional(),
  progress: OrthobulletsTopicProgressSchema,
  history: z.array(OrthobulletsTopicTutorTurnSchema).max(20).default([]),
  userMessage: z.string().trim().min(1).max(2000).optional(),
});
export type OrthobulletsTopicTutorRequest = z.infer<typeof OrthobulletsTopicTutorRequestSchema>;

export const OrthobulletsTopicTutorResponseSchema = z.object({
  responseId: z.string().uuid(),
  message: z.string().trim().min(1).max(1600),
  citedHeading: z.string().trim().max(240).nullable().optional(),
  citedQuote: z.string().trim().max(600).nullable().optional(),
  verdict: z.enum(['correct', 'partial', 'incorrect']).nullable().optional(),
  clinicalWhyItMatters: z.string().trim().max(600).nullable().optional(),
  followUpQuestion: z.string().trim().max(400).nullable().optional(),
  conceptTag: z.string().trim().max(160).nullable().optional(),
  conceptStatus: z.enum(['missed', 'mastered']).nullable().optional(),
  sectionCompleted: z.string().trim().max(240).nullable().optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).default(1),
  insufficientContent: z.boolean().default(false),
  suggestedChips: z.array(z.string().trim().min(1).max(80)).max(6).default([]),
  warnings: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  usage: z
    .object({
      remainingToday: z.number().int().min(0).nullable(),
      dailyCap: z.number().int().min(0).nullable(),
      unlimited: z.boolean(),
    })
    .optional(),
});
export type OrthobulletsTopicTutorResponse = z.infer<typeof OrthobulletsTopicTutorResponseSchema>;
