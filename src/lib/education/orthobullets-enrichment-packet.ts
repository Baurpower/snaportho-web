import { createHash } from "node:crypto";

export const ORTHOBULLETS_ENRICHMENT_CONTRACT = "snaportho-orthobullets-enrichment.v1" as const;
export const ORTHOBULLETS_ENRICHMENT_RUN_KEY = "snaportho-grok-orthobullets-enrichment-v1" as const;
export const ORTHOBULLETS_PLACEHOLDER_TEXT =
  "Curated Orthobullets-aligned teaching bullets (original/edited text you own).";
export const ORTHOBULLETS_LINK_PLACEHOLDER = "Bare HTTPS URL to the Orthobullets topic (or deep link).";

const BLOCKED_PATH_PREFIXES = [
  "/question",
  "/currenttest",
  "/testview",
  "/login",
  "/site",
  "/account",
  "/image",
  "/question-images",
];
const TOPIC_PATH = /^\/[a-z0-9-]+\/[0-9]{3,6}\/[a-z0-9-]+$/;
const MIN_BULLETS = 2;
const MAX_BULLETS = 8;
const MIN_BULLET_CHARS = 12;
const MAX_BULLET_CHARS = 280;
const MAX_EVIDENCE_CHARS = 240;

export type EnrichmentStatus = "filled" | "skipped";
export type EnrichmentSkipReason =
  | "no_matching_topic"
  | "ambiguous_topics"
  | "page_not_topic"
  | "already_filled"
  | "not_applicable";

export type OrthobulletsEnrichmentCard = {
  noteId: string;
  noteVersionId: string;
  stableGuid: string;
  contentChecksum: string;
  deckPath: string;
  front: string;
  extra: string;
  governedTags: string[];
  currentOrthobullets: string;
  currentOrthobulletsLink: string;
  searchQuery: string;
  enrichmentStatus?: EnrichmentStatus;
  skipReason?: EnrichmentSkipReason;
  topicTitle?: string;
  orthobulletsLink?: string;
  bullets?: string[];
  bulletsHtml?: string;
  pageEvidence?: string;
  reviewNotes?: string[];
};

export type OrthobulletsEnrichmentPacket = {
  schemaVersion: typeof ORTHOBULLETS_ENRICHMENT_CONTRACT;
  runKey: string;
  sourceReleaseId: string;
  sourceReleaseVersion: string;
  batchKey: string;
  inputChecksum: string;
  instructions: string[];
  reviewer?: { provider: string; model: string; reviewedAt: string };
  cards: OrthobulletsEnrichmentCard[];
};

export type OrthobulletsEnrichmentSidecarCard = {
  noteVersionId: string;
  enrichmentStatus: EnrichmentStatus;
  skipReason?: EnrichmentSkipReason;
  topicTitle?: string;
  orthobulletsLink?: string;
  bullets?: string[];
  pageEvidence?: string;
  reviewNotes?: string[];
};

export type OrthobulletsEnrichmentSidecar = {
  batchKey: string;
  inputChecksum: string;
  reviewer: { provider: string; model: string; reviewedAt: string };
  cards: OrthobulletsEnrichmentSidecarCard[];
};

export type OrthobulletsUrlResult =
  | { ok: true; canonical: string }
  | { ok: false; error: string };

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" ? value : stableJson(value))
    .digest("hex");
}

export function pendingPacketFileName(batchKey: string): string {
  return `${batchKey}-pending.json`;
}

export function reviewedPacketFileName(batchKey: string): string {
  return `${batchKey}-reviewed.json`;
}

export function verifiedPacketFileName(batchKey: string): string {
  return `${batchKey}-verified.json`;
}

export function sidecarPacketFileName(batchKey: string): string {
  return `${batchKey}-sidecar.json`;
}

export function briefPacketFileName(batchKey: string): string {
  return `${batchKey}-brief.json`;
}

export function isPendingPacketFileName(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}-pending\.json$/.test(name);
}

export function isReviewedPacketFileName(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}-reviewed\.json$/.test(name);
}

export function isBlankResource(value: string | null | undefined): boolean {
  const text = (value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return true;
  return text === ORTHOBULLETS_PLACEHOLDER_TEXT || text === ORTHOBULLETS_LINK_PLACEHOLDER;
}

export function fieldsFromSnapshot(snapshot: unknown): Record<string, string> {
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    return Object.fromEntries(
      Object.entries(snapshot as Record<string, unknown>).map(([name, value]) => [
        name,
        String(value ?? ""),
      ]),
    );
  }
  if (!Array.isArray(snapshot)) return {};
  return Object.fromEntries(
    snapshot.flatMap((row, index) => {
      if (!row || typeof row !== "object") return [];
      const field = row as Record<string, unknown>;
      const name = String(field.name ?? field.fieldName ?? `Field_${index + 1}`);
      const value = String(field.plainText ?? field.rawValue ?? field.value ?? "");
      return [[name, value]];
    }),
  );
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

export function searchQueryForCard(front: string, deckPath: string): string {
  const cloze = plainText(front).slice(0, 80);
  const leaf = deckPath.split("::").filter(Boolean).at(-1) ?? "";
  return [leaf, cloze].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function canonicalOrthobulletsTopicUrl(raw: string): OrthobulletsUrlResult {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, error: "invalid_url" };
  }
  if (parsed.protocol !== "https:") return { ok: false, error: "https_required" };
  const host = parsed.hostname.replace(/^www\./, "");
  if (host !== "orthobullets.com") return { ok: false, error: "host_not_orthobullets" };
  const pathname = parsed.pathname.replace(/\/+$/, "").toLowerCase();
  if (BLOCKED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return { ok: false, error: "blocked_path" };
  }
  if (!TOPIC_PATH.test(pathname)) return { ok: false, error: "not_topic_path" };
  return { ok: true, canonical: `https://www.orthobullets.com${pathname}` };
}

function normalizeComparable(value: string): string {
  return plainText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function bulletsToHtml(bullets: string[]): string {
  const items = bullets.map((bullet) => `<li>${escapeHtml(bullet.trim())}</li>`).join("");
  return `<ul>${items}</ul>`;
}

export function validateBullets(
  bullets: string[],
  card: { front: string; extra: string },
): string[] {
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
    if (/https?:\/\//i.test(bullet) || /orthobullets\.com/i.test(bullet)) {
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

export function validateSidecarCard(
  packetCard: OrthobulletsEnrichmentCard,
  patch: OrthobulletsEnrichmentSidecarCard,
): string[] {
  const errors: string[] = [];
  if (patch.noteVersionId !== packetCard.noteVersionId) {
    errors.push("note_version_mismatch");
  }
  if (patch.enrichmentStatus === "skipped") {
    if (!patch.skipReason) errors.push("skip_reason_required");
    if (patch.orthobulletsLink || (patch.bullets && patch.bullets.length)) {
      errors.push("skipped_card_has_payload");
    }
    return errors;
  }
  if (patch.enrichmentStatus !== "filled") {
    errors.push("invalid_status");
    return errors;
  }
  const title = patch.topicTitle?.trim() ?? "";
  if (title.length < 3 || title.length > 160) errors.push("topic_title_invalid");
  const url = canonicalOrthobulletsTopicUrl(patch.orthobulletsLink ?? "");
  if (!url.ok) errors.push(`link_${url.error}`);
  const bullets = patch.bullets ?? [];
  errors.push(...validateBullets(bullets, packetCard));
  const evidence = patch.pageEvidence?.trim() ?? "";
  if (evidence.length < 8 || evidence.length > MAX_EVIDENCE_CHARS) {
    errors.push("page_evidence_invalid");
  }
  return errors;
}

export function enrichmentPacketChecksumInput(
  packet: Omit<OrthobulletsEnrichmentPacket, "inputChecksum"> | OrthobulletsEnrichmentPacket,
) {
  return {
    schemaVersion: packet.schemaVersion,
    runKey: packet.runKey,
    sourceReleaseId: packet.sourceReleaseId,
    sourceReleaseVersion: packet.sourceReleaseVersion,
    batchKey: packet.batchKey,
    cards: packet.cards.map((card) => ({
      noteId: card.noteId,
      noteVersionId: card.noteVersionId,
      stableGuid: card.stableGuid,
      contentChecksum: card.contentChecksum,
      deckPath: card.deckPath,
      front: card.front,
      extra: card.extra,
      governedTags: card.governedTags,
      currentOrthobullets: card.currentOrthobullets,
      currentOrthobulletsLink: card.currentOrthobulletsLink,
      searchQuery: card.searchQuery,
    })),
  };
}

export function sealEnrichmentPacket(
  packet: Omit<OrthobulletsEnrichmentPacket, "inputChecksum">,
): OrthobulletsEnrichmentPacket {
  return {
    ...packet,
    inputChecksum: sha256(enrichmentPacketChecksumInput(packet)),
  };
}

export function applyOrthobulletsSidecar(
  packet: OrthobulletsEnrichmentPacket,
  sidecar: OrthobulletsEnrichmentSidecar,
): OrthobulletsEnrichmentPacket {
  if (sidecar.batchKey !== packet.batchKey) {
    throw new Error(`sidecar_batch_mismatch:${sidecar.batchKey}:${packet.batchKey}`);
  }
  if (sidecar.inputChecksum !== packet.inputChecksum) {
    throw new Error("sidecar_checksum_mismatch");
  }
  if (
    !sidecar.reviewer?.provider?.trim()
    || !sidecar.reviewer.model?.trim()
    || !Number.isFinite(Date.parse(sidecar.reviewer.reviewedAt))
  ) {
    throw new Error("sidecar_reviewer_required");
  }
  const byVersion = new Map(sidecar.cards.map((card) => [card.noteVersionId, card]));
  if (byVersion.size !== sidecar.cards.length) throw new Error("sidecar_duplicate_card");
  if (byVersion.size !== packet.cards.length) {
    throw new Error(`sidecar_card_count_mismatch:${byVersion.size}:${packet.cards.length}`);
  }
  const mergedCards = packet.cards.map((card) => {
    const patch = byVersion.get(card.noteVersionId);
    if (!patch) throw new Error(`sidecar_missing_card:${card.noteVersionId}`);
    const errors = validateSidecarCard(card, patch);
    if (errors.length) {
      throw new Error(`sidecar_invalid_card:${card.noteVersionId}:${errors.join(",")}`);
    }
    if (patch.enrichmentStatus === "skipped") {
      return {
        ...card,
        enrichmentStatus: "skipped" as const,
        skipReason: patch.skipReason,
        reviewNotes: patch.reviewNotes ?? [],
        topicTitle: undefined,
        orthobulletsLink: undefined,
        bullets: undefined,
        bulletsHtml: undefined,
        pageEvidence: undefined,
      };
    }
    const url = canonicalOrthobulletsTopicUrl(patch.orthobulletsLink ?? "");
    if (!url.ok) throw new Error(`sidecar_link:${card.noteVersionId}:${url.error}`);
    const bullets = (patch.bullets ?? []).map((bullet) => bullet.trim());
    return {
      ...card,
      enrichmentStatus: "filled" as const,
      skipReason: undefined,
      topicTitle: patch.topicTitle?.trim(),
      orthobulletsLink: url.canonical,
      bullets,
      bulletsHtml: bulletsToHtml(bullets),
      pageEvidence: patch.pageEvidence?.trim(),
      reviewNotes: patch.reviewNotes ?? [],
    };
  });
  const merged: OrthobulletsEnrichmentPacket = {
    ...packet,
    reviewer: sidecar.reviewer,
    cards: mergedCards,
  };
  if (sha256(enrichmentPacketChecksumInput(merged)) !== packet.inputChecksum) {
    throw new Error("sidecar_mutated_protected_fields");
  }
  return merged;
}

export type OrthobulletsFieldOverlay = {
  stableGuid: string;
  sourceContentChecksum: string;
  orthobullets: string;
  orthobulletsLink: string;
  topicTitle: string;
};

export function overlayOrthobulletsFields(
  fields: Record<string, string>,
  overlay: Pick<OrthobulletsFieldOverlay, "orthobullets" | "orthobulletsLink">,
): Record<string, string> {
  return {
    ...fields,
    Orthobullets: overlay.orthobullets,
    Orthobullets_Link: overlay.orthobulletsLink,
  };
}

export function overlaysFromVerifiedPacket(
  packet: OrthobulletsEnrichmentPacket,
): OrthobulletsFieldOverlay[] {
  return packet.cards.flatMap((card) => {
    if (card.enrichmentStatus !== "filled" || !card.bulletsHtml || !card.orthobulletsLink || !card.topicTitle) {
      return [];
    }
    return [{
      stableGuid: card.stableGuid,
      sourceContentChecksum: card.contentChecksum,
      orthobullets: card.bulletsHtml,
      orthobulletsLink: card.orthobulletsLink,
      topicTitle: card.topicTitle,
    }];
  });
}

export type EnrichmentBriefCard = {
  noteVersionId: string;
  stableGuid: string;
  contentChecksum: string;
  front: string;
  extra: string;
  deckPath: string;
  searchQuery: string;
  currentOrthobullets: string;
  currentOrthobulletsLink: string;
};

export type EnrichmentBrief = {
  batchKey: string;
  inputChecksum: string;
  sourceReleaseVersion: string;
  cards: EnrichmentBriefCard[];
};

const BRIEF_EXTRA_LIMIT = 900;

export function buildEnrichmentBrief(packet: OrthobulletsEnrichmentPacket): EnrichmentBrief {
  return {
    batchKey: packet.batchKey,
    inputChecksum: packet.inputChecksum,
    sourceReleaseVersion: packet.sourceReleaseVersion,
    cards: packet.cards.map((card) => ({
      noteVersionId: card.noteVersionId,
      stableGuid: card.stableGuid,
      contentChecksum: card.contentChecksum,
      front: card.front,
      extra: card.extra.length > BRIEF_EXTRA_LIMIT
        ? `${card.extra.slice(0, BRIEF_EXTRA_LIMIT)}…`
        : card.extra,
      deckPath: card.deckPath,
      searchQuery: card.searchQuery,
      currentOrthobullets: card.currentOrthobullets,
      currentOrthobulletsLink: card.currentOrthobulletsLink,
    })),
  };
}
