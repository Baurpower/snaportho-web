// Add-on version gate helpers. Pure (no Next/Supabase deps) so they are unit-testable.
// The client identifies itself with `X-SnapOrtho-Client: reviewer-addon/<version>`; a release
// may set a minimum_addon_version floor that older clients must clear before applying a manifest.
export function addonVersionFromClientHeader(headerValue: string | null): string | null {
  const match = (headerValue ?? "").match(/reviewer-addon\/([0-9]+(?:\.[0-9]+){0,3})/i);
  return match ? match[1] : null;
}
function parseVersion(value: string): number[] {
  return value.split(".").map((part) => Number.parseInt(part, 10) || 0);
}
export function addonVersionAtLeast(
  client: string | null,
  minimum: string | null,
): boolean {
  if (!minimum) return true; // no floor => everyone allowed
  if (!client) return false; // floor exists but client didn't identify => block
  const a = parseVersion(client),
    b = parseVersion(minimum),
    len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return true; // equal
}
