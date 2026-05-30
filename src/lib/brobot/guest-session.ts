/**
 * BroBot Guest Session (Phase 1)
 *
 * Provides abuse-resistant, signed, HttpOnly guest identity for daily usage capping
 * without requiring a user account.
 *
 * Design goals:
 * - No localStorage or client-side enforcement (server is the source of truth)
 * - Signed so clients cannot forge or extend quotas
 * - Day-keyed so cookies from previous days naturally grant zero extra uses
 * - Stable guestId per browser session for the current UTC day
 *
 * Cookie: __brobot_guest (HttpOnly, Secure in prod, SameSite=Lax)
 *
 * SECURITY NOTES / FUTURE IMPROVEMENTS (TODO Phase 2+):
 * - Add short absolute expiry (e.g. 24-48h) even within a day
 * - Bind to IP hash or User-Agent fingerprint as secondary signal
 * - Add rate limiting at the edge (Vercel/Cloudflare) on the proxy route
 * - Consider rotating secrets and supporting multiple active secrets for zero-downtime rotation
 * - Log suspicious patterns (same guestId from many IPs in short time)
 */

import { createHmac, randomBytes } from 'node:crypto';
import { getBroBotGuestSecret } from '@/lib/config/brobot';

export const BROBOT_GUEST_COOKIE_NAME = '__brobot_guest';

const VERSION = 'v1';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 2; // 2 days (covers day boundary + safety)

export interface GuestSession {
  guestId: string;     // stable random id for this guest session
  issuedAt: number;    // unix seconds
  dayKey: string;      // 'YYYY-MM-DD' in UTC — this is what makes old cookies useless
}

export interface CreatedGuestSession {
  session: GuestSession;
  cookie: string;
}

/**
 * Returns today's date key in UTC (YYYY-MM-DD).
 * This is the key we embed so a cookie created yesterday is worthless today.
 */
export function getUtcDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Signs a payload string using HMAC-SHA256 + the server secret.
 */
function sign(payload: string): string {
  const secret = getBroBotGuestSecret();
  return createHmac('sha256', secret).update(payload, 'utf8').digest('base64url');
}

/**
 * Verifies signature. Returns true only if the signature matches.
 */
function verify(payload: string, signature: string): boolean {
  const expected = sign(payload);
  // Constant-time comparison (Node 19+ has timingSafeEqual, but base64url lengths are safe here)
  return expected.length === signature.length && expected === signature;
}

/**
 * Creates a brand new guest session for today and returns the Set-Cookie string.
 * Call this when we see no valid guest cookie (or the day has rolled over).
 */
export function createGuestSessionCookie(): string {
  const guestId = `guest_${randomBytes(18).toString('base64url')}`;
  const now = Math.floor(Date.now() / 1000);
  const dayKey = getUtcDayKey();

  const payload = `${VERSION}.${guestId}.${now}.${dayKey}`;
  const sig = sign(payload);

  const cookieValue = `${payload}.${sig}`;

  const isProd = process.env.NODE_ENV === 'production';
  const cookie = [
    `${BROBOT_GUEST_COOKIE_NAME}=${cookieValue}`,
    'Path=/',
    'HttpOnly',
    `SameSite=Lax`,
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    isProd ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

  return cookie;
}

function parseGuestCookieValue(value: string): GuestSession | null {
  const parts = value.split('.');

  // Expected: v1.guest_xxx.1234567890.2025-05-27.sig
  if (parts.length !== 5) return null;

  const [ver, guestId, iatStr, dayKey, sig] = parts;

  if (ver !== VERSION || !guestId?.startsWith('guest_') || !dayKey || !sig) {
    return null;
  }

  const payload = `${ver}.${guestId}.${iatStr}.${dayKey}`;
  if (!verify(payload, sig)) {
    return null;
  }

  if (dayKey !== getUtcDayKey()) {
    return null;
  }

  const issuedAt = parseInt(iatStr, 10);
  if (Number.isNaN(issuedAt)) return null;

  return {
    guestId,
    issuedAt,
    dayKey,
  };
}

export function createGuestSession(): CreatedGuestSession {
  const cookie = createGuestSessionCookie();
  const match = cookie.match(new RegExp(`${BROBOT_GUEST_COOKIE_NAME}=([^;]+)`));

  if (!match) {
    throw new Error('Failed to parse newly-created BroBot guest cookie');
  }

  const session = parseGuestCookieValue(match[1]);
  if (!session) {
    throw new Error('Failed to verify newly-created BroBot guest session');
  }

  return { session, cookie };
}

/**
 * Parses and verifies the guest cookie from a Request (or NextRequest).
 * Returns a valid GuestSession only if:
 *   - Cookie exists
 *   - Signature is valid
 *   - Day key matches today (prevents yesterday's cookies from working)
 */
export function getGuestSessionFromRequest(request: Request): GuestSession | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  // Simple cookie parser (sufficient for our single cookie)
  const match = cookieHeader.match(new RegExp(`${BROBOT_GUEST_COOKIE_NAME}=([^;]+)`));
  if (!match) return null;

  const value = decodeURIComponent(match[1]);
  return parseGuestCookieValue(value);
}

/**
 * Helper to attach a fresh guest cookie to a NextResponse (or any response you control).
 * Usage in a route handler:
 *   const res = NextResponse.json(...);
 *   res.headers.append('Set-Cookie', createGuestSessionCookie());
 *   return res;
 */
export function attachFreshGuestCookie(response: Response): Response {
  const cookie = createGuestSessionCookie();
  response.headers.append('Set-Cookie', cookie);
  return response;
}
