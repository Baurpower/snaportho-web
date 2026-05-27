import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createBillingPortalSession } from '@/lib/stripe';
import { BROBOT_CONFIG } from '@/lib/config/brobot';

export async function POST() {
  if (!BROBOT_CONFIG.PAID_ENABLED) {
    return NextResponse.json({ error: 'Paid subscriptions are currently disabled' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { url } = await createBillingPortalSession(user.id);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[billing/portal] error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}