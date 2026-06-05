// src/lib/stripe.ts
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { BROBOT_CONFIG } from '@/lib/config/brobot';
import { getAppBaseUrl } from '@/lib/config/app-url'; // Centralized production-safe URL resolution

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

type BillingPortalErrorCode =
  | 'NO_STRIPE_SUBSCRIPTION'
  | 'SUBSCRIPTION_NOT_MANAGEABLE'
  | 'PORTAL_SESSION_FAILED';

class BillingPortalError extends Error {
  code: BillingPortalErrorCode;

  constructor(code: BillingPortalErrorCode, message: string) {
    super(message);
    this.name = 'BillingPortalError';
    this.code = code;
  }
}

export class NoManageableStripeSubscriptionError extends BillingPortalError {
  constructor() {
    super('NO_STRIPE_SUBSCRIPTION', 'No active Stripe subscription found for this account.');
    this.name = 'NoManageableStripeSubscriptionError';
  }
}

export class SubscriptionNotManageableError extends BillingPortalError {
  constructor() {
    super(
      'SUBSCRIPTION_NOT_MANAGEABLE',
      'This Stripe subscription is already canceled and may no longer be manageable in the billing portal.'
    );
    this.name = 'SubscriptionNotManageableError';
  }
}

export class BillingPortalSessionFailedError extends BillingPortalError {
  constructor() {
    super('PORTAL_SESSION_FAILED', 'Failed to create Stripe billing portal session.');
    this.name = 'BillingPortalSessionFailedError';
  }
}

function summarizeStripeId(value: string | null | undefined) {
  if (!value) return null;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function summarizeStripeError(error: unknown) {
  if (!(error instanceof Stripe.errors.StripeError)) {
    return {
      type: error instanceof Error ? error.name : typeof error,
      code: null,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    type: error.type ?? error.name,
    code: error.code ?? null,
    message: error.message,
  };
}

function isSubscriptionNotManageableStripeError(
  error: unknown,
  params: {
    status: string | null;
    currentPeriodEndInFuture: boolean;
  }
) {
  if (!(error instanceof Stripe.errors.StripeError)) {
    return false;
  }

  if (
    params.status !== 'canceled' ||
    !params.currentPeriodEndInFuture ||
    error.type !== 'StripeInvalidRequestError'
  ) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();
  if (error.code === 'resource_missing' || normalizedMessage.includes('no such customer')) {
    return false;
  }

  return (
    normalizedMessage.includes('subscription') ||
    normalizedMessage.includes('cancel') ||
    normalizedMessage.includes('manage')
  );
}

function logPortalDecision(
  label: string,
  details: Record<string, unknown>
) {
  console.info(`[stripe/portal] ${label}`, details);
}

type PortalSubscriptionRow = {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  provider: string | null;
  plan_code: string | null;
  updated_at: string | null;
};

/**
 * Ensures a Stripe Customer exists for the given user.
 * Creates one if necessary and stores the ID.
 */
export async function getOrCreateStripeCustomer(userId: string, email?: string): Promise<string> {
  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (sub?.stripe_customer_id) {
    return sub.stripe_customer_id;
  }

  // Create new customer in Stripe
  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  // Store it immediately (best effort)
  await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customer.id,
        plan_code: BROBOT_CONFIG.PAID_PLAN_CODE,
        status: 'incomplete',
      },
      { onConflict: 'user_id' }
    );

  return customer.id;
}

/**
 * Creates a Stripe Checkout Session for BroBot Unlimited.
 */
export async function createBroBotCheckoutSession(
  userId: string,
  interval: 'month' | 'year',
  email?: string,
  /** Optional overrides for mobile flows using custom URL schemes (e.g. snaportho://) */
  customSuccessUrl?: string,
  customCancelUrl?: string
): Promise<{ url: string | null }> {
  const priceId =
    interval === 'year'
      ? BROBOT_CONFIG.YEARLY_PRICE_ID
      : BROBOT_CONFIG.MONTHLY_PRICE_ID;

  if (!priceId) {
    throw new Error('Stripe price ID not configured for BroBot');
  }

  const customerId = await getOrCreateStripeCustomer(userId, email);

  // Use custom redirect URLs if provided (mobile), otherwise fall back to centralized web URLs.
  // Always call getAppBaseUrl() for the production safety throw when using web defaults.
  const successUrl = customSuccessUrl || BROBOT_CONFIG.BILLING_SUCCESS_URL;
  const cancelUrl = customCancelUrl || BROBOT_CONFIG.BILLING_CANCEL_URL;

  if (!customSuccessUrl && !customCancelUrl) {
    getAppBaseUrl(); // force throw in production if misconfigured (before creating session)
  }

  // Dev-only debug logging for redirect troubleshooting
  if (process.env.NODE_ENV !== 'production') {
    console.log('[stripe] Creating Checkout Session with redirect URLs:', {
      success_url: successUrl,
      cancel_url: cancelUrl,
      isMobileCustom: !!(customSuccessUrl || customCancelUrl),
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId, // stable identifier for webhook resolution
    metadata: {
      user_id: userId,
      plan_code: BROBOT_CONFIG.PAID_PLAN_CODE,
    },
    subscription_data: {
      metadata: {
        user_id: userId,
        plan_code: BROBOT_CONFIG.PAID_PLAN_CODE,
      },
    },
  });

  return { url: session.url };
}

/**
 * Creates a Stripe Customer Portal session for managing billing.
 */
export async function createBillingPortalSession(
  userId: string,
  /** Optional custom return URL (e.g. mobile snaportho://subscription/portal-return) */
  customReturnUrl?: string
): Promise<{ url: string | null }> {
  const supabase = createAdminClient();

  const { data: initialSub, error } = await supabase
    .from('subscriptions')
    .select(`
      status,
      current_period_end,
      cancel_at_period_end,
      canceled_at,
      stripe_customer_id,
      stripe_subscription_id,
      provider,
      plan_code,
      updated_at
    `)
    .eq('user_id', userId)
    .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<PortalSubscriptionRow>();

  if (error) {
    throw new Error('Failed to load Stripe subscription for portal access');
  }

  let sub = initialSub;

  if (!sub) {
    const { data: fallback, error: fallbackError } = await supabase
      .from('subscriptions')
      .select(`
        status,
        current_period_end,
        cancel_at_period_end,
        canceled_at,
        stripe_customer_id,
        stripe_subscription_id,
        provider,
        plan_code,
        updated_at
      `)
      .eq('user_id', userId)
      .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle<PortalSubscriptionRow>();

    if (fallbackError) {
      throw new Error('Failed to load Stripe subscription for portal access');
    }
    sub = fallback;
  }

  const now = Date.now();
  const graceMs = BROBOT_CONFIG.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const periodEndTs = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const hasStripeCustomerId = Boolean(sub?.stripe_customer_id);
  const hasStripeSubscriptionId = Boolean(sub?.stripe_subscription_id);
  const isStripeBacked = hasStripeCustomerId && sub?.provider !== 'apple';
  const hasFutureAccessWindow = periodEndTs != null && periodEndTs > now;
  const isManageable =
    !!sub &&
    isStripeBacked &&
    (
      sub.status === 'active' ||
      sub.status === 'trialing' ||
      (sub.status === 'past_due' && periodEndTs != null && periodEndTs + graceMs > now) ||
      (sub.cancel_at_period_end === true && hasFutureAccessWindow) ||
      (sub.status === 'canceled' && hasFutureAccessWindow)
    );

  logPortalDecision('subscription_selected', {
    userId: userId.slice(0, 8),
    selectedRowExists: Boolean(sub),
    provider: sub?.provider ?? null,
    status: sub?.status ?? null,
    hasStripeCustomerId,
    hasStripeSubscriptionId,
    currentPeriodEndInFuture: hasFutureAccessWindow,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? null,
    environmentMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')
      ? 'live'
      : process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
      ? 'test'
      : 'unknown',
  });

  if (!sub || !hasStripeCustomerId || sub.provider === 'apple') {
    throw new NoManageableStripeSubscriptionError();
  }

  if (!isManageable) {
    throw new SubscriptionNotManageableError();
  }

  const customerId = sub.stripe_customer_id;
  if (!customerId) {
    throw new NoManageableStripeSubscriptionError();
  }

  // Use custom return URL (mobile) or fall back to web (with production safety check)
  let returnUrl: string;
  if (customReturnUrl) {
    returnUrl = customReturnUrl;
  } else {
    getAppBaseUrl(); // force throw in production
    returnUrl = BROBOT_CONFIG.BILLING_SUCCESS_URL.replace('success=true', 'portal_return=true');
  }

  try {
    logPortalDecision('portal_create_attempt', {
      userId: userId.slice(0, 8),
      customerId: summarizeStripeId(customerId),
      subscriptionId: summarizeStripeId(sub.stripe_subscription_id),
      status: sub.status,
    });

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: portal.url };
  } catch (error) {
    const summary = summarizeStripeError(error);
    console.error('[stripe/portal] portal_create_failed', {
      userId: userId.slice(0, 8),
      status: sub.status,
      provider: sub.provider ?? null,
      hasStripeCustomerId,
      hasStripeSubscriptionId,
      currentPeriodEndInFuture: hasFutureAccessWindow,
      stripeErrorType: summary.type,
      stripeErrorCode: summary.code,
      stripeErrorMessage: summary.message,
    });

    if (
      isSubscriptionNotManageableStripeError(error, {
        status: sub.status,
        currentPeriodEndInFuture: hasFutureAccessWindow,
      })
    ) {
      throw new SubscriptionNotManageableError();
    }

    throw new BillingPortalSessionFailedError();
  }
}

/**
 * Maps Stripe subscription status to our internal enum.
 */
export function mapStripeStatusToInternal(status: Stripe.Subscription.Status): string {
  const mapping: Record<Stripe.Subscription.Status, string> = {
    active: 'active',
    past_due: 'past_due',
    unpaid: 'unpaid',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    trialing: 'active', // treat trial as active for entitlement
    paused: 'past_due',
  };
  return mapping[status] || 'incomplete';
}

/**
 * Syncs a Stripe Subscription object into our database.
 * Called from webhooks and defensively from other places.
 */
export async function syncSubscriptionFromStripe(stripeSub: Stripe.Subscription) {
  const supabase = createAdminClient();

  if (process.env.NODE_ENV !== 'production') {
    console.log('[stripe] syncSubscriptionFromStripe called', {
      subscriptionId: stripeSub.id,
      status: stripeSub.status,
      metadataUserId: stripeSub.metadata?.user_id,
      customer: stripeSub.customer,
    });
  }

  let userId = stripeSub.metadata?.user_id;

  // Fallback: look up by customer if metadata is missing (very useful after checkout)
  if (!userId && stripeSub.customer) {
    const customerId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.user_id) {
      userId = existing.user_id;
      console.log('[stripe] syncSubscriptionFromStripe recovered user_id from customer mapping', {
        customerId,
        userId,
      });
    }
  }

  if (!userId) {
    console.warn('[stripe] syncSubscriptionFromStripe: missing user_id in metadata and no customer mapping found', {
      subscriptionId: stripeSub.id,
      customer: stripeSub.customer,
    });
    return;
  }

  const planCode = stripeSub.metadata?.plan_code || BROBOT_CONFIG.PAID_PLAN_CODE;
  const priceId = stripeSub.items.data[0]?.price.id || null;

  const internalStatus = mapStripeStatusToInternal(stripeSub.status);

  // In Stripe SDK v18 (API 2025-03-31+), current_period_start/end moved from
  // Subscription to SubscriptionItem. Use the first item as source of truth.
  const firstItem = stripeSub.items.data[0];
  const periodStart = firstItem?.current_period_start ?? null;
  const periodEnd = firstItem?.current_period_end ?? null;

  const upsertPayload = {
    user_id: userId,
    provider: 'stripe',
    stripe_customer_id: typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id,
    stripe_subscription_id: stripeSub.id,
    stripe_price_id: priceId,
    plan_code: planCode,
    status: internalStatus,
    current_period_start: periodStart
      ? new Date(periodStart * 1000).toISOString()
      : null,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    cancel_at_period_end: stripeSub.cancel_at_period_end,
    canceled_at: stripeSub.canceled_at
      ? new Date(stripeSub.canceled_at * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase.from('subscriptions').upsert(
    upsertPayload,
    { onConflict: 'user_id,provider' }
  );

  console.log('[stripe] syncSubscriptionFromStripe upsert', {
    userId,
    subscriptionId: stripeSub.id,
    resolvedStatus: internalStatus,
    upsertPayload: {
      ...upsertPayload,
      // avoid dumping huge objects
    },
    upsertError: upsertError ? { message: upsertError.message, code: upsertError.code } : null,
  });
}
