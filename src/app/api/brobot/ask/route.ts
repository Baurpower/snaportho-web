/**
 * BroBot Secure AI Proxy (Phase 1)
 *
 * THIS IS THE ONLY ROUTE ALLOWED TO CALL THE EXTERNAL CASEPREP /case-prep ENDPOINT.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCasePrepInternalBaseUrl } from '@/lib/config/brobot';
import { createGuestSession, getGuestSessionFromRequest } from '@/lib/brobot/guest-session';
import {
  getRemainingAIUses,
  getMobileBroBotEntitlement,
  type Subject,
} from '@/lib/brobot/entitlements';
import { recordSuccessfulAIUse, recordUsageEvent } from '@/lib/brobot/usage';
import { createClient } from '@/utils/supabase/server';
import type { BroBotPayload } from '@/types/caseprep';

const AskRequestSchema = z.object({
  prompt: z.string().trim().min(1),
});

export type BroBotAskResponse = BroBotPayload & {
  meta?: {
    remaining?: number | null;
    isLimitReached?: boolean;
  };
};

type AskRequestBody = {
  prompt?: unknown;
  caseDescription?: unknown;
  query?: unknown;
  message?: unknown;
  text?: unknown;
  case?: unknown;
};

function logBroBot(event: string, payload: Record<string, unknown>) {
  console.log(event, payload);
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

function invalidRequestResponse() {
  return NextResponse.json(
    {
      error: 'invalid_request',
      message: 'Please enter a case description.',
    },
    { status: 400 }
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

function generationFailedResponse() {
  return NextResponse.json(
    {
      error: 'brobot_generation_failed',
      message: 'BroBot is having trouble responding. Please try again in a moment.',
    },
    { status: 500 }
  );
}

function normalizePrompt(input: unknown): string | null {
  if (!input || typeof input !== 'object') return null;

  const body = input as AskRequestBody;
  const candidate =
    body.prompt ??
    body.caseDescription ??
    body.query ??
    body.message ??
    body.text ??
    body.case;

  if (typeof candidate !== 'string') return null;

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function getOptionalUser(request: Request) {
  try {
    const supabase = await createClient();
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.replace(/^Bearer\s+/i, '').trim()
      : null;

    const {
      data: { user },
      error: authError,
    } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();

    if (authError) {
      logBroBot('[BROBOT-ASK-AUTH]', {
        hasBearerToken: Boolean(bearerToken),
        success: false,
        message: authError.message,
      });
      return null;
    }

    return user ?? null;
  } catch (error) {
    logBroBot('[BROBOT-ASK-AUTH]', {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown auth error',
    });
    return null;
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  let subject: Subject | null = null;
  let guestCookieToSet: string | null = null;

  try {
    const raw = await request.json().catch(() => null);
    const bodyKeys = raw && typeof raw === 'object' ? Object.keys(raw as Record<string, unknown>) : [];
    const normalizedPrompt = normalizePrompt(raw);
    const promptLength = normalizedPrompt?.length ?? 0;

    if (!normalizedPrompt) {
      logBroBot('[BROBOT-ASK-START]', {
        requestId,
        hasAuth: false,
        userType: 'guest',
        bodyKeys,
        promptLength,
        hasPrompt: false,
      });
      return invalidRequestResponse();
    }

    const parsed = AskRequestSchema.safeParse({ prompt: normalizedPrompt });
    if (!parsed.success) {
      return invalidRequestResponse();
    }

    const { prompt } = parsed.data;
    const user = await getOptionalUser(request);

    if (user) {
      const mobileEntitlement = await getMobileBroBotEntitlement(user.id);
      subject = { type: 'user', id: user.id };

      if (!mobileEntitlement.hasBroBotAccess) {
        if (mobileEntitlement.reasonIfBlocked === 'disabled' || mobileEntitlement.source === 'disabled') {
          return disabledResponse();
        }
        const response = limitReachedResponse(mobileEntitlement.dailyLimit);
        return response;
      }
    } else {
      let guestSession = getGuestSessionFromRequest(request);

      if (!guestSession) {
        const createdGuest = createGuestSession();
        guestSession = createdGuest.session;
        guestCookieToSet = createdGuest.cookie;
      }

      subject = { type: 'guest', id: guestSession.guestId };
    }

    logBroBot('[BROBOT-ASK-START]', {
      requestId,
      hasAuth: Boolean(user),
      userType: user ? 'member' : 'guest',
      bodyKeys,
      promptLength: prompt.length,
      hasPrompt: true,
    });

    const entitlement = await getRemainingAIUses(subject);
    const limit = entitlement.aiAccess.dailyCap;
    const remainingBefore = entitlement.aiAccess.remainingToday;
    const usedBefore =
      limit != null && remainingBefore != null ? Math.max(0, limit - remainingBefore) : null;
    const allowed = !entitlement.isLimitReached;

    logBroBot('[BROBOT-QUOTA-CHECK]', {
      requestId,
      userType: subject.type,
      subjectPrefix: subjectPrefix(subject),
      usedBefore,
      limit,
      remainingBefore,
      allowed,
      reason: allowed ? null : 'daily_limit_reached',
    });

    if (!allowed) {
      if (entitlement.source === 'disabled') {
        const response = disabledResponse();
        if (guestCookieToSet) {
          response.headers.append('Set-Cookie', guestCookieToSet);
        }
        return response;
      }

      await recordUsageEvent({
        subject,
        outcome: 'limit_hit',
        latencyMs: Date.now() - startedAt,
      });

      const response = limitReachedResponse(limit);
      if (guestCookieToSet) {
        response.headers.append('Set-Cookie', guestCookieToSet);
      }
      return response;
    }

    let baseUrl: string;
    try {
      baseUrl = getCasePrepInternalBaseUrl();
    } catch (error) {
      logBroBot('[BROBOT-ASK-GENERATION]', {
        requestId,
        provider: 'caseprep_proxy',
        model: null,
        hasApiKey: Boolean(process.env.OPENAI_API_KEY),
        success: false,
        message: error instanceof Error ? error.message : 'Missing generation configuration',
      });
      await recordUsageEvent({
        subject,
        outcome: 'failure',
        latencyMs: Date.now() - startedAt,
      });
      return generationFailedResponse();
    }

    const upstreamUrl = `${baseUrl}/case-prep`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    let upstreamResponse: Response;

    logBroBot('[BROBOT-ASK-GENERATION]', {
      requestId,
      provider: 'caseprep_proxy',
      model: null,
      hasApiKey: Boolean(process.env.OPENAI_API_KEY),
      success: null,
      targetHost: new URL(upstreamUrl).host,
    });

    try {
      upstreamResponse = await fetch(upstreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
        cache: 'no-store',
      });
    } catch (error) {
      clearTimeout(timeout);
      logBroBot('[BROBOT-ASK-GENERATION]', {
        requestId,
        provider: 'caseprep_proxy',
        model: null,
        hasApiKey: Boolean(process.env.OPENAI_API_KEY),
        success: false,
        message: error instanceof Error ? error.message : 'Upstream fetch failed',
      });
      await recordUsageEvent({
        subject,
        outcome: 'failure',
        latencyMs: Date.now() - startedAt,
      });
      return generationFailedResponse();
    } finally {
      clearTimeout(timeout);
    }

    const latencyMs = Date.now() - startedAt;

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text().catch(() => 'Unknown upstream error');
      logBroBot('[BROBOT-ASK-GENERATION]', {
        requestId,
        provider: 'caseprep_proxy',
        model: null,
        hasApiKey: Boolean(process.env.OPENAI_API_KEY),
        success: false,
        status: upstreamResponse.status,
        message: errorText.slice(0, 200),
      });
      await recordUsageEvent({
        subject,
        outcome: 'failure',
        latencyMs,
      });
      return generationFailedResponse();
    }

    let upstreamJson: unknown;
    try {
      upstreamJson = await upstreamResponse.json();
    } catch {
      logBroBot('[BROBOT-ASK-GENERATION]', {
        requestId,
        provider: 'caseprep_proxy',
        model: null,
        hasApiKey: Boolean(process.env.OPENAI_API_KEY),
        success: false,
        message: 'Invalid JSON from upstream',
      });
      await recordUsageEvent({
        subject,
        outcome: 'failure',
        latencyMs,
      });
      return generationFailedResponse();
    }

    const isValidBroBotResponse = (value: unknown): value is BroBotPayload => {
      if (value === null || typeof value !== 'object') {
        return false;
      }

      return (
        'pimpQuestions' in value &&
        Array.isArray((value as Record<string, unknown>).pimpQuestions)
      );
    };

    if (!isValidBroBotResponse(upstreamJson)) {
      logBroBot('[BROBOT-ASK-GENERATION]', {
        requestId,
        provider: 'caseprep_proxy',
        model: null,
        hasApiKey: Boolean(process.env.OPENAI_API_KEY),
        success: false,
        message: 'Malformed upstream payload',
      });
      await recordUsageEvent({
        subject,
        outcome: 'failure',
        latencyMs,
      });
      return generationFailedResponse();
    }

    logBroBot('[BROBOT-ASK-GENERATION]', {
      requestId,
      provider: 'caseprep_proxy',
      model: null,
      hasApiKey: Boolean(process.env.OPENAI_API_KEY),
      success: true,
      status: upstreamResponse.status,
    });

    const ip = getClientIp(request) ?? undefined;
    const userAgent = request.headers.get('user-agent') ?? undefined;

    let usedAfter: number;
    try {
      usedAfter = await recordSuccessfulAIUse(subject, latencyMs, {
        ipHash: hashForLogging(ip),
        userAgentHash: hashForLogging(userAgent),
      });
    } catch (error) {
      logBroBot('[BROBOT-QUOTA-INCREMENT]', {
        requestId,
        userType: subject.type,
        subjectPrefix: subjectPrefix(subject),
        incremented: false,
        usedBefore,
        usedAfter: null,
        remainingAfter: remainingBefore,
        message: error instanceof Error ? error.message : 'Failed to record BroBot usage',
      });
      throw error;
    }

    const remainingAfter = limit != null ? Math.max(0, limit - usedAfter) : null;

    logBroBot('[BROBOT-QUOTA-INCREMENT]', {
      requestId,
      userType: subject.type,
      subjectPrefix: subjectPrefix(subject),
      incremented: true,
      usedBefore,
      usedAfter,
      remainingAfter,
    });

    const responsePayload: BroBotAskResponse = {
      pimpQuestions: upstreamJson.pimpQuestions ?? [],
      otherUsefulFacts: upstreamJson.otherUsefulFacts ?? [],
      anatomy: upstreamJson.anatomy ?? null,
      meta: {
        remaining: remainingAfter,
        isLimitReached: false,
      },
    };

    const response = NextResponse.json(responsePayload);

    if (guestCookieToSet) {
      response.headers.append('Set-Cookie', guestCookieToSet);
    }

    return response;
  } catch (error) {
    if (subject) {
      await recordUsageEvent({
        subject,
        outcome: 'failure',
        latencyMs: Date.now() - startedAt,
      });
    }

    logBroBot('[BROBOT-ASK-UNEXPECTED]', {
      requestId,
      userType: subject?.type ?? 'unknown',
      subjectPrefix: subject ? subjectPrefix(subject) : null,
      message: error instanceof Error ? error.message : 'Unknown route error',
    });

    return generationFailedResponse();
  }
}
