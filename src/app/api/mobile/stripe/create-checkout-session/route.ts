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

function sanitizeEntryPoint(value: unknown) {
  if (typeof value !== 'string') return 'ios_unknown';
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 80);
  return normalized || 'ios_unknown';
}

function summarizeStripeId(value: string | null | undefined) {
  if (!value) return null;
  return value.length <= 12 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

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
    const entryPoint = sanitizeEntryPoint(body.entryPoint);

    console.log('[SUB_FLOW] mobile_stripe_checkout_requested', {
      purchase_source: 'stripe',
      entry_point: entryPoint,
      user_id: user.id.slice(0, 8),
      plan_code: BroBotConfig.PAID_PLAN_CODE,
      interval,
      trial: true,
    });

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
      console.log('[SUB_FLOW] mobile_stripe_checkout_existing_subscription', {
        purchase_source: 'stripe',
        entry_point: entryPoint,
        user_id: user.id.slice(0, 8),
        plan_code: BroBotConfig.PAID_PLAN_CODE,
        subscription_status: existingActive.status,
        checkout_url_created: false,
      });

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
      MOBILE_CANCEL_URL,
      {
        enableTrial: true,
        source: `ios_${entryPoint}`,
      }
    );

    if (!url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    console.log('[SUB_FLOW] mobile_stripe_checkout_created', {
      purchase_source: 'stripe',
      entry_point: entryPoint,
      checkout_url_created: true,
      trial: true,
      price_id: summarizeStripeId(
        interval === 'year' ? BroBotConfig.YEARLY_PRICE_ID : BroBotConfig.MONTHLY_PRICE_ID
      ),
      user_id: user.id.slice(0, 8),
      plan_code: BroBotConfig.PAID_PLAN_CODE,
    });

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[mobile/stripe/checkout] error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create Stripe checkout session' },
      { status: 500 }
    );
  }
}
