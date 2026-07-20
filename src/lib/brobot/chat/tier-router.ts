import type {
  BroBotChatMode,
  BroBotChatSubintent,
  BroBotEntityResolution,
  BroBotResponseDepth,
  BroBotResponseTier,
} from './types';

const TIER_ONE_SUBINTENTS = new Set<BroBotChatSubintent>([
  'landmarks',
  'anatomy_at_risk',
  'classification',
  'indications',
]);
const TIER_TWO_SUBINTENTS = new Set<BroBotChatSubintent>([
  'treatment_algorithm',
  'treatment_plan',
  'operative_indications',
  'workup',
  'differential',
  'initial_consult',
  'postop_problem',
  'infection',
  'urgent_red_flags',
]);
const COMPLEX_TEACHING_PATTERN =
  /\b(full|complete|comprehensive|deep dive|teach me|walk me through|or prep|tomorrow|pimp me|attending (?:ask|questions?)|residents? miss)\b/i;
const FACTUAL_PATTERN =
  /^\s*(what (?:is|are)|define|where is|which nerve|what nerve|indications? for|compare)\b/i;

export type ResolveBroBotTierInput = {
  message: string;
  mode: BroBotChatMode;
  subintent: BroBotChatSubintent;
  responseDepth: BroBotResponseDepth;
  entityResolution: BroBotEntityResolution;
};

export function resolveBroBotResponseTier(input: ResolveBroBotTierInput): BroBotResponseTier {
  if (
    input.responseDepth !== 'deep' &&
    !COMPLEX_TEACHING_PATTERN.test(input.message) &&
    (TIER_ONE_SUBINTENTS.has(input.subintent) ||
      FACTUAL_PATTERN.test(input.message) ||
      input.entityResolution.specialty === 'hand_surgery')
  ) {
    return 1;
  }

  if (
    input.responseDepth === 'deep' ||
    input.mode === 'or_prep' ||
    input.subintent === 'surgical_steps' ||
    input.subintent === 'attending_questions' ||
    COMPLEX_TEACHING_PATTERN.test(input.message)
  ) {
    return 3;
  }

  if (TIER_TWO_SUBINTENTS.has(input.subintent) || input.mode === 'consult') return 2;

  return 2;
}

export function shouldIncludeResidentsMissSection(input: {
  message: string;
  tier: BroBotResponseTier;
  mode: BroBotChatMode;
  responseDepth: BroBotResponseDepth;
}) {
  if (input.tier !== 3) return false;
  return (
    /\b(pimp me|attending (?:ask|questions?)|what (?:do )?residents? miss|residents? miss)\b/i.test(
      input.message
    ) ||
    (input.mode === 'or_prep' && input.responseDepth === 'deep')
  );
}

export function getBroBotTierExecutionPolicy(tier: BroBotResponseTier) {
  if (tier === 1) {
    return {
      maxAnswerModelCalls: 1,
      blockingMetadataModelCalls: 0,
      blockingRevisionModelCalls: 0,
      certifiedContext: false,
      kgOnAnswerPath: false,
      maxOutputTokens: 250,
    } as const;
  }
  if (tier === 2) {
    return {
      maxAnswerModelCalls: 2,
      blockingMetadataModelCalls: 0,
      blockingRevisionModelCalls: 1,
      certifiedContext: false,
      kgOnAnswerPath: false,
      maxOutputTokens: 500,
    } as const;
  }
  return {
    maxAnswerModelCalls: 2,
    blockingMetadataModelCalls: 0,
    blockingRevisionModelCalls: 1,
    certifiedContext: true,
    kgOnAnswerPath: true,
    maxOutputTokens: null,
  } as const;
}

export function getDeterministicTierOneFollowUps(input: {
  subintent: BroBotChatSubintent;
  topic: string;
}) {
  const topic = input.topic.trim();
  if (!topic) return [];
  if (input.subintent === 'classification') {
    return [`How does ${topic} change treatment?`, `What is the common ${topic} exam trap?`];
  }
  if (input.subintent === 'indications') {
    return [`What are the contraindications for ${topic}?`, `What alternatives should I compare with ${topic}?`];
  }
  if (input.subintent === 'anatomy_at_risk' || input.subintent === 'landmarks') {
    return [`Why does this anatomy matter surgically?`, `What injury pattern affects this structure?`];
  }
  return [];
}
