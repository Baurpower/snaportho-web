import { z } from 'zod';

export const BROBOT_EVAL_SEVERITIES = ['none', 'minor', 'moderate', 'critical', 'pipeline_error'] as const;
export const BroBotEvalSeveritySchema = z.enum(BROBOT_EVAL_SEVERITIES);
export type BroBotEvalSeverity = z.infer<typeof BroBotEvalSeveritySchema>;

export const BROBOT_FAILURE_LABELS = [
  'too_generic',
  'missed_question',
  'wrong_mode',
  'wrong_level',
  'unsafe',
  'hallucination',
  'poor_teaching',
  'missing_key_anatomy',
  'missing_exposure',
  'missing_indications',
  'missing_contraindications',
  'missing_complications',
  'missing_postop',
  'weak_reasoning',
  'retrieval_failure',
  'routing_failure',
  'prompt_failure',
  'formatting_problem',
  'repetition',
  'too_long',
  'too_short',
  'incorrect_prioritization',
  'did_not_clarify',
  'incorrect_citation',
  'unsupported_claim',
] as const;
export type BroBotFailureLabel = (typeof BROBOT_FAILURE_LABELS)[number];

// Failure labels that always force severity=critical and requires_admin_review=true,
// per the evaluator spec's "Critical Failure Detection" requirements.
export const BROBOT_CRITICAL_FAILURE_LABELS: ReadonlySet<BroBotFailureLabel> = new Set([
  'unsafe',
  'hallucination',
  'incorrect_citation',
]);

export const BroBotEvalSubscoresSchema = z.object({
  accuracy: z.number().min(0).max(10),
  question_understanding: z.number().min(0).max(10),
  educational_quality: z.number().min(0).max(10),
  specificity: z.number().min(0).max(10),
  clinical_utility: z.number().min(0).max(10),
  completeness: z.number().min(0).max(10),
  appropriate_level: z.number().min(0).max(10),
  structure: z.number().min(0).max(10),
  safety: z.number().min(0).max(10),
  hallucination_risk: z.number().min(0).max(10),
});
export type BroBotEvalSubscores = z.infer<typeof BroBotEvalSubscoresSchema>;

export const BroBotEvalResultSchema = z.object({
  overall_score: z.number().min(0).max(100),
  severity: BroBotEvalSeveritySchema,
  requires_admin_review: z.boolean(),
  subscores: BroBotEvalSubscoresSchema,
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  failure_labels: z.array(z.string()).default([]),
  missing_topics: z.array(z.string()).default([]),
  summary: z.string(),
  engineering_recommendation: z.string(),
  confidence: z.number().min(0).max(1),
});
export type BroBotEvalResult = z.infer<typeof BroBotEvalResultSchema>;

export type BroBotEvalConversationTurn = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type BroBotEvalJobInput = {
  jobId: string;
  conversationId: string;
  messageId: string;
  userId: string;
  mode: string | null;
  procedure: string | null;
  model: string;
  trainingLevel: string | null;
  responseDepth: string | null;
  intentSnapshot: Record<string, unknown> | null;
  contextSnapshot: Record<string, unknown> | null;
  conversationHistory: BroBotEvalConversationTurn[];
  currentUserQuestion: string;
  finalAssistantResponse: string;
};
