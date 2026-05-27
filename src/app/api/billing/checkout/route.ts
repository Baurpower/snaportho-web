import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createBroBotCheckoutSession } from '@/lib/stripe';
import { BROBOT_CONFIG } from '@/lib/config/brobot';
import { getAppBaseUrl } from '@/lib/config/app-url';

export async function POST(request: Request) {
  if (!BROBOT_CONFIG.PAID_ENABLED) {
    return NextResponse.json({ error: 'Paid subscriptions are currently disabled' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const interval: 'month' | 'year' = body.interval === 'year' ? 'year' : 'month';

    // === DUPLICATE SUBSCRIPTION GUARD ===
    // Prevent creating multiple active BroBot subscriptions for the same user.
    const { data: existingActive } = await supabase
      .from('subscriptions')
      .select('id, status, cancel_at_period_end, current_period_end')
      .eq('user_id', user.id)
      .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
      .in('status', ['active', 'trialing', 'past_due', 'incomplete'])
      .maybeSingle();

    const hasOngoingAccess =
      existingActive &&
      (
        ['active', 'trialing'].includes(existingActive.status) ||
        (existingActive.status === 'past_due' && existingActive.current_period_end && new Date(existingActive.current_period_end) > new Date()) ||
        existingActive.cancel_at_period_end
      );

    if (hasOngoingAccess) {
      // User already has (or will have until period end) an active BroBot subscription.
      // Send them to the billing portal instead of creating another subscription.
      try {
        const { url: portalUrl } = await (await import('@/lib/stripe')).createBillingPortalSession(user.id);
        return NextResponse.json({
          alreadySubscribed: true,
          message: 'You already have an active BroBot subscription.',
          portalUrl,
        });
      } catch {
        return NextResponse.json({
          alreadySubscribed: true,
          message: 'You already have an active BroBot subscription. Please manage it from your account.',
        });
      }
    }

    // Use centralized production-safe URL resolution.
    // This guarantees that in production we never generate localhost or broken redirect URLs.
    const successUrl = BROBOT_CONFIG.BILLING_SUCCESS_URL;
    const cancelUrl = BROBOT_CONFIG.BILLING_CANCEL_URL;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[billing/checkout] Using centralized billing redirect URLs:', {
        success_url: successUrl,
        cancel_url: cancelUrl,
        base: getAppBaseUrl(),
        user_id: user.id,
        interval,
      });
    }

    const { url } = await createBroBotCheckoutSession(user.id, interval, user.email ?? undefined);

    if (!url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[billing/checkout] error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create checkout' },
      { status: 500 }
    );
  }
}