/**
 * BroBot Entitlements (Phase 1)
 *
 * Single source of truth for "can this subject make an AI request today?"
 *
 * This module is deliberately free of HTTP concerns so it can be unit tested
 * and reused by the proxy route, future webhooks (Stripe), and admin tools.
 *
 * Return shape is designed to be future-proof:
 *   - `unlimited` will be set by paid subscriptions in Phase 2
 *   - `dailyCap` and `remainingToday` drive the free/guest experience
 */

import { BROBOT_CONFIG } from '@/lib/config/brobot';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  doesSubscriptionGrantEntitlement,
  pickBestSubscriptionForEntitlement,
  type CanonicalSubscriptionRow,
} from '@/lib/subscriptions/ledger';

export type Subject =
  | { type: 'user'; id: string }
  | { type: 'guest'; id: string };

export interface BroBotEntitlement {
  aiAccess: {
    /** When true, this subject bypasses all daily caps (paid plan, admin override, etc.) */
    unlimited: boolean;
    /** The effective daily cap for this subject (null only for unlimited) */
    dailyCap: number | null;
    /** How many successful AI responses remain today (null when unlimited) */
    remainingToday: number | null;
  };
  /** Where the current entitlement decision came from (for UI + debugging) */
  source: 'override' | 'subscription' | 'free_quota' | 'guest_quota' | 'disabled';
  planCode?: string;
  expiresAt?: string | null;
  /** Subscription status from DB (active, past_due, etc.) */
  status?: string;
  /** Whether the user has requested cancellation at the end of the current period */
  cancelAtPeriodEnd?: boolean;

  // Additive fields for mobile entitlements + future Apple IAP (populated when relevant)
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  usedToday?: number;
  isInGracePeriod?: boolean;

  // Multi-provider / Apple IAP (additive)
  provider?: 'stripe' | 'apple' | string;
  providerSubscriptionId?: string | null;
  providerTransactionId?: string | null;
  environment?: string | null;
  appleOriginalTransactionId?: string | null;
  appleProductId?: string | null;
  appleExpiresAt?: string | null;
}

type SubscriptionEntitlementRow = {
  id?: string;
  user_id: string;
  status: string;
  plan_code: string;
  current_period_start?: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  provider: string | null;
  provider_subscription_id: string | null;
  provider_transaction_id: string | null;
  environment: string | null;
  last_verified_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type EntitlementProvider = 'apple' | 'stripe' | 'none';

export type EntitlementCandidateDiagnostic = {
  id: string | null;
  provider: string | null;
  providerSubscriptionId: string | null;
  providerTransactionId: string | null;
  appleOriginalTransactionId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  planCode: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  environment: string | null;
  grantsAccess: boolean;
  selected: boolean;
  reason: string;
};

export interface NormalizedBroBotEntitlement {
  access: 'free' | 'unlimited';
  planCode: 'free' | 'unlimited_brobot';
  provider: EntitlementProvider;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isVerified: boolean;
  verificationWarning: string | null;
  freeQuotaUsed: number;
  freeQuotaLimit: number;
  freeQuotaRemaining: number;
  freeQuotaResetAt: string;
  resolutionSource: string;
  resolutionReason: string;
  selectedSubscriptionId: string | null;
  selectedProvider: EntitlementProvider;
  selectedStatus: string | null;
  selectedCurrentPeriodEnd: string | null;
  debug?: {
    userId?: string;
    selectedSubscriptionRowId: string | null;
    selectionReason: string;
    candidates: EntitlementCandidateDiagnostic[];
    policy: string;
  };
}

export function pickBestEntitlingSubscriptionRow(
  rows: SubscriptionEntitlementRow[],
  now = new Date()
) {
  return pickBestSubscriptionForEntitlement(
    rows.map((row) => ({
      ...row,
      provider: row.provider ?? 'stripe',
    })) as CanonicalSubscriptionRow[],
    now
  ) as SubscriptionEntitlementRow | null;
}

function normalizeEntitlementProvider(provider: string | null | undefined): EntitlementProvider {
  if (provider === 'apple') return 'apple';
  if (provider === 'stripe' || provider == null) return 'stripe';
  return 'none';
}

function getSubscriptionCandidateReason(
  row: SubscriptionEntitlementRow,
  now: Date,
  grantsAccess: boolean,
  selected: boolean
) {
  if (selected) {
    return `selected_${row.status}_with_latest_valid_current_period_end`;
  }

  if (grantsAccess) {
    return 'valid_but_lower_priority_than_selected_subscription';
  }

  const periodEndTs = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
  const periodEndIsFuture = periodEndTs != null && Number.isFinite(periodEndTs) && periodEndTs > now.getTime();

  if ((row.status === 'active' || row.status === 'trialing') && !periodEndIsFuture) {
    return 'active_like_status_missing_or_past_current_period_end';
  }

  if (row.status === 'grace' && row.provider !== 'apple') {
    return 'grace_period_only_entitles_apple_subscriptions';
  }

  if (row.status === 'grace' && !periodEndIsFuture) {
    return 'apple_grace_period_missing_or_past_current_period_end';
  }

  if (row.status === 'billing_retry' && row.provider !== 'apple') {
    return 'billing_retry_only_entitles_apple_cached_subscriptions';
  }

  if (row.status === 'billing_retry' && !periodEndIsFuture) {
    return 'apple_billing_retry_missing_or_past_current_period_end';
  }

  if (row.status === 'canceled' || row.status === 'expired') {
    return periodEndIsFuture
      ? `${row.status}_status_does_not_grant_access_even_with_future_period_end`
      : `${row.status}_and_period_ended`;
  }

  return `status_${row.status || 'unknown'}_does_not_grant_access`;
}

export function evaluateSubscriptionCandidates(
  rows: SubscriptionEntitlementRow[],
  now = new Date()
) {
  const selected = pickBestEntitlingSubscriptionRow(rows, now);
  const selectedRowId = selected?.id ?? null;
  const selectedIdentity =
    selectedRowId ??
    selected?.provider_subscription_id ??
    selected?.stripe_subscription_id ??
    selected?.provider_transaction_id ??
    null;

  const candidates = rows.map((row) => {
    const grantsAccess = doesSubscriptionGrantEntitlement(
      {
        status: row.status as CanonicalSubscriptionRow['status'],
        provider: row.provider ?? 'stripe',
        current_period_end: row.current_period_end,
      },
      now
    );
    const rowIdentity =
      row.id ??
      row.provider_subscription_id ??
      row.stripe_subscription_id ??
      row.provider_transaction_id ??
      null;
    const isSelected = Boolean(selectedIdentity && rowIdentity === selectedIdentity);

    return {
      id: row.id ?? null,
      provider: row.provider ?? 'stripe',
      providerSubscriptionId: row.provider_subscription_id ?? row.stripe_subscription_id ?? null,
      providerTransactionId: row.provider_transaction_id ?? null,
      appleOriginalTransactionId: row.provider === 'apple' ? row.provider_subscription_id : null,
      stripeSubscriptionId: row.stripe_subscription_id ?? null,
      status: row.status,
      planCode: row.plan_code,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
      environment: row.environment ?? null,
      grantsAccess,
      selected: isSelected,
      reason: getSubscriptionCandidateReason(row, now, grantsAccess, isSelected),
    } satisfies EntitlementCandidateDiagnostic;
  });

  return {
    selected,
    selectedRowId,
    candidates,
    selectionReason: selected
      ? 'active_or_trialing_or_apple_grace_subscription_with_best_status_and_latest_current_period_end'
      : 'no_current_subscription_row_grants_unlimited_access',
  };
}

function getResolutionSource(params: {
  entitlement: BroBotEntitlement & { isLimitReached?: boolean };
  selected: SubscriptionEntitlementRow | null;
}) {
  if (params.entitlement.source === 'override') return 'legacy';
  if (params.entitlement.source === 'disabled') return 'disabled';
  if (params.entitlement.source !== 'subscription') return 'free_quota';

  const provider = params.entitlement.provider ?? params.selected?.provider ?? 'stripe';
  const environment = params.entitlement.environment ?? params.selected?.environment ?? null;
  if (provider === 'apple') {
    if (params.selected?.status === 'grace' || params.selected?.status === 'billing_retry') {
      return 'apple_cached';
    }
    return environment === 'sandbox' ? 'apple_sandbox' : 'apple_live';
  }
  if (provider === 'stripe') {
    return environment === 'test' ? 'stripe_test' : 'stripe_live';
  }
  return 'legacy';
}

function getResolutionReason(params: {
  entitlement: BroBotEntitlement & { isLimitReached?: boolean };
  selected: SubscriptionEntitlementRow | null;
  quotaRemaining: number;
}) {
  if (params.entitlement.source === 'override') {
    return 'Selected non-provider entitlement override';
  }
  if (params.entitlement.source === 'disabled') {
    return 'BroBot access is disabled by configuration or override';
  }
  if (params.entitlement.source !== 'subscription') {
    return params.quotaRemaining > 0
      ? 'No active paid subscription found; free quota available'
      : 'No active paid subscription found; free quota exhausted';
  }

  if (params.selected?.provider === 'apple') {
    if (params.selected.status === 'grace') {
      return 'Selected Apple subscription currently in grace period';
    }
    if (params.selected.status === 'billing_retry') {
      return 'Provider verification unavailable or billing retry active; cached Apple entitlement used until current period end';
    }
    return 'Selected newest active Apple subscription';
  }

  if (params.selected?.provider === 'stripe' || !params.selected?.provider) {
    if (params.selected?.status === 'trialing') {
      return 'Selected newest trialing Stripe subscription';
    }
    return 'Selected newest active Stripe subscription';
  }

  return 'Selected newest valid paid subscription';
}

/**
 * Returns the entitlement for a subject (user or guest).
 * This is the SINGLE source of truth for BroBot access decisions.
 */
export async function getUserEntitlement(subject: Subject): Promise<BroBotEntitlement> {
  if (process.env.NODE_ENV !== 'production' && subject.type === 'user') {
    console.log('[entitlements] getUserEntitlement called for user', { userId: subject.id });
  }

  if (!BROBOT_CONFIG.ENABLED) {
    return {
      aiAccess: { unlimited: false, dailyCap: 0, remainingToday: 0 },
      source: 'disabled',
    };
  }

  // 1 & 2. Check for admin entitlement override (fetched once, covers both cases)
  if (subject.type === 'user') {
    const override = await getActiveOverride(subject.id);
    if (override?.type === 'hard_disable') {
      return {
        aiAccess: { unlimited: false, dailyCap: 0, remainingToday: 0 },
        source: 'disabled',
        expiresAt: override.expires_at,
      };
    }
    if (override && (override.type === 'unlimited_permanent' || override.type === 'unlimited_until')) {
      return {
        aiAccess: { unlimited: true, dailyCap: null, remainingToday: null },
        source: 'override',
        expiresAt: override.expires_at,
      };
    }
  }

  // 3. Active paid subscription (Phase 2)
  if (subject.type === 'user' && BROBOT_CONFIG.PAID_ENABLED) {
    const subEntitlement = await getPaidSubscriptionEntitlement(subject.id);
    if (subEntitlement) {
      return subEntitlement;
    }
  }

  // 4. Free / Guest quota (Phase 1 behavior)
  const cap =
    subject.type === 'guest'
      ? BROBOT_CONFIG.GUEST_DAILY_CAP
      : BROBOT_CONFIG.FREE_DAILY_CAP;

  const used = await getUsedCountToday(subject);
  const remaining = Math.max(0, cap - used);

  return {
    aiAccess: {
      unlimited: false,
      dailyCap: cap,
      remainingToday: remaining,
    },
    source: subject.type === 'guest' ? 'guest_quota' : 'free_quota',
  };
}

/** Checks for an active entitlement override */
async function getActiveOverride(userId: string) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from('entitlement_overrides')
    .select('type, expires_at')
    .eq('user_id', userId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle();

  return data;
}

/** Checks for an active paid BroBot subscription with proper grace period logic */
async function getPaidSubscriptionEntitlement(userId: string): Promise<BroBotEntitlement | null> {
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from('subscriptions')
    .select(`
      id, user_id, status, plan_code, current_period_start, current_period_end, cancel_at_period_end, canceled_at,
      stripe_customer_id, stripe_subscription_id, stripe_price_id,
      provider, provider_subscription_id, provider_transaction_id, environment, last_verified_at, updated_at, created_at
    `)
    .eq('user_id', userId)
    .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(50);

  // [BROBOT-ENTITLEMENT-SELECT] - detailed row inspection for debugging Apple vs Stripe
  {
    console.log('[BROBOT-ENTITLEMENT-SELECT]', {
      userId: userId.slice(0, 8),
      rowsFound: rows?.length ?? 0,
      rows: (rows || []).map(r => ({
        provider: r.provider,
        plan_code: r.plan_code,
        status: r.status,
        current_period_end: r.current_period_end,
        environment: r.environment,
      })),
    });
  }

  const candidates = (rows ?? []) as SubscriptionEntitlementRow[];
  const now = new Date();
  const evaluation = evaluateSubscriptionCandidates(candidates, now);
  const sub = evaluation.selected;

  console.log('[BROBOT-ENTITLEMENT-RESOLUTION]', {
    user_id: userId,
    selected_subscription_row_id: evaluation.selectedRowId,
    provider: sub?.provider ?? null,
    provider_subscription_id: sub?.provider_subscription_id ?? sub?.stripe_subscription_id ?? null,
    original_transaction_id: sub?.provider === 'apple' ? sub.provider_subscription_id : null,
    status: sub?.status ?? null,
    current_period_end: sub?.current_period_end ?? null,
    reason_selected: evaluation.selectionReason,
    candidates: evaluation.candidates.map((candidate) => ({
      id: candidate.id,
      provider: candidate.provider,
      provider_subscription_id: candidate.providerSubscriptionId,
      original_transaction_id: candidate.appleOriginalTransactionId,
      status: candidate.status,
      current_period_end: candidate.currentPeriodEnd,
      grants_access: candidate.grantsAccess,
      selected: candidate.selected,
      reason: candidate.reason,
    })),
  });

  if (!sub) return null;

  // === DIAGNOSTIC LOG ===
  {
    const isActiveDecision = doesSubscriptionGrantEntitlement(
      {
        status: sub.status as CanonicalSubscriptionRow['status'],
        provider: sub.provider ?? 'stripe',
        current_period_end: sub.current_period_end,
      },
      now
    );

    let reasonIfInactive = null;
    if (!isActiveDecision) {
      const periodEndTs = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
      if ((sub.status === 'active' || sub.status === 'trialing') && (periodEndTs == null || periodEndTs <= now.getTime())) {
        reasonIfInactive = 'active_like_but_missing_or_ended_period';
      } else if (sub.status === 'expired' && periodEndTs && periodEndTs <= now.getTime()) {
        reasonIfInactive = 'expired_and_period_ended';
      } else if (sub.status === 'canceled') {
        reasonIfInactive = 'canceled_not_entitling';
      } else if (!['active','trialing','past_due'].includes(sub.status) && !sub.cancel_at_period_end) {
        reasonIfInactive = `status_${sub.status}_not_in_active_set_and_not_cancel_at_period_end`;
      } else {
        reasonIfInactive = 'fell_through_isActive_conditions';
      }
    }

    console.log('[SUBSCRIPTION-ENTITLEMENT-DEBUG]', {
      userId: userId.slice(0, 8),
      subscriptionRowUserId: sub.user_id ? sub.user_id.slice(0, 8) : null,
      status: sub.status,
      provider: sub.provider ?? null,
      plan_code: sub.plan_code,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at,
      isActive: isActiveDecision,
      reasonIfInactive,
    });

    // Required per-request log for Apple IAP status refresh tracing
    if (sub.provider === 'apple') {
      console.log('[APPLE-IAP-STATUS-REFRESH]', {
        userId: userId.slice(0, 8),
        originalTransactionId: sub.provider_subscription_id ?? null,
        appleStatus: sub.status,
        currentPeriodEnd: sub.current_period_end,
        grantsAccess: isActiveDecision,
      });
    }
  }

  const isActive = doesSubscriptionGrantEntitlement(
    {
      status: sub.status as CanonicalSubscriptionRow['status'],
      provider: sub.provider ?? 'stripe',
      current_period_end: sub.current_period_end,
    },
    now
  );

  // Compute grace separately so mobile (and future) can show "in grace" messaging
  const isInGracePeriod =
    Boolean(
      (sub.status === 'grace' && sub.provider === 'apple' && sub.current_period_end &&
        new Date(sub.current_period_end).getTime() > now.getTime())
    );

  if (isActive) {
    // Also attach today's usage count for the mobile contract (even for unlimited users)
    const usedToday = await getUsedCountToday({ type: 'user', id: userId });

    console.log('[ENTITLEMENTS]', {
      source: sub.provider ?? 'stripe',
      status: sub.status,
      plan: sub.plan_code,
      userId: userId.slice(0, 8),
      unlimitedAccess: true,
    });

    return {
      aiAccess: { unlimited: true, dailyCap: null, remainingToday: null },
      source: 'subscription',
      planCode: sub.plan_code,
      expiresAt: sub.current_period_end,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? undefined,
      // New additive fields
      stripeCustomerId: sub.stripe_customer_id ?? null,
      stripeSubscriptionId: sub.stripe_subscription_id ?? null,
      usedToday,
      isInGracePeriod,
      // Apple / multi-provider support
      provider: sub.provider ?? 'stripe',
      providerSubscriptionId: sub.provider_subscription_id ?? null,
      providerTransactionId: sub.provider_transaction_id ?? null,
      environment: sub.environment ?? null,
      appleOriginalTransactionId: sub.provider === 'apple' ? sub.provider_subscription_id : null,
      // Apple product ID is stored in stripe_price_id (semantically equivalent column).
      appleProductId: sub.provider === 'apple' ? (sub.stripe_price_id ?? null) : null,
      appleExpiresAt: sub.provider === 'apple' ? sub.current_period_end : null,
    };
  }

  return null;
}

/**
 * Returns how many successful BroBot uses the subject has consumed today.
 * Exported for reuse by mobile entitlement endpoint and other server code.
 * (Internal implementation details may change; use for count only.)
 */
export async function getUsedCountToday(subject: Subject): Promise<number> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

  // Build common filters first, apply subject filter conditionally,
  // then call terminal .maybeSingle() once at the end.
  let query = supabase
    .from('user_daily_usage')
    .select('count')
    .eq('usage_date', today)
    .eq('feature', BROBOT_CONFIG.FEATURE);

  if (subject.type === 'user') {
    query = query.eq('user_id', subject.id);
  } else {
    query = query.eq('guest_id', subject.id);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('[brobot] getUsedCountToday error', error);
    return 0; // fail open on read error (worst case: user gets one extra call)
  }
  return data?.count ?? 0;
}

/**
 * Computes the next daily reset time (start of tomorrow in UTC).
 * Used for free/guest daily quotas.
 */
export function getDailyResetAt(): string {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return tomorrow.toISOString();
}

/**
 * Convenience helper used by the proxy route.
 * Returns the entitlement plus a small derived object useful for responses.
 */
export async function getRemainingAIUses(subject: Subject) {
  const ent = await getUserEntitlement(subject);
  return {
    ...ent,
    isLimitReached: !ent.aiAccess.unlimited && (ent.aiAccess.remainingToday ?? 0) <= 0,
  };
}

async function getSubscriptionDiagnosticsForUser(userId: string, now: Date) {
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from('subscriptions')
    .select(`
      id, user_id, status, plan_code, current_period_start, current_period_end, cancel_at_period_end, canceled_at,
      stripe_customer_id, stripe_subscription_id, stripe_price_id,
      provider, provider_subscription_id, provider_transaction_id, environment, last_verified_at, updated_at, created_at
    `)
    .eq('user_id', userId)
    .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to load subscription entitlement candidates: ${error.message}`);
  }

  return evaluateSubscriptionCandidates((rows ?? []) as SubscriptionEntitlementRow[], now);
}

/**
 * Canonical API contract for web and mobile entitlement reads.
 *
 * Provider verification policy:
 * - Entitlement reads trust the local canonical subscription ledger until
 *   current_period_end. Stripe webhooks, Apple server notifications, and Apple
 *   restore/sync are responsible for provider verification and ledger writes.
 * - A temporary remote provider outage during restore/sync must not turn a
 *   current verified local row into "free"; it should surface on that write
 *   route while this resolver continues to use the cached row through period end.
 */
export async function getNormalizedBroBotEntitlement(
  subject: Subject,
  options: { includeDebug?: boolean } = {}
): Promise<NormalizedBroBotEntitlement & { data: Awaited<ReturnType<typeof getRemainingAIUses>> }> {
  const now = new Date();
  const legacy = await getRemainingAIUses(subject);
  const used = legacy.usedToday ?? (await getUsedCountToday(subject));
  const quotaLimit =
    subject.type === 'guest'
      ? BROBOT_CONFIG.GUEST_DAILY_CAP
      : BROBOT_CONFIG.FREE_DAILY_CAP;
  const quotaRemaining = Math.max(0, quotaLimit - used);

  const subscriptionEvaluation =
    subject.type === 'user' && BROBOT_CONFIG.PAID_ENABLED
      ? await getSubscriptionDiagnosticsForUser(subject.id, now)
      : null;
  const selected = subscriptionEvaluation?.selected ?? null;
  const provider =
    legacy.source === 'subscription'
      ? normalizeEntitlementProvider(legacy.provider ?? selected?.provider ?? 'stripe')
      : 'none';
  const isUnlimited = legacy.aiAccess.unlimited;
  const selectedSubscriptionId =
    selected?.provider_subscription_id ??
    selected?.stripe_subscription_id ??
    selected?.provider_transaction_id ??
    selected?.id ??
    null;
  const resolutionSource = getResolutionSource({ entitlement: legacy, selected });
  const resolutionReason = getResolutionReason({
    entitlement: legacy,
    selected,
    quotaRemaining,
  });

  const normalized: NormalizedBroBotEntitlement & { data: Awaited<ReturnType<typeof getRemainingAIUses>> } = {
    access: isUnlimited ? 'unlimited' : 'free',
    planCode: isUnlimited ? 'unlimited_brobot' : 'free',
    provider,
    status: legacy.status ?? null,
    currentPeriodEnd: legacy.expiresAt ?? null,
    cancelAtPeriodEnd: legacy.cancelAtPeriodEnd ?? false,
    isVerified: true,
    verificationWarning: null,
    freeQuotaUsed: used,
    freeQuotaLimit: quotaLimit,
    freeQuotaRemaining: quotaRemaining,
    freeQuotaResetAt: getDailyResetAt(),
    resolutionSource,
    resolutionReason,
    selectedSubscriptionId,
    selectedProvider: provider,
    selectedStatus: legacy.status ?? null,
    selectedCurrentPeriodEnd: legacy.expiresAt ?? null,
    data: legacy,
  };

  if (options.includeDebug && subscriptionEvaluation) {
    normalized.debug = {
      userId: subject.type === 'user' ? subject.id : undefined,
      selectedSubscriptionRowId: subscriptionEvaluation.selectedRowId,
      selectionReason: subscriptionEvaluation.selectionReason,
      candidates: subscriptionEvaluation.candidates,
      policy: 'trust_local_verified_subscription_rows_until_current_period_end; provider write paths perform remote verification',
    };
  }

  console.log('[BROBOT-ENTITLEMENT-NORMALIZED]', {
    user_id: subject.type === 'user' ? subject.id : null,
    access: normalized.access,
    planCode: normalized.planCode,
    provider: normalized.provider,
    status: normalized.status,
    currentPeriodEnd: normalized.currentPeriodEnd,
    resolutionSource: normalized.resolutionSource,
    resolutionReason: normalized.resolutionReason,
    selected_subscription_row_id: subscriptionEvaluation?.selectedRowId ?? null,
    reason_selected: subscriptionEvaluation?.selectionReason ?? 'non_user_or_paid_disabled',
  });

  return normalized;
}

// ============================================================================
// Mobile Entitlement Contract (additive, for iOS / future clients)
// ============================================================================

/**
 * Normalized entitlement payload designed for the Swift iOS app.
 * The backend remains the source of truth. Never trust client-side state.
 *
 * This shape is intentionally additive-friendly for future Apple IAP fields
 * (appleOriginalTransactionId, appleProductId, appleExpiresAt, entitlementSource, etc.)
 * without breaking existing web callers.
 *
 * Lifecycle fields (isCanceled, renewsAt, accessEndsAt, canManageStripe, canResubscribe)
 * allow the iOS UI to distinguish:
 *   - active + renewing  → show renewsAt, "Manage" CTA
 *   - canceled/ending    → show accessEndsAt, "Resubscribe" CTA
 *   - expired/free       → show free quota state, subscribe CTA
 */
export interface MobileBroBotEntitlement {
  access: 'free' | 'unlimited';
  planCode: string;
  provider: 'stripe' | 'apple' | 'none';
  isVerified: boolean;
  verificationWarning: string | null;
  freeQuotaUsed: number;
  freeQuotaLimit: number;
  freeQuotaRemaining: number;
  freeQuotaResetAt: string;
  resolutionSource: string;
  resolutionReason: string;
  selectedSubscriptionId: string | null;
  selectedProvider: 'stripe' | 'apple' | 'none';
  selectedStatus: string | null;
  selectedCurrentPeriodEnd: string | null;
  data?: Awaited<ReturnType<typeof getRemainingAIUses>>;

  hasBroBotAccess: boolean;
  hasUnlimitedBroBot: boolean;
  unlimitedAccess: boolean;
  plan: string; // e.g. 'unlimited_brobot', 'brobot_monthly', etc. Derived from DB plan_code for the subscription. Never null for paid Active cases.
  source: 'stripe' | 'apple' | 'promo' | 'free_quota' | 'disabled';
  entitlementSource: 'subscriptions' | 'override' | 'free_quota' | 'disabled';
  providerSource: 'stripe' | 'apple' | null;
  status: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isInGracePeriod: boolean;
  remainingFreeUses: number | null;
  remainingFreePreps: number | null;
  dailyLimit: number | null;
  usedToday: number | null;
  resetTime: string | null;
  lastSyncedAt: string;
  serverTime: string;

  // ── Subscription lifecycle fields ─────────────────────────────────────────
  // These allow the iOS UI to display the correct label and CTA without
  // re-deriving lifecycle state from raw status strings.
  //
  // Rule: subscriptionStatus='canceled' is NEVER treated as renewing, even if
  //       current_period_end is in the future and cancel_at_period_end=false.
  //       The two conditions are orthogonal — status is the authoritative signal.

  /** True when subscriptionStatus === 'canceled'. Access may still be active via accessEndsAt. */
  isCanceled: boolean;
  /**
   * Set only when the subscription is actively renewing (status='active' or 'trialing',
   * cancelAtPeriodEnd=false, not canceled). Null otherwise.
   * UI label: "Renews: <date>"
   */
  renewsAt: string | null;
  /**
   * Set when canceled or cancelAtPeriodEnd=true and current_period_end is in the future.
   * Represents the last day of paid access. Null when already expired.
   * UI label: "Ends: <date>" or "Access until: <date>"
   */
  accessEndsAt: string | null;
  /** True when the user can open the Stripe billing portal (active/trialing/past_due Stripe sub). */
  canManageStripe: boolean;
  /** True when the user should be offered a resubscribe CTA (canceled Stripe sub). */
  canResubscribe: boolean;

  // Additive server-owned free quota fields (for iOS + web dynamic UI)
  freeLimit?: number | null;
  usedThisPeriod?: number | null;
  remainingUses?: number | null;
  resetAt?: string | null;
  reasonIfBlocked?: string | null;

  // Future Apple IAP placeholders (always null until implemented)
  appleOriginalTransactionId?: string | null;
  appleProductId?: string | null;
  appleExpiresAt?: string | null;
}

/**
 * Returns the mobile-optimized entitlement for a logged-in user.
 * Thin mapping layer on top of the single centralized entitlement engine.
 * No guest fallback — mobile always requires an authenticated Supabase user.
 */
export async function getMobileBroBotEntitlement(userId: string): Promise<MobileBroBotEntitlement> {
  const now = new Date().toISOString();

  // === CRITICAL ALIGNMENT ===
  // We deliberately call the EXACT same internal path the website trusts:
  //   /api/me/entitlements  →  getRemainingAIUses({ type: "user", id })
  // This guarantees identical paid subscription decisions (getPaidSubscriptionEntitlement + overrides + grace).
  const normalized = await getNormalizedBroBotEntitlement({ type: 'user', id: userId });
  const ent = normalized.data; // BroBotEntitlement shape + isLimitReached

  // Safe debug logs (userId prefix only, no secrets)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[mobile-entitlement-mapper] website-decision', {
      userId: userId.slice(0, 8),
      websiteSource: ent.source,
      websiteUnlimited: ent.aiAccess.unlimited,
      websiteRemaining: ent.aiAccess.remainingToday,
      isLimitReached: ent.isLimitReached,
    });
  }

  const hasBroBotAccess =
    ent.aiAccess.unlimited || (ent.aiAccess.remainingToday ?? 0) > 0;
  const hasUnlimitedBroBot = ent.aiAccess.unlimited;

  // Map to mobile contract. Paid rows report source='subscriptions' plus a
  // separate provider so Stripe and Apple stay normalized without hiding origin.
  let plan: MobileBroBotEntitlement['plan'] = 'free';
  let mobileSource: 'stripe' | 'apple' | 'override' | 'free_quota' | 'disabled' = 'free_quota';

  if (ent.source === 'subscription') {
    // Derive plan from the actual subscription data (plan_code stored from Stripe metadata or default).
    // This ensures the iOS app receives a stable, non-null plan identifier instead of hard-coded or missing value.
    plan = ent.planCode || 'unlimited_brobot';
    // Support Apple IAP as first-class source (additive)
    mobileSource = (ent.provider === 'apple') ? 'apple' : 'stripe';
  } else if (ent.source === 'override') {
    plan = 'promo';
    mobileSource = 'override';
  } else if (ent.source === 'disabled') {
    plan = 'disabled';
    mobileSource = 'disabled';
  } else {
    plan = 'free';
    mobileSource = 'free_quota';
  }

  // Stripe fields are populated additively on the BroBotEntitlement when the central
  // paid path returns a subscription result (see getPaidSubscriptionEntitlement).
  const stripeCustomerId = ent.stripeCustomerId ?? null;
  const stripeSubscriptionId = ent.stripeSubscriptionId ?? null;
  const subscriptionStatus = ent.status ?? null;
  const currentPeriodEnd = ent.expiresAt ?? null;
  const cancelAtPeriodEnd = ent.cancelAtPeriodEnd ?? false;
  const isInGracePeriod = ent.isInGracePeriod ?? false;

  // ── Lifecycle fields ──────────────────────────────────────────────────────
  // isCanceled: status='canceled' is the authoritative signal. Do NOT derive
  // this from cancel_at_period_end alone — that flag means "will cancel at end
  // of period" but the sub is still active. A row with status='canceled' and
  // cancel_at_period_end=false (as observed in the bug) must still be isCanceled=true.
  const isCanceled = subscriptionStatus === 'canceled';

  // isScheduledToCancel: active sub that will not renew (cancel_at_period_end=true)
  const isScheduledToCancel = !isCanceled && cancelAtPeriodEnd;

  const nowTs = Date.now();
  const periodEndTs = currentPeriodEnd ? new Date(currentPeriodEnd).getTime() : null;
  const periodEndIsFuture = periodEndTs != null && periodEndTs > nowTs;

  // renewsAt: only when genuinely renewing — active/trialing, not canceled, not ending
  const isStripeOrApple = mobileSource === 'stripe' || mobileSource === 'apple';
  const isRenewing =
    isStripeOrApple &&
    !isCanceled &&
    !isScheduledToCancel &&
    (subscriptionStatus === 'active' || subscriptionStatus === 'trialing');
  const renewsAt = isRenewing && currentPeriodEnd ? currentPeriodEnd : null;

  // accessEndsAt: last day of paid access when canceled or scheduled to cancel
  const accessEndsAt =
    (isCanceled || isScheduledToCancel) && periodEndIsFuture && currentPeriodEnd
      ? currentPeriodEnd
      : null;

  // canManageStripe: portal is useful for active/trialing/past_due (not canceled — portal
  // may reject already-canceled subs and we don't want the user hitting a dead end)
  const hasStripeLinkage =
    mobileSource === 'stripe' &&
    stripeCustomerId != null &&
    stripeSubscriptionId != null;
  const canManageStripe =
    hasStripeLinkage &&
    !isCanceled &&
    (subscriptionStatus === 'active' ||
      subscriptionStatus === 'trialing' ||
      subscriptionStatus === 'past_due');

  // canResubscribe: offer a "Resubscribe" CTA when the Stripe sub is canceled
  // (access may still be valid through accessEndsAt, or may already be expired)
  const canResubscribe = mobileSource === 'stripe' && isCanceled;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[mobile-entitlement-mapper] lifecycle', {
      userId: userId.slice(0, 8),
      provider: ent.provider ?? null,
      subscriptionStatus,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      isCanceled,
      isScheduledToCancel,
      isRenewing,
      renewsAt,
      accessEndsAt,
      canManageStripe,
      canResubscribe,
    });
  }

  const usedToday = ent.usedToday ?? (await getUsedCountToday({ type: 'user', id: userId }));

  // Free quota additive fields (server-owned, derived from the aligned central result + config)
  const isUnlimited = ent.aiAccess.unlimited;
  const freeLimit = isUnlimited ? null : ent.aiAccess.dailyCap;
  const usedThisPeriod = usedToday;
  const remainingUses = isUnlimited ? null : (ent.aiAccess.remainingToday ?? null);
  const resetAt = isUnlimited ? null : getDailyResetAt();

  let reasonIfBlocked: string | null = null;
  if (ent.source === 'disabled') {
    reasonIfBlocked = 'disabled';
  } else if (!hasBroBotAccess && (ent.source === 'free_quota' || ent.source === 'guest_quota')) {
    reasonIfBlocked = 'daily_limit_reached';
  }

  const payload: MobileBroBotEntitlement = {
    access: normalized.access,
    planCode: normalized.planCode,
    provider: normalized.provider,
    isVerified: normalized.isVerified,
    verificationWarning: normalized.verificationWarning,
    freeQuotaUsed: normalized.freeQuotaUsed,
    freeQuotaLimit: normalized.freeQuotaLimit,
    freeQuotaRemaining: normalized.freeQuotaRemaining,
    freeQuotaResetAt: normalized.freeQuotaResetAt,
    resolutionSource: normalized.resolutionSource,
    resolutionReason: normalized.resolutionReason,
    selectedSubscriptionId: normalized.selectedSubscriptionId,
    selectedProvider: normalized.selectedProvider,
    selectedStatus: normalized.selectedStatus,
    selectedCurrentPeriodEnd: normalized.selectedCurrentPeriodEnd,
    data: normalized.data,

    hasBroBotAccess,
    hasUnlimitedBroBot,
    unlimitedAccess: hasUnlimitedBroBot,
    plan,
    source:
      ent.source === 'subscription'
        ? (ent.provider === 'apple' ? 'apple' : 'stripe')
        : ent.source === 'override'
          ? 'promo'
          : ent.source === 'disabled'
            ? 'disabled'
            : 'free_quota',
    entitlementSource:
      ent.source === 'subscription'
        ? 'subscriptions'
        : ent.source === 'override'
          ? 'override'
          : ent.source === 'disabled'
            ? 'disabled'
            : 'free_quota',
    providerSource: ent.source === 'subscription'
      ? (ent.provider === 'apple' ? 'apple' : 'stripe')
      : null,
    status: subscriptionStatus,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    isInGracePeriod,
    remainingFreeUses: isUnlimited ? null : (ent.aiAccess.remainingToday ?? null),
    remainingFreePreps: isUnlimited ? null : (ent.aiAccess.remainingToday ?? null),
    dailyLimit: ent.aiAccess.dailyCap,
    usedToday,
    resetTime: resetAt,
    lastSyncedAt: now,
    serverTime: now,

    // Lifecycle fields — explicit so iOS never has to re-derive from raw status strings
    isCanceled,
    renewsAt,
    accessEndsAt,
    canManageStripe,
    canResubscribe,

    // Additive server-owned fields for iOS
    freeLimit,
    usedThisPeriod,
    remainingUses,
    resetAt,
    reasonIfBlocked,

    // Apple IAP fields (populated when provider=apple from the central engine)
    appleOriginalTransactionId: ent.appleOriginalTransactionId ?? (ent as BroBotEntitlement & { providerSubscriptionId?: string }).providerSubscriptionId ?? null,
    appleProductId: ent.appleProductId ?? null,
    appleExpiresAt: ent.appleExpiresAt ?? (ent.provider === 'apple' ? ent.expiresAt : null),
  };

  // Additional required safe debug logs after mapping
  if (process.env.NODE_ENV !== 'production') {
    console.log('[mobile-entitlement-mapper] final', {
      userId: userId.slice(0, 8),
      hasBroBotAccess: payload.hasBroBotAccess,
      plan: payload.plan,
      source: payload.source,
      websiteSource: ent.source,
      websiteUnlimited: ent.aiAccess.unlimited,
    });
  }

  return payload;
}
