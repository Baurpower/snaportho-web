import assert from 'node:assert/strict';

/** Mirror of isLegacyStripeUserProviderConstraintError in stripe.ts */
function isLegacyStripeUserProviderConstraintError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('subscriptions_user_provider_idx');
}

assert.equal(
  isLegacyStripeUserProviderConstraintError(
    new Error('duplicate key value violates unique constraint "subscriptions_user_provider_idx"')
  ),
  true
);

assert.equal(
  isLegacyStripeUserProviderConstraintError(
    new Error('duplicate key value violates unique constraint "subscriptions_one_active_per_user_provider"')
  ),
  false
);

assert.equal(isLegacyStripeUserProviderConstraintError(new Error('some other database error')), false);

console.log('stripe resubscribe fallback tests passed');