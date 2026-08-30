import { NextResponse } from 'next/server';

import { getMobileBearerUser } from '@/app/api/mobile/_utils/auth';
import { claimPendingBroBotSubscriptionForUser } from '@/lib/stripe';

export async function POST(request: Request) {
  const { user, response } = await getMobileBearerUser(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const checkoutSessionId = typeof body.checkoutSessionId === 'string'
    ? body.checkoutSessionId.trim()
    : null;
  if (checkoutSessionId && !checkoutSessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Invalid checkout session' }, { status: 400 });
  }

  const result = await claimPendingBroBotSubscriptionForUser(user.id, user.email, {
    checkoutSessionId: checkoutSessionId || null,
  });
  return NextResponse.json({ claimed: result.status === 'claimed', result });
}
