/**
 * Short-TTL in-process cache for normalized BroBot entitlements (Hobby Phase 2).
 *
 * ENTITLEMENTS_TTL_SECONDS — default 0 (disabled) for safety. Set to e.g. 45–60
 * to enable caching on a warm serverless instance. Cache is fail-open: any error
 * falls through to the live DB path.
 *
 * Keys: subject.type + subject.id + UTC YYYY-MM-DD (+ includeDebug). Debug reads
 * skip the cache entirely so diagnostics always hit live data.
 */

export type EntitlementCacheSubject =
  | { type: 'user'; id: string }
  | { type: 'guest'; id: string };

type CacheEntry = {
  expiresAtMs: number;
  value: unknown;
};

const store = new Map<string, CacheEntry>();

/** Parse TTL; <=0 or unset means caching is disabled. */
export function getEntitlementsTtlSeconds(): number {
  const raw = process.env.ENTITLEMENTS_TTL_SECONDS;
  if (raw == null || raw === '') return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

function utcDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function buildKey(subject: EntitlementCacheSubject, includeDebug: boolean): string {
  return `${subject.type}:${subject.id}:${utcDayKey()}:${includeDebug ? '1' : '0'}`;
}

export function readEntitlementCacheEntry<T>(
  subject: EntitlementCacheSubject,
  includeDebug: boolean,
): T | null {
  try {
    // Prefer skip-cache for debug so includeDebug payloads stay live.
    if (includeDebug) return null;
    const ttlSeconds = getEntitlementsTtlSeconds();
    if (ttlSeconds <= 0) return null;

    const key = buildKey(subject, false);
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAtMs) {
      store.delete(key);
      return null;
    }
    return entry.value as T;
  } catch {
    return null;
  }
}

export function writeEntitlementCacheEntry(
  subject: EntitlementCacheSubject,
  includeDebug: boolean,
  value: unknown,
): void {
  try {
    if (includeDebug) return;
    const ttlSeconds = getEntitlementsTtlSeconds();
    if (ttlSeconds <= 0) return;

    const key = buildKey(subject, false);
    store.set(key, {
      expiresAtMs: Date.now() + ttlSeconds * 1000,
      value,
    });
  } catch {
    // fail-open: ignore cache write failures
  }
}

/**
 * Drop cached entitlement rows for a user and/or guest.
 * Accepts a Subject or { userId, guestId } for call-site convenience.
 */
export function invalidateEntitlementCache(
  subject:
    | EntitlementCacheSubject
    | { userId?: string | null; guestId?: string | null },
): void {
  try {
    const targets: EntitlementCacheSubject[] = [];
    if (
      subject &&
      typeof subject === 'object' &&
      'type' in subject &&
      (subject.type === 'user' || subject.type === 'guest') &&
      typeof (subject as EntitlementCacheSubject).id === 'string'
    ) {
      targets.push(subject as EntitlementCacheSubject);
    } else {
      const ids = subject as { userId?: string | null; guestId?: string | null };
      if (ids.userId) targets.push({ type: 'user', id: ids.userId });
      if (ids.guestId) targets.push({ type: 'guest', id: ids.guestId });
    }

    for (const target of targets) {
      const prefix = `${target.type}:${target.id}:`;
      for (const key of [...store.keys()]) {
        if (key.startsWith(prefix)) {
          store.delete(key);
        }
      }
    }
  } catch {
    // fail-open: ignore invalidation failures
  }
}

/** Test-only helper to reset the in-process Map between cases. */
export function __resetEntitlementCacheForTests(): void {
  store.clear();
}
