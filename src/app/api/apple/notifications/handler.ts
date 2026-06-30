import {
  AppleVerificationError,
  applyAppleNotificationToSubscription,
  logAppleSubscriptionEvent,
  verifyAppStoreServerNotification,
} from '@/lib/apple/app-store-server';

type AppleNotificationRequestBody = {
  signedPayload?: string;
};

export type AppleNotificationDeps = {
  verify: typeof verifyAppStoreServerNotification;
  logEvent: typeof logAppleSubscriptionEvent;
  applyNotification: typeof applyAppleNotificationToSubscription;
};

const defaultDeps: AppleNotificationDeps = {
  verify: verifyAppStoreServerNotification,
  logEvent: logAppleSubscriptionEvent,
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

    const existing = await deps.logEvent({
      notificationUuid,
      notificationType,
      subtype: verified.notification.subtype ?? null,
      originalTransactionId:
        verified.transactionInfo?.originalTransactionId ??
        verified.renewalInfo?.originalTransactionId ??
        null,
      transactionId: verified.transactionInfo?.transactionId ?? null,
      signedPayload,
      rawPayload: verified.notification,
      processedAt: null,
    });

    if (existing?.processed_at) {
      return { status: 200, body: { received: true, duplicate: true } };
    }

    const result = await deps.applyNotification(verified);

    await deps.logEvent({
      notificationUuid,
      notificationType,
      subtype: verified.notification.subtype ?? null,
      originalTransactionId:
        verified.transactionInfo?.originalTransactionId ??
        verified.renewalInfo?.originalTransactionId ??
        null,
      transactionId: verified.transactionInfo?.transactionId ?? null,
      signedPayload,
      rawPayload: verified.notification,
      processedAt: new Date().toISOString(),
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
