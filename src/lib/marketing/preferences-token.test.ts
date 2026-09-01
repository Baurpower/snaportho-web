import assert from 'node:assert/strict';
import { createMarketingPreferenceToken, verifyMarketingPreferenceToken } from './preferences-token.ts';

process.env.MARKETING_PREFERENCES_SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';
const token = createMarketingPreferenceToken({ userId: 'user-1', email: 'User@Example.com', topic: 'offers' });
const payload = verifyMarketingPreferenceToken(token);
assert.equal(payload.email, 'user@example.com');
assert.equal(payload.topic, 'offers');
assert.throws(() => verifyMarketingPreferenceToken(`${token}x`));
console.log('marketing preference token tests passed');
