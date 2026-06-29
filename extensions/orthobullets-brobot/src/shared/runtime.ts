const ORTHOBULLETS_HOSTS = new Set(['orthobullets.com', 'www.orthobullets.com']);

export function getConfiguredAppOrigin() {
  const permissions = chrome.runtime.getManifest().host_permissions ?? [];
  const appPermission = permissions.find((permission: string) => {
    try {
      const origin = new URL(permission.replace(/\/\*$/, ''));
      return !ORTHOBULLETS_HOSTS.has(origin.hostname);
    } catch {
      return false;
    }
  });

  return appPermission ? appPermission.replace(/\/\*$/, '') : 'http://localhost:3000';
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

export function isDevelopmentMode() {
  const origin = getConfiguredAppOrigin();
  return origin.includes('localhost') || origin.includes('127.0.0.1');
}
