import assert from 'node:assert/strict';
import { buildAppleCanonicalEntry } from './apple-reconciliation';

const base = {
  userId: 'owner', originalTransactionId: 'original', transactionId: 'transaction',
  environment: 'production' as const, productId: 'com.snaportho.brobot.unlimited.monthly',
  purchaseDate: Date.parse('2026-08-01T00:00:00Z'), expiresDate: Date.parse('2026-09-01T00:00:00Z'),
  renewalInfo: { gracePeriodExpiresDate: Date.parse('2099-09-17T00:00:00Z'), autoRenewStatus: 0 },
  rawResponse: {},
};
const grace = buildAppleCanonicalEntry({ ...base, mappedStatus: {status: 'grace', raw: 'grace'} });
assert.equal(grace.current_period_end, '2099-09-17T00:00:00.000Z');
assert.equal(grace.cancel_at_period_end, true);
const retry = buildAppleCanonicalEntry({ ...base, mappedStatus: {status: 'billing_retry', raw: 'billing_retry'} });
assert.equal(retry.current_period_end, '2026-09-01T00:00:00.000Z');
console.log('Apple reconciliation period tests passed');
