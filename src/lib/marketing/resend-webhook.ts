import { createHmac, timingSafeEqual } from 'node:crypto';

function signingKey(secret: string) {
  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  return Buffer.from(raw, 'base64');
}

export function verifyResendWebhook(input: { body: string; id: string | null; timestamp: string | null; signature: string | null; secret: string }) {
  if (!input.id || !input.timestamp || !input.signature) return false;
  const timestamp = Number(input.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const expected = createHmac('sha256', signingKey(input.secret)).update(`${input.id}.${input.timestamp}.${input.body}`).digest('base64');
  return input.signature.split(' ').some((part) => {
    const [version, signature] = part.split(',');
    if (version !== 'v1' || !signature) return false;
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
