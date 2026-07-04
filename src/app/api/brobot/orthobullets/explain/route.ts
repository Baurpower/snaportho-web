import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

import { getOpenAI } from '@/lib/brobot/openai-client';
import { getRemainingAIUses, type Subject } from '@/lib/brobot/entitlements';
import { recordSuccessfulAIUse, recordUsageEvent } from '@/lib/brobot/usage';
import { authenticateDeviceLinkedRequest } from '@/lib/brobot/device-link';
import { buildOrthobulletsExplainMessages } from '@/lib/brobot/orthobullets/prompt-builder';
import { OrthobulletsParseError, parseOrthobulletsExplainResponse } from '@/lib/brobot/orthobullets/response-parser';
import { resolveOrthobulletsContext } from '@/lib/brobot/orthobullets/context-resolver';
import { lookupOrthobulletsKgContext } from '@/lib/brobot/orthobullets/kg-lookup';
import { OrthobulletsExplainRequestSchema } from '@/lib/brobot/orthobullets/types';
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
  const parsed = OrthobulletsExplainRequestSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Invalid Orthobullets explain request.' },
      { status: 400 }
    );
  }

  const subject: Subject = { type: 'user', id: auth.userId };
  const entitlement = await getRemainingAIUses(subject);

  if (entitlement.source === 'disabled') {
    return disabledResponse();
  }

  if (entitlement.isLimitReached) {
    await recordUsageEvent({
      subject,
      outcome: 'limit_hit',
    });
    return limitReachedResponse(entitlement.aiAccess.dailyCap);
  }

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const kgLookup = parsed.data.pageContext.provider === 'orthobullets'
    ? await lookupOrthobulletsKgContext({
        questionId: parsed.data.pageContext.questionId,
      })
    : null;
  const resolvedContext = resolveOrthobulletsContext({
    pageContext: parsed.data.pageContext,
    kgLookup,
  });

  console.log('[brobot-orthobullets] explain_request', {
    requestId,
    userIdPrefix: auth.userId.slice(0, 8),
    provider: resolvedContext.pageContext.provider,
    questionId: resolvedContext.pageContext.questionId ?? null,
    stemHash: hashText(resolvedContext.pageContext.stem),
    explanationHash: hashText(resolvedContext.pageContext.explanationText ?? resolvedContext.pageContext.explanation),
    answerChoiceCount: resolvedContext.pageContext.answerChoices.length,
    warningCount: resolvedContext.warnings.length,
    kgMatched: Boolean(kgLookup?.matchedQuestionId),
  });

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: getAnswerModelForRoute({
        mode: 'oite',
        ambiguity: 'low',
        responseDepth: 'standard',
        subintent: 'oite_traps',
      }),
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: buildOrthobulletsExplainMessages(resolvedContext),
    });

    const latencyMs = Date.now() - startedAt;
    const usedAfter = await recordSuccessfulAIUse(subject, latencyMs);
    const remainingToday =
      entitlement.aiAccess.dailyCap != null
        ? Math.max(0, entitlement.aiAccess.dailyCap - usedAfter)
        : null;

    const response = parseOrthobulletsExplainResponse({
      raw: completion.choices[0]?.message?.content ?? '',
      explanationId: crypto.randomUUID(),
      remainingToday,
      dailyCap: entitlement.aiAccess.dailyCap,
      unlimited: entitlement.aiAccess.unlimited,
    });

    console.log('[brobot-orthobullets] explain_success', {
      requestId,
      userIdPrefix: auth.userId.slice(0, 8),
      questionId: resolvedContext.pageContext.questionId ?? null,
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

    console.error('[brobot-orthobullets] explain_failure', {
      requestId,
      userIdPrefix: auth.userId.slice(0, 8),
      questionId: resolvedContext.pageContext.questionId ?? null,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof OrthobulletsParseError) {
      return NextResponse.json(
        { error: 'parse_failure', message: "BroBot's response could not be parsed. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'api_failure', message: 'BroBot could not generate an explanation.' },
      { status: 500 }
    );
  }
}
