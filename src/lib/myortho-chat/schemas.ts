import { z } from 'zod';

export const MyOrthoChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(3000),
  })).max(10).default([]),
  context: z.object({
    recoveryStage: z.enum(['considering', 'pre_surgery', 'surgery', 'early_recovery', 'long_term']).optional(),
    daysFromSurgery: z.number().int().min(-3650).max(3650).optional(),
  }).optional(),
});

export const MyOrthoUrgencySchema = z.enum([
  'emergency',
  'contact_surgical_team',
  'routine_follow_up',
  'educational_only',
]);

export const MyOrthoChatResponseSchema = z.object({
  answer: z.string().min(1).max(2400),
  urgency: MyOrthoUrgencySchema,
  urgencyMessage: z.string().max(600).nullable(),
  sources: z.array(z.object({
    sourceId: z.string(),
    title: z.string(),
    publisher: z.string(),
    url: z.string().url(),
  })).max(4),
  relatedArticles: z.array(z.object({ id: z.string(), title: z.string() })).max(3),
  suggestedQuestions: z.array(z.string().max(180)).max(2),
});

export type MyOrthoChatRequest = z.infer<typeof MyOrthoChatRequestSchema>;
export type MyOrthoChatResponse = z.infer<typeof MyOrthoChatResponseSchema>;
