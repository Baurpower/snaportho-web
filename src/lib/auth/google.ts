const NEW_USER_WINDOW_MS = 120_000;

export function isNewSupabaseUser(
  createdAt: string | null | undefined,
  now = Date.now(),
  windowMs = NEW_USER_WINDOW_MS
): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return now - created < windowMs;
}
