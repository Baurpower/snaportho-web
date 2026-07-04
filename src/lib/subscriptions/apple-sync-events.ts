import type { AppleEnvironment, AppleTransactionInfo } from '@/lib/apple/app-store-server';
import type { SubscriptionEventRecord } from '@/lib/subscriptions/events';

export type AppleMobileSyncEventState = {
  status: string;
  currentPeriodEnd: string | null;
};

export function buildAppleMobileSyncSubscriptionEvent(params: {
  userId: string;
  planCode: string;
  requestedTransactionId: string;
  environment: AppleEnvironment;
  transactionInfo: AppleTransactionInfo;
  state: AppleMobileSyncEventState;
  subscriptionRowId?: string | null;
}): SubscriptionEventRecord {
  const transactionId = params.transactionInfo.transactionId ?? params.requestedTransactionId;
  const originalTransactionId = params.transactionInfo.originalTransactionId ?? null;

  return {
    provider: 'apple',
    providerEventId: `apple.mobile_sync.${params.environment}.${transactionId}`,
    eventType: 'apple.mobile_subscription_sync',
    userId: params.userId,
    providerSubscriptionId: originalTransactionId,
    providerTransactionId: transactionId,
    rawPayload: {
      source: 'mobile_purchase_sync',
      provider: 'apple',
      productId: params.transactionInfo.productId ?? null,
      transactionId,
      originalTransactionId,
      environment: params.environment,
      status: params.state.status,
      planCode: params.planCode,
      currentPeriodEnd: params.state.currentPeriodEnd,
      purchaseDate: params.transactionInfo.purchaseDate ?? null,
      expiresDate: params.transactionInfo.expiresDate ?? null,
      subscriptionRowId: params.subscriptionRowId ?? null,
    },
    processedAt: new Date().toISOString(),
    processingResult: {
      success: true,
      subscriptionRowId: params.subscriptionRowId ?? null,
      status: params.state.status,
    },
  };
}

export async function attemptAppleMobileSyncAuditInsert(params: {
  record: SubscriptionEventRecord;
  insertEvent: (record: SubscriptionEventRecord) => Promise<unknown>;
}) {
  try {
    await params.insertEvent(params.record);
    return { ok: true as const, errorMessage: null };
  } catch (error) {
    return {
      ok: false as const,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}
