export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/"
): string {
  const safeFallback = fallback === "" ? "" : isSafeRelativePath(fallback) ? fallback : "/";

  if (!value || typeof value !== "string") {
    return safeFallback;
  }

  const trimmed = value.trim();
  if (!isSafeRelativePath(trimmed)) {
    return safeFallback;
  }

  try {
    const parsed = new URL(trimmed, "https://snap-ortho.local");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return safeFallback;
  }
}

export function isSafeRelativePath(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("\\")) return false;

  try {
    const parsed = new URL(value, "https://snap-ortho.local");
    return parsed.origin === "https://snap-ortho.local";
  } catch {
    return false;
  }
}

export function appendSafeReturnTo(
  path: string,
  returnTo: string | null | undefined,
  fallbackReturnTo = "/brobot/chat"
) {
  const safeReturnTo = safeRedirectPath(returnTo, fallbackReturnTo);
  const url = new URL(path, "https://snap-ortho.local");
  url.searchParams.set("returnTo", safeReturnTo);
  return `${url.pathname}${url.search}`;
}
