import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createBillingPortalSession } from '@/lib/stripe';
import { BROBOT_CONFIG as BroBotConfig } from '@/lib/config/brobot';

/**
 * Mobile Stripe Billing Portal for managing BroBot subscription.
 *
 * POST /api/mobile/stripe/create-portal-session
 *
 * - Requires authenticated Supabase user (Bearer from iOS + cookie fallback).
 * - Returns a portal URL the app can open in SFSafariViewController / browser.
 * - Uses a mobile-friendly return URL so the user comes back to the app.
 */

const MOBILE_PORTAL_RETURN_URL = 'snaportho://subscription/portal-return';

export async function POST(request: Request) {
  if (!BroBotConfig.PAID_ENABLED) {
    return NextResponse.json({ error: 'Paid subscriptions are currently disabled' }, { status: 403 });
  }

  const supabase = await createClient();

  // Same auth pattern as other mobile endpoints (Bearer token support for iOS)
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const isBearer = authHeader?.toLowerCase().startsWith('bearer ');
  let bearerToken: string | null = null;
  if (isBearer) {
    bearerToken = authHeader!.replace(/^Bearer\s+/i, '').trim();
  }

  const {
    data: { user },
    error: authError,
  } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { url } = await createBillingPortalSession(user.id, MOBILE_PORTAL_RETURN_URL);

    if (!url) {
      return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[mobile/stripe/portal] session created', {
        userId: user.id.slice(0, 8),
      });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[mobile/stripe/portal] error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create Stripe portal session' },
      { status: 500 }
    );
  }
}
