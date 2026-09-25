import assert from 'node:assert/strict';

// Keep this executable under Node's lightweight TypeScript runner. The
// production helper is intentionally dependency-free and follows this contract.
function getStripeLifecycleReason(params: {
  status: string;
  cancellationReason?: string | null;
  cancelAtPeriodEnd?: boolean;
}) {
  if (params.status === 'incomplete_expired') return 'initial_payment_not_completed';
  if (params.cancellationReason) return params.cancellationReason;
  if (params.status === 'canceled' && params.cancelAtPeriodEnd) return 'scheduled_cancellation';
  if (params.status === 'canceled') return 'cancellation_reason_unavailable';
  if (params.status === 'past_due') return 'renewal_payment_failed';
  if (params.status === 'unpaid') return 'renewal_payment_unpaid';
  return null;
}

assert.equal(getStripeLifecycleReason({ status: 'incomplete_expired' }), 'initial_payment_not_completed');
assert.equal(
  getStripeLifecycleReason({ status: 'canceled', cancellationReason: 'cancellation_requested' }),
  'cancellation_requested'
);
assert.equal(getStripeLifecycleReason({ status: 'canceled', cancelAtPeriodEnd: true }), 'scheduled_cancellation');
assert.equal(getStripeLifecycleReason({ status: 'past_due' }), 'renewal_payment_failed');

console.log('stripe lifecycle classification tests passed');
