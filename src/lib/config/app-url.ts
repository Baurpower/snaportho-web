/**
 * Centralized application URL resolution for billing and redirects.
 *
 * This prevents production from ever accidentally generating localhost
 * Stripe success/cancel/return URLs when environment variables are missing.
 *
 * Usage:
 *   import { getAppBaseUrl, getBillingSuccessUrl, getBillingCancelUrl, getBillingPortalReturnUrl } from '@/lib/config/app-url';
 */

export function getAppBaseUrl(): string {
  // Prefer the standard public site URL env vars
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    '';

  if (raw && typeof raw === 'string') {
    const trimmed = raw.trim().replace(/\/+$/, '');
    if (trimmed) {
      // Ensure protocol
      const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
      return withProtocol;
    }
  }

  // In production we MUST have a real URL — never fall back to localhost
  if (process.env.NODE_ENV === 'production') {
    // Minimal logging (no secrets)
    console.error('[app-url] CRITICAL: Missing production base URL for billing redirects');
    throw new Error(
      'NEXT_PUBLIC_SITE_URL (or APP_URL / NEXT_PUBLIC_APP_URL) must be set to your production domain in production. ' +
      'Billing redirects cannot be generated safely without it.'
    );
  }

  // Development / local fallback only
  return 'http://localhost:3000';
}

export function getBillingSuccessUrl(): string {
  return `${getAppBaseUrl()}/account/billing?success=true`;
}

export function getBillingCancelUrl(): string {
  return `${getAppBaseUrl()}/account/billing?canceled=true`;
}

/**
 * Return URL used after leaving the Stripe Customer Portal.
 */
export function getBillingPortalReturnUrl(): string {
  return `${getAppBaseUrl()}/account/billing?portal_return=true`;
}
