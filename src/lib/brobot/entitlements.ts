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

  // Prefer active/past_due/trialing/canceling subscriptions over stale 'incomplete' placeholder rows.
  // Supports both Stripe and Apple (and future providers).
  // First try to find a "good" status row.
  let { data: sub } = await supabase
    .from('subscriptions')
    .select(`
      user_id, status, plan_code, current_period_end, cancel_at_period_end, canceled_at, 
      stripe_customer_id, stripe_subscription_id,
      provider, provider_subscription_id, provider_transaction_id, environment
    `)
    .eq('user_id', userId)
    .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!sub) {
    // Fallback to any row (including incomplete or canceled), still prefer latest period end
    const { data: fallback } = await supabase
      .from('subscriptions')
      .select(`
        user_id, status, plan_code, current_period_end, cancel_at_period_end, canceled_at, 
        stripe_customer_id, stripe_subscription_id,
        provider, provider_subscription_id, provider_transaction_id, environment
      `)
      .eq('user_id', userId)
      .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    sub = fallback;
  }

  if (!sub) return null;

  const now = new Date();
  const graceMs = BROBOT_CONFIG.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

  // === EXACT DIAGNOSTIC REQUESTED ===
  {
    const periodEndTs = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
    const nowTs = now.getTime();

    const isActiveDecision =
      sub.status === 'active' ||
      sub.status === 'trialing' ||
      (sub.status === 'past_due' && periodEndTs && periodEndTs + graceMs > nowTs) ||
      (sub.cancel_at_period_end && periodEndTs && periodEndTs > nowTs) ||
      (sub.status === 'canceled' && periodEndTs && periodEndTs > nowTs);

    let reasonIfInactive = null;
    if (!isActiveDecision) {
      if (sub.status === 'canceled' && periodEndTs && periodEndTs <= nowTs) {
        reasonIfInactive = 'canceled_and_period_ended';
      } else if (sub.status === 'canceled') {
        reasonIfInactive = 'canceled_but_no_remaining_period_logic_matched';
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
      plan_code: sub.plan_code,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at,
      isActive: isActiveDecision,
      reasonIfInactive,
    });
  }

  const isActive =
    sub.status === 'active' ||
    sub.status === 'trialing' ||
    (sub.status === 'past_due' && sub.current_period_end &&
      new Date(sub.current_period_end).getTime() + graceMs > now.getTime()) ||
    (sub.cancel_at_period_end && sub.current_period_end &&
      new Date(sub.current_period_end).getTime() > now.getTime()) ||
    // Honor remaining paid time even after explicit cancel (common SaaS behavior)
    (sub.status === 'canceled' && sub.current_period_end &&
      new Date(sub.current_period_end).getTime() > now.getTime());

  // Compute grace separately so mobile (and future) can show "in grace" messaging
  const isInGracePeriod =
    (sub.status === 'past_due' && sub.current_period_end &&
      new Date(sub.current_period_end).getTime() + graceMs > now.getTime()) ||
    (sub.cancel_at_period_end && sub.current_period_end &&
      new Date(sub.current_period_end).getTime() > now.getTime());

  if (isActive) {
    // Also attach today's usage count for the mobile contract (even for unlimited users)
    const usedToday = await getUsedCountToday({ type: 'user', id: userId });

    return {
      aiAccess: { unlimited: true, dailyCap: null, remainingToday: null },
      source: 'subscription',
      planCode: sub.plan_code,
      expiresAt: sub.current_period_end,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
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
      appleProductId: null, // not stored in this row (productId validated at sync time)
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

  const usedToday = ent.usedToday ?? (await getUsedCountToday({ type: 'user', id: userId }));

  // Free quota additive fields (server-owned, derived from the aligned central result + config)
  const isUnlimited = ent.aiAccess.unlimited;
  const freeLimit = isUnlimited ? null : ent.aiAccess.dailyCap;
  const usedThisPeriod = usedToday;
  const remainingUses = isUnlimited ? null : (ent.aiAccess.remainingToday ?? null);
  const resetAt = isUnlimited ? null : getDailyResetAt();

  let reasonIfBlocked: string | null = null;
  if (ent.source === 'disabled') {
    reasonIfBlocked = 'feature_disabled';
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
