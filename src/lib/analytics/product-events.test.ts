import assert from 'node:assert/strict';
import { isProductEventName, sanitizeProductProperties } from './product-events.ts';

assert.equal(isProductEventName('brobot_checkout_started'), true);
assert.equal(isProductEventName('anki_addon_downloaded'), true);
assert.equal(isProductEventName('arbitrary_event'), false);
assert.deepEqual(
  sanitizeProductProperties({ safe: 'yes', count: 2, nested: { forbidden: true }, empty: null }),
  { safe: 'yes', count: 2, empty: null }
);
assert.equal(
  (sanitizeProductProperties({ long: 'x'.repeat(400) }).long as string).length,
  256
);

console.log('product event contract tests passed');
