import assert from 'node:assert/strict';
import { mapReviewError, shouldOfferUpgrade } from './review-error-mapping.ts';

assert.equal(shouldOfferUpgrade('quota_exceeded'), true);
assert.equal(shouldOfferUpgrade('plan_required'), true);
assert.equal(shouldOfferUpgrade('provider_failed'), false);
assert.equal(shouldOfferUpgrade('internal_error'), false);
assert.equal(mapReviewError('quota_exceeded', null, true).showUpgrade, true);
assert.equal(mapReviewError('quota_exceeded', null, true).showSignIn, true);
assert.equal(mapReviewError('provider_failed', null, false).showUpgrade, false);
assert.equal(mapReviewError('provider_failed', null, false).showRetry, true);
assert.equal(mapReviewError('auth_resolution_failed', null, false).showSignIn, true);
assert.equal(mapReviewError('invalid_model_response', null, false).message, 'BroBot returned an incomplete review. Your allowance was not used.');
assert.equal(mapReviewError('persistence_failed', null, false).showUpgrade, false);

console.log('personal statement review error mapping tests passed');
