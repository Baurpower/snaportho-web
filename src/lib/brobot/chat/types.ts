import { z } from 'zod';

import { BroBotResearchSubmodeSchema } from '@/lib/brobot/research/types';

const OptionalBroBotResearchSubmodeSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  BroBotResearchSubmodeSchema.optional()
);

export const BROBOT_CHAT_MODES = [
  'auto',
  'or_prep',
  'oite',
  'clinic',
  'consult',
  'fracture_call',
  'research',
  'general',
] as const;

export const BROBOT_RESPONSE_DEPTHS = ['quick', 'standard', 'deep'] as const;

export const BROBOT_TRAINING_LEVELS = [
  'med_student',
  'pgy1',
  'pgy2',
  'pgy3',
  'pgy4',
  'pgy5',
  'attending',
] as const;

export const BroBotChatModeSchema = z.enum(BROBOT_CHAT_MODES);
export const BroBotResponseDepthSchema = z.enum(BROBOT_RESPONSE_DEPTHS);
export const BroBotTrainingLevelSchema = z.enum(BROBOT_TRAINING_LEVELS);
export const BroBotChatSourceSchema = z.enum([
  'manual',
  'suggested_question',
  'clarification_question',
  'branch_selection',
  'answer_now',
  'example_prompt',
]);
export const BroBotIntentSourceSchema = z.enum(['local', 'llm', 'fallback']);

export type BroBotChatMode = z.infer<typeof BroBotChatModeSchema>;
export type BroBotResponseDepth = z.infer<typeof BroBotResponseDepthSchema>;
export type BroBotTrainingLevel = z.infer<typeof BroBotTrainingLevelSchema>;
export type BroBotChatSource = z.infer<typeof BroBotChatSourceSchema>;
export type BroBotIntentSource = z.infer<typeof BroBotIntentSourceSchema>;
export type BroBotResearchSubmode = z.infer<typeof BroBotResearchSubmodeSchema>;

export const BroBotResponseTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const BroBotAnswerStatusSchema = z.enum(['answer', 'clarify']);
export const BroBotEntityResolutionStateSchema = z.enum([
  'resolved',
  'ambiguous',
  'unresolved',
]);

export type BroBotResponseTier = z.infer<typeof BroBotResponseTierSchema>;
export type BroBotAnswerStatus = z.infer<typeof BroBotAnswerStatusSchema>;
export type BroBotEntityResolutionState = z.infer<typeof BroBotEntityResolutionStateSchema>;

export const BroBotChatSubintentSchema = z.enum([
  'landmarks',
  'surgical_steps',
  'surgical_approach',
  'diagnostic_sequence',
  'implant_options',
  'brand_comparison',
  'anatomy_at_risk',
  'attending_questions',
  'treatment_algorithm',
  'classification',
  'indications',
  'patient_explanation',
  'quiz',
  'oite_traps',
  'workup',
  'evidence_critique',
  'initial_consult',
  'presentation_help',
  'imaging_review',
  'differential',
  'treatment_plan',
  'operative_indications',
  'complication',
  'postop_problem',
  'fracture',
  'infection',
  'urgent_red_flags',
  'overview',
  'other',
]);

export const BroBotChatAmbiguitySchema = z.enum(['low', 'moderate', 'high']);
export const BroBotConsultConfidenceSchema = z.enum(['low', 'moderate', 'high']);
export const BroBotProcedureCategorySchema = z.enum([
  'fracture_orif',
  'arthroplasty',
  'arthroscopy',
  'soft_tissue_release',
  'tendon_ligament_repair',
  'spine_procedure',
  'hand_procedure',
  'infection_consult',
  'postop_complication',
  'arthroplasty_consult',
  'sports_injury',
  'pediatric_fracture',
  'general_topic',
  'unknown',
]);

export type BroBotChatSubintent = z.infer<typeof BroBotChatSubintentSchema>;
export type BroBotChatAmbiguity = z.infer<typeof BroBotChatAmbiguitySchema>;
export type BroBotConsultConfidence = z.infer<typeof BroBotConsultConfidenceSchema>;
export type BroBotProcedureCategory = z.infer<typeof BroBotProcedureCategorySchema>;

export const BroBotBranchOptionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(80),
  description: z.string().trim().max(180).optional(),
  category: z.string().trim().max(80).optional(),
  topicId: z.string().uuid().optional(),
  branchQuestionId: z.string().uuid().optional(),
  rankScore: z.number().optional(),
});

export type BroBotBranchOption = z.infer<typeof BroBotBranchOptionSchema>;

export const BroBotChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().trim().min(1),
});

export type BroBotChatMessage = z.infer<typeof BroBotChatMessageSchema>;

export const BROBOT_CHAT_MESSAGE_MAX_LENGTH = 8000;

export const BroBotChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(BROBOT_CHAT_MESSAGE_MAX_LENGTH),
  mode: BroBotChatModeSchema.default('auto'),
  responseDepth: BroBotResponseDepthSchema.default('standard'),
  trainingLevel: BroBotTrainingLevelSchema.default('pgy2'),
  source: BroBotChatSourceSchema.default('manual'),
  sourceMessageId: z.string().uuid().optional(),
  selectedBranchId: z.string().trim().min(1).max(80).optional(),
  selectedBranchLabel: z.string().trim().min(1).max(80).optional(),
  selectedBranchRankPosition: z.number().int().min(1).max(20).optional(),
  intentMode: BroBotChatModeSchema.exclude(['auto']).optional(),
  intentSubintent: BroBotChatSubintentSchema.optional(),
  intentProcedureOrTopic: z.string().trim().max(160).optional(),
  intentProcedureCategory: BroBotProcedureCategorySchema.optional(),
  intentAmbiguity: BroBotChatAmbiguitySchema.optional(),
  intentReasonForBranching: z.string().trim().max(300).optional(),
  intentSource: BroBotIntentSourceSchema.optional(),
  researchSubmode: OptionalBroBotResearchSubmodeSchema,
  answerNow: z.boolean().optional(),
  stream: z.boolean().optional(),
});

export type BroBotChatRequest = z.infer<typeof BroBotChatRequestSchema>;

export const BroBotChatOutputSchema = z.object({
  tier: BroBotResponseTierSchema.optional(),
  status: BroBotAnswerStatusSchema.optional(),
  directAnswer: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  pearl: z.string().optional(),
  pitfall: z.string().optional(),
  clarifyingQuestion: z.string().optional(),
  specialty: z.string().optional(),
  resolvedTopic: z.string().optional(),
  entityResolutionState: BroBotEntityResolutionStateSchema.optional(),
  goal: z.string().optional(),
  selectedFocus: z.string().optional(),
  answer: z.string(),
  priorityPoints: z.array(z.string()),
  knowledgeGaps: z.array(z.string()),
  whatMostResidentsMiss: z.array(z.string()).optional(),
  suggestedQuestions: z.array(z.string()),
  nextLearningBranches: z.array(BroBotBranchOptionSchema).optional(),
  tags: z.array(z.string()),
  detectedMode: BroBotChatModeSchema,
  confidence: z.number().min(0).max(1),
  needsClarification: z.boolean().optional(),
  clarifyingQuestions: z.array(z.string()).optional(),
  assumedContext: z.string().optional(),
  consultConfidence: BroBotConsultConfidenceSchema.optional(),
  missingInformation: z.array(z.string()).optional(),
  researchSubmode: BroBotResearchSubmodeSchema.optional(),
});

export type BroBotChatOutput = z.infer<typeof BroBotChatOutputSchema>;

export type BroBotResolvedEntity = {
  abbreviation: string;
  expansion: string;
  type: 'tendon' | 'muscle' | 'nerve' | 'joint' | 'procedure' | 'anatomy';
  specialty: 'hand_surgery' | 'orthopaedics';
};

export type BroBotEntityResolution = {
  state: BroBotEntityResolutionState;
  specialty: 'hand_surgery' | 'orthopaedics' | 'unknown';
  resolvedTopic: string;
  entities: BroBotResolvedEntity[];
  relationship?: string;
  clarifyingQuestion?: string;
};

export const BroBotMetadataOutputSchema = z.object({
  suggestedQuestions: z.array(z.string()),
  nextLearningBranches: z.array(BroBotBranchOptionSchema),
  tags: z.array(z.string()),
});

export type BroBotMetadataOutput = z.infer<typeof BroBotMetadataOutputSchema>;

export const BroBotChatIntentSchema = z.object({
  mode: BroBotChatModeSchema.exclude(['auto']),
  subintent: BroBotChatSubintentSchema,
  procedureCategory: BroBotProcedureCategorySchema,
  procedureOrTopic: z.string(),
  goal: z.string().optional(),
  ambiguity: BroBotChatAmbiguitySchema,
  assumedContext: z.string(),
  missingContext: z.array(z.string()),
  clarifyingQuestions: z.array(z.string()),
  branchOptions: z.array(BroBotBranchOptionSchema).optional(),
  answerImmediately: z.boolean().optional(),
  requiresBranchSelection: z.boolean().optional(),
  reasonForBranching: z.string().optional(),
  researchSubmode: BroBotResearchSubmodeSchema.optional(),
  confidence: z.number().min(0).max(1),
});

export type BroBotChatIntent = z.infer<typeof BroBotChatIntentSchema>;

export type BroBotModelMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type BroBotClinicalEntities = {
  region?: string;
  bone?: string;
  joint?: string;
  diagnosis?: string;
  procedure?: string;
  fracturePattern?: string;
  laterality?: 'left' | 'right';
  implant?: string;
  classification?: string;
};

export type BroBotClinicalCaseSlots = {
  age?: string;
  mechanism?: string;
  acuity?: string;
  openClosed?: 'open' | 'closed';
  neurovascularStatus?: string;
  imaging?: string[];
  labs?: string[];
  reduction?: string;
  priorSurgery?: string;
  woundStatus?: string;
};

export type BroBotClinicalTaskFacet =
  | 'anatomy'
  | 'classification'
  | 'workup'
  | 'imaging'
  | 'indications'
  | 'treatmentAlgorithm'
  | 'exposure'
  | 'steps'
  | 'implants'
  | 'complications'
  | 'pitfalls'
  | 'testTraps'
  | 'distractors'
  | 'disposition';

export type BroBotClinicalCoverageRequirement =
  | 'named_anatomy'
  | 'exposure_or_approach'
  | 'key_steps_or_checks'
  | 'decision_points'
  | 'pitfalls_or_bailout'
  | 'tested_concept'
  | 'stem_clues'
  | 'trap_or_distractor'
  | 'algorithm_or_threshold'
  | 'red_flags'
  | 'missing_information'
  | 'workup'
  | 'temporizing_care'
  | 'definitive_management_or_disposition'
  | 'differential'
  | 'history_exam'
  | 'first_line_management'
  | 'escalation';

export type BroBotClinicalContext = {
  entities: BroBotClinicalEntities;
  caseSlots: BroBotClinicalCaseSlots;
  taskFacets: BroBotClinicalTaskFacet[];
  missingCriticalSlots: string[];
  coverageRequirements: BroBotClinicalCoverageRequirement[];
};
