import { NextResponse } from 'next/server';
import { getMobileBearerUser } from '@/app/api/mobile/_utils/auth';
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
  const { user, response } = await getMobileBearerUser(request);
  if (response) return response;

  try {
    const payload: MobileBroBotEntitlement = await getMobileBroBotEntitlement(user.id);

    // Required safe debug logs (userId prefix only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[mobile/entitlements] website-aligned-decision', {
        userId: user.id.slice(0, 8),
        websiteSourceFromMapper: payload.source, // reflects the getRemainingAIUses decision
        hasBroBotAccess: payload.hasBroBotAccess,
        plan: payload.plan,
      });
    }

    // Enhanced debug: log the exact shape the iOS Account screen consumes (user id prefix only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[mobile/entitlements] FULL_PAYLOAD_FOR_IOS', {
        userId: user.id.slice(0, 8),
        hasBroBotAccess: payload.hasBroBotAccess,
        plan: payload.plan,
        source: payload.source,
        subscriptionStatus: payload.subscriptionStatus,
        currentPeriodEnd: payload.currentPeriodEnd,
        usedToday: payload.usedToday,
        // full object for complete trace (safe fields only)
        payload
      });
    }

    // Existing lightweight success log (kept for continuity)
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
