/**
 * Centralized BroBot configuration (Phase 1)
 *
 * All caps, feature flags, and service URLs for BroBot AI usage MUST come from here.
 * This makes future changes (Stripe tiers, credit systems, emergency kill-switches) trivial.
 *
 * Environment variables (add to Vercel + .env.local):
 *   BROBOT_ENABLED=true
 *   BROBOT_GUEST_DAILY_CAP=1
 *   BROBOT_FREE_DAILY_CAP=3
 *   CASEPREP_INTERNAL_BASE_URL=https://api.snap-ortho.com   (server-only, preferred)
 *   BROBOT_GUEST_SECRET=super-long-random-string-for-signing-guest-cookies
 *   STRIPE_BROBOT_TRIAL_OFFER_ID=to_...
 *   STRIPE_BROBOT_TRIAL_MONTHS=1
 */

import {
  getAppBaseUrl,
  getBillingSuccessUrl,
  getBillingCancelUrl,
} from './app-url';

export const BROBOT_FEATURE = 'brobot' as const;

export const BROBOT_CONFIG = {
  /** Master kill switch. When false, all AI calls are rejected. */
  ENABLED: process.env.BROBOT_ENABLED !== 'false',

  /** Explicit gate for the authenticated Orthobullets browser-extension surface. */
  ORTHOBULLETS_ENABLED: process.env.BROBOT_ORTHOBULLETS_ENABLED !== 'false',

  /** Daily cap for completely unauthenticated guest users (via signed cookie) */
  GUEST_DAILY_CAP: parseInt(process.env.BROBOT_GUEST_DAILY_CAP || '1', 10),

  /** Daily cap for logged-in users who have no active paid subscription */
  FREE_DAILY_CAP: parseInt(process.env.BROBOT_FREE_DAILY_CAP || '3', 10),

  /** Personal-statement product boundaries (server-owned, not duplicated in clients). */
  PS_COMPARISON_PAID_ONLY: process.env.BROBOT_PS_COMPARISON_PAID_ONLY !== 'false',
  PS_FREE_HISTORY_LIMIT: parseInt(process.env.BROBOT_PS_FREE_HISTORY_LIMIT || '5', 10),
  PS_PAID_HISTORY_LIMIT: parseInt(process.env.BROBOT_PS_PAID_HISTORY_LIMIT || '50', 10),

  /** The single feature key used in user_daily_usage for all BroBot AI today.
   *  Future AI surfaces (Anki ortho-context, new tools, etc.) can share this or use their own.
   */
  FEATURE: BROBOT_FEATURE,

  // ─────────────────────────────────────────────────────────────
  // Phase 2: Paid "Unlimited BroBot" configuration
  // ─────────────────────────────────────────────────────────────

  /** Master switch for paid subscription features. */
  PAID_ENABLED: process.env.BROBOT_PAID_ENABLED !== 'false',

  /** Stripe Price IDs (set in env + Vercel). Never hardcode elsewhere. */
  MONTHLY_PRICE_ID: process.env.STRIPE_BROBOT_MONTHLY_PRICE_ID || '',
  YEARLY_PRICE_ID: process.env.STRIPE_BROBOT_YEARLY_PRICE_ID || '',

  /**
   * Official Stripe Trial Offer ID for Dashboard/API traceability.
   * Stripe Checkout cannot attach Trial Offer objects directly; web Checkout uses
   * a calendar-month trial_end and records this ID in metadata when the trial applies.
   */
  TRIAL_OFFER_ID: process.env.STRIPE_BROBOT_TRIAL_OFFER_ID || 'to_1Tk6xTArNRAa5suA9q50NzAV',
  TRIAL_MONTHS: parseInt(process.env.STRIPE_BROBOT_TRIAL_MONTHS || '1', 10),

  /** Human-readable plan codes used in DB and entitlement logic. */
  PAID_PLAN_CODE: 'unlimited_brobot',

  /** Number of days a past_due subscription still grants unlimited access. */
  GRACE_PERIOD_DAYS: parseInt(process.env.BROBOT_GRACE_PERIOD_DAYS || '7', 10),

  /**
   * Base site URL (always absolute, no trailing slash).
   * Delegates to centralized app-url helper which:
   *   - Throws with clear error in production if no valid URL env var is set
   *   - Falls back to localhost only in development
   */
  SITE_URL: getAppBaseUrl(),

  /** URLs for post-checkout and portal redirects. Centralized to guarantee production safety. */
  BILLING_SUCCESS_URL: getBillingSuccessUrl(),
  BILLING_CANCEL_URL: getBillingCancelUrl(),
} as const;

export type BroBotFeature = typeof BROBOT_FEATURE;

/**
 * Returns the internal (server-to-server) CasePrep base URL.
 * We deliberately prefer CASEPREP_INTERNAL_BASE_URL over the public one
 * so the expensive AI calls never rely on a client-exposed variable.
 */
export function getCasePrepInternalBaseUrl(): string {
  const configured = process.env.CASEPREP_INTERNAL_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  // Only allow the public default in non-production for local dev convenience
  if (process.env.NODE_ENV !== 'production') {
    return 'https://api.snap-ortho.com';
  }

  throw new Error(
    'CASEPREP_INTERNAL_BASE_URL is required in production for secure BroBot proxying.'
  );
}

/**
 * Secret used to sign/verify guest session cookies.
 * Must be a long, random, server-only value.
 */
export function getBroBotGuestSecret(): string {
  const secret = process.env.BROBOT_GUEST_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BROBOT_GUEST_SECRET must be set to a strong value (≥32 chars) in production');
    }
    // Dev fallback (never use in prod)
    return 'dev-only-insecure-guest-secret-change-me-immediately';
  }
  return secret;
}
