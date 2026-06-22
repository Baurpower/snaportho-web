import { NextResponse } from 'next/server';

import { claimPendingBroBotSubscriptionForUser } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required', reason: 'not_authenticated' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const checkoutSessionId =
      typeof body.checkoutSessionId === 'string' ? body.checkoutSessionId : null;

    const result = await claimPendingBroBotSubscriptionForUser(user.id, user.email, {
      checkoutSessionId,
    });

    return NextResponse.json({
      claimed: result.status === 'claimed',
      result,
    });
  } catch (err) {
    console.error('[billing/claim-pending-subscription] error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to claim subscription' },
      { status: 500 }
    );
  }
}
