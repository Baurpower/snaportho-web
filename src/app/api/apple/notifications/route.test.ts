import assert from 'node:assert/strict';

import { handleAppleNotification, type AppleNotificationDeps } from './handler';

type EventUpsertParams = Parameters<AppleNotificationDeps['upsertEvent']>[0];

async function main() {
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
      async getExistingEvent() {
        return {
          id: 1,
          provider: 'apple',
          provider_event_id: 'uuid-duplicate',
          processed_at: '2026-06-30T00:00:00.000Z',
          processing_result: null,
        };
      },
      async upsertEvent() {
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
  const unknownEventCalls: EventUpsertParams[] = [];

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
      async getExistingEvent() {
        return null;
      },
      async upsertEvent(params) {
        unknownEventCalls.push(params);
        if (params.processedAt != null) {
          processedLogCalled = true;
        }
        return {
          id: 2,
          provider: params.provider,
          provider_event_id: params.providerEventId,
          processed_at: params.processedAt ?? null,
          processing_result: params.processingResult ?? null,
        };
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
  assert.equal(unknownEventCalls.length, 1);
  assert.equal(unknownEventCalls[0]?.providerEventId, 'uuid-unknown');

  console.log('apple notification route tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
