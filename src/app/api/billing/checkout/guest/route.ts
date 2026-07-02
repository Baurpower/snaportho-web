import { NextResponse } from 'next/server';

import { BROBOT_CONFIG } from '@/lib/config/brobot';
import { createGuestBroBotCheckoutSession } from '@/lib/stripe';

export async function POST(request: Request) {
  if (!BROBOT_CONFIG.PAID_ENABLED) {
    return NextResponse.json(
      {
        error: 'Paid subscriptions are currently disabled',
        reason: 'paid_disabled',
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const interval: 'month' | 'year' = body.interval === 'year' ? 'year' : 'month';
    const trialRequested = body.trialRequested !== false;
    const checkoutSource =
      typeof body.checkoutSource === 'string' && body.checkoutSource.trim().length > 0
        ? body.checkoutSource.trim()
        : typeof body.source === 'string' && body.source.trim().length > 0
        ? body.source.trim()
        : 'website_guest_checkout';

    const { url } = await createGuestBroBotCheckoutSession(interval, {
      enableTrial: trialRequested,
      source: checkoutSource,
      campaign: typeof body.campaign === 'string' ? body.campaign : null,
      utmSource: typeof body.utm_source === 'string' ? body.utm_source : null,
      utmMedium: typeof body.utm_medium === 'string' ? body.utm_medium : null,
      utmCampaign: typeof body.utm_campaign === 'string' ? body.utm_campaign : null,
      utmTerm: typeof body.utm_term === 'string' ? body.utm_term : null,
      utmContent: typeof body.utm_content === 'string' ? body.utm_content : null,
    });

    if (!url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[billing/checkout/guest] error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
