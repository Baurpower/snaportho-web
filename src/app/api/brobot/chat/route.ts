/**
 * BroBot Open-Ended Chat AI Route (Phase 1)
 *
 * This route is intentionally separate from CasePrep-backed /api/brobot/ask.
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import {
  BroBotChatRequestSchema,
  buildBroBotChatMessages,
  buildBroBotMetadataMessages,
  buildBroBotRevisionMessages,
  buildBroBotAnswerContext,
  buildBroBotClinicalContextFromIntent,
  buildUncoveredFacetChips,
  buildBroBotIntentExpansionMessages,
  fallbackBroBotIntentExpansion,
  getBranchOptionsForCategory,
  hasOrthoEntity,
  resolveTopicFromHistory,
  parseBroBotIntentExpansionResponse,
  parseBroBotChatResponse,
  parseBroBotMetadataResponse,
  runBroBotQualityGate,
  buildBroBotRouteClarifyingQuestions,
  routeBroBotAnswer,
  enforceClarificationAnswerBrevity,
  type BroBotAnswerRoute,
  type BroBotChatIntent,
  type BroBotChatMode,
  type BroBotChatRequest,
  type BroBotBranchOption,
  type BroBotModelMessage,
  type BroBotAnswerContext,
} from '@/lib/brobot/chat';
import {
  BroBotStageTimer,
  attachBroBotKgAnswerOutcome,
  persistBroBotKgShadowTrace,
  retrieveBroBotKgShadow,
  type BroBotKgShadowResult,
} from '@/lib/brobot/kg';
import {
  normalizeResearchSubmode,
  routeResearchSubmode,
  type ResearchSubmodeRoute,
} from '@/lib/brobot/research';
import { getBroBotAccessGate } from '@/lib/brobot/brobot-entitlement-access';
import { type Subject } from '@/lib/brobot/entitlements';
import {
  createGuestSession,
  getGuestSessionFromRequest,
  getGuestIdFromHeader,
  createGuestSessionFromId,
} from '@/lib/brobot/guest-session';
import { recordSuccessfulAIUse, recordUsageEvent } from '@/lib/brobot/usage';
import { enqueueBroBotEvaluationJob } from '@/lib/brobot/evaluator';
import {
  BROBOT_ENABLE_REVISION_PASS,
  BROBOT_INTENT_MODEL,
  BROBOT_SEPARATE_METADATA_PASS,
  getAnswerModelForRoute,
  getMetadataModel,
  getRevisionModel,
} from '@/lib/brobot/model-config';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/utils/supabase/server';

const BROBOT_STREAMING_ENABLED = process.env.BROBOT_STREAMING_ENABLED === 'true';

let openaiClient: OpenAI | null = null;

type StreamEventName = 'start' | 'delta' | 'metadata' | 'done' | 'error';

function encodeStreamEvent(event: StreamEventName, data: Record<string, unknown>) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export type BroBotChatResponse = {
  conversationId: string;
  messageId: string;
  goal?: string;
  selectedFocus?: string;
  answer: string;
  priorityPoints: string[];
  knowledgeGaps: string[];
  whatMostResidentsMiss?: string[];
  suggestedQuestions: string[];
  nextLearningBranches?: Array<{
    id: string;
    label: string;
    description?: string;
    category?: string;
    topicId?: string;
    branchQuestionId?: string;
    rankScore?: number;
  }>;
  tags: string[];
  detectedMode: string;
  remainingFreeUses?: number | null;
  confidence?: number;
  needsClarification?: boolean;
  clarifyingQuestions?: string[];
  assumedContext?: string;
  consultConfidence?: 'low' | 'moderate' | 'high';
  missingInformation?: string[];
  researchSubmode?: string;
};

type AuthContext = {
  user: { id: string } | null;
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  hasBearerToken: boolean;
};
type BroBotDbClient = AuthContext['supabase'] | ReturnType<typeof createAdminClient>;

type ChatAnalyticsEvent =
  | 'brobot_chat_request'
  | 'brobot_chat_success'
  | 'brobot_chat_error'
  | 'brobot_chat_suggested_question_click'
  | 'first_brobot_message'
  | 'brobot_chat_clarification_suggested'
  | 'visible_clarification_shown'
  | 'answer_with_assumption'
  | 'focus_options_shown'
  | 'focus_option_clicked'
  | 'branch_impression'
  | 'branch_click'
  | 'continued_after_branch_click'
  | 'quality_revision_triggered'
  | 'quality_revision_reason'
  | 'branch_selected'
  | 'branch_skipped'
  | 'answer_now_clicked'
  | 'clarification_selected'
  | 'brobot_research_submode_detected'
  | 'quality_gate_failed';
type ServerErrorCategory =
  | 'database_error'
  | 'openai_configuration_missing'
  | 'openai_error'
  | 'parse_error'
  | 'usage_error'
  | 'server_error';

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const isDevelopment = process.env.NODE_ENV !== 'production';

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

function logBroBot(event: string, payload: Record<string, unknown>) {
  console.log(event, payload);
}

function safeErrorPayload(error: unknown) {
  const err = error as SupabaseLikeError;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    code: typeof err?.code === 'string' ? err.code : undefined,
    message: typeof err?.message === 'string' ? err.message : 'Unknown error',
    details: typeof err?.details === 'string' ? err.details : undefined,
    hint: typeof err?.hint === 'string' ? err.hint : undefined,
  };
}

function logChatStepError(params: {
  requestId: string;
  category: ServerErrorCategory;
  step: string;
  error: unknown;
  userId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
}) {
  console.error('[BROBOT-CHAT-ERROR]', {
    requestId: params.requestId,
    category: params.category,
    step: params.step,
    userIdPresent: Boolean(params.userId),
    conversationIdPresent: Boolean(params.conversationId),
    messageIdPresent: Boolean(params.messageId),
    ...safeErrorPayload(params.error),
  });
}

function getClientIp(request: Request): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

function hashForLogging(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }

  return `h${Math.abs(h).toString(16)}`;
}

function subjectPrefix(subject: Subject): string {
  return subject.id.slice(0, Math.min(12, subject.id.length));
}

function invalidRequestResponse(message = 'Please enter a BroBot question.') {
  return NextResponse.json(
    {
      error: 'invalid_request',
      message,
    },
    { status: 400 }
  );
}

function logBroBotChat400(params: {
  reason: string;
  body: unknown;
  normalizedPrompt: string;
  request: Request;
}) {
  if (process.env.NODE_ENV === 'production') return;

  const body = params.body && typeof params.body === 'object'
    ? (params.body as Record<string, unknown>)
    : {};

  console.warn('[BROBOT_CHAT_400]', {
    reason: params.reason,
    receivedKeys: Object.keys(body),
    promptLength: params.normalizedPrompt.length,
    mode: typeof body.mode === 'string' ? body.mode : undefined,
    contentType: params.request.headers.get('content-type'),
  });
}

function normalizePromptPayload(raw: unknown) {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const prompt =
    (typeof record.prompt === 'string' ? record.prompt.trim() : '') ||
    (typeof record.message === 'string' ? record.message.trim() : '') ||
    (typeof record.question === 'string' ? record.question.trim() : '');

  if (process.env.NODE_ENV !== 'production') {
    console.log('[brobot] chat prompt payload', {
      keys: Object.keys(record),
      mode: typeof record.mode === 'string' ? record.mode : undefined,
      promptLength: prompt.length,
    });
  }

  return {
    record,
    prompt,
    normalized: {
      ...record,
      message: prompt,
    },
  };
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: 'not_authenticated',
      reason: 'not_authenticated',
      message: 'Please sign in to use BroBot chat.',
    },
    { status: 401 }
  );
}

function conversationNotFoundResponse() {
  return NextResponse.json(
    {
      error: 'conversation_not_found',
      message: 'BroBot conversation not found.',
    },
    { status: 404 }
  );
}

function limitReachedResponse(dailyCap: number | null) {
  return NextResponse.json(
    {
      error: 'daily_limit_reached',
      reason: 'daily_limit_reached',
      message: 'Daily limit reached.',
      isLimitReached: true,
      remaining: 0,
      dailyCap,
    },
    { status: 429 }
  );
}

function disabledResponse(message = 'BroBot access is currently unavailable.') {
  return NextResponse.json(
    {
      error: 'disabled',
      reason: 'disabled',
      message,
    },
    { status: 403 }
  );
}

function withGuestCookie(response: NextResponse, guestCookieToSet: string | null) {
  if (guestCookieToSet) response.headers.append('Set-Cookie', guestCookieToSet);
  return response;
}

function generationFailedResponse() {
  return NextResponse.json(
    {
      error: 'brobot_generation_failed',
      message: 'BroBot is having trouble responding. Please try again in a moment.',
    },
    { status: 500 }
  );
}

function serverErrorResponse(
  category: ServerErrorCategory,
  message = 'BroBot is having trouble responding. Please try again in a moment.'
) {
  return NextResponse.json(
    {
      error: category,
      message,
      ...(isDevelopment ? { category } : {}),
    },
    { status: 500 }
  );
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  return authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.replace(/^Bearer\s+/i, '').trim()
    : null;
}

async function getAuthContext(request: Request): Promise<AuthContext> {
  const bearerToken = getBearerToken(request);
  const supabase = bearerToken
    ? createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          },
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();

  if (error) {
    logBroBot('[BROBOT-CHAT-AUTH]', {
      hasBearerToken: Boolean(bearerToken),
      success: false,
      message: error.message,
    });
    return { user: null, supabase, hasBearerToken: Boolean(bearerToken) };
  }

  return { user: user ? { id: user.id } : null, supabase, hasBearerToken: Boolean(bearerToken) };
}

function buildConversationTitle(message: string): string {
  const compact = message.replace(/\s+/g, ' ').trim();
  if (compact.length <= 80) return compact;
  return `${compact.slice(0, 77).trim()}...`;
}

function mergeQuestions(primary: string[], secondary: string[], max = 7): string[] {
  const seen = new Set<string>();
  return [...primary, ...secondary]
    .map((question) => question.trim())
    .filter((question) => {
      const key = question
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
}

function normalizeTags(tags: string[], mode: BroBotChatMode, confidence: number) {
  return tags
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8)
    .map((tag) => {
      const [topic, ...subtopicParts] = tag.split(':').map((part) => part.trim()).filter(Boolean);

      return {
        topic: topic || tag,
        subtopic: subtopicParts.length ? subtopicParts.join(':') : null,
        body_region: null,
        procedure: null,
        concept_type: null,
        mode,
        confidence,
      };
    });
}

type BranchTopicRow = {
  topic_id: string;
  topic_name: string;
  procedure: string | null;
  subspecialty: string | null;
  anatomy_region: string | null;
};

type BranchQuestionRow = {
  id: string;
  topic_id: string;
  question_text: string;
  category: string;
  source: string;
  success_score: number | string | null;
  usage_count: number | string | null;
  click_count: number | string | null;
  updated_at: string | null;
};

type RankedBranchOption = BroBotBranchOption & {
  topicId?: string;
  branchQuestionId?: string;
  source?: string;
  rankScore?: number;
  rankPosition?: number;
};

type BranchRankingContext = {
  userMessage: string;
  mode: BroBotChatMode;
  trainingLevel: BroBotChatRequest['trainingLevel'];
  history: BroBotModelMessage[];
  intent: BroBotChatIntent;
  fingerprint?: LearningFingerprint | null;
  outcomePerformanceByBranchId?: Map<string, BranchOutcomePerformance>;
};

type LearningFingerprint = {
  favorite_branches?: unknown;
  frequent_branches?: unknown;
  weakness_branches?: unknown;
  preferred_modes?: unknown;
};

type BranchOutcomePerformance = {
  branchQuestionId: string;
  sampleSize: number;
  avgEducationalSuccess: number;
  continuationRate: number;
  abandonmentRate: number;
};

function slugifyBranchId(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64);
  return slug || `branch_${hashForLogging(value) ?? 'question'}`;
}

function normalizeTopicName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 160) || 'General orthopaedics';
}

function normalizeQuestionText(value: string): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.endsWith('?') ? trimmed : `${trimmed.replace(/[.]+$/, '')}?`;
}

function normalizeBranchKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(what|which|how|why|when|does|do|are|is|the|a|an|this|that|should|i|me|my)\b/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(
    normalizeBranchKey(value)
      .split(' ')
      .filter((token) => token.length > 2)
  );
}

function jaccardSimilarity(a: string, b: string): number {
  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let intersection = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) intersection += 1;
  });

  return intersection / (aTokens.size + bTokens.size - intersection);
}

function conversationText(history: BroBotModelMessage[]): string {
  return history
    .slice(-8)
    .map((message) => message.content)
    .join('\n');
}

function inferBranchCategory(question: string, fallback = 'Clinical Decision Making'): string {
  const lower = question.toLowerCase();
  if (/\battending|senior|pimp\b/.test(lower)) return 'Pimp Questions';
  if (/\bimplant|plate|screw|nail|anchor|graft|fixation\b/.test(lower)) return 'Implant Selection';
  if (/\breduce|reduction\b/.test(lower)) return 'Reduction Pearls';
  if (/\bapproach|exposure|portal|incision|landmark\b/.test(lower)) return 'Surgical Approach';
  if (/\banatomy|nerve|vessel|structure\b/.test(lower)) return 'Anatomy';
  if (/\bclassification|classify|pattern\b/.test(lower)) return 'Classification Systems';
  if (/\bcomplication|pitfall|avoid\b/.test(lower)) return 'Complications';
  if (/\bpostop|rehab|restriction|weight.?bearing\b/.test(lower)) return 'Postoperative Management';
  if (/\bboard|oite|tested|trap|quiz\b/.test(lower)) return 'Board Review';
  if (/\bevidence|study|journal|statistics\b/.test(lower)) return 'Evidence';
  if (/\bindication|operative|surgery\b/.test(lower)) return 'Indications';
  return fallback;
}

function topicPartsFromIntent(intent: BroBotChatIntent) {
  const topicName = normalizeTopicName(intent.procedureOrTopic || intent.goal || 'General orthopaedics');
  const procedure =
    intent.mode === 'or_prep' || /procedure|orif|arthroplasty|scope|repair|release/i.test(topicName)
      ? topicName
      : null;
  const subspecialty = intent.procedureCategory === 'unknown' ? intent.mode : intent.procedureCategory;

  return {
    topicName,
    procedure,
    subspecialty,
    anatomyRegion: null as string | null,
  };
}

function branchOptionFromQuestion(row: BranchQuestionRow): RankedBranchOption {
  return {
    id: row.id,
    label: row.question_text,
    category: row.category,
    description: row.source === 'llm' ? 'Learned from BroBot usage.' : undefined,
    topicId: row.topic_id,
    branchQuestionId: row.id,
    source: row.source,
    rankScore: scoreBranchQuestion(row),
  };
}

function scoreBranchQuestion(row: BranchQuestionRow): number {
  const success = Number(row.success_score) || 50;
  const usage = Number(row.usage_count) || 0;
  const clicks = Number(row.click_count) || 0;
  const clickRate = usage > 0 ? clicks / usage : 0;
  const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  const ageDays = updatedAt ? Math.max(0, (Date.now() - updatedAt) / 86_400_000) : 365;
  const recency = Math.max(0, 1 - ageDays / 90);

  return success * 0.5 + clickRate * 35 + Math.min(usage, 100) * 0.1 + recency * 5;
}

function modeCategoryFit(category: string, mode: BroBotChatMode): number {
  const normalizedMode = mode === 'fracture_call' ? 'consult' : mode === 'auto' ? 'general' : mode;
  const lower = category.toLowerCase();

  if (normalizedMode === 'or_prep') {
    return /\b(approach|anatomy|technique|implant|reduction|complication|pimp)\b/.test(lower) ? 1 : 0.35;
  }

  if (normalizedMode === 'oite') {
    return /\b(board|classification|decision|indication|complication|controvers)\b/.test(lower) ? 1 : 0.25;
  }

  if (normalizedMode === 'consult') {
    return /\b(decision|indication|classification|pimp|complication|anatomy)\b/.test(lower) ? 1 : 0.35;
  }

  if (normalizedMode === 'research') {
    return /\b(evidence|controvers|statistics|pimp)\b/.test(lower) ? 1 : 0.2;
  }

  return 0.65;
}

function levelCategoryFit(category: string, trainingLevel: BroBotChatRequest['trainingLevel']): number {
  const lower = category.toLowerCase();

  if (trainingLevel === 'med_student' || trainingLevel === 'pgy1') {
    return /\b(anatomy|classification|decision|indication)\b/.test(lower) ? 1 : 0.55;
  }

  if (trainingLevel === 'pgy4' || trainingLevel === 'pgy5' || trainingLevel === 'attending') {
    return /\b(technique|implant|reduction|complication|evidence|controvers|pimp)\b/.test(lower) ? 1 : 0.55;
  }

  return 0.75;
}

function contextRelevanceScore(branch: RankedBranchOption, context: BranchRankingContext): number {
  const branchText = `${branch.label} ${branch.description ?? ''} ${branch.category ?? ''}`;
  const topicText = `${context.userMessage} ${context.intent.procedureOrTopic} ${context.intent.goal ?? ''}`;
  const overlap = jaccardSimilarity(branchText, topicText);

  return Math.min(1, overlap * 2.5);
}

function noveltyPenalty(branch: RankedBranchOption, context: BranchRankingContext): number {
  const text = `${context.userMessage}\n${conversationText(context.history)}`;
  const candidates = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const maxSimilarity = candidates.reduce(
    (max, candidate) => Math.max(max, jaccardSimilarity(branch.label, candidate)),
    0
  );

  if (maxSimilarity >= 0.72) return 45;
  if (maxSimilarity >= 0.55) return 24;
  if (maxSimilarity >= 0.4) return 10;
  return 0;
}

function normalizeAggregateList(value: unknown): BranchAggregate[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return {
        id: typeof record.id === 'string' ? record.id : '',
        label: typeof record.label === 'string' ? record.label : '',
        count: typeof record.count === 'number' ? record.count : Number(record.count) || 0,
        lastSelectedAt:
          typeof record.lastSelectedAt === 'string' ? record.lastSelectedAt : new Date(0).toISOString(),
      };
    })
    .filter((item) => item.id || item.label);
}

function fingerprintBoost(branch: RankedBranchOption, context: BranchRankingContext): number {
  const fingerprint = context.fingerprint;
  if (!fingerprint) return 0;

  const branchKey = normalizeBranchKey(branch.label);
  const aggregates = [
    ...normalizeAggregateList(fingerprint.favorite_branches),
    ...normalizeAggregateList(fingerprint.frequent_branches),
  ];
  const strongest = aggregates.reduce((max, item) => {
    const idMatch = item.id && item.id === branch.id;
    const labelMatch =
      item.label && jaccardSimilarity(normalizeBranchKey(item.label), branchKey) >= 0.74;
    if (!idMatch && !labelMatch) return max;
    return Math.max(max, Math.min(1, item.count / 6));
  }, 0);

  return strongest * 5;
}

function outcomePerformanceAdjustment(
  branch: RankedBranchOption,
  context: BranchRankingContext
): number {
  const branchQuestionId = branch.branchQuestionId ?? (isUuid(branch.id) ? branch.id : undefined);
  const performance = branchQuestionId
    ? context.outcomePerformanceByBranchId?.get(branchQuestionId)
    : undefined;
  if (!performance || performance.sampleSize === 0) return 0;

  const confidence = Math.min(1, performance.sampleSize / 12);
  const educationalLift = ((performance.avgEducationalSuccess - 50) / 50) * 12;
  const continuationLift = (performance.continuationRate - 0.5) * 8;
  const abandonmentPenalty = performance.abandonmentRate * 10;

  return (educationalLift + continuationLift - abandonmentPenalty) * confidence;
}

function scoreBranchOption(
  branch: RankedBranchOption,
  context?: BranchRankingContext
): RankedBranchOption {
  if (!context) return branch;

  const category = branch.category || inferBranchCategory(branch.label);
  const historicalScore = branch.rankScore ?? 50;
  const educationalValue = /pimp|attending|complication|anatomy|implant|reduction|evidence|classification|decision/i.test(
    `${category} ${branch.label}`
  )
    ? 18
    : 10;
  const modeAlignment = modeCategoryFit(category, context.mode) * 18;
  const levelFit = levelCategoryFit(category, context.trainingLevel) * 14;
  const contextFit = contextRelevanceScore(branch, context) * 22;
  const novelty = 20 - noveltyPenalty(branch, context);
  const outcomeAdjustment = outcomePerformanceAdjustment(branch, context);
  const personalization = fingerprintBoost(branch, context);

  return {
    ...branch,
    category,
    rankScore:
      historicalScore * 0.3 +
      educationalValue +
      modeAlignment +
      levelFit +
      contextFit +
      novelty +
      outcomeAdjustment +
      personalization,
  };
}

function mergeBranchOptions(
  primary: RankedBranchOption[],
  secondary: BroBotBranchOption[],
  max = 5,
  context?: BranchRankingContext
): RankedBranchOption[] {
  const seen = new Set<string>();
  const mergedOptions: RankedBranchOption[] = [
    ...primary,
    ...secondary.map((branch): RankedBranchOption => ({
      ...branch,
      id: branch.id || slugifyBranchId(branch.label),
      label: normalizeQuestionText(branch.label),
      category: branch.category || inferBranchCategory(branch.label),
      source: 'llm',
    })),
  ];

  const categoryCounts = new Map<string, number>();

  return mergedOptions
    .map((branch): RankedBranchOption => ({
      ...branch,
      id: branch.id || slugifyBranchId(branch.label),
      label: normalizeQuestionText(branch.label),
      category: branch.category || inferBranchCategory(branch.label),
    }))
    .map((branch) => scoreBranchOption(branch, context))
    .filter((branch) => {
      const key = normalizeBranchKey(branch.label);
      if (!key || seen.has(key)) return false;
      for (const existing of seen) {
        if (jaccardSimilarity(key, existing) >= 0.68) return false;
      }
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0))
    .filter((branch) => {
      const category = branch.category || inferBranchCategory(branch.label);
      const count = categoryCounts.get(category) ?? 0;
      if (count >= 2) return false;
      categoryCounts.set(category, count + 1);
      return true;
    })
    .slice(0, max);
}

async function getOrCreateBranchTopic(params: {
  persistence: BroBotDbClient;
  intent: BroBotChatIntent;
}): Promise<BranchTopicRow | null> {
  const topic = topicPartsFromIntent(params.intent);

  try {
    const { data: existing } = await params.persistence
      .from('branch_topics')
      .select('topic_id, topic_name, procedure, subspecialty, anatomy_region')
      .ilike('topic_name', topic.topicName)
      .maybeSingle();

    if (existing) return existing as BranchTopicRow;

    const { data, error } = await params.persistence
      .from('branch_topics')
      .insert({
        topic_name: topic.topicName,
        procedure: topic.procedure,
        subspecialty: topic.subspecialty,
        anatomy_region: topic.anatomyRegion,
      })
      .select('topic_id, topic_name, procedure, subspecialty, anatomy_region')
      .single();

    if (error || !data) return null;
    return data as BranchTopicRow;
  } catch (error) {
    console.error('[brobot] getOrCreateBranchTopic failed (non-fatal)', error);
    return null;
  }
}

async function loadRankedBranchQuestions(params: {
  persistence: BroBotDbClient;
  intent: BroBotChatIntent;
  context?: BranchRankingContext;
}): Promise<{ topic: BranchTopicRow | null; branches: RankedBranchOption[] }> {
  const topic = await getOrCreateBranchTopic(params);
  if (!topic) return { topic: null, branches: [] };

  try {
    const { data, error } = await params.persistence
      .from('branch_questions')
      .select('id, topic_id, question_text, category, source, success_score, usage_count, click_count, updated_at')
      .eq('topic_id', topic.topic_id)
      .order('success_score', { ascending: false })
      .order('click_count', { ascending: false })
      .limit(40);

    if (error || !data) return { topic, branches: [] };

    const branches = (data as BranchQuestionRow[])
      .map(branchOptionFromQuestion)
      .map((branch) => scoreBranchOption(branch, params.context))
      .sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0))
      .slice(0, 12);

    return { topic, branches };
  } catch (error) {
    console.error('[brobot] loadRankedBranchQuestions failed (non-fatal)', error);
    return { topic, branches: [] };
  }
}

async function storeGeneratedBranchQuestions(params: {
  persistence: BroBotDbClient;
  topic: BranchTopicRow | null;
  branches: BroBotBranchOption[];
}): Promise<RankedBranchOption[]> {
  if (!params.topic || params.branches.length === 0) return [];

  const rows = params.branches
    .map((branch) => ({
      topic_id: params.topic!.topic_id,
      question_text: normalizeQuestionText(branch.label),
      category: branch.category || inferBranchCategory(branch.label),
      source: 'llm',
      success_score: 50,
    }))
    .filter((row) => row.question_text);

  if (rows.length === 0) return [];

  const resolved: RankedBranchOption[] = [];

  for (const row of rows) {
    try {
      const { data: existing } = await params.persistence
        .from('branch_questions')
        .select('id, topic_id, question_text, category, source, success_score, usage_count, click_count, updated_at')
        .eq('topic_id', row.topic_id)
        .ilike('question_text', row.question_text)
        .maybeSingle();

      if (existing) {
        resolved.push(branchOptionFromQuestion(existing as BranchQuestionRow));
        continue;
      }

      const { data: inserted, error } = await params.persistence
        .from('branch_questions')
        .insert(row)
        .select('id, topic_id, question_text, category, source, success_score, usage_count, click_count, updated_at')
        .single();

      if (!error && inserted) {
        resolved.push(branchOptionFromQuestion(inserted as BranchQuestionRow));
      }
    } catch (error) {
      console.error('[brobot] storeGeneratedBranchQuestions failed (non-fatal)', error);
    }
  }

  return resolved;
}

async function attachPersistedBranchQuestionIds(params: {
  persistence: BroBotDbClient;
  topic: BranchTopicRow | null;
  branches: RankedBranchOption[];
}): Promise<RankedBranchOption[]> {
  if (!params.topic || params.branches.length === 0) {
    return withRankPositions(params.branches);
  }

  const generated = params.branches.filter((branch) => !isUuid(branch.id));
  const resolvedGenerated = await storeGeneratedBranchQuestions({
    persistence: params.persistence,
    topic: params.topic,
    branches: generated,
  });
  const resolvedByLabel = new Map(
    resolvedGenerated.map((branch) => [normalizeBranchKey(branch.label), branch])
  );

  return withRankPositions(
    params.branches.map((branch) => {
      const branchQuestionId = branch.branchQuestionId ?? (isUuid(branch.id) ? branch.id : undefined);
      if (branchQuestionId) {
        return {
          ...branch,
          id: branchQuestionId,
          branchQuestionId,
          topicId: branch.topicId ?? params.topic?.topic_id,
        };
      }

      const resolved = resolvedByLabel.get(normalizeBranchKey(branch.label));
      if (!resolved) return branch;

      return {
        ...branch,
        id: resolved.id,
        topicId: resolved.topicId,
        branchQuestionId: resolved.branchQuestionId,
        source: resolved.source,
        rankScore: branch.rankScore ?? resolved.rankScore,
      };
    })
  );
}

async function recordBranchClickEvent(params: {
  persistence: BroBotDbClient;
  userId: string;
  conversationId: string;
  topicId?: string | null;
  selectedBranchId?: string;
  selectedBranchLabel?: string;
  selectedBranchRankPosition?: number;
  sourceMessageId?: string | null;
  mode: string;
  trainingLevel: string;
}): Promise<{ id: string; branchQuestionId: string | null } | null> {
  if (!params.selectedBranchId) return null;

  // UUID IDs map to a known branch_question row; slug IDs (from intent-generated branches)
  // do not — store them in metadata only and leave branch_question_id as null so the FK
  // constraint is satisfied. Both are recorded so ranking has full mobile click signal.
  const isUuidId = isUuid(params.selectedBranchId);
  const branchQuestionId = isUuidId ? params.selectedBranchId : null;

  try {
    const { data, error } = await params.persistence
      .from('branch_events')
      .insert({
        conversation_id: params.conversationId,
        user_id: params.userId,
        topic_id: params.topicId ?? null,
        branch_question_id: branchQuestionId,
        event_type: 'click',
        clicked: true,
        generated_followup: true,
        rank_position: params.selectedBranchRankPosition ?? null,
        mode: params.mode,
        training_level: params.trainingLevel,
        branch_label: params.selectedBranchLabel ?? null,
        source_message_id: params.sourceMessageId ?? null,
        metadata: {
          source: 'branch_selection',
          selected_branch_id: params.selectedBranchId,
          branch_id_is_uuid: isUuidId,
          branch_label: params.selectedBranchLabel ?? null,
          rank_position: params.selectedBranchRankPosition ?? null,
          mode: params.mode,
          training_level: params.trainingLevel,
          source_message_id: params.sourceMessageId ?? null,
        },
      })
      .select('id, branch_question_id')
      .single();

    if (error || !data) return null;

    return {
      id: String(data.id),
      branchQuestionId:
        typeof data.branch_question_id === 'string' ? data.branch_question_id : null,
    };
  } catch (error) {
    console.error('[brobot] recordBranchClickEvent failed (non-fatal)', error);
    return null;
  }
}

async function recordBranchOutcome(params: {
  persistence: BroBotDbClient;
  userId: string;
  conversationId: string;
  branchEventId?: string | null;
  branchQuestionId?: string | null;
  mode: string;
  trainingLevel: string;
  history: BroBotModelMessage[];
  sourceMessageId?: string | null;
  latencyMs: number;
}) {
  if (!params.branchEventId && !params.branchQuestionId) return;

  const priorDepth = params.history.filter(
    (message) => message.role === 'user' || message.role === 'assistant'
  ).length;
  const conversationDepthDelta = 2;
  const followupCount = Math.max(
    0,
    params.history.filter((message) => message.role === 'user').length - 1
  );
  const continuedAfterClick = true;
  const abandoned = false;
  const educationalSuccessScore =
    (continuedAfterClick ? 30 : 0) +
    Math.min(followupCount, 4) * 10 +
    Math.min(conversationDepthDelta, 6) * 5 -
    (abandoned ? 20 : 0);

  try {
    await params.persistence.from('branch_outcomes').insert({
      branch_event_id: params.branchEventId ?? null,
      conversation_id: params.conversationId,
      user_id: params.userId,
      branch_question_id: params.branchQuestionId ?? null,
      mode: params.mode,
      training_level: params.trainingLevel,
      continued_after_click: continuedAfterClick,
      followup_count: followupCount,
      conversation_depth_delta: conversationDepthDelta,
      duration_seconds: Math.round(params.latencyMs / 1000),
      abandoned,
      educational_success_score: Math.min(100, Math.max(0, educationalSuccessScore)),
      metadata: {
        source: 'branch_selection_response',
        source_message_id: params.sourceMessageId ?? null,
        prior_depth: priorDepth,
      },
    });
  } catch (error) {
    console.error('[brobot] recordBranchOutcome failed (non-fatal)', error);
  }
}

function withRankPositions(branches: RankedBranchOption[]): RankedBranchOption[] {
  return branches.map((branch, index) => ({
    ...branch,
    rankPosition: index + 1,
    branchQuestionId: branch.branchQuestionId ?? (isUuid(branch.id) ? branch.id : undefined),
  }));
}

async function loadLearningFingerprint(params: {
  userId: string;
}): Promise<LearningFingerprint | null> {
  try {
    const { data } = await createAdminClient()
      .from('brobot_learning_fingerprints')
      .select('favorite_branches, frequent_branches, weakness_branches, preferred_modes')
      .eq('user_id', params.userId)
      .maybeSingle();

    return (data as LearningFingerprint | null) ?? null;
  } catch (error) {
    console.error('[brobot] loadLearningFingerprint failed (non-fatal)', error);
    return null;
  }
}

async function loadBranchOutcomePerformance(params: {
  persistence: BroBotDbClient;
  branchQuestionIds: string[];
  mode: string;
  trainingLevel: string;
}): Promise<Map<string, BranchOutcomePerformance>> {
  const ids = Array.from(new Set(params.branchQuestionIds.filter(isUuid)));
  const performance = new Map<string, BranchOutcomePerformance>();
  if (ids.length === 0) return performance;

  try {
    const { data, error } = await params.persistence
      .from('branch_outcomes')
      .select('branch_question_id, educational_success_score, continued_after_click, abandoned')
      .in('branch_question_id', ids)
      .eq('mode', params.mode)
      .eq('training_level', params.trainingLevel)
      .limit(500);

    if (error || !data) return performance;

    const aggregate = new Map<
      string,
      { count: number; score: number; continued: number; abandoned: number }
    >();

    for (const row of data as Array<Record<string, unknown>>) {
      const id = typeof row.branch_question_id === 'string' ? row.branch_question_id : '';
      if (!id) continue;
      const current = aggregate.get(id) ?? { count: 0, score: 0, continued: 0, abandoned: 0 };
      current.count += 1;
      current.score += Number(row.educational_success_score) || 0;
      if (row.continued_after_click) current.continued += 1;
      if (row.abandoned) current.abandoned += 1;
      aggregate.set(id, current);
    }

    aggregate.forEach((value, id) => {
      performance.set(id, {
        branchQuestionId: id,
        sampleSize: value.count,
        avgEducationalSuccess: value.count > 0 ? value.score / value.count : 0,
        continuationRate: value.count > 0 ? value.continued / value.count : 0,
        abandonmentRate: value.count > 0 ? value.abandoned / value.count : 0,
      });
    });
  } catch (error) {
    console.error('[brobot] loadBranchOutcomePerformance failed (non-fatal)', error);
  }

  return performance;
}

function isUuid(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * P0-2: keep the intent's topic anchored to the conversation entity. When a
 * follow-up (most often a clicked learning-branch chip such as "Axillary nerve
 * risk") does not restate the procedure/body region, the freshly derived
 * procedureOrTopic degrades to the bare chip label. If the current topic has no
 * recognizable ortho entity but a recent turn does, re-anchor to that entity so
 * the answer stays on the original procedure instead of restarting.
 */
function anchorIntentTopicToHistory(
  intent: BroBotChatIntent,
  message: string,
  history: BroBotModelMessage[]
): BroBotChatIntent {
  if (hasOrthoEntity(intent.procedureOrTopic)) return intent;

  const anchoredTopic = resolveTopicFromHistory({ message, history });
  if (!anchoredTopic || anchoredTopic === intent.procedureOrTopic) return intent;

  return { ...intent, procedureOrTopic: anchoredTopic };
}

function buildAcceptedIntent(body: BroBotChatRequest): BroBotChatIntent | null {
  if (
    !body.intentMode ||
    !body.intentSubintent ||
    !body.intentProcedureCategory ||
    !body.intentAmbiguity
  ) {
    return null;
  }

  return {
    mode: body.intentMode === 'fracture_call' ? 'consult' : body.intentMode,
    subintent: body.intentSubintent,
    procedureCategory: body.intentProcedureCategory,
    procedureOrTopic: body.intentProcedureOrTopic || body.message.slice(0, 120),
    goal:
      body.intentMode === 'or_prep'
        ? `Prepare for ${body.intentProcedureOrTopic || body.message.slice(0, 80)}.`
        : undefined,
    ambiguity: body.intentAmbiguity,
    assumedContext: '',
    missingContext: [],
    clarifyingQuestions: [],
    branchOptions: getBranchOptionsForCategory({
      mode: body.intentMode,
      procedureCategory: body.intentProcedureCategory,
    }),
    answerImmediately: Boolean(body.answerNow),
    requiresBranchSelection: Boolean(body.selectedBranchId && !body.answerNow),
    reasonForBranching: body.intentReasonForBranching || '',
    researchSubmode:
      body.intentMode === 'research' ? normalizeResearchSubmode(body.researchSubmode) : undefined,
    confidence: body.intentSource === 'local' ? 0.82 : body.intentSource === 'llm' ? 0.75 : 0.55,
  };
}

function resolveResearchSubmode(params: {
  message: string;
  selectedMode: BroBotChatMode;
  intent: BroBotChatIntent;
  requestHint?: unknown;
}): ResearchSubmodeRoute | null {
  if (params.intent.mode !== 'research') return null;

  const hintedSubmode = normalizeResearchSubmode(params.requestHint);
  if (hintedSubmode) {
    return {
      submode: hintedSubmode,
      confidence: 0.7,
      source: 'deterministic',
      matchedRule: 'client_hint',
      signals: ['client hint'],
    };
  }

  return routeResearchSubmode({
    message: params.message,
    selectedMode: params.selectedMode,
  });
}

function researchSubmodeMetadata(route: ResearchSubmodeRoute | null) {
  if (!route) return {};

  return {
    research_submode: route.submode,
    research_submode_source: route.source,
    research_submode_confidence: route.confidence,
    research_submode_matched_rule: route.matchedRule ?? null,
    research_submode_signals: route.signals,
  };
}

function researchSubmodeMetadataForIntent(intent: BroBotChatIntent) {
  if (intent.mode !== 'research' || !intent.researchSubmode) return {};

  return {
    research_submode: intent.researchSubmode,
  };
}

async function recordChatAnalyticsEvent(params: {
  userId: string;
  conversationId?: string | null;
  messageId?: string | null;
  eventType: ChatAnalyticsEvent;
  outcome: 'success' | 'failure';
  latencyMs?: number;
  metadata: Record<string, unknown>;
}) {
  try {
    const supabase = createAdminClient();

    await supabase.from('brobot_usage_events').insert({
      user_id: params.userId,
      guest_id: null,
      feature: 'brobot',
      outcome: params.outcome,
      latency_ms: params.latencyMs ?? null,
      conversation_id: params.conversationId ?? null,
      message_id: params.messageId ?? null,
      event_type: params.eventType,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error('[brobot] recordChatAnalyticsEvent failed (non-fatal)', error);
  }
}

type BranchAggregate = {
  id: string;
  label: string;
  count: number;
  lastSelectedAt: string;
};

type ModeAggregate = {
  mode: string;
  count: number;
  lastSelectedAt: string;
};

function updateBranchAggregate(
  value: unknown,
  branch: { id: string; label: string },
  now: string
): BranchAggregate[] {
  const rows = Array.isArray(value) ? value : [];
  const normalized = rows
    .map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return {
        id: typeof record.id === 'string' ? record.id : '',
        label: typeof record.label === 'string' ? record.label : '',
        count: typeof record.count === 'number' ? record.count : Number(record.count) || 0,
        lastSelectedAt:
          typeof record.lastSelectedAt === 'string' ? record.lastSelectedAt : now,
      };
    })
    .filter((item) => item.id && item.label);
  const existing = normalized.find((item) => item.id === branch.id);

  if (existing) {
    existing.count += 1;
    existing.label = branch.label;
    existing.lastSelectedAt = now;
  } else {
    normalized.push({
      id: branch.id,
      label: branch.label,
      count: 1,
      lastSelectedAt: now,
    });
  }

  return normalized.sort((a, b) => b.count - a.count).slice(0, 12);
}

function updateModeAggregate(value: unknown, mode: string, now: string): ModeAggregate[] {
  const rows = Array.isArray(value) ? value : [];
  const normalized = rows
    .map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return {
        mode: typeof record.mode === 'string' ? record.mode : '',
        count: typeof record.count === 'number' ? record.count : Number(record.count) || 0,
        lastSelectedAt:
          typeof record.lastSelectedAt === 'string' ? record.lastSelectedAt : now,
      };
    })
    .filter((item) => item.mode);
  const existing = normalized.find((item) => item.mode === mode);

  if (existing) {
    existing.count += 1;
    existing.lastSelectedAt = now;
  } else {
    normalized.push({ mode, count: 1, lastSelectedAt: now });
  }

  return normalized.sort((a, b) => b.count - a.count).slice(0, 8);
}

async function updateLearningFingerprint(params: {
  userId: string;
  mode: string;
  branch?: {
    id: string;
    label: string;
  };
}) {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('brobot_learning_fingerprints')
      .select('favorite_branches, frequent_branches, weakness_branches, preferred_modes')
      .eq('user_id', params.userId)
      .maybeSingle();

    const branch = params.branch;
    const frequentBranches = branch
      ? updateBranchAggregate(data?.frequent_branches, branch, now)
      : data?.frequent_branches ?? [];
    const favoriteBranches = branch
      ? updateBranchAggregate(data?.favorite_branches, branch, now)
      : data?.favorite_branches ?? [];
    const preferredModes = updateModeAggregate(data?.preferred_modes, params.mode, now);

    await supabase.from('brobot_learning_fingerprints').upsert({
      user_id: params.userId,
      favorite_branches: favoriteBranches,
      frequent_branches: frequentBranches,
      weakness_branches: data?.weakness_branches ?? [],
      preferred_modes: preferredModes,
    });
  } catch (error) {
    console.error('[brobot] updateLearningFingerprint failed (non-fatal)', error);
  }
}

async function loadConversationHistory(params: {
  supabase: BroBotDbClient;
  conversationId: string;
  userId: string;
}): Promise<BroBotModelMessage[]> {
  const { data, error } = await params.supabase
    .from('brobot_messages')
    .select('role, content')
    .eq('conversation_id', params.conversationId)
    .eq('user_id', params.userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data) {
    return [];
  }

  return data
    .slice()
    .reverse()
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: String(message.content ?? ''),
    }))
    .filter((message) => message.content.trim().length > 0);
}

const REVISION_BLOCKED_SUBINTENTS = new Set<BroBotChatIntent['subintent']>(['urgent_red_flags']);

type BroBotPipelineResult = {
  answerContext: BroBotAnswerContext;
  answerRoute: BroBotAnswerRoute;
  brobotOutput: ReturnType<typeof parseBroBotChatResponse> & {
    selectedFocus?: string;
    detectedMode: BroBotChatMode;
    nextLearningBranches?: BroBotBranchOption[];
  };
  answerModel: string;
  answerUsage?: unknown;
  answerRawContent: string;
  metadataModel?: string | null;
  metadataUsage?: unknown;
  qualityGate: ReturnType<typeof runBroBotQualityGate>;
  qualityGateWarningsBeforeRevision: string[];
  revisionTriggered: boolean;
  revisionModel?: string | null;
  revisionUsage?: unknown;
  originalAnswerBeforeRevision?: string | null;
  stageTimingsMs: Record<string, number>;
};

function shouldBypassRevisionPass(intent: BroBotChatIntent) {
  return REVISION_BLOCKED_SUBINTENTS.has(intent.subintent);
}

async function runJsonCompletion(params: {
  openai: OpenAI;
  model: string;
  messages: BroBotModelMessage[];
  temperature?: number;
  signal?: AbortSignal;
  onAnswerText?: (answer: string) => void;
}) {
  if (params.onAnswerText) {
    const completion = await params.openai.chat.completions.create(
      {
        model: params.model,
        temperature: params.temperature ?? 0.2,
        response_format: { type: 'json_object' },
        messages: params.messages,
        stream: true,
        stream_options: { include_usage: true },
      },
      { signal: params.signal }
    );
    let rawContent = '';
    let usage: unknown = null;

    for await (const chunk of completion) {
      rawContent += chunk.choices[0]?.delta?.content ?? '';
      usage = chunk.usage ?? usage;
      params.onAnswerText(extractAnswerFromStreamingJson(rawContent));
    }

    return { rawContent, usage };
  }

  const completion = await params.openai.chat.completions.create({
    model: params.model,
    temperature: params.temperature ?? 0.2,
    response_format: { type: 'json_object' },
    messages: params.messages,
  }, { signal: params.signal });

  return {
    rawContent: completion.choices[0]?.message?.content ?? '',
    usage: completion.usage ?? null,
  };
}

function extractAnswerFromStreamingJson(raw: string): string {
  const match = /"answer"\s*:\s*"/.exec(raw);
  if (!match) return '';

  let answer = '';
  for (let index = match.index + match[0].length; index < raw.length; index += 1) {
    const character = raw[index];
    if (character === '"') break;
    if (character !== '\\') {
      answer += character;
      continue;
    }

    const escaped = raw[index + 1];
    if (!escaped) break;
    if (escaped === 'u') {
      const hex = raw.slice(index + 2, index + 6);
      if (!/^[0-9a-f]{4}$/i.test(hex)) break;
      answer += String.fromCharCode(Number.parseInt(hex, 16));
      index += 5;
      continue;
    }
    const escapes: Record<string, string> = {
      '"': '"',
      '\\': '\\',
      '/': '/',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
    };
    answer += escapes[escaped] ?? escaped;
    index += 1;
  }
  return answer;
}

async function generateBroBotPipelineResult(params: {
  openai: OpenAI;
  persistence: BroBotDbClient;
  body: BroBotChatRequest;
  intent: BroBotChatIntent;
  answerContext?: BroBotAnswerContext;
  history: BroBotModelMessage[];
  learningBranches: {
    topic: BranchTopicRow | null;
    branches: RankedBranchOption[];
  };
  databaseBranchOptions: RankedBranchOption[];
  rankingContext: BranchRankingContext;
  signal?: AbortSignal;
  onAnswerText?: (answer: string) => void;
  preserveStreamedAnswer?: boolean;
}) : Promise<BroBotPipelineResult> {
  const pipelineStageTimingsMs: Record<string, number> = {};
  const selectedBranch =
    params.body.selectedBranchId || params.body.selectedBranchLabel
      ? {
          id: params.body.selectedBranchId,
          label: params.body.selectedBranchLabel,
        }
      : undefined;
  const answerContext =
    params.answerContext ??
    (await buildBroBotAnswerContext({
      message: params.body.message,
      intent: params.intent,
      selectedBranch,
      responseDepth: params.body.responseDepth,
      trainingLevel: params.body.trainingLevel,
      history: params.history,
    }));
  const answerRoute = routeBroBotAnswer({
    message: params.body.message,
    intent: params.intent,
    selectedMode: params.body.mode,
    history: params.history,
    answerNow: params.body.answerNow,
    selectedBranchId: params.body.selectedBranchId,
    selectedBranchLabel: params.body.selectedBranchLabel,
  });

  const answerMessages = buildBroBotChatMessages({
    message: params.body.message,
    messages: params.history,
    mode: params.intent.mode,
    responseDepth: params.body.responseDepth,
    trainingLevel: params.body.trainingLevel,
    intent: params.intent,
    selectedBranch,
    answerContext,
    answerNow: Boolean(params.body.answerNow),
    answerRoute,
    includeProductMetadata: !BROBOT_SEPARATE_METADATA_PASS,
  });
  const answerModel = getAnswerModelForRoute({
    mode: params.intent.mode,
    ambiguity: params.intent.ambiguity,
    responseDepth: params.body.responseDepth,
    subintent: params.intent.subintent,
  });
  const answerGenerationStartedAt = performance.now();
  const answerCompletion = await runJsonCompletion({
    openai: params.openai,
    model: answerModel,
    messages: answerMessages,
    signal: params.signal,
    onAnswerText: params.onAnswerText,
  });
  pipelineStageTimingsMs.answer_generation =
    Math.round((performance.now() - answerGenerationStartedAt) * 100) / 100;

  let parsedOutput = parseBroBotChatResponse(answerCompletion.rawContent, {
    fallbackMode: params.intent.mode,
    fallbackAnswer: 'BroBot could not format a structured response. Please try again.',
  });
  const qualityGateStartedAt = performance.now();
  let qualityGate = runBroBotQualityGate({
    answer: parsedOutput.answer,
    mode: params.intent.mode,
    responseDepth: params.body.responseDepth,
    selectedBranchId: params.body.selectedBranchId,
    selectedBranchLabel: params.body.selectedBranchLabel,
    subintent: params.intent.subintent,
    trainingLevel: params.body.trainingLevel,
    procedureOrTopic: params.intent.procedureOrTopic,
    answerRoute,
    clinicalContext: answerContext.clinicalContext,
  });
  pipelineStageTimingsMs.quality_gate =
    Math.round((performance.now() - qualityGateStartedAt) * 100) / 100;
  const qualityGateWarningsBeforeRevision = [...qualityGate.warnings];
  let revisionTriggered = false;
  let revisionModel: string | null = null;
  let revisionUsage: unknown = null;
  let originalAnswerBeforeRevision: string | null = null;

  if (
    BROBOT_ENABLE_REVISION_PASS &&
    qualityGate.warnings.length > 0 &&
    !shouldBypassRevisionPass(params.intent) &&
    !params.preserveStreamedAnswer
  ) {
    const revisionStartedAt = performance.now();
    originalAnswerBeforeRevision = parsedOutput.answer;
    revisionModel = getRevisionModel(params.intent.mode);
    const revisionCompletion = await runJsonCompletion({
      openai: params.openai,
      model: revisionModel,
      messages: buildBroBotRevisionMessages({
        message: params.body.message,
        mode: params.intent.mode,
        responseDepth: params.body.responseDepth,
        trainingLevel: params.body.trainingLevel,
        intent: params.intent,
        answerContext,
        selectedBranch,
        originalResponse: parsedOutput.answer,
        priorityPoints: parsedOutput.priorityPoints,
        knowledgeGaps: parsedOutput.knowledgeGaps,
        whatMostResidentsMiss: parsedOutput.whatMostResidentsMiss,
        warnings: qualityGate.warnings,
      }),
      signal: params.signal,
    });
    const revisedOutput = parseBroBotChatResponse(revisionCompletion.rawContent, {
      fallbackMode: params.intent.mode,
      fallbackAnswer: parsedOutput.answer,
    });
    parsedOutput = {
      ...revisedOutput,
      suggestedQuestions: revisedOutput.suggestedQuestions,
      nextLearningBranches: revisedOutput.nextLearningBranches,
      tags: revisedOutput.tags,
    };
    revisionTriggered = true;
    revisionUsage = revisionCompletion.usage;
    qualityGate = runBroBotQualityGate({
      answer: parsedOutput.answer,
      mode: params.intent.mode,
      responseDepth: params.body.responseDepth,
      selectedBranchId: params.body.selectedBranchId,
      selectedBranchLabel: params.body.selectedBranchLabel,
      subintent: params.intent.subintent,
      trainingLevel: params.body.trainingLevel,
      procedureOrTopic: params.intent.procedureOrTopic,
      answerRoute,
      clinicalContext: answerContext.clinicalContext,
    });
    logBroBot('[BROBOT-CHAT-REVISION]', {
      mode: params.intent.mode,
      subintent: params.intent.subintent,
      responseDepth: params.body.responseDepth,
      trainingLevel: params.body.trainingLevel,
      answerModel,
      revisionModel,
      warnings: qualityGateWarningsBeforeRevision,
      originalAnswer: originalAnswerBeforeRevision,
      revisedAnswer: parsedOutput.answer,
    });
    pipelineStageTimingsMs.revision =
      Math.round((performance.now() - revisionStartedAt) * 100) / 100;
  }

  if (params.preserveStreamedAnswer && qualityGate.warnings.length > 0) {
    const qualityNote = buildStreamingQualityNote({
      mode: params.intent.mode,
      warnings: qualityGate.warnings,
    });
    if (qualityNote) {
      parsedOutput = {
        ...parsedOutput,
        answer: `${parsedOutput.answer.trimEnd()}\n\n${qualityNote}`,
      };
      params.onAnswerText?.(parsedOutput.answer);
    }
  }

  // Convert unmet quality facets into targeted follow-up chip suggestions.
  // These are prioritized over generic branchOptions in the metadata seed so
  // the model surfaces the most relevant next learning step for this answer.
  const uncoveredFacetChips = buildUncoveredFacetChips({
    qualityWarnings: qualityGate.warnings,
    procedureOrTopic: params.intent.procedureOrTopic,
  });
  const metadataFallbackBranches = [
    ...uncoveredFacetChips,
    ...(params.intent.branchOptions ?? params.databaseBranchOptions ?? []),
  ];

  let metadataOutput = {
    suggestedQuestions: parsedOutput.suggestedQuestions,
    nextLearningBranches: parsedOutput.nextLearningBranches ?? [],
    tags: parsedOutput.tags,
  };
  let metadataModel: string | null = null;
  let metadataUsage: unknown = null;

  if (BROBOT_SEPARATE_METADATA_PASS) {
    const metadataStartedAt = performance.now();
    metadataModel = getMetadataModel();
    // The metadata pass only augments suggestedQuestions/nextLearningBranches/tags.
    // It must never take down an already-generated answer: on any failure
    // (network error, timeout, bad completion), keep the safe fallback
    // metadataOutput initialized above, which is itself derived from the
    // answer pass, and move on.
    try {
      const metadataCompletion = await runJsonCompletion({
        openai: params.openai,
        model: metadataModel,
        messages: buildBroBotMetadataMessages({
          message: params.body.message,
          mode: params.intent.mode,
          responseDepth: params.body.responseDepth,
          trainingLevel: params.body.trainingLevel,
          intent: params.intent,
          answerContext,
          finalAnswer: parsedOutput.answer,
          priorityPoints: parsedOutput.priorityPoints,
          knowledgeGaps: parsedOutput.knowledgeGaps,
          whatMostResidentsMiss: parsedOutput.whatMostResidentsMiss,
          selectedBranch,
          fallbackBranches: metadataFallbackBranches,
        }),
        signal: params.signal,
      });
      metadataOutput = parseBroBotMetadataResponse({
        raw: metadataCompletion.rawContent,
        fallbackMode: params.intent.mode,
        fallbackSuggestedQuestions: parsedOutput.suggestedQuestions,
        fallbackNextLearningBranches: metadataFallbackBranches,
        fallbackTags: parsedOutput.tags,
      });
      metadataUsage = metadataCompletion.usage;
    } catch (error) {
      logBroBot('[BROBOT-CHAT-METADATA-FALLBACK]', {
        mode: params.intent.mode,
        metadataModel,
        ...safeErrorPayload(error),
      });
      metadataModel = null;
    } finally {
      pipelineStageTimingsMs.metadata_generation =
        Math.round((performance.now() - metadataStartedAt) * 100) / 100;
    }
  }

  const routeNeedsClarification = answerRoute === 'ask_clarification';
  const clarifyingQuestions = mergeQuestions(
    routeNeedsClarification
      ? parsedOutput.clarifyingQuestions?.length
        ? parsedOutput.clarifyingQuestions
        : params.intent.clarifyingQuestions.length
          ? params.intent.clarifyingQuestions
          : buildBroBotRouteClarifyingQuestions({
              message: params.body.message,
              intent: params.intent,
              answerRoute,
            })
      : [],
    []
  ).slice(0, 3);
  const nextLearningBranches = mergeBranchOptions(
    params.databaseBranchOptions,
    metadataOutput.nextLearningBranches.length > 0
      ? metadataOutput.nextLearningBranches
      : parsedOutput.nextLearningBranches ?? params.intent.branchOptions ?? [],
    5,
    params.rankingContext
  );
  const brobotOutput = {
    ...parsedOutput,
    answer: routeNeedsClarification
      ? enforceClarificationAnswerBrevity(parsedOutput.answer)
      : parsedOutput.answer,
    selectedFocus:
      params.body.selectedBranchLabel ||
      params.body.selectedBranchId ||
      (params.body.answerNow ? 'General framework' : undefined),
    detectedMode: params.intent.mode,
    needsClarification: routeNeedsClarification && clarifyingQuestions.length > 0,
    clarifyingQuestions,
    assumedContext: parsedOutput.assumedContext || params.intent.assumedContext,
    researchSubmode: params.intent.mode === 'research' ? params.intent.researchSubmode : undefined,
    suggestedQuestions: mergeQuestions(
      clarifyingQuestions,
      metadataOutput.suggestedQuestions.length > 0
        ? metadataOutput.suggestedQuestions
        : parsedOutput.suggestedQuestions
    ),
    nextLearningBranches: await attachPersistedBranchQuestionIds({
      persistence: params.persistence,
      topic: params.learningBranches.topic,
      branches: nextLearningBranches,
    }),
    tags: metadataOutput.tags.length > 0 ? metadataOutput.tags : parsedOutput.tags,
  };

  return {
    answerContext,
    answerRoute,
    brobotOutput,
    answerModel,
    answerUsage: answerCompletion.usage,
    answerRawContent: answerCompletion.rawContent,
    metadataModel,
    metadataUsage,
    qualityGate,
    qualityGateWarningsBeforeRevision,
    revisionTriggered,
    revisionModel,
    revisionUsage,
    originalAnswerBeforeRevision,
    stageTimingsMs: pipelineStageTimingsMs,
  };
}

function buildStreamingQualityNote(input: {
  mode: BroBotChatMode;
  warnings: string[];
}): string {
  if (input.warnings.length === 0) return '';

  if (input.mode === 'consult') {
    return '**Quality note:** Confirm urgency, open/closed status, neurovascular findings, and imaging before applying this framework to a patient.';
  }
  if (input.mode === 'or_prep') {
    return '**Quality note:** Confirm the case-specific pattern, reduction goal, fixation plan, imaging checks, and attending preferences before scrub.';
  }
  if (input.mode === 'oite') {
    return '**Quality note:** Cross-check the relevant classification, treatment-changing threshold, and common distractor before committing this to memory.';
  }
  if (input.mode === 'clinic') {
    return '**Quality note:** Adapt this framework to the patient’s history, examination, imaging, and treatment goals.';
  }
  if (input.mode === 'research') {
    return '**Quality note:** Verify the source, study design, effect estimate, and limitations before using this conclusion.';
  }
  return '**Quality note:** Verify the case-specific details and clinical context before applying this general framework.';
}

async function handleGuestChat(params: {
  request: Request;
  requestId: string;
  startedAt: number;
  body: BroBotChatRequest;
  subject: Subject;
  guestCookieToSet: string | null;
}): Promise<Response> {
  const { request, requestId, startedAt, body, subject, guestCookieToSet } = params;
  const persistence = createAdminClient();

  const gate = await getBroBotAccessGate(subject);
  const limit = gate.dailyCap;
  const remainingBefore = gate.remainingToday;
  const usedBefore =
    limit != null && remainingBefore != null ? Math.max(0, limit - remainingBefore) : null;

  logBroBot('[BROBOT-CHAT-START]', {
    requestId,
    userType: subject.type,
    subjectPrefix: subjectPrefix(subject),
    mode: body.mode,
    responseDepth: body.responseDepth,
    trainingLevel: body.trainingLevel,
    messageLength: body.message.length,
    remainingBefore,
    allowed: !gate.isLimitReached,
    persistence: 'guest_ephemeral',
  });

  if (gate.source === 'disabled') {
    return withGuestCookie(disabledResponse(), guestCookieToSet);
  }

  if (gate.isLimitReached) {
    await recordUsageEvent({
      subject,
      outcome: 'limit_hit',
      latencyMs: Date.now() - startedAt,
    });
    return withGuestCookie(limitReachedResponse(limit), guestCookieToSet);
  }

  const openai = getOpenAI();
  const history: BroBotModelMessage[] = [];
  const acceptedIntent = buildAcceptedIntent(body);
  let intent: BroBotChatIntent = acceptedIntent ?? fallbackBroBotIntentExpansion(body.message, body.mode);
  const intentSource = body.intentSource ?? (acceptedIntent ? 'local' : 'fallback');

  if (!acceptedIntent) {
    try {
      const intentCompletion = await openai.chat.completions.create({
        model: BROBOT_INTENT_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: buildBroBotIntentExpansionMessages({
          message: body.message,
          selectedMode: body.mode,
          responseDepth: body.responseDepth,
          trainingLevel: body.trainingLevel,
          history,
        }),
      });
      intent = parseBroBotIntentExpansionResponse(
        intentCompletion.choices[0]?.message?.content ?? '',
        { message: body.message, selectedMode: body.mode }
      );
    } catch (error) {
      logChatStepError({
        requestId,
        category: 'parse_error',
        step: 'guest_expand_intent',
        error,
      });
      intent = fallbackBroBotIntentExpansion(body.message, body.mode);
    }
  }

  const baseRankingContext: BranchRankingContext = {
    userMessage: body.message,
    mode: intent.mode,
    trainingLevel: body.trainingLevel,
    history,
    intent,
    fingerprint: null,
  };

  const learningBranches = await loadRankedBranchQuestions({
    persistence,
    intent,
    context: baseRankingContext,
  });
  const outcomePerformanceByBranchId = await loadBranchOutcomePerformance({
    persistence,
    branchQuestionIds: learningBranches.branches
      .map((branch) => branch.branchQuestionId ?? branch.id)
      .filter(isUuid),
    mode: intent.mode,
    trainingLevel: body.trainingLevel,
  });
  const rankingContext: BranchRankingContext = {
    ...baseRankingContext,
    outcomePerformanceByBranchId,
  };
  const databaseBranchOptions = learningBranches.branches
    .map((branch) => scoreBranchOption(branch, rankingContext))
    .sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0))
    .slice(0, 12);
  learningBranches.branches = databaseBranchOptions;

  if (databaseBranchOptions.length > 0) {
    intent = {
      ...intent,
      branchOptions: mergeBranchOptions(databaseBranchOptions, intent.branchOptions ?? [], 7, rankingContext),
    };
  }

  intent = anchorIntentTopicToHistory(intent, body.message, history);

  if (body.stream || BROBOT_STREAMING_ENABLED) {
    return createGuestStreamingChatResponse({
      request,
      requestId,
      openai,
      persistence,
      subject,
      body,
      intent,
      history,
      learningBranches,
      databaseBranchOptions,
      rankingContext,
      startedAt,
      limit,
      usedBefore,
      guestCookieToSet,
    });
  }

  const pipelineResult = await generateBroBotPipelineResult({
    openai,
    persistence,
    body,
    intent,
    history,
    learningBranches,
    databaseBranchOptions,
    rankingContext,
  });
  const latencyMs = Date.now() - startedAt;
  const brobotOutput = {
    ...pipelineResult.brobotOutput,
    nextLearningBranches: withRankPositions(pipelineResult.brobotOutput.nextLearningBranches ?? []),
  };

  const ip = getClientIp(request) ?? undefined;
  const userAgent = request.headers.get('user-agent') ?? undefined;
  const usedAfter = await recordSuccessfulAIUse(subject, latencyMs, {
    ipHash: hashForLogging(ip),
    userAgentHash: hashForLogging(userAgent),
  });
  const remainingAfter = limit != null ? Math.max(0, limit - usedAfter) : null;

  logBroBot('[BROBOT-CHAT-GENERATION]', {
    requestId,
    provider: 'openai',
    model: pipelineResult.answerModel,
    success: true,
    detectedMode: brobotOutput.detectedMode,
    confidence: brobotOutput.confidence,
    usedBefore,
    usedAfter,
    remainingAfter,
    qualityGateWarnings: pipelineResult.qualityGate.warnings,
    qualityGateWarningsBeforeRevision: pipelineResult.qualityGateWarningsBeforeRevision,
    revisionTriggered: pipelineResult.revisionTriggered,
    revisionModel: pipelineResult.revisionModel,
    metadataModel: pipelineResult.metadataModel,
    answerRoute: pipelineResult.answerRoute,
    persistence: 'guest_ephemeral',
    intentSource,
  });

  return withGuestCookie(
    NextResponse.json({
      conversationId: body.conversationId ?? crypto.randomUUID(),
      messageId: crypto.randomUUID(),
      goal: brobotOutput.goal,
      selectedFocus: brobotOutput.selectedFocus,
      answer: brobotOutput.answer,
      priorityPoints: brobotOutput.priorityPoints,
      knowledgeGaps: brobotOutput.knowledgeGaps,
      whatMostResidentsMiss: brobotOutput.whatMostResidentsMiss,
      suggestedQuestions: brobotOutput.suggestedQuestions,
      nextLearningBranches: brobotOutput.nextLearningBranches,
      tags: brobotOutput.tags,
      detectedMode: brobotOutput.detectedMode,
      remainingFreeUses: remainingAfter,
      confidence: brobotOutput.confidence,
      needsClarification: brobotOutput.needsClarification,
      clarifyingQuestions: brobotOutput.clarifyingQuestions,
      assumedContext: brobotOutput.assumedContext,
      consultConfidence: brobotOutput.consultConfidence,
      missingInformation: brobotOutput.missingInformation,
      researchSubmode: brobotOutput.researchSubmode,
    } satisfies BroBotChatResponse),
    guestCookieToSet
  );
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const stageTimer = new BroBotStageTimer();

  let subject: Subject | null = null;
  let guestCookieToSet: string | null = null;
  let userId: string | null = null;
  let conversationId: string | null = null;
  let userMessageId: string | null = null;
  let body: BroBotChatRequest | null = null;
  let step = 'parse_request';

  try {
    const raw = await request.json().catch(() => null);
    const normalizedPayload = normalizePromptPayload(raw);
    if (!normalizedPayload.prompt) {
      logBroBotChat400({
        reason: 'empty_normalized_prompt',
        body: raw,
        normalizedPrompt: normalizedPayload.prompt,
        request,
      });
      return invalidRequestResponse('Please enter a BroBot question.');
    }
    const parsed = BroBotChatRequestSchema.safeParse(normalizedPayload.normalized);
    stageTimer.mark('request_normalization', Date.now() - startedAt);

    if (!parsed.success) {
      logBroBotChat400({
        reason: 'schema_validation_failed',
        body: normalizedPayload.normalized,
        normalizedPrompt: normalizedPayload.prompt,
        request,
      });
      logBroBot('[BROBOT-CHAT-VALIDATION]', {
        requestId,
        success: false,
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          code: issue.code,
        })),
      });
      return invalidRequestResponse('Invalid BroBot request.');
    }

    body = parsed.data;
    const validatedBody = parsed.data;
    step = 'auth';
    const auth = await stageTimer.measure('authentication', () => getAuthContext(request));

    if (!auth.user && auth.hasBearerToken) {
      return unauthorizedResponse();
    }

    if (!auth.user) {
      let guestSession = getGuestSessionFromRequest(request);
      if (!guestSession) {
        const headerGuestId = getGuestIdFromHeader(request);
        if (headerGuestId) {
          guestSession = createGuestSessionFromId(headerGuestId);
        } else {
          const createdGuest = createGuestSession();
          guestSession = createdGuest.session;
          guestCookieToSet = createdGuest.cookie;
        }
      }

      subject = { type: 'guest', id: guestSession.guestId };
      return await handleGuestChat({
        request,
        requestId,
        startedAt,
        body,
        subject,
        guestCookieToSet,
      });
    }

    userId = auth.user.id;
    const authenticatedUserId = auth.user.id;
    subject = { type: 'user', id: userId };
    const authenticatedSubject = subject;
    const persistence = createAdminClient();

    step = 'quota_check';
    const gate = await stageTimer.measure(
      'entitlement_quota',
      () => getBroBotAccessGate(authenticatedSubject)
    );
    const limit = gate.dailyCap;
    const remainingBefore = gate.remainingToday;
    const usedBefore =
      limit != null && remainingBefore != null ? Math.max(0, limit - remainingBefore) : null;

    logBroBot('[BROBOT-CHAT-START]', {
      requestId,
      userType: subject.type,
      subjectPrefix: subjectPrefix(subject),
      mode: body.mode,
      responseDepth: body.responseDepth,
      trainingLevel: body.trainingLevel,
      messageLength: body.message.length,
      remainingBefore,
      allowed: !gate.isLimitReached,
    });

    if (gate.source === 'disabled') {
      return disabledResponse();
    }

    if (gate.isLimitReached) {
      await recordUsageEvent({
        subject,
        outcome: 'limit_hit',
        latencyMs: Date.now() - startedAt,
      });
      return limitReachedResponse(limit);
    }

    const conversationPersistenceStartedAt = performance.now();
    if (body.conversationId) {
      step = 'load_conversation';
      const { data: existingConversation, error } = await persistence
        .from('brobot_conversations')
        .select('id')
        .eq('id', body.conversationId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logChatStepError({
          requestId,
          category: 'database_error',
          step,
          error,
          userId,
          conversationId: body.conversationId,
        });
        return serverErrorResponse('database_error', 'BroBot could not load this conversation.');
      }

      if (!existingConversation) {
        return conversationNotFoundResponse();
      }

      conversationId = existingConversation.id;
    } else {
      step = 'create_conversation';
      const { data: createdConversation, error } = await persistence
        .from('brobot_conversations')
        .insert({
          user_id: userId,
          title: buildConversationTitle(body.message),
          detected_context: null,
          last_mode: body.mode,
        })
        .select('id')
        .single();

      if (error || !createdConversation) {
        logChatStepError({
          requestId,
          category: 'database_error',
          step,
          error: error ?? new Error('No conversation returned'),
          userId,
        });
        return serverErrorResponse('database_error', 'BroBot could not create this conversation.');
      }

      conversationId = createdConversation.id;
    }
    stageTimer.mark(
      'conversation_lookup_or_creation',
      performance.now() - conversationPersistenceStartedAt
    );

    const persistedConversationId = conversationId;
    if (!persistedConversationId) {
      return serverErrorResponse('database_error', 'BroBot could not create this conversation.');
    }

    await recordChatAnalyticsEvent({
      userId,
      conversationId: persistedConversationId,
      eventType: 'brobot_chat_request',
      outcome: 'success',
      metadata: {
        mode: body.mode,
        responseDepth: body.responseDepth,
        trainingLevel: body.trainingLevel,
        model: getAnswerModelForRoute({
          mode: body.mode,
          responseDepth: body.responseDepth,
        }),
      },
    });

    if (
      body.source === 'suggested_question' ||
      body.source === 'clarification_question' ||
      body.source === 'branch_selection' ||
      body.source === 'answer_now'
    ) {
      await recordChatAnalyticsEvent({
        userId: authenticatedUserId,
        conversationId: persistedConversationId,
        messageId: body.sourceMessageId ?? null,
        eventType:
          body.source === 'branch_selection'
            ? 'branch_selected'
            : body.source === 'answer_now'
              ? 'answer_now_clicked'
              : body.source === 'clarification_question'
                ? 'clarification_selected'
                : 'brobot_chat_suggested_question_click',
        outcome: 'success',
        metadata: {
          mode: body.mode,
          responseDepth: body.responseDepth,
          trainingLevel: body.trainingLevel,
          source: body.source,
          branch: body.selectedBranchLabel ?? body.selectedBranchId ?? null,
          branch_label: body.selectedBranchLabel ?? null,
          rank_position: body.selectedBranchRankPosition ?? null,
          source_message_id: body.sourceMessageId ?? null,
          questionLength: body.message.length,
          questionHash: hashForLogging(body.message),
          sourceMessageIdPresent: Boolean(body.sourceMessageId),
        },
      });
      if (body.source === 'branch_selection') {
        await recordChatAnalyticsEvent({
          userId,
          conversationId: persistedConversationId,
          messageId: body.sourceMessageId ?? null,
          eventType: 'focus_option_clicked',
          outcome: 'success',
          metadata: {
            mode: body.mode,
            responseDepth: body.responseDepth,
            trainingLevel: body.trainingLevel,
            branch: body.selectedBranchLabel ?? body.selectedBranchId ?? null,
            branch_label: body.selectedBranchLabel ?? null,
            rank_position: body.selectedBranchRankPosition ?? null,
          },
        });
        await recordChatAnalyticsEvent({
          userId,
          conversationId: persistedConversationId,
          messageId: body.sourceMessageId ?? null,
          eventType: 'branch_click',
          outcome: 'success',
          metadata: {
            branch: body.selectedBranchLabel ?? body.selectedBranchId ?? null,
            rank_position: body.selectedBranchRankPosition ?? null,
          },
        });
        await recordChatAnalyticsEvent({
          userId,
          conversationId: persistedConversationId,
          messageId: body.sourceMessageId ?? null,
          eventType: 'continued_after_branch_click',
          outcome: 'success',
          metadata: {
            nextQuestionHash: hashForLogging(body.message),
            branch: body.selectedBranchLabel ?? body.selectedBranchId ?? null,
          },
        });
      }
    }

    step = 'create_user_message';
    const { data: createdUserMessage, error: userMessageError } = await stageTimer.measure(
      'user_message_persistence',
      () =>
        persistence
          .from('brobot_messages')
          .insert({
            conversation_id: persistedConversationId,
            user_id: authenticatedUserId,
            role: 'user',
            content: validatedBody.message,
            structured_json: null,
            mode: validatedBody.mode,
            response_depth: validatedBody.responseDepth,
          })
          .select('id')
          .single()
    );

    if (userMessageError || !createdUserMessage) {
      logChatStepError({
        requestId,
        category: 'database_error',
        step,
        error: userMessageError ?? new Error('No message returned'),
        userId,
        conversationId: persistedConversationId,
      });
      return serverErrorResponse('database_error', 'BroBot could not save your message.');
    }

    userMessageId = createdUserMessage.id;

    step = 'load_history';
    const history = await stageTimer.measure('conversation_history', () =>
      loadConversationHistory({
        supabase: persistence,
        conversationId: persistedConversationId,
        userId: authenticatedUserId,
      })
    );

    let openai: OpenAI;
    try {
      step = 'openai_client';
      openai = getOpenAI();
    } catch (error) {
      logChatStepError({
        requestId,
        category: 'openai_configuration_missing',
        step,
        error,
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
      });
      return serverErrorResponse(
        'openai_configuration_missing',
        'OpenAI configuration missing.'
      );
    }

    const intentStartedAt = performance.now();
    const acceptedIntent = buildAcceptedIntent(validatedBody);
    let intent: BroBotChatIntent = acceptedIntent ?? fallbackBroBotIntentExpansion(validatedBody.message, validatedBody.mode);
    const intentSource = validatedBody.intentSource ?? (acceptedIntent ? 'local' : 'fallback');

    if (!acceptedIntent) {
      try {
        step = 'expand_intent';
        const intentCompletion = await openai.chat.completions.create({
          model: BROBOT_INTENT_MODEL,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: buildBroBotIntentExpansionMessages({
            message: body.message,
            selectedMode: body.mode,
            responseDepth: body.responseDepth,
            trainingLevel: body.trainingLevel,
            history,
          }),
        });
        intent = parseBroBotIntentExpansionResponse(
          intentCompletion.choices[0]?.message?.content ?? '',
          { message: body.message, selectedMode: body.mode }
        );
      } catch (error) {
        logChatStepError({
          requestId,
          category: 'parse_error',
          step,
          error,
          userId,
          conversationId: persistedConversationId,
          messageId: userMessageId,
        });
        intent = fallbackBroBotIntentExpansion(body.message, body.mode);
      }
    }
    stageTimer.mark('intent_resolution', performance.now() - intentStartedAt);

    const researchSubmodeRoute = resolveResearchSubmode({
      message: body.message,
      selectedMode: body.mode,
      intent,
      requestHint: body.researchSubmode,
    });
    if (researchSubmodeRoute) {
      intent = {
        ...intent,
        researchSubmode: researchSubmodeRoute.submode,
      };
      void recordChatAnalyticsEvent({
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
        eventType: 'brobot_research_submode_detected',
        outcome: 'success',
        latencyMs: Date.now() - startedAt,
        metadata: {
          mode: body.mode,
          intent_mode: intent.mode,
          intent_subintent: intent.subintent,
          ...researchSubmodeMetadata(researchSubmodeRoute),
        },
      });
    }

    const clinicalContext = await stageTimer.measure('clinical_context_extraction', () =>
      buildBroBotClinicalContextFromIntent({
        message: validatedBody.message,
        intent,
        selectedBranch:
          validatedBody.selectedBranchId || validatedBody.selectedBranchLabel
            ? { id: validatedBody.selectedBranchId, label: validatedBody.selectedBranchLabel }
            : undefined,
      })
    );
    const kgShadowPromise: Promise<BroBotKgShadowResult> = retrieveBroBotKgShadow({
      requestId,
      query: validatedBody.message,
      intent,
      clinicalContext,
      responseDepth: validatedBody.responseDepth,
      trainingLevel: validatedBody.trainingLevel,
      selectedBranch:
        validatedBody.selectedBranchId || validatedBody.selectedBranchLabel
          ? { id: validatedBody.selectedBranchId, label: validatedBody.selectedBranchLabel }
          : undefined,
      conversationTopic: history.length ? resolveTopicFromHistory({ message: validatedBody.message, history }) : null,
    });

    const branchReadsStartedAt = performance.now();
    const fingerprint = await loadLearningFingerprint({ userId });
    const baseRankingContext: BranchRankingContext = {
      userMessage: body.message,
      mode: intent.mode,
      trainingLevel: body.trainingLevel,
      history,
      intent,
      fingerprint,
    };

    step = 'load_learning_branches';
    const learningBranches = await loadRankedBranchQuestions({
      persistence,
      intent,
      context: baseRankingContext,
    });
    const outcomePerformanceByBranchId = await loadBranchOutcomePerformance({
      persistence,
      branchQuestionIds: learningBranches.branches
        .map((branch) => branch.branchQuestionId ?? branch.id)
        .filter(isUuid),
      mode: intent.mode,
      trainingLevel: body.trainingLevel,
    });
    const rankingContext: BranchRankingContext = {
      ...baseRankingContext,
      outcomePerformanceByBranchId,
    };
    const databaseBranchOptions = learningBranches.branches
      .map((branch) => scoreBranchOption(branch, rankingContext))
      .sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0))
      .slice(0, 12);
    learningBranches.branches = databaseBranchOptions;
    stageTimer.mark('branch_and_fingerprint_reads', performance.now() - branchReadsStartedAt);

    if (databaseBranchOptions.length > 0) {
      intent = {
        ...intent,
        branchOptions: mergeBranchOptions(databaseBranchOptions, intent.branchOptions ?? [], 7, rankingContext),
      };
    }

    intent = anchorIntentTopicToHistory(intent, body.message, history);

    if (isDevelopment) {
      console.log('[BROBOT-CHAT-ROUTE]', {
        requestId,
        requiresFocusSelection: Boolean(intent.requiresBranchSelection),
        reason: intent.reasonForBranching || 'intent_is_answerable',
        mode: intent.mode,
        subintent: intent.subintent,
        focus: intent.procedureOrTopic,
      });
    }

    if (body.source === 'manual' && body.selectedBranchId == null && !body.answerNow) {
      await recordChatAnalyticsEvent({
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
        eventType: 'branch_skipped',
        outcome: 'success',
        latencyMs: Date.now() - startedAt,
        metadata: {
          mode: body.mode,
          intent_mode: intent.mode,
          intent_subintent: intent.subintent,
          intent_procedure_category: intent.procedureCategory,
          ambiguity_level: intent.ambiguity,
          answerImmediately: Boolean(intent.answerImmediately),
          ...researchSubmodeMetadata(researchSubmodeRoute),
        },
      });
    }

    await updateLearningFingerprint({
      userId,
      mode: intent.mode,
      branch:
        body.selectedBranchId && body.selectedBranchLabel
          ? {
              id: body.selectedBranchId,
              label: body.selectedBranchLabel,
            }
          : undefined,
    });

    const answerContext = await stageTimer.measure('caseprep_and_answer_context', () =>
      buildBroBotAnswerContext({
        message: validatedBody.message,
        intent,
        selectedBranch:
          validatedBody.selectedBranchId || validatedBody.selectedBranchLabel
            ? {
                id: validatedBody.selectedBranchId,
                label: validatedBody.selectedBranchLabel,
              }
            : undefined,
        responseDepth: validatedBody.responseDepth,
        trainingLevel: validatedBody.trainingLevel,
        history,
      }),
      'parallel_context'
    );
    const kgShadow = await kgShadowPromise;
    for (const [name, duration] of Object.entries(kgShadow.trace.stageTimingsMs)) {
      stageTimer.mark(name, duration);
    }
    const kgTelemetry = await persistBroBotKgShadowTrace({
      result: kgShadow,
      query: validatedBody.message,
      userId,
      conversationId: persistedConversationId,
      messageId: createdUserMessage.id,
      mode: intent.mode,
      subintent: intent.subintent,
      trainingLevel: validatedBody.trainingLevel,
      responseDepth: validatedBody.responseDepth,
      isFollowUp: history.filter((message) => message.role === 'user').length > 1,
    });
    stageTimer.mark('kg_telemetry_persistence', kgTelemetry.latencyMs);

    if (body.stream || BROBOT_STREAMING_ENABLED) {
      return createStreamingChatResponse({
        request,
        requestId,
        openai,
        persistence,
        subject,
        userId,
        conversationId: persistedConversationId,
        userMessageId: createdUserMessage.id,
        body,
        intent,
        intentSource,
        answerContext,
        history,
        learningBranches,
        databaseBranchOptions,
        rankingContext,
        startedAt,
        limit,
        usedBefore,
      });
    }

    let pipelineResult: BroBotPipelineResult;
    try {
      step = 'openai_completion';
      pipelineResult = await stageTimer.measure('answer_generation_pipeline', () =>
        generateBroBotPipelineResult({
          openai,
          persistence,
          body: validatedBody,
          intent,
          answerContext,
          history,
          learningBranches,
          databaseBranchOptions,
          rankingContext,
        })
      );
    } catch (error) {
      logChatStepError({
        requestId,
        category: 'openai_error',
        step,
        error,
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
      });
      await recordChatAnalyticsEvent({
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
        eventType: 'brobot_chat_error',
        outcome: 'failure',
        latencyMs: Date.now() - startedAt,
        metadata: {
          mode: body.mode,
          responseDepth: body.responseDepth,
          trainingLevel: body.trainingLevel,
          model: getAnswerModelForRoute({
            mode: intent.mode,
            ambiguity: intent.ambiguity,
            responseDepth: body.responseDepth,
            subintent: intent.subintent,
          }),
          errorCode: 'openai_error',
        },
      });
      return serverErrorResponse('openai_error');
    }

    const latencyMs = Date.now() - startedAt;
    for (const [name, duration] of Object.entries(pipelineResult.stageTimingsMs)) {
      stageTimer.mark(name, duration);
    }
    stageTimer.mark('total_request', latencyMs);
    const brobotOutput = pipelineResult.brobotOutput;
    const qualityGate = pipelineResult.qualityGate;
    await attachBroBotKgAnswerOutcome({
      requestId,
      qualityGateWarnings: qualityGate.warnings,
    });

    if (!qualityGate.passed) {
      void recordChatAnalyticsEvent({
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
        eventType: 'quality_gate_failed',
        outcome: 'success',
        latencyMs,
        metadata: {
          mode: body.mode,
          detectedMode: intent.mode,
          intent_subintent: intent.subintent,
          intent_procedure_category: intent.procedureCategory,
          selectedBranch: body.selectedBranchLabel ?? body.selectedBranchId ?? null,
          warnings: qualityGate.warnings,
          ...researchSubmodeMetadata(researchSubmodeRoute),
        },
      });
    }

    if (brobotOutput.needsClarification && (brobotOutput.clarifyingQuestions?.length ?? 0) > 0) {
      await recordChatAnalyticsEvent({
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
        eventType: 'visible_clarification_shown',
        outcome: 'success',
        latencyMs,
        metadata: {
          mode: body.mode,
          detectedMode: brobotOutput.detectedMode,
          intent_subintent: intent.subintent,
          intent_procedure_category: intent.procedureCategory,
          ambiguity_level: intent.ambiguity,
          intent_mode: intent.mode,
          intent_goal: intent.goal ?? null,
          selectedBranch: body.selectedBranchLabel ?? body.selectedBranchId ?? null,
          classifierConfidence: intent.confidence,
          intentSource,
          responseDepth: body.responseDepth,
          trainingLevel: body.trainingLevel,
          clarifyingQuestionCount: brobotOutput.clarifyingQuestions?.length ?? 0,
          consultConfidence: brobotOutput.consultConfidence ?? null,
          missingInformationCount: brobotOutput.missingInformation?.length ?? 0,
          consultSubtype: brobotOutput.detectedMode === 'consult' ? intent.subintent : null,
          confidence: brobotOutput.confidence,
          answerRoute: pipelineResult.answerRoute,
          ...researchSubmodeMetadata(researchSubmodeRoute),
        },
      });
    }

    if (pipelineResult.answerRoute === 'answer_with_assumption') {
      await recordChatAnalyticsEvent({
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
        eventType: 'answer_with_assumption',
        outcome: 'success',
        latencyMs,
        metadata: {
          mode: body.mode,
          detectedMode: brobotOutput.detectedMode,
          assumedContext: brobotOutput.assumedContext || intent.assumedContext || null,
          intent_subintent: intent.subintent,
          intent_procedure_category: intent.procedureCategory,
          ambiguity_level: intent.ambiguity,
          answerRoute: pipelineResult.answerRoute,
        },
      });
    }

    if ((brobotOutput.nextLearningBranches?.length ?? 0) > 0) {
      await recordChatAnalyticsEvent({
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
        eventType: 'focus_options_shown',
        outcome: 'success',
        latencyMs,
        metadata: {
          mode: body.mode,
          detectedMode: brobotOutput.detectedMode,
          branchCount: brobotOutput.nextLearningBranches?.length ?? 0,
          answerRoute: pipelineResult.answerRoute,
          intent_subintent: intent.subintent,
          intent_procedure_category: intent.procedureCategory,
        },
      });
      await recordChatAnalyticsEvent({
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
        eventType: 'branch_impression',
        outcome: 'success',
        latencyMs,
        metadata: {
          branchCount: brobotOutput.nextLearningBranches?.length ?? 0,
          branchLabels: brobotOutput.nextLearningBranches?.map((branch) => branch.label) ?? [],
          answerRoute: pipelineResult.answerRoute,
        },
      });
    }

    if (pipelineResult.revisionTriggered) {
      await recordChatAnalyticsEvent({
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
        eventType: 'quality_revision_triggered',
        outcome: 'success',
        latencyMs,
        metadata: {
          mode: body.mode,
          detectedMode: brobotOutput.detectedMode,
          answerRoute: pipelineResult.answerRoute,
          warnings: pipelineResult.qualityGateWarningsBeforeRevision,
          revisionModel: pipelineResult.revisionModel,
        },
      });
      await recordChatAnalyticsEvent({
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
        eventType: 'quality_revision_reason',
        outcome: 'success',
        latencyMs,
        metadata: {
          reasons: pipelineResult.qualityGateWarningsBeforeRevision,
          intent_subintent: intent.subintent,
          intent_procedure_category: intent.procedureCategory,
        },
      });
    }

    step = 'create_assistant_message';
    const { data: assistantMessage, error: assistantMessageError } = await stageTimer.measure(
      'assistant_message_persistence',
      () =>
        persistence
          .from('brobot_messages')
          .insert({
            conversation_id: persistedConversationId,
            user_id: userId,
            role: 'assistant',
            content: brobotOutput.answer,
            structured_json: { ...brobotOutput, answerRoute: pipelineResult.answerRoute },
            mode: brobotOutput.detectedMode,
            response_depth: validatedBody.responseDepth,
          })
          .select('id')
          .single()
    );

    if (assistantMessageError || !assistantMessage) {
      logChatStepError({
        requestId,
        category: 'database_error',
        step,
        error: assistantMessageError ?? new Error('No message returned'),
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
      });
      await recordChatAnalyticsEvent({
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
        eventType: 'brobot_chat_error',
        outcome: 'failure',
        latencyMs,
        metadata: {
          mode: body.mode,
          detectedMode: brobotOutput.detectedMode,
          responseDepth: body.responseDepth,
          trainingLevel: body.trainingLevel,
          model: pipelineResult.answerModel,
          errorCode: 'assistant_message_persistence_failed',
          ...researchSubmodeMetadata(researchSubmodeRoute),
        },
      });
      return serverErrorResponse('database_error', 'BroBot could not save this response.');
    }

    const assistantMessageId = assistantMessage.id;

    void enqueueBroBotEvaluationJob({
      conversationId: persistedConversationId,
      messageId: assistantMessageId,
      userId,
      mode: intent.mode,
      procedure: intent.procedureOrTopic,
      model: pipelineResult.answerModel,
      trainingLevel: body.trainingLevel,
      responseDepth: body.responseDepth,
      intentSnapshot: intent,
      contextSnapshot: {
        certifiedContext: answerContext.certifiedContext,
        orPrepProcedureMetadata: answerContext.orPrepProcedureMetadata,
        oiteLearningMetadata: answerContext.oiteLearningMetadata,
        qualityGateWarningsBeforeRevision: pipelineResult.qualityGateWarningsBeforeRevision,
        revisionTriggered: pipelineResult.revisionTriggered,
        answerRoute: pipelineResult.answerRoute,
        originalAnswerBeforeRevision: pipelineResult.originalAnswerBeforeRevision,
        finalAnswer: brobotOutput.answer,
      },
    });

    const tagRows = normalizeTags(
      brobotOutput.tags,
      brobotOutput.detectedMode,
      brobotOutput.confidence
    ).map((tag) => ({
      message_id: assistantMessageId,
      user_id: userId,
      ...tag,
    }));

    if (tagRows.length > 0) {
      step = 'create_tags';
      const { error: tagError } = await persistence.from('brobot_message_tags').insert(tagRows);

      if (tagError) {
        logChatStepError({
          requestId,
          category: 'database_error',
          step,
          error: tagError,
          userId,
          conversationId: persistedConversationId,
          messageId: assistantMessageId,
        });
      }
    }

    const branchClick = await recordBranchClickEvent({
      persistence,
      userId,
      conversationId: persistedConversationId,
      topicId: learningBranches.topic?.topic_id ?? null,
      selectedBranchId: body.selectedBranchId,
      selectedBranchLabel: body.selectedBranchLabel,
      selectedBranchRankPosition: body.selectedBranchRankPosition,
      sourceMessageId: body.sourceMessageId ?? null,
      mode: intent.mode,
      trainingLevel: body.trainingLevel,
    });

    await recordBranchOutcome({
      persistence,
      userId,
      conversationId: persistedConversationId,
      branchEventId: branchClick?.id ?? null,
      branchQuestionId: branchClick?.branchQuestionId ?? body.selectedBranchId ?? null,
      mode: intent.mode,
      trainingLevel: body.trainingLevel,
      history,
      sourceMessageId: body.sourceMessageId ?? null,
      latencyMs,
    });

    step = 'update_conversation';
    const { error: updateConversationError } = await persistence
      .from('brobot_conversations')
      .update({
        last_mode: brobotOutput.detectedMode,
        detected_context: {
          tags: brobotOutput.tags,
          confidence: brobotOutput.confidence,
          intent: {
            subintent: intent.subintent,
            procedureCategory: intent.procedureCategory,
            goal: intent.goal ?? null,
            procedureOrTopic: intent.procedureOrTopic,
            ambiguity: intent.ambiguity,
            missingContext: intent.missingContext,
            branchOptions: intent.branchOptions ?? [],
            selectedBranch: body.selectedBranchLabel ?? body.selectedBranchId ?? null,
            classifierConfidence: intent.confidence,
            intentSource,
            researchSubmode: intent.researchSubmode ?? null,
            qualityGateWarnings: qualityGate.warnings,
            qualityGateWarningsBeforeRevision: pipelineResult.qualityGateWarningsBeforeRevision,
            revisionTriggered: pipelineResult.revisionTriggered,
          },
          consult:
            brobotOutput.detectedMode === 'consult'
              ? {
                  confidence: brobotOutput.consultConfidence ?? null,
                  missingInformationCount: brobotOutput.missingInformation?.length ?? 0,
                  subtype: intent.subintent,
                }
              : null,
        },
      })
      .eq('id', persistedConversationId)
      .eq('user_id', userId);

    if (updateConversationError) {
      logChatStepError({
        requestId,
        category: 'database_error',
        step,
        error: updateConversationError,
        userId,
        conversationId: persistedConversationId,
        messageId: assistantMessageId,
      });
    }

    const ip = getClientIp(request) ?? undefined;
    const userAgent = request.headers.get('user-agent') ?? undefined;

    let usedAfter: number;
    try {
      step = 'record_successful_usage';
      usedAfter = await recordSuccessfulAIUse(subject, latencyMs, {
        ipHash: hashForLogging(ip),
        userAgentHash: hashForLogging(userAgent),
      });
    } catch (error) {
      logChatStepError({
        requestId,
        category: 'usage_error',
        step,
        error,
        userId,
        conversationId: persistedConversationId,
        messageId: assistantMessageId,
      });
      return serverErrorResponse('usage_error', 'BroBot could not record usage.');
    }
    const remainingAfter = limit != null ? Math.max(0, limit - usedAfter) : null;

    await recordChatAnalyticsEvent({
      userId,
      conversationId: persistedConversationId,
      messageId: assistantMessageId,
      eventType: 'brobot_chat_success',
      outcome: 'success',
      latencyMs,
      metadata: {
        mode: body.mode,
        detectedMode: brobotOutput.detectedMode,
        intent_mode: intent.mode,
        intent_subintent: intent.subintent,
        intent_procedure_category: intent.procedureCategory,
        ambiguity_level: intent.ambiguity,
        intent_goal: intent.goal ?? null,
        selectedBranch: body.selectedBranchLabel ?? body.selectedBranchId ?? null,
        classifierConfidence: intent.confidence,
        intentSource,
        qualityGateWarnings: qualityGate.warnings,
        qualityGateWarningsBeforeRevision: pipelineResult.qualityGateWarningsBeforeRevision,
        revisionTriggered: pipelineResult.revisionTriggered,
        revisionModel: pipelineResult.revisionModel,
        metadataModel: pipelineResult.metadataModel,
        answerRoute: pipelineResult.answerRoute,
        consultConfidence: brobotOutput.consultConfidence ?? null,
        missingInformationCount: brobotOutput.missingInformation?.length ?? 0,
        consultSubtype: brobotOutput.detectedMode === 'consult' ? intent.subintent : null,
        responseDepth: body.responseDepth,
        trainingLevel: body.trainingLevel,
        model: pipelineResult.answerModel,
        tokenUsage: pipelineResult.answerUsage ?? null,
        revisionTokenUsage: pipelineResult.revisionUsage ?? null,
        metadataTokenUsage: pipelineResult.metadataUsage ?? null,
        stageTimings: stageTimer.snapshot(),
        kgShadowStatus: kgShadow.trace.status,
        kgRetrievalId: kgShadow.trace.retrievalId,
        ...researchSubmodeMetadata(researchSubmodeRoute),
      },
    });

    if (usedAfter === 1) {
      await recordChatAnalyticsEvent({
        userId,
        conversationId: persistedConversationId,
        messageId: assistantMessageId,
        eventType: 'first_brobot_message',
        outcome: 'success',
        latencyMs,
        metadata: {
          source: 'brobot_chat',
          mode: body.mode,
          detectedMode: brobotOutput.detectedMode,
        },
      });
    }

    logBroBot('[BROBOT-CHAT-GENERATION]', {
      requestId,
      provider: 'openai',
      model: pipelineResult.answerModel,
      revisionModel: pipelineResult.revisionModel,
      metadataModel: pipelineResult.metadataModel,
      success: true,
      detectedMode: brobotOutput.detectedMode,
      confidence: brobotOutput.confidence,
      usedBefore,
      usedAfter,
      remainingAfter,
      qualityGateWarnings: qualityGate.warnings,
      qualityGateWarningsBeforeRevision: pipelineResult.qualityGateWarningsBeforeRevision,
      revisionTriggered: pipelineResult.revisionTriggered,
      answerRoute: pipelineResult.answerRoute,
      intentSource,
    });

    return NextResponse.json({
      conversationId: persistedConversationId,
      messageId: assistantMessageId,
      goal: brobotOutput.goal,
      selectedFocus: brobotOutput.selectedFocus,
      answer: brobotOutput.answer,
      priorityPoints: brobotOutput.priorityPoints,
      knowledgeGaps: brobotOutput.knowledgeGaps,
      whatMostResidentsMiss: brobotOutput.whatMostResidentsMiss,
      suggestedQuestions: brobotOutput.suggestedQuestions,
      nextLearningBranches: brobotOutput.nextLearningBranches,
      tags: brobotOutput.tags,
      detectedMode: brobotOutput.detectedMode,
      remainingFreeUses: remainingAfter,
      confidence: brobotOutput.confidence,
      needsClarification: brobotOutput.needsClarification,
      clarifyingQuestions: brobotOutput.clarifyingQuestions,
      assumedContext: brobotOutput.assumedContext,
      consultConfidence: brobotOutput.consultConfidence,
      missingInformation: brobotOutput.missingInformation,
      researchSubmode: brobotOutput.researchSubmode,
    } satisfies BroBotChatResponse);
  } catch (error) {
    if (subject) {
      await recordUsageEvent({
        subject,
        outcome: 'failure',
        latencyMs: Date.now() - startedAt,
      });
    }

    if (userId) {
      await recordChatAnalyticsEvent({
        userId,
        conversationId,
        messageId: userMessageId,
        eventType: 'brobot_chat_error',
        outcome: 'failure',
        latencyMs: Date.now() - startedAt,
        metadata: {
          model: body
            ? getAnswerModelForRoute({
                mode: body.mode,
                responseDepth: body.responseDepth,
              })
            : undefined,
          errorCode: error instanceof Error ? error.name : 'unknown_error',
        },
      });
    }

    logBroBot('[BROBOT-CHAT-UNEXPECTED]', {
      requestId,
      step,
      userType: subject?.type ?? 'unknown',
      subjectPrefix: subject ? subjectPrefix(subject) : null,
      message: error instanceof Error ? error.message : 'Unknown route error',
    });

    return withGuestCookie(generationFailedResponse(), guestCookieToSet);
  }
}

async function persistCompletedBroBotOutput(params: {
  request: Request;
  requestId: string;
  persistence: BroBotDbClient;
  subject: Subject;
  userId: string;
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  body: BroBotChatRequest;
  intent: BroBotChatIntent;
  intentSource: string;
  answerContext: BroBotAnswerContext;
  answerModel: string;
  revisionModel?: string | null;
  metadataModel?: string | null;
  brobotOutput: ReturnType<typeof parseBroBotChatResponse> & {
    selectedFocus?: string;
    detectedMode: BroBotChatMode;
    nextLearningBranches?: BroBotBranchOption[];
  };
  learningBranches: {
    topic: BranchTopicRow | null;
    branches: RankedBranchOption[];
  };
  history: BroBotModelMessage[];
  latencyMs: number;
  limit: number | null;
  usedBefore: number | null;
  answerUsage?: unknown;
  revisionUsage?: unknown;
  metadataUsage?: unknown;
  qualityGateWarningsBeforeRevision?: string[];
  revisionTriggered?: boolean;
  answerRoute?: BroBotAnswerRoute;
  originalAnswerBeforeRevision?: string | null;
}) {
  const qualityGate = runBroBotQualityGate({
    answer: params.brobotOutput.answer,
    mode: params.intent.mode,
    responseDepth: params.body.responseDepth,
    selectedBranchId: params.body.selectedBranchId,
    selectedBranchLabel: params.body.selectedBranchLabel,
    subintent: params.intent.subintent,
    trainingLevel: params.body.trainingLevel,
    procedureOrTopic: params.intent.procedureOrTopic,
    answerRoute: params.answerRoute,
    clinicalContext: params.answerContext.clinicalContext,
  });

  if (!qualityGate.passed) {
    void recordChatAnalyticsEvent({
      userId: params.userId,
      conversationId: params.conversationId,
      messageId: params.userMessageId,
      eventType: 'quality_gate_failed',
      outcome: 'success',
      latencyMs: params.latencyMs,
      metadata: {
        mode: params.body.mode,
        detectedMode: params.intent.mode,
        intent_subintent: params.intent.subintent,
        intent_procedure_category: params.intent.procedureCategory,
        selectedBranch: params.body.selectedBranchLabel ?? params.body.selectedBranchId ?? null,
        warnings: qualityGate.warnings,
      },
    });
  }

  if (params.brobotOutput.needsClarification && (params.brobotOutput.clarifyingQuestions?.length ?? 0) > 0) {
    await recordChatAnalyticsEvent({
      userId: params.userId,
      conversationId: params.conversationId,
      messageId: params.userMessageId,
      eventType: 'visible_clarification_shown',
      outcome: 'success',
      latencyMs: params.latencyMs,
      metadata: {
        mode: params.body.mode,
        detectedMode: params.brobotOutput.detectedMode,
        intent_subintent: params.intent.subintent,
        intent_procedure_category: params.intent.procedureCategory,
        ambiguity_level: params.intent.ambiguity,
        intent_mode: params.intent.mode,
        intent_goal: params.intent.goal ?? null,
        selectedBranch: params.body.selectedBranchLabel ?? params.body.selectedBranchId ?? null,
        classifierConfidence: params.intent.confidence,
        intentSource: params.intentSource,
        responseDepth: params.body.responseDepth,
        trainingLevel: params.body.trainingLevel,
        clarifyingQuestionCount: params.brobotOutput.clarifyingQuestions?.length ?? 0,
        consultConfidence: params.brobotOutput.consultConfidence ?? null,
        missingInformationCount: params.brobotOutput.missingInformation?.length ?? 0,
        consultSubtype: params.brobotOutput.detectedMode === 'consult' ? params.intent.subintent : null,
        confidence: params.brobotOutput.confidence,
        answerRoute: params.answerRoute ?? null,
      },
    });
  }

  if (params.answerRoute === 'answer_with_assumption') {
    await recordChatAnalyticsEvent({
      userId: params.userId,
      conversationId: params.conversationId,
      messageId: params.userMessageId,
      eventType: 'answer_with_assumption',
      outcome: 'success',
      latencyMs: params.latencyMs,
      metadata: {
        mode: params.body.mode,
        detectedMode: params.brobotOutput.detectedMode,
        assumedContext: params.brobotOutput.assumedContext || params.intent.assumedContext || null,
        intent_subintent: params.intent.subintent,
        intent_procedure_category: params.intent.procedureCategory,
        ambiguity_level: params.intent.ambiguity,
        answerRoute: params.answerRoute,
      },
    });
  }

  if ((params.brobotOutput.nextLearningBranches?.length ?? 0) > 0) {
    await recordChatAnalyticsEvent({
      userId: params.userId,
      conversationId: params.conversationId,
      messageId: params.userMessageId,
      eventType: 'focus_options_shown',
      outcome: 'success',
      latencyMs: params.latencyMs,
      metadata: {
        mode: params.body.mode,
        detectedMode: params.brobotOutput.detectedMode,
        branchCount: params.brobotOutput.nextLearningBranches?.length ?? 0,
        answerRoute: params.answerRoute ?? null,
        intent_subintent: params.intent.subintent,
        intent_procedure_category: params.intent.procedureCategory,
      },
    });
    await recordChatAnalyticsEvent({
      userId: params.userId,
      conversationId: params.conversationId,
      messageId: params.userMessageId,
      eventType: 'branch_impression',
      outcome: 'success',
      latencyMs: params.latencyMs,
      metadata: {
        branchCount: params.brobotOutput.nextLearningBranches?.length ?? 0,
        branchLabels: params.brobotOutput.nextLearningBranches?.map((branch) => branch.label) ?? [],
        answerRoute: params.answerRoute ?? null,
      },
    });
  }

  if (params.revisionTriggered) {
    await recordChatAnalyticsEvent({
      userId: params.userId,
      conversationId: params.conversationId,
      messageId: params.userMessageId,
      eventType: 'quality_revision_triggered',
      outcome: 'success',
      latencyMs: params.latencyMs,
      metadata: {
        mode: params.body.mode,
        detectedMode: params.brobotOutput.detectedMode,
        answerRoute: params.answerRoute ?? null,
        warnings: params.qualityGateWarningsBeforeRevision ?? [],
        revisionModel: params.revisionModel ?? null,
      },
    });
    await recordChatAnalyticsEvent({
      userId: params.userId,
      conversationId: params.conversationId,
      messageId: params.userMessageId,
      eventType: 'quality_revision_reason',
      outcome: 'success',
      latencyMs: params.latencyMs,
      metadata: {
        reasons: params.qualityGateWarningsBeforeRevision ?? [],
        intent_subintent: params.intent.subintent,
        intent_procedure_category: params.intent.procedureCategory,
      },
    });
  }

  const { data: assistantMessage, error: assistantMessageError } = await params.persistence
    .from('brobot_messages')
    .insert({
      id: params.assistantMessageId,
      conversation_id: params.conversationId,
      user_id: params.userId,
      role: 'assistant',
      content: params.brobotOutput.answer,
      structured_json: { ...params.brobotOutput, answerRoute: params.answerRoute ?? null },
      mode: params.brobotOutput.detectedMode,
      response_depth: params.body.responseDepth,
    })
    .select('id')
    .single();

  if (assistantMessageError || !assistantMessage) {
    logChatStepError({
      requestId: params.requestId,
      category: 'database_error',
      step: 'create_streaming_assistant_message',
      error: assistantMessageError ?? new Error('No message returned'),
      userId: params.userId,
      conversationId: params.conversationId,
      messageId: params.userMessageId,
    });
    throw new Error('BroBot could not save this response.');
  }

  void enqueueBroBotEvaluationJob({
    conversationId: params.conversationId,
    messageId: params.assistantMessageId,
    userId: params.userId,
    mode: params.intent.mode,
    procedure: params.intent.procedureOrTopic,
    model: params.answerModel,
    trainingLevel: params.body.trainingLevel,
    responseDepth: params.body.responseDepth,
    intentSnapshot: params.intent,
    contextSnapshot: {
      certifiedContext: params.answerContext.certifiedContext,
      orPrepProcedureMetadata: params.answerContext.orPrepProcedureMetadata,
      oiteLearningMetadata: params.answerContext.oiteLearningMetadata,
      qualityGateWarningsBeforeRevision: params.qualityGateWarningsBeforeRevision ?? [],
      revisionTriggered: params.revisionTriggered ?? false,
      originalAnswerBeforeRevision: params.originalAnswerBeforeRevision ?? null,
      finalAnswer: params.brobotOutput.answer,
    },
  });

  const tagRows = normalizeTags(
    params.brobotOutput.tags,
    params.brobotOutput.detectedMode,
    params.brobotOutput.confidence
  ).map((tag) => ({
    message_id: params.assistantMessageId,
    user_id: params.userId,
    ...tag,
  }));

  if (tagRows.length > 0) {
    const { error: tagError } = await params.persistence.from('brobot_message_tags').insert(tagRows);
    if (tagError) {
      logChatStepError({
        requestId: params.requestId,
        category: 'database_error',
        step: 'create_streaming_tags',
        error: tagError,
        userId: params.userId,
        conversationId: params.conversationId,
        messageId: params.assistantMessageId,
      });
    }
  }

  const branchClick = await recordBranchClickEvent({
    persistence: params.persistence,
    userId: params.userId,
    conversationId: params.conversationId,
    topicId: params.learningBranches.topic?.topic_id ?? null,
    selectedBranchId: params.body.selectedBranchId,
    selectedBranchLabel: params.body.selectedBranchLabel,
    selectedBranchRankPosition: params.body.selectedBranchRankPosition,
    sourceMessageId: params.body.sourceMessageId ?? null,
    mode: params.intent.mode,
    trainingLevel: params.body.trainingLevel,
  });

  await recordBranchOutcome({
    persistence: params.persistence,
    userId: params.userId,
    conversationId: params.conversationId,
    branchEventId: branchClick?.id ?? null,
    branchQuestionId: branchClick?.branchQuestionId ?? params.body.selectedBranchId ?? null,
    mode: params.intent.mode,
    trainingLevel: params.body.trainingLevel,
    history: params.history,
    sourceMessageId: params.body.sourceMessageId ?? null,
    latencyMs: params.latencyMs,
  });

  const { error: updateConversationError } = await params.persistence
    .from('brobot_conversations')
    .update({
      last_mode: params.brobotOutput.detectedMode,
      detected_context: {
        tags: params.brobotOutput.tags,
        confidence: params.brobotOutput.confidence,
        intent: {
          subintent: params.intent.subintent,
          procedureCategory: params.intent.procedureCategory,
          goal: params.intent.goal ?? null,
          procedureOrTopic: params.intent.procedureOrTopic,
          ambiguity: params.intent.ambiguity,
          missingContext: params.intent.missingContext,
          branchOptions: params.intent.branchOptions ?? [],
          selectedBranch: params.body.selectedBranchLabel ?? params.body.selectedBranchId ?? null,
          classifierConfidence: params.intent.confidence,
          intentSource: params.intentSource,
          researchSubmode: params.intent.researchSubmode ?? null,
          qualityGateWarnings: qualityGate.warnings,
          qualityGateWarningsBeforeRevision: params.qualityGateWarningsBeforeRevision ?? [],
          revisionTriggered: params.revisionTriggered ?? false,
        },
        consult: params.brobotOutput.detectedMode === 'consult'
          ? {
              confidence: params.brobotOutput.consultConfidence ?? null,
              missingInformationCount: params.brobotOutput.missingInformation?.length ?? 0,
              subtype: params.intent.subintent,
            }
          : null,
      },
    })
    .eq('id', params.conversationId)
    .eq('user_id', params.userId);

  if (updateConversationError) {
    logChatStepError({
      requestId: params.requestId,
      category: 'database_error',
      step: 'update_streaming_conversation',
      error: updateConversationError,
      userId: params.userId,
      conversationId: params.conversationId,
      messageId: params.assistantMessageId,
    });
  }

  const ip = getClientIp(params.request) ?? undefined;
  const userAgent = params.request.headers.get('user-agent') ?? undefined;
  const usedAfter = await recordSuccessfulAIUse(params.subject, params.latencyMs, {
    ipHash: hashForLogging(ip),
    userAgentHash: hashForLogging(userAgent),
  });
  const remainingAfter = params.limit != null ? Math.max(0, params.limit - usedAfter) : null;

  await recordChatAnalyticsEvent({
    userId: params.userId,
    conversationId: params.conversationId,
    messageId: params.assistantMessageId,
    eventType: 'brobot_chat_success',
    outcome: 'success',
    latencyMs: params.latencyMs,
    metadata: {
      mode: params.body.mode,
      detectedMode: params.brobotOutput.detectedMode,
      intent_mode: params.intent.mode,
      intent_subintent: params.intent.subintent,
      intent_procedure_category: params.intent.procedureCategory,
      ambiguity_level: params.intent.ambiguity,
      intent_goal: params.intent.goal ?? null,
      selectedBranch: params.body.selectedBranchLabel ?? params.body.selectedBranchId ?? null,
      classifierConfidence: params.intent.confidence,
      intentSource: params.intentSource,
      qualityGateWarnings: qualityGate.warnings,
      qualityGateWarningsBeforeRevision: params.qualityGateWarningsBeforeRevision ?? [],
      revisionTriggered: params.revisionTriggered ?? false,
      revisionModel: params.revisionModel ?? null,
      metadataModel: params.metadataModel ?? null,
      consultConfidence: params.brobotOutput.consultConfidence ?? null,
      missingInformationCount: params.brobotOutput.missingInformation?.length ?? 0,
      consultSubtype: params.brobotOutput.detectedMode === 'consult' ? params.intent.subintent : null,
      responseDepth: params.body.responseDepth,
      trainingLevel: params.body.trainingLevel,
      model: params.answerModel,
      tokenUsage: params.answerUsage ?? null,
      revisionTokenUsage: params.revisionUsage ?? null,
      metadataTokenUsage: params.metadataUsage ?? null,
      ...researchSubmodeMetadataForIntent(params.intent),
    },
  });

  if (usedAfter === 1) {
    await recordChatAnalyticsEvent({
      userId: params.userId,
      conversationId: params.conversationId,
      messageId: params.assistantMessageId,
      eventType: 'first_brobot_message',
      outcome: 'success',
      latencyMs: params.latencyMs,
      metadata: {
        source: 'brobot_chat',
        mode: params.body.mode,
        detectedMode: params.brobotOutput.detectedMode,
      },
    });
  }

  logBroBot('[BROBOT-CHAT-GENERATION]', {
    requestId: params.requestId,
    provider: 'openai',
    model: params.answerModel,
    revisionModel: params.revisionModel ?? null,
    metadataModel: params.metadataModel ?? null,
    success: true,
    detectedMode: params.brobotOutput.detectedMode,
    confidence: params.brobotOutput.confidence,
    usedBefore: params.usedBefore,
    usedAfter,
    remainingAfter,
    qualityGateWarningsBeforeRevision: params.qualityGateWarningsBeforeRevision ?? [],
    revisionTriggered: params.revisionTriggered ?? false,
    streaming: true,
  });

  const responsePayload: BroBotChatResponse = {
    conversationId: params.conversationId,
    messageId: params.assistantMessageId,
    goal: params.brobotOutput.goal,
    selectedFocus: params.brobotOutput.selectedFocus,
    answer: params.brobotOutput.answer,
    priorityPoints: params.brobotOutput.priorityPoints,
    knowledgeGaps: params.brobotOutput.knowledgeGaps,
    whatMostResidentsMiss: params.brobotOutput.whatMostResidentsMiss,
    suggestedQuestions: params.brobotOutput.suggestedQuestions,
    nextLearningBranches: params.brobotOutput.nextLearningBranches,
    tags: params.brobotOutput.tags,
    detectedMode: params.brobotOutput.detectedMode,
    remainingFreeUses: remainingAfter,
    confidence: params.brobotOutput.confidence,
    needsClarification: params.brobotOutput.needsClarification,
    clarifyingQuestions: params.brobotOutput.clarifyingQuestions,
    assumedContext: params.brobotOutput.assumedContext,
    consultConfidence: params.brobotOutput.consultConfidence,
    missingInformation: params.brobotOutput.missingInformation,
    researchSubmode: params.brobotOutput.researchSubmode,
  };

  return responsePayload;
}

function createGuestStreamingChatResponse(params: {
  request: Request;
  requestId: string;
  openai: OpenAI;
  persistence: BroBotDbClient;
  subject: Subject;
  body: BroBotChatRequest;
  intent: BroBotChatIntent;
  history: BroBotModelMessage[];
  learningBranches: { topic: BranchTopicRow | null; branches: RankedBranchOption[] };
  databaseBranchOptions: RankedBranchOption[];
  rankingContext: BranchRankingContext;
  startedAt: number;
  limit: number | null;
  usedBefore: number | null;
  guestCookieToSet: string | null;
}) {
  const encoder = new TextEncoder();
  const conversationId = params.body.conversationId ?? crypto.randomUUID();
  const assistantMessageId = crypto.randomUUID();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let streamedAnswer = '';
      const send = (event: StreamEventName, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(encodeStreamEvent(event, data)));
      };
      send('start', { assistantMessageId, conversationId });

      try {
        const pipelineResult = await generateBroBotPipelineResult({
          openai: params.openai,
          persistence: params.persistence,
          body: params.body,
          intent: params.intent,
          history: params.history,
          learningBranches: params.learningBranches,
          databaseBranchOptions: params.databaseBranchOptions,
          rankingContext: params.rankingContext,
          signal: params.request.signal,
          preserveStreamedAnswer: true,
          onAnswerText(answer) {
            if (
              params.request.signal.aborted ||
              answer.length <= streamedAnswer.length ||
              !answer.startsWith(streamedAnswer)
            ) return;
            const delta = answer.slice(streamedAnswer.length);
            streamedAnswer = answer;
            send('delta', { content: delta });
          },
        });
        const usedAfter = await recordSuccessfulAIUse(
          params.subject,
          Date.now() - params.startedAt
        );
        const remainingAfter =
          params.limit != null ? Math.max(0, params.limit - usedAfter) : null;
        const output = pipelineResult.brobotOutput;
        if (streamedAnswer) {
          output.answer = streamedAnswer;
        }
        const responsePayload: BroBotChatResponse = {
          conversationId,
          messageId: assistantMessageId,
          goal: output.goal,
          selectedFocus: output.selectedFocus,
          answer: output.answer,
          priorityPoints: output.priorityPoints,
          knowledgeGaps: output.knowledgeGaps,
          whatMostResidentsMiss: output.whatMostResidentsMiss,
          suggestedQuestions: output.suggestedQuestions,
          nextLearningBranches: withRankPositions(output.nextLearningBranches ?? []),
          tags: output.tags,
          detectedMode: output.detectedMode,
          remainingFreeUses: remainingAfter,
          confidence: output.confidence,
          needsClarification: output.needsClarification,
          clarifyingQuestions: output.clarifyingQuestions,
          assumedContext: output.assumedContext,
          consultConfidence: output.consultConfidence,
          missingInformation: output.missingInformation,
          researchSubmode: output.researchSubmode,
        };
        if (!streamedAnswer) send('delta', { content: responsePayload.answer });
        send('metadata', responsePayload);
        send('done', { assistantMessageId, conversationId });
        if (isDevelopment) {
          console.log('[BROBOT-STREAM]', {
            requestId: params.requestId,
            transport: streamedAnswer ? 'openai_stream' : 'buffered_fallback',
            answerRoute: pipelineResult.answerRoute,
            subject: 'guest',
          });
        }
      } catch {
        if (!params.request.signal.aborted) {
          send('error', {
            message: 'BroBot is having trouble responding. Please try again in a moment.',
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  const headers = new Headers({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  if (params.guestCookieToSet) headers.append('Set-Cookie', params.guestCookieToSet);
  return new Response(stream, { headers });
}

function createStreamingChatResponse(params: {
  request: Request;
  requestId: string;
  openai: OpenAI;
  persistence: BroBotDbClient;
  subject: Subject;
  userId: string;
  conversationId: string;
  userMessageId: string;
  body: BroBotChatRequest;
  intent: BroBotChatIntent;
  intentSource: string;
  answerContext: BroBotAnswerContext;
  history: BroBotModelMessage[];
  learningBranches: {
    topic: BranchTopicRow | null;
    branches: RankedBranchOption[];
  };
  databaseBranchOptions: RankedBranchOption[];
  rankingContext: BranchRankingContext;
  startedAt: number;
  limit: number | null;
  usedBefore: number | null;
}) {
  const encoder = new TextEncoder();
  const assistantMessageId = crypto.randomUUID();

  const chunkAnswer = (answer: string) => {
    if (!answer) return [];
    const chunks: string[] = [];
    let current = '';
    for (const token of answer.split(/(\s+)/)) {
      current += token;
      if (current.length >= 120) {
        chunks.push(current);
        current = '';
      }
    }
    if (current) chunks.push(current);
    return chunks;
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let streamedAnswer = '';
      const send = (event: StreamEventName, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(encodeStreamEvent(event, data)));
      };

      send('start', {
        assistantMessageId,
        conversationId: params.conversationId,
      });

      try {
        const pipelineResult = await generateBroBotPipelineResult({
          openai: params.openai,
          persistence: params.persistence,
          body: params.body,
          intent: params.intent,
          answerContext: params.answerContext,
          history: params.history,
          learningBranches: params.learningBranches,
          databaseBranchOptions: params.databaseBranchOptions,
          rankingContext: params.rankingContext,
          signal: params.request.signal,
          preserveStreamedAnswer: true,
          onAnswerText(answer) {
            if (
              params.request.signal.aborted ||
              answer.length <= streamedAnswer.length ||
              !answer.startsWith(streamedAnswer)
            ) return;
            const delta = answer.slice(streamedAnswer.length);
            streamedAnswer = answer;
            send('delta', { content: delta });
          },
        });
        if (streamedAnswer) {
          pipelineResult.brobotOutput.answer = streamedAnswer;
        }
        const latencyMs = Date.now() - params.startedAt;
        const responsePayload = await persistCompletedBroBotOutput({
          request: params.request,
          requestId: params.requestId,
          persistence: params.persistence,
          subject: params.subject,
          userId: params.userId,
          conversationId: params.conversationId,
          userMessageId: params.userMessageId,
          assistantMessageId,
          body: params.body,
          intent: params.intent,
          intentSource: params.intentSource,
          answerContext: params.answerContext,
          answerModel: pipelineResult.answerModel,
          revisionModel: pipelineResult.revisionModel,
          metadataModel: pipelineResult.metadataModel,
          brobotOutput: pipelineResult.brobotOutput,
          learningBranches: params.learningBranches,
          history: params.history,
          latencyMs,
          limit: params.limit,
          usedBefore: params.usedBefore,
          answerUsage: pipelineResult.answerUsage,
          revisionUsage: pipelineResult.revisionUsage,
          metadataUsage: pipelineResult.metadataUsage,
          qualityGateWarningsBeforeRevision: pipelineResult.qualityGateWarningsBeforeRevision,
          revisionTriggered: pipelineResult.revisionTriggered,
          answerRoute: pipelineResult.answerRoute,
          originalAnswerBeforeRevision: pipelineResult.originalAnswerBeforeRevision,
        });

        // If the provider did not yield usable answer-field deltas, preserve a
        // graceful buffered fallback instead of leaving an empty bubble.
        if (!streamedAnswer) {
          for (const chunk of chunkAnswer(responsePayload.answer)) {
            send('delta', { content: chunk });
          }
        }
        send('metadata', responsePayload);
        send('done', {
          assistantMessageId,
          conversationId: params.conversationId,
        });
        if (isDevelopment) {
          console.log('[BROBOT-STREAM]', {
            requestId: params.requestId,
            transport: streamedAnswer ? 'openai_stream' : 'buffered_fallback',
            answerRoute: pipelineResult.answerRoute,
          });
        }
      } catch (error) {
        if (params.request.signal.aborted) return;
        logChatStepError({
          requestId: params.requestId,
          category: 'openai_error',
          step: 'streaming_completion',
          error,
          userId: params.userId,
          conversationId: params.conversationId,
          messageId: params.userMessageId,
        });

        void recordChatAnalyticsEvent({
          userId: params.userId,
          conversationId: params.conversationId,
          messageId: params.userMessageId,
          eventType: 'brobot_chat_error',
          outcome: 'failure',
          latencyMs: Date.now() - params.startedAt,
          metadata: {
            mode: params.body.mode,
            responseDepth: params.body.responseDepth,
            trainingLevel: params.body.trainingLevel,
            model: getAnswerModelForRoute({
              mode: params.intent.mode,
              ambiguity: params.intent.ambiguity,
              responseDepth: params.body.responseDepth,
              subintent: params.intent.subintent,
            }),
            errorCode: error instanceof Error ? error.name : 'streaming_error',
          },
        });

        send('error', {
          message: 'BroBot is having trouble responding. Please try again in a moment.',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
