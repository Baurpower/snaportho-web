export const PRODUCT_EVENT_NAMES = [
  'brobot_landing_viewed',
  'brobot_opened',
  'brobot_pricing_viewed',
  'brobot_checkout_started',
  'brobot_trial_started',
  'brobot_unlimited_activated',
  'brobot_subscription_renewed',
  'brobot_subscription_canceled',
  'brobot_first_success',
  'brobot_request_completed',
  'brobot_limit_reached',
  'caseprep_started',
  'caseprep_first_section_rendered',
  'caseprep_completed',
  'caseprep_failed',
  'brobot_returned_7d',
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];
export type EntitlementTier = 'guest' | 'free' | 'unlimited';

export type ProductEventInput = {
  eventId?: string;
  eventName: ProductEventName;
  occurredAt?: string;
  userId?: string | null;
  anonymousId?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  surface: string;
  productArea?: 'brobot' | 'caseprep' | 'billing';
  appVersion?: string | null;
  caseprepVersion?: 'v1.1' | 'v1.2' | 'v1.3' | null;
  entitlementTier?: EntitlementTier | null;
  subscriptionProvider?: 'stripe' | 'apple' | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  branchClickId?: string | null;
  properties?: Record<string, string | number | boolean | null>;
};

export function isProductEventName(value: unknown): value is ProductEventName {
  return typeof value === 'string' && PRODUCT_EVENT_NAMES.includes(value as ProductEventName);
}

export function sanitizeProductProperties(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 30)
      .filter(([, item]) => item === null || ['string', 'number', 'boolean'].includes(typeof item))
      .map(([key, item]) => [key.slice(0, 64), typeof item === 'string' ? item.slice(0, 256) : item])
  ) as Record<string, string | number | boolean | null>;
}
