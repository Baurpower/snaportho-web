/**
 * Map source note field snapshots (AnKing Overhaul, etc.) onto the locked
 * SnapOrtho Master field contract for bootstrap + sync hash parity.
 * Pure helpers only — no I/O.
 */
import { computeCentralSyncHash } from "./anki-deck-incorporation";
import {
  MARKER_FIELDS,
  PERSONAL_NOTES_FIELD,
  SNAPORTHO_MASTER_FIELD_ORDER,
} from "./anki-bootstrap-notetype";

export const NORMALIZE_VERSION = "master-fields.v1" as const;

const CLOZE_RE = /\{\{c\d+::/i;
const PERSONAL_RE = /^(personal|user|local)(_|::)/i;
const MARKER_RE = /^SnapOrtho_(ID|Version|Installed_Hash)$/i;

/** AnKing / source fields that map 1:1 (or close) onto Master names. */
const DIRECT_MAP: Record<string, string> = {
  Text: "Text",
  Extra: "Extra",
  "Missed Questions": "Missed_Questions",
  Missed_Questions: "Missed_Questions",
  "One by one": "One_by_one",
  One_by_one: "One_by_one",
  "Personal Notes": PERSONAL_NOTES_FIELD,
  Personal_Notes: PERSONAL_NOTES_FIELD,
  // Already-master names pass through
  Orthobullets: "Orthobullets",
  Orthobullets_Link: "Orthobullets_Link",
  ROCK: "ROCK",
  ROCK_Link: "ROCK_Link",
  Classifications: "Classifications",
  Anatomy: "Anatomy",
  Nailed_It: "Nailed_It",
  Nailed_It_Link: "Nailed_It_Link",
  Podcasts: "Podcasts",
  Podcasts_Link: "Podcasts_Link",
  Video: "Video",
  Video_Link: "Video_Link",
  Millers: "Millers",
  OKU: "OKU",
  Campbells: "Campbells",
  OITE: "OITE",
  CasePrep: "CasePrep",
  BroBot: "BroBot",
  Additional_Resources: "Additional_Resources",
  "Additional Resources": "Additional_Resources",
};

/**
 * AnKing resource fields folded into Additional_Resources when non-empty
 * (beta: preserve teaching media without inventing new Master resource slots).
 */
const FOLD_INTO_ADDITIONAL = new Set([
  "First Aid",
  "Sketchy",
  "Sketchy 2",
  "Sketchy Extra",
  "Pathoma",
  "Boards and Beyond",
  "Lecture Notes",
  "Picmonic",
  "Pixorize",
  "Physeo",
  "Bootcamp",
  "OME",
  "Additional Resources",
]);

export type SnapshotField = {
  name: string;
  rawValue?: string;
  value?: string;
  plainText?: string;
};

export type NormalizedMasterFields = {
  normalizeVersion: typeof NORMALIZE_VERSION;
  /** Non-empty master fields only (suitable for field_snapshot storage). */
  fieldSnapshot: Array<{ name: string; rawValue: string }>;
  /** Full master order for hashing / note values (empties ""). Personal + markers excluded from hash inputs. */
  expandedFields: Array<{ name: string; value: string }>;
  contentHash: string;
  hasClozeMarkup: boolean;
  isImageOcclusion: boolean;
  warnings: string[];
  /** True when card is eligible for cloze-only Master beta. */
  clozeBetaEligible: boolean;
};

function fieldText(f: SnapshotField | undefined): string {
  if (!f) return "";
  if (typeof f.rawValue === "string" && f.rawValue.length) return f.rawValue;
  if (typeof f.value === "string" && f.value.length) return f.value;
  return "";
}

function isNonEmpty(html: string): boolean {
  if (!html || !html.trim()) return false;
  // Keep media-only HTML (images, sound) even when plain text is empty.
  if (/<img\b/i.test(html) || /\[sound:/i.test(html) || /<svg\b/i.test(html)) return true;
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim().length > 0;
}

export function isImageOcclusionSnapshot(fields: SnapshotField[]): boolean {
  const names = new Set(fields.map((f) => f.name));
  return names.has("Image") || names.has("Question Mask") || names.has("Answer Mask");
}

export function hasClozeMarkup(text: string): boolean {
  return CLOZE_RE.test(text);
}

/**
 * Normalize a source field_snapshot onto SnapOrtho Master fields.
 * Does not invent cloze markup — AnKing Text with {{cN::}} passes through.
 */
export function normalizeFieldSnapshotToMaster(
  snapshot: SnapshotField[],
  tags: string[],
  cardOrdinal: number,
): NormalizedMasterFields {
  const warnings: string[] = [];
  const byName = new Map<string, SnapshotField>();
  for (const f of snapshot ?? []) {
    const name = String(f?.name ?? "").trim();
    if (!name) continue;
    byName.set(name, f);
  }

  const masterValues = new Map<string, string>();
  for (const name of SNAPORTHO_MASTER_FIELD_ORDER) {
    if (name === PERSONAL_NOTES_FIELD) continue;
    if ((MARKER_FIELDS as readonly string[]).includes(name)) continue;
    masterValues.set(name, "");
  }

  const additionalParts: string[] = [];
  const isIO = isImageOcclusionSnapshot(snapshot ?? []);

  for (const [srcName, field] of byName) {
    if (PERSONAL_RE.test(srcName) || MARKER_RE.test(srcName)) continue;
    const html = fieldText(field);
    if (!isNonEmpty(html) && srcName !== "Text" && srcName !== "Front") continue;

    const direct = DIRECT_MAP[srcName];
    if (direct === PERSONAL_NOTES_FIELD) {
      continue; // never central
    }
    if (direct) {
      const prev = masterValues.get(direct) ?? "";
      if (direct === "Extra" && prev && html) {
        masterValues.set(direct, `${prev}<hr>${html}`);
      } else if (!prev || direct === "Text") {
        masterValues.set(direct, html || prev);
      } else if (html) {
        masterValues.set(direct, prev ? `${prev}<hr>${html}` : html);
      }
      continue;
    }

    // Basic Front/Back (rare in this deck)
    if (srcName === "Front") {
      const text = masterValues.get("Text") ?? "";
      if (!text) {
        if (hasClozeMarkup(html)) masterValues.set("Text", html);
        else {
          // Do not auto-wrap in beta path for non-cloze; leave empty Text + warn
          warnings.push("basic_front_without_cloze");
          masterValues.set("Text", html);
        }
      }
      continue;
    }
    if (srcName === "Back") {
      const extra = masterValues.get("Extra") ?? "";
      masterValues.set("Extra", extra ? `${extra}<hr>${html}` : html);
      continue;
    }

    if (FOLD_INTO_ADDITIONAL.has(srcName) || srcName === "Additional Resources") {
      if (isNonEmpty(html)) {
        additionalParts.push(
          `<div class="src-resource" data-source="${escapeAttr(srcName)}"><div class="src-resource-label"><b>${escapeHtml(srcName)}</b></div>${html}</div>`,
        );
      }
      continue;
    }

    // Unknown fields: fold if non-empty
    if (isNonEmpty(html)) {
      additionalParts.push(
        `<div class="src-resource" data-source="${escapeAttr(srcName)}"><div class="src-resource-label"><b>${escapeHtml(srcName)}</b></div>${html}</div>`,
      );
      warnings.push(`folded_unknown_field:${srcName}`);
    }
  }

  if (additionalParts.length) {
    const existing = masterValues.get("Additional_Resources") ?? "";
    masterValues.set(
      "Additional_Resources",
      existing ? `${existing}${additionalParts.join("")}` : additionalParts.join(""),
    );
  }

  const text = masterValues.get("Text") ?? "";
  const cloze = hasClozeMarkup(text);
  if (!isNonEmpty(text)) warnings.push("empty_text");
  if (isIO) warnings.push("image_occlusion");

  const fieldSnapshot: Array<{ name: string; rawValue: string }> = [];
  const expandedFields: Array<{ name: string; value: string }> = [];

  for (const name of SNAPORTHO_MASTER_FIELD_ORDER) {
    if (name === PERSONAL_NOTES_FIELD) continue;
    if ((MARKER_FIELDS as readonly string[]).includes(name)) continue;
    const value = masterValues.get(name) ?? "";
    expandedFields.push({ name, value });
    if (isNonEmpty(value)) fieldSnapshot.push({ name, rawValue: value });
  }

  const contentHash = computeCentralSyncHash(expandedFields, tags, cardOrdinal);
  const clozeBetaEligible = !isIO && cloze && isNonEmpty(text) && cardOrdinal === 0;

  return {
    normalizeVersion: NORMALIZE_VERSION,
    fieldSnapshot,
    expandedFields,
    contentHash,
    hasClozeMarkup: cloze,
    isImageOcclusion: isIO,
    warnings,
    clozeBetaEligible,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
