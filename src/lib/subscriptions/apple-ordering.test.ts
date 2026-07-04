import assert from 'node:assert/strict';

import {
  appleStateFromExistingRow,
  shouldSkipAppleCanonicalUpdate,
} from './apple-ordering';

const existingActive = {
  status: 'active',
  current_period_end: '2026-08-04T12:00:00.000Z',
  cancel_at_period_end: false,
  canceled_at: null,
  environment: 'sandbox',
  provider_product_id: 'com.snaportho.brobot.unlimited.monthly',
  stripe_price_id: 'com.snaportho.brobot.unlimited.monthly',
};

assert.equal(
  shouldSkipAppleCanonicalUpdate({
    existing: existingActive,
    incomingCurrentPeriodEnd: '2026-07-04T12:00:00.000Z',
  }),
  true
);

assert.equal(
  shouldSkipAppleCanonicalUpdate({
    existing: existingActive,
    incomingCurrentPeriodEnd: null,
  }),
  true
);

assert.equal(
  shouldSkipAppleCanonicalUpdate({
    existing: existingActive,
    incomingCurrentPeriodEnd: '2026-08-04T12:00:00.000Z',
  }),
  false
);

assert.equal(
  shouldSkipAppleCanonicalUpdate({
    existing: existingActive,
    incomingCurrentPeriodEnd: '2026-09-04T12:00:00.000Z',
  }),
  false
);

assert.equal(
  shouldSkipAppleCanonicalUpdate({
    existing: null,
    incomingCurrentPeriodEnd: '2026-07-04T12:00:00.000Z',
  }),
  false
);

const existingState = appleStateFromExistingRow(existingActive);
assert.equal(existingState.status, 'active');
assert.equal(existingState.currentPeriodEnd, '2026-08-04T12:00:00.000Z');
assert.equal(existingState.environment, 'sandbox');
assert.equal(existingState.productId, 'com.snaportho.brobot.unlimited.monthly');

console.log('apple subscription ordering tests passed');
