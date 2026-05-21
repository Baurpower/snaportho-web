const INVALID_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "localhost"]);

function normalizeBaseUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const hostName = url.hostname.toLowerCase();
    if (INVALID_HOSTS.has(hostName)) {
      return null;
    }

    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function resolveBrowserAccessibleBaseUrl(request: Request): string {
  const envBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL ?? "");
  if (envBaseUrl) {
    return envBaseUrl;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const host = request.headers.get("host")?.trim();
  const derivedProto = forwardedProto && forwardedProto.length > 0 ? forwardedProto : "http";
  const derivedHost = forwardedHost && forwardedHost.length > 0 ? forwardedHost : host;

  if (derivedHost) {
    const derivedBaseUrl = normalizeBaseUrl(`${derivedProto}://${derivedHost}`);
    if (derivedBaseUrl) {
      return derivedBaseUrl;
    }
  }

  const requestBaseUrl = normalizeBaseUrl(request.url);
  if (requestBaseUrl) {
    return requestBaseUrl;
  }

  const addonBaseUrl = normalizeBaseUrl(
    request.headers.get("x-snaportho-addon-base-url") ?? ""
  );
  if (addonBaseUrl) {
    return addonBaseUrl;
  }

  throw new Error(
    "Unable to determine a browser-accessible base URL for BroBot device approval."
  );
}
