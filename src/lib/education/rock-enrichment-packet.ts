import { createHash } from "node:crypto";
import type { RockChapterCandidate, RockPageCandidate } from "./rock-retrieval.ts";
import { catalogUrlForId } from "./rock-retrieval.ts";

export const ROCK_ENRICHMENT_CONTRACT = "snaportho-rock-enrichment.v1" as const;
export const ROCK_MAP_RUN_KEY = "snaportho-rock-map-v1" as const;
export const ROCK_FILL_RUN_KEY = "snaportho-rock-fill-v1" as const;
export const ROCK_FIELD = "ROCK" as const;
export const ROCK_LINK_FIELD = "ROCK_Link" as const;
export const MAX_CHAPTERS_PER_CARD = 3;
export const CATALOG_HOST = "rock.aaos.org";

const MIN_BULLETS = 2;
const MAX_BULLETS = 6;
const MIN_BULLET_CHARS = 12;
const MAX_BULLET_CHARS = 280;
const MAX_EVIDENCE_CHARS = 240;

export type EnrichmentStatus = "mapped" | "filled" | "skipped";
export type MapSkipReason =
  | "no_matching_chapter"
  | "ambiguous_chapters"
  | "not_applicable";
export type FillSkipReason =
  | "no_matching_content"
  | "already_filled"
  | "not_applicable"
  | "low_confidence"
  | "pending_pdf";
export type ChapterRole = "primary" | "secondary";

export type RockMappedChapter = {
  id: string;
  title: string;
  url: string;
  role: ChapterRole;
};

export type RockFillChapter = {
  id: string;
  title: string;
  url: string;
  role: ChapterRole;
  bullets?: string[];
  evidence?: string;
  linkOnly?: boolean;
};

export type RockMapCard = {
  noteId: string;
  noteVersionId: string;
  stableGuid: string;
  contentChecksum: string;
  deckPath: string;
  front: string;
  extra: string;
  governedTags: string[];
  currentRock: string;
  currentRockLink: string;
  searchQuery: string;
  candidates: RockChapterCandidate[];
  enrichmentStatus?: EnrichmentStatus;
  skipReason?: MapSkipReason;
  chapters?: RockMappedChapter[];
  reviewNotes?: string[];
};

export type RockFillCard = {
  noteId: string;
  noteVersionId: string;
  stableGuid: string;
  contentChecksum: string;
  deckPath: string;
  front: string;
  extra: string;
  governedTags: string[];
  currentRock: string;
  currentRockLink: string;
  searchQuery: string;
  mappedChapters: RockMappedChapter[];
  pageCandidates: RockPageCandidate[];
  enrichmentStatus?: EnrichmentStatus;
  skipReason?: FillSkipReason;
  chapters?: RockFillChapter[];
  rockHtml?: string;
  rockLink?: string;
  reviewNotes?: string[];
};

export type RockMapPacket = {
  schemaVersion: typeof ROCK_ENRICHMENT_CONTRACT;
  runKey: typeof ROCK_MAP_RUN_KEY;
  stage: "map";
  sourceReleaseId: string;
  sourceReleaseVersion: string;
  corpusChecksum: string;
  batchKey: string;
  inputChecksum: string;
  instructions: string[];
  reviewer?: { provider: string; model: string; reviewedAt: string };
  cards: RockMapCard[];
};

export type RockFillPacket = {
  schemaVersion: typeof ROCK_ENRICHMENT_CONTRACT;
  runKey: typeof ROCK_FILL_RUN_KEY;
  stage: "fill";
  sourceReleaseId: string;
  sourceReleaseVersion: string;
  corpusChecksum: string;
  batchKey: string;
  inputChecksum: string;
  instructions: string[];
  reviewer?: { provider: string; model: string; reviewedAt: string };
  cards: RockFillCard[];
};

export type RockMapSidecarCard = {
  stableGuid: string;
  status: "mapped" | "skipped";
  skipReason?: MapSkipReason;
  chapters?: Array<{ id: string; role: ChapterRole }>;
  reviewNotes?: string[];
};

export type RockFillSidecarCard = {
  stableGuid: string;
  status: "filled" | "skipped";
  skipReason?: FillSkipReason;
  chapters?: Array<{
    id: string;
    bullets?: string[];
    evidence?: string;
    linkOnly?: boolean;
  }>;
  reviewNotes?: string[];
};

export type RockMapSidecar = {
  batchKey: string;
  inputChecksum: string;
  reviewer: { provider: string; model: string; reviewedAt: string };
  cards: RockMapSidecarCard[];
};

export type RockFillSidecar = {
  batchKey: string;
  inputChecksum: string;
  reviewer: { provider: string; model: string; reviewedAt: string };
  cards: RockFillSidecarCard[];
};

export type RockFieldOverlay = {
  stableGuid: string;
  sourceContentChecksum: string;
  rock: string;
  rockLink: string;
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
  return `rock-${batchKey}-pending.json`;
}
export function reviewedPacketFileName(batchKey: string): string {
  return `rock-${batchKey}-reviewed.json`;
}
export function verifiedPacketFileName(batchKey: string): string {
  return `rock-${batchKey}-verified.json`;
}
export function briefPacketFileName(batchKey: string): string {
  return `rock-${batchKey}-brief.json`;
}
export function sidecarPacketFileName(batchKey: string): string {
  return `rock-${batchKey}-sidecar.json`;
}
export function isPendingPacketFileName(name: string): boolean {
  return /^rock-.+-pending\.json$/.test(name);
}
export function isReviewedPacketFileName(name: string): boolean {
  return /^rock-.+-reviewed\.json$/.test(name);
}
export function isVerifiedPacketFileName(name: string): boolean {
  return /^rock-.+-verified\.json$/.test(name);
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
    .replace(/\[sound:[^\]]+\]/gi, " ")
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

// Governed-tag segments that are organizational, not clinical. Dropping them
// keeps the specific anatomy/diagnosis/treatment leaves (e.g. "Syndesmosis",
// "Achilles Tendon Rupture") that actually drive chapter recall.
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

export function canonicalRockChapterUrl(raw: string, expectedId?: string): { ok: true; canonical: string } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, error: "invalid_url" };
  }
  if (parsed.protocol !== "https:") return { ok: false, error: "https_required" };
  if (parsed.hostname !== CATALOG_HOST) return { ok: false, error: "host_not_rock" };
  if (parsed.pathname.toLowerCase() !== "/coursecontent.aspx") return { ok: false, error: "not_chapter_path" };
  const id = parsed.searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) return { ok: false, error: "missing_chapter_id" };
  if ([...parsed.searchParams.keys()].some((key) => key !== "id")) {
    return { ok: false, error: "unexpected_query" };
  }
  if (parsed.hash) return { ok: false, error: "unexpected_hash" };
  if (expectedId && id !== expectedId) return { ok: false, error: "id_mismatch" };
  return { ok: true, canonical: catalogUrlForId(id) };
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
    if (/https?:\/\//i.test(bullet) || /rock\.aaos\.org/i.test(bullet)) {
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

export function buildRockHtml(chapters: RockFillChapter[]): string {
  const sections = chapters.map((chapter) => {
    const cite = `<p class="snaportho-rock-cite">${escapeHtml(chapter.title)}</p>`;
    const list = chapter.linkOnly || !chapter.bullets?.length
      ? ""
      : `<ul>${chapter.bullets.map((b) => `<li>${escapeHtml(b.trim())}</li>`).join("")}</ul>`;
    const open = `<p class="resource-open"><a class="external" href="${escapeHtml(chapter.url)}">Open chapter ↗</a></p>`;
    return `<section data-rock-id="${escapeHtml(chapter.id)}">${cite}${list}${open}</section>`;
  });
  return `<div class="snaportho-rock">${sections.join("")}</div>`;
}

export function mapPacketChecksumInput(packet: Omit<RockMapPacket, "inputChecksum"> | RockMapPacket): unknown {
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

export function fillPacketChecksumInput(packet: Omit<RockFillPacket, "inputChecksum"> | RockFillPacket): unknown {
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
      mappedIds: c.mappedChapters.map((ch) => ch.id),
    })),
  };
}

export function sealMapPacket(packet: Omit<RockMapPacket, "inputChecksum">): RockMapPacket {
  return { ...packet, inputChecksum: sha256(mapPacketChecksumInput(packet)) };
}

export function sealFillPacket(packet: Omit<RockFillPacket, "inputChecksum">): RockFillPacket {
  return { ...packet, inputChecksum: sha256(fillPacketChecksumInput(packet)) };
}

function requireReviewer(reviewer: { provider?: string; model?: string; reviewedAt?: string } | undefined) {
  if (!reviewer?.provider?.trim() || !reviewer.model?.trim() || !Number.isFinite(Date.parse(reviewer.reviewedAt ?? ""))) {
    throw new Error("sidecar_reviewer_required");
  }
}

export function applyRockMapSidecar(packet: RockMapPacket, sidecar: RockMapSidecar): RockMapPacket {
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
        skipReason: patch.skipReason ?? "no_matching_chapter",
        chapters: undefined,
        reviewNotes: patch.reviewNotes ?? [],
      };
    }
    const allowed = new Map(card.candidates.map((cand) => [cand.id, cand]));
    const chapters = patch.chapters ?? [];
    if (chapters.length < 1 || chapters.length > MAX_CHAPTERS_PER_CARD) {
      throw new Error(`sidecar_chapter_count:${card.stableGuid}:${chapters.length}`);
    }
    const seen = new Set<string>();
    let primaries = 0;
    const resolved: RockMappedChapter[] = chapters.map((ch, index) => {
      const cand = allowed.get(ch.id);
      if (!cand) throw new Error(`sidecar_chapter_not_in_candidates:${card.stableGuid}:${ch.id}`);
      if (seen.has(ch.id) || seen.has(cand.canonicalId)) {
        throw new Error(`sidecar_duplicate_chapter:${card.stableGuid}:${ch.id}`);
      }
      seen.add(ch.id);
      seen.add(cand.canonicalId);
      const role: ChapterRole = index === 0 ? "primary" : "secondary";
      if (ch.role && ch.role !== role) throw new Error(`sidecar_role_order:${card.stableGuid}:${ch.id}`);
      if (role === "primary") primaries += 1;
      return { id: cand.id, title: cand.title, url: cand.url, role };
    });
    if (primaries !== 1) throw new Error(`sidecar_primary_required:${card.stableGuid}`);
    return {
      ...card,
      enrichmentStatus: "mapped" as const,
      skipReason: undefined,
      chapters: resolved,
      reviewNotes: patch.reviewNotes ?? [],
    };
  });

  const merged: RockMapPacket = { ...packet, reviewer: sidecar.reviewer, cards: mergedCards };
  if (sha256(mapPacketChecksumInput(merged)) !== packet.inputChecksum) {
    throw new Error("sidecar_mutated_protected_fields");
  }
  return merged;
}

export function applyRockFillSidecar(packet: RockFillPacket, sidecar: RockFillSidecar): RockFillPacket {
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
        chapters: undefined,
        rockHtml: undefined,
        rockLink: undefined,
        reviewNotes: patch.reviewNotes ?? [],
      };
    }
    const allowed = new Map(card.mappedChapters.map((ch) => [ch.id, ch]));
    const patches = patch.chapters ?? [];
    if (patches.length < 1 || patches.length > MAX_CHAPTERS_PER_CARD) {
      throw new Error(`sidecar_chapter_count:${card.stableGuid}:${patches.length}`);
    }
    const filledChapters: RockFillChapter[] = patches.map((ch, index) => {
      const mapped = allowed.get(ch.id);
      if (!mapped) throw new Error(`sidecar_chapter_not_mapped:${card.stableGuid}:${ch.id}`);
      const role: ChapterRole = index === 0 ? "primary" : "secondary";
      const urlCheck = canonicalRockChapterUrl(mapped.url, mapped.id);
      if (!urlCheck.ok) throw new Error(`sidecar_bad_mapped_url:${card.stableGuid}:${urlCheck.error}`);
      if (ch.evidence && ch.evidence.length > MAX_EVIDENCE_CHARS) {
        throw new Error(`sidecar_evidence_too_long:${card.stableGuid}:${ch.id}`);
      }
      if (ch.linkOnly) {
        return {
          id: mapped.id,
          title: mapped.title,
          url: urlCheck.canonical,
          role,
          linkOnly: true,
          evidence: ch.evidence?.trim(),
        };
      }
      const bullets = (ch.bullets ?? []).map((b) => b.trim());
      const bulletErrors = validateBullets(bullets, card);
      if (bulletErrors.length) {
        throw new Error(`sidecar_invalid_bullets:${card.stableGuid}:${ch.id}:${bulletErrors[0]}`);
      }
      return {
        id: mapped.id,
        title: mapped.title,
        url: urlCheck.canonical,
        role,
        bullets,
        evidence: ch.evidence?.trim(),
      };
    });
    const primary = filledChapters[0];
    if (primary.role !== "primary") throw new Error(`sidecar_primary_required:${card.stableGuid}`);
    if (primary.linkOnly) throw new Error(`sidecar_primary_needs_bullets:${card.stableGuid}`);
    const rockHtml = buildRockHtml(filledChapters);
    const rockLink = primary.url;
    return {
      ...card,
      enrichmentStatus: "filled" as const,
      skipReason: undefined,
      chapters: filledChapters,
      rockHtml,
      rockLink,
      reviewNotes: patch.reviewNotes ?? [],
    };
  });

  const merged: RockFillPacket = { ...packet, reviewer: sidecar.reviewer, cards: mergedCards };
  if (sha256(fillPacketChecksumInput(merged)) !== packet.inputChecksum) {
    throw new Error("sidecar_mutated_protected_fields");
  }
  return merged;
}

export function overlaysFromFillPacket(packet: RockFillPacket): RockFieldOverlay[] {
  return packet.cards.flatMap((card) => {
    if (card.enrichmentStatus !== "filled" || !card.rockHtml || !card.rockLink) return [];
    const check = canonicalRockChapterUrl(card.rockLink, card.chapters?.[0]?.id);
    if (!check.ok) throw new Error(`invalid_rock_link:${card.stableGuid}:${check.error}`);
    return [{
      stableGuid: card.stableGuid,
      sourceContentChecksum: card.contentChecksum,
      rock: card.rockHtml,
      rockLink: check.canonical,
    }];
  });
}

export type RockMapBriefCard = {
  stableGuid: string;
  front: string;
  extra: string;
  deckPath: string;
  governedTags: string[];
  candidates: Array<{ id: string; title: string; url: string; extractable: boolean; score: number; snippet: string }>;
};

export type RockFillBriefCard = {
  stableGuid: string;
  front: string;
  extra: string;
  deckPath: string;
  mappedChapters: RockMappedChapter[];
  passages: Array<{ chapterId: string; title: string; pdfPage: number; score: number; text: string }>;
};

export function buildMapBrief(packet: RockMapPacket) {
  return {
    batchKey: packet.batchKey,
    inputChecksum: packet.inputChecksum,
    corpusChecksum: packet.corpusChecksum,
    instructions: packet.instructions,
    sidecarSchema: {
      card: {
        stableGuid: "string",
        status: '"mapped"|"skipped"',
        chapters: "1-3 {id, role} from this card's candidates; first is primary",
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
        extractable: cand.extractable,
        score: cand.score,
        snippet: cand.snippet,
      })),
    })),
  };
}

export function buildFillBrief(
  packet: RockFillPacket,
  passageFor: (chapterId: string, pdfPage: number) => string,
) {
  return {
    batchKey: packet.batchKey,
    inputChecksum: packet.inputChecksum,
    corpusChecksum: packet.corpusChecksum,
    instructions: packet.instructions,
    sidecarSchema: {
      card: {
        stableGuid: "string",
        status: '"filled"|"skipped"',
        chapters: "same ids as mappedChapters, first primary; 2-6 original bullets or linkOnly",
      },
    },
    cards: packet.cards.map((card) => ({
      stableGuid: card.stableGuid,
      front: card.front,
      extra: card.extra.slice(0, 900),
      deckPath: card.deckPath,
      mappedChapters: card.mappedChapters,
      passages: card.pageCandidates.map((cand) => ({
        chapterId: cand.chapterId,
        title: cand.title,
        pdfPage: cand.pdfPage,
        score: cand.score,
        text: passageFor(cand.chapterId, cand.pdfPage),
      })),
    })),
  };
}
