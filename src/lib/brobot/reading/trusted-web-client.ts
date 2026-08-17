import { normalizeReadingTopic } from './ranker';
import type { ReadingTopicContext } from './topic-context';
import type { BroBotReadingRecommendation } from './types';
import { isTrustedReadingUrl, verifyTrustedWebResult } from './verifier';

export type TrustedWebSearchResult = Pick<BroBotReadingRecommendation,
  'id' | 'title' | 'resourceType' | 'sourceName' | 'url' | 'whyItMatters' | 'tags'>;

const ORTHOBULLETS_SEARCH_URL = 'https://www.orthobullets.com/Site/ElasticSearch/QuickSearch';
const AO_SITEMAP_INDEX_URL = 'https://surgeryreference.aofoundation.org/seo/sitemapindex';
const NAILED_IT_SEARCH_URL = 'https://naileditortho.com/wp-json/wp/v2/search';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;
type CacheEntry<T> = { expiresAt: number; value: T };
const resultCache = new Map<string, CacheEntry<TrustedWebSearchResult[]>>();
let aoUrlCache: CacheEntry<string[]> | null = null;

function decodeEntities(value: string) {
  return value.replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function plainText(value: string) {
  return decodeEntities(value.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

function requestInit(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: { Accept: 'text/html, application/xml;q=0.9', ...init.headers },
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };
}

function topicQuery(topic: ReadingTopicContext) {
  return (topic.aliases[0] || topic.displayTopic).replace(/["<>]/g, '').trim();
}

function topicTokens(topic: ReadingTopicContext) {
  const stop = new Set(['and', 'the', 'with', 'for', 'open', 'reduction', 'internal', 'fixation', 'orif']);
  return Array.from(new Set([topic.displayTopic, ...topic.aliases]
    .flatMap((value) => normalizeReadingTopic(value).split('_'))
    .filter((token) => token.length > 2 && !stop.has(token))));
}

export function parseOrthobulletsQuickSearch(html: string, topic: ReadingTopicContext): TrustedWebSearchResult[] {
  const results: TrustedWebSearchResult[] = [];
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*data-content-type=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const rawPath = decodeEntities(match[1] ?? '');
    const title = plainText(match[3] ?? '');
    if (!rawPath || !title) continue;
    const url = new URL(rawPath, 'https://www.orthobullets.com');
    url.searchParams.delete('hideLeftMenu');
    if (!isTrustedReadingUrl(url.toString())) continue;
    const isTechnique = match[2] === '31';
    results.push({
      id: `orthobullets-${Buffer.from(url.toString()).toString('base64url').slice(0, 28)}`,
      title,
      resourceType: isTechnique ? 'technique_article' : 'educational_website',
      sourceName: 'Orthobullets',
      url: url.toString(),
      whyItMatters: isTechnique
        ? `Operative technique for ${topic.displayTopic} from Orthobullets.`
        : `High-yield topic review for ${topic.displayTopic} from Orthobullets.`,
      tags: [topic.topicKey, ...topic.tags],
    });
  }
  return results.slice(0, 4);
}

export function parseSitemapLocations(xml: string) {
  return Array.from(xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi), (match) =>
    decodeEntities(match[1] ?? '').trim()).filter(Boolean);
}

function aoTitle(url: string) {
  const slug = new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? 'AO Surgery Reference';
  return slug.split('-').filter(Boolean)
    .map((word) => word.length <= 3 ? word.toUpperCase() : `${word[0]?.toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function aoUrlScore(url: string, tokens: string[]) {
  const path = normalizeReadingTopic(new URL(url).pathname);
  const matches = tokens.filter((token) => path.includes(token)).length;
  const humanClinical = /\/orthopedic-trauma\/(adult-trauma|pediatric-trauma)\//.test(url) ? 3 : 0;
  const procedure = /approach|orif|plate|screw|fixation|tension-band|reduction/.test(path) ? 1 : 0;
  return matches * 3 + humanClinical + procedure;
}

async function loadAoUrls(fetchImpl: typeof fetch) {
  if (aoUrlCache && aoUrlCache.expiresAt > Date.now()) return aoUrlCache.value;
  const indexResponse = await fetchImpl(AO_SITEMAP_INDEX_URL, requestInit());
  if (!indexResponse.ok) throw new Error(`AO sitemap index failed: ${indexResponse.status}`);
  const sitemapUrls = parseSitemapLocations(await indexResponse.text()).slice(0, 8);
  const maps = await Promise.all(sitemapUrls.map(async (url) => {
    const response = await fetchImpl(url, requestInit());
    return response.ok ? parseSitemapLocations(await response.text()) : [];
  }));
  const urls = maps.flat().filter((url) => {
    try {
      return new URL(url).hostname === 'surgeryreference.aofoundation.org' && !/\/vet\//.test(url);
    } catch { return false; }
  });
  aoUrlCache = { expiresAt: Date.now() + CACHE_TTL_MS, value: urls };
  return urls;
}

async function retrieveAoResults(topic: ReadingTopicContext, fetchImpl: typeof fetch) {
  const tokens = topicTokens(topic);
  if (!tokens.length) return [];
  const urls = await loadAoUrls(fetchImpl);
  return urls.map((url) => ({ url, score: aoUrlScore(url, tokens) }))
    .filter(({ score }) => score >= Math.max(6, Math.min(tokens.length, 2) * 3))
    .sort((a, b) => b.score - a.score || a.url.length - b.url.length).slice(0, 3)
    .map(({ url }, index): TrustedWebSearchResult => ({
      id: `ao-${index}-${Buffer.from(url).toString('base64url').slice(0, 28)}`,
      title: aoTitle(url),
      resourceType: 'technique_article', sourceName: 'AO Surgery Reference', url,
      whyItMatters: `Procedure-focused operative reference for ${topic.displayTopic} from AO Foundation.`,
      tags: [topic.topicKey, ...topic.tags],
    }));
}

async function retrieveOrthobulletsResults(topic: ReadingTopicContext, fetchImpl: typeof fetch) {
  const response = await fetchImpl(ORTHOBULLETS_SEARCH_URL, requestInit({
    method: 'POST', body: new URLSearchParams({ searchValue: topicQuery(topic) }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
  }));
  if (!response.ok) throw new Error(`Orthobullets search failed: ${response.status}`);
  return parseOrthobulletsQuickSearch(await response.text(), topic);
}

type NailedItSearchItem = { id?: unknown; title?: unknown; url?: unknown; subtype?: unknown };

export function parseNailedItSearch(items: unknown, topic: ReadingTopicContext): TrustedWebSearchResult[] {
  if (!Array.isArray(items)) return [];
  const tokens = topicTokens(topic);
  return items.flatMap((raw): TrustedWebSearchResult[] => {
    const item = raw as NailedItSearchItem;
    const title = typeof item.title === 'string' ? decodeEntities(item.title).trim() : '';
    const url = typeof item.url === 'string' ? item.url : '';
    const normalizedTitle = normalizeReadingTopic(title);
    const matchedTokens = tokens.filter((token) => normalizedTitle.includes(token));
    const strongTopicMatch = matchedTokens.length >= Math.min(2, tokens.length);
    if (!title || !strongTopicMatch || item.subtype !== 'post' || !isTrustedReadingUrl(url)) return [];
    return [{
      id: `nailed-it-${String(item.id ?? Buffer.from(url).toString('base64url')).slice(0, 28)}`,
      title,
      resourceType: 'educational_website',
      sourceName: 'Nailed It Ortho Podcast',
      url,
      whyItMatters: `Podcast episode for an audio review of ${topic.displayTopic}.`,
      tags: [topic.topicKey, ...topic.tags, 'podcast', 'audio'],
    }];
  }).slice(0, 3);
}

async function retrieveNailedItResults(topic: ReadingTopicContext, fetchImpl: typeof fetch) {
  const url = new URL(NAILED_IT_SEARCH_URL);
  url.searchParams.set('search', topicQuery(topic));
  url.searchParams.set('per_page', '8');
  url.searchParams.set('subtype', 'post');
  const response = await fetchImpl(url, requestInit({ headers: { Accept: 'application/json' } }));
  if (!response.ok) throw new Error(`Nailed It Ortho search failed: ${response.status}`);
  return parseNailedItSearch(await response.json(), topic);
}

/** Account-free discovery using each trusted site's own public search/index surface. */
export async function retrieveTrustedWebResults(params: { topic: ReadingTopicContext; fetchImpl?: typeof fetch }) {
  const cached = resultCache.get(params.topic.topicKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const fetchImpl = params.fetchImpl ?? fetch;
  const [orthobullets, ao, nailedIt] = await Promise.all([
    retrieveOrthobulletsResults(params.topic, fetchImpl).catch((error) => {
      console.warn('[brobot] Orthobullets discovery failed (non-fatal)', error); return [];
    }),
    retrieveAoResults(params.topic, fetchImpl).catch((error) => {
      console.warn('[brobot] AO sitemap discovery failed (non-fatal)', error); return [];
    }),
    retrieveNailedItResults(params.topic, fetchImpl).catch((error) => {
      console.warn('[brobot] Nailed It Ortho discovery failed (non-fatal)', error); return [];
    }),
  ]);
  const value = [...orthobullets, ...ao, ...nailedIt];
  resultCache.set(params.topic.topicKey, {
    // Retry partial source outages sooner while still protecting upstreams.
    expiresAt: Date.now() + (orthobullets.length > 0 && ao.length > 0 && nailedIt.length > 0
      ? CACHE_TTL_MS : 10 * 60 * 1000),
    value,
  });
  return value;
}

export function filterVerifiedTrustedWebResults(results: TrustedWebSearchResult[], topic: ReadingTopicContext) {
  return results.filter((result) => isTrustedReadingUrl(result.url) && verifyTrustedWebResult({
    ...result, journal: undefined, year: undefined, access: 'free', rankScore: 0, rankPosition: 1,
  }, topic));
}
