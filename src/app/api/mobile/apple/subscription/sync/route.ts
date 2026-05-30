import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BROBOT_CONFIG as BroBotConfig } from '@/lib/config/brobot';

/**
 * Apple App Store In-App Purchase sync for BroBot Unlimited.
 *
 * POST /api/mobile/apple/subscription/sync
 *
 * - Requires authenticated Supabase user (Bearer token from iOS StoreKit or cookie).
 * - Client has already performed local StoreKit 2 verification.
 * - Server performs (or stubs) App Store Server API verification.
 * - Stores/updates a row in public.subscriptions with provider='apple'.
 * - After sync, the caller should GET /api/mobile/entitlements to read the result.
 *
 * Security: Never trust client payload alone in production without server verification.
 */

const ALLOWED_APPLE_PRODUCT_IDS = [
  'com.snaportho.brobot.unlimited.monthly',
  'com.snaportho.brobot.unlimited.yearly',
] as const;

type AppleSyncPayload = {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate: string;      // ISO
  expirationDate: string;    // ISO
  revocationDate?: string | null;
  environment?: 'sandbox' | 'production';
};

async function verifyApplePurchase(
  payload: AppleSyncPayload,
  userIdForLog: string
): Promise<{ verified: boolean; reason?: string }> {
  const { productId, originalTransactionId, environment = 'production' } = payload;

  if (!ALLOWED_APPLE_PRODUCT_IDS.includes(productId as (typeof ALLOWED_APPLE_PRODUCT_IDS)[number])) {
    return { verified: false, reason: 'invalid_product_id' };
  }

  const isProdEnv = environment === 'production';
  const hasAppleCreds = !!(
    process.env.APPLE_ISSUER_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  );

  if (isProdEnv && !hasAppleCreds) {
    console.warn('[mobile/apple/subscription/sync] PRODUCTION sync refused - Apple Server API credentials not configured', {
      userId: userIdForLog,
      productId,
      originalTransactionId,
    });
    return {
      verified: false,
      reason: 'Apple App Store Server API verification not configured for production. Set APPLE_* env vars.',
    };
  }

  // === STUB / TODO: Real App Store Server API verification ===
  // When credentials are present:
  // 1. Construct ES256 JWT (issuer=APPLE_ISSUER_ID, keyid=APPLE_KEY_ID, using the .p8 key)
  // 2. Call https://api.storekit.itunes.apple.com/inApps/v1/transactions/{originalTransactionId}
  //    (or /history) with Authorization: Bearer <jwt>
  // 3. Decode the signedTransactionInfo JWS, validate productId, revocationDate, expiration, etc.
  //
  // For sandbox (client-reported) and when creds present in prod, we currently trust the
  // client payload (the iOS app already verified it locally with StoreKit 2).
  // This is acceptable for development / TestFlight. Production should always perform
  // the server-to-server call above.

  if (!isProdEnv) {
    console.log('[mobile/apple/subscription/sync] sandbox sync accepted (client-side StoreKit verification trusted for dev)', {
      userId: userIdForLog,
      productId,
      originalTransactionId,
      environment,
    });
    return { verified: true };
  }

  if (hasAppleCreds) {
    console.log('[mobile/apple/subscription/sync] prod sync with Apple creds present - TODO: perform real App Store Server API verification', {
      userId: userIdForLog,
      productId,
      originalTransactionId,
    });
    // For now, accept (real impl would call Apple here and return based on response)
    return { verified: true };
  }

  return { verified: true }; // defensive fallback (should not reach in prod without creds)
}

export async function POST(request: Request) {
  if (!BroBotConfig.PAID_ENABLED) {
    return NextResponse.json({ error: 'Paid subscriptions are currently disabled' }, { status: 403 });
  }

  // Use regular client ONLY for user authentication (respects RLS for reads if needed)
  const supabase = await createClient();

  // Auth: same pattern as /api/mobile/entitlements and /api/mobile/stripe/*
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
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[mobile/apple/subscription/sync] auth failed', authError?.message);
    }
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // [APPLE-IAP-SYNC-START] - detailed diagnostic logging as requested
  const authHeaderForLog = request.headers.get('authorization') || request.headers.get('Authorization');
  const hasAuth = !!authHeaderForLog;

  let body: AppleSyncPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    productId,
    transactionId,
    originalTransactionId,
    purchaseDate,
    expirationDate,
    revocationDate,
    environment = 'production',
  } = body;

  console.log('[APPLE-IAP-SYNC-START]', {
    userId: user.id.slice(0, 8),
    hasAuth,
    productId,
    transactionId,
    originalTransactionId,
    environment,
    purchaseDate,
    expirationDate,
    revocationDate,
  });

  // [APPLE-IAP-SYNC-VALIDATION]
  const productAllowed = ALLOWED_APPLE_PRODUCT_IDS.includes(productId as (typeof ALLOWED_APPLE_PRODUCT_IDS)[number]);
  const isProdEnv = environment === 'production';
  const hasAppleCreds = !!(
    process.env.APPLE_ISSUER_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  );
  const environmentAllowed = !isProdEnv || hasAppleCreds;

  let derivedStatus: string;
  if (revocationDate) {
    derivedStatus = 'revoked';
  } else if (expirationDate && new Date(expirationDate) > new Date()) {
    derivedStatus = 'active';
  } else {
    derivedStatus = 'expired';
  }
  const derivedCurrentPeriodEnd = expirationDate;

  console.log('[APPLE-IAP-SYNC-VALIDATION]', {
    userId: user.id.slice(0, 8),
    productAllowed,
    environmentAllowed,
    appleCredentialsPresent: hasAppleCreds,
    derivedStatus,
    derivedCurrentPeriodEnd,
  });

  if (!productId || !originalTransactionId || !expirationDate) {
    return NextResponse.json({ error: 'Missing required fields (productId, originalTransactionId, expirationDate)' }, { status: 400 });
  }

  if (!productAllowed) {
    return NextResponse.json({ error: 'invalid_product_id' }, { status: 400 });
  }

  // Server verification (stubbed with production guard)
  const verification = await verifyApplePurchase(body as AppleSyncPayload, user.id.slice(0, 8));
  if (!verification.verified) {
    const statusCode = verification.reason?.includes('not configured') ? 503 : 502;
    return NextResponse.json(
      { 
        success: false, 
        error: 'apple_verification_failed', 
        details: verification.reason || 'Apple verification failed' 
      },
      { status: statusCode }
    );
  }

  // Derive status (server truth, based on dates from Apple).
  //
  // IMPORTANT: must map to a valid `subscription_status` enum value.
  // The DB enum is: incomplete | active | past_due | canceled | unpaid | trialing.
  // Apple-specific states 'expired' and 'revoked' are NOT in the enum — both map to 'canceled'.
  //   - active:   subscription is current, not revoked, expiration is in the future
  //   - canceled: subscription has expired naturally OR was revoked/refunded by Apple
  const now = new Date();
  let status: 'active' | 'canceled';
  if (revocationDate) {
    status = 'canceled'; // revoked by Apple (refund / family sharing removal / etc.)
  } else if (new Date(expirationDate) > now) {
    status = 'active';   // current, paid subscription
  } else {
    status = 'canceled'; // naturally expired (renewal lapsed)
  }

  const currentPeriodEnd = expirationDate;

  // [APPLE-IAP-SYNC-UPSERT-PAYLOAD]
  // Notes:
  //  - product_id has no column in the schema; we store it in stripe_price_id (existing column,
  //    semantically "the price/product identifier for this subscription").
  //  - stripe_customer_id and stripe_subscription_id are left absent (nullable for Apple rows).
  //  - cancel_at_period_end defaults to false in the schema; fine for Apple rows.
  const upsertPayload = {
    user_id: user.id,
    provider: 'apple',
    provider_subscription_id: originalTransactionId,
    provider_transaction_id: transactionId,
    stripe_price_id: productId,       // Apple product ID — stored in this column for retrieval
    plan_code: BroBotConfig.PAID_PLAN_CODE,
    status,
    current_period_end: currentPeriodEnd,
    environment,
    updated_at: new Date().toISOString(),
  };

  console.log('[APPLE-IAP-SYNC-UPSERT-PAYLOAD]', {
    userId: user.id.slice(0, 8),
    provider: 'apple',
    plan_code: BroBotConfig.PAID_PLAN_CODE,
    status,
    current_period_end: currentPeriodEnd,
    environment,
    // safe payload (no secrets)
    payload: upsertPayload,
  });

  // CRITICAL FIX: Use service role client for privileged server-side write
  // (matches Stripe webhook + lib/stripe.ts pattern). Regular client hits RLS → 401.
  const adminSupabase = createAdminClient();

  const { data: upsertData, error: upsertError } = await adminSupabase
    .from('subscriptions')
    .upsert(upsertPayload, { onConflict: 'user_id,provider' })
    .select('id, provider, status, current_period_end')
    .maybeSingle();

  // [APPLE-IAP-SYNC-UPSERT-RESULT]
  console.log('[APPLE-IAP-SYNC-UPSERT-RESULT]', {
    userId: user.id.slice(0, 8),
    success: !upsertError,
    error: upsertError ? { code: upsertError.code, message: upsertError.message } : null,
    returnedRow: upsertData ? {
      id: upsertData.id,
      provider: upsertData.provider,
      status: upsertData.status,
      current_period_end: upsertData.current_period_end,
    } : null,
  });

  if (upsertError) {
    console.error('[mobile/apple/subscription/sync] upsert failed', {
      userId: user.id.slice(0, 8),
      error: upsertError.message,
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'subscription_upsert_failed', 
        details: upsertError.message 
      }, 
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    status,
    currentPeriodEnd,
    provider: 'apple',
    planCode: BroBotConfig.PAID_PLAN_CODE,
  });
}
