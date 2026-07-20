/**
 * Single source of truth for every OpenAI model name BroBot uses. Nothing in
 * src/lib/brobot or src/app/api/brobot(/cron) should hardcode a model string
 * or read process.env.BROBOT_*_MODEL directly -- import from here instead, so
 * every model can be changed from the environment without a code change.
 */

import type {
  BroBotChatAmbiguity,
  BroBotChatMode,
  BroBotChatSubintent,
  BroBotResponseDepth,
} from '@/lib/brobot/chat/types';

function readModelEnv(envVar: string, fallback: string): string {
  const value = process.env[envVar];
  return value && value.trim() ? value.trim() : fallback;
}

function readBooleanEnv(envVar: string, fallback: boolean): boolean {
  const value = process.env[envVar];
  if (!value || !value.trim()) return fallback;
  return /^(true|1|yes|on)$/i.test(value.trim());
}

/** Lightweight/background tasks such as intent expansion, metadata, and summarization. */
export const BROBOT_FAST_MODEL = readModelEnv('BROBOT_FAST_MODEL', 'gpt-4o-mini');

/** Strong visible-answer tier for complex orthopaedic reasoning. */
export const BROBOT_STRONG_MODEL = readModelEnv('BROBOT_STRONG_MODEL', 'gpt-4o');

/** Main chat answer generation (OR Prep, OITE, Clinic, Consult, general). */
export const BROBOT_CHAT_MODEL = readModelEnv('BROBOT_CHAT_MODEL', BROBOT_FAST_MODEL);

/** Intent expansion/classification call that runs before the answer is generated. */
export const BROBOT_INTENT_MODEL = readModelEnv('BROBOT_INTENT_MODEL', BROBOT_FAST_MODEL);

/** Chat answer generation specifically when the detected/selected mode is "research". */
export const BROBOT_RESEARCH_MODEL = readModelEnv('BROBOT_RESEARCH_MODEL', BROBOT_STRONG_MODEL);

/** Structured reviewer report for orthopaedic residency personal statements. */
export const BROBOT_PERSONAL_STATEMENT_MODEL = readModelEnv(
  'BROBOT_PERSONAL_STATEMENT_MODEL',
  BROBOT_STRONG_MODEL
);

/** Two-draft personal-statement comparison. */
export const BROBOT_PERSONAL_STATEMENT_COMPARISON_MODEL = readModelEnv(
  'BROBOT_PERSONAL_STATEMENT_COMPARISON_MODEL',
  BROBOT_STRONG_MODEL
);

/**
 * Reserved for a future LLM-based quality gate. The current quality gate
 * (src/lib/brobot/chat/quality-gate.ts) is pure heuristic/keyword matching and
 * makes no model call; this constant has no call site yet.
 */
export const BROBOT_QUALITY_GATE_MODEL = readModelEnv('BROBOT_QUALITY_GATE_MODEL', 'gpt-4o-mini');

/** Post-response quality evaluator (src/lib/brobot/evaluator). */
export const BROBOT_EVAL_MODEL = readModelEnv('BROBOT_EVAL_MODEL', BROBOT_STRONG_MODEL);

/** Revision/repair pass after heuristic quality-gate warnings. */
export const BROBOT_REVISION_MODEL = readModelEnv(
  'BROBOT_REVISION_MODEL',
  BROBOT_STRONG_MODEL
);

/**
 * Reserved for future LLM-based conversation title generation. Conversation
 * titles are currently produced by buildConversationTitle() via plain string
 * truncation (src/app/api/brobot/chat/route.ts); this constant has no call site yet.
 */
export const BROBOT_TITLE_MODEL = readModelEnv('BROBOT_TITLE_MODEL', 'gpt-4o-mini');

/**
 * Reserved for a future retry-on-a-cheaper/alternate-model fallback after a
 * primary completion call fails. No call site uses this yet -- today an OpenAI
 * error on the primary model just surfaces as a chat error response.
 */
export const BROBOT_FALLBACK_MODEL = readModelEnv('BROBOT_FALLBACK_MODEL', 'gpt-4o-mini');

/** Feature flag: run a second metadata-only pass after answer generation. */
export const BROBOT_SEPARATE_METADATA_PASS = readBooleanEnv(
  'BROBOT_SEPARATE_METADATA_PASS',
  true
);

/** Feature flag: revise answers once when the heuristic quality gate flags issues. */
export const BROBOT_ENABLE_REVISION_PASS = readBooleanEnv(
  'BROBOT_ENABLE_REVISION_PASS',
  true
);

/** Rollout gate for the tiered answer-first orchestration. */
export const BROBOT_TIERED_PIPELINE_ENABLED = readBooleanEnv(
  'BROBOT_TIERED_PIPELINE_ENABLED',
  false
);

/** Queue nonessential metadata and learning work after durable answer persistence. */
export const BROBOT_ASYNC_ENRICHMENT_ENABLED = readBooleanEnv(
  'BROBOT_ASYNC_ENRICHMENT_ENABLED',
  false
);

export const BROBOT_TIER1_REVISION_ENABLED = readBooleanEnv(
  'BROBOT_TIER1_REVISION_ENABLED',
  false
);

export const BROBOT_TIER1_METADATA_LLM_ENABLED = readBooleanEnv(
  'BROBOT_TIER1_METADATA_LLM_ENABLED',
  false
);

export const BROBOT_TIER1_KG_ENABLED = readBooleanEnv(
  'BROBOT_TIER1_KG_ENABLED',
  false
);

const STRONG_MODES = new Set<BroBotChatMode>(['or_prep', 'consult', 'oite', 'research']);
const STRONG_SUBINTENTS = new Set<BroBotChatSubintent>([
  'surgical_steps',
  'surgical_approach',
  'anatomy_at_risk',
  'operative_indications',
  'postop_problem',
  'infection',
  'urgent_red_flags',
  'evidence_critique',
  'treatment_algorithm',
  'classification',
  'oite_traps',
]);

function normalizeMode(mode: string | null | undefined): BroBotChatMode {
  if (mode === 'fracture_call') return 'consult';
  if (
    mode === 'auto' ||
    mode === 'or_prep' ||
    mode === 'oite' ||
    mode === 'clinic' ||
    mode === 'consult' ||
    mode === 'research' ||
    mode === 'general'
  ) {
    return mode;
  }

  return 'general';
}

/**
 * Chat answer generation reuses BROBOT_CHAT_MODEL for every mode except
 * "research", which gets the (typically more capable) BROBOT_RESEARCH_MODEL.
 */
export function getChatModelForMode(mode: string | null | undefined): string {
  const normalizedMode = normalizeMode(mode);
  return normalizedMode === 'research' ? BROBOT_RESEARCH_MODEL : BROBOT_CHAT_MODEL;
}

export function getMetadataModel(): string {
  return BROBOT_FAST_MODEL;
}

export function getRevisionModel(mode: string | null | undefined): string {
  const normalizedMode = normalizeMode(mode);
  return normalizedMode === 'research' ? BROBOT_RESEARCH_MODEL : BROBOT_REVISION_MODEL;
}

export function getAnswerModelForRoute(input: {
  mode: string | null | undefined;
  ambiguity?: BroBotChatAmbiguity | null;
  responseDepth?: BroBotResponseDepth | null;
  subintent?: BroBotChatSubintent | null;
}): string {
  const normalizedMode = normalizeMode(input.mode);

  if (normalizedMode === 'research') return BROBOT_RESEARCH_MODEL;
  if (STRONG_MODES.has(normalizedMode)) return BROBOT_STRONG_MODEL;
  if (input.ambiguity === 'high') return BROBOT_STRONG_MODEL;
  if (
    input.ambiguity === 'moderate' &&
    (input.responseDepth === 'deep' ||
      (input.subintent ? STRONG_SUBINTENTS.has(input.subintent) : false))
  ) {
    return BROBOT_STRONG_MODEL;
  }

  return getChatModelForMode(normalizedMode);
}
