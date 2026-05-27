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

async function getOptionalUser() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
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

  try {
    // 1. Parse body
    const raw = await request.json().catch(() => ({}));
    const parsed = AskRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { prompt } = parsed.data;

    // 2. Determine identity (user > guest)
    const user = await getOptionalUser();

    if (user) {
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
      return NextResponse.json({ error: 'Unable to establish identity' }, { status: 500 });
    }

    // 3. Entitlement check (centralized, the only place that decides)
    const entitlement = await getRemainingAIUses(subject);

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
      upstreamResponse = await fetch(upstreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
        cache: 'no-store',
      });
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
