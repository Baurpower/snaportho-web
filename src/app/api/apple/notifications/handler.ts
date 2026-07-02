import {
  AppleVerificationError,
  applyAppleNotificationToSubscription,
  verifyAppStoreServerNotification,
} from '@/lib/apple/app-store-server';
import {
  getExistingSubscriptionEvent,
  upsertSubscriptionEvent,
} from '@/lib/subscriptions/events';

type AppleNotificationRequestBody = {
  signedPayload?: string;
};

export type AppleNotificationDeps = {
  verify: typeof verifyAppStoreServerNotification;
  applyNotification: typeof applyAppleNotificationToSubscription;
};

const defaultDeps: AppleNotificationDeps = {
  verify: verifyAppStoreServerNotification,
  applyNotification: applyAppleNotificationToSubscription,
};

function classifyAppleNotificationError(error: unknown) {
  if (error instanceof AppleVerificationError) {
    return { status: 400, message: error.message };
  }

  if (error instanceof Error && error.message.includes('missing originalTransactionId')) {
    return { status: 400, message: error.message };
  }

  return {
    status: 500,
    message: error instanceof Error ? error.message : 'Apple notification processing failed',
  };
}

export async function handleAppleNotification(
  body: AppleNotificationRequestBody,
  deps: AppleNotificationDeps = defaultDeps
) {
  const signedPayload = body.signedPayload?.trim();
  if (!signedPayload) {
    return { status: 400, body: { error: 'Missing signedPayload' } };
  }

  try {
    const verified = await deps.verify(signedPayload);
    const notificationUuid = verified.notification.notificationUUID;
    const notificationType = verified.notification.notificationType ?? 'UNKNOWN';

    if (!notificationUuid) {
      return { status: 400, body: { error: 'Verified Apple notification missing notificationUUID' } };
    }

    const existing = await getExistingSubscriptionEvent({
      provider: 'apple',
      providerEventId: notificationUuid,
    });

    if (existing?.processed_at) {
      return { status: 200, body: { received: true, duplicate: true } };
    }

    if (!existing) {
      await upsertSubscriptionEvent({
        provider: 'apple',
        providerEventId: notificationUuid,
        eventType: notificationType,
        providerSubscriptionId:
          verified.transactionInfo?.originalTransactionId ??
          verified.renewalInfo?.originalTransactionId ??
          null,
        providerTransactionId: verified.transactionInfo?.transactionId ?? null,
        rawPayload: verified.notification as Record<string, unknown>,
      });
    }

    const result = await deps.applyNotification(verified);

    await upsertSubscriptionEvent({
      provider: 'apple',
      providerEventId: notificationUuid,
      eventType: notificationType,
      providerSubscriptionId:
        verified.transactionInfo?.originalTransactionId ??
        verified.renewalInfo?.originalTransactionId ??
        null,
      providerTransactionId: verified.transactionInfo?.transactionId ?? null,
      rawPayload: verified.notification as Record<string, unknown>,
      processedAt: new Date().toISOString(),
      processingResult: {
        updated: result.updated,
      },
    });

    return {
      status: 200,
      body: {
        received: true,
        notificationType,
        notificationUuid,
        updated: result.updated,
      },
    };
  } catch (error) {
    console.error('[apple/notifications] failed', error);
    const classified = classifyAppleNotificationError(error);
    return { status: classified.status, body: { error: classified.message } };
  }
}
