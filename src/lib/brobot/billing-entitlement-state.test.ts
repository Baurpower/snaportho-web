import assert from 'node:assert/strict';

import {
  deriveBillingActivationPhase,
  getBillingPlanLabel,
  getBillingStatusBadge,
  parseMeEntitlementsPayload,
  shouldShowFreeQuotaUsage,
  toWebBroBotUsageMeta,
  toWebEntitlementMenuStatus,
  toWebUsageSnapshot,
} from './billing-entitlement-state';

const stripeTrialingPayload = {
  access: 'unlimited' as const,
  planCode: 'unlimited_brobot',
  status: 'trialing',
  currentPeriodEnd: '2026-08-05T00:00:00.000Z',
  data: {
    aiAccess: { unlimited: true, dailyCap: null, remainingToday: null },
    source: 'subscription' as const,
    planCode: 'unlimited_brobot',
    status: 'trialing',
    expiresAt: '2026-08-05T00:00:00.000Z',
    provider: 'stripe',
    stripeSubscriptionId: 'sub_test',
  },
};

const stripeActivePayload = {
  ...stripeTrialingPayload,
  status: 'active',
  data: {
    ...stripeTrialingPayload.data,
    status: 'active',
  },
};

const freePayload = {
  access: 'free' as const,
  planCode: 'free',
  data: {
    aiAccess: { unlimited: false, dailyCap: 3, remainingToday: 3 },
    source: 'free_quota' as const,
  },
};

assert.equal(parseMeEntitlementsPayload(stripeTrialingPayload).isUnlimited, true);
assert.equal(parseMeEntitlementsPayload(stripeTrialingPayload).isPaid, true);
assert.equal(parseMeEntitlementsPayload(stripeActivePayload).isUnlimited, true);
assert.equal(parseMeEntitlementsPayload(freePayload).isUnlimited, false);

assert.equal(
  deriveBillingActivationPhase({
    awaitingCheckoutConfirmation: true,
    isPaid: true,
    pollTimedOut: false,
  }),
  'active'
);

assert.equal(
  deriveBillingActivationPhase({
    awaitingCheckoutConfirmation: true,
    isPaid: false,
    pollTimedOut: false,
  }),
  'activating'
);

assert.equal(
  deriveBillingActivationPhase({
    awaitingCheckoutConfirmation: true,
    isPaid: false,
    pollTimedOut: true,
  }),
  'delayed'
);

assert.equal(
  shouldShowFreeQuotaUsage({
    isUnlimited: false,
    activationPhase: 'activating',
  }),
  false
);

assert.equal(
  shouldShowFreeQuotaUsage({
    isUnlimited: false,
    activationPhase: 'idle',
  }),
  true
);

assert.equal(
  getBillingPlanLabel({ isUnlimited: true, activationPhase: 'active' }),
  'Unlimited BroBot'
);

assert.equal(
  getBillingPlanLabel({ isUnlimited: false, activationPhase: 'activating' }),
  'Activating...'
);

assert.equal(
  getBillingStatusBadge({
    isUnlimited: true,
    activationPhase: 'active',
    status: 'trialing',
    cancelAtPeriodEnd: false,
  }),
  'trial'
);

assert.equal(
  getBillingStatusBadge({
    isUnlimited: false,
    activationPhase: 'delayed',
    status: null,
    cancelAtPeriodEnd: false,
  }),
  'delayed'
);

assert.equal(
  shouldShowFreeQuotaUsage({
    isUnlimited: true,
    activationPhase: 'active',
  }),
  false
);

const unlimitedTopLevelOnly = {
  access: 'unlimited' as const,
  planCode: 'unlimited_brobot',
  status: 'trialing',
  data: null,
};

const unlimitedView = parseMeEntitlementsPayload(unlimitedTopLevelOnly);
assert.equal(unlimitedView.isUnlimited, true);
assert.equal(toWebUsageSnapshot(unlimitedView).remainingToday, null);
assert.equal(toWebEntitlementMenuStatus(unlimitedView).label, 'Unlimited BroBot');

const appleUnlimitedPayload = {
  access: 'unlimited' as const,
  planCode: 'unlimited_brobot',
  status: 'active',
  data: {
    aiAccess: { unlimited: true, dailyCap: null, remainingToday: null },
    source: 'subscription' as const,
    provider: 'apple',
    status: 'active',
  },
};

assert.equal(parseMeEntitlementsPayload(appleUnlimitedPayload).isUnlimited, true);
assert.equal(toWebEntitlementMenuStatus(parseMeEntitlementsPayload(appleUnlimitedPayload)).unlimited, true);

const usageMeta = toWebBroBotUsageMeta(parseMeEntitlementsPayload(stripeTrialingPayload));
assert.equal(usageMeta.unlimited, true);
assert.equal(usageMeta.remainingToday, null);
assert.equal(usageMeta.source, 'subscription');

console.log('billing-entitlement-state tests passed');