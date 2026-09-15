/**
 * Build a local Nailed It Ortho episode catalog from Libsyn RSS + WordPress REST.
 *
 * Pure parse/join. Network I/O lives in scripts/run-nailed-it-enrichment.ts.
 * RSS is the catalog source of truth; WordPress supplies show notes and the
 * trusted naileditortho.com URL. Episodes with no WP page stay rss-only and
 * are not fill-eligible.
 */
import { createHash } from "node:crypto";

export const NAILED_IT_HOST = "naileditortho.com";
export const RSS_FEED_URLS = [
  "https://feeds.libsyn.com/263228/rss",
  "https://naileditortho.libsyn.com/rss",
] as const;
export const WP_POSTS_URL = "https://naileditortho.com/wp-json/wp/v2/posts";
export const WP_CATEGORIES_URL = "https://naileditortho.com/wp-json/wp/v2/categories";
export const BODY_INDEX_CHARS = 4000;

export type NailedItJoin = "rss+wp" | "rss-only";
export type NailedItSeries =
  | "main"
  | "citation-classics"
  | "oite"
  | "monday-missteps"
  | "finance"
  | "orthobiz"
  | "other";

export type NailedItRssItem = {
  guid: string;
  title: string;
  publishedAt: string | null;
  link: string | null;
  description: string;
  durationSec: number | null;
  audioUrl: string | null;
  libsynId: string | null;
};

export type NailedItWpPost = {
  wpId: number;
  slug: string;
  url: string;
  title: string;
  publishedAt: string | null;
  html: string;
  categoryIds: number[];
  libsynId: string | null;
  youtubeId: string | null;
  showNotesAsset: string | null;
};

export type NailedItWpCategory = { id: number; slug: string; name: string };

export type NailedItEpisode = {
  id: string;
  wpId: number | null;
  slug: string | null;
  title: string;
  url: string | null;
  publishedAt: string | null;
  durationSec: number | null;
  series: NailedItSeries;
  clinical: boolean;
  needsReview: boolean;
  categories: string[];
  guest: string | null;
  topics: string[];
  showNoteBullets: string[];
  bodyText: string;
  youtubeId: string | null;
  showNotesAsset: string | null;
  rssGuid: string;
  audioUrl: string | null;
  libsynId: string | null;
  join: NailedItJoin;
  linkable: boolean;
};

export type NailedItCatalog = {
  meta: {
    generatedAt: string;
    rssUrl: string;
    rssItems: number;
    wpPosts: number;
    joined: number;
    rssOnly: number;
    clinical: number;
    excluded: number;
    needsReview: number;
    linkable: number;
  };
  episodes: NailedItEpisode[];
};

export type NailedItIndexStatus = Omit<NailedItCatalog["meta"], "needsReview"> & {
  unmatchedWp: Array<{ wpId: number; title: string; url: string }>;
  needsReview: Array<{ id: string; title: string; reason: string }>;
};

const NONCLINICAL_TITLE =
  /\b(ortho\s*finance|orthobiz|finance \d+|contract basics|physician loan|trademark|billing|coding \+|revenue stream|restrictive covenant|practice mistakes|job market|locums|well-?being|social media|sponsor)\b/i;
const CLINICAL_KEEP =
  /\b(fractures?|fx\b|dislocations?|arthroplast\w*|reconstructions?|tendons?|ligaments?|tumou?rs?|sarcomas?|scoliosis|trauma|repairs?|osteotom\w*|fusions?|arthroscop\w*|citation classics|oite|board review|monday missteps|osteosarcoma|rotator cuff|acl|pcl|meniscus|pji|infections?|nonunions?|malunions?|compartment|pelvis|acetabul\w*|femur|femoral|tibia|tibial|humerus|humeral|radius|ulna|scaphoid|ankle|knee|shoulder|elbow|spine|hip|foot|hand|pediatric|oncolog\w*)\b/i;
const FINANCE_CATEGORY = /^(finance|blog)$/;
const BOILERPLATE_START =
  /(?:About Nailed It Ortho|This episode is sponsored by|You can follow NailedIt Ortho|Follow NailedIt Ortho|Disclosures:|This podcast is NOT medical advice|Its a great podcast for attending|Get on top of the game, deepen your learning)/i;

export function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/gi, " ");
}

export function plainHtml(value: string): string {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function normalizeTitle(value: string): string {
  return decodeEntities(value)
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(w|with|dr|md|phd|the|and|a|of|on|in)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalNailedItUrl(raw: string | null | undefined): { ok: true; canonical: string } | { ok: false; error: string } {
  if (!raw || !raw.trim()) return { ok: false, error: "empty_url" };
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, error: "invalid_url" };
  }
  if (parsed.protocol !== "https:") return { ok: false, error: "https_required" };
  const host = parsed.hostname.replace(/^www\./, "");
  if (host !== NAILED_IT_HOST) return { ok: false, error: "host_not_nailed_it" };
  if (parsed.search) return { ok: false, error: "unexpected_query" };
  if (parsed.hash) return { ok: false, error: "unexpected_hash" };
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length !== 1) return { ok: false, error: "not_episode_path" };
  if (["category", "tag", "author", "sponsor", "about", "contact", "blog"].includes(parts[0]!)) {
    return { ok: false, error: "not_episode_path" };
  }
  return { ok: true, canonical: `https://${NAILED_IT_HOST}/${parts[0]}/` };
}

export function parseDuration(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = raw.trim();
  if (/^\d+$/.test(text)) return Number(text);
  const parts = text.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  return null;
}

export function extractLibsynId(...blobs: Array<string | null | undefined>): string | null {
  for (const blob of blobs) {
    if (!blob) continue;
    const embed = blob.match(/play\.libsyn\.com\/embed\/episode\/id\/(\d+)/i);
    if (embed) return embed[1]!;
    const traffic = blob.match(/traffic\.libsyn\.com\/[^/]+\/(\d+)/i);
    if (traffic) return traffic[1]!;
    const guid = blob.match(/\/episode\/id\/(\d+)/i);
    if (guid) return guid[1]!;
  }
  return null;
}

export function extractYoutubeId(html: string): string | null {
  const match = html.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  return match?.[1] ?? null;
}

export function extractShowNotesAsset(html: string): string | null {
  const match = html.match(/href="(https:\/\/naileditortho\.com\/[^"]+\.(?:pptx|pdf))"/i);
  return match?.[1] ?? null;
}

export function stripBoilerplate(text: string): string {
  const cut = text.search(BOILERPLATE_START);
  if (cut <= 0) return text.trim();
  return text.slice(0, cut).trim();
}

export function extractListItems(html: string): string[] {
  const items: string[] = [];
  for (const match of html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = plainHtml(match[1] ?? "").replace(/^•\s*/, "").trim();
    if (text.length >= 8 && text.length <= 280) items.push(text);
  }
  return items.slice(0, 16);
}

export function extractGuest(title: string, body: string): string | null {
  const fromTitle = title.match(/\bw\/\s+(Dr\.?\s+[^|/]+)$/i);
  if (fromTitle) return fromTitle[1]!.replace(/\s+/g, " ").trim();
  const fromBody = body.match(/\bGuest:\s*(Dr\.?\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})/);
  return fromBody?.[1]?.trim() ?? null;
}

export function episodeIdFor(item: NailedItRssItem): string {
  if (item.libsynId) return `libsyn:${item.libsynId}`;
  const digest = createHash("sha256").update(item.guid || item.title).digest("hex").slice(0, 12);
  return `rss:${digest}`;
}

export function episodeFileName(id: string): string {
  return `${id.replace(/[^a-zA-Z0-9._-]+/g, "_")}.json`;
}

function xmlTag(block: string, name: string): string {
  const re = new RegExp(`<(?:[\\w]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w]+:)?${name}>`, "i");
  const match = block.match(re);
  return match ? decodeEntities(match[1] ?? "").trim() : "";
}

function xmlAttr(block: string, tagName: string, attrName: string): string {
  const re = new RegExp(`<(?:[\\w]+:)?${tagName}\\b[^>]*\\b${attrName}="([^"]+)"`, "i");
  const match = block.match(re);
  return match ? decodeEntities(match[1] ?? "").trim() : "";
}

export function parseRss(xml: string): NailedItRssItem[] {
  const items: NailedItRssItem[] = [];
  const seen = new Set<string>();
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const block = match[1] ?? "";
    const title = xmlTag(block, "title");
    const guid = xmlTag(block, "guid") || xmlAttr(block, "guid", "isPermaLink") || title;
    if (!title || seen.has(guid)) continue;
    seen.add(guid);
    const rawLink = xmlTag(block, "link");
    const linkCheck = canonicalNailedItUrl(rawLink);
    const description = plainHtml(xmlTag(block, "encoded") || xmlTag(block, "description"));
    const enclosure = xmlAttr(block, "enclosure", "url") || null;
    const duration = parseDuration(xmlTag(block, "duration"));
    const publishedAt = parseRssDate(xmlTag(block, "pubDate"));
    const libsynId = extractLibsynId(guid, enclosure, block);
    items.push({
      guid,
      title,
      publishedAt,
      link: linkCheck.ok ? linkCheck.canonical : null,
      description,
      durationSec: duration,
      audioUrl: enclosure,
      libsynId,
    });
  }
  return items;
}

function parseRssDate(raw: string): string | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

function parseWpDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

export function parseWpCategories(rows: unknown): NailedItWpCategory[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((raw) => {
    const row = raw as Record<string, unknown>;
    const id = Number(row.id);
    const slug = typeof row.slug === "string" ? row.slug : "";
    const name = typeof row.name === "string" ? row.name : slug;
    if (!Number.isInteger(id) || !slug) return [];
    return [{ id, slug, name }];
  });
}

export function parseWpPosts(rows: unknown): NailedItWpPost[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((raw) => {
    const row = raw as Record<string, unknown>;
    const wpId = Number(row.id);
    const slug = typeof row.slug === "string" ? row.slug : "";
    const titleObj = row.title as { rendered?: unknown } | undefined;
    const contentObj = row.content as { rendered?: unknown } | undefined;
    const title = typeof titleObj?.rendered === "string" ? decodeEntities(titleObj.rendered).trim() : "";
    const html = typeof contentObj?.rendered === "string" ? contentObj.rendered : "";
    const urlCheck = canonicalNailedItUrl(typeof row.link === "string" ? row.link : `https://${NAILED_IT_HOST}/${slug}/`);
    if (!Number.isInteger(wpId) || !slug || !title || !urlCheck.ok) return [];
    const categoryIds = Array.isArray(row.categories)
      ? row.categories.map((id) => Number(id)).filter((id) => Number.isInteger(id))
      : [];
    return [{
      wpId,
      slug,
      url: urlCheck.canonical,
      title,
      publishedAt: parseWpDate(row.date),
      html,
      categoryIds,
      libsynId: extractLibsynId(html),
      youtubeId: extractYoutubeId(html),
      showNotesAsset: extractShowNotesAsset(html),
    }];
  });
}

export function seriesFor(title: string, categories: string[]): NailedItSeries {
  const hay = `${title} ${categories.join(" ")}`.toLowerCase();
  if (/citation classics/.test(hay)) return "citation-classics";
  if (/\boite\b|board review/.test(hay)) return "oite";
  if (/monday missteps/.test(hay)) return "monday-missteps";
  if (/orthobiz/.test(hay)) return "orthobiz";
  if (/\bfinance\b/.test(hay)) return "finance";
  if (/^\d+:/.test(title.trim()) || categories.includes("podcast")) return "main";
  return "other";
}

export function classifyEpisode(input: {
  title: string;
  categories: string[];
  bodyText: string;
}): { clinical: boolean; needsReview: boolean; reason?: string } {
  const hay = `${input.title}\n${input.bodyText}`.slice(0, 2000);
  const hasClinical = CLINICAL_KEEP.test(hay);
  const hasNonclinical = NONCLINICAL_TITLE.test(input.title) || input.categories.some((c) => FINANCE_CATEGORY.test(c));
  if (hasClinical && !hasNonclinical) return { clinical: true, needsReview: false };
  if (hasClinical && hasNonclinical) {
    return { clinical: true, needsReview: true, reason: "mixed_clinical_career" };
  }
  if (hasNonclinical && !hasClinical) return { clinical: false, needsReview: false };
  if (seriesFor(input.title, input.categories) === "main") {
    return { clinical: true, needsReview: true, reason: "unclear_clinical" };
  }
  return { clinical: false, needsReview: true, reason: "unclear_nonclinical" };
}

function datesClose(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return false;
  return Math.abs(da - db) <= 2 * 24 * 60 * 60 * 1000;
}

export function episodeNumber(title: string, slug?: string | null): string | null {
  const t = decodeEntities(title).trim();
  const fromTitle = t.match(/^#?\s*(\d{1,3})\s*[:.\-–]/) || t.match(/\bep(?:isode)?\s*(\d{1,3})\b/i);
  if (fromTitle) return String(Number(fromTitle[1]));
  if (!slug) return null;
  const fromSlug = slug.match(/^ep(\d{1,3})$/i) || slug.match(/^(\d{1,3})(?:-|$)/);
  if (fromSlug && Number(fromSlug[1]) <= 250) return String(Number(fromSlug[1]));
  return null;
}

function titleTokens(title: string): Set<string> {
  const stop = new Set(["with", "the", "and", "for", "from", "this", "that", "episode", "podcast", "ortho", "nailed"]);
  return new Set(normalizeTitle(title).split(" ").filter((t) => t.length >= 3 && !stop.has(t)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const token of a) if (b.has(token)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function guestLastName(title: string): string | null {
  const match = decodeEntities(title).match(/\b(?:w\/|with)\s+(?:dr\.?\s+)?([A-Z][A-Za-z'’-]+)\s*$/);
  return match ? match[1]!.toLowerCase().replace(/[^a-z]/g, "") : null;
}

export function joinScore(rss: NailedItRssItem, post: NailedItWpPost): number {
  const rssNum = episodeNumber(rss.title);
  const wpNum = episodeNumber(post.title, post.slug);
  const rssTok = titleTokens(rss.title);
  const wpTok = titleTokens(post.title);
  const overlap = jaccard(rssTok, wpTok);
  let score = overlap * 5;
  if (rssNum && wpNum && rssNum === wpNum) score += 10;
  const rssGuest = guestLastName(rss.title);
  const wpGuest = guestLastName(post.title);
  if (rssGuest && wpGuest && rssGuest === wpGuest) score += 1.5;
  if (datesClose(rss.publishedAt, post.publishedAt)) score += 0.4;
  const monday = rssTok.has("monday") && rssTok.has("missteps") && wpTok.has("monday") && wpTok.has("missteps");
  if (monday && overlap < 0.55 && !(rssNum && wpNum && rssNum === wpNum)) return 0;
  return score;
}

export function joinCatalog(input: {
  rss: NailedItRssItem[];
  posts: NailedItWpPost[];
  categories: NailedItWpCategory[];
  generatedAt?: string;
  rssUrl?: string;
}): { catalog: NailedItCatalog; status: NailedItIndexStatus; unmatchedWp: NailedItWpPost[] } {
  const catById = new Map(input.categories.map((c) => [c.id, c]));
  const usedWp = new Set<number>();
  const postsByUrl = new Map(input.posts.map((p) => [p.url, p]));
  const postsByLibsyn = new Map<string, NailedItWpPost>();
  for (const post of input.posts) {
    if (post.libsynId && !postsByLibsyn.has(post.libsynId)) postsByLibsyn.set(post.libsynId, post);
  }

  function matchWp(item: NailedItRssItem): NailedItWpPost | null {
    if (item.link && postsByUrl.has(item.link)) {
      const hit = postsByUrl.get(item.link)!;
      if (!usedWp.has(hit.wpId)) return hit;
    }
    if (item.libsynId && postsByLibsyn.has(item.libsynId)) {
      const hit = postsByLibsyn.get(item.libsynId)!;
      if (!usedWp.has(hit.wpId)) return hit;
    }
    let best: NailedItWpPost | null = null;
    let bestScore = 0;
    for (const post of input.posts) {
      if (usedWp.has(post.wpId)) continue;
      const score = joinScore(item, post);
      if (score > bestScore) {
        bestScore = score;
        best = post;
      }
    }
    if (!best) return null;
    const rssNum = episodeNumber(item.title);
    const wpNum = episodeNumber(best.title, best.slug);
    const strongNumber = Boolean(rssNum && wpNum && rssNum === wpNum && bestScore >= 10);
    if (strongNumber || bestScore >= 2.5) return best;
    return null;
  }

  const episodes: NailedItEpisode[] = [];
  const needsReviewRows: Array<{ id: string; title: string; reason: string }> = [];

  for (const item of input.rss) {
    const post = matchWp(item);
    if (post) usedWp.add(post.wpId);
    const categorySlugs = (post?.categoryIds ?? [])
      .map((id) => catById.get(id)?.slug)
      .filter((slug): slug is string => Boolean(slug));
    const html = post?.html ?? "";
    const bullets = extractListItems(html);
    const bodyText = stripBoilerplate(plainHtml(html) || item.description).slice(0, BODY_INDEX_CHARS);
    const topics = bullets
      .map((b) => b.replace(/^(how to|what|when|the role of|tips for)\s+/i, "").slice(0, 80))
      .slice(0, 8);
    const classification = classifyEpisode({
      title: item.title,
      categories: categorySlugs,
      bodyText: `${bodyText}\n${item.description}`,
    });
    const url = post?.url ?? item.link;
    const canonical = url ? canonicalNailedItUrl(url) : null;
    const linkable = Boolean(canonical?.ok);
    const id = episodeIdFor(item);
    if (classification.needsReview) {
      needsReviewRows.push({ id, title: item.title, reason: classification.reason ?? "needs_review" });
    }
    episodes.push({
      id,
      wpId: post?.wpId ?? null,
      slug: post?.slug ?? (url ? url.replace(/^https:\/\/naileditortho\.com\//, "").replace(/\/$/, "") : null),
      title: item.title,
      url: canonical?.ok ? canonical.canonical : null,
      publishedAt: post?.publishedAt ?? item.publishedAt,
      durationSec: item.durationSec,
      series: seriesFor(item.title, categorySlugs),
      clinical: classification.clinical,
      needsReview: classification.needsReview,
      categories: categorySlugs,
      guest: extractGuest(item.title, bodyText),
      topics,
      showNoteBullets: bullets,
      bodyText,
      youtubeId: post?.youtubeId ?? null,
      showNotesAsset: post?.showNotesAsset ?? null,
      rssGuid: item.guid,
      audioUrl: item.audioUrl,
      libsynId: item.libsynId ?? post?.libsynId ?? null,
      join: post ? "rss+wp" : "rss-only",
      linkable,
    });
  }

  const unmatchedWp = input.posts.filter((p) => !usedWp.has(p.wpId));
  const joined = episodes.filter((e) => e.join === "rss+wp").length;
  const rssOnly = episodes.length - joined;
  const clinical = episodes.filter((e) => e.clinical).length;
  const meta = {
    generatedAt: input.generatedAt ?? "1970-01-01T00:00:00.000Z",
    rssUrl: input.rssUrl ?? RSS_FEED_URLS[0],
    rssItems: input.rss.length,
    wpPosts: input.posts.length,
    joined,
    rssOnly,
    clinical,
    excluded: episodes.length - clinical,
    needsReview: needsReviewRows.length,
    linkable: episodes.filter((e) => e.linkable).length,
  };
  return {
    catalog: { meta, episodes },
    status: {
      ...meta,
      unmatchedWp: unmatchedWp.map((p) => ({ wpId: p.wpId, title: p.title, url: p.url })),
      needsReview: needsReviewRows,
    },
    unmatchedWp,
  };
}

export function retrievalText(episode: NailedItEpisode): string {
  return [
    episode.title,
    episode.guest ?? "",
    episode.categories.join(" "),
    episode.topics.join(" "),
    episode.showNoteBullets.join("\n"),
    episode.bodyText,
  ].filter(Boolean).join("\n");
}
