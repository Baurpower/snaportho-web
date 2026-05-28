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
  // First try to find a "good" status row.
  let { data: sub } = await supabase
    .from('subscriptions')
    .select('status, plan_code, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id')
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
      .select('status, plan_code, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id')
      .eq('user_id', userId)
      .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    sub = fallback;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[entitlements] getPaidSubscriptionEntitlement lookup', {
      userId,
      found: !!sub,
      status: sub?.status,
      planCode: sub?.plan_code,
      currentPeriodEnd: sub?.current_period_end,
      cancelAtPeriodEnd: sub?.cancel_at_period_end,
    });
  }

  if (!sub) return null;

  const now = new Date();
  const graceMs = BROBOT_CONFIG.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

  const isActive =
    sub.status === 'active' ||
    sub.status === 'trialing' ||
    (sub.status === 'past_due' && sub.current_period_end &&
      new Date(sub.current_period_end).getTime() + graceMs > now.getTime()) ||
    (sub.cancel_at_period_end && sub.current_period_end &&
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
  plan: 'free' | 'unlimited_brobot' | 'promo' | 'disabled';
  source: 'subscription' | 'override' | 'free_quota' | 'disabled';
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

  const ent = await getUserEntitlement({ type: 'user', id: userId });
  const usedToday = await getUsedCountToday({ type: 'user', id: userId });

  const hasBroBotAccess =
    ent.aiAccess.unlimited || (ent.aiAccess.remainingToday ?? 0) > 0;

  let plan: MobileBroBotEntitlement['plan'] = 'free';
  if (ent.source === 'subscription') {
    plan = 'unlimited_brobot';
  } else if (ent.source === 'override') {
    plan = 'promo';
  } else if (ent.source === 'disabled') {
    plan = 'disabled';
  }

  // Base stripe fields (populated by enhanced getPaidSubscriptionEntitlement when active)
  let stripeCustomerId: string | null = ent.stripeCustomerId ?? null;
  let stripeSubscriptionId: string | null = ent.stripeSubscriptionId ?? null;
  let subscriptionStatus: string | null = ent.status ?? null;
  let currentPeriodEnd: string | null = ent.expiresAt ?? null;
  let cancelAtPeriodEnd = ent.cancelAtPeriodEnd ?? false;
  let isInGracePeriod = ent.isInGracePeriod ?? false;

  // For canceled/expired subscriptions that no longer grant access,
  // still surface the historical Stripe IDs + status so the app can show
  // "You previously subscribed — restore / manage in billing" etc.
  // This is a pure data lookup; the access decision logic stays in getUserEntitlement.
  if ((!stripeCustomerId || !subscriptionStatus) && ent.source !== 'subscription') {
    try {
      const supabase = createAdminClient();
      const { data: subRow } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id, stripe_subscription_id, status, current_period_end, cancel_at_period_end')
        .eq('user_id', userId)
        .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subRow) {
        stripeCustomerId = subRow.stripe_customer_id ?? null;
        stripeSubscriptionId = subRow.stripe_subscription_id ?? null;
        subscriptionStatus = subRow.status ?? null;
        currentPeriodEnd = subRow.current_period_end ?? null;
        cancelAtPeriodEnd = subRow.cancel_at_period_end ?? false;

        // Recompute grace using the same constant/logic pattern (no duplication of full decision tree)
        const graceMs = BROBOT_CONFIG.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
        const periodEndDate = subRow.current_period_end ? new Date(subRow.current_period_end) : null;
        isInGracePeriod =
          (subRow.status === 'past_due' && periodEndDate &&
            periodEndDate.getTime() + graceMs > Date.now()) ||
          (subRow.cancel_at_period_end && periodEndDate &&
            periodEndDate.getTime() > Date.now());
      }
    } catch (e) {
      // Non-fatal for mobile response — we still return what we have
      console.error('[mobile/entitlements] secondary subscription lookup failed (non-fatal)', e);
    }
  }

  return {
    hasBroBotAccess,
    plan,
    source: ent.source === 'guest_quota' ? 'free_quota' : (ent.source as MobileBroBotEntitlement['source']),
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    isInGracePeriod,
    remainingFreeUses: ent.aiAccess.unlimited ? null : (ent.aiAccess.remainingToday ?? null),
    dailyLimit: ent.aiAccess.dailyCap,
    usedToday,
    lastSyncedAt: now,
    serverTime: now,

    // Future Apple fields (null until Apple IAP support is added)
    appleOriginalTransactionId: null,
    appleProductId: null,
    appleExpiresAt: null,
  };
}
