/**
 * Pure bootstrap .apkg builder: legacy collection.anki2 + media JSON + zip.
 * Inverse of scripts/lib/education/anki-import/parse-apkg.ts (legacy path).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  ankiFieldChecksum,
  ARTIFACT_SCHEMA_VERSION,
  buildMasterNoteTypeSpec,
  buildNoteFieldValues,
  deriveMasterFieldOrder,
  expandDeckHierarchy,
  formatAnkiTags,
  MARKER_HASH,
  MARKER_ID,
  MARKER_VERSION,
  PERSONAL_NOTES_FIELD,
  SNAPORTHO_MASTER_NOTE_TYPE,
  stableAnkiId,
  validateBootstrapCards,
  type BootstrapCardInput,
} from "../../../../src/lib/education/anki-bootstrap-notetype.ts";
import { toProductDeckPath } from "../../../../src/lib/education/anki-deck-path.ts";
import { stripHtmlToText } from "../anki-import/hash.ts";

export type BootstrapMediaInput = {
  contentSha256: string;
  logicalFilename: string;
  bytes: Buffer;
};

export type BootstrapBuildInput = {
  release: {
    id: string;
    releaseKey: string;
    releaseVersion: string;
    manifestChecksum?: string;
  };
  cards: BootstrapCardInput[];
  media: BootstrapMediaInput[];
  /** Fixed unix seconds for deterministic builds. */
  modSeconds?: number;
};

export type BootstrapBuildResult = {
  apkgBytes: Buffer;
  artifactChecksum: string;
  artifactSchemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  noteCount: number;
  cardCount: number;
  mediaCount: number;
  fieldOrder: string[];
  modelId: number;
  warnings: string[];
};

const DEFAULT_DECK_CONF = {
  1: {
    id: 1,
    name: "Default",
    mod: 0,
    usn: 0,
    maxTaken: 60,
    autoplay: true,
    timer: 0,
    replayq: true,
    new: {
      bury: false,
      delays: [1, 10],
      initialFactor: 2500,
      ints: [1, 4, 0],
      order: 1,
      perDay: 20,
    },
    rev: {
      bury: false,
      ease4: 1.3,
      ivlFct: 1,
      maxIvl: 36500,
      perDay: 200,
      hardFactor: 1.2,
    },
    lapse: {
      delays: [10],
      leechAction: 1,
      leechFails: 8,
      minInt: 1,
      mult: 0,
    },
    dyn: false,
    newMix: 0,
    newPerDayMinimum: 0,
    interdayLearningMix: 0,
    reviewOrder: 0,
    newSortOrder: 0,
    newGatherPriority: 0,
    buryInterdayLearning: false,
  },
};

const COL_CONF = {
  nextPos: 1,
  estTimes: true,
  activeDecks: [1],
  sortType: "noteFld",
  timeLim: 0,
  sortBackwards: false,
  addToCur: true,
  curDeck: 1,
  newBury: true,
  newSpread: 0,
  dueCounts: true,
  curModel: null as number | null,
  collapseTime: 1200,
  schedVer: 2,
  dayLearnFirst: false,
  creationOffset: 0,
};

function sha256Hex(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

function ensureSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE col (
      id integer primary key,
      crt integer not null,
      mod integer not null,
      scm integer not null,
      ver integer not null,
      dty integer not null,
      usn integer not null,
      ls integer not null,
      conf text not null,
      models text not null,
      decks text not null,
      dconf text not null,
      tags text not null
    );
    CREATE TABLE notes (
      id integer primary key,
      guid text not null,
      mid integer not null,
      mod integer not null,
      usn integer not null,
      tags text not null,
      flds text not null,
      sfld text not null,
      csum integer not null,
      flags integer not null,
      data text not null
    );
    CREATE TABLE cards (
      id integer primary key,
      nid integer not null,
      did integer not null,
      ord integer not null,
      mod integer not null,
      usn integer not null,
      type integer not null,
      queue integer not null,
      due integer not null,
      ivl integer not null,
      factor integer not null,
      reps integer not null,
      lapses integer not null,
      left integer not null,
      odue integer not null,
      odid integer not null,
      flags integer not null,
      data text not null
    );
    CREATE TABLE graves (
      usn integer not null,
      oid integer not null,
      type integer not null
    );
    CREATE TABLE revlog (
      id integer primary key,
      cid integer not null,
      usn integer not null,
      ease integer not null,
      ivl integer not null,
      lastIvl integer not null,
      factor integer not null,
      time integer not null,
      type integer not null
    );
    CREATE INDEX ix_notes_guid on notes (guid);
    CREATE INDEX ix_cards_nid on cards (nid);
    CREATE INDEX ix_cards_sched on cards (did, queue, due);
  `);
}

/** Anki deck JSON requires the *Today counters or modern importers fail. */
function deckObject(id: number, name: string, mod: number) {
  return {
    id,
    name,
    mod,
    usn: -1,
    collapsed: false,
    browserCollapsed: false,
    desc: "",
    dyn: 0,
    conf: 1,
    extendNew: 0,
    extendRev: 0,
    // Required by Anki/genanki for a valid collection open:
    newToday: [0, 0],
    revToday: [0, 0],
    lrnToday: [0, 0],
    timeToday: [0, 0],
  };
}

function buildDeckMap(
  deckPaths: string[],
  mod: number,
): { decksJson: string; deckIdByPath: Map<string, number> } {
  const hierarchy = expandDeckHierarchy(deckPaths);
  const deckIdByPath = new Map<string, number>();
  const used = new Set<number>([1]);
  const decks: Record<string, unknown> = {
    "1": deckObject(1, "Default", mod),
  };
  for (const path of hierarchy) {
    let id = stableAnkiId(`deck:${path}`);
    while (used.has(id)) {
      id = (id % 0x7ffffffe) + 2;
    }
    used.add(id);
    deckIdByPath.set(path, id);
    decks[String(id)] = deckObject(id, path, mod);
  }
  return { decksJson: JSON.stringify(decks), deckIdByPath };
}

function buildModelsJson(fieldOrder: string[], modelId: number, mod: number): string {
  const spec = buildMasterNoteTypeSpec(fieldOrder);
  // Keep field objects close to genanki/Anki export shape (avoid unknown keys that
  // older serde paths sometimes choke on).
  const flds = spec.fields.map((f) => ({
    name: f.name,
    ord: f.ord,
    sticky: f.sticky,
    rtl: f.rtl,
    font: f.font,
    size: f.size,
    description: f.description ?? "",
  }));
  const tmpls = spec.templates.map((t) => ({
    name: t.name,
    ord: t.ord,
    qfmt: t.qfmt,
    afmt: t.afmt,
    bqfmt: t.bqfmt ?? "",
    bafmt: t.bafmt ?? "",
    did: null,
    bfont: t.bfont ?? "",
    bsize: t.bsize ?? 0,
  }));
  const model = {
    id: modelId,
    name: spec.name,
    // 0 = standard, 1 = cloze (SnapOrtho Master is cloze Text)
    type: spec.type ?? 0,
    mod,
    usn: -1,
    sortf: 0,
    did: null,
    tmpls,
    flds,
    css: spec.css,
    latexPre: spec.latexPre,
    latexPost: spec.latexPost,
    latexsvg: false,
    // Cloze: require Text field (ord 0). Standard: any of first field.
    req: spec.type === 1 ? [[0, "all", [0]]] : [[0, "any", [0]]],
    tags: [] as string[],
    vers: [] as number[],
  };
  return JSON.stringify({ [String(modelId)]: model });
}

function writeCollectionSqlite(
  path: string,
  included: BootstrapCardInput[],
  fieldOrder: string[],
  modelId: number,
  mod: number,
): Map<string, number> {
  // Product-facing parent deck root (Marty McFlyin… → SnapOrtho)
  const productPaths = included.map((c) => toProductDeckPath(c.deckPath));
  const { decksJson, deckIdByPath } = buildDeckMap(productPaths, mod);
  const db = new DatabaseSync(path);
  try {
    ensureSchema(db);
    const conf = { ...COL_CONF, curModel: modelId, nextPos: included.length + 1 };
    // col.tags is a JSON map (tag -> usn), NOT note-style space-separated tags.
    // Empty string makes Anki 26's importer throw: JsonError EOF at line 1 column 0.
    db.prepare(
      `insert into col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
       values (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, ?)`,
    ).run(
      mod,
      mod,
      mod,
      JSON.stringify(conf),
      buildModelsJson(fieldOrder, modelId, mod),
      decksJson,
      JSON.stringify(DEFAULT_DECK_CONF),
      "{}",
    );

    const insertNote = db.prepare(
      `insert into notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
       values (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, '')`,
    );
    const insertCard = db.prepare(
      `insert into cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
       values (?, ?, ?, ?, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')`,
    );

    const sorted = [...included].sort((a, b) =>
      a.orderingKey < b.orderingKey ? -1 : a.orderingKey > b.orderingKey ? 1 : 0,
    );

    let noteId = 1_000_000_000_000;
    let cardId = 1_500_000_000_000;
    let newDue = 1;

    for (const card of sorted) {
      const values = buildNoteFieldValues(fieldOrder, card);
      const flds = values.join("\u001f");
      const firstCentralIdx = fieldOrder.findIndex(
        (n) =>
          n !== PERSONAL_NOTES_FIELD &&
          n !== MARKER_ID &&
          n !== MARKER_VERSION &&
          n !== MARKER_HASH,
      );
      const sfld = stripHtmlToText(
        firstCentralIdx >= 0 ? (values[firstCentralIdx] ?? "") : "",
      );
      const tags = formatAnkiTags(card.centralTags ?? []);
      insertNote.run(
        noteId,
        card.noteGuid,
        modelId,
        mod,
        tags,
        flds,
        sfld,
        ankiFieldChecksum(sfld),
      );
      const productPath = toProductDeckPath(card.deckPath);
      const did = deckIdByPath.get(productPath);
      if (!did) throw new Error(`missing_deck_id:${productPath}`);
      insertCard.run(cardId, noteId, did, card.cardOrdinal, mod, newDue);
      noteId += 1;
      cardId += 1;
      newDue += 1;
    }
  } finally {
    db.close();
  }
  return deckIdByPath;
}

function packageMedia(media: BootstrapMediaInput[]): {
  manifest: Record<string, string>;
  files: Array<{ entryName: string; bytes: Buffer }>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const byHash = new Map<string, BootstrapMediaInput>();
  for (const asset of media) {
    const digest = sha256Hex(asset.bytes);
    if (digest !== asset.contentSha256) {
      throw new Error(
        `media_hash_mismatch:${asset.logicalFilename}:expected=${asset.contentSha256}:got=${digest}`,
      );
    }
    if (!/^[a-f0-9]{64}$/.test(asset.contentSha256)) {
      throw new Error(`invalid_media_hash:${asset.contentSha256}`);
    }
    byHash.set(asset.contentSha256, asset);
  }

  const ordered = [...byHash.values()].sort((a, b) =>
    a.logicalFilename < b.logicalFilename
      ? -1
      : a.logicalFilename > b.logicalFilename
        ? 1
        : 0,
  );
  const manifest: Record<string, string> = {};
  const files: Array<{ entryName: string; bytes: Buffer }> = [];
  ordered.forEach((asset, index) => {
    const entryName = String(index);
    manifest[entryName] = asset.logicalFilename;
    files.push({ entryName, bytes: asset.bytes });
  });
  if (media.length !== byHash.size) warnings.push("duplicate_media_hashes_deduped");
  return { manifest, files, warnings };
}

/**
 * Build a bootstrap .apkg from in-memory release data.
 * Deterministic when `modSeconds` and inputs are fixed.
 */
export function buildBootstrapApkg(input: BootstrapBuildInput): BootstrapBuildResult {
  const warnings: string[] = [];
  const included = (input.cards ?? []).filter(
    (c) => !c.inclusionStatus || c.inclusionStatus === "included",
  );
  if (!included.length) throw new Error("bootstrap_requires_included_cards");

  const validation = validateBootstrapCards(
    included.map((c) => ({ ...c, inclusionStatus: "included" })),
  );
  if (validation.length) {
    throw new Error(`bootstrap_validation_failed:${validation.join(",")}`);
  }

  const needed = new Set<string>();
  for (const card of included) {
    for (const h of card.mediaHashes ?? []) needed.add(h);
  }
  const mediaFinal =
    needed.size === 0
      ? []
      : (input.media ?? []).filter((m) => needed.has(m.contentSha256));
  if (needed.size) {
    const have = new Set(mediaFinal.map((m) => m.contentSha256));
    for (const h of needed) {
      if (!have.has(h)) throw new Error(`missing_media_bytes:${h}`);
    }
  }

  const fieldOrder = deriveMasterFieldOrder(included);
  // Model ids must fit comfortably in JS/Anki integer ranges (genanki uses ms timestamps).
  const modelId =
    1_600_000_000_000 +
    (stableAnkiId(`notetype:${SNAPORTHO_MASTER_NOTE_TYPE}:${fieldOrder.join("|")}`) %
      100_000_000);
  // col.mod/scm/crt and deck/model mod are unix seconds in real Anki exports.
  const mod = input.modSeconds ?? Math.floor(Date.now() / 1000);

  const tempDir = mkdtempSync(join(tmpdir(), "snaportho-bootstrap-"));
  try {
    const sqlitePath = join(tempDir, "collection.anki2");
    writeCollectionSqlite(sqlitePath, included, fieldOrder, modelId, mod);
    // Real Anki exports include both names; without meta, Anki 2.1.50+ picks
    // collection.anki21 (Legacy2) when present. Mirror the same V11 sqlite there.
    const anki21Path = join(tempDir, "collection.anki21");
    copyFileSync(sqlitePath, anki21Path);
    const { manifest, files, warnings: mediaWarnings } = packageMedia(mediaFinal);
    warnings.push(...mediaWarnings);
    writeFileSync(join(tempDir, "media"), JSON.stringify(manifest));
    for (const file of files) {
      writeFileSync(join(tempDir, file.entryName), file.bytes);
    }
    const apkgPath = join(tempDir, "out.apkg");
    const entries = [
      "collection.anki2",
      "collection.anki21",
      "media",
      ...files.map((f) => f.entryName),
    ];
    // -X strips extra file attrs; -0 stores uncompressed (matches many Anki exports for sqlite)
    execFileSync("zip", ["-X", "-0", "-q", apkgPath, ...entries], {
      cwd: tempDir,
      stdio: "ignore",
    });
    const apkgBytes = readFileSync(apkgPath);
    return {
      apkgBytes,
      artifactChecksum: sha256Hex(apkgBytes),
      artifactSchemaVersion: ARTIFACT_SCHEMA_VERSION,
      noteCount: included.length,
      cardCount: included.length,
      mediaCount: files.length,
      fieldOrder,
      modelId,
      warnings,
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
