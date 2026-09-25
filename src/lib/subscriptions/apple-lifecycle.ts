/** Apple expirationIntent values from App Store Server API renewal info. */
export function getAppleLifecycleReason(params: {
  status: string;
  notificationType?: string | null;
  notificationSubtype?: string | null;
  expirationIntent?: number | null;
}) {
  switch (params.expirationIntent) {
    case 1: return 'voluntary_cancellation';
    case 2: return 'billing_error';
    case 3: return 'price_increase_not_accepted';
    case 4: return 'product_unavailable';
    case 5: return 'other_expiration';
  }

  if (params.notificationType === 'EXPIRED' && params.notificationSubtype === 'VOLUNTARY') {
    return 'voluntary_cancellation';
  }
  if (params.notificationType === 'EXPIRED' && params.notificationSubtype === 'BILLING_RETRY') {
    return 'billing_retry_exhausted';
  }
  if (params.notificationType === 'EXPIRED' && params.notificationSubtype === 'PRICE_INCREASE') {
    return 'price_increase_not_accepted';
  }
  if (params.notificationType === 'EXPIRED' && params.notificationSubtype === 'PRODUCT_NOT_FOR_SALE') {
    return 'product_unavailable';
  }
  if (params.notificationType === 'REFUND') return 'refunded';
  if (params.notificationType === 'REVOKE') return 'revoked';
  if (params.status === 'billing_retry') return 'billing_retry';
  return null;
}
