type Bucket = { count: number; resetsAt: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 12;

export function checkMyOrthoRateLimit(key: string) {
  const now = Date.now();
  const limit = Math.max(1, Number(process.env.MYORTHO_CHAT_REQUESTS_PER_MINUTE) || DEFAULT_LIMIT);
  const current = buckets.get(key);
  if (!current || current.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetsAt - now) / 1000)) };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
