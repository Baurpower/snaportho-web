import assert from 'node:assert/strict';

import { isPublicProviderWebhookPath } from './public-provider-webhook-path.ts';

assert.equal(isPublicProviderWebhookPath('/api/stripe/webhook', 'POST'), true);
assert.equal(isPublicProviderWebhookPath('/api/stripe/donation-webhook', 'POST'), true);
assert.equal(isPublicProviderWebhookPath('/api/stripe/webhook', 'GET'), false);
assert.equal(isPublicProviderWebhookPath('/api/apple/notifications', 'POST'), true);
assert.equal(isPublicProviderWebhookPath('/api/apple/notifications', 'GET'), true);
assert.equal(isPublicProviderWebhookPath('/api/billing/sync', 'POST'), false);
assert.equal(isPublicProviderWebhookPath('/api/stripe/webhook/extra', 'POST'), false);
assert.equal(isPublicProviderWebhookPath('/api/brobot/chat', 'POST'), false);

console.log('public-provider-webhook-path tests passed');