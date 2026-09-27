export const ANKI_SOURCE_PAGE_PROVIDERS = ['orthobullets', 'rock'] as const;
export type AnkiSourcePageProvider = (typeof ANKI_SOURCE_PAGE_PROVIDERS)[number];

export function normalizeSourcePageUrl(input: string, provider: AnkiSourcePageProvider) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const allowed = provider === 'orthobullets'
    ? host === 'orthobullets.com'
    : host === 'rock.aaos.org';
  if (!allowed) return null;
  url.hostname = host;
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (
      /^(utm_.+|fbclid|gclid|access_token|refresh_token|token|auth|authorization|session|sessionid|sid|code|state|signature|sig|key|jwt|expires|exp|nonce)$/i.test(key)
      || /(?:token|secret|password|credential|authorization|jwt|signature)/i.test(key)
      || /^(?:api[_-]?key|client[_-]?secret)$/i.test(key)
    ) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  const canonicalUrl = url.toString();
  if (canonicalUrl.length > 1500) return null;
  return { canonicalUrl, sourceUrl: canonicalUrl };
}

export function plainFieldText(value: unknown) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(?:div|p|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function snapshotFields(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const field = entry as Record<string, unknown>;
    return [{
      name: typeof field.name === 'string' ? field.name : 'Field',
      text: plainFieldText(field.plainText ?? field.value ?? field.rawValue),
    }];
  });
}
