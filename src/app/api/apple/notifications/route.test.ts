import assert from 'node:assert/strict';

import { handleAppleNotification } from './handler';

const duplicateResponse = await handleAppleNotification(
  { signedPayload: 'signed' },
  {
    async verify() {
      return {
        signedPayload: 'signed',
        notification: {
          notificationUUID: 'uuid-duplicate',
          notificationType: 'DID_RENEW',
        },
        transactionInfo: {
          transactionId: 'txn_1',
          originalTransactionId: 'orig_1',
        },
        renewalInfo: null,
      };
    },
    async logEvent(params) {
      if (params.processedAt == null) {
        return { id: 1, notification_uuid: params.notificationUuid, processed_at: '2026-06-30T00:00:00.000Z' };
      }
      throw new Error('processed duplicate should not be re-logged');
    },
    async applyNotification() {
      throw new Error('duplicate notification should not be applied');
    },
  }
);

assert.equal(duplicateResponse.status, 200);
assert.deepEqual(duplicateResponse.body, { received: true, duplicate: true });

let processedLogCalled = false;

const unknownTransactionResponse = await handleAppleNotification(
  { signedPayload: 'signed' },
  {
    async verify() {
      return {
        signedPayload: 'signed',
        notification: {
          notificationUUID: 'uuid-unknown',
          notificationType: 'DID_RENEW',
        },
        transactionInfo: {
          transactionId: 'txn_unknown',
          originalTransactionId: 'orig_unknown',
        },
        renewalInfo: null,
      };
    },
    async logEvent(params) {
      if (params.processedAt != null) {
        processedLogCalled = true;
      }
      return { id: 2, notification_uuid: params.notificationUuid, processed_at: params.processedAt ?? null };
    },
    async applyNotification() {
      throw new Error('Unable to map Apple originalTransactionId orig_unknown to a Supabase user');
    },
  }
);

assert.equal(unknownTransactionResponse.status, 500);
assert.equal(
  unknownTransactionResponse.body.error,
  'Unable to map Apple originalTransactionId orig_unknown to a Supabase user'
);
assert.equal(processedLogCalled, false);

console.log('apple notification route tests passed');
