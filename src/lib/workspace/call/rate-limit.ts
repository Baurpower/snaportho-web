type Bucket = { count: number; resetsAt: number };
const buckets = new Map<string, Bucket>();

export function checkCallRuleAiRateLimit(key: string) {
  const now = Date.now();
  const limit = Math.max(1, Number(process.env.CALL_RULE_AI_REQUESTS_PER_MINUTE) || 10);
  const current = buckets.get(key);
  if (!current || current.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + 60_000 });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetsAt - now) / 1000)) };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
