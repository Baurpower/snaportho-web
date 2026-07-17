type Entry<T> = { value: T; expiresAt: number };

export class BoundedTtlCache<T> {
  private readonly values = new Map<string, Entry<T>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(maxEntries: number, ttlMs: number) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  get(key: string): T | null {
    const entry = this.values.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return null;
    }
    this.values.delete(key);
    this.values.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T) {
    this.values.delete(key);
    this.values.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    while (this.values.size > this.maxEntries) {
      const oldest = this.values.keys().next().value;
      if (typeof oldest !== "string") break;
      this.values.delete(oldest);
    }
  }
}

export function normalizeKgQuery(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
