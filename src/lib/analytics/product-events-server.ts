import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeProductProperties, type ProductEventInput } from './product-events';

export async function recordProductEvent(input: ProductEventInput): Promise<boolean> {
  if (!input.userId && !input.anonymousId) {
    console.error('[product-analytics] event rejected: identity missing', { eventName: input.eventName });
    return false;
  }

  try {
    const { error } = await createAdminClient().from('product_events').insert({
      event_id: input.eventId ?? crypto.randomUUID(),
      event_name: input.eventName,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      user_id: input.userId ?? null,
      anonymous_id: input.anonymousId ?? null,
      session_id: input.sessionId ?? null,
      request_id: input.requestId ?? null,
      surface: input.surface.slice(0, 100),
      product_area: input.productArea ?? 'brobot',
      app_version: input.appVersion ?? null,
      caseprep_version: input.caseprepVersion ?? null,
      entitlement_tier: input.entitlementTier ?? null,
      subscription_provider: input.subscriptionProvider ?? null,
      source: input.source ?? null,
      medium: input.medium ?? null,
      campaign: input.campaign ?? null,
      branch_click_id: input.branchClickId ?? null,
      properties: sanitizeProductProperties(input.properties),
    });

    if (error) {
      if (error.code === '23505') return true;
      console.error('[product-analytics] insert failed', {
        eventName: input.eventName,
        code: error.code,
        message: error.message,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error('[product-analytics] unavailable', { eventName: input.eventName, error });
    return false;
  }
}

export async function recordSuccessfulBroBotProductUse(input: {
  userId?: string | null;
  anonymousId?: string | null;
  surface: string;
  requestId?: string | null;
  entitlementTier?: ProductEventInput['entitlementTier'];
  latencyMs?: number;
}) {
  const common: ProductEventInput = {
    eventName: 'brobot_request_completed',
    userId: input.userId,
    anonymousId: input.anonymousId,
    surface: input.surface,
    requestId: input.requestId,
    entitlementTier: input.entitlementTier,
    properties: { latency_ms: input.latencyMs ?? null },
  };
  await Promise.all([
    recordProductEvent(common),
    recordProductEvent({ ...common, eventName: 'brobot_first_success' }),
  ]);
}
