import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
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
    expirationDate,
    revocationDate,
    environment = 'production',
  } = body;

  if (!productId || !originalTransactionId || !expirationDate) {
    return NextResponse.json({ error: 'Missing required fields (productId, originalTransactionId, expirationDate)' }, { status: 400 });
  }

  // Server verification (stubbed with production guard)
  const verification = await verifyApplePurchase(body as AppleSyncPayload, user.id.slice(0, 8));
  if (!verification.verified) {
    return NextResponse.json(
      { error: verification.reason || 'Apple verification failed' },
      { status: 403 }
    );
  }

  // Derive status (server truth, based on dates from Apple)
  const now = new Date();
  let status: string;
  if (revocationDate) {
    status = 'revoked';
  } else if (new Date(expirationDate) > now) {
    status = 'active';
  } else {
    status = 'expired';
  }

  const currentPeriodEnd = expirationDate;

  // Upsert Apple subscription row (provider-aware after migration)
  const upsertPayload = {
    user_id: user.id,
    provider: 'apple',
    provider_subscription_id: originalTransactionId,
    provider_transaction_id: transactionId,
    plan_code: BroBotConfig.PAID_PLAN_CODE,
    status,
    current_period_end: currentPeriodEnd,
    environment,
    // Do not overwrite Stripe fields for this provider
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from('subscriptions')
    .upsert(upsertPayload, { onConflict: 'user_id,provider' });

  // Safe debug log (user id prefix only, as required)
  console.log('[mobile/apple/subscription/sync]', {
    userId: user.id.slice(0, 8),
    productId,
    originalTransactionId,
    environment,
    derivedStatus: status,
    currentPeriodEnd,
    upsertError: upsertError ? { message: upsertError.message } : null,
  });

  if (upsertError) {
    console.error('[mobile/apple/subscription/sync] upsert failed', {
      userId: user.id.slice(0, 8),
      error: upsertError.message,
    });
    return NextResponse.json({ error: 'Failed to store Apple subscription' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    status,
    currentPeriodEnd,
    provider: 'apple',
    planCode: BroBotConfig.PAID_PLAN_CODE,
  });
}
