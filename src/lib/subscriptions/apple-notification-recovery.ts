import type { AppleEnvironment } from '@/lib/apple/app-store-server';
import { fetchAppleNotificationHistory } from '@/lib/apple/app-store-server';
import { handleAppleNotification } from '@/app/api/apple/notifications/handler';

export type AppleNotificationRecoveryResult = {
  environment: AppleEnvironment;
  pagesFetched: number;
  notificationsFound: number;
  processed: number;
  duplicates: number;
  failed: Array<{ status: number; error: string }>;
};

type NotificationHandler = typeof handleAppleNotification;

export async function processAppleNotificationPayloads(
  signedPayloads: string[],
  handler: NotificationHandler = handleAppleNotification
) {
  const result = { processed: 0, duplicates: 0, failed: [] as Array<{ status: number; error: string }> };
  for (const signedPayload of signedPayloads) {
    const response = await handler({ signedPayload });
    if (response.status >= 200 && response.status < 300) {
      if ('duplicate' in response.body && response.body.duplicate) result.duplicates += 1;
      else result.processed += 1;
    } else {
      result.failed.push({
        status: response.status,
        error: 'error' in response.body ? String(response.body.error) : 'Unknown processing error',
      });
    }
  }
  return result;
}

export async function recoverAppleNotificationHistory(params: {
  environment: AppleEnvironment;
  lookbackHours?: number;
  maxPages?: number;
  now?: Date;
}): Promise<AppleNotificationRecoveryResult> {
  const now = params.now ?? new Date();
  const lookbackHours = Math.max(1, Math.min(params.lookbackHours ?? 72, 24 * 30));
  const history = await fetchAppleNotificationHistory({
    environment: params.environment,
    startDate: new Date(now.getTime() - lookbackHours * 60 * 60 * 1000),
    endDate: now,
    maxPages: params.maxPages,
  });

  const result: AppleNotificationRecoveryResult = {
    environment: params.environment,
    pagesFetched: history.pagesFetched,
    notificationsFound: history.signedPayloads.length,
    processed: 0,
    duplicates: 0,
    failed: [],
  };

  const processed = await processAppleNotificationPayloads(history.signedPayloads);
  result.processed = processed.processed;
  result.duplicates = processed.duplicates;
  result.failed = processed.failed;

  return result;
}
