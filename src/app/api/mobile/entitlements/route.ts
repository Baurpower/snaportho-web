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

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.warn('[mobile/entitlements] unauthenticated request rejected');
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
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
