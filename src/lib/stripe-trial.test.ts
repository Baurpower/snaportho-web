import assert from 'node:assert/strict';

type BroBotTrialDecision = {
  eligible: boolean;
  reason:
    | 'eligible'
    | 'trial_not_configured'
    | 'prior_subscription_row'
    | 'prior_stripe_subscription';
  offerId: string | null;
  trialEnd: number | null;
  trialMonths: number | null;
};

function daysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addCalendarMonthsUtc(date: Date, months: number) {
  const targetMonthZeroBased = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonthZeroBased / 12);
  const targetMonth = ((targetMonthZeroBased % 12) + 12) % 12;
  const targetDay = Math.min(date.getUTCDate(), daysInUtcMonth(targetYear, targetMonth));

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

function getBroBotTrialEndTimestamp(startedAt = new Date()) {
  return Math.floor(addCalendarMonthsUtc(startedAt, 1).getTime() / 1000);
}

function buildBroBotCheckoutMetadata(params: {
  userId: string;
  trialDecision: BroBotTrialDecision;
}) {
  return {
    user_id: params.userId,
    provider: 'stripe',
    billing_environment: 'test',
    checkout_source: 'test_source',
    product: 'brobot',
    plan: 'unlimited_brobot',
    plan_code: 'unlimited_brobot',
    trial_requested: 'true',
    trial_offer_reference_id: params.trialDecision.offerId ?? '',
    trial_offer_attached: 'false',
    trial_implementation: params.trialDecision.eligible ? 'checkout_trial_end' : 'none',
    trial_duration_unit: params.trialDecision.eligible ? 'calendar_month' : '',
    trial_duration_count: params.trialDecision.trialMonths?.toString() ?? '',
    trial_end: params.trialDecision.trialEnd?.toString() ?? '',
    trial_applied: params.trialDecision.eligible ? 'true' : 'false',
    trial_eligibility_reason: params.trialDecision.reason,
  };
}

function mapStripeStatusToInternal(status: string): string {
  const mapping: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    unpaid: 'unpaid',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    trialing: 'trialing',
    paused: 'past_due',
  };
  return mapping[status] || 'incomplete';
}

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
    provider: 'stripe',
    billing_environment: 'test',
    checkout_source: 'test_source',
    product: 'brobot',
    plan: 'unlimited_brobot',
    plan_code: 'unlimited_brobot',
    trial_requested: 'true',
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
  buildBroBotCheckoutMetadata({ userId: 'user_123', trialDecision: ineligibleTrial }).trial_applied,
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
