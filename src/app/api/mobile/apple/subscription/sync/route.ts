import { NextResponse } from 'next/server';

import {
  appleAccountTokensMatch,
  fetchVerifiedAppleTransaction,
  isAppleIntroductoryOffer,
  isAppleServerConfigured,
  type AppleEnvironment,
  upsertAppleSubscriptionForUser,
} from '@/lib/apple/app-store-server';
import { getMobileBearerUser } from '@/app/api/mobile/_utils/auth';
import { BROBOT_CONFIG as BroBotConfig } from '@/lib/config/brobot';
import { upsertSubscriptionEvent } from '@/lib/subscriptions/events';
import {
  attemptAppleMobileSyncAuditInsert,
  buildAppleMobileSyncSubscriptionEvent,
} from '@/lib/subscriptions/apple-sync-events';
import { enqueueAppleSubscriptionConversions } from '@/lib/analytics/branch-conversion-outbox';

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
  claimAfterAuthentication?: boolean;
  branchIDFV?: string;
  branchOSVersion?: string;
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

  const { user, response } = await getMobileBearerUser(request);
  if (response) return response;

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

  console.log('[mobile/apple/subscription/sync] request_received', {
    userId: user.id.slice(0, 8),
    transactionId,
    productId: body.productId ?? null,
    originalTransactionId: body.originalTransactionId ?? null,
    environmentHint: environmentHint ?? null,
  });

  let stage: 'verification' | 'subscription_upsert' = 'verification';
  try {
    const verified = await fetchVerifiedAppleTransaction(transactionId, environmentHint);
    const transactionInfo = verified.transactionInfo;

    console.log('[mobile/apple/subscription/sync] verification_succeeded', {
      userId: user.id.slice(0, 8),
      transactionId: transactionInfo.transactionId ?? transactionId,
      originalTransactionId: transactionInfo.originalTransactionId ?? null,
      productId: transactionInfo.productId ?? null,
      environment: verified.environment,
    });

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


    if (
      transactionInfo.appAccountToken &&
      !appleAccountTokensMatch(transactionInfo.appAccountToken, user.id)
    ) {
      return NextResponse.json(
        { success: false, error: 'apple_account_token_mismatch' },
        { status: 409 },
      );
    }

    // A transaction ID is an identifier, not proof that this caller owns the
    // Apple purchase. StoreKit must cryptographically bind purchases to the
    // authenticated SnapOrtho account using appAccountToken. Legacy unbound
    // transactions require manual support review.
    if (!transactionInfo.appAccountToken) {
      return NextResponse.json(
        { success: false, error: 'apple_unowned_transaction_requires_support' },
        { status: 409 },
      );
    }

    stage = 'subscription_upsert';
    const { row, state } = await upsertAppleSubscriptionForUser({
      userId: user.id,
      transactionInfo,
    });

    console.log('[mobile/apple/subscription/sync] subscription_upsert_succeeded', {
      userId: user.id.slice(0, 8),
      transactionId: transactionInfo.transactionId ?? transactionId,
      originalTransactionId: transactionInfo.originalTransactionId,
      productId: transactionInfo.productId,
      environment: verified.environment,
      status: state.status,
      currentPeriodEnd: state.currentPeriodEnd,
      subscriptionRowId: row?.id ?? null,
    });

    const providerEventId = `apple.mobile_sync.${verified.environment}.${transactionInfo.transactionId ?? transactionId}`;
    const auditEvent = buildAppleMobileSyncSubscriptionEvent({
      userId: user.id,
      planCode: BroBotConfig.PAID_PLAN_CODE,
      requestedTransactionId: transactionId,
      environment: verified.environment,
      transactionInfo,
      state,
      subscriptionRowId: row?.id ?? null,
    });
    const auditResult = await attemptAppleMobileSyncAuditInsert({
      record: auditEvent,
      insertEvent: upsertSubscriptionEvent,
    });

    if (auditResult.ok) {
      console.log('[mobile/apple/subscription/sync] subscription_event_insert_succeeded', {
        userId: user.id.slice(0, 8),
        providerEventId,
        transactionId: transactionInfo.transactionId ?? transactionId,
        originalTransactionId: transactionInfo.originalTransactionId,
        environment: verified.environment,
      });
    } else {
      console.warn('[mobile/apple/subscription/sync] subscription_event_insert_failed_non_blocking', {
        userId: user.id.slice(0, 8),
        providerEventId,
        transactionId: transactionInfo.transactionId ?? transactionId,
        originalTransactionId: transactionInfo.originalTransactionId,
        environment: verified.environment,
        error: auditResult.errorMessage,
      });
    }


    await enqueueAppleSubscriptionConversions({
      userId: user.id,
      originalTransactionId: transactionInfo.originalTransactionId,
      environment: verified.environment,
      introductory: isAppleIntroductoryOffer(transactionInfo),
      source: body.claimAfterAuthentication ? 'post_auth_claim' : 'ios_purchase',
      userData: {
        os: 'iOS',
        os_version: typeof body.branchOSVersion === 'string' ? body.branchOSVersion.slice(0, 30) : undefined,
        idfv: typeof body.branchIDFV === 'string' && /^[0-9a-f-]{36}$/i.test(body.branchIDFV)
          ? body.branchIDFV
          : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      provider: 'apple',
      planCode: BroBotConfig.PAID_PLAN_CODE,
      status: state.status,
      currentPeriodEnd: state.currentPeriodEnd,
      originalTransactionId: transactionInfo.originalTransactionId,
      environment: verified.environment,
      auditLogged: auditResult.ok,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Apple subscription sync failed';
    const ownerConflict = details.includes('already linked to another account');
    const errorCode =
      stage === 'verification'
        ? 'apple_verification_failed'
        : ownerConflict
          ? 'apple_subscription_owner_conflict'
          : 'apple_subscription_upsert_failed';
    console.error('[mobile/apple/subscription/sync] failed', {
      userId: user.id.slice(0, 8),
      transactionId,
      stage,
      error: details,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorCode,
        details,
      },
      { status: stage === 'verification' ? 502 : ownerConflict ? 409 : 500 }
    );
  }
}
