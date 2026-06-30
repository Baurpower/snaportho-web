import assert from 'node:assert/strict';

type ExistingStripeSubscriptionRow = {
  stripe_subscription_id: string | null;
  status: string | null;
  current_period_end: string | null;
  updated_at: string | null;
};

function getIsoTime(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function shouldKeepExistingStripeSubscription(params: {
  existing: ExistingStripeSubscriptionRow | null;
  incomingSubscriptionId: string;
  incomingStatus: string;
  incomingPeriodEndIso: string | null;
}) {
  const { existing, incomingSubscriptionId, incomingStatus, incomingPeriodEndIso } = params;
  if (!existing?.stripe_subscription_id) return false;
  if (existing.stripe_subscription_id === incomingSubscriptionId) return false;

  const existingPeriodEnd = getIsoTime(existing.current_period_end);
  const incomingPeriodEnd = getIsoTime(incomingPeriodEndIso);

  if (existingPeriodEnd != null && incomingPeriodEnd != null && existingPeriodEnd > incomingPeriodEnd) {
    return true;
  }

  const existingStatus = existing.status ?? 'incomplete';
  const existingIsActiveLike = ['active', 'trialing', 'past_due'].includes(existingStatus);
  const incomingIsActiveLike = ['active', 'trialing', 'past_due'].includes(incomingStatus);

  if (existingIsActiveLike && !incomingIsActiveLike) {
    if (existingPeriodEnd == null) return true;
    if (incomingPeriodEnd == null) return true;
    if (existingPeriodEnd >= incomingPeriodEnd) return true;
  }

  return false;
}

assert.equal(
  shouldKeepExistingStripeSubscription({
    existing: {
      stripe_subscription_id: 'sub_new',
      status: 'active',
      current_period_end: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
    },
    incomingSubscriptionId: 'sub_old',
    incomingStatus: 'canceled',
    incomingPeriodEndIso: '2026-07-01T00:00:00.000Z',
  }),
  true
);

assert.equal(
  shouldKeepExistingStripeSubscription({
    existing: {
      stripe_subscription_id: 'sub_old',
      status: 'canceled',
      current_period_end: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
    },
    incomingSubscriptionId: 'sub_new',
    incomingStatus: 'active',
    incomingPeriodEndIso: '2026-08-01T00:00:00.000Z',
  }),
  false
);

assert.equal(
  shouldKeepExistingStripeSubscription({
    existing: {
      stripe_subscription_id: 'sub_same',
      status: 'active',
      current_period_end: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
    },
    incomingSubscriptionId: 'sub_same',
    incomingStatus: 'canceled',
    incomingPeriodEndIso: '2026-08-01T00:00:00.000Z',
  }),
  false
);

console.log('stripe subscription sync guard tests passed');
