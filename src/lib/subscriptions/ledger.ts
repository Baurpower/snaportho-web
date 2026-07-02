import { createAdminClient } from '@/lib/supabase/admin';

export const ENTITLING_STATUSES = ['active', 'trialing'] as const;
export const CONDITIONALLY_ENTITLING_STATUSES = ['grace'] as const;

export type CanonicalSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'grace'
  | 'billing_retry'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'unpaid'
  | 'incomplete';

export type CanonicalSubscriptionEntry = {
  user_id: string;
  provider: string;
  environment: string;
  plan_code: string;
  status: CanonicalSubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  provider_product_id: string | null;
  provider_price_id: string | null;
  provider_original_transaction_id: string | null;
  provider_transaction_id: string | null;
  raw_provider_status: string | null;
  provider_metadata: Record<string, unknown>;
  last_verified_at: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
};

export type CanonicalSubscriptionRow = CanonicalSubscriptionEntry & {
  id?: string;
  updated_at?: string | null;
  created_at?: string | null;
};

export function getCanonicalSubscriptionConflictTarget(entry: CanonicalSubscriptionEntry) {
  if (entry.provider && entry.environment && entry.provider_subscription_id) {
    return 'provider,environment,provider_subscription_id';
  }

  if (entry.provider === 'stripe' && entry.stripe_subscription_id) {
    return 'stripe_subscription_id';
  }

  if (entry.provider === 'apple' && entry.provider_subscription_id) {
    return 'provider_subscription_id';
  }

  throw new Error(`Unable to determine canonical conflict target for provider ${entry.provider}`);
}

export async function upsertCanonicalSubscription(
  entry: CanonicalSubscriptionEntry,
  options: { dryRun?: boolean } = {}
) {
  const payload = {
    ...entry,
    provider_customer_id: entry.provider_customer_id,
    provider_subscription_id: entry.provider_subscription_id,
    provider_product_id: entry.provider_product_id,
    provider_price_id: entry.provider_price_id,
    provider_original_transaction_id: entry.provider_original_transaction_id,
    provider_transaction_id: entry.provider_transaction_id,
    raw_provider_status: entry.raw_provider_status,
    provider_metadata: entry.provider_metadata ?? {},
    stripe_customer_id:
      entry.provider === 'stripe'
        ? (entry.stripe_customer_id ?? entry.provider_customer_id)
        : (entry.stripe_customer_id ?? null),
    stripe_subscription_id:
      entry.provider === 'stripe'
        ? (entry.stripe_subscription_id ?? entry.provider_subscription_id)
        : (entry.stripe_subscription_id ?? null),
    stripe_price_id:
      entry.provider === 'stripe'
        ? (entry.stripe_price_id ?? entry.provider_price_id)
        : (entry.stripe_price_id ?? null),
    updated_at: new Date().toISOString(),
  };

  if (options.dryRun) {
    return { applied: false, payload };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(payload, { onConflict: getCanonicalSubscriptionConflictTarget(entry) })
    .select('*')
    .maybeSingle<CanonicalSubscriptionRow>();

  if (error) {
    throw new Error(`Failed to upsert canonical subscription: ${error.message}`);
  }

  return { applied: true, payload, row: data ?? null };
}

export function subscriptionStatusRank(status: string) {
  switch (status) {
    case 'active':
      return 7;
    case 'trialing':
      return 6;
    case 'grace':
      return 5;
    case 'billing_retry':
      return 4;
    case 'past_due':
      return 3;
    case 'canceled':
      return 2;
    case 'expired':
      return 1;
    default:
      return 0;
  }
}

export function subscriptionExpirationTs(value: string | null | undefined) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}

export function doesSubscriptionGrantEntitlement(
  row: Pick<CanonicalSubscriptionRow, 'status' | 'provider' | 'current_period_end'>,
  now = new Date()
) {
  const periodEndTs = subscriptionExpirationTs(row.current_period_end);
  const nowTs = now.getTime();
  const periodEndIsFuture = periodEndTs != null && periodEndTs > nowTs;

  if (row.status === 'active' || row.status === 'trialing') {
    return periodEndIsFuture;
  }

  if (row.status === 'grace' && row.provider === 'apple') {
    return periodEndIsFuture;
  }

  return false;
}

export function pickBestSubscriptionForEntitlement<T extends CanonicalSubscriptionRow>(
  rows: T[],
  now = new Date()
) {
  return [...rows]
    .filter((row) => doesSubscriptionGrantEntitlement(row, now))
    .sort((left, right) => {
      const statusDiff = subscriptionStatusRank(right.status) - subscriptionStatusRank(left.status);
      if (statusDiff !== 0) return statusDiff;

      const periodDiff =
        (subscriptionExpirationTs(right.current_period_end) ?? -Infinity) -
        (subscriptionExpirationTs(left.current_period_end) ?? -Infinity);
      if (periodDiff !== 0) return periodDiff;

      return (
        (subscriptionExpirationTs(right.updated_at ?? null) ?? -Infinity) -
        (subscriptionExpirationTs(left.updated_at ?? null) ?? -Infinity)
      );
    })
    [0] ?? null;
}
