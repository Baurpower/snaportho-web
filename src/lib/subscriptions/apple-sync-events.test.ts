import assert from 'node:assert/strict';

import {
  attemptAppleMobileSyncAuditInsert,
  buildAppleMobileSyncSubscriptionEvent,
} from './apple-sync-events';
import { buildSubscriptionEventPayload } from './events';

const event = buildAppleMobileSyncSubscriptionEvent({
  userId: '00000000-0000-4000-8000-000000000001',
  planCode: 'unlimited_brobot',
  requestedTransactionId: 'client_txn_1',
  environment: 'sandbox',
  transactionInfo: {
    transactionId: 'verified_txn_1',
    originalTransactionId: 'orig_txn_1',
    productId: 'com.snaportho.brobot.unlimited.monthly',
    purchaseDate: Date.parse('2026-07-04T10:00:00.000Z'),
    expiresDate: Date.parse('2026-08-04T10:00:00.000Z'),
    environment: 'Sandbox',
  },
  state: {
    status: 'active',
    currentPeriodEnd: '2026-08-04T10:00:00.000Z',
  },
  subscriptionRowId: 'sub_row_1',
});

assert.equal(event.provider, 'apple');
assert.equal(event.providerEventId, 'apple.mobile_sync.sandbox.verified_txn_1');
assert.equal(event.eventType, 'apple.mobile_subscription_sync');
assert.equal(event.userId, '00000000-0000-4000-8000-000000000001');
assert.equal(event.providerSubscriptionId, 'orig_txn_1');
assert.equal(event.providerTransactionId, 'verified_txn_1');
assert.equal(event.rawPayload.provider, 'apple');
assert.equal(event.rawPayload.environment, 'sandbox');
assert.equal(event.rawPayload.planCode, 'unlimited_brobot');
assert.equal(event.rawPayload.status, 'active');
assert.equal(event.processingResult?.success, true);

const payload = buildSubscriptionEventPayload(event);
assert.equal(payload.provider, 'apple');
assert.equal(payload.stripe_event_id, null);
assert.deepEqual(payload.raw_event, event.rawPayload);
assert.deepEqual(payload.raw_payload, event.rawPayload);

const fallbackTransactionEvent = buildAppleMobileSyncSubscriptionEvent({
  userId: '00000000-0000-4000-8000-000000000001',
  planCode: 'unlimited_brobot',
  requestedTransactionId: 'client_txn_2',
  environment: 'production',
  transactionInfo: {
    originalTransactionId: 'orig_txn_2',
    productId: 'com.snaportho.brobot.unlimited.yearly',
  },
  state: {
    status: 'active',
    currentPeriodEnd: null,
  },
});

assert.equal(fallbackTransactionEvent.providerEventId, 'apple.mobile_sync.production.client_txn_2');
assert.equal(fallbackTransactionEvent.providerTransactionId, 'client_txn_2');

let insertedEventId: string | null = null;
const insertSuccess = await attemptAppleMobileSyncAuditInsert({
  record: event,
  async insertEvent(record) {
    insertedEventId = record.providerEventId;
  },
});

assert.equal(insertSuccess.ok, true);
assert.equal(insertSuccess.errorMessage, null);
assert.equal(insertedEventId, 'apple.mobile_sync.sandbox.verified_txn_1');

const insertFailure = await attemptAppleMobileSyncAuditInsert({
  record: event,
  async insertEvent() {
    throw new Error('database temporarily unavailable');
  },
});

assert.equal(insertFailure.ok, false);
assert.equal(insertFailure.errorMessage, 'database temporarily unavailable');

console.log('apple mobile sync event tests passed');
