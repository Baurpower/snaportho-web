import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_GOOGLE_ADS_ID = 'AW-18233960538';
process.env.NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIPTION_CONVERSION_LABEL = 'test-purchase-label';

const { trackBroBotUnlimitedPurchaseOnce } = await import('./googleAds.ts');

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

const localStorage = storage();
const events: Array<{ name: string; params: Record<string, unknown> }> = [];
const browser = {
  localStorage,
  gtag: undefined as ((command: string, name: string, params: Record<string, unknown>) => void) | undefined,
};
Object.assign(globalThis, { window: browser });

// A tag that initializes after checkout must still receive the conversion.
assert.equal(trackBroBotUnlimitedPurchaseOnce({ dedupeId: 'sub_late', value: 29.99 }), false);
assert.equal(localStorage.getItem('google_ads_subscription_conversion_v2:sub_late'), null);
browser.gtag = (_command, name, params) => { events.push({ name, params }); };
await new Promise((resolve) => setTimeout(resolve, 650));
assert.equal(events.length, 1);
assert.equal(events[0].name, 'conversion');
assert.equal(events[0].params.send_to, 'AW-18233960538/test-purchase-label');
assert.equal(events[0].params.transaction_id, 'sub_late');
assert.equal(events[0].params.value, 29.99);
assert.equal(localStorage.getItem('google_ads_subscription_conversion_v2:sub_late'), 'sent');
assert.equal(trackBroBotUnlimitedPurchaseOnce({ dedupeId: 'sub_late' }), false);
assert.equal(events.length, 1);

// Legacy storage may say "sent" even though gtag was absent.
localStorage.setItem('google_ads_subscription_conversion:sub_legacy', 'sent');
assert.equal(trackBroBotUnlimitedPurchaseOnce({ dedupeId: 'sub_legacy', value: 2.99 }), true);
assert.equal(events.length, 2);
assert.equal(events[1].params.transaction_id, 'sub_legacy');

console.log('Google Ads purchase conversion tests passed');
