// src/lib/stripe.ts
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { BROBOT_CONFIG } from '@/lib/config/brobot';
import { getAppBaseUrl } from '@/lib/config/app-url'; // Centralized production-safe URL resolution

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

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
  email?: string
): Promise<{ url: string | null }> {
  const priceId =
    interval === 'year'
      ? BROBOT_CONFIG.YEARLY_PRICE_ID
      : BROBOT_CONFIG.MONTHLY_PRICE_ID;

  if (!priceId) {
    throw new Error('Stripe price ID not configured for BroBot');
  }

  const customerId = await getOrCreateStripeCustomer(userId, email);

  // Explicit early resolution guarantees production never proceeds with unsafe (localhost) redirect URLs
  const successUrl = BROBOT_CONFIG.BILLING_SUCCESS_URL;
  const cancelUrl = BROBOT_CONFIG.BILLING_CANCEL_URL;
  getAppBaseUrl(); // force throw in production if misconfigured (before creating session)

  // Dev-only debug logging for redirect troubleshooting
  if (process.env.NODE_ENV !== 'production') {
    console.log('[stripe] Creating Checkout Session with redirect URLs:', {
      success_url: successUrl,
      cancel_url: cancelUrl,
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
export async function createBillingPortalSession(userId: string): Promise<{ url: string | null }> {
  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    throw new Error('No Stripe customer found for user');
  }

  // Explicit early resolution for production safety on portal return URL
  getAppBaseUrl();

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: BROBOT_CONFIG.BILLING_SUCCESS_URL.replace('success=true', 'portal_return=true'),
  });

  return { url: portal.url };
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
    { onConflict: 'user_id' }
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
