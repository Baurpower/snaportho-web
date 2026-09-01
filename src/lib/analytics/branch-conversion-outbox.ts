import { createAdminClient } from '@/lib/supabase/admin';
import {
  sendBranchServerEvent,
  type BranchServerEvent,
} from '@/lib/analytics/branch-server';

export const BRANCH_CONVERSION_MAX_ATTEMPTS = 12;

export type BranchConversionEvent = BranchServerEvent & {
  provider: 'stripe' | 'apple';
  environment: string;
};

export type BranchOutboxRow = {
  id: string;
  provider: 'stripe' | 'apple';
  event_name: BranchServerEvent['name'];
  transaction_id: string;
  environment: string;
  user_id: string;
  custom_data: Record<string, string | number | boolean | null>;
  user_data: Record<string, string>;
  status: 'pending' | 'delivered' | 'failed';
  attempt_count: number;
  last_error: string | null;
  last_attempted_at: string | null;
  delivered_at: string | null;
};

export function buildBranchConversionIdempotencyKey(event: {
  provider: string;
  environment: string;
  name: string;
  transactionId: string;
}) {
  return `${event.provider}:${event.environment}:${event.name}:${event.transactionId}`;
}

export function branchConversionRetryDelayMs(attemptCount: number) {
  const minutes = [1, 5, 15, 60, 360, 1440];
  const index = Math.min(Math.max(attemptCount, 0), minutes.length - 1);
  return minutes[index] * 60 * 1000;
}

export function shouldAttemptBranchOutboxDelivery(
  row: Pick<BranchOutboxRow, 'status' | 'attempt_count' | 'last_attempted_at'>,
  now = new Date()
) {
  if (row.status === 'delivered') return false;
  if (row.attempt_count >= BRANCH_CONVERSION_MAX_ATTEMPTS) return false;
  if (!row.last_attempted_at) return true;
  const lastAttempted = new Date(row.last_attempted_at).getTime();
  if (!Number.isFinite(lastAttempted)) return true;
  return now.getTime() - lastAttempted >= branchConversionRetryDelayMs(row.attempt_count);
}

function eventFromOutboxRow(row: BranchOutboxRow): BranchServerEvent {
  const userData = row.user_data ?? {};
  return {
    name: row.event_name,
    userId: row.user_id,
    transactionId: row.transaction_id,
    idempotencyKey: buildBranchConversionIdempotencyKey({
      provider: row.provider,
      environment: row.environment,
      name: row.event_name,
      transactionId: row.transaction_id,
    }),
    customData: row.custom_data ?? {},
    userData: {
      os: userData.os,
      os_version: userData.os_version,
      idfv: userData.idfv,
    },
  };
}

async function loadOutboxRow(params: {
  provider: string;
  eventName: string;
  transactionId: string;
  environment: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('branch_conversion_outbox')
    .select('*')
    .eq('provider', params.provider)
    .eq('event_name', params.eventName)
    .eq('transaction_id', params.transactionId)
    .eq('environment', params.environment)
    .maybeSingle<BranchOutboxRow>();

  if (error) {
    throw new Error(`Failed to load Branch conversion outbox row: ${error.message}`);
  }

  return data;
}

export async function deliverBranchOutboxRow(row: BranchOutboxRow) {
  const delivered = await sendBranchServerEvent(eventFromOutboxRow(row));
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const attemptCount = row.attempt_count + 1;
  const nextStatus = delivered
    ? 'delivered'
    : attemptCount >= BRANCH_CONVERSION_MAX_ATTEMPTS
      ? 'failed'
      : 'pending';

  const { error } = await supabase
    .from('branch_conversion_outbox')
    .update({
      status: nextStatus,
      attempt_count: attemptCount,
      last_attempted_at: now,
      last_error: delivered ? null : 'branch_delivery_failed',
      delivered_at: delivered ? now : row.delivered_at,
      updated_at: now,
    })
    .eq('id', row.id)
    .neq('status', 'delivered');

  if (error) {
    console.error('[branch/outbox] failed to record delivery attempt', {
      id: row.id,
      error: error.message,
    });
  }

  return { delivered, status: nextStatus };
}

export async function enqueueBranchConversion(event: BranchConversionEvent) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data: inserted, error } = await supabase
    .from('branch_conversion_outbox')
    .upsert(
      {
        provider: event.provider,
        event_name: event.name,
        transaction_id: event.transactionId,
        environment: event.environment,
        user_id: event.userId,
        custom_data: event.customData ?? {},
        user_data: event.userData ?? {},
        status: 'pending',
        updated_at: now,
      },
      {
        onConflict: 'provider,event_name,transaction_id,environment',
        ignoreDuplicates: true,
      }
    )
    .select('*')
    .maybeSingle<BranchOutboxRow>();

  if (error) {
    console.error('[branch/outbox] enqueue failed', {
      provider: event.provider,
      eventName: event.name,
      transactionId: event.transactionId,
      error: error.message,
    });
    return { queued: false, delivered: false };
  }

  const row =
    inserted ??
    (await loadOutboxRow({
      provider: event.provider,
      eventName: event.name,
      transactionId: event.transactionId,
      environment: event.environment,
    }));

  if (!row || !shouldAttemptBranchOutboxDelivery(row)) {
    return { queued: Boolean(row), delivered: row?.status === 'delivered' };
  }

  const result = await deliverBranchOutboxRow(row);
  return { queued: true, delivered: result.delivered };
}

export async function enqueueAppleSubscriptionConversions(params: {
  userId: string;
  originalTransactionId: string;
  environment: string;
  introductory?: boolean;
  source?: string | null;
  userData?: BranchServerEvent['userData'];
}) {
  if (params.introductory) {
    await enqueueBranchConversion({
      provider: 'apple',
      name: 'START_TRIAL',
      userId: params.userId,
      transactionId: params.originalTransactionId,
      environment: params.environment,
      customData: { provider: 'apple', source: params.source ?? 'ios_purchase' },
      userData: params.userData,
    });
  }

  await enqueueBranchConversion({
    provider: 'apple',
    name: 'SUBSCRIBE',
    userId: params.userId,
    transactionId: params.originalTransactionId,
    environment: params.environment,
    customData: { provider: 'apple', source: params.source ?? 'ios_purchase' },
    userData: params.userData,
  });
}

export async function enqueueStripeSubscriptionConversions(params: {
  userId: string;
  subscriptionId: string;
  status: string;
  environment: string;
  source?: string | null;
  userData?: BranchServerEvent['userData'];
}) {
  if (params.status === 'trialing') {
    await enqueueBranchConversion({
      provider: 'stripe',
      name: 'START_TRIAL',
      userId: params.userId,
      transactionId: params.subscriptionId,
      environment: params.environment,
      customData: { source: params.source ?? 'stripe' },
      userData: params.userData,
    });
  }

  await enqueueBranchConversion({
    provider: 'stripe',
    name: 'SUBSCRIBE',
    userId: params.userId,
    transactionId: params.subscriptionId,
    environment: params.environment,
    customData: { status: params.status },
    userData: params.userData,
  });
}

export async function deliverPendingBranchConversions(limit = 25) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('branch_conversion_outbox')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lt('attempt_count', BRANCH_CONVERSION_MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list Branch conversion outbox rows: ${error.message}`);
  }

  const rows = (data ?? []) as BranchOutboxRow[];
  let delivered = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!shouldAttemptBranchOutboxDelivery(row)) {
      skipped += 1;
      continue;
    }
    const result = await deliverBranchOutboxRow(row);
    if (result.delivered) delivered += 1;
    else failed += 1;
  }

  return { considered: rows.length, delivered, failed, skipped };
}
