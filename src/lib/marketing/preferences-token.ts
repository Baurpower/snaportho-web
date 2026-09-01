import { createHmac, timingSafeEqual } from 'node:crypto';
import type { MarketingTopic } from './types';

type PreferenceTokenPayload = {
  v: 1;
  userId: string;
  email: string;
  topic: MarketingTopic | '*';
  exp: number;
};

function secret() {
  const value = process.env.MARKETING_PREFERENCES_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error('MARKETING_PREFERENCES_SECRET must be at least 32 characters');
  }
  return value;
}

function encode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(encodedPayload: string) {
  return createHmac('sha256', secret()).update(encodedPayload).digest('base64url');
}

export function createMarketingPreferenceToken(input: Omit<PreferenceTokenPayload, 'v' | 'exp'> & { expiresInDays?: number }) {
  const payload: PreferenceTokenPayload = {
    v: 1,
    userId: input.userId,
    email: input.email.trim().toLowerCase(),
    topic: input.topic,
    exp: Math.floor(Date.now() / 1000) + (input.expiresInDays ?? 365) * 86400,
  };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyMarketingPreferenceToken(token: string): PreferenceTokenPayload {
  const [encoded, supplied] = token.split('.');
  if (!encoded || !supplied) throw new Error('Invalid preference token');
  const expected = sign(encoded);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Invalid preference token');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as PreferenceTokenPayload;
  if (payload.v !== 1 || !payload.userId || !payload.email || !payload.topic) throw new Error('Invalid preference token');
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Expired preference token');
  return payload;
}
