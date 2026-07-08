import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

import { getOpenAI } from '@/lib/brobot/openai-client';
import { getBroBotAccessGate } from '@/lib/brobot/brobot-entitlement-access';
import { type Subject } from '@/lib/brobot/entitlements';
import { recordSuccessfulAIUse, recordUsageEvent } from '@/lib/brobot/usage';
import { authenticateDeviceLinkedRequest } from '@/lib/brobot/device-link';
import { buildTopicTutorMessages } from '@/lib/brobot/orthobullets/topic-tutor-prompt-builder';
import {
  TopicTutorParseError,
  parseTopicTutorResponse,
} from '@/lib/brobot/orthobullets/topic-tutor-response-parser';
import { resolveOrthobulletsContext } from '@/lib/brobot/orthobullets/context-resolver';
import { OrthobulletsTopicTutorRequestSchema } from '@/lib/brobot/orthobullets/topic-tutor-types';
import { getAnswerModelForRoute } from '@/lib/brobot/model-config';
import { BROBOT_CONFIG } from '@/lib/config/brobot';

const EXTENSION_TOKEN_HEADER = 'x-snaportho-extension-token';

function hashText(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 16);
}

function disabledResponse() {
  return NextResponse.json(
    {
      error: 'disabled',
      message: 'BroBot Orthobullets explanations are currently unavailable.',
    },
    { status: 403 }
  );
}

function limitReachedResponse(dailyCap: number | null) {
  return NextResponse.json(
    {
      error: 'quota_exceeded',
      message: 'Daily BroBot limit reached.',
      dailyCap,
    },
    { status: 429 }
  );
}

export async function POST(request: Request) {
  if (!BROBOT_CONFIG.ENABLED || !BROBOT_CONFIG.ORTHOBULLETS_ENABLED) {
    return disabledResponse();
  }

  const auth = await authenticateDeviceLinkedRequest(request, {
    deviceTokenHeader: EXTENSION_TOKEN_HEADER,
    allowBearerToken: false,
    allowBrowserSession: false,
  });

  if ('response' in auth) {
    return auth.response;
  }

  const parsedBody = await request.json().catch(() => null);
  const parsed = OrthobulletsTopicTutorRequestSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Invalid Orthobullets topic tutor request.' },
      { status: 400 }
    );
  }

  const subject: Subject = { type: 'user', id: auth.userId };
  const gate = await getBroBotAccessGate(subject);
  const entitlement = gate.normalized.data;

  if (gate.source === 'disabled') {
    return disabledResponse();
  }

  if (gate.isLimitReached) {
    await recordUsageEvent({
      subject,
      outcome: 'limit_hit',
    });
    return limitReachedResponse(gate.dailyCap);
  }

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const resolvedContext = resolveOrthobulletsContext({
    pageContext: parsed.data.pageContext,
    kgLookup: null,
  });

  console.log('[brobot-orthobullets] topic_tutor_request', {
    requestId,
    userIdPrefix: auth.userId.slice(0, 8),
    topicId: resolvedContext.pageContext.topicId ?? null,
    titleHash: hashText(resolvedContext.pageContext.title),
    action: parsed.data.action ?? null,
    historyTurnCount: parsed.data.history.length,
    userMessageHash: hashText(parsed.data.userMessage),
  });

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: getAnswerModelForRoute({
        mode: 'oite',
        ambiguity: 'low',
        responseDepth: 'standard',
        subintent: 'oite_traps',
      }),
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: buildTopicTutorMessages({
        context: resolvedContext,
        action: parsed.data.action,
        progress: parsed.data.progress,
        history: parsed.data.history,
        userMessage: parsed.data.userMessage,
      }),
    });

    const latencyMs = Date.now() - startedAt;
    const usedAfter = await recordSuccessfulAIUse(subject, latencyMs);
    const remainingToday =
      entitlement.aiAccess.dailyCap != null
        ? Math.max(0, entitlement.aiAccess.dailyCap - usedAfter)
        : null;

    const response = parseTopicTutorResponse({
      raw: completion.choices[0]?.message?.content ?? '',
      responseId: crypto.randomUUID(),
      remainingToday,
      dailyCap: entitlement.aiAccess.dailyCap,
      unlimited: entitlement.aiAccess.unlimited,
    });

    console.log('[brobot-orthobullets] topic_tutor_success', {
      requestId,
      userIdPrefix: auth.userId.slice(0, 8),
      topicId: resolvedContext.pageContext.topicId ?? null,
      latencyMs,
      remainingToday,
    });

    return NextResponse.json(response);
  } catch (error) {
    await recordUsageEvent({
      subject,
      outcome: 'failure',
      latencyMs: Date.now() - startedAt,
    });

    console.error('[brobot-orthobullets] topic_tutor_failure', {
      requestId,
      userIdPrefix: auth.userId.slice(0, 8),
      topicId: resolvedContext.pageContext.topicId ?? null,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof TopicTutorParseError) {
      return NextResponse.json(
        { error: 'parse_failure', message: "BroBot's response could not be parsed. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'api_failure', message: 'BroBot could not generate a tutoring response.' },
      { status: 500 }
    );
  }
}
