/**
 * Consolidated entitlement resolution scenarios for RDS→Supabase audit.
 * Self-contained (no @/ imports) — mirrors production policy in ledger + entitlements.
 *
 * Run: npm run subscriptions:test:resolution
 */

import assert from 'node:assert/strict';

type SubscriptionEntitlementRow = {
  id?: string;
  user_id: string;
  status: string;
  plan_code: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  provider: string | null;
  provider_subscription_id: string | null;
  provider_transaction_id: string | null;
  environment: string | null;
  updated_at?: string | null;
};

function getSubscriptionStatusRank(status: string) {
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

function doesSubscriptionGrantEntitlement(
  row: Pick<SubscriptionEntitlementRow, 'status' | 'provider' | 'current_period_end'>,
  now = new Date()
) {
  const periodEndTs = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
  const nowTs = now.getTime();
  const periodEndIsFuture = periodEndTs != null && periodEndTs > nowTs;

  if (row.status === 'active' || row.status === 'trialing') {
    return periodEndIsFuture;
  }

  if (row.status === 'grace' && row.provider === 'apple') {
    return periodEndIsFuture;
  }

  if (row.status === 'billing_retry' && row.provider === 'apple') {
    return periodEndIsFuture;
  }

  return false;
}

function pickBestEntitlingSubscriptionRow(rows: SubscriptionEntitlementRow[], now = new Date()) {
  return rows
    .filter((row) =>
      doesSubscriptionGrantEntitlement(
        {
          status: row.status,
          provider: row.provider ?? 'stripe',
          current_period_end: row.current_period_end,
        },
        now
      )
    )
    .sort((left, right) => {
      const statusDiff = getSubscriptionStatusRank(right.status) - getSubscriptionStatusRank(left.status);
      if (statusDiff !== 0) return statusDiff;

      const periodDiff =
        (right.current_period_end ? new Date(right.current_period_end).getTime() : -Infinity) -
        (left.current_period_end ? new Date(left.current_period_end).getTime() : -Infinity);
      if (periodDiff !== 0) return periodDiff;

      return (
        (right.updated_at ? new Date(right.updated_at).getTime() : -Infinity) -
        (left.updated_at ? new Date(left.updated_at).getTime() : -Infinity)
      );
    })[0] ?? null;
}

const now = new Date('2026-07-05T12:00:00.000Z');
const future = '2026-08-05T00:00:00.000Z';
const past = '2026-06-05T00:00:00.000Z';

function row(overrides: Partial<SubscriptionEntitlementRow>): SubscriptionEntitlementRow {
  return {
    user_id: 'user-1',
    plan_code: 'unlimited_brobot',
    status: 'active',
    current_period_end: future,
    cancel_at_period_end: false,
    canceled_at: null,
    stripe_customer_id: 'cus_1',
    stripe_subscription_id: 'sub_stripe',
    stripe_price_id: 'price_1',
    provider: 'stripe',
    provider_subscription_id: 'sub_stripe',
    provider_transaction_id: null,
    environment: 'live',
    updated_at: '2026-07-05T10:00:00.000Z',
    ...overrides,
  };
}

// Stripe active grants unlimited
assert.equal(doesSubscriptionGrantEntitlement({ status: 'active', provider: 'stripe', current_period_end: future }, now), true);

// Stripe trialing (free trial) grants unlimited
const trialRow = row({ status: 'trialing', stripe_subscription_id: 'sub_trial', provider_subscription_id: 'sub_trial' });
assert.equal(pickBestEntitlingSubscriptionRow([trialRow], now)?.status, 'trialing');

// Stripe canceled with future period end does NOT grant
const canceledStripe = row({ status: 'canceled', current_period_end: future });
assert.equal(
  doesSubscriptionGrantEntitlement(
    { status: canceledStripe.status, provider: 'stripe', current_period_end: canceledStripe.current_period_end },
    now
  ),
  false
);
assert.equal(pickBestEntitlingSubscriptionRow([canceledStripe], now), null);

// Apple grace grants while period end is future
const appleGrace = row({
  provider: 'apple',
  provider_subscription_id: 'orig_apple_1',
  stripe_subscription_id: null,
  stripe_customer_id: null,
  status: 'grace',
});
assert.equal(pickBestEntitlingSubscriptionRow([appleGrace], now)?.provider, 'apple');

// Apple billing_retry grants cached access until period end
const appleRetry = row({
  provider: 'apple',
  provider_subscription_id: 'orig_apple_2',
  stripe_subscription_id: null,
  status: 'billing_retry',
});
assert.equal(pickBestEntitlingSubscriptionRow([appleRetry], now)?.status, 'billing_retry');

// Active Stripe beats Apple grace
const activeStripeRow = row({ id: 'stripe-2' });
assert.equal(pickBestEntitlingSubscriptionRow([appleGrace, activeStripeRow], now)?.provider, 'stripe');

// Resubscribe: new active Stripe row wins over old canceled Stripe
const oldCanceled = row({
  id: 'old',
  status: 'canceled',
  current_period_end: past,
  stripe_subscription_id: 'sub_old',
  provider_subscription_id: 'sub_old',
  updated_at: '2026-01-01T00:00:00.000Z',
});
const newActive = row({
  id: 'new',
  status: 'active',
  current_period_end: future,
  stripe_subscription_id: 'sub_new',
  provider_subscription_id: 'sub_new',
  updated_at: '2026-07-05T00:00:00.000Z',
});
assert.equal(pickBestEntitlingSubscriptionRow([oldCanceled, newActive], now)?.stripe_subscription_id, 'sub_new');

// Stripe past_due does not grant
assert.equal(
  doesSubscriptionGrantEntitlement({ status: 'past_due', provider: 'stripe', current_period_end: future }, now),
  false
);

// Active Apple beats trialing Stripe (status rank)
const activeApple = row({
  provider: 'apple',
  status: 'active',
  provider_subscription_id: 'orig_active',
  stripe_subscription_id: null,
});
const trialingStripe = row({
  status: 'trialing',
  stripe_subscription_id: 'sub_trial_2',
  provider_subscription_id: 'sub_trial_2',
});
assert.equal(pickBestEntitlingSubscriptionRow([trialingStripe, activeApple], now)?.provider, 'apple');

console.log('entitlement-resolution.test.ts: all assertions passed');