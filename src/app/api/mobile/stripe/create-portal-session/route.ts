import { NextResponse } from 'next/server';
import { getMobileBearerUser } from '@/app/api/mobile/_utils/auth';
import {
  BillingPortalSessionFailedError,
  createBillingPortalSession,
  NoManageableStripeSubscriptionError,
  SubscriptionNotManageableError,
} from '@/lib/stripe';
import { BROBOT_CONFIG as BroBotConfig } from '@/lib/config/brobot';

/**
 * Mobile Stripe Billing Portal for managing BroBot subscription.
 *
 * POST /api/mobile/stripe/create-portal-session
 *
 * - Requires authenticated Supabase user via Bearer token from iOS.
 * - Returns a portal URL the app can open in SFSafariViewController / browser.
 * - Uses a mobile-friendly return URL so the user comes back to the app.
 */

const MOBILE_PORTAL_RETURN_URL = 'snaportho://subscription/portal-return';

function portalErrorResponse(params: {
  error: string;
  code: 'UNAUTHORIZED' | 'NO_STRIPE_SUBSCRIPTION' | 'SUBSCRIPTION_NOT_MANAGEABLE' | 'PORTAL_SESSION_FAILED' | 'INTERNAL_ERROR';
  status: 401 | 404 | 409 | 500 | 502;
}) {
  return NextResponse.json(
    {
      error: params.error,
      code: params.code,
    },
    { status: params.status }
  );
}

export async function POST(request: Request) {
  if (!BroBotConfig.PAID_ENABLED) {
    return portalErrorResponse({
      error: 'Paid subscriptions are currently disabled',
      code: 'INTERNAL_ERROR',
      status: 500,
    });
  }

  const { user, response } = await getMobileBearerUser(request);
  if (response) {
    return portalErrorResponse({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
      status: 401,
    });
  }

  try {
    const { url } = await createBillingPortalSession(user.id, MOBILE_PORTAL_RETURN_URL);

    if (!url) {
      return portalErrorResponse({
        error: 'Failed to create billing portal session',
        code: 'PORTAL_SESSION_FAILED',
        status: 502,
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[mobile/stripe/portal] session created', {
        userId: user.id.slice(0, 8),
      });
    }

    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof NoManageableStripeSubscriptionError) {
      console.warn('[mobile/stripe/portal] no_stripe_subscription', {
        userId: user.id.slice(0, 8),
      });
      return portalErrorResponse({
        error: 'No active Stripe subscription found for this account.',
        code: 'NO_STRIPE_SUBSCRIPTION',
        status: 404,
      });
    }

    if (err instanceof SubscriptionNotManageableError) {
      console.warn('[mobile/stripe/portal] subscription_not_manageable', {
        userId: user.id.slice(0, 8),
      });
      return portalErrorResponse({
        error: 'This Stripe subscription is already canceled and may no longer be manageable in the billing portal. Your access remains active until the renewal date shown.',
        code: 'SUBSCRIPTION_NOT_MANAGEABLE',
        status: 409,
      });
    }

    if (err instanceof BillingPortalSessionFailedError) {
      return portalErrorResponse({
        error: 'Failed to create Stripe portal session',
        code: 'PORTAL_SESSION_FAILED',
        status: 502,
      });
    }

    console.error('[mobile/stripe/portal] error', err);
    return portalErrorResponse({
      error: 'Failed to create Stripe portal session',
      code: 'INTERNAL_ERROR',
      status: 500,
    });
  }
}
