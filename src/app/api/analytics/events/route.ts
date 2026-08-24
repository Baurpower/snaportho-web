import { NextResponse } from 'next/server';
import { recordProductEvent } from '@/lib/analytics/product-events-server';
import { isProductEventName, sanitizeProductProperties } from '@/lib/analytics/product-events';
import { createClient } from '@/utils/supabase/server';

const CLIENT_EVENT_ALLOWLIST = new Set([
  'brobot_landing_viewed',
  'brobot_opened',
  'brobot_pricing_viewed',
  'brobot_checkout_started',
]);

function text(value: unknown, max = 128) {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, max) : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeOccurredAt(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const timestamp = Date.parse(value);
  const now = Date.now();
  return Number.isFinite(timestamp) && timestamp >= now - 86_400_000 && timestamp <= now + 300_000
    ? new Date(timestamp).toISOString()
    : undefined;
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return NextResponse.json({ error: 'origin_not_allowed' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'origin_not_allowed' }, { status: 403 });
    }
  }
  const body = await request.json().catch(() => null);
  if (!body || !isProductEventName(body.eventName) || !CLIENT_EVENT_ALLOWLIST.has(body.eventName)) {
    return NextResponse.json({ error: 'invalid_event' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const anonymousId = text(body.anonymousId);
  const sessionId = text(body.sessionId);
  const eventId = text(body.eventId);
  if ((anonymousId && !UUID.test(anonymousId)) || !sessionId || !UUID.test(sessionId) || !eventId || !UUID.test(eventId)) {
    return NextResponse.json({ error: 'invalid_identity' }, { status: 400 });
  }
  if (!user && !anonymousId) return NextResponse.json({ error: 'identity_required' }, { status: 400 });

  const saved = await recordProductEvent({
    eventId,
    eventName: body.eventName,
    occurredAt: safeOccurredAt(body.occurredAt),
    userId: user?.id ?? null,
    anonymousId,
    sessionId,
    surface: text(body.surface, 100) ?? 'web_unknown',
    productArea: body.eventName === 'brobot_checkout_started' ? 'billing' : 'brobot',
    source: text(body.source),
    medium: text(body.medium),
    campaign: text(body.campaign),
    branchClickId: text(body.branchClickId),
    properties: sanitizeProductProperties(body.properties),
  });

  return saved
    ? new NextResponse(null, { status: 202 })
    : NextResponse.json({ error: 'write_failed' }, { status: 503 });
}
