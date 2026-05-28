import { NextResponse } from 'next/server';

import { getGuestSessionFromRequest } from '@/lib/brobot/guest-session';
import { getRemainingAIUses, getDailyResetAt } from '@/lib/brobot/entitlements';
import { BROBOT_CONFIG } from '@/lib/config/brobot';

/**
 * Public (cookie-based) guest BroBot entitlement endpoint.
 *
 * Used by website guest UI (proactive display) and can be used by iOS for
 * guest-mode BroBot without requiring a Supabase user.
 *
 * Guests MUST NOT call the authenticated /api/mobile/entitlements.
 *
 * Returns server-owned quota values so changing env vars instantly affects clients.
 */
export async function GET(request: Request) {
  const guestSession = getGuestSessionFromRequest(request);

  if (!guestSession) {
    // No (or invalid/expired) guest session cookie yet → they have the full daily cap available.
    const freeLimit = BROBOT_CONFIG.GUEST_DAILY_CAP;
    const resetAt = getDailyResetAt();

    return NextResponse.json({
      freeLimit,
      usedThisPeriod: 0,
      remainingUses: freeLimit,
      resetAt,
      reasonIfBlocked: null,
    });
  }

  const subject = { type: 'guest' as const, id: guestSession.guestId };
  const ent = await getRemainingAIUses(subject);

  const freeLimit = ent.aiAccess.dailyCap;
  const remainingUses = ent.aiAccess.remainingToday;
  const usedThisPeriod = freeLimit != null && remainingUses != null
    ? Math.max(0, freeLimit - remainingUses)
    : 0;

  const resetAt = getDailyResetAt();
  const reasonIfBlocked = ent.isLimitReached ? 'daily_limit_reached' : null;

  return NextResponse.json({
    freeLimit,
    usedThisPeriod,
    remainingUses,
    resetAt,
    reasonIfBlocked,
  });
}
