import type {
  BroBotChatIntent,
  BroBotModelMessage,
  BroBotResponseDepth,
  BroBotTrainingLevel,
} from './types';
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
};

export async function buildBroBotAnswerContext(input: {
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
  };
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
    orPrepMetadata,
    oiteMetadata,
    certified,
  ].filter(Boolean).join('\n');
}
