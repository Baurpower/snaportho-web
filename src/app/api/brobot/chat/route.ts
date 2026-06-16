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
  buildBroBotAnswerContext,
  buildBroBotIntentExpansionMessages,
  fallbackBroBotIntentExpansion,
  getBranchOptionsForCategory,
  parseBroBotIntentExpansionResponse,
  parseBroBotChatResponse,
  runBroBotQualityGate,
  type BroBotChatIntent,
  type BroBotChatMode,
  type BroBotChatRequest,
  type BroBotModelMessage,
} from '@/lib/brobot/chat';
import {
  getRemainingAIUses,
  getMobileBroBotEntitlement,
  type Subject,
} from '@/lib/brobot/entitlements';
import { recordSuccessfulAIUse, recordUsageEvent } from '@/lib/brobot/usage';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/utils/supabase/server';

const BROBOT_CHAT_MODEL = process.env.BROBOT_CHAT_MODEL || 'gpt-4o-mini';

let openaiClient: OpenAI | null = null;

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
};

type AuthContext = {
  user: { id: string } | null;
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
};
type BroBotDbClient = AuthContext['supabase'] | ReturnType<typeof createAdminClient>;

type ChatAnalyticsEvent =
  | 'brobot_chat_request'
  | 'brobot_chat_success'
  | 'brobot_chat_error'
  | 'brobot_chat_suggested_question_click'
  | 'brobot_chat_clarification_suggested'
  | 'branch_selected'
  | 'branch_skipped'
  | 'answer_now_clicked'
  | 'clarification_selected'
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

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: 'not_authenticated',
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
      message: 'Daily limit reached.',
      isLimitReached: true,
      remaining: 0,
      dailyCap,
    },
    { status: 429 }
  );
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
    return { user: null, supabase };
  }

  return { user: user ? { id: user.id } : null, supabase };
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
    confidence: body.intentSource === 'local' ? 0.82 : body.intentSource === 'llm' ? 0.75 : 0.55,
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

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  let subject: Subject | null = null;
  let userId: string | null = null;
  let conversationId: string | null = null;
  let userMessageId: string | null = null;
  let step = 'parse_request';

  try {
    const raw = await request.json().catch(() => null);
    const parsed = BroBotChatRequestSchema.safeParse(raw);

    if (!parsed.success) {
      logBroBot('[BROBOT-CHAT-VALIDATION]', {
        requestId,
        success: false,
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          code: issue.code,
        })),
      });
      return invalidRequestResponse();
    }

    const body = parsed.data;
    step = 'auth';
    const auth = await getAuthContext(request);

    if (!auth.user) {
      return unauthorizedResponse();
    }

    userId = auth.user.id;
    subject = { type: 'user', id: userId };
    const persistence = createAdminClient();

    step = 'mobile_entitlement';
    const mobileEntitlement = await getMobileBroBotEntitlement(userId);
    if (!mobileEntitlement.hasBroBotAccess) {
      return limitReachedResponse(mobileEntitlement.dailyLimit);
    }

    step = 'quota_check';
    const entitlement = await getRemainingAIUses(subject);
    const limit = entitlement.aiAccess.dailyCap;
    const remainingBefore = entitlement.aiAccess.remainingToday;
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
      allowed: !entitlement.isLimitReached,
    });

    if (entitlement.isLimitReached) {
      await recordUsageEvent({
        subject,
        outcome: 'limit_hit',
        latencyMs: Date.now() - startedAt,
      });
      return limitReachedResponse(limit);
    }

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
        model: BROBOT_CHAT_MODEL,
      },
    });

    if (
      body.source === 'suggested_question' ||
      body.source === 'clarification_question' ||
      body.source === 'branch_selection' ||
      body.source === 'answer_now'
    ) {
      await recordChatAnalyticsEvent({
        userId,
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
          questionLength: body.message.length,
          questionHash: hashForLogging(body.message),
          sourceMessageIdPresent: Boolean(body.sourceMessageId),
        },
      });
    }

    step = 'create_user_message';
    const { data: createdUserMessage, error: userMessageError } = await persistence
      .from('brobot_messages')
      .insert({
        conversation_id: persistedConversationId,
        user_id: userId,
        role: 'user',
        content: body.message,
        structured_json: null,
        mode: body.mode,
        response_depth: body.responseDepth,
      })
      .select('id')
      .single();

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
    const history = await loadConversationHistory({
      supabase: persistence,
      conversationId: persistedConversationId,
      userId,
    });

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

    const acceptedIntent = buildAcceptedIntent(body);
    let intent: BroBotChatIntent = acceptedIntent ?? fallbackBroBotIntentExpansion(body.message, body.mode);
    const intentSource = body.intentSource ?? (acceptedIntent ? 'local' : 'fallback');

    if (!acceptedIntent) {
      try {
        step = 'expand_intent';
        const intentCompletion = await openai.chat.completions.create({
          model: BROBOT_CHAT_MODEL,
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

    const selectedBranch =
      body.selectedBranchId || body.selectedBranchLabel
        ? {
            id: body.selectedBranchId,
            label: body.selectedBranchLabel,
          }
        : undefined;
    const answerContext = await buildBroBotAnswerContext({
      intent,
      selectedBranch,
      responseDepth: body.responseDepth,
      trainingLevel: body.trainingLevel,
      history,
    });
    const modelMessages = buildBroBotChatMessages({
      message: body.message,
      messages: history,
      mode: intent.mode,
      responseDepth: body.responseDepth,
      trainingLevel: body.trainingLevel,
      intent,
      selectedBranch,
      answerContext,
      answerNow: Boolean(body.answerNow),
    });

    let completion: Awaited<ReturnType<OpenAI['chat']['completions']['create']>>;
    try {
      step = 'openai_completion';
      completion = await openai.chat.completions.create({
        model: BROBOT_CHAT_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: modelMessages,
      });
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
          model: BROBOT_CHAT_MODEL,
          errorCode: 'openai_error',
        },
      });
      return serverErrorResponse('openai_error');
    }

    const latencyMs = Date.now() - startedAt;
    const rawContent = completion.choices[0]?.message?.content ?? '';
    step = 'parse_openai_response';
    const parsedOutput = parseBroBotChatResponse(rawContent, {
      fallbackMode: intent.mode,
      fallbackAnswer: 'BroBot could not format a structured response. Please try again.',
    });
    const classifierNeedsClarification = intent.ambiguity !== 'low';
    const clarifyingQuestions = mergeQuestions(
      parsedOutput.clarifyingQuestions?.length
        ? parsedOutput.clarifyingQuestions
        : intent.clarifyingQuestions,
      []
    ).slice(0, 3);
    const brobotOutput = {
      ...parsedOutput,
      selectedFocus:
        body.selectedBranchLabel ||
        body.selectedBranchId ||
        (body.answerNow ? 'General framework' : undefined),
      detectedMode: intent.mode,
      needsClarification:
        parsedOutput.needsClarification ||
        classifierNeedsClarification ||
        clarifyingQuestions.length > 0,
      clarifyingQuestions,
      assumedContext: parsedOutput.assumedContext || intent.assumedContext,
      suggestedQuestions: mergeQuestions(clarifyingQuestions, parsedOutput.suggestedQuestions),
    };
    const qualityGate = runBroBotQualityGate({
      answer: brobotOutput.answer,
      mode: intent.mode,
      responseDepth: body.responseDepth,
      selectedBranchId: body.selectedBranchId,
      selectedBranchLabel: body.selectedBranchLabel,
      subintent: intent.subintent,
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
        },
      });
    }

    if (brobotOutput.needsClarification) {
      await recordChatAnalyticsEvent({
        userId,
        conversationId: persistedConversationId,
        messageId: userMessageId,
        eventType: 'brobot_chat_clarification_suggested',
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
        },
      });
    }

    step = 'create_assistant_message';
    const { data: assistantMessage, error: assistantMessageError } = await persistence
      .from('brobot_messages')
      .insert({
        conversation_id: persistedConversationId,
        user_id: userId,
        role: 'assistant',
        content: brobotOutput.answer,
        structured_json: brobotOutput,
        mode: brobotOutput.detectedMode,
        response_depth: body.responseDepth,
      })
      .select('id')
      .single();

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
          model: BROBOT_CHAT_MODEL,
          errorCode: 'assistant_message_persistence_failed',
        },
      });
      return serverErrorResponse('database_error', 'BroBot could not save this response.');
    }

    const assistantMessageId = assistantMessage.id;
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
            qualityGateWarnings: qualityGate.warnings,
          },
          consult: brobotOutput.detectedMode === 'consult'
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
        consultConfidence: brobotOutput.consultConfidence ?? null,
        missingInformationCount: brobotOutput.missingInformation?.length ?? 0,
        consultSubtype: brobotOutput.detectedMode === 'consult' ? intent.subintent : null,
        responseDepth: body.responseDepth,
        trainingLevel: body.trainingLevel,
        model: BROBOT_CHAT_MODEL,
        tokenUsage: completion.usage ?? null,
      },
    });

    logBroBot('[BROBOT-CHAT-GENERATION]', {
      requestId,
      provider: 'openai',
      model: BROBOT_CHAT_MODEL,
      success: true,
      detectedMode: brobotOutput.detectedMode,
      confidence: brobotOutput.confidence,
      usedBefore,
      usedAfter,
      remainingAfter,
    });

    const responsePayload: BroBotChatResponse = {
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
    };

    return NextResponse.json(responsePayload);
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
          model: BROBOT_CHAT_MODEL,
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

    return generationFailedResponse();
  }
}
