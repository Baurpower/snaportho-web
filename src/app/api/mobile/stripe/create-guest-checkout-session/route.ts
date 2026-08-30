import { NextResponse } from 'next/server';

import { BROBOT_CONFIG } from '@/lib/config/brobot';
import { createGuestBroBotCheckoutSession } from '@/lib/stripe';

const SUCCESS_URL = 'snaportho://subscription/success?checkout_session_id={CHECKOUT_SESSION_ID}';
const CANCEL_URL = 'snaportho://subscription/cancel';

export async function POST(request: Request) {
  if (!BROBOT_CONFIG.PAID_ENABLED) {
    return NextResponse.json({ error: 'Paid subscriptions are currently disabled' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const branchIDFV = typeof body.branchIDFV === 'string' && /^[0-9a-f-]{36}$/i.test(body.branchIDFV)
    ? body.branchIDFV
    : undefined;
  const branchOSVersion = typeof body.branchOSVersion === 'string'
    ? body.branchOSVersion.slice(0, 30)
    : undefined;

  try {
    const { url } = await createGuestBroBotCheckoutSession('month', {
      enableTrial: true,
      source: 'ios_guest_paywall',
      customSuccessUrl: SUCCESS_URL,
      customCancelUrl: CANCEL_URL,
      branchIDFV,
      branchOSVersion,
    });
    if (!url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }
    return NextResponse.json({ url });
  } catch (error) {
    console.error('[mobile/stripe/guest-checkout] failed', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
