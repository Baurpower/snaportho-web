/**
 * Keep a Stripe subscription's end reason separate from its display status.
 * In particular, `incomplete_expired` means Stripe never collected the first
 * payment; it is not an explicit cancellation by the customer.
 */
export function getStripeLifecycleReason(params: {
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
