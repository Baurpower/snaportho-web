import { NextResponse } from 'next/server';

import {
  claimableBillingUserHttpError,
  getClaimableBillingUser,
} from '@/lib/auth/claimable-billing-user';
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

  const claimable = getClaimableBillingUser(user);
  if (!claimable.ok) {
    const error = claimableBillingUserHttpError(claimable.reason);
    return NextResponse.json(
      { error: error.error, reason: error.reason },
      { status: error.status }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const checkoutSessionId =
      typeof body.checkoutSessionId === 'string' ? body.checkoutSessionId : null;

    const result = await claimPendingBroBotSubscriptionForUser(claimable.user.id, claimable.user.email, {
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
