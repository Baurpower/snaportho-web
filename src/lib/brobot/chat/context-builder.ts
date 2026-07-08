import type {
  BroBotBranchOption,
  BroBotChatIntent,
  BroBotModelMessage,
  BroBotResponseDepth,
  BroBotTrainingLevel,
} from './types';
import type { BroBotClinicalContext } from './types';
import {
  buildBroBotClinicalContextFromIntent,
  formatClinicalContextForPrompt,
} from './clinical-context';
import {
  getCasePrepCertifiedContext,
  type BroBotCertifiedContext,
} from './caseprep-context';
import {
  buildOrPrepProcedureMetadata,
  type OrPrepProcedureMetadata,
} from './or-prep-context';
import {
  buildOiteLearningMetadata,
  type OiteLearningMetadata,
} from './oite-context';

export type BroBotAnswerContext = {
  selectedBranch?: {
    id?: string;
    label?: string;
  };
  mode: BroBotChatIntent['mode'];
  subintent: BroBotChatIntent['subintent'];
  procedureCategory: BroBotChatIntent['procedureCategory'];
  procedureOrTopic: string;
  trainingLevel: BroBotTrainingLevel;
  responseDepth: BroBotResponseDepth;
  recentConversationSummary: string;
  certifiedContext: BroBotCertifiedContext;
  orPrepProcedureMetadata: OrPrepProcedureMetadata | null;
  oiteLearningMetadata: OiteLearningMetadata | null;
  clinicalContext: BroBotClinicalContext;
};

export async function buildBroBotAnswerContext(input: {
  message?: string;
  intent: BroBotChatIntent;
  selectedBranch?: {
    id?: string;
    label?: string;
  };
  trainingLevel: BroBotTrainingLevel;
  responseDepth: BroBotResponseDepth;
  history: BroBotModelMessage[];
}): Promise<BroBotAnswerContext> {
  const recentConversationSummary = input.history
    .slice(-6)
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n')
    .slice(0, 2000);

  const certifiedContext = await getCasePrepCertifiedContext({
    procedureOrTopic: input.intent.procedureOrTopic,
    procedureCategory: input.intent.procedureCategory,
    mode: input.intent.mode,
    selectedBranchLabel: input.selectedBranch?.label,
  });
  const orPrepProcedureMetadata = buildOrPrepProcedureMetadata(input.intent);
  const oiteLearningMetadata = buildOiteLearningMetadata(input.intent);
  const clinicalContext = buildBroBotClinicalContextFromIntent({
    message: input.message ?? input.intent.procedureOrTopic,
    intent: input.intent,
    selectedBranch: input.selectedBranch,
  });

  return {
    selectedBranch: input.selectedBranch,
    mode: input.intent.mode,
    subintent: input.intent.subintent,
    procedureCategory: input.intent.procedureCategory,
    procedureOrTopic: input.intent.procedureOrTopic,
    trainingLevel: input.trainingLevel,
    responseDepth: input.responseDepth,
    recentConversationSummary,
    certifiedContext,
    orPrepProcedureMetadata,
    oiteLearningMetadata,
    clinicalContext,
  };
}

/**
 * Maps quality gate warning codes to targeted follow-up chip suggestions.
 * Only unmet coverage facets produce chips — generic style warnings are excluded.
 * These chips are merged into fallbackBranches before the metadata pass so the
 * model can pick them up as high-priority follow-up options.
 */
const FACET_WARNING_TO_CHIP: Record<string, { id: string; label: string; description: string; category: string }> = {
  facet_or_prep_exposure_missing: {
    id: 'chip_exposure_approach',
    label: 'Exposure and approach',
    description: 'Walk through the surgical interval, incision, and key landmarks.',
    category: 'or_prep',
  },
  or_prep_exposure_terms_missing: {
    id: 'chip_exposure_approach',
    label: 'Exposure and approach',
    description: 'Walk through the surgical interval, incision, and key landmarks.',
    category: 'or_prep',
  },
  facet_named_anatomy_missing: {
    id: 'chip_anatomy_at_risk',
    label: 'Anatomy at risk',
    description: 'Name the nerves, vessels, and tendons at risk and how to protect them.',
    category: 'or_prep',
  },
  or_prep_named_anatomy_missing: {
    id: 'chip_anatomy_at_risk',
    label: 'Anatomy at risk',
    description: 'Name the nerves, vessels, and tendons at risk and how to protect them.',
    category: 'or_prep',
  },
  facet_pitfall_layer_missing: {
    id: 'chip_pitfalls_bailouts',
    label: 'Pitfalls and bailouts',
    description: 'What can go wrong and how to recover intraoperatively.',
    category: 'or_prep',
  },
  or_prep_pitfall_bailout_missing: {
    id: 'chip_pitfalls_bailouts',
    label: 'Pitfalls and bailouts',
    description: 'What can go wrong and how to recover intraoperatively.',
    category: 'or_prep',
  },
  or_prep_decision_point_missing: {
    id: 'chip_decision_points',
    label: 'Decision points',
    description: 'Key intraoperative checks and decision branches.',
    category: 'or_prep',
  },
  facet_oite_trap_distractor_missing: {
    id: 'chip_board_traps',
    label: 'Board traps and distractors',
    description: 'Common wrong answers and how to avoid them on the OITE.',
    category: 'oite',
  },
  facet_algorithm_threshold_missing: {
    id: 'chip_algorithm_thresholds',
    label: 'Algorithm and thresholds',
    description: 'Classification system, treatment thresholds, and decision pivots.',
    category: 'oite',
  },
  facet_consult_red_flags_missing: {
    id: 'chip_red_flags_urgency',
    label: 'Red flags and urgency',
    description: 'What requires emergent vs. urgent vs. routine escalation.',
    category: 'consult',
  },
  facet_consult_disposition_missing: {
    id: 'chip_disposition_plan',
    label: 'Disposition plan',
    description: 'Admission, discharge, follow-up, and attending notification criteria.',
    category: 'consult',
  },
  facet_clinic_differential_missing: {
    id: 'chip_differential_diagnosis',
    label: 'Differential diagnosis',
    description: 'Leading diagnoses to consider and how to distinguish them.',
    category: 'clinic',
  },
};

export function buildUncoveredFacetChips(input: {
  qualityWarnings: string[];
  procedureOrTopic: string;
}): BroBotBranchOption[] {
  const seen = new Set<string>();
  const chips: BroBotBranchOption[] = [];

  for (const warning of input.qualityWarnings) {
    const chip = FACET_WARNING_TO_CHIP[warning];
    if (chip && !seen.has(chip.id)) {
      seen.add(chip.id);
      chips.push({
        id: chip.id,
        label: chip.label,
        description: chip.description,
        category: chip.category,
      });
    }
  }

  return chips;
}

export function formatRecentConversationForPrompt(context?: BroBotAnswerContext): string {
  if (!context?.recentConversationSummary) return '';
  return `Recent conversation context (most recent turns; resolve pronouns and follow-up references against this before answering):\n${context.recentConversationSummary}`;
}

export function formatAnswerContextForPrompt(context?: BroBotAnswerContext): string {
  if (!context) return '';

  const certified = context.certifiedContext
    ? [
        `Certified context source: ${context.certifiedContext.source}`,
        `Certified context title: ${context.certifiedContext.title}`,
        ...context.certifiedContext.sections.map(
          (section) => `${section.label}: ${section.content}`
        ),
      ].join('\n')
    : 'Certified context: none available for this turn.';
  const orPrepMetadata = context.orPrepProcedureMetadata
    ? [
        'Hidden OR Prep procedure metadata:',
        `- family: ${context.orPrepProcedureMetadata.family}`,
        `- operationType: ${context.orPrepProcedureMetadata.operationType}`,
        `- primaryObjective: ${context.orPrepProcedureMetadata.primaryObjective.join(', ')}`,
        `- exposureComplexity: ${context.orPrepProcedureMetadata.exposureComplexity}`,
        `- likelyLearnerChallenge: ${context.orPrepProcedureMetadata.likelyLearnerChallenge.join(', ')}`,
      ].join('\n')
    : '';
  const oiteMetadata = context.oiteLearningMetadata
    ? [
        'Hidden OITE learning metadata:',
        `- examContext: ${context.oiteLearningMetadata.examContext}`,
        `- topicFamily: ${context.oiteLearningMetadata.topicFamily}`,
        `- conceptType: ${context.oiteLearningMetadata.conceptType.join(', ')}`,
        `- cognitiveTask: ${context.oiteLearningMetadata.cognitiveTask.join(', ')}`,
        `- learnerRisk: ${context.oiteLearningMetadata.learnerRisk.join(', ')}`,
        `- yieldTier: ${context.oiteLearningMetadata.yieldTier}`,
      ].join('\n')
    : '';

  return [
    'Answer context:',
    `- selectedBranch: ${context.selectedBranch?.label || context.selectedBranch?.id || 'none'}`,
    `- mode: ${context.mode}`,
    `- subintent: ${context.subintent}`,
    `- procedureCategory: ${context.procedureCategory}`,
    `- procedureOrTopic: ${context.procedureOrTopic}`,
    `- trainingLevel: ${context.trainingLevel}`,
    `- responseDepth: ${context.responseDepth}`,
    formatClinicalContextForPrompt(context.clinicalContext),
    orPrepMetadata,
    oiteMetadata,
    certified,
  ].filter(Boolean).join('\n');
}
