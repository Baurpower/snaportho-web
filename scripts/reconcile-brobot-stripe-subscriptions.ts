import Stripe from 'stripe';

import { createAdminClient } from '../src/lib/supabase/admin';
import { BROBOT_CONFIG } from '../src/lib/config/brobot';

type ParsedArgs = {
  dryRun: boolean;
  limitCustomers: number | null;
  userId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

function parseArgs(argv: string[]): ParsedArgs {
  let dryRun = false;
  let limitCustomers: number | null = null;
  let userId: string | null = null;
  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg === '--limit-customers') {
      const parsed = Number(argv[index + 1] ?? '');
      limitCustomers = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      index += 1;
      continue;
    }

    if (arg === '--user-id') {
      userId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === '--stripe-customer-id') {
      stripeCustomerId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === '--stripe-subscription-id') {
      stripeSubscriptionId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
  }

  return { dryRun, limitCustomers, userId, stripeCustomerId, stripeSubscriptionId };
}

type StripeUserResolutionSource =
  | 'existing_customer_mapping'
  | 'subscription_metadata'
  | 'customer_metadata'
  | 'provided_filter'
  | 'unmapped';

type CanonicalStatus =
  | 'active'
  | 'trialing'
  | 'grace'
  | 'billing_retry'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'unpaid'
  | 'incomplete';

function getStripeEnvironment(secretKey: string) {
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

function mapStripeStatus(status: Stripe.Subscription.Status): CanonicalStatus {
  const mapping: Record<Stripe.Subscription.Status, CanonicalStatus> = {
    active: 'active',
    past_due: 'past_due',
    unpaid: 'unpaid',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'expired',
    trialing: 'trialing',
    paused: 'past_due',
  };

  return mapping[status] ?? 'incomplete';
}

async function resolveUserId(params: {
  supabase: ReturnType<typeof createAdminClient>;
  customerId: string;
  customer: Stripe.Customer | Stripe.DeletedCustomer | null;
  subscription: Stripe.Subscription;
  providedUserId: string | null;
}) {
  if (params.providedUserId) {
    return {
      userId: params.providedUserId,
      source: 'provided_filter' as StripeUserResolutionSource,
    };
  }

  const { data: existing } = await params.supabase
    .from('subscriptions')
    .select('user_id')
    .or(`provider_customer_id.eq.${params.customerId},stripe_customer_id.eq.${params.customerId}`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ user_id: string }>();

  if (existing?.user_id) {
    return {
      userId: existing.user_id,
      source: 'existing_customer_mapping' as StripeUserResolutionSource,
    };
  }

  const metadataUserId = params.subscription.metadata?.user_id?.trim();
  if (metadataUserId) {
    return {
      userId: metadataUserId,
      source: 'subscription_metadata' as StripeUserResolutionSource,
    };
  }

  const customerMetadataUserId =
    params.customer && !('deleted' in params.customer)
      ? params.customer.metadata?.user_id?.trim() ?? null
      : null;

  if (customerMetadataUserId) {
    return {
      userId: customerMetadataUserId,
      source: 'customer_metadata' as StripeUserResolutionSource,
    };
  }

  return {
    userId: null,
    source: 'unmapped' as StripeUserResolutionSource,
  };
}

async function listTargetCustomers(params: {
  stripe: Stripe;
  supabase: ReturnType<typeof createAdminClient>;
  userId: string | null;
  stripeCustomerId: string | null;
  limitCustomers: number | null;
}) {
  if (params.stripeCustomerId) {
    const customer = await params.stripe.customers.retrieve(params.stripeCustomerId);
    return [customer].filter(Boolean) as Array<Stripe.Customer | Stripe.DeletedCustomer>;
  }

  if (params.userId) {
    const { data: existingRows } = await params.supabase
      .from('subscriptions')
      .select('provider_customer_id, stripe_customer_id')
      .eq('user_id', params.userId)
      .eq('provider', 'stripe')
      .order('updated_at', { ascending: false })
      .limit(20);

    const ids = Array.from(
      new Set(
        (existingRows ?? [])
          .map((row) => row.provider_customer_id ?? row.stripe_customer_id)
          .filter(Boolean)
      )
    ) as string[];

    return Promise.all(ids.map((id) => params.stripe.customers.retrieve(id)));
  }

  const customers: Array<Stripe.Customer | Stripe.DeletedCustomer> = [];
  let startingAfter: string | undefined;

  while (true) {
    const page = await params.stripe.customers.list({
      limit: 100,
      starting_after: startingAfter,
    });

    customers.push(...page.data);

    if (!page.has_more || page.data.length === 0) break;
    if (params.limitCustomers && customers.length >= params.limitCustomers) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return params.limitCustomers ? customers.slice(0, params.limitCustomers) : customers;
}

async function main() {
  const args = parseArgs(process.argv);
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-07-30.basil',
  });
  const supabase = createAdminClient();
  const environment = getStripeEnvironment(stripeSecretKey);

  const customers = await listTargetCustomers({
    stripe,
    supabase,
    userId: args.userId,
    stripeCustomerId: args.stripeCustomerId,
    limitCustomers: args.limitCustomers,
  });

  const reconciliation = {
    dryRun: args.dryRun,
    environment,
    customersScanned: 0,
    subscriptionsScanned: 0,
    matchedSubscriptions: 0,
    appliedCount: 0,
    unmappedSubscriptions: [] as Array<{
      customerId: string;
      subscriptionId: string;
      email: string | null;
    }>,
    resolvedMappings: [] as Array<{
      customerId: string;
      subscriptionId: string;
      userId: string | null;
      source: StripeUserResolutionSource;
      status: string;
    }>,
  };

  for (const customer of customers) {
    if ('deleted' in customer && customer.deleted) continue;
    reconciliation.customersScanned += 1;

    const subscriptions = args.stripeSubscriptionId
      ? [await stripe.subscriptions.retrieve(args.stripeSubscriptionId, {
          expand: ['items.data.price.product'],
        })].filter((subscription) => {
          const customerRef =
            typeof subscription.customer === 'string'
              ? subscription.customer
              : subscription.customer?.id ?? null;
          return customerRef === customer.id;
        })
      : await stripe.subscriptions.list({
          customer: customer.id,
          status: 'all',
          limit: 100,
          expand: ['data.items.data.price.product'],
        }).then((page) => page.data);

    for (const subscription of subscriptions) {
      reconciliation.subscriptionsScanned += 1;

      if (!stripeSubscriptionMatchesBroBot(subscription)) {
        continue;
      }

      reconciliation.matchedSubscriptions += 1;
      const mapping = await resolveUserId({
        supabase,
        customerId: customer.id,
        customer,
        subscription,
        providedUserId: args.userId,
      });

      reconciliation.resolvedMappings.push({
        customerId: customer.id,
        subscriptionId: subscription.id,
        userId: mapping.userId,
        source: mapping.source,
        status: subscription.status,
      });

      if (!mapping.userId) {
        reconciliation.unmappedSubscriptions.push({
          customerId: customer.id,
          subscriptionId: subscription.id,
          email: customer.email ?? null,
        });
        continue;
      }

      const firstItem = subscription.items.data[0];
      const productId =
        typeof firstItem?.price?.product === 'string'
          ? firstItem.price.product
          : firstItem?.price?.product?.id ?? null;
      const latestInvoiceId =
        typeof subscription.latest_invoice === 'string'
          ? subscription.latest_invoice
          : subscription.latest_invoice?.id ?? null;
      const payload = {
        user_id: mapping.userId,
        provider: 'stripe',
        environment,
        plan_code: subscription.metadata?.plan_code || BROBOT_CONFIG.PAID_PLAN_CODE,
        status: mapStripeStatus(subscription.status),
        current_period_start: firstItem?.current_period_start
          ? new Date(firstItem.current_period_start * 1000).toISOString()
          : null,
        current_period_end: firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        provider_customer_id: customer.id,
        provider_subscription_id: subscription.id,
        provider_product_id: productId,
        provider_price_id: firstItem?.price?.id ?? null,
        provider_original_transaction_id: null,
        provider_transaction_id: latestInvoiceId,
        raw_provider_status: subscription.status,
        provider_metadata: {
          provider: 'stripe',
          source: mapping.source,
          metadata: subscription.metadata,
        },
        last_verified_at: new Date().toISOString(),
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: firstItem?.price?.id ?? null,
        updated_at: new Date().toISOString(),
      };

      if (!args.dryRun) {
        const { error } = await supabase
          .from('subscriptions')
          .upsert(payload, { onConflict: 'provider,environment,provider_subscription_id' });

        if (error) {
          throw new Error(`Failed to upsert ${subscription.id}: ${error.message}`);
        }
      }

      reconciliation.appliedCount += 1;
    }
  }

  const query = supabase
    .from('subscriptions')
    .select(`
      user_id,
      provider,
      environment,
      stripe_customer_id,
      stripe_subscription_id,
      plan_code,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      canceled_at,
      updated_at
    `)
    .eq('provider', 'stripe')
    .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(25);

  const filteredQuery = args.userId
    ? query.eq('user_id', args.userId)
    : args.stripeCustomerId
      ? query.eq('stripe_customer_id', args.stripeCustomerId)
      : query;

  const { data: rows, error } = await filteredQuery;
  if (error) {
    throw new Error(`Failed to load reconciled rows: ${error.message}`);
  }

  console.log(JSON.stringify({
    input: args,
    reconciliation,
    rows: rows ?? [],
  }, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exit(1);
});
