import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Temporary diagnostic endpoint for Apple IAP + BroBot debugging.
 *
 * GET /api/mobile/apple/subscription/debug
 *
 * Returns the raw (but safe) subscription rows for the authenticated user.
 * Only for authenticated users. Do not expose to guests.
 *
 * Auth: Bearer token (iOS) or cookie (web).
 * Read: uses service-role admin client to avoid any anon-role SELECT grant issues
 *       (same pattern as the rest of the entitlement engine).
 */
export async function GET(request: Request) {
  // Use session client ONLY for user verification
  const supabase = await createClient();

  // Support Bearer (iOS) and cookie auth
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const isBearer = authHeader?.toLowerCase().startsWith('bearer ');
  let bearerToken: string | null = null;
  if (isBearer) {
    bearerToken = authHeader!.replace(/^Bearer\s+/i, '').trim();
  }

  const {
    data: { user },
    error: authError,
  } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Use admin client for the read — consistent with all other subscription reads in
  // the entitlement engine (createAdminClient bypasses any anon/authenticated grant gaps).
  const adminSupabase = createAdminClient();

  const { data: rows, error } = await adminSupabase
    .from('subscriptions')
    .select('provider, plan_code, status, current_period_end, environment, stripe_price_id, provider_subscription_id, provider_transaction_id, updated_at, created_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[mobile/apple/subscription/debug] query error', error.message);
    return NextResponse.json({ error: 'Failed to load subscriptions' }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeRows = (rows || []).map((r: any) => ({
    provider: r.provider,
    planCode: r.plan_code,
    status: r.status,
    currentPeriodEnd: r.current_period_end,
    environment: r.environment,
    // Apple product ID is stored in stripe_price_id for Apple rows
    appleProductId: r.provider === 'apple' ? (r.stripe_price_id ?? null) : null,
    providerSubscriptionIdPresent: !!r.provider_subscription_id,
    providerTransactionIdPresent: !!r.provider_transaction_id,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
  }));

  return NextResponse.json({
    userIdPrefix: user.id.slice(0, 8),
    subscriptions: safeRows,
  });
}
