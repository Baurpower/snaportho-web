/**
 * Entitlement priority tests for Apple vs free quota.
 *
 * Run with: npx tsx src/lib/brobot/entitlements-priority.test.ts
 */

import assert from 'node:assert/strict';
import {
  evaluateSubscriptionCandidates,
  pickBestEntitlingSubscriptionRow,
} from './entitlements';

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

const now = new Date('2026-07-04T12:00:00.000Z');
const future = '2026-08-04T12:00:00.000Z';
const past = '2026-06-04T12:00:00.000Z';

const baseRow = {
  user_id: 'user-123',
  plan_code: 'unlimited_brobot',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: 'com.snaportho.brobot.unlimited.monthly',
  cancel_at_period_end: false,
  canceled_at: null,
  provider_transaction_id: 'txn_1',
  updated_at: '2026-07-04T12:00:00.000Z',
};

const activeAppleSandbox: SubscriptionEntitlementRow = {
  ...baseRow,
  id: 'apple-row-1',
  provider: 'apple',
  status: 'active',
  current_period_end: future,
  provider_subscription_id: 'orig_txn_1',
  environment: 'sandbox',
};

const expiredApple: SubscriptionEntitlementRow = {
  ...activeAppleSandbox,
  id: 'apple-row-expired',
  status: 'expired',
  current_period_end: past,
};

const canceledAppleWithFutureAccess: SubscriptionEntitlementRow = {
  ...activeAppleSandbox,
  id: 'apple-row-canceled',
  status: 'canceled',
  current_period_end: future,
  cancel_at_period_end: true,
  canceled_at: '2026-07-01T12:00:00.000Z',
};

const activeStripe: SubscriptionEntitlementRow = {
  ...baseRow,
  id: 'stripe-row-1',
  provider: 'stripe',
  status: 'active',
  current_period_end: future,
  stripe_customer_id: 'cus_123',
  stripe_subscription_id: 'sub_123',
  provider_subscription_id: 'sub_123',
  environment: 'live',
};

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

test('active Apple beats no subscription rows', () => {
  const selected = pickBestEntitlingSubscriptionRow([activeAppleSandbox], now);
  assert.equal(selected?.provider, 'apple');
  assert.equal(selected?.status, 'active');
});

test('active Apple beats expired Apple duplicate', () => {
  const selected = pickBestEntitlingSubscriptionRow([expiredApple, activeAppleSandbox], now);
  assert.equal(selected?.id, 'apple-row-1');
  assert.equal(selected?.status, 'active');
});

test('active Apple beats active Stripe when Apple period end is later', () => {
  const laterApple = {
    ...activeAppleSandbox,
    current_period_end: '2026-09-04T12:00:00.000Z',
  };
  const earlierStripe = {
    ...activeStripe,
    current_period_end: '2026-08-04T12:00:00.000Z',
  };
  const selected = pickBestEntitlingSubscriptionRow([earlierStripe, laterApple], now);
  assert.equal(selected?.provider, 'apple');
});

test('sandbox Apple row is eligible for entitlement selection', () => {
  const evaluation = evaluateSubscriptionCandidates([activeAppleSandbox], now);
  assert.equal(evaluation.selected?.environment, 'sandbox');
  assert.equal(evaluation.selected?.provider, 'apple');
  assert.equal(evaluation.candidates[0]?.grantsAccess, true);
  assert.equal(evaluation.candidates[0]?.selected, true);
});

test('expired Apple falls back to no selected subscription', () => {
  const evaluation = evaluateSubscriptionCandidates([expiredApple], now);
  assert.equal(evaluation.selected, null);
  assert.match(evaluation.selectionReason, /no_current_subscription_row_grants_unlimited_access/);
});

test('canceled Apple with future period end does not grant access', () => {
  const evaluation = evaluateSubscriptionCandidates([canceledAppleWithFutureAccess], now);
  assert.equal(evaluation.selected, null);
  assert.equal(evaluation.candidates[0]?.grantsAccess, false);
});

if (failed > 0) {
  console.error(`\n${failed} failed, ${passed} passed`);
  process.exit(1);
}

console.log(`\nAll entitlement priority tests passed (${passed})`);