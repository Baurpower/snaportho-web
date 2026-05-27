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
    .select('status, plan_code, current_period_end, cancel_at_period_end')
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
      .select('status, plan_code, current_period_end, cancel_at_period_end')
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

  if (isActive) {
    return {
      aiAccess: { unlimited: true, dailyCap: null, remainingToday: null },
      source: 'subscription',
      planCode: sub.plan_code,
      expiresAt: sub.current_period_end,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  }

  return null;
}

/**
 * Internal: how many successful uses has this subject consumed today?
 */
async function getUsedCountToday(subject: Subject): Promise<number> {
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
