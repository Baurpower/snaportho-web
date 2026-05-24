function normalizeOrigin(origin: string) {
  try {
    const url = new URL(origin);

    if (url.hostname === "127.0.0.1") {
      url.hostname = "localhost";
    }

    return url.origin;
  } catch {
    return origin;
  }
}

export function buildPasswordResetRedirectUrl(nextPath: string) {
  const browserOrigin =
    typeof window !== "undefined" ? normalizeOrigin(window.location.origin) : null;
  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || null;
  const baseOrigin =
    browserOrigin ??
    (configuredSiteUrl ? normalizeOrigin(configuredSiteUrl) : null) ??
    "http://localhost:3000";

  const redirectUrl = new URL("/auth/update-password", baseOrigin);
  redirectUrl.searchParams.set("next", nextPath);

  return redirectUrl.toString();
}
