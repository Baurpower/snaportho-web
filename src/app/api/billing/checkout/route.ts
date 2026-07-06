import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createBroBotCheckoutSession } from '@/lib/stripe';
import { BROBOT_CONFIG } from '@/lib/config/brobot';
import { getAppBaseUrl, getCheckoutSuccessUrl } from '@/lib/config/app-url';
import { safeRedirectPath } from '@/lib/auth/redirects';

function buildAbsoluteReturnUrl(path: string, flag: 'canceled' | 'portal_return') {
  const url = new URL(path, getAppBaseUrl());
  url.searchParams.set(flag, 'true');
  return url.toString();
}

function logBroBotCheckoutTrialDebug(label: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production' || process.env.BROBOT_CHECKOUT_DEBUG === 'true') {
    console.info(`[brobot/stripe-checkout-trial-debug] ${label}`, details);
  }
}

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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required', reason: 'not_authenticated' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const interval: 'month' | 'year' = body.interval === 'year' ? 'year' : 'month';
    const trialRequested = body.trialRequested !== false;
    const checkoutSource =
      typeof body.checkoutSource === 'string' && body.checkoutSource.trim().length > 0
        ? body.checkoutSource.trim()
        : 'website_authenticated_checkout';
    const returnTo = safeRedirectPath(body.returnTo, '');
    const successUrl = getCheckoutSuccessUrl(returnTo ? { returnTo } : undefined);
    const cancelUrl = returnTo
      ? buildAbsoluteReturnUrl(returnTo, 'canceled')
      : BROBOT_CONFIG.BILLING_CANCEL_URL;
    const portalReturnUrl = returnTo
      ? buildAbsoluteReturnUrl(returnTo, 'portal_return')
      : undefined;

    // === DUPLICATE SUBSCRIPTION GUARD ===
    // Prevent creating multiple active BroBot subscriptions for the same user.
    const { data: existingRows, error: existingError } = await supabase
      .from('subscriptions')
      .select('id, status, cancel_at_period_end, current_period_end')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
      .in('status', ['active', 'trialing', 'past_due', 'incomplete'])
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(10);

    if (existingError) {
      throw new Error(existingError.message);
    }

    const existingActive = (existingRows ?? []).find((row) => {
      if (row.status === 'incomplete') return true;
      if (['active', 'trialing'].includes(row.status)) return true;
      if (row.status === 'past_due' && row.current_period_end) {
        return new Date(row.current_period_end) > new Date();
      }
      return Boolean(row.cancel_at_period_end);
    }) ?? null;

    const hasOngoingAccess =
      existingActive &&
      (
        ['active', 'trialing'].includes(existingActive.status) ||
        (existingActive.status === 'past_due' && existingActive.current_period_end && new Date(existingActive.current_period_end) > new Date()) ||
        existingActive.cancel_at_period_end
      );

    logBroBotCheckoutTrialDebug('web_checkout_route', {
      userId: user.id,
      enableTrial: trialRequested,
      checkoutSource,
      interval,
      returnTo,
      existingRows,
      existingActive,
      hasOngoingAccess: Boolean(hasOngoingAccess),
      willCreateCheckoutSession: !hasOngoingAccess,
    });

    if (hasOngoingAccess) {
      // User already has (or will have until period end) an active BroBot subscription.
      // Send them to the billing portal instead of creating another subscription.
      try {
        const { url: portalUrl } = await (await import('@/lib/stripe')).createBillingPortalSession(user.id, portalReturnUrl);
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

    if (process.env.NODE_ENV !== 'production') {
      console.log('[billing/checkout] Using centralized billing redirect URLs:', {
        success_url: successUrl,
        cancel_url: cancelUrl,
        base: getAppBaseUrl(),
        user_id: user.id,
        interval,
        checkout_source: checkoutSource,
        trial_requested: trialRequested,
      });
    }

    const { url } = await createBroBotCheckoutSession(
      user.id,
      interval,
      user.email ?? undefined,
      successUrl,
      cancelUrl,
      {
        enableTrial: trialRequested,
        source: checkoutSource,
      }
    );

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
