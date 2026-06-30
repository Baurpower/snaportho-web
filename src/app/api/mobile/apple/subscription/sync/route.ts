import { NextResponse } from 'next/server';

import {
  fetchVerifiedAppleTransaction,
  isAppleServerConfigured,
  type AppleEnvironment,
  upsertAppleSubscriptionForUser,
} from '@/lib/apple/app-store-server';
import { BROBOT_CONFIG as BroBotConfig } from '@/lib/config/brobot';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

const ALLOWED_APPLE_PRODUCT_IDS = [
  'com.snaportho.brobot.unlimited.monthly',
  'com.snaportho.brobot.unlimited.yearly',
] as const;

type AppleSyncPayload = {
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  environment?: AppleEnvironment;
};

export async function POST(request: Request) {
  if (!BroBotConfig.PAID_ENABLED) {
    return NextResponse.json({ error: 'Paid subscriptions are currently disabled' }, { status: 403 });
  }

  if (!isAppleServerConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: 'apple_verification_not_configured',
        details: 'Set APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, and APPLE_BUNDLE_ID.',
      },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const isBearer = authHeader?.toLowerCase().startsWith('bearer ');
  const bearerToken = isBearer ? authHeader!.replace(/^Bearer\s+/i, '').trim() : null;

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
    body = (await request.json()) as AppleSyncPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const transactionId = body.transactionId?.trim();
  const environmentHint = body.environment === 'sandbox' ? 'sandbox' : body.environment === 'production' ? 'production' : undefined;

  if (!transactionId) {
    return NextResponse.json({ error: 'Missing required field transactionId' }, { status: 400 });
  }

  try {
    const verified = await fetchVerifiedAppleTransaction(transactionId, environmentHint);
    const transactionInfo = verified.transactionInfo;

    if (!transactionInfo.originalTransactionId) {
      return NextResponse.json(
        { success: false, error: 'apple_verification_failed', details: 'Verified Apple transaction missing originalTransactionId' },
        { status: 502 }
      );
    }

    if (!transactionInfo.productId) {
      return NextResponse.json(
        { success: false, error: 'apple_verification_failed', details: 'Verified Apple transaction missing productId' },
        { status: 502 }
      );
    }

    if (!ALLOWED_APPLE_PRODUCT_IDS.includes(transactionInfo.productId as (typeof ALLOWED_APPLE_PRODUCT_IDS)[number])) {
      return NextResponse.json({ error: 'invalid_product_id' }, { status: 400 });
    }

    if (body.originalTransactionId && body.originalTransactionId !== transactionInfo.originalTransactionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'apple_verification_failed',
          details: 'Client originalTransactionId does not match verified Apple transaction',
        },
        { status: 409 }
      );
    }

    if (body.productId && body.productId !== transactionInfo.productId) {
      return NextResponse.json(
        {
          success: false,
          error: 'apple_verification_failed',
          details: 'Client productId does not match verified Apple transaction',
        },
        { status: 409 }
      );
    }

    const { row, state } = await upsertAppleSubscriptionForUser({
      userId: user.id,
      transactionInfo,
    });

    console.log('[mobile/apple/subscription/sync] verified_upsert', {
      userId: user.id.slice(0, 8),
      transactionId: transactionInfo.transactionId ?? transactionId,
      originalTransactionId: transactionInfo.originalTransactionId,
      productId: transactionInfo.productId,
      environment: verified.environment,
      status: state.status,
      currentPeriodEnd: state.currentPeriodEnd,
      subscriptionRowId: row?.id ?? null,
    });

    return NextResponse.json({
      success: true,
      provider: 'apple',
      planCode: BroBotConfig.PAID_PLAN_CODE,
      status: state.status,
      currentPeriodEnd: state.currentPeriodEnd,
      originalTransactionId: transactionInfo.originalTransactionId,
      environment: verified.environment,
    });
  } catch (error) {
    console.error('[mobile/apple/subscription/sync] verification failed', {
      userId: user.id.slice(0, 8),
      transactionId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: 'apple_verification_failed',
        details: error instanceof Error ? error.message : 'Apple verification failed',
      },
      { status: 502 }
    );
  }
}
