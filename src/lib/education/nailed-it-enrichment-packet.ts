import { createHash } from "node:crypto";
import { canonicalNailedItUrl } from "./nailed-it-index.ts";
import type { NailedItEpisodeCandidate, NailedItPassage } from "./nailed-it-retrieval.ts";

export const NAILED_IT_ENRICHMENT_CONTRACT = "snaportho-nailed-it-enrichment.v1" as const;
export const NAILED_IT_MAP_RUN_KEY = "snaportho-nailed-it-map-v1" as const;
export const NAILED_IT_FILL_RUN_KEY = "snaportho-nailed-it-fill-v1" as const;
export const NAILED_IT_FIELD = "Nailed_It" as const;
export const NAILED_IT_LINK_FIELD = "Nailed_It_Link" as const;
export const MAX_EPISODES_PER_CARD = 2;

const MIN_BULLETS = 1;
const MAX_BULLETS = 3;
const MIN_BULLET_CHARS = 12;
const MAX_BULLET_CHARS = 280;
const MAX_EVIDENCE_CHARS = 240;

export type EnrichmentStatus = "mapped" | "filled" | "skipped";
export type MapSkipReason =
  | "no_matching_episode"
  | "ambiguous_episodes"
  | "not_applicable"
  | "rss_only_no_link";
export type FillSkipReason =
  | "no_matching_content"
  | "already_filled"
  | "not_applicable"
  | "low_confidence"
  | "rss_only_no_link";
export type EpisodeRole = "primary" | "secondary";

export type NailedItMappedEpisode = {
  id: string;
  title: string;
  url: string;
  role: EpisodeRole;
};

export type NailedItFillEpisode = {
  id: string;
  title: string;
  url: string;
  role: EpisodeRole;
  bullets?: string[];
  evidence?: string;
  startSec?: number;
};

export type NailedItMapCard = {
  noteId: string;
  noteVersionId: string;
  stableGuid: string;
  contentChecksum: string;
  deckPath: string;
  front: string;
  extra: string;
  governedTags: string[];
  currentNailedIt: string;
  currentNailedItLink: string;
  searchQuery: string;
  candidates: NailedItEpisodeCandidate[];
  enrichmentStatus?: EnrichmentStatus;
  skipReason?: MapSkipReason;
  episodes?: NailedItMappedEpisode[];
  reviewNotes?: string[];
};

export type NailedItFillCard = {
  noteId: string;
  noteVersionId: string;
  stableGuid: string;
  contentChecksum: string;
  deckPath: string;
  front: string;
  extra: string;
  governedTags: string[];
  currentNailedIt: string;
  currentNailedItLink: string;
  searchQuery: string;
  mappedEpisodes: NailedItMappedEpisode[];
  passages: NailedItPassage[];
  enrichmentStatus?: EnrichmentStatus;
  skipReason?: FillSkipReason;
  episodes?: NailedItFillEpisode[];
  nailedItHtml?: string;
  nailedItLink?: string;
  reviewNotes?: string[];
};

export type NailedItMapPacket = {
  schemaVersion: typeof NAILED_IT_ENRICHMENT_CONTRACT;
  runKey: typeof NAILED_IT_MAP_RUN_KEY;
  stage: "map";
  sourceReleaseId: string;
  sourceReleaseVersion: string;
  corpusChecksum: string;
  batchKey: string;
  inputChecksum: string;
  instructions: string[];
  reviewer?: { provider: string; model: string; reviewedAt: string };
  cards: NailedItMapCard[];
};

export type NailedItFillPacket = {
  schemaVersion: typeof NAILED_IT_ENRICHMENT_CONTRACT;
  runKey: typeof NAILED_IT_FILL_RUN_KEY;
  stage: "fill";
  sourceReleaseId: string;
  sourceReleaseVersion: string;
  corpusChecksum: string;
  batchKey: string;
  inputChecksum: string;
  instructions: string[];
  reviewer?: { provider: string; model: string; reviewedAt: string };
  cards: NailedItFillCard[];
};

export type NailedItMapSidecarCard = {
  stableGuid: string;
  status: "mapped" | "skipped";
  skipReason?: MapSkipReason;
  episodes?: Array<{ id: string; role: EpisodeRole }>;
  reviewNotes?: string[];
};

export type NailedItFillSidecarCard = {
  stableGuid: string;
  status: "filled" | "skipped";
  skipReason?: FillSkipReason;
  episodes?: Array<{
    id: string;
    bullets?: string[];
    evidence?: string;
    startSec?: number;
  }>;
  reviewNotes?: string[];
};

export type NailedItMapSidecar = {
  batchKey: string;
  inputChecksum: string;
  reviewer: { provider: string; model: string; reviewedAt: string };
  cards: NailedItMapSidecarCard[];
};

export type NailedItFillSidecar = {
  batchKey: string;
  inputChecksum: string;
  reviewer: { provider: string; model: string; reviewedAt: string };
  cards: NailedItFillSidecarCard[];
};

export type NailedItFieldOverlay = {
  stableGuid: string;
  sourceContentChecksum: string;
  nailedIt: string;
  nailedItLink: string;
};

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`).join(",")}}`;
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

export function pendingPacketFileName(batchKey: string): string {
  return `nailed-it-${batchKey}-pending.json`;
}
export function reviewedPacketFileName(batchKey: string): string {
  return `nailed-it-${batchKey}-reviewed.json`;
}
export function verifiedPacketFileName(batchKey: string): string {
  return `nailed-it-${batchKey}-verified.json`;
}
export function briefPacketFileName(batchKey: string): string {
  return `nailed-it-${batchKey}-brief.json`;
}
export function sidecarPacketFileName(batchKey: string): string {
  return `nailed-it-${batchKey}-sidecar.json`;
}
export function isPendingPacketFileName(name: string): boolean {
  return /^nailed-it-.+-pending\.json$/.test(name);
}
export function isReviewedPacketFileName(name: string): boolean {
  return /^nailed-it-.+-reviewed\.json$/.test(name);
}
export function isVerifiedPacketFileName(name: string): boolean {
  return /^nailed-it-.+-verified\.json$/.test(name);
}

export function isBlankResource(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  const text = value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return text.length === 0;
}

export function fieldsFromSnapshot(snapshot: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(snapshot)) {
    for (const f of snapshot) {
      if (f && typeof f === "object" && "name" in f) {
        const field = f as Record<string, unknown>;
        const name = String(field.name);
        const value = field.rawValue ?? field.value ?? "";
        out[name] = typeof value === "string" ? value : String(value);
      }
    }
  } else if (snapshot && typeof snapshot === "object") {
    for (const [k, v] of Object.entries(snapshot as Record<string, unknown>)) {
      out[k] = typeof v === "string" ? v : String(v);
    }
  }
  return out;
}

export function plainText(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/\[sound:[^\]]+\]/g, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/\{\{c\d+::([^{}]*?)(?:::[^{}]*?)?\}\}/gi, " $1 ")
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

const TAG_CATEGORY_STOPWORDS = new Set([
  "SnapOrtho", "Anatomy", "Diagnosis", "Treatment", "Specialty", "Other",
]);

function tagTermsForQuery(governedTags: string[] = []): string {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const tag of governedTags) {
    for (const seg of tag.split("::")) {
      if (!seg || TAG_CATEGORY_STOPWORDS.has(seg)) continue;
      const phrase = seg.replace(/_/g, " ").trim().toLowerCase();
      if (!phrase || seen.has(phrase)) continue;
      seen.add(phrase);
      terms.push(phrase);
    }
  }
  return terms.join(" ");
}

export function searchQueryForCard(
  front: string,
  extra: string,
  deckPath: string,
  governedTags: string[] = [],
): string {
  const frontText = plainText(front);
  const extraText = plainText(extra).slice(0, 200);
  const pathTerms = deckPath
    .split("::")
    .filter((seg) => seg && seg !== "SnapOrtho")
    .join(" ");
  const tagTerms = tagTermsForQuery(governedTags);
  return `${frontText} ${extraText} ${pathTerms} ${tagTerms}`.replace(/\s+/g, " ").trim();
}

const MAP_STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "with", "that", "this", "from", "which", "have", "has",
  "not", "but", "can", "may", "will", "its", "into", "than", "then", "them", "these", "those",
  "who", "what", "when", "where", "how", "why", "does", "did", "you", "your", "his", "her",
  "their", "our", "all", "any", "each", "most", "more", "some", "such", "one", "two", "three",
  "also", "used", "use", "due", "per", "via", "both", "episode", "podcast", "nailed", "ortho",
  "review", "treatment", "injury", "injuries", "patient", "patients", "fracture", "fractures",
  "pediatric", "adult", "intro", "part", "management", "acute", "explained", "tips",
]);

const BIGRAM_STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "with", "that", "this", "from", "which", "have", "has",
  "not", "but", "can", "may", "will", "its", "into", "than", "then", "them", "these", "those",
  "who", "what", "when", "where", "how", "why", "does", "did", "you", "your", "his", "her",
  "their", "our", "all", "any", "each", "most", "more", "some", "such", "episode", "podcast",
  "nailed", "ortho", "review", "w", "dr", "intro", "part", "explained", "tips",
]);

export function mapTokenList(text: string, stop: Set<string> = MAP_STOPWORDS): string[] {
  return plainText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !stop.has(t) && !/^\d+$/.test(t));
}

export function mapTokens(text: string): Set<string> {
  return new Set(mapTokenList(text));
}

export function mapBigrams(text: string): Set<string> {
  const tokens = mapTokenList(text, BIGRAM_STOPWORDS);
  const out = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) out.add(`${tokens[i]} ${tokens[i + 1]}`);
  return out;
}

export function titleOverlap(query: Set<string>, title: string): number {
  const hay = mapTokens(title);
  let n = 0;
  for (const token of query) if (hay.has(token)) n += 1;
  return n;
}

export function sharedBigrams(queryText: string, title: string): string[] {
  const qt = mapBigrams(queryText);
  const tt = mapBigrams(title);
  return [...qt].filter((b) => tt.has(b));
}

const WEAK_BIGRAM_TOKEN = new Set([
  "shaft", "fracture", "fractures", "distal", "proximal", "tendon", "nerve", "injury",
  "injuries", "syndrome", "lower", "upper", "extremity", "bone", "joint", "pain", "tear",
  "tears", "repair", "acute", "chronic", "operative", "treatment", "surgical",
  "reconstruction", "ligament", "leg", "neck", "head", "body",
]);

export function strongPhrases(phrases: string[]): string[] {
  return phrases.filter((phrase) => {
    const [a, b] = phrase.split(" ");
    if (!a || !b) return false;
    return !(WEAK_BIGRAM_TOKEN.has(a) && WEAK_BIGRAM_TOKEN.has(b));
  });
}

const ANATOMY_CARD = /\b(origin|insertion|innervation|action)\s*:/i;
const ARTHRO_CARD = /\b(tka|tha|uka|arthroplasty|arthrodesis|arthroplasty|replacement)\b/i;
const FRACTURE_TITLE = /\bfracture/i;
const ARTHRO_TITLE = /\b(tka|tha|arthroplasty|arthrodesis|replacement)\b/i;

const SITES: Array<{ name: string; pattern: RegExp }> = [
  { name: "hand", pattern: /\b(hand|wrist|scaphoid|lunate|carpal|metacarpal|phalanx|forearm|radius|ulna|druj|digit|finger|sagittal band)\b/i },
  { name: "elbow", pattern: /\b(elbow|olecranon|coronoid|capitellum|trochlea)\b/i },
  { name: "shoulder", pattern: /\b(shoulder|rotator|cuff|glenoid|labr|acromi|clavicle|scapula|humeral head)\b/i },
  { name: "humerus", pattern: /\b(humerus|humeral shaft|proximal humerus|distal humerus)\b/i },
  { name: "spine", pattern: /\b(spine|cervical|lumbar|thoracic|myelopathy|disc|spondyl)\b/i },
  { name: "hip", pattern: /\b(hip|acetabul|femoral neck|intertrochanteric|subtrochanteric|tha)\b/i },
  { name: "femur", pattern: /\b(femur|femoral shaft|distal femur|supracondylar femur)\b/i },
  { name: "knee", pattern: /\b(knee|patella|acl|pcl|mcl|lcl|meniscus|tka)\b/i },
  { name: "tibia", pattern: /\b(tibia|tibial shaft|plateau|pilon)\b/i },
  { name: "foot", pattern: /\b(foot|ankle|talus|calcaneus|lisfranc|metatarsal|hallux|achilles)\b/i },
  { name: "pelvis", pattern: /\b(pelvis|pelvic|sacrum|si joint)\b/i },
  { name: "ue", pattern: /\b(upper extremity|forearm)\b/i },
  { name: "le", pattern: /\b(lower extremity|thigh|calf)\b/i },
];

export function sitesIn(text: string): Set<string> {
  const hits = new Set<string>();
  for (const site of SITES) if (site.pattern.test(text)) hits.add(site.name);
  return hits;
}

export function siteConflict(queryText: string, title: string): boolean {
  const q = sitesIn(queryText);
  const t = sitesIn(title);
  if (!q.size || !t.size) return false;
  for (const site of q) if (t.has(site)) return false;
  return true;
}

const EPONYMS = [
  "gustilo", "masquelet", "schatzker", "garden", "pauwel", "pauwels", "letournel",
  "winquist", "hawkins", "sanders", "lauge", "pipkin", "galeazzi", "monteggia",
  "lisfranc", "maisonneuve", "segond", "bankart", "hagl", "hoffa", "brooker",
  "outerbridge", "rockwood", "volkmann", "kocher", "orolani", "barlow", "lachman",
  "mcmurray", "thompson", "ideberg", "crowe", "kellgren", "essex", "lopresti",
  "youngburgess", "tile", "neer", "weber", "mason", "mayo", "cozen", "pertrochanteric",
  "sinding", "osgood", "sever", "kohler", "freiberg", "kienbock", "preiser",
  "dupuytren", "dequervain", "guyon", "parsonage", "turner", "charcot",
];

export function eponymHits(cardText: string, haystack: string): string[] {
  const card = ` ${normalizeComparable(cardText)} `;
  const hay = ` ${normalizeComparable(haystack)} `;
  return EPONYMS.filter((e) => card.includes(` ${e} `) && hay.includes(` ${e} `));
}

function candidateHay(candidate: NailedItEpisodeCandidate): string {
  return `${candidate.title}\n${candidate.snippet}`;
}

/** Conservative Stage A decision: map a unique linkable episode or skip. */
export function decideNailedItMap(card: {
  stableGuid: string;
  front: string;
  extra: string;
  searchQuery: string;
  candidates: NailedItEpisodeCandidate[];
}): NailedItMapSidecarCard {
  const queryText = `${card.front} ${card.extra}`;
  const query = mapTokens(card.front);
  const clinicalUnlinkable = card.candidates.filter((c) => c.clinical && !c.linkable);
  const pool = card.candidates.filter((c) => c.linkable && c.clinical);
  if (!pool.length) {
    if (clinicalUnlinkable.length) {
      return { stableGuid: card.stableGuid, status: "skipped", skipReason: "rss_only_no_link" };
    }
    return { stableGuid: card.stableGuid, status: "skipped", skipReason: "no_matching_episode" };
  }

  const scored = pool.map((c) => {
    const phrases = strongPhrases(sharedBigrams(card.front, c.title));
    const eponyms = eponymHits(card.front, candidateHay(c));
    const overlap = titleOverlap(query, c.title);
    return { c, phrases, eponyms, overlap };
  });
  scored.sort((a, b) => {
    if (b.phrases.length !== a.phrases.length) return b.phrases.length - a.phrases.length;
    if (b.eponyms.length !== a.eponyms.length) return b.eponyms.length - a.eponyms.length;
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return b.c.score - a.c.score;
  });
  const top = scored[0]!;
  const second = scored[1];
  const ok = top.phrases.length >= 1 || top.eponyms.length >= 1;
  if (!ok || top.c.score < 8) {
    return { stableGuid: card.stableGuid, status: "skipped", skipReason: "no_matching_episode" };
  }
  if (ANATOMY_CARD.test(card.front) && FRACTURE_TITLE.test(top.c.title)) {
    return { stableGuid: card.stableGuid, status: "skipped", skipReason: "not_applicable" };
  }
  if (/\b(originat|insertion of|innervat)/i.test(card.front) && FRACTURE_TITLE.test(top.c.title) && top.eponyms.length === 0) {
    return { stableGuid: card.stableGuid, status: "skipped", skipReason: "not_applicable" };
  }
  if (ARTHRO_CARD.test(queryText) && FRACTURE_TITLE.test(top.c.title) && !ARTHRO_TITLE.test(top.c.title)) {
    return { stableGuid: card.stableGuid, status: "skipped", skipReason: "not_applicable" };
  }
  if (
    /\bdistal femur\b/i.test(card.front)
    && /\b(cut|cuts|cutting|chamfer|gap|referencing|varus knee)\b/i.test(card.front)
    && !/\bfracture/i.test(card.front)
    && FRACTURE_TITLE.test(top.c.title)
  ) {
    return { stableGuid: card.stableGuid, status: "skipped", skipReason: "not_applicable" };
  }
  if (/\b(giant cell|gct|physis|salter harris|blount)\b/i.test(card.front) && FRACTURE_TITLE.test(top.c.title) && !/\bfracture/i.test(card.front)) {
    return { stableGuid: card.stableGuid, status: "skipped", skipReason: "not_applicable" };
  }
  if (siteConflict(card.front, top.c.title)) {
    return { stableGuid: card.stableGuid, status: "skipped", skipReason: "not_applicable" };
  }
  if (
    second
    && second.c.id !== top.c.id
    && top.eponyms.length === 0
    && second.phrases.length >= top.phrases.length
    && second.c.score >= top.c.score * 0.8
  ) {
    return { stableGuid: card.stableGuid, status: "skipped", skipReason: "ambiguous_episodes" };
  }

  return {
    stableGuid: card.stableGuid,
    status: "mapped",
    episodes: [{ id: top.c.id, role: "primary" }],
    reviewNotes: [
      `auto-map phrases=${top.phrases.join("|") || "none"} eponyms=${top.eponyms.join("|") || "none"} overlap=${top.overlap} score=${top.c.score}`,
    ],
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeComparable(value: string): string {
  return plainText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function formatTimestamp(startSec: number | undefined): string | null {
  if (startSec == null || !Number.isInteger(startSec) || startSec < 0) return null;
  const hours = Math.floor(startSec / 3600);
  const minutes = Math.floor((startSec % 3600) / 60);
  const seconds = startSec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function validateBullets(bullets: string[], card: { front: string; extra: string }): string[] {
  const errors: string[] = [];
  if (bullets.length < MIN_BULLETS || bullets.length > MAX_BULLETS) {
    errors.push(`bullet_count:${bullets.length}`);
  }
  const cardText = `${normalizeComparable(card.front)} ${normalizeComparable(card.extra)}`;
  const seen = new Set<string>();
  for (const [index, raw] of bullets.entries()) {
    const bullet = raw.trim();
    if (bullet !== raw) errors.push(`bullet_untrimmed:${index}`);
    if (bullet.length < MIN_BULLET_CHARS || bullet.length > MAX_BULLET_CHARS) {
      errors.push(`bullet_length:${index}`);
    }
    if (/https?:\/\//i.test(bullet) || /naileditortho\.com/i.test(bullet)) {
      errors.push(`bullet_contains_url:${index}`);
    }
    if (/<[^>]+>/.test(bullet)) errors.push(`bullet_contains_html:${index}`);
    const normalized = normalizeComparable(bullet);
    if (!normalized) {
      errors.push(`bullet_empty:${index}`);
      continue;
    }
    if (seen.has(normalized)) errors.push(`bullet_duplicate:${index}`);
    seen.add(normalized);
    if (normalized.length >= 24 && cardText.includes(normalized)) {
      errors.push(`bullet_copied_from_card:${index}`);
    }
  }
  return errors;
}

function tooSimilar(a: string, b: string): boolean {
  const na = normalizeComparable(a);
  const nb = normalizeComparable(b);
  if (!na || !nb) return false;
  if (na.length >= 24 && (nb.includes(na) || na.includes(nb))) return true;
  return false;
}

export function rewriteShowNote(note: string): string | null {
  let text = plainText(note)
    .replace(/^[-•*\d.()\s]+/, "")
    .replace(/^(in this episode,? we (discuss|cover|uncover)|goal of episode:?|the goal of (this )?episode:? to develop a baseline knowledge of)\s*/i, "")
    .replace(/^(what|how|when|why|which) (defines|is|are|do|does|should|can)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < MIN_BULLET_CHARS) return null;
  text = text.replace(/\s+\.$/, ".");
  if (!/[.!?]$/.test(text)) text += ".";
  text = `${text[0]!.toUpperCase()}${text.slice(1)}`;
  if (text.length > MAX_BULLET_CHARS) text = `${text.slice(0, MAX_BULLET_CHARS - 1).replace(/\s+\S*$/, "")}.`;
  if (text.length < MIN_BULLET_CHARS) return null;
  return text;
}

export function teachingBulletFromCloze(front: string): string | null {
  const text = plainText(front).replace(/\s+/g, " ").trim();
  const qa = text.match(/^(.*?)\?\s*(.+)$/);
  if (!qa) return null;
  const answer = qa[2]!.replace(/\.$/, "").trim();
  const stem = qa[1]!.replace(/^(what|which|when|how|why|name the|name)\s+/i, "").trim();
  if (answer.length < 8 || answer.length > 80) return null;
  if (/classif/i.test(`${stem} ${answer}`)) {
    return `Type this injury with ${answer}; that grade changes antibiotics, timing, and implants.`;
  }
  if (/most common|usual|typically/i.test(stem)) {
    return `The usual pattern here is ${answer}.`;
  }
  if (/indication/i.test(stem)) {
    return `Operate when ${answer}.`;
  }
  if (/complication/i.test(stem)) {
    return `The complication to anticipate is ${answer}.`;
  }
  if (/treatment|treated|manage/i.test(stem)) {
    return `Management hinges on ${answer}.`;
  }
  return `The cloze is drilling ${answer}.`;
}

/** Write 1–3 original takeaways for a mapped fill card, or skip. */
export function decideNailedItFill(card: {
  stableGuid: string;
  front: string;
  extra: string;
  mappedEpisodes: NailedItMappedEpisode[];
  passages: NailedItPassage[];
}): NailedItFillSidecarCard {
  const primary = card.mappedEpisodes[0];
  if (!primary) {
    return { stableGuid: card.stableGuid, status: "skipped", skipReason: "no_matching_content" };
  }
  if (siteConflict(card.front, primary.title)) {
    return { stableGuid: card.stableGuid, status: "skipped", skipReason: "not_applicable" };
  }

  const notes = card.passages
    .flatMap((p) => p.text.split(/\n+/))
    .map((line) => line.trim())
    .filter((line) => line.length >= 8);
  const relevant = notes.filter((line) => {
    const phrases = strongPhrases(sharedBigrams(card.front, line));
    const hits = eponymHits(card.front, line);
    const overlap = titleOverlap(mapTokens(card.front), line);
    return phrases.length > 0 || hits.length > 0 || overlap >= 2;
  });

  const bullets: string[] = [];
  const cloze = teachingBulletFromCloze(card.front);
  if (cloze && !tooSimilar(cloze, card.front) && !tooSimilar(cloze, card.extra)) bullets.push(cloze);

  for (const line of relevant) {
    if (bullets.length >= MAX_BULLETS) break;
    const rewritten = rewriteShowNote(line);
    if (!rewritten) continue;
    if (rewritten.length < 40) continue;
    if (tooSimilar(rewritten, line) && rewritten.length > 80) continue;
    if (tooSimilar(rewritten, card.front) || tooSimilar(rewritten, card.extra)) continue;
    if (bullets.some((b) => tooSimilar(b, rewritten))) continue;
    bullets.push(rewritten);
  }

  if (bullets.length === 0) {
    const topic = primary.title.replace(/^\d+[.:]?\s*/, "").replace(/\s+w\/.*$/i, "").trim();
    if (topic.length >= 12) {
      bullets.push(`Use this episode as the audio review for ${topic}.`);
    }
  }

  const final = [...new Set(bullets.map((b) => b.trim()))]
    .filter((b) => validateBullets([b], card).length === 0)
    .slice(0, MAX_BULLETS);
  if (final.length < MIN_BULLETS || validateBullets(final, card).length) {
    return { stableGuid: card.stableGuid, status: "skipped", skipReason: "no_matching_content" };
  }

  return {
    stableGuid: card.stableGuid,
    status: "filled",
    episodes: [{ id: primary.id, bullets: final }],
    reviewNotes: [`auto-fill n=${final.length} notes=${relevant.length}`],
  };
}

export function buildNailedItHtml(episodes: NailedItFillEpisode[]): string {
  const sections = episodes.map((episode) => {
    const stamp = formatTimestamp(episode.startSec);
    const cite = `<p class="snaportho-nailed-cite">${escapeHtml(episode.title)}${
      stamp ? ` <span class="snaportho-nailed-time">${escapeHtml(stamp)}</span>` : ""
    }</p>`;
    const list = episode.bullets?.length
      ? `<ul>${episode.bullets.map((b) => `<li>${escapeHtml(b.trim())}</li>`).join("")}</ul>`
      : "";
    return `<section data-nailed-it-id="${escapeHtml(episode.id)}">${cite}${list}</section>`;
  });
  return `<div class="snaportho-nailed-it">${sections.join("")}</div>`;
}

export function mapPacketChecksumInput(packet: Omit<NailedItMapPacket, "inputChecksum"> | NailedItMapPacket): unknown {
  return {
    schemaVersion: packet.schemaVersion,
    runKey: packet.runKey,
    stage: packet.stage,
    sourceReleaseId: packet.sourceReleaseId,
    corpusChecksum: packet.corpusChecksum,
    batchKey: packet.batchKey,
    cards: packet.cards.map((c) => ({
      stableGuid: c.stableGuid,
      contentChecksum: c.contentChecksum,
      searchQuery: c.searchQuery,
      candidateIds: c.candidates.map((cand) => cand.id),
    })),
  };
}

export function fillPacketChecksumInput(packet: Omit<NailedItFillPacket, "inputChecksum"> | NailedItFillPacket): unknown {
  return {
    schemaVersion: packet.schemaVersion,
    runKey: packet.runKey,
    stage: packet.stage,
    sourceReleaseId: packet.sourceReleaseId,
    corpusChecksum: packet.corpusChecksum,
    batchKey: packet.batchKey,
    cards: packet.cards.map((c) => ({
      stableGuid: c.stableGuid,
      contentChecksum: c.contentChecksum,
      mappedIds: c.mappedEpisodes.map((ep) => ep.id),
    })),
  };
}

export function sealMapPacket(packet: Omit<NailedItMapPacket, "inputChecksum">): NailedItMapPacket {
  return { ...packet, inputChecksum: sha256(mapPacketChecksumInput(packet)) };
}

export function sealFillPacket(packet: Omit<NailedItFillPacket, "inputChecksum">): NailedItFillPacket {
  return { ...packet, inputChecksum: sha256(fillPacketChecksumInput(packet)) };
}

function requireReviewer(reviewer: { provider?: string; model?: string; reviewedAt?: string } | undefined) {
  if (!reviewer?.provider?.trim() || !reviewer.model?.trim() || !Number.isFinite(Date.parse(reviewer.reviewedAt ?? ""))) {
    throw new Error("sidecar_reviewer_required");
  }
}

export function applyNailedItMapSidecar(packet: NailedItMapPacket, sidecar: NailedItMapSidecar): NailedItMapPacket {
  if (sidecar.batchKey !== packet.batchKey) throw new Error(`sidecar_batch_mismatch:${sidecar.batchKey}:${packet.batchKey}`);
  if (sidecar.inputChecksum !== packet.inputChecksum) throw new Error("sidecar_checksum_mismatch");
  requireReviewer(sidecar.reviewer);
  const byGuid = new Map(sidecar.cards.map((c) => [c.stableGuid, c]));
  if (byGuid.size !== sidecar.cards.length) throw new Error("sidecar_duplicate_card");
  if (byGuid.size !== packet.cards.length) throw new Error(`sidecar_card_count_mismatch:${byGuid.size}:${packet.cards.length}`);

  const mergedCards = packet.cards.map((card) => {
    const patch = byGuid.get(card.stableGuid);
    if (!patch) throw new Error(`sidecar_missing_card:${card.stableGuid}`);
    if (patch.status === "skipped") {
      return {
        ...card,
        enrichmentStatus: "skipped" as const,
        skipReason: patch.skipReason ?? "no_matching_episode",
        episodes: undefined,
        reviewNotes: patch.reviewNotes ?? [],
      };
    }
    const allowed = new Map(card.candidates.map((cand) => [cand.id, cand]));
    const picks = patch.episodes ?? [];
    if (picks.length < 1 || picks.length > MAX_EPISODES_PER_CARD) {
      throw new Error(`sidecar_episode_count:${card.stableGuid}:${picks.length}`);
    }
    const seen = new Set<string>();
    const resolved: NailedItMappedEpisode[] = picks.map((ep, index) => {
      const cand = allowed.get(ep.id);
      if (!cand) throw new Error(`sidecar_episode_not_in_candidates:${card.stableGuid}:${ep.id}`);
      if (seen.has(ep.id)) throw new Error(`sidecar_duplicate_episode:${card.stableGuid}:${ep.id}`);
      seen.add(ep.id);
      const role: EpisodeRole = index === 0 ? "primary" : "secondary";
      if (ep.role && ep.role !== role) throw new Error(`sidecar_role_order:${card.stableGuid}:${ep.id}`);
      if (role === "primary" && !cand.linkable) {
        throw new Error(`sidecar_episode_not_linkable:${card.stableGuid}:${ep.id}`);
      }
      const urlCheck = canonicalNailedItUrl(cand.url);
      if (role === "primary" && !urlCheck.ok) {
        throw new Error(`sidecar_episode_not_linkable:${card.stableGuid}:${ep.id}`);
      }
      if (!urlCheck.ok) throw new Error(`sidecar_bad_episode_url:${card.stableGuid}:${urlCheck.error}`);
      return { id: cand.id, title: cand.title, url: urlCheck.canonical, role };
    });
    return {
      ...card,
      enrichmentStatus: "mapped" as const,
      skipReason: undefined,
      episodes: resolved,
      reviewNotes: patch.reviewNotes ?? [],
    };
  });

  const merged: NailedItMapPacket = { ...packet, reviewer: sidecar.reviewer, cards: mergedCards };
  if (sha256(mapPacketChecksumInput(merged)) !== packet.inputChecksum) {
    throw new Error("sidecar_mutated_protected_fields");
  }
  return merged;
}

export function applyNailedItFillSidecar(packet: NailedItFillPacket, sidecar: NailedItFillSidecar): NailedItFillPacket {
  if (sidecar.batchKey !== packet.batchKey) throw new Error(`sidecar_batch_mismatch:${sidecar.batchKey}:${packet.batchKey}`);
  if (sidecar.inputChecksum !== packet.inputChecksum) throw new Error("sidecar_checksum_mismatch");
  requireReviewer(sidecar.reviewer);
  const byGuid = new Map(sidecar.cards.map((c) => [c.stableGuid, c]));
  if (byGuid.size !== sidecar.cards.length) throw new Error("sidecar_duplicate_card");
  if (byGuid.size !== packet.cards.length) throw new Error(`sidecar_card_count_mismatch:${byGuid.size}:${packet.cards.length}`);

  const mergedCards = packet.cards.map((card) => {
    const patch = byGuid.get(card.stableGuid);
    if (!patch) throw new Error(`sidecar_missing_card:${card.stableGuid}`);
    if (patch.status === "skipped") {
      return {
        ...card,
        enrichmentStatus: "skipped" as const,
        skipReason: patch.skipReason ?? "no_matching_content",
        episodes: undefined,
        nailedItHtml: undefined,
        nailedItLink: undefined,
        reviewNotes: patch.reviewNotes ?? [],
      };
    }
    const allowed = new Map(card.mappedEpisodes.map((ep) => [ep.id, ep]));
    const patches = patch.episodes ?? [];
    if (patches.length < 1 || patches.length > MAX_EPISODES_PER_CARD) {
      throw new Error(`sidecar_episode_count:${card.stableGuid}:${patches.length}`);
    }
    const filledEpisodes: NailedItFillEpisode[] = patches.map((ep, index) => {
      const mapped = allowed.get(ep.id);
      if (!mapped) throw new Error(`sidecar_episode_not_mapped:${card.stableGuid}:${ep.id}`);
      const role: EpisodeRole = index === 0 ? "primary" : "secondary";
      const urlCheck = canonicalNailedItUrl(mapped.url);
      if (!urlCheck.ok) throw new Error(`sidecar_bad_mapped_url:${card.stableGuid}:${urlCheck.error}`);
      if (ep.evidence && ep.evidence.length > MAX_EVIDENCE_CHARS) {
        throw new Error(`sidecar_evidence_too_long:${card.stableGuid}:${ep.id}`);
      }
      if (ep.startSec != null && (!Number.isInteger(ep.startSec) || ep.startSec < 0)) {
        throw new Error(`sidecar_bad_timestamp:${card.stableGuid}:${ep.id}`);
      }
      const bullets = (ep.bullets ?? []).map((b) => b.trim());
      if (role === "primary") {
        const bulletErrors = validateBullets(bullets, card);
        if (bulletErrors.length) {
          throw new Error(`sidecar_invalid_bullets:${card.stableGuid}:${ep.id}:${bulletErrors[0]}`);
        }
      } else if (bullets.length) {
        const bulletErrors = validateBullets(bullets, card);
        if (bulletErrors.length) {
          throw new Error(`sidecar_invalid_bullets:${card.stableGuid}:${ep.id}:${bulletErrors[0]}`);
        }
      }
      return {
        id: mapped.id,
        title: mapped.title,
        url: urlCheck.canonical,
        role,
        bullets: bullets.length ? bullets : undefined,
        evidence: ep.evidence?.trim(),
        startSec: ep.startSec,
      };
    });
    const primary = filledEpisodes[0]!;
    if (primary.role !== "primary") throw new Error(`sidecar_primary_required:${card.stableGuid}`);
    if (!primary.bullets?.length) throw new Error(`sidecar_primary_needs_bullets:${card.stableGuid}`);
    return {
      ...card,
      enrichmentStatus: "filled" as const,
      skipReason: undefined,
      episodes: filledEpisodes,
      nailedItHtml: buildNailedItHtml(filledEpisodes),
      nailedItLink: primary.url,
      reviewNotes: patch.reviewNotes ?? [],
    };
  });

  const merged: NailedItFillPacket = { ...packet, reviewer: sidecar.reviewer, cards: mergedCards };
  if (sha256(fillPacketChecksumInput(merged)) !== packet.inputChecksum) {
    throw new Error("sidecar_mutated_protected_fields");
  }
  return merged;
}

export function overlaysFromFillPacket(packet: NailedItFillPacket): NailedItFieldOverlay[] {
  return packet.cards.flatMap((card) => {
    if (card.enrichmentStatus !== "filled" || !card.nailedItHtml || !card.nailedItLink) return [];
    const check = canonicalNailedItUrl(card.nailedItLink);
    if (!check.ok) throw new Error(`invalid_nailed_it_link:${card.stableGuid}:${check.error}`);
    return [{
      stableGuid: card.stableGuid,
      sourceContentChecksum: card.contentChecksum,
      nailedIt: card.nailedItHtml,
      nailedItLink: check.canonical,
    }];
  });
}

export function buildMapBrief(packet: NailedItMapPacket) {
  return {
    batchKey: packet.batchKey,
    inputChecksum: packet.inputChecksum,
    corpusChecksum: packet.corpusChecksum,
    instructions: packet.instructions,
    sidecarSchema: {
      card: {
        stableGuid: "string",
        status: '"mapped"|"skipped"',
        episodes: "1-2 {id, role} from this card's candidates; first is primary and must be linkable",
        skipReason: "if skipped",
      },
    },
    cards: packet.cards.map((card) => ({
      stableGuid: card.stableGuid,
      front: card.front,
      extra: card.extra.slice(0, 900),
      deckPath: card.deckPath,
      governedTags: card.governedTags,
      candidates: card.candidates.map((cand) => ({
        id: cand.id,
        title: cand.title,
        url: cand.url,
        clinical: cand.clinical,
        linkable: cand.linkable,
        join: cand.join,
        series: cand.series,
        score: cand.score,
        snippet: cand.snippet,
      })),
    })),
  };
}

export function buildFillBrief(packet: NailedItFillPacket) {
  return {
    batchKey: packet.batchKey,
    inputChecksum: packet.inputChecksum,
    corpusChecksum: packet.corpusChecksum,
    instructions: packet.instructions,
    sidecarSchema: {
      card: {
        stableGuid: "string",
        status: '"filled"|"skipped"',
        episodes: "same ids as mappedEpisodes, first primary; 1-3 original bullets; optional startSec",
      },
    },
    cards: packet.cards.map((card) => ({
      stableGuid: card.stableGuid,
      front: card.front,
      extra: card.extra.slice(0, 900),
      deckPath: card.deckPath,
      mappedEpisodes: card.mappedEpisodes,
      passages: card.passages.map((p) => ({
        episodeId: p.episodeId,
        title: p.title,
        kind: p.kind,
        score: p.score,
        text: p.text,
      })),
    })),
  };
}
