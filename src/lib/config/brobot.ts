/**
 * Centralized BroBot configuration (Phase 1)
 *
 * All caps, feature flags, and service URLs for BroBot AI usage MUST come from here.
 * This makes future changes (Stripe tiers, credit systems, emergency kill-switches) trivial.
 *
 * Environment variables (add to Vercel + .env.local):
 *   BROBOT_ENABLED=true
 *   BROBOT_GUEST_DAILY_CAP=2
 *   BROBOT_FREE_DAILY_CAP=5
 *   CASEPREP_INTERNAL_BASE_URL=https://api.snap-ortho.com   (server-only, preferred)
 *   BROBOT_GUEST_SECRET=super-long-random-string-for-signing-guest-cookies
 */

export const BROBOT_FEATURE = 'brobot' as const;

export const BROBOT_CONFIG = {
  /** Master kill switch. When false, all AI calls are rejected. */
  ENABLED: process.env.BROBOT_ENABLED !== 'false',

  /** Daily cap for completely unauthenticated guest users (via signed cookie) */
  GUEST_DAILY_CAP: parseInt(process.env.BROBOT_GUEST_DAILY_CAP || '2', 10),

  /** Daily cap for logged-in users who have no active paid subscription */
  FREE_DAILY_CAP: parseInt(process.env.BROBOT_FREE_DAILY_CAP || '5', 10),

  /** The single feature key used in user_daily_usage for all BroBot AI today.
   *  Future AI surfaces (Anki ortho-context, new tools, etc.) can share this or use their own.
   */
  FEATURE: BROBOT_FEATURE,
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
