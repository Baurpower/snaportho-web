import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { verifyResendWebhook } from './resend-webhook.ts';

const key = randomBytes(32); const secret = `whsec_${key.toString('base64')}`; const id = 'msg_test'; const timestamp = String(Math.floor(Date.now() / 1000)); const body = '{"type":"email.delivered"}';
const signature = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
assert.equal(verifyResendWebhook({ body, id, timestamp, signature: `v1,${signature}`, secret }), true);
assert.equal(verifyResendWebhook({ body: `${body}x`, id, timestamp, signature: `v1,${signature}`, secret }), false);
console.log('resend webhook tests passed');
