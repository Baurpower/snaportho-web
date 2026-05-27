import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import { syncSubscriptionFromStripe } from '@/lib/stripe';
import { BROBOT_CONFIG } from '@/lib/config/brobot';

/**
 * Safe manual sync/fallback for BroBot subscription status.
 * Call this from the billing page (or anywhere) when success param is present
 * but Supabase has not yet reflected the active subscription (e.g. webhook delay).
 *
 * Only for authenticated users. Uses server-side Stripe + admin Supabase.
 * Does not trust client data for activation.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Look up any existing subscription row for this user + plan to get Stripe IDs
    const { data: subRow } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('user_id', user.id)
      .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let synced = false;
    let message = 'No Stripe subscription data found yet.';

    if (subRow?.stripe_subscription_id) {
      // Prefer direct sub ID
      const sub = await stripe.subscriptions.retrieve(subRow.stripe_subscription_id);
      await syncSubscriptionFromStripe(sub);
      synced = true;
      message = 'Synced subscription by ID.';
    } else if (subRow?.stripe_customer_id) {
      // Fallback: list recent subs for the customer
      const subs = await stripe.subscriptions.list({
        customer: subRow.stripe_customer_id,
        limit: 3,
        status: 'all',
      });

      // Pick the most relevant (active or latest)
      const relevant = subs.data.find(s => ['active', 'trialing', 'past_due'].includes(s.status)) || subs.data[0];

      if (relevant) {
        await syncSubscriptionFromStripe(relevant);
        synced = true;
        message = 'Synced latest subscription for customer.';
      }
    } else {
      // Last resort: try to find customer via previous rows or create flow, but for now just report
      message = 'No customer or subscription ID on file yet. Complete checkout first.';
    }

    return NextResponse.json({ success: true, synced, message });
  } catch (err) {
    console.error('[billing/sync] error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
