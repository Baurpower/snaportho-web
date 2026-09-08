export type AppleCanonicalOrderingRow = {
  status: string | null;
  provider_transaction_id?: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean | null;
  canceled_at?: string | null;
  environment?: string | null;
  stripe_price_id?: string | null;
  provider_product_id?: string | null;
};

export function subscriptionPeriodEndMs(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function shouldSkipAppleCanonicalUpdate(params: {
  existing: AppleCanonicalOrderingRow | null;
  incomingCurrentPeriodEnd: string | null;
  incomingTransactionId?: string;
  notificationType?: string;
}) {
  // Grace extends the access deadline beyond the paid transaction expiry.
  // A terminal event for that same transaction must still remove access.
  if (params.existing?.status === 'grace' && params.incomingTransactionId &&
      params.incomingTransactionId === params.existing.provider_transaction_id &&
      ['GRACE_PERIOD_EXPIRED', 'EXPIRED', 'REFUND', 'REVOKE'].includes(params.notificationType ?? '')) {
    return false;
  }
  const existingPeriodEnd = subscriptionPeriodEndMs(params.existing?.current_period_end);
  if (existingPeriodEnd == null) return false;

  const incomingPeriodEnd = subscriptionPeriodEndMs(params.incomingCurrentPeriodEnd);
  if (incomingPeriodEnd == null) return true;

  return existingPeriodEnd > incomingPeriodEnd;
}

export function appleStateFromExistingRow(existing: AppleCanonicalOrderingRow) {
  return {
    status: (existing.status ?? 'active') as 'active' | 'grace' | 'billing_retry' | 'canceled' | 'expired',
    cancelAtPeriodEnd: existing.cancel_at_period_end ?? false,
    currentPeriodEnd: existing.current_period_end ?? null,
    canceledAt: existing.canceled_at ?? null,
    productId: existing.provider_product_id ?? existing.stripe_price_id ?? null,
    environment: existing.environment === 'sandbox' ? 'sandbox' as const : 'production' as const,
  };
}
