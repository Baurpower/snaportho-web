/**
 * Stripe-only reconciliation contract checks (Apple/iOS coexistence).
 * Run with: npx tsx src/lib/subscriptions/stripe-reconciliation-first-time.test.ts
 */

import assert from 'node:assert/strict';

import { getCanonicalSubscriptionConflictTarget } from './ledger';

const stripeEntry = {
  user_id: '11111111-1111-1111-1111-111111111111',
  provider: 'stripe',
  environment: 'live',
  plan_code: 'unlimited_brobot',
  status: 'trialing' as const,
  current_period_start: '2026-07-05T00:00:00.000Z',
  current_period_end: '2026-08-05T00:00:00.000Z',
  cancel_at_period_end: false,
  canceled_at: null,
  provider_customer_id: 'cus_test',
  provider_subscription_id: 'sub_test',
  provider_product_id: 'prod_test',
  provider_price_id: 'price_test',
  provider_original_transaction_id: null,
  provider_transaction_id: null,
  raw_provider_status: 'trialing',
  provider_metadata: { provider: 'stripe' },
  last_verified_at: '2026-07-05T00:00:00.000Z',
  stripe_customer_id: 'cus_test',
  stripe_subscription_id: 'sub_test',
  stripe_price_id: 'price_test',
};

const appleEntry = {
  ...stripeEntry,
  provider: 'apple',
  provider_subscription_id: '1000000123456789',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: 'apple.product.id',
};

assert.equal(
  getCanonicalSubscriptionConflictTarget(stripeEntry),
  'provider,provider_subscription_id,environment'
);
assert.equal(
  getCanonicalSubscriptionConflictTarget(appleEntry),
  'provider,provider_subscription_id,environment'
);
assert.notEqual(stripeEntry.provider, appleEntry.provider);

console.log('stripe reconciliation provider isolation tests passed');