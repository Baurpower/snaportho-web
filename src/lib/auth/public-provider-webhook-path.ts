/**
 * Narrow allowlist for provider billing webhooks that must bypass Supabase session
 * middleware. Signature / payload verification stays inside each handler.
 */

export const PUBLIC_PROVIDER_WEBHOOK_POST_PATHS = [
  '/api/stripe/webhook',
  '/api/stripe/donation-webhook',
  '/api/apple/notifications',
] as const;

/** Apple notifications expose a GET health probe on the same route. */
export const PUBLIC_PROVIDER_WEBHOOK_GET_PATHS = ['/api/apple/notifications'] as const;

export function isPublicProviderWebhookPath(pathname: string, method: string): boolean {
  const normalizedMethod = method.toUpperCase();

  if (normalizedMethod === 'POST') {
    return (PUBLIC_PROVIDER_WEBHOOK_POST_PATHS as readonly string[]).includes(pathname);
  }

  if (normalizedMethod === 'GET') {
    return (PUBLIC_PROVIDER_WEBHOOK_GET_PATHS as readonly string[]).includes(pathname);
  }

  return false;
}