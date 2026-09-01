import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { SignJWT } from 'jose';

import {
  AppleVerificationError,
  appleAccountTokensMatch,
  deriveAppleState,
  isAppleIntroductoryOffer,
  parseApplePrivateKeyForSigning,
  verifyAppStoreServerNotification,
} from './app-store-server';

assert.equal(
  appleAccountTokensMatch(
    '8E3A1B2C-4D5E-6F70-8192-A3B4C5D6E7F8',
    '8e3a1b2c-4d5e-6f70-8192-a3b4c5d6e7f8'
  ),
  true
);
assert.equal(appleAccountTokensMatch('8e3a1b2c-4d5e-6f70-8192-a3b4c5d6e7f8', 'other'), false);
assert.equal(appleAccountTokensMatch('', ''), false);
assert.equal(isAppleIntroductoryOffer({ offerType: 1 }), true);
assert.equal(isAppleIntroductoryOffer({ offerType: 3 }), false);

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const validPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
const validSingleLine = validPem
  .replace('-----BEGIN PRIVATE KEY-----', '')
  .replace('-----END PRIVATE KEY-----', '')
  .replace(/\s+/g, '');

const parsedPemKey = await parseApplePrivateKeyForSigning(validPem);
const parsedSingleLineKey = await parseApplePrivateKeyForSigning(validSingleLine);

const smokeJwt = await new SignJWT({ bid: 'com.snaportho.test' })
  .setProtectedHeader({ alg: 'ES256', kid: 'TESTKEY123' })
  .setIssuer('issuer-test')
  .setAudience('appstoreconnect-v1')
  .setIssuedAt()
  .setExpirationTime('5m')
  .sign(parsedPemKey);

assert.ok(smokeJwt.includes('.'));
assert.equal(typeof parsedSingleLineKey, 'object');

await assert.rejects(
  () => parseApplePrivateKeyForSigning('not-a-private-key'),
  (error: unknown) =>
    error instanceof AppleVerificationError &&
    error.message.includes('Failed to parse Apple private key')
);

const renewed = deriveAppleState({
  transactionInfo: {
    transactionId: 'txn_renewed',
    originalTransactionId: 'orig_123',
    productId: 'com.snaportho.brobot.unlimited.monthly',
    purchaseDate: Date.parse('2026-06-01T00:00:00.000Z'),
    expiresDate: Date.parse('2099-07-01T00:00:00.000Z'),
    environment: 'Production',
  },
  renewalInfo: {
    originalTransactionId: 'orig_123',
    autoRenewProductId: 'com.snaportho.brobot.unlimited.monthly',
    autoRenewStatus: 1,
  },
  notificationType: 'DID_RENEW',
});

assert.equal(renewed.status, 'active');
assert.equal(renewed.currentPeriodEnd, '2099-07-01T00:00:00.000Z');
assert.equal(renewed.cancelAtPeriodEnd, false);

const refunded = deriveAppleState({
  transactionInfo: {
    transactionId: 'txn_refund',
    originalTransactionId: 'orig_123',
    productId: 'com.snaportho.brobot.unlimited.monthly',
    purchaseDate: Date.parse('2026-06-01T00:00:00.000Z'),
    expiresDate: Date.parse('2099-07-01T00:00:00.000Z'),
    revocationDate: Date.parse('2026-06-15T00:00:00.000Z'),
    environment: 'Production',
  },
  notificationType: 'REFUND',
});

assert.equal(refunded.status, 'canceled');
assert.ok(refunded.canceledAt);

const revoked = deriveAppleState({
  transactionInfo: {
    transactionId: 'txn_revoke',
    originalTransactionId: 'orig_123',
    productId: 'com.snaportho.brobot.unlimited.monthly',
    purchaseDate: Date.parse('2026-06-01T00:00:00.000Z'),
    expiresDate: Date.parse('2099-07-01T00:00:00.000Z'),
    revocationDate: Date.parse('2026-06-16T00:00:00.000Z'),
    environment: 'Production',
  },
  notificationType: 'REVOKE',
});

assert.equal(revoked.status, 'canceled');
assert.ok(revoked.canceledAt);

await assert.rejects(
  () => verifyAppStoreServerNotification('not-a-jws'),
  (error: unknown) =>
    error instanceof AppleVerificationError &&
    /Apple JWS|Unexpected Apple JWS algorithm|Invalid Compact JWS|Invalid Token or Protected Header formatting/i.test(
      error.message
    )
);

console.log('apple app-store server tests passed');
