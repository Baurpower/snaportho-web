import assert from 'node:assert/strict';

import {
  addCalendarMonthsUtc,
  buildBroBotCheckoutMetadata,
  getBroBotTrialEndTimestamp,
  mapStripeStatusToInternal,
  type BroBotTrialDecision,
} from './stripe';

const eligibleTrial: BroBotTrialDecision = {
  eligible: true,
  reason: 'eligible',
  offerId: 'to_1Tk6xTArNRAa5suA9q50NzAV',
  trialEnd: 1_707_955_200,
  trialMonths: 1,
};

const ineligibleTrial: BroBotTrialDecision = {
  eligible: false,
  reason: 'prior_subscription_row',
  offerId: 'to_1Tk6xTArNRAa5suA9q50NzAV',
  trialEnd: null,
  trialMonths: 1,
};

assert.deepEqual(
  buildBroBotCheckoutMetadata({ userId: 'user_123', trialDecision: eligibleTrial }),
  {
    user_id: 'user_123',
    product: 'brobot',
    plan: 'unlimited_brobot',
    plan_code: 'unlimited_brobot',
    trial_offer_reference_id: 'to_1Tk6xTArNRAa5suA9q50NzAV',
    trial_offer_attached: 'false',
    trial_implementation: 'checkout_trial_end',
    trial_duration_unit: 'calendar_month',
    trial_duration_count: '1',
    trial_end: '1707955200',
    trial_applied: 'true',
    trial_eligibility_reason: 'eligible',
  }
);

assert.equal(
  buildBroBotCheckoutMetadata({ userId: 'user_123', trialDecision: ineligibleTrial })
    .trial_applied,
  'false'
);

assert.equal(mapStripeStatusToInternal('trialing'), 'trialing');
assert.equal(mapStripeStatusToInternal('active'), 'active');

assert.equal(
  addCalendarMonthsUtc(new Date('2024-01-15T00:00:00.000Z'), 1).toISOString(),
  '2024-02-15T00:00:00.000Z'
);
assert.equal(
  addCalendarMonthsUtc(new Date('2024-02-28T12:30:00.000Z'), 1).toISOString(),
  '2024-03-28T12:30:00.000Z'
);
assert.equal(
  addCalendarMonthsUtc(new Date('2023-01-31T00:00:00.000Z'), 1).toISOString(),
  '2023-02-28T00:00:00.000Z'
);
assert.equal(
  addCalendarMonthsUtc(new Date('2024-01-31T00:00:00.000Z'), 1).toISOString(),
  '2024-02-29T00:00:00.000Z'
);
assert.equal(
  getBroBotTrialEndTimestamp(new Date('2024-01-15T00:00:00.000Z')),
  1_707_955_200
);

console.log('stripe trial helper tests passed');
