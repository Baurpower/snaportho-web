import assert from 'node:assert/strict';

import {
  doesSubscriptionGrantEntitlement,
  pickBestSubscriptionForEntitlement,
  type CanonicalSubscriptionRow,
} from './ledger';

const now = new Date('2026-07-04T12:00:00.000Z');
const future = '2026-08-04T12:00:00.000Z';
const laterFuture = '2026-09-04T12:00:00.000Z';
const past = '2026-06-04T12:00:00.000Z';

function row(overrides: Partial<CanonicalSubscriptionRow>): CanonicalSubscriptionRow {
  return {
    user_id: '00000000-0000-4000-8000-000000000001',
    provider: 'stripe',
    environment: 'production',
    plan_code: 'unlimited_brobot',
    status: 'active',
    current_period_start: null,
    current_period_end: future,
    cancel_at_period_end: false,
    canceled_at: null,
    provider_customer_id: null,
    provider_subscription_id: 'sub_default',
    provider_product_id: null,
    provider_price_id: null,
    provider_original_transaction_id: null,
    provider_transaction_id: null,
    raw_provider_status: null,
    provider_metadata: {},
    last_verified_at: now.toISOString(),
    updated_at: now.toISOString(),
    ...overrides,
  };
}

assert.equal(doesSubscriptionGrantEntitlement(row({ provider: 'apple', status: 'active' }), now), true);
assert.equal(doesSubscriptionGrantEntitlement(row({ provider: 'apple', status: 'trialing' }), now), true);
assert.equal(doesSubscriptionGrantEntitlement(row({ provider: 'stripe', status: 'active' }), now), true);
assert.equal(doesSubscriptionGrantEntitlement(row({ provider: 'stripe', status: 'trialing' }), now), true);
assert.equal(doesSubscriptionGrantEntitlement(row({ provider: 'apple', status: 'grace' }), now), true);
assert.equal(doesSubscriptionGrantEntitlement(row({ provider: 'apple', status: 'billing_retry' }), now), true);
assert.equal(doesSubscriptionGrantEntitlement(row({ provider: 'stripe', status: 'past_due' }), now), false);
assert.equal(doesSubscriptionGrantEntitlement(row({ provider: 'apple', status: 'expired', current_period_end: past }), now), false);
assert.equal(doesSubscriptionGrantEntitlement(row({ provider: 'stripe', status: 'canceled', current_period_end: future }), now), false);
assert.equal(doesSubscriptionGrantEntitlement(row({ provider: 'apple', status: 'active', current_period_end: past }), now), false);
assert.equal(doesSubscriptionGrantEntitlement(row({ provider: 'apple', status: 'active', current_period_end: null }), now), false);

const appleActiveOlder = row({
  id: 'apple_active_older',
  provider: 'apple',
  provider_subscription_id: 'orig_1',
  stripe_subscription_id: null,
  current_period_end: future,
});
const stripeActiveNewer = row({
  id: 'stripe_active_newer',
  provider: 'stripe',
  provider_subscription_id: 'sub_2',
  stripe_subscription_id: 'sub_2',
  current_period_end: laterFuture,
});
const appleExpired = row({
  id: 'apple_expired',
  provider: 'apple',
  provider_subscription_id: 'orig_expired',
  status: 'expired',
  current_period_end: past,
});

assert.equal(
  pickBestSubscriptionForEntitlement([appleActiveOlder, stripeActiveNewer, appleExpired], now)?.id,
  'stripe_active_newer'
);

console.log('subscription ledger tests passed');
