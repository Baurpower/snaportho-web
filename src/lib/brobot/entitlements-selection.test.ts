import assert from 'node:assert/strict';

type SubscriptionEntitlementRow = {
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
      return 5;
    case 'trialing':
      return 4;
    case 'grace':
      return 3;
    case 'billing_retry':
      return 2;
    case 'past_due':
      return 1;
    default:
      return 0;
  }
}

function pickBestEntitlingSubscriptionRow(
  rows: SubscriptionEntitlementRow[],
  now = new Date()
) {
  const nowTs = now.getTime();

  const entitlingRows = rows.filter((row) => {
    const periodEndTs = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
    const appleActiveIsValid =
      row.provider !== 'apple' ||
      (periodEndTs != null && periodEndTs > nowTs);

    return (
      (row.status === 'active' && appleActiveIsValid) ||
      row.status === 'trialing' ||
      (row.status === 'grace' && row.provider === 'apple' && periodEndTs != null && periodEndTs > nowTs)
    );
  });

  return entitlingRows.sort((left, right) => {
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

const now = new Date('2026-06-30T12:00:00.000Z');

const baseRow = {
  user_id: 'user_123',
  plan_code: 'unlimited_brobot',
  stripe_customer_id: 'cus_123',
  stripe_price_id: 'price_123',
  provider_subscription_id: null,
  provider_transaction_id: null,
  environment: 'live',
};

const expiredCanceled = {
  ...baseRow,
  provider: 'stripe',
  status: 'canceled',
  current_period_end: '2026-06-27T00:00:00.000Z',
  cancel_at_period_end: true,
  canceled_at: '2026-05-27T00:00:00.000Z',
  stripe_subscription_id: 'sub_old',
  updated_at: '2026-06-27T00:00:00.000Z',
};

const activeResubscription = {
  ...baseRow,
  provider: 'stripe',
  status: 'active',
  current_period_end: '2026-07-06T00:00:00.000Z',
  cancel_at_period_end: false,
  canceled_at: null,
  stripe_subscription_id: 'sub_new',
  updated_at: '2026-06-06T00:00:00.000Z',
};

assert.equal(
  pickBestEntitlingSubscriptionRow([expiredCanceled, activeResubscription], now)?.stripe_subscription_id,
  'sub_new'
);

assert.equal(
  pickBestEntitlingSubscriptionRow([expiredCanceled], now),
  null
);

const cancelingButStillEntitled = {
  ...baseRow,
  provider: 'stripe',
  status: 'active',
  current_period_end: '2026-07-02T00:00:00.000Z',
  cancel_at_period_end: true,
  canceled_at: null,
  stripe_subscription_id: 'sub_canceling',
  updated_at: '2026-06-28T00:00:00.000Z',
};

assert.equal(
  pickBestEntitlingSubscriptionRow([cancelingButStillEntitled], now)?.stripe_subscription_id,
  'sub_canceling'
);

const canceledWithFutureEnd = {
  ...baseRow,
  provider: 'stripe',
  status: 'canceled',
  current_period_end: '2026-07-05T00:00:00.000Z',
  cancel_at_period_end: false,
  canceled_at: '2026-06-30T00:00:00.000Z',
  stripe_subscription_id: 'sub_canceled_future',
  updated_at: '2026-06-30T00:00:00.000Z',
};

assert.equal(
  pickBestEntitlingSubscriptionRow([canceledWithFutureEnd], now),
  null
);

const appleExpiredButStaleActive = {
  ...baseRow,
  provider: 'apple',
  status: 'active',
  current_period_end: '2026-06-29T00:00:00.000Z',
  cancel_at_period_end: false,
  canceled_at: null,
  stripe_subscription_id: null,
  provider_subscription_id: 'orig_txn_123',
  updated_at: '2026-06-29T00:00:00.000Z',
};

assert.equal(
  pickBestEntitlingSubscriptionRow([appleExpiredButStaleActive], now),
  null
);

const appleGrace = {
  ...baseRow,
  provider: 'apple',
  status: 'grace',
  current_period_end: '2026-07-01T00:00:00.000Z',
  cancel_at_period_end: false,
  canceled_at: null,
  stripe_subscription_id: null,
  provider_subscription_id: 'orig_txn_456',
  updated_at: '2026-06-30T06:00:00.000Z',
};

assert.equal(
  pickBestEntitlingSubscriptionRow([appleGrace], now)?.provider_subscription_id,
  'orig_txn_456'
);

console.log('brobot entitlement selection tests passed');
