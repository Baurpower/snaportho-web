import { createAdminClient } from '@/lib/supabase/admin';

export type SubscriptionEventRecord = {
  provider: string;
  providerEventId: string;
  eventType: string;
  providerSubscriptionId?: string | null;
  providerTransactionId?: string | null;
  userId?: string | null;
  rawPayload: Record<string, unknown>;
  processingResult?: Record<string, unknown> | null;
  processedAt?: string | null;
  receivedAt?: string | null;
};

export async function getExistingSubscriptionEvent(params: {
  provider: string;
  providerEventId: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscription_events')
    .select('id, provider, provider_event_id, processed_at, processing_result')
    .eq('provider', params.provider)
    .eq('provider_event_id', params.providerEventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read subscription event: ${error.message}`);
  }

  return data;
}

export async function upsertSubscriptionEvent(record: SubscriptionEventRecord) {
  const supabase = createAdminClient();
  const payload = {
    provider: record.provider,
    provider_event_id: record.providerEventId,
    stripe_event_id: record.provider === 'stripe' ? record.providerEventId : null,
    event_type: record.eventType,
    user_id: record.userId ?? null,
    provider_subscription_id: record.providerSubscriptionId ?? null,
    provider_transaction_id: record.providerTransactionId ?? null,
    raw_payload: record.rawPayload,
    raw_event: record.provider === 'stripe' ? record.rawPayload : null,
    processing_result: record.processingResult ?? null,
    processed_at: record.processedAt ?? null,
    received_at: record.receivedAt ?? new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('subscription_events')
    .upsert(payload, { onConflict: 'provider,provider_event_id' })
    .select('id, provider, provider_event_id, processed_at, processing_result')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to upsert subscription event: ${error.message}`);
  }

  return data;
}
