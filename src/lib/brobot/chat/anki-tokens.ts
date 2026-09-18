import { createHmac, timingSafeEqual } from 'node:crypto';
import { getBroBotGuestSecret } from '@/lib/config/brobot';

type TokenPurpose = 'guest-answer' | 'card';

function signature(payload: string) {
  return createHmac('sha256', getBroBotGuestSecret()).update(payload).digest('base64url');
}

export function createAnkiToken(purpose: TokenPurpose, subject: string, value: string, ttlSeconds = 12 * 3600) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = Buffer.from(JSON.stringify({ purpose, subject, value, expires })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function verifyAnkiToken(token: string, purpose: TokenPurpose, subject: string): string | null {
  const [payload, mac, extra] = token.split('.');
  if (!payload || !mac || extra) return null;
  const expected = signature(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      purpose?: string; subject?: string; value?: string; expires?: number;
    };
    return value.purpose === purpose && value.subject === subject
      && typeof value.value === 'string' && typeof value.expires === 'number'
      && value.expires >= Math.floor(Date.now() / 1000) ? value.value : null;
  } catch {
    return null;
  }
}
