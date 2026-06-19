import Stripe from 'stripe';

const GOOGLE_ADS_ID = process.env.GOOGLE_ADS_ID || process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';
const SUBSCRIPTION_CONVERSION_LABEL =
  process.env.GOOGLE_ADS_SUBSCRIPTION_CONVERSION_LABEL ||
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIPTION_CONVERSION_LABEL ||
  '';

export type ServerGoogleAdsConversion = {
  label?: string;
  value?: number;
  currency?: string;
  transactionId?: string;
};

function getGoogleAdsConversionId() {
  return GOOGLE_ADS_ID.replace(/^AW-/, '').trim();
}

export function getSubscriptionValueFromStripeSubscription(subscription: Stripe.Subscription) {
  const price = subscription.items.data[0]?.price;
  const unitAmount = price?.unit_amount ?? null;

  if (typeof unitAmount === 'number') {
    return unitAmount / 100;
  }

  const amountDecimal = price?.unit_amount_decimal;
  if (amountDecimal) {
    const parsed = Number(amountDecimal);
    return Number.isFinite(parsed) ? parsed / 100 : undefined;
  }

  return undefined;
}

export async function sendServerGoogleAdsConversion({
  label,
  value,
  currency = 'USD',
  transactionId,
}: ServerGoogleAdsConversion) {
  const conversionId = getGoogleAdsConversionId();
  const conversionLabel = label || SUBSCRIPTION_CONVERSION_LABEL;

  if (!conversionId || !conversionLabel || process.env.NODE_ENV === 'test') {
    return { sent: false, reason: 'missing_config' as const };
  }

  const url = new URL(`https://www.googleadservices.com/pagead/conversion/${conversionId}/`);
  url.searchParams.set('label', conversionLabel);
  url.searchParams.set('guid', 'ON');
  url.searchParams.set('script', '0');

  if (typeof value === 'number' && Number.isFinite(value)) {
    url.searchParams.set('value', value.toFixed(2));
    url.searchParams.set('currency_code', currency);
  }

  if (transactionId) {
    url.searchParams.set('transaction_id', transactionId);
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
    });

    return { sent: response.ok, status: response.status };
  } catch (error) {
    console.error('[google-ads/server] conversion request failed', error);
    return { sent: false, reason: 'request_failed' as const };
  }
}

export async function sendSubscriptionPurchaseConversion(subscription: Stripe.Subscription) {
  if (subscription.status !== 'active') {
    return { sent: false, reason: 'subscription_not_active' as const };
  }

  return sendServerGoogleAdsConversion({
    value: getSubscriptionValueFromStripeSubscription(subscription),
    currency: subscription.currency?.toUpperCase() || 'USD',
    transactionId: subscription.id,
  });
}
