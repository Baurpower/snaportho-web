const ORTHOBULLETS_HOSTS = new Set(['orthobullets.com', 'www.orthobullets.com']);
const ROCK_HOSTS = new Set(['rock.aaos.org', 'www.rock.aaos.org']);
const HIMALAYA_HOSTS = new Set(['learn.aaos.org']);
const SNAPORTHO_HOSTS = new Set(['localhost', '127.0.0.1', 'snaportho.com', 'www.snaportho.com', 'app.snaportho.com']);

function isQuestionBankPermissionHost(hostname: string, pathname: string) {
  const host = hostname.toLowerCase();
  return (
    ORTHOBULLETS_HOSTS.has(host) ||
    ROCK_HOSTS.has(host) ||
    (HIMALAYA_HOSTS.has(host) && /\/diweb(?:\/|$)/i.test(pathname)) ||
    host.endsWith('.rock.aaos.org') ||
    host.includes('orthopaedicrock') ||
    (host.includes('aaos.org') && /\/rock\b/i.test(pathname))
  );
}

function normalizePermissionOrigin(permission: string) {
  try {
    return new URL(permission.replace(/\/\*$/, ''));
  } catch {
    return null;
  }
}

export function getConfiguredAppOrigin() {
  const permissions = chrome.runtime.getManifest().host_permissions ?? [];
  const appOrigins: URL[] = [];
  permissions.forEach((permission: string) => {
    const origin = normalizePermissionOrigin(permission);
    if (!origin) return;
    if (isQuestionBankPermissionHost(origin.hostname, origin.pathname)) return;
    if (!SNAPORTHO_HOSTS.has(origin.hostname.toLowerCase())) return;
    appOrigins.push(origin);
  });

  const localOrigin = appOrigins.find((origin) => ['localhost', '127.0.0.1'].includes(origin.hostname.toLowerCase()));
  if (localOrigin) return localOrigin.toString().replace(/\/$/, '');

  const productionOrigin = appOrigins.find((origin) => ['snaportho.com', 'www.snaportho.com', 'app.snaportho.com'].includes(origin.hostname.toLowerCase()));
  if (productionOrigin) return productionOrigin.toString().replace(/\/$/, '');

  return 'http://localhost:3000';
}

export function isLikelyOrthobulletsUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ORTHOBULLETS_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function isLikelyRockUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      ROCK_HOSTS.has(host) ||
      host.endsWith('.rock.aaos.org') ||
      (host.includes('aaos.org') && /\/rock\b/i.test(parsed.pathname)) ||
      host.includes('orthopaedicrock')
    );
  } catch {
    return false;
  }
}

export function isLikelyHimalayaUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return HIMALAYA_HOSTS.has(parsed.hostname.toLowerCase()) && /\/diweb(?:\/|$)/i.test(parsed.pathname);
  } catch {
    return /learn\.aaos\.org\/diweb/i.test(url);
  }
}

export function detectSupportedQuestionProviderFromUrl(url: string | null | undefined) {
  if (isLikelyOrthobulletsUrl(url)) return 'orthobullets' as const;
  if (isLikelyRockUrl(url)) return 'rock' as const;
  if (isLikelyHimalayaUrl(url)) return 'himalaya' as const;
  return null;
}

export function isLikelySupportedQuestionUrl(url: string | null | undefined) {
  return Boolean(detectSupportedQuestionProviderFromUrl(url));
}

export function isDevelopmentMode() {
  const origin = getConfiguredAppOrigin();
  return origin.includes('localhost') || origin.includes('127.0.0.1');
}
