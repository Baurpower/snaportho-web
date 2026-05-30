import { NextResponse } from 'next/server';

import { createGuestSession, getGuestSessionFromRequest } from '@/lib/brobot/guest-session';
import { getRemainingAIUses, getDailyResetAt } from '@/lib/brobot/entitlements';

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
  let guestSession = getGuestSessionFromRequest(request);
  let guestCookieToSet: string | null = null;

  if (!guestSession) {
    const createdGuest = createGuestSession();
    guestSession = createdGuest.session;
    guestCookieToSet = createdGuest.cookie;
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

  const response = NextResponse.json({
    freeLimit,
    usedThisPeriod,
    remainingUses,
    resetAt,
    reasonIfBlocked,
  });

  if (guestCookieToSet) {
    response.headers.append('Set-Cookie', guestCookieToSet);
  }

  return response;
}
