import Stripe from 'stripe';

import { BROBOT_CONFIG } from '@/lib/config/brobot';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';
import {
  type CanonicalSubscriptionEntry,
  upsertCanonicalSubscription,
} from '@/lib/subscriptions/ledger';

type StripeUserResolutionSource =
  | 'existing_customer_mapping'
  | 'subscription_metadata'
  | 'customer_metadata'
  | 'pending_checkout'
  | 'verified_email'
  | 'provided_filter'
  | 'unmapped';

export type StripeReconciliationResult = {
  dryRun: boolean;
  customersScanned: number;
  subscriptionsScanned: number;
  matchedSubscriptions: number;
  wouldUpsertCount: number;
  appliedCount: number;
  unmappedSubscriptions: Array<{
    customerId: string;
    subscriptionId: string;
    email: string | null;
  }>;
  resolvedMappings: Array<{
    customerId: string;
    subscriptionId: string;
    userId: string | null;
    source: StripeUserResolutionSource;
  }>;
};

export type StripeReconciliationOptions = {
  dryRun?: boolean;
  userId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  limitCustomers?: number | null;
};

function getStripeEnvironment() {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? '';
  if (secretKey.startsWith('sk_live_')) return 'live';
  if (secretKey.startsWith('sk_test_')) return 'test';
  return 'unknown';
}

function stripeSubscriptionMatchesBroBot(subscription: Stripe.Subscription) {
  if (subscription.metadata?.plan_code === BROBOT_CONFIG.PAID_PLAN_CODE) return true;

  const priceIds = new Set(
    [BROBOT_CONFIG.MONTHLY_PRICE_ID, BROBOT_CONFIG.YEARLY_PRICE_ID].filter(Boolean)
  );

  return subscription.items.data.some((item) => priceIds.has(item.price.id));
}

function mapStripeStatusToCanonical(status: Stripe.Subscription.Status): CanonicalSubscriptionEntry['status'] {
  const mapping: Record<Stripe.Subscription.Status, CanonicalSubscriptionEntry['status']> = {
    active: 'active',
    past_due: 'past_due',
    unpaid: 'unpaid',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'expired',
    trialing: 'trialing',
    paused: 'past_due',
  };
  return mapping[status] || 'incomplete';
}

async function findUserIdByVerifiedEmail(email: string) {
  const supabase = createAdminClient();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Failed to list auth users for email fallback: ${error.message}`);
    }

    const users = data.users ?? [];
    const match = users.find((user) => {
      const matchesEmail = user.email?.toLowerCase() === email.toLowerCase();
      const emailConfirmedAt = user.email_confirmed_at;
      return matchesEmail && Boolean(emailConfirmedAt);
    });

    if (match) {
      return match.id;
    }

    if (users.length < 200) break;
    page += 1;
  }

  return null;
}

async function resolveStripeUserMapping(params: {
  subscription: Stripe.Subscription;
  customer: Stripe.Customer | Stripe.DeletedCustomer | null;
  options: StripeReconciliationOptions;
}) {
  const supabase = createAdminClient();
  const customerId =
    typeof params.subscription.customer === 'string'
      ? params.subscription.customer
      : params.subscription.customer?.id ?? null;

  if (params.options.userId) {
    return { userId: params.options.userId, source: 'provided_filter' as const };
  }

  if (customerId) {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('user_id')
      .or(`provider_customer_id.eq.${customerId},stripe_customer_id.eq.${customerId}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ user_id: string }>();

    if (existing?.user_id) {
      return { userId: existing.user_id, source: 'existing_customer_mapping' as const };
    }
  }

  const metadataUserId = params.subscription.metadata?.user_id?.trim();
  if (metadataUserId) {
    return { userId: metadataUserId, source: 'subscription_metadata' as const };
  }

  const customerMetadataUserId =
    params.customer && !('deleted' in params.customer)
      ? params.customer.metadata?.user_id?.trim() ?? null
      : null;

  if (customerMetadataUserId) {
    return { userId: customerMetadataUserId, source: 'customer_metadata' as const };
  }

  if (params.subscription.id || customerId) {
    const query = supabase
      .from('pending_subscriptions')
      .select('claimed_by_user_id, metadata')
      .order('updated_at', { ascending: false })
      .limit(5);

    const pendingLookup = params.subscription.id
      ? query.eq('stripe_subscription_id', params.subscription.id)
      : query.eq('stripe_customer_id', customerId!);

    const { data: pendingRows } = await pendingLookup;
    const pendingUserId = (pendingRows ?? []).find((row) => row.claimed_by_user_id)?.claimed_by_user_id
      ?? (pendingRows ?? [])
        .map((row) => row.metadata as Record<string, unknown> | null)
        .flatMap((metadata) => {
          const checkoutMetadata = metadata?.checkout_session_metadata;
          const subscriptionMetadata = metadata?.subscription_metadata;
          return [
            typeof checkoutMetadata === 'object' && checkoutMetadata && 'user_id' in checkoutMetadata
              ? String((checkoutMetadata as Record<string, unknown>).user_id ?? '')
              : '',
            typeof subscriptionMetadata === 'object' && subscriptionMetadata && 'user_id' in subscriptionMetadata
              ? String((subscriptionMetadata as Record<string, unknown>).user_id ?? '')
              : '',
          ];
        })
        .find(Boolean)
      ?? null;

    if (pendingUserId) {
      return { userId: pendingUserId, source: 'pending_checkout' as const };
    }
  }

  const email =
    params.customer && !('deleted' in params.customer)
      ? params.customer.email ?? null
      : null;

  if (email) {
    const verifiedEmailUserId = await findUserIdByVerifiedEmail(email);
    if (verifiedEmailUserId) {
      return { userId: verifiedEmailUserId, source: 'verified_email' as const };
    }
  }

  return { userId: null, source: 'unmapped' as const };
}

function buildStripeCanonicalEntry(params: {
  subscription: Stripe.Subscription;
  userId: string;
  userResolutionSource: StripeUserResolutionSource;
}) {
  const { subscription, userId, userResolutionSource } = params;
  const firstItem = subscription.items.data[0];
  const price = firstItem?.price;
  const productId =
    typeof price?.product === 'string'
      ? price.product
      : price?.product?.id ?? null;
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id ?? null;

  return {
    user_id: userId,
    provider: 'stripe',
    environment: getStripeEnvironment(),
    plan_code: subscription.metadata?.plan_code || BROBOT_CONFIG.PAID_PLAN_CODE,
    status: mapStripeStatusToCanonical(subscription.status),
    current_period_start:
      firstItem?.current_period_start
        ? new Date(firstItem.current_period_start * 1000).toISOString()
        : null,
    current_period_end:
      firstItem?.current_period_end
        ? new Date(firstItem.current_period_end * 1000).toISOString()
        : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    canceled_at:
      subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    provider_customer_id: customerId,
    provider_subscription_id: subscription.id,
    provider_product_id: productId,
    provider_price_id: price?.id ?? null,
    provider_original_transaction_id: null,
    provider_transaction_id: subscription.latest_invoice
      ? (typeof subscription.latest_invoice === 'string'
          ? subscription.latest_invoice
          : (subscription.latest_invoice.id ?? null))
      : null,
    raw_provider_status: subscription.status,
    provider_metadata: {
      provider: 'stripe',
      user_resolution_source: userResolutionSource,
      metadata: subscription.metadata,
      price_lookup_key: price?.lookup_key ?? null,
      quantity: firstItem?.quantity ?? null,
    },
    last_verified_at: new Date().toISOString(),
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: price?.id ?? null,
  } satisfies CanonicalSubscriptionEntry;
}

async function listCustomerSubscriptions(params: {
  stripe: Stripe;
  customerId: string;
  stripeSubscriptionId?: string | null;
}) {
  if (params.stripeSubscriptionId) {
    const subscription = await params.stripe.subscriptions.retrieve(params.stripeSubscriptionId, {
      expand: ['items.data.price.product'],
    });
    return subscription.customer === params.customerId ? [subscription] : [];
  }

  const subscriptions: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const page = await params.stripe.subscriptions.list({
      customer: params.customerId,
      status: 'all',
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.items.data.price.product'],
    });

    subscriptions.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return subscriptions;
}

async function listTargetCustomers(options: StripeReconciliationOptions) {
  const stripe = getStripe();

  if (options.stripeCustomerId) {
    const customer = await stripe.customers.retrieve(options.stripeCustomerId);
    return [customer].filter(Boolean) as Array<Stripe.Customer | Stripe.DeletedCustomer>;
  }

  if (options.userId) {
    const supabase = createAdminClient();
    const { data: existingRows } = await supabase
      .from('subscriptions')
      .select('provider_customer_id, stripe_customer_id')
      .eq('user_id', options.userId)
      .eq('provider', 'stripe')
      .order('updated_at', { ascending: false })
      .limit(20);

    const ids = [
      ...(existingRows ?? []).map((row) => row.provider_customer_id ?? row.stripe_customer_id).filter(Boolean),
    ];

    return Promise.all(ids.map((id) => stripe.customers.retrieve(id as string)));
  }

  const customers: Array<Stripe.Customer | Stripe.DeletedCustomer> = [];
  let startingAfter: string | undefined;

  while (true) {
    const page = await stripe.customers.list({
      limit: 100,
      starting_after: startingAfter,
    });

    customers.push(...page.data);

    if (!page.has_more || page.data.length === 0) break;
    if (options.limitCustomers && customers.length >= options.limitCustomers) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return options.limitCustomers ? customers.slice(0, options.limitCustomers) : customers;
}

export async function reconcileStripeSubscriptions(options: StripeReconciliationOptions = {}): Promise<StripeReconciliationResult> {
  const stripe = getStripe();
  const customers = await listTargetCustomers(options);

  const result: StripeReconciliationResult = {
    dryRun: Boolean(options.dryRun),
    customersScanned: 0,
    subscriptionsScanned: 0,
    matchedSubscriptions: 0,
    wouldUpsertCount: 0,
    appliedCount: 0,
    unmappedSubscriptions: [],
    resolvedMappings: [],
  };

  for (const customer of customers) {
    if ('deleted' in customer && customer.deleted) {
      continue;
    }

    result.customersScanned += 1;
    const subscriptions = await listCustomerSubscriptions({
      stripe,
      customerId: customer.id,
      stripeSubscriptionId: options.stripeSubscriptionId,
    });

    for (const subscription of subscriptions) {
      result.subscriptionsScanned += 1;

      if (!stripeSubscriptionMatchesBroBot(subscription)) {
        continue;
      }

      result.matchedSubscriptions += 1;
      const mapping = await resolveStripeUserMapping({
        subscription,
        customer,
        options,
      });

      result.resolvedMappings.push({
        customerId: customer.id,
        subscriptionId: subscription.id,
        userId: mapping.userId,
        source: mapping.source,
      });

      if (!mapping.userId) {
        result.unmappedSubscriptions.push({
          customerId: customer.id,
          subscriptionId: subscription.id,
          email: customer.email ?? null,
        });
        continue;
      }

      const entry = buildStripeCanonicalEntry({
        subscription,
        userId: mapping.userId,
        userResolutionSource: mapping.source,
      });

      result.wouldUpsertCount += 1;
      const upserted = await upsertCanonicalSubscription(entry, {
        dryRun: options.dryRun,
      });

      if (upserted.applied) {
        result.appliedCount += 1;
      }
    }
  }

  return result;
}
