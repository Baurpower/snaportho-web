import Stripe from 'stripe';

import { createAdminClient } from '../src/lib/supabase/admin';
import { BROBOT_CONFIG } from '../src/lib/config/brobot';

type ParsedArgs = {
  userId: string | null;
  stripeCustomerId: string | null;
};

function parseArgs(argv: string[]): ParsedArgs {
  let userId: string | null = null;
  let stripeCustomerId: string | null = null;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

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
  }

  if (!userId && !stripeCustomerId) {
    throw new Error('Provide --user-id or --stripe-customer-id.');
  }

  return { userId, stripeCustomerId };
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

  const environment = stripeSecretKey.startsWith('sk_live_')
    ? 'live'
    : stripeSecretKey.startsWith('sk_test_')
    ? 'test'
    : 'unknown';

  const customerId = args.stripeCustomerId ?? (
    args.userId
      ? (
          await supabase
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', args.userId)
            .eq('provider', 'stripe')
            .not('stripe_customer_id', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data?.stripe_customer_id ?? null
      : null
  );

  let reconciliation = {
    customerId,
    syncedCount: 0,
    subscriptions: [] as Array<{ id: string; status: string; matchedBroBot: boolean }>,
  };

  if (customerId) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });

    const matchesBroBot = (subscription: Stripe.Subscription) => {
      if (subscription.metadata?.plan_code === BROBOT_CONFIG.PAID_PLAN_CODE) return true;
      const priceIds = new Set(
        [BROBOT_CONFIG.MONTHLY_PRICE_ID, BROBOT_CONFIG.YEARLY_PRICE_ID].filter(Boolean)
      );
      return subscription.items.data.some((item) => priceIds.has(item.price.id));
    };

    const mapStripeStatusToInternal = (status: Stripe.Subscription.Status) => {
      const mapping: Record<Stripe.Subscription.Status, string> = {
        active: 'active',
        past_due: 'past_due',
        unpaid: 'unpaid',
        canceled: 'canceled',
        incomplete: 'incomplete',
        incomplete_expired: 'canceled',
        trialing: 'trialing',
        paused: 'past_due',
      };
      return mapping[status] || 'incomplete';
    };

    const relevant = subscriptions.data.filter(matchesBroBot);

    for (const subscription of relevant) {
      const firstItem = subscription.items.data[0];
      const periodStart = firstItem?.current_period_start ?? null;
      const periodEnd = firstItem?.current_period_end ?? null;
      const userId =
        subscription.metadata?.user_id
        ?? args.userId
        ?? (
          await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data?.user_id
        ?? null;

      if (!userId) {
        continue;
      }

      const { error } = await supabase.from('subscriptions').upsert({
        user_id: userId,
        provider: 'stripe',
        environment,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items.data[0]?.price.id || null,
        plan_code: subscription.metadata?.plan_code || BROBOT_CONFIG.PAID_PLAN_CODE,
        status: mapStripeStatusToInternal(subscription.status),
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'stripe_subscription_id' });

      if (error) {
        throw new Error(`Failed to upsert ${subscription.id}: ${error.message}`);
      }
    }

    reconciliation = {
      customerId,
      syncedCount: relevant.length,
      subscriptions: subscriptions.data.map((subscription) => ({
        id: subscription.id,
        status: subscription.status,
        matchedBroBot: matchesBroBot(subscription),
      })),
    };
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
    : query.eq('stripe_customer_id', args.stripeCustomerId!);

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
