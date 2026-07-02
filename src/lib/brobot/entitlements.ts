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
  user_id: string;
  status: string;
  plan_code: string;
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
  updated_at?: string | null;
};

function getSubscriptionStatusRank(status: string) {
  switch (status) {
    case 'active':
      return 5;
    case 'trialing':
      return 4;
    case 'grace':
      return 3;
    case 'billing_retry':
      return 2;
    case 'past_due':
      return 1;
    default:
      return 0;
  }
}

export function pickBestEntitlingSubscriptionRow(
  rows: SubscriptionEntitlementRow[],
  now = new Date()
) {
  const nowTs = now.getTime();

  const entitlingRows = rows.filter((row) => {
    const periodEndTs = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
    const appleActiveIsValid =
      row.provider !== 'apple' ||
      (periodEndTs != null && periodEndTs > nowTs);

    return (
      (row.status === 'active' && appleActiveIsValid) ||
      row.status === 'trialing' ||
      (row.status === 'grace' && row.provider === 'apple' && periodEndTs != null && periodEndTs > nowTs)
    );
  });

  return entitlingRows.sort((left, right) => {
    const statusDiff = getSubscriptionStatusRank(right.status) - getSubscriptionStatusRank(left.status);
    if (statusDiff !== 0) return statusDiff;

    const periodDiff =
      (right.current_period_end ? new Date(right.current_period_end).getTime() : -Infinity) -
      (left.current_period_end ? new Date(left.current_period_end).getTime() : -Infinity);
    if (periodDiff !== 0) return periodDiff;

    return (
      (right.updated_at ? new Date(right.updated_at).getTime() : -Infinity) -
      (left.updated_at ? new Date(left.updated_at).getTime() : -Infinity)
    );
  })[0] ?? null;
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
      user_id, status, plan_code, current_period_end, cancel_at_period_end, canceled_at,
      stripe_customer_id, stripe_subscription_id, stripe_price_id,
      provider, provider_subscription_id, provider_transaction_id, environment, updated_at
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
  const sub = pickBestEntitlingSubscriptionRow(candidates, now);

  if (!sub) return null;

  // Apple subscriptions have no server-push notifications — status is only updated
  // when the iOS client calls /sync, which only happens while a transaction is in
  // Transaction.currentEntitlements. Once expired, the transaction leaves StoreKit
  // and no sync is ever sent, leaving a stale status='active' row in the DB.
  // Guard: Apple 'active' only grants access if current_period_end is still in the future.
  const periodEndTs = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const nowTs = now.getTime();
  const appleActiveIsValid =
    sub.provider !== 'apple' ||
    (periodEndTs != null && periodEndTs > nowTs);

  // === DIAGNOSTIC LOG ===
  {
    const isActiveDecision =
      (sub.status === 'active' && appleActiveIsValid) ||
      sub.status === 'trialing' ||
      (sub.status === 'grace' && sub.provider === 'apple' && periodEndTs && periodEndTs > nowTs);

    let reasonIfInactive = null;
    if (!isActiveDecision) {
      if (sub.provider === 'apple' && sub.status === 'active' && (periodEndTs == null || periodEndTs <= nowTs)) {
        reasonIfInactive = 'apple_active_but_period_ended';
      } else if (sub.status === 'expired' && periodEndTs && periodEndTs <= nowTs) {
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
      resolvedUserId: userId,
      subscriptionRowUserId: sub.user_id ?? null,
      status: sub.status,
      provider: sub.provider ?? null,
      plan_code: sub.plan_code,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at,
      appleActiveIsValid: sub.provider === 'apple' ? appleActiveIsValid : undefined,
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

  const isActive =
    (sub.status === 'active' && appleActiveIsValid) ||
    sub.status === 'trialing' ||
    (sub.status === 'grace' && sub.provider === 'apple' && sub.current_period_end &&
      new Date(sub.current_period_end).getTime() > now.getTime());

  // Compute grace separately so mobile (and future) can show "in grace" messaging
  const isInGracePeriod =
    Boolean(
      (sub.status === 'grace' && sub.provider === 'apple' && sub.current_period_end &&
        new Date(sub.current_period_end).getTime() > now.getTime())
    );

  if (isActive) {
    // Also attach today's usage count for the mobile contract (even for unlimited users)
    const usedToday = await getUsedCountToday({ type: 'user', id: userId });

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
  hasBroBotAccess: boolean;
  plan: string; // e.g. 'unlimited_brobot', 'brobot_monthly', etc. Derived from DB plan_code for the subscription. Never null for paid Active cases.
  source: 'stripe' | 'apple' | 'override' | 'free_quota' | 'disabled'; // 'stripe' or 'apple' for paid BroBot subscriptions
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isInGracePeriod: boolean;
  remainingFreeUses: number | null;
  dailyLimit: number | null;
  usedToday: number | null;
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
  const websiteResult = await getRemainingAIUses({ type: 'user', id: userId });
  const ent = websiteResult; // BroBotEntitlement shape + isLimitReached

  // Safe debug logs (userId prefix only, no secrets)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[mobile-entitlement-mapper] website-decision', {
      userId: userId.slice(0, 8),
      websiteSource: ent.source,
      websiteUnlimited: ent.aiAccess.unlimited,
      websiteRemaining: ent.aiAccess.remainingToday,
      isLimitReached: websiteResult.isLimitReached,
    });
  }

  const hasBroBotAccess =
    ent.aiAccess.unlimited || (ent.aiAccess.remainingToday ?? 0) > 0;

  // Map to mobile contract.
  // Per requirements: website source "subscription" → mobile source "stripe" (web Stripe subs)
  let plan: MobileBroBotEntitlement['plan'] = 'free';
  let mobileSource: MobileBroBotEntitlement['source'] = 'free_quota';

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
    hasBroBotAccess,
    plan,
    source: mobileSource,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    isInGracePeriod,
    remainingFreeUses: isUnlimited ? null : (ent.aiAccess.remainingToday ?? null),
    dailyLimit: ent.aiAccess.dailyCap,
    usedToday,
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
