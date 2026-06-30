import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getStripe } from '@/lib/stripe';
import { getRemainingAIUses } from '@/lib/brobot/entitlements';
import { BROBOT_CONFIG } from '@/lib/config/brobot';
import type Stripe from 'stripe';

/**
 * One-time admin/debug endpoint for BroBot subscription activation troubleshooting.
 * 
 * For the authenticated user, returns:
 * - Supabase auth user id + email
 * - Supabase subscriptions row for the paid BroBot plan
 * - Stripe customer + latest subscriptions (via Stripe API)
 * - Current entitlement result from the same logic the UI uses
 *
 * Protected: requires login. Only returns data for the caller.
 * Safe for production debugging by the account owner.
 * Do not log secrets.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  interface DebugResult {
    user: { id: string; email: string | undefined };
    supabaseSubscriptions: Record<string, unknown>[]; // raw rows are fine for debug
    stripeCustomer: { id: string; email?: string; created?: number } | null;
    stripeSubscriptions: Record<string, unknown>[];
    entitlement: Record<string, unknown> | null;
    planCode: string;
    stripeError?: string;
    error?: string;
  }

  const result: DebugResult = {
    user: {
      id: user.id,
      email: user.email,
    },
    supabaseSubscriptions: [],
    stripeCustomer: null,
    stripeSubscriptions: [],
    entitlement: null,
    planCode: BROBOT_CONFIG.PAID_PLAN_CODE,
  };

  try {
    const stripe = getStripe();
    // Supabase subscriptions row
    const { data: subRows } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(10);

    result.supabaseSubscriptions = subRows ?? [];

    // Try to get Stripe customer from the row or via getOrCreate (read-only here)
    const customerId = (subRows ?? []).find((row) => row.stripe_customer_id)?.stripe_customer_id;

    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        result.stripeCustomer = {
          id: customer.id,
          email: customer.email ?? undefined,
          created: (customer as { created?: number }).created,
        };

        const subs = await stripe.subscriptions.list({
          customer: customerId,
          limit: 5,
          status: 'all',
        });

        result.stripeSubscriptions = subs.data.map(s => ({
          id: s.id,
          status: s.status,
          current_period_end: s.items.data[0]?.current_period_end,
          cancel_at_period_end: s.cancel_at_period_end,
          metadata: s.metadata,
          priceId: s.items.data[0]?.price.id,
        }));
      } catch (stripeErr: unknown) {
        result.stripeError = stripeErr instanceof Error ? stripeErr.message : 'Stripe error';
      }
    }

    // Current entitlement (exact same as UI uses)
    const entitlement = await getRemainingAIUses({ type: 'user', id: user.id });
    result.entitlement = entitlement;

  } catch (err: unknown) {
    result.error = err instanceof Error ? err.message : 'Unknown error';
  }

  return NextResponse.json(result);
}
