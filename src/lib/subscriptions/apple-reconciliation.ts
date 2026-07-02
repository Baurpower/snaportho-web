import type {
  AppleEnvironment,
  AppleRenewalInfo,
} from '@/lib/apple/app-store-server';
import {
  fetchAppleSubscriptionStatus,
  fetchVerifiedAppleTransaction,
} from '@/lib/apple/app-store-server';
import { BROBOT_CONFIG } from '@/lib/config/brobot';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  type CanonicalSubscriptionEntry,
  upsertCanonicalSubscription,
} from '@/lib/subscriptions/ledger';

export type AppleReconciliationResult = {
  dryRun: boolean;
  originalsScanned: number;
  transactionsScanned: number;
  wouldUpsertCount: number;
  appliedCount: number;
  unmappedTransactions: Array<{
    originalTransactionId: string;
    transactionId: string | null;
  }>;
};

export type AppleReconciliationOptions = {
  dryRun?: boolean;
  userId?: string | null;
  originalTransactionId?: string | null;
};

function mapAppleStatusCode(status: number): {
  status: CanonicalSubscriptionEntry['status'];
  raw: string;
} {
  switch (status) {
    case 1:
      return { status: 'active', raw: 'active' };
    case 2:
      return { status: 'expired', raw: 'expired' };
    case 3:
      return { status: 'billing_retry', raw: 'billing_retry' };
    case 4:
      return { status: 'grace', raw: 'grace' };
    case 5:
      return { status: 'canceled', raw: 'revoked' };
    default:
      return { status: 'canceled', raw: `status_${status}` };
  }
}

async function findAppleUserId(params: {
  originalTransactionId: string;
  appAccountToken?: string | null;
  userId?: string | null;
}) {
  if (params.userId) return params.userId;

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('provider', 'apple')
    .or(
      `provider_subscription_id.eq.${params.originalTransactionId},provider_original_transaction_id.eq.${params.originalTransactionId}`
    )
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ user_id: string }>();

  if (existing?.user_id) {
    return existing.user_id;
  }

  if (params.appAccountToken && /^[0-9a-fA-F-]{36}$/.test(params.appAccountToken)) {
    return params.appAccountToken;
  }

  return null;
}

function buildAppleCanonicalEntry(params: {
  userId: string;
  originalTransactionId: string;
  transactionId: string | null;
  environment: AppleEnvironment;
  productId: string | null;
  purchaseDate: number | undefined;
  expiresDate: number | undefined;
  mappedStatus: { status: CanonicalSubscriptionEntry['status']; raw: string };
  renewalInfo: AppleRenewalInfo | null;
  rawResponse: Record<string, unknown>;
}) {
  return {
    user_id: params.userId,
    provider: 'apple',
    environment: params.environment,
    plan_code: BROBOT_CONFIG.PAID_PLAN_CODE,
    status: params.mappedStatus.status,
    current_period_start:
      params.purchaseDate != null
        ? new Date(params.purchaseDate).toISOString()
        : null,
    current_period_end:
      params.expiresDate != null
        ? new Date(params.expiresDate).toISOString()
        : null,
    cancel_at_period_end:
      params.renewalInfo?.autoRenewStatus === 0 ||
      params.renewalInfo?.autoRenewStatus === false,
    canceled_at:
      params.mappedStatus.status === 'canceled' || params.mappedStatus.status === 'expired'
        ? new Date().toISOString()
        : null,
    provider_customer_id: null,
    provider_subscription_id: params.originalTransactionId,
    provider_product_id: params.productId,
    provider_price_id: params.productId,
    provider_original_transaction_id: params.originalTransactionId,
    provider_transaction_id: params.transactionId,
    raw_provider_status: params.mappedStatus.raw,
    provider_metadata: {
      provider: 'apple',
      renewalInfo: params.renewalInfo,
      rawResponse: params.rawResponse,
    },
    last_verified_at: new Date().toISOString(),
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: params.productId,
  } satisfies CanonicalSubscriptionEntry;
}

async function listTargetOriginalTransactionIds(options: AppleReconciliationOptions) {
  if (options.originalTransactionId) {
    return [options.originalTransactionId];
  }

  const supabase = createAdminClient();
  const query = supabase
    .from('subscriptions')
    .select('provider_subscription_id, provider_original_transaction_id')
    .eq('provider', 'apple')
    .order('updated_at', { ascending: false })
    .limit(500);

  const filtered = options.userId ? query.eq('user_id', options.userId) : query;
  const { data, error } = await filtered;

  if (error) {
    throw new Error(`Failed to load Apple originals for reconciliation: ${error.message}`);
  }

  return Array.from(
    new Set(
      (data ?? [])
        .flatMap((row) => [row.provider_original_transaction_id, row.provider_subscription_id])
        .filter(Boolean)
    )
  ) as string[];
}

export async function reconcileAppleSubscriptions(options: AppleReconciliationOptions = {}): Promise<AppleReconciliationResult> {
  const originalTransactionIds = await listTargetOriginalTransactionIds(options);
  const result: AppleReconciliationResult = {
    dryRun: Boolean(options.dryRun),
    originalsScanned: 0,
    transactionsScanned: 0,
    wouldUpsertCount: 0,
    appliedCount: 0,
    unmappedTransactions: [],
  };

  for (const originalTransactionId of originalTransactionIds) {
    result.originalsScanned += 1;
    const statusResponse = await fetchAppleSubscriptionStatus(originalTransactionId);

    if (statusResponse.lastTransactions.length === 0) {
      const fallback = await fetchVerifiedAppleTransaction(originalTransactionId).catch(() => null);
      if (!fallback) continue;

      const userId = await findAppleUserId({
        originalTransactionId,
        appAccountToken: fallback.transactionInfo.appAccountToken ?? null,
        userId: options.userId,
      });

      if (!userId) {
        result.unmappedTransactions.push({
          originalTransactionId,
          transactionId: fallback.transactionInfo.transactionId ?? null,
        });
        continue;
      }

      const entry = buildAppleCanonicalEntry({
        userId,
        originalTransactionId,
        transactionId: fallback.transactionInfo.transactionId ?? null,
        environment: fallback.environment,
        productId: fallback.transactionInfo.productId ?? null,
        purchaseDate: fallback.transactionInfo.purchaseDate,
        expiresDate: fallback.transactionInfo.expiresDate,
        mappedStatus: {
          status:
            fallback.transactionInfo.expiresDate && fallback.transactionInfo.expiresDate > Date.now()
              ? 'active'
              : 'expired',
          raw: 'transaction_lookup_fallback',
        },
        renewalInfo: null,
        rawResponse: {
          source: 'transaction_lookup_fallback',
        },
      });

      result.transactionsScanned += 1;
      result.wouldUpsertCount += 1;
      const upserted = await upsertCanonicalSubscription(entry, {
        dryRun: options.dryRun,
      });
      if (upserted.applied) {
        result.appliedCount += 1;
      }
      continue;
    }

    for (const lastTransaction of statusResponse.lastTransactions) {
      result.transactionsScanned += 1;
      const userId = await findAppleUserId({
        originalTransactionId,
        appAccountToken: lastTransaction.transactionInfo?.appAccountToken ?? null,
        userId: options.userId,
      });

      if (!userId) {
        result.unmappedTransactions.push({
          originalTransactionId,
          transactionId: lastTransaction.transactionInfo?.transactionId ?? null,
        });
        continue;
      }

      const mappedStatus = mapAppleStatusCode(lastTransaction.status);
      const entry = buildAppleCanonicalEntry({
        userId,
        originalTransactionId,
        transactionId: lastTransaction.transactionInfo?.transactionId ?? null,
        environment: statusResponse.environment,
        productId:
          lastTransaction.transactionInfo?.productId ??
          lastTransaction.renewalInfo?.autoRenewProductId ??
          null,
        purchaseDate: lastTransaction.transactionInfo?.purchaseDate,
        expiresDate:
          lastTransaction.transactionInfo?.expiresDate ??
          lastTransaction.renewalInfo?.gracePeriodExpiresDate,
        mappedStatus,
        renewalInfo: lastTransaction.renewalInfo ?? null,
        rawResponse: statusResponse.raw,
      });

      result.wouldUpsertCount += 1;
      const upserted = await upsertCanonicalSubscription(entry, {
        dryRun: options.dryRun,
      });

      if (upserted.applied) {
        result.appliedCount += 1;
      }
    }
  }

  return result;
}
