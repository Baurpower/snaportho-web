/**
 * BroBot Secure AI Proxy (Phase 1)
 *
 * THIS IS THE ONLY ROUTE ALLOWED TO CALL THE EXTERNAL CASEPREP /case-prep ENDPOINT.
 *
 * All BroBot AI usage (main case-prep today) MUST come through here.
 * - Authenticates the caller (user or guest)
 * - Enforces global daily caps via centralized helpers
 * - Only successful responses consume quota
 * - Sets signed guest cookies when needed
 * - Structured logging for metrics and abuse detection
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCasePrepInternalBaseUrl } from '@/lib/config/brobot';
import {
  getGuestSessionFromRequest,
  createGuestSessionCookie,
  BROBOT_GUEST_COOKIE_NAME,
} from '@/lib/brobot/guest-session';
import {
  getRemainingAIUses,
  getMobileBroBotEntitlement,
  type Subject,
} from '@/lib/brobot/entitlements';
import { recordSuccessfulAIUse, recordUsageEvent } from '@/lib/brobot/usage';
import { createClient } from '@/utils/supabase/server';
import type { BroBotPayload } from '@/types/caseprep';

const AskRequestSchema = z.object({
  prompt: z.string().trim().min(3, 'Prompt must be at least 3 characters'),
});

export type BroBotAskResponse = BroBotPayload & {
  // Phase 1 additions (safe for existing clients)
  meta?: {
    remaining?: number | null;
    isLimitReached?: boolean;
  };
};

function getClientIp(request: Request): string | null {
  // Vercel / common proxy headers
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

function hashForLogging(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  // Simple non-crypto hash for abuse patterns (not for security)
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }
  return `h${Math.abs(h).toString(16)}`;
}

async function getOptionalUser(request?: Request) {
  try {
    const supabase = await createClient();

    // Support native iOS Bearer token (Authorization: Bearer <token>)
    let bearerToken: string | null = null;
    if (request) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (authHeader?.toLowerCase().startsWith('bearer ')) {
        bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
      }
    }

    const {
      data: { user },
      error: authError,
    } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();

    if (authError) {
      // TEMP DEBUG only
      if (process.env.NODE_ENV !== 'production') {
        console.log('[BROBOT-ASK-DEBUG] getOptionalUser authError', authError.message);
      }
      return null;
    }

    return user ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  let subject: Subject | null = null;
  let guestCookieToSet: string | null = null;

  // TEMP DEBUG (safe only)
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const hasAuthorizationHeader = !!authHeader;
  const isBearer = authHeader?.toLowerCase().startsWith('bearer ');
  const authMode = isBearer ? 'bearer' : (hasAuthorizationHeader ? 'other' : 'cookie');

  if (process.env.NODE_ENV !== 'production') {
    console.log('[BROBOT-ASK-DEBUG] request start', {
      hasAuthorizationHeader,
      authMode,
      method: request.method,
    });
  }

  try {
    // 1. Parse body + normalization (support iOS "prompt" + existing shape)
    const raw = await request.json().catch(() => ({}));

    // TEMP DEBUG (safe)
    const bodyKeys = Object.keys(raw || {});
    if (process.env.NODE_ENV !== 'production') {
      console.log('[BROBOT-ASK-DEBUG] body received', { bodyKeys });
    }

    function normalizeAskPrompt(input: unknown): string | null {
      if (!input || typeof input !== 'object') return null;
      const obj = input as Record<string, unknown>;
      // Accept iOS shape + legacy web shapes
      const candidate = obj.prompt ?? obj.caseDescription ?? obj.query ?? obj.message ?? obj.text ?? obj.case;
      if (typeof candidate !== 'string') return null;
      const trimmed = candidate.trim();
      return trimmed.length >= 3 ? trimmed : null;
    }

    const normalizedPrompt = normalizeAskPrompt(raw);
    const normalizedPromptPresent = !!normalizedPrompt;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[BROBOT-ASK-DEBUG] normalization', { normalizedPromptPresent });
    }

    if (!normalizedPrompt) {
      return NextResponse.json(
        { error: 'Missing case description' },
        { status: 400 }
      );
    }

    // Keep using the existing schema for validation (it accepts "prompt")
    const parsed = AskRequestSchema.safeParse({ prompt: normalizedPrompt });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { prompt } = parsed.data;  // normalized + validated

    // 2. Determine identity (user > guest) — now supports Bearer for iOS
    const user = await getOptionalUser(request);

    // Authenticated Supabase user check + entitlement validation using centralized BroBot engine.
    // If the caller is a logged-in user without BroBot access (per hasBroBotAccess from getMobileBroBotEntitlement),
    // block with 403. This prevents bypassing the iOS Swift UI gate (and web UI gates).
    // Guest users continue to use the existing free quota path (unchanged).
    if (user) {
      const mobileEnt = await getMobileBroBotEntitlement(user.id);
      if (!mobileEnt.hasBroBotAccess) {
        return NextResponse.json(
          {
            error: 'BroBot access required',
            hasBroBotAccess: false,
          },
          { status: 403 }
        );
      }
      subject = { type: 'user', id: user.id };
    } else {
      // Guest path
      let guestSession = getGuestSessionFromRequest(request);

      if (!guestSession) {
        // Mint a fresh signed guest session for this browser
        guestCookieToSet = createGuestSessionCookie();
        // Re-parse the one we just created so we have the id
        // (we know the format — extract guestId safely)
        const match = guestCookieToSet.match(new RegExp(`${BROBOT_GUEST_COOKIE_NAME}=([^;]+)`));
        if (match) {
          const value = match[1];
          const parts = value.split('.');
          const guestId = parts[1]; // v1.guest_xxx....
          if (guestId) {
            guestSession = {
              guestId,
              issuedAt: Math.floor(Date.now() / 1000),
              dayKey: new Date().toISOString().slice(0, 10),
            };
          }
        }
      }

      if (guestSession) {
        subject = { type: 'guest', id: guestSession.guestId };
      }
    }

    if (!subject) {
      // Should be impossible after the logic above
      if (process.env.NODE_ENV !== 'production') {
        console.log('[BROBOT-ASK-DEBUG] no subject established');
      }
      return NextResponse.json({ error: 'Unable to establish identity' }, { status: 500 });
    }

    // TEMP DEBUG (safe)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[BROBOT-ASK-DEBUG] subject resolved', {
        subjectType: subject.type,
        userFound: !!user,
      });
    }

    // 3. Entitlement check (centralized, the only place that decides)
    const entitlement = await getRemainingAIUses(subject);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[BROBOT-ASK-DEBUG] entitlement', {
        isLimitReached: entitlement.isLimitReached,
        remaining: entitlement.aiAccess?.remainingToday,
      });
    }

    if (entitlement.isLimitReached) {
      await recordUsageEvent({
        subject,
        outcome: 'limit_hit',
        latencyMs: Date.now() - startedAt,
      });

      const res = NextResponse.json(
        {
          error: 'Daily limit reached',
          isLimitReached: true,
          remaining: 0,
          dailyCap: entitlement.aiAccess.dailyCap,
        },
        { status: 429 }
      );

      if (guestCookieToSet) {
        res.headers.append('Set-Cookie', guestCookieToSet);
      }
      return res;
    }

    // 4. Proxy to the real CasePrep service (server-to-server, internal URL only)
    const baseUrl = getCasePrepInternalBaseUrl();
    const upstreamUrl = `${baseUrl}/case-prep`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    let upstreamResponse: Response;

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[BROBOT-ASK-DEBUG] calling upstream', { upstreamUrl });
      }
      upstreamResponse = await fetch(upstreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
        cache: 'no-store',
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log('[BROBOT-ASK-DEBUG] upstream status', { status: upstreamResponse.status });
      }
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.error(`[brobot/ask] ${requestId} upstream fetch failed`, fetchErr);

      await recordUsageEvent({
        subject,
        outcome: 'failure',
        latencyMs: Date.now() - startedAt,
      });

      return NextResponse.json(
        { error: 'BroBot service temporarily unavailable' },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    const latencyMs = Date.now() - startedAt;

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text().catch(() => 'Unknown upstream error');
      console.error(`[brobot/ask] ${requestId} upstream error`, {
        status: upstreamResponse.status,
        errorText: errorText.slice(0, 200), // used for diagnostics
        latencyMs,
      });

      await recordUsageEvent({
        subject,
        outcome: 'failure',
        latencyMs,
      });

      return NextResponse.json(
        { error: 'Failed to generate BroBot response', upstreamStatus: upstreamResponse.status },
        { status: 502 }
      );
    }

    // 5. Parse and validate upstream payload (same contract the old client expected)
    let upstreamJson: unknown;
    try {
      upstreamJson = await upstreamResponse.json();
    } catch {
      await recordUsageEvent({ subject, outcome: 'failure', latencyMs });
      return NextResponse.json({ error: 'Invalid response from BroBot service' }, { status: 502 });
    }

    // Type guard for unknown upstream data (replaces previous `any`)
    const isValidBroBotResponse = (val: unknown): val is BroBotPayload =>
      !!val &&
      typeof val === 'object' &&
      'pimpQuestions' in val &&
      Array.isArray((val as Record<string, unknown>).pimpQuestions);

    if (!isValidBroBotResponse(upstreamJson)) {
      await recordUsageEvent({ subject, outcome: 'failure', latencyMs });
      return NextResponse.json({ error: 'Malformed BroBot response' }, { status: 502 });
    }

    // 6. SUCCESS — this is the ONLY path that consumes a daily use
    const ip: string | undefined = getClientIp(request) ?? undefined;
    const userAgent: string | undefined = request.headers.get('user-agent') ?? undefined;

    const newCount = await recordSuccessfulAIUse(
      subject,
      latencyMs,
      {
        ipHash: hashForLogging(ip),
        userAgentHash: hashForLogging(userAgent),
      }
    );

    const responsePayload: BroBotAskResponse = {
      pimpQuestions: upstreamJson.pimpQuestions ?? [],
      otherUsefulFacts: upstreamJson.otherUsefulFacts ?? [],
      anatomy: upstreamJson.anatomy ?? null,
      meta: {
        remaining: Math.max(0, (entitlement.aiAccess.dailyCap ?? 0) - newCount),
        isLimitReached: false,
      },
    };

    const res = NextResponse.json(responsePayload);

    // Attach fresh guest cookie if we created one this request
    if (guestCookieToSet) {
      res.headers.append('Set-Cookie', guestCookieToSet);
    }

    // Lightweight structured log (foundation for Phase 2 metrics)
    console.log(`[brobot/ask] ${requestId} success`, {
      subjectType: subject.type,
      subjectId: subject.type === 'user' ? subject.id.slice(0, 8) : subject.id,
      latencyMs,
      newDailyCount: newCount,
      remaining: responsePayload.meta?.remaining,
    });

    return res;
  } catch (err) {
    const errorClass = err instanceof Error ? err.constructor.name : typeof err;
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[BROBOT-ASK-DEBUG] route error', { errorClass, errorMessage });
    }

    console.error(`[brobot/ask] ${requestId} unexpected error`, err);

    await recordUsageEvent({
      subject: subject ?? { type: 'guest', id: 'unknown' },
      outcome: 'failure',
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { error: 'Unexpected error processing BroBot request' },
      { status: 500 }
    );
  }
}
