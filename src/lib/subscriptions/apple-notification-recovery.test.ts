import assert from 'node:assert/strict';

import { buildAppleNotificationHistoryWindow } from '@/lib/apple/app-store-server';
import { processAppleNotificationPayloads } from '@/lib/subscriptions/apple-notification-recovery';

const window = buildAppleNotificationHistoryWindow({
  startDate: new Date('2026-08-22T00:00:00.000Z'),
  endDate: new Date('2026-08-23T00:00:00.000Z'),
});
assert.deepEqual(window, { startDate: 1787356800000, endDate: 1787443200000 });
assert.throws(
  () => buildAppleNotificationHistoryWindow({
    startDate: new Date('2026-08-23T00:00:00.000Z'),
    endDate: new Date('2026-08-22T00:00:00.000Z'),
  }),
  /Invalid Apple notification history window/
);

const processed = await processAppleNotificationPayloads(
  ['new', 'duplicate', 'bad'],
  async ({ signedPayload }) => {
    if (signedPayload === 'duplicate') {
      return { status: 200, body: { received: true, duplicate: true } };
    }
    if (signedPayload === 'bad') {
      return { status: 500, body: { error: 'unmapped' } };
    }
    return {
      status: 200,
      body: {
        received: true,
        notificationType: 'DID_RENEW',
        notificationUuid: 'uuid-new',
        updated: true,
      },
    };
  }
);
assert.deepEqual(processed, {
  processed: 1,
  duplicates: 1,
  failed: [{ status: 500, error: 'unmapped' }],
});

console.log('apple notification recovery tests passed');
