/**
 * SnapOrtho Master note-type contract for bootstrap .apkg + delta-apply alignment.
 * Pure helpers only — no I/O. Field names and marker formulas are locked to the add-on.
 *
 * Card style (templates/CSS/fixed field order) lives in anki-master-card-style.ts and
 * integrations/snaportho-anki/note-types/SnapOrtho Master/.
 */
import { createHash } from "node:crypto";
import { computeCentralSyncHash } from "./anki-deck-incorporation";
import {
  SNAPORTHO_BACK_TEMPLATE,
  SNAPORTHO_CARD_CSS,
  SNAPORTHO_FIELD_DESCRIPTIONS,
  SNAPORTHO_FRONT_TEMPLATE,
  SNAPORTHO_MASTER_FIELD_ORDER,
  SNAPORTHO_MODEL_TYPE,
  SNAPORTHO_STYLE_VERSION,
} from "./anki-master-card-style";

export const SNAPORTHO_MASTER_NOTE_TYPE = "SnapOrtho Master";
export const ARTIFACT_SCHEMA_VERSION = "snaportho-bootstrap-apkg.v1";

export {
  SNAPORTHO_BACK_TEMPLATE,
  SNAPORTHO_CARD_CSS,
  SNAPORTHO_FIELD_DESCRIPTIONS,
  SNAPORTHO_FRONT_TEMPLATE,
  SNAPORTHO_MASTER_FIELD_ORDER,
  SNAPORTHO_MODEL_TYPE,
  SNAPORTHO_STYLE_VERSION,
};

export const MARKER_ID = "SnapOrtho_ID";
export const MARKER_VERSION = "SnapOrtho_Version";
export const MARKER_HASH = "SnapOrtho_Installed_Hash";
export const MARKER_FIELDS = [MARKER_ID, MARKER_VERSION, MARKER_HASH] as const;
export const PERSONAL_NOTES_FIELD = "Personal_Notes";

const PERSONAL_FIELD_RE = /^(personal|user|local)(_|::)/i;
const MARKER_FIELD_RE = /^SnapOrtho_(ID|Version|Installed_Hash)$/i;

export type SnapshotField = { name: string; rawValue?: string; value?: string };

export type BootstrapCardInput = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  contentHash: string;
  noteGuid: string;
  cardOrdinal: number;
  deckPath: string;
  orderingKey: string;
  inclusionStatus?: string;
  fieldSnapshot: SnapshotField[];
  centralTags: string[];
  mediaHashes?: string[];
};

export type MarkerValues = {
  [MARKER_ID]: string;
  [MARKER_VERSION]: string;
  [MARKER_HASH]: string;
};

export type MasterFieldDef = {
  name: string;
  ord: number;
  sticky: boolean;
  rtl: boolean;
  font: string;
  size: number;
  description: string;
  plainText: boolean;
  collapsed: boolean;
  excludeFromSearch: boolean;
};

export type MasterTemplateDef = {
  name: string;
  ord: number;
  qfmt: string;
  afmt: string;
  bqfmt: string;
  bafmt: string;
  did: null;
  bfont: string;
  bsize: number;
};

export type MasterNoteTypeSpec = {
  name: string;
  fields: MasterFieldDef[];
  templates: MasterTemplateDef[];
  css: string;
  latexPre: string;
  latexPost: string;
  /** Anki model type: 0 = standard, 1 = cloze */
  type: 0 | 1;
  styleVersion: string;
};

export function isPersonalOrMarkerField(name: string): boolean {
  return PERSONAL_FIELD_RE.test(name) || MARKER_FIELD_RE.test(name);
}

/**
 * Locked ultimate field order for SnapOrtho Master.
 * Snapshot-derived names are ignored for bootstrap — every note uses the full contract.
 * Unknown snapshot fields are still readable via buildNoteFieldValues only if listed here.
 */
export function masterFieldOrder(): string[] {
  return [...SNAPORTHO_MASTER_FIELD_ORDER];
}

/**
 * @deprecated Prefer masterFieldOrder(). Kept for tests/callers that pass card cohorts;
 * always returns the locked ultimate order (cards argument ignored).
 */
export function deriveMasterFieldOrder(
  cards?: Array<{ fieldSnapshot: Array<{ name: string }> }>,
): string[] {
  void cards;
  return masterFieldOrder();
}

export function fieldRawValue(field: SnapshotField | undefined): string {
  if (!field) return "";
  if (typeof field.rawValue === "string") return field.rawValue;
  if (typeof field.value === "string") return field.value;
  return "";
}

export function buildMarkerValues(card: {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  contentHash: string;
}): MarkerValues {
  return {
    [MARKER_ID]: card.canonicalCardId,
    [MARKER_VERSION]: card.canonicalCardVersionId,
    [MARKER_HASH]: card.contentHash,
  };
}

/**
 * Values parallel to fieldOrder. Personal_Notes is always empty in bootstrap.
 * Markers are derived; central fields come from the snapshot (empty if missing).
 */
export function buildNoteFieldValues(
  fieldOrder: string[],
  card: {
    fieldSnapshot: SnapshotField[];
    canonicalCardId: string;
    canonicalCardVersionId: string;
    contentHash: string;
  },
): string[] {
  const byName = new Map<string, SnapshotField>();
  for (const field of card.fieldSnapshot ?? []) {
    if (field?.name) byName.set(field.name, field);
  }
  const markers = buildMarkerValues(card);
  return fieldOrder.map((name) => {
    if (name === PERSONAL_NOTES_FIELD) return "";
    if (name === MARKER_ID) return markers[MARKER_ID];
    if (name === MARKER_VERSION) return markers[MARKER_VERSION];
    if (name === MARKER_HASH) return markers[MARKER_HASH];
    return fieldRawValue(byName.get(name));
  });
}

/** Recompute central-sync hash from ordered note fields (excludes personal + markers). */
export function centralHashFromOrderedFields(
  fieldOrder: string[],
  values: string[],
  tags: string[],
  ordinal: number,
): string {
  const fields = fieldOrder.map((name, i) => ({ name, value: values[i] ?? "" }));
  return computeCentralSyncHash(fields, tags, ordinal);
}

const LATEX_PRE =
  "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n";
const LATEX_POST = "\\end{document}";

function fieldDescription(name: string): string {
  if (MARKER_FIELDS.includes(name as (typeof MARKER_FIELDS)[number])) {
    return SNAPORTHO_FIELD_DESCRIPTIONS[name] || "SnapOrtho sync identity — do not edit";
  }
  if (name === PERSONAL_NOTES_FIELD) {
    return (
      SNAPORTHO_FIELD_DESCRIPTIONS[name] ||
      "Your private notes (never synced centrally)"
    );
  }
  return SNAPORTHO_FIELD_DESCRIPTIONS[name] ?? "";
}

/**
 * Build the Anki model spec for SnapOrtho Master.
 * Uses the locked ultimate field order and cloze templates when fieldOrder is the master list
 * (or any order that includes Text). Callers should pass masterFieldOrder().
 */
export function buildMasterNoteTypeSpec(fieldOrder?: string[]): MasterNoteTypeSpec {
  const order = fieldOrder?.length ? fieldOrder : masterFieldOrder();
  const isCloze = SNAPORTHO_MODEL_TYPE === "cloze" && order.includes("Text");
  const fields: MasterFieldDef[] = order.map((name, ord) => ({
    name,
    ord,
    sticky: false,
    rtl: false,
    font: "Arial",
    size: 20,
    description: fieldDescription(name),
    plainText: false,
    collapsed: MARKER_FIELDS.includes(name as (typeof MARKER_FIELDS)[number]),
    excludeFromSearch: MARKER_FIELDS.includes(name as (typeof MARKER_FIELDS)[number]),
  }));
  return {
    name: SNAPORTHO_MASTER_NOTE_TYPE,
    type: isCloze ? 1 : 0,
    styleVersion: SNAPORTHO_STYLE_VERSION,
    fields,
    templates: [
      {
        name: isCloze ? "Cloze" : "Card 1",
        ord: 0,
        qfmt: isCloze ? SNAPORTHO_FRONT_TEMPLATE : "{{Text}}",
        afmt: isCloze ? SNAPORTHO_BACK_TEMPLATE : "{{FrontSide}}\n\n<hr id=answer>\n\n{{Extra}}",
        bqfmt: "",
        bafmt: "",
        did: null,
        bfont: "",
        bsize: 0,
      },
    ],
    css: SNAPORTHO_CARD_CSS,
    latexPre: LATEX_PRE,
    latexPost: LATEX_POST,
  };
}

/** Stable 31-bit positive id from a seed (Anki model/deck ids). */
export function stableAnkiId(seed: string): number {
  const digest = createHash("sha256").update(seed, "utf8").digest();
  const value = digest.readUInt32BE(0) & 0x7fffffff;
  return value === 0 ? 1 : value;
}

/** Anki classic notes.csum: first 8 hex digits of sha1(sfld) as integer. */
export function ankiFieldChecksum(sfld: string): number {
  const digest = createHash("sha1").update(sfld, "utf8").digest("hex");
  return Number.parseInt(digest.slice(0, 8), 16);
}

export function formatAnkiTags(tags: string[]): string {
  const sorted = [...new Set(tags.filter((t) => t.startsWith("SnapOrtho::")))].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  if (!sorted.length) return "";
  return ` ${sorted.join(" ")} `;
}

export function deckPathSegments(deckPath: string): string[] {
  return deckPath
    .split("::")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** All ancestor deck paths including the leaf (e.g. SnapOrtho, SnapOrtho::Foot). */
export function expandDeckHierarchy(deckPaths: string[]): string[] {
  const out = new Set<string>();
  for (const path of deckPaths) {
    const parts = deckPathSegments(path);
    for (let i = 1; i <= parts.length; i += 1) {
      out.add(parts.slice(0, i).join("::"));
    }
  }
  return [...out].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function validateBootstrapCards(cards: BootstrapCardInput[]): string[] {
  const errors: string[] = [];
  const guids = new Set<string>();
  const cardIds = new Set<string>();
  for (const card of cards) {
    if (card.inclusionStatus && card.inclusionStatus !== "included") {
      errors.push(`not_included:${card.canonicalCardId}`);
    }
    if (card.cardOrdinal !== 0) {
      errors.push(`multi_ordinal_unsupported:${card.canonicalCardId}:${card.cardOrdinal}`);
    }
    if (!card.noteGuid?.trim()) errors.push(`missing_guid:${card.canonicalCardId}`);
    // Prefer SnapOrtho:: paths, but real import deck paths are allowed for bootstrap pilots.
    const path = card.deckPath?.trim() ?? "";
    if (!path || path.length > 1000 || /[\u0000-\u001f]/.test(path)) {
      errors.push(`invalid_deck_path:${card.canonicalCardId}`);
    }
    if (!/^[a-f0-9]{64}$/.test(card.contentHash)) {
      errors.push(`invalid_content_hash:${card.canonicalCardId}`);
    }
    if (cardIds.has(card.canonicalCardId)) {
      errors.push(`duplicate_canonical_card:${card.canonicalCardId}`);
    }
    cardIds.add(card.canonicalCardId);
    const identity = `${card.noteGuid}:${card.cardOrdinal}`;
    if (guids.has(identity)) errors.push(`duplicate_guid_ordinal:${identity}`);
    guids.add(identity);
  }
  return [...new Set(errors)].sort();
}
