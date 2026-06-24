/**
 * BroBot Guided Reasoning Intent Endpoint (Phase 2)
 *
 * First-pass expansion only: detects learner goal and branch options before final answer generation.
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import {
  BroBotChatRequestSchema,
  buildBroBotIntentExpansionMessages,
  fallbackBroBotIntentExpansion,
  parseBroBotIntentExpansionResponse,
  preRouteBroBotIntent,
  type BroBotIntentSource,
} from '@/lib/brobot/chat';
import { getRemainingAIUses, type Subject } from '@/lib/brobot/entitlements';
import {
  createGuestSession,
  getGuestSessionFromRequest,
  getGuestIdFromHeader,
  createGuestSessionFromId,
} from '@/lib/brobot/guest-session';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/utils/supabase/server';

const BROBOT_CHAT_MODEL = process.env.BROBOT_CHAT_MODEL || 'gpt-4o-mini';

let openaiClient: OpenAI | null = null;

function withGuestCookie(response: NextResponse, guestCookieToSet: string | null) {
  if (guestCookieToSet) response.headers.append('Set-Cookie', guestCookieToSet);
  return response;
}

function disabledResponse() {
  return NextResponse.json(
    {
      error: 'disabled',
      reason: 'disabled',
      message: 'BroBot access is currently unavailable.',
    },
    { status: 403 }
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

function normalizePromptPayload(raw: unknown) {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const prompt =
    (typeof record.prompt === 'string' ? record.prompt.trim() : '') ||
    (typeof record.message === 'string' ? record.message.trim() : '') ||
    (typeof record.question === 'string' ? record.question.trim() : '');

  if (process.env.NODE_ENV !== 'production') {
    console.log('[brobot] intent prompt payload', {
      keys: Object.keys(record),
      mode: typeof record.mode === 'string' ? record.mode : undefined,
      promptLength: prompt.length,
    });
  }

  return {
    prompt,
    normalized: {
      ...record,
      message: prompt,
    },
  };
}

type AuthContext = {
  user: { id: string } | null;
  hasBearerToken: boolean;
};

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  if (!openaiClient) openaiClient = new OpenAI({ apiKey });
  return openaiClient;
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
          global: { headers: { Authorization: `Bearer ${bearerToken}` } },
          auth: { autoRefreshToken: false, persistSession: false },
        }
      )
    : await createServerSupabaseClient();

  const {
    data: { user },
  } = bearerToken ? await supabase.auth.getUser(bearerToken) : await supabase.auth.getUser();

  return { user: user ? { id: user.id } : null, hasBearerToken: Boolean(bearerToken) };
}

async function recordIntentEvent(params: {
  userId: string;
  eventType: string;
  metadata: Record<string, unknown>;
}) {
  try {
    await createAdminClient().from('brobot_usage_events').insert({
      user_id: params.userId,
      guest_id: null,
      feature: 'brobot',
      outcome: 'success',
      event_type: params.eventType,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error('[brobot] recordIntentEvent failed (non-fatal)', error);
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const raw = await request.json().catch(() => null);
  const normalizedPayload = normalizePromptPayload(raw);
  if (!normalizedPayload.prompt) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Please enter a BroBot question.' },
      { status: 400 }
    );
  }
  const parsed = BroBotChatRequestSchema.pick({
    message: true,
    mode: true,
    responseDepth: true,
    trainingLevel: true,
  }).safeParse(normalizedPayload.normalized);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Please enter a BroBot question.' },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const auth = await getAuthContext(request);
  let subject: Subject;
  let guestCookieToSet: string | null = null;

  if (auth.user) {
    subject = { type: 'user', id: auth.user.id };
  } else if (auth.hasBearerToken) {
    return NextResponse.json(
      {
        error: 'not_authenticated',
        reason: 'not_authenticated',
        message: 'Please sign in to use BroBot chat.',
      },
      { status: 401 }
    );
  } else {
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
  }

  const entitlement = await getRemainingAIUses(subject);
  if (entitlement.source === 'disabled') {
    return withGuestCookie(disabledResponse(), guestCookieToSet);
  }
  if (entitlement.isLimitReached) {
    return withGuestCookie(limitReachedResponse(entitlement.aiAccess.dailyCap), guestCookieToSet);
  }

  let intent = fallbackBroBotIntentExpansion(body.message, body.mode);
  let intentSource: BroBotIntentSource = 'fallback';
  const localIntent = preRouteBroBotIntent({
    message: body.message,
    selectedMode: body.mode,
  });
  intent = localIntent;
  intentSource = localIntent.source;

  if (localIntent.confidence < 0.55 || localIntent.source === 'fallback') {
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: BROBOT_CHAT_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: buildBroBotIntentExpansionMessages({
          message: body.message,
          selectedMode: body.mode,
          responseDepth: body.responseDepth,
          trainingLevel: body.trainingLevel,
        }),
      });

      intent = parseBroBotIntentExpansionResponse(
        completion.choices[0]?.message?.content ?? '',
        { message: body.message, selectedMode: body.mode }
      );
      intentSource = 'llm';
    } catch (error) {
      console.error('[BROBOT-INTENT-ERROR]', {
        requestId,
        message: error instanceof Error ? error.message : 'Unknown intent expansion error',
      });
    }
  }

  if (auth.user) void recordIntentEvent({
    userId: auth.user.id,
    eventType: 'brobot_intent_expanded',
    metadata: {
      mode: body.mode,
      intent_mode: intent.mode,
      intent_subintent: intent.subintent,
      intent_procedure_category: intent.procedureCategory,
      ambiguity_level: intent.ambiguity,
      answerImmediately: Boolean(intent.answerImmediately),
      requiresBranchSelection: Boolean(intent.requiresBranchSelection),
      branchCount: intent.branchOptions?.length ?? 0,
      model: BROBOT_CHAT_MODEL,
      source: intentSource,
      latencyMs: Date.now() - startedAt,
    },
  });

  return withGuestCookie(NextResponse.json({
    mode: intent.mode,
    subintent: intent.subintent,
    procedureCategory: intent.procedureCategory,
    procedureOrTopic: intent.procedureOrTopic,
    source: intentSource,
    goal: intent.goal ?? '',
    ambiguity: intent.ambiguity,
    confidence: intent.confidence,
    missingContext: intent.missingContext,
    branchOptions: intent.branchOptions ?? [],
    answerImmediately: Boolean(intent.answerImmediately),
    requiresBranchSelection: Boolean(intent.requiresBranchSelection),
    reasonForBranching: intent.reasonForBranching ?? '',
  }), guestCookieToSet);
}
