import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getMobileBroBotEntitlement,
  type MobileBroBotEntitlement,
} from '@/lib/brobot/entitlements';

/**
 * Mobile BroBot Entitlements Endpoint
 *
 * GET /api/mobile/entitlements
 *
 * Purpose: Stable contract for the iOS (Swift) app to determine BroBot access
 * based on existing web Stripe subscriptions.
 *
 * - Requires authenticated Supabase user (no guest fallback).
 * - Thin wrapper around the centralized entitlement engine in entitlements.ts.
 * - Never trusts client-side state.
 * - Designed to be future-proof for Apple IAP (additive fields only).
 *
 * Do NOT modify donation flows or the legacy donations webhook.
 */

export async function GET(request: Request) {
  const supabase = await createClient();

  // TEMP DEBUG (safe): Check for native iOS Bearer token vs cookie auth
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const hasAuthorizationHeader = !!authHeader;
  const isBearer = authHeader?.toLowerCase().startsWith('bearer ');
  const authMode = isBearer ? 'bearer' : (hasAuthorizationHeader ? 'other' : 'cookie');

  let bearerToken: string | null = null;
  if (isBearer) {
    bearerToken = authHeader!.replace(/^Bearer\s+/i, '').trim();
  }

  // TEMP DEBUG (safe): Log only non-sensitive info
  if (process.env.NODE_ENV !== 'production') {
    console.log('[mobile/entitlements] AUTH_DEBUG', {
      hasAuthorizationHeader,
      authMode,
      tokenPrefix: bearerToken ? bearerToken.slice(0, 8) : null,
    });
  }

  // Support both cookie-based (web) and Bearer token (native iOS)
  const {
    data: { user },
    error: authError,
  } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();

  if (authError) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[mobile/entitlements] auth error', authError.message);
    }
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (!user) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[mobile/entitlements] no user found', { authMode });
    }
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // TEMP DEBUG (safe)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[mobile/entitlements] AUTH_DEBUG', {
      authMode,
      userFound: true,
      userId: user.id.slice(0, 8),
    });
  }

  try {
    const payload: MobileBroBotEntitlement = await getMobileBroBotEntitlement(user.id);

    // Lightweight success log (safe, no PII beyond user id prefix in prod)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[mobile/entitlements] success', {
        userId: user.id.slice(0, 8),
        source: payload.source,
        hasAccess: payload.hasBroBotAccess,
        plan: payload.plan,
      });
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[mobile/entitlements] unexpected error', {
      userId: user.id.slice(0, 8),
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      { error: 'Failed to load entitlements' },
      { status: 500 }
    );
  }
}
