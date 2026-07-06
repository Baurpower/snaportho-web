import assert from 'node:assert/strict';

import { doesSubscriptionGrantEntitlement } from '@/lib/subscriptions/ledger';

const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

assert.equal(
  doesSubscriptionGrantEntitlement(
    { status: 'trialing', provider: 'stripe', current_period_end: future },
    new Date()
  ),
  true
);

assert.equal(
  doesSubscriptionGrantEntitlement(
    { status: 'active', provider: 'stripe', current_period_end: future },
    new Date()
  ),
  true
);

assert.equal(
  doesSubscriptionGrantEntitlement(
    { status: 'trialing', provider: 'stripe', current_period_end: null },
    new Date()
  ),
  false
);

console.log('stripe entitlement grant tests passed');