import assert from 'node:assert/strict';

import {
  __resetEntitlementCacheForTests,
  getEntitlementsTtlSeconds,
  invalidateEntitlementCache,
  readEntitlementCacheEntry,
  writeEntitlementCacheEntry,
} from './entitlement-cache.ts';

const previousTtl = process.env.ENTITLEMENTS_TTL_SECONDS;

function withTtl(value: string | undefined, fn: () => void) {
  if (value === undefined) {
    delete process.env.ENTITLEMENTS_TTL_SECONDS;
  } else {
    process.env.ENTITLEMENTS_TTL_SECONDS = value;
  }
  try {
    fn();
  } finally {
    if (previousTtl === undefined) {
      delete process.env.ENTITLEMENTS_TTL_SECONDS;
    } else {
      process.env.ENTITLEMENTS_TTL_SECONDS = previousTtl;
    }
  }
}

__resetEntitlementCacheForTests();

withTtl(undefined, () => {
  assert.equal(getEntitlementsTtlSeconds(), 0);
});

withTtl('0', () => {
  assert.equal(getEntitlementsTtlSeconds(), 0);
});

withTtl('45', () => {
  assert.equal(getEntitlementsTtlSeconds(), 45);
});

withTtl('bogus', () => {
  assert.equal(getEntitlementsTtlSeconds(), 0);
});

withTtl('60', () => {
  __resetEntitlementCacheForTests();
  const subject = { type: 'user' as const, id: 'user_cache_1' };
  const payload = { access: 'free', freeQuotaRemaining: 3 };

  writeEntitlementCacheEntry(subject, false, payload);
  assert.deepEqual(readEntitlementCacheEntry(subject, false), payload);

  // Debug reads skip cache (prefer live path).
  assert.equal(readEntitlementCacheEntry(subject, true), null);
  writeEntitlementCacheEntry(subject, true, { access: 'unlimited' });
  assert.deepEqual(readEntitlementCacheEntry(subject, false), payload);

  invalidateEntitlementCache(subject);
  assert.equal(readEntitlementCacheEntry(subject, false), null);

  writeEntitlementCacheEntry(subject, false, payload);
  invalidateEntitlementCache({ userId: 'user_cache_1' });
  assert.equal(readEntitlementCacheEntry(subject, false), null);

  const guest = { type: 'guest' as const, id: 'guest_cache_1' };
  writeEntitlementCacheEntry(guest, false, { access: 'free' });
  invalidateEntitlementCache({ guestId: 'guest_cache_1' });
  assert.equal(readEntitlementCacheEntry(guest, false), null);
});

withTtl('0', () => {
  __resetEntitlementCacheForTests();
  const subject = { type: 'user' as const, id: 'user_disabled' };
  writeEntitlementCacheEntry(subject, false, { access: 'free' });
  assert.equal(readEntitlementCacheEntry(subject, false), null);
});

console.log('entitlement-cache.test.ts: all assertions passed');
