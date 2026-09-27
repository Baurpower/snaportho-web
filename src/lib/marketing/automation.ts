import { timingSafeEqual } from 'node:crypto';

export const MARKETING_AUTOMATION_TIME_ZONE = 'America/Los_Angeles';
export const MARKETING_AUTOMATION_DAILY_CAP = 50;

export function isAuthorizedMarketingScheduler(request: Request, secret: string | undefined) {
  if (!secret?.trim()) return false;
  const authorization = request.headers.get('authorization');
  const expected = `Bearer ${secret.trim()}`;
  if (!authorization) return false;
  const receivedBytes = Buffer.from(authorization);
  const expectedBytes = Buffer.from(expected);
  if (receivedBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(receivedBytes, expectedBytes);
}

export function isMarketingAutomationWindowOpen(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MARKETING_AUTOMATION_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  return Number(parts.find((part) => part.type === 'hour')?.value) === 9;
}

export function marketingDailyQuotaStatus(
  deliveries: Record<string, unknown>[],
  now = new Date(),
  dailyCap = MARKETING_AUTOMATION_DAILY_CAP,
) {
  const dayKey = pacificDayKey(now);
  const sentToday = deliveries.filter((delivery) => {
    if (!delivery.campaign_key || !delivery.sent_at) return false;
    return pacificDayKey(new Date(String(delivery.sent_at))) === dayKey;
  });
  return {
    dailySent: sentToday.length,
    dailyRemaining: Math.max(0, dailyCap - sentToday.length),
    usersSentToday: new Set(sentToday.filter((delivery) => delivery.user_id).map((delivery) => String(delivery.user_id))),
  };
}

function pacificDayKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MARKETING_AUTOMATION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const values = Object.fromEntries(parts.formatToParts(date).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function marketingAutomationBlockReason(input: {
  automationEnabled: boolean;
  sendEnabled: boolean;
  deliveryHealthApproved: boolean;
  quotaApproved: boolean;
  schedulerSecretConfigured: boolean;
  deliveries: Record<string, unknown>[];
  pendingWebhookCount: number;
  webhookFailureCount?: number;
  now?: number;
}) {
  if (!input.schedulerSecretConfigured) return 'scheduler_secret_missing';
  if (!input.automationEnabled) return 'automation_disabled';
  if (!input.sendEnabled) return 'marketing_sending_disabled';
  if (!input.deliveryHealthApproved) return 'delivery_health_not_approved';
  if (!input.quotaApproved) return 'daily_quota_not_approved';
  if (!input.deliveries.length) return 'delivery_health_data_missing';
  if (input.pendingWebhookCount > 0) return 'webhook_processing_incomplete';
  if ((input.webhookFailureCount ?? 0) > 0) return 'webhook_processing_failed';

  const now = input.now ?? Date.now();
  for (const row of input.deliveries) {
    if (!['sending', 'sent', 'delivered', 'clicked', 'bounced', 'complained', 'suppressed', 'failed', 'delivery_failed']
      .includes(String(row.send_status))) {
      return 'delivery_status_unknown';
    }
    if (row.bounced_at || row.complained_at || row.suppressed_at ||
        ['bounced', 'complained', 'suppressed', 'failed', 'delivery_failed'].includes(String(row.send_status))) {
      return 'delivery_quality_event';
    }
    if (row.send_status === 'sending' && now - new Date(String(row.sent_at)).getTime() > 15 * 60_000) {
      return 'ambiguous_delivery_unresolved';
    }
    if (['sent', 'delivered', 'clicked'].includes(String(row.send_status)) && !row.delivered_at &&
        now - new Date(String(row.sent_at)).getTime() > 24 * 60 * 60_000) {
      return 'delivery_confirmation_missing';
    }
  }
  if (!input.deliveries.some((row) => row.delivered_at)) return 'delivery_confirmation_missing';
  const latestSentAt = Math.max(...input.deliveries.map((row) => new Date(String(row.sent_at)).getTime()).filter(Number.isFinite));
  if (Number.isFinite(latestSentAt) && now - latestSentAt < 24 * 60 * 60_000) {
    return 'minimum_24_hour_batch_interval';
  }
  return null;
}
