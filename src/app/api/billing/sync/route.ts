import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { reconcileStripeSubscriptions } from '@/lib/subscriptions/stripe-reconciliation';
import { BROBOT_CONFIG } from '@/lib/config/brobot';

/**
 * Safe manual Stripe-only sync/fallback for BroBot subscription status.
 *
 * Call from /checkout/success or billing when webhook propagation is delayed.
 * Only reconciles provider=stripe rows via reconcileStripeSubscriptions — never
 * reads or mutates provider=apple subscriptions.
 *
 * Recovery order for first-time buyers:
 *   1. Stripe customer ids already linked in subscriptions (provider=stripe)
 *   2. Stripe customer.metadata.user_id search
 *   3. Unambiguous verified auth email match in Stripe (exactly one customer)
 *
 * Stripe Dashboard replay (after middleware fix):
 *   Developers → Webhooks → select endpoint → failed event → Resend
 * Or run: npx tsx scripts/reconcile-brobot-stripe-subscriptions.ts --email <user>
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { data: subRows } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status, current_period_end, updated_at')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(25);

    const customerId = subRows?.find((row) => row.stripe_customer_id)?.stripe_customer_id ?? null;
    const reconciliation = await reconcileStripeSubscriptions({
      userId: user.id,
      userEmail: user.email ?? null,
      stripeCustomerId: customerId,
      dryRun: false,
    });
    const reconciledSubscriptions = reconciliation.resolvedMappings
      .filter((row) => row.userId === user.id)
      .map((row) => ({
        id: row.subscriptionId,
        customerId: row.customerId,
        source: row.source,
      }));

    return NextResponse.json({
      success: true,
      synced: reconciliation.appliedCount > 0,
      message: reconciliation.appliedCount > 0
        ? `Synced ${reconciliation.appliedCount} Stripe subscription(s) for ${customerId ?? 'the mapped customer'}.`
        : 'No Stripe customer or BroBot subscriptions were found to reconcile.',
      customerId,
      summary: {
        customersScanned: reconciliation.customersScanned,
        subscriptionsScanned: reconciliation.subscriptionsScanned,
        matchedSubscriptions: reconciliation.matchedSubscriptions,
        wouldUpsertCount: reconciliation.wouldUpsertCount,
        appliedCount: reconciliation.appliedCount,
      },
      subscriptions: reconciledSubscriptions,
      unmappedSubscriptions: reconciliation.unmappedSubscriptions,
    });
  } catch (err) {
    console.error('[billing/sync] error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
