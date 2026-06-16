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
  };
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

  return [
    'Answer context:',
    `- selectedBranch: ${context.selectedBranch?.label || context.selectedBranch?.id || 'none'}`,
    `- mode: ${context.mode}`,
    `- subintent: ${context.subintent}`,
    `- procedureCategory: ${context.procedureCategory}`,
    `- procedureOrTopic: ${context.procedureOrTopic}`,
    `- trainingLevel: ${context.trainingLevel}`,
    `- responseDepth: ${context.responseDepth}`,
    certified,
  ].join('\n');
}
