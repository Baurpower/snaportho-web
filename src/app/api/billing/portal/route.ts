import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  BillingPortalSessionFailedError,
  createBillingPortalSession,
  NoManageableStripeSubscriptionError,
  SubscriptionNotManageableError,
} from '@/lib/stripe';
import { BROBOT_CONFIG } from '@/lib/config/brobot';
import { getAppBaseUrl } from '@/lib/config/app-url';
import { safeRedirectPath } from '@/lib/auth/redirects';

function buildPortalReturnUrl(returnTo: string) {
  const url = new URL(returnTo, getAppBaseUrl());
  url.searchParams.set('portal_return', 'true');
  return url.toString();
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
    const returnTo = safeRedirectPath(body.returnTo, '');
    const { url } = await createBillingPortalSession(
      user.id,
      returnTo ? buildPortalReturnUrl(returnTo) : undefined
    );
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof NoManageableStripeSubscriptionError) {
      return NextResponse.json(
        { error: 'No active Stripe subscription found for this account.', code: 'NO_STRIPE_SUBSCRIPTION' },
        { status: 404 }
      );
    }

    if (err instanceof SubscriptionNotManageableError) {
      return NextResponse.json(
        { error: 'This Stripe subscription is already canceled and may no longer be manageable in the billing portal.', code: 'SUBSCRIPTION_NOT_MANAGEABLE' },
        { status: 409 }
      );
    }

    if (err instanceof BillingPortalSessionFailedError) {
      return NextResponse.json(
        { error: 'Failed to create Stripe portal session', code: 'PORTAL_SESSION_FAILED' },
        { status: 502 }
      );
    }

    console.error('[billing/portal] error', err);
    return NextResponse.json(
      { error: 'Failed to create billing portal session', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
