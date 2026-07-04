import { NextResponse } from 'next/server';
import { getMobileBearerUser } from '@/app/api/mobile/_utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createBroBotCheckoutSession } from '@/lib/stripe';
import { BROBOT_CONFIG as BroBotConfig } from '@/lib/config/brobot';

/**
 * Mobile Stripe Checkout Session for BroBot Unlimited (external payment, no Apple IAP).
 *
 * POST /api/mobile/stripe/create-checkout-session
 *
 * - Requires authenticated Supabase user via Bearer token from iOS.
 * - Reuses the existing BroBot subscription creation + metadata logic.
 * - Uses mobile custom URL scheme redirects (snaportho://) so the app can handle success/cancel.
 * - The app must call GET /api/mobile/entitlements after return to determine actual access.
 *
 * Do NOT modify any donation or legacy webhook paths.
 */

const MOBILE_SUCCESS_URL = 'snaportho://subscription/success';
const MOBILE_CANCEL_URL = 'snaportho://subscription/cancel';

export async function POST(request: Request) {
  if (!BroBotConfig.PAID_ENABLED) {
    return NextResponse.json({ error: 'Paid subscriptions are currently disabled' }, { status: 403 });
  }

  const { user, response } = await getMobileBearerUser(request);
  if (response) return response;
  const supabase = createAdminClient();

  try {
    const body = await request.json().catch(() => ({}));
    const interval: 'month' | 'year' = body.interval === 'year' ? 'year' : 'month';

    // Duplicate subscription guard (mirrors web billing/checkout behavior for good UX)
    const { data: existingActive } = await supabase
      .from('subscriptions')
      .select('id, status, cancel_at_period_end, current_period_end')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .eq('plan_code', BroBotConfig.PAID_PLAN_CODE)
      .in('status', ['active', 'trialing', 'past_due', 'incomplete'])
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const hasOngoingAccess =
      existingActive &&
      (
        ['active', 'trialing'].includes(existingActive.status) ||
        (existingActive.status === 'past_due' && existingActive.current_period_end &&
          new Date(existingActive.current_period_end) > new Date()) ||
        existingActive.cancel_at_period_end
      );

    if (hasOngoingAccess) {
      // User already has (or will have) access — return portal session instead of new checkout
      try {
        const { createBillingPortalSession } = await import('@/lib/stripe');
        const { url: portalUrl } = await createBillingPortalSession(user.id, 'snaportho://subscription/portal-return');
        return NextResponse.json({
          alreadySubscribed: true,
          message: 'You already have an active BroBot subscription.',
          portalUrl,
        });
      } catch {
        return NextResponse.json({
          alreadySubscribed: true,
          message: 'You already have an active BroBot subscription. Please manage it from the app.',
        });
      }
    }

    // Create the Checkout Session with mobile custom scheme redirect URLs
    const { url } = await createBroBotCheckoutSession(
      user.id,
      interval,
      user.email ?? undefined,
      MOBILE_SUCCESS_URL,
      MOBILE_CANCEL_URL
    );

    if (!url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    // Safe debug (user id prefix only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[mobile/stripe/checkout] session created', {
        userId: user.id.slice(0, 8),
        interval,
      });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[mobile/stripe/checkout] error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create Stripe checkout session' },
      { status: 500 }
    );
  }
}
