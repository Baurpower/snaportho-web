import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { zstdDecompressSync } from "node:zlib";
import { extractMediaRefs } from "./extract-media-refs.ts";
import { createSha256Hex, createStableHash, stripHtmlToText } from "./hash.ts";
import type {
  ParsedAnkiCard,
  ParsedAnkiDeck,
  ParsedAnkiField,
  ParsedAnkiImport,
  ParsedAnkiMediaRef,
  ParsedAnkiModel,
  ParsedAnkiNote,
} from "./types.ts";

type SqliteNoteRow = {
  id: number | string;
  guid: string;
  mid: number | string;
  tags: string;
  flds: string;
  sfld: string | number | null;
  csum: number | null;
  flags: number | null;
  data: string | null;
};

type SqliteDeckRow = {
  id: number | string;
  name: string;
  mtime_secs: number | null;
  usn: number | null;
};

type SqliteNotetypeRow = {
  id: number | string;
  name: string;
  mtime_secs: number | null;
  usn: number | null;
  config: Uint8Array | null;
};

type SqliteFieldRow = {
  ntid: number | string;
  ord: number;
  name: string;
  config: Uint8Array | null;
};

type SqliteTemplateRow = {
  ntid: number | string;
  ord: number;
  name: string;
  config: Uint8Array | null;
};

type SqliteCardRow = {
  id: number | string;
  nid: number | string;
  did: number | string;
  ord: number;
  type: number | null;
  queue: number | null;
  due: number | null;
  ivl: number | null;
  factor: number | null;
  reps: number | null;
  lapses: number | null;
  left: number | null;
  odue: number | null;
  odid: number | string | null;
  flags: number | null;
  data: string | null;
};

function loadApkgArchive(filePath: string, tempDir: string) {
  execFileSync("unzip", ["-o", filePath, "-d", tempDir], {
    stdio: "ignore",
  });
}

function parseMediaManifest(tempDir: string, warnings: string[]) {
  const mediaPath = join(tempDir, "media");
  const manifest = new Map<string, string>();

  try {
    let rawMedia: Buffer = readFileSync(mediaPath);
    if (rawMedia[0] !== 123) {
      rawMedia = Buffer.from(zstdDecompressSync(rawMedia));
    }
    const text = rawMedia.toString("utf8");
    if (!text.trimStart().startsWith("{")) {
      warnings.push(
        "APKG media manifest uses an unsupported binary format; HTML media refs will still be captured, but package-entry matching was skipped."
      );
      return manifest;
    }

    const mediaJson = JSON.parse(text) as Record<string, string>;
    for (const [entryName, fileName] of Object.entries(mediaJson)) {
      manifest.set(fileName, entryName);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      warnings.push(`Unable to parse APKG media manifest: ${(error as Error).message}`);
    }
  }

  return manifest;
}

function buildPackageHashes(tempDir: string) {
  const hashes = new Map<string, string>();

  for (const entryName of readdirSync(tempDir)) {
    if (!/^\d+$/.test(entryName)) {
      continue;
    }

    const absolutePath = join(tempDir, entryName);
    hashes.set(entryName, createSha256Hex(readFileSync(absolutePath)));
  }

  return hashes;
}

function parseTags(rawTags: string | null): string[] {
  const trimmed = rawTags?.trim() ?? "";
  return trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
}

function makeTagSlug(tagName: string): string {
  return tagName
    .trim()
    .toLowerCase()
    .replace(/::/g, "__")
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function buildUniqueTagRows(tagNames: string[]) {
  const sorted = [...new Set(tagNames)].sort((left, right) => left.localeCompare(right));
  const slugCounts = new Map<string, number>();

  return sorted.map((rawName) => {
    const baseSlug = makeTagSlug(rawName);
    const nextCount = (slugCounts.get(baseSlug) ?? 0) + 1;
    slugCounts.set(baseSlug, nextCount);

    return {
      rawName,
      slug: nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount}`,
      metadata: {
        normalized_base_slug: baseSlug,
        slug_collision_index: nextCount,
      },
    };
  });
}

function buildDecks(rows: SqliteDeckRow[]): ParsedAnkiDeck[] {
  return rows
    .map((row) => {
      const fullName = String(row.name ?? row.id).replace(/\u001f/g, "::");
      const deckPath = fullName.split("::");

      return {
        sourceDeckId: String(row.id),
        fullName,
        deckName: deckPath[deckPath.length - 1] ?? fullName,
        deckPath,
        metadata: {
          modifiedAtSeconds: row.mtime_secs ?? null,
          usn: row.usn ?? null,
        },
      };
    })
    .sort((left, right) => left.fullName.localeCompare(right.fullName));
}

function buildModels(
  modelRows: SqliteNotetypeRow[],
  fieldRows: SqliteFieldRow[],
  templateRows: SqliteTemplateRow[]
): ParsedAnkiModel[] {
  const fieldsByModelId = new Map<string, SqliteFieldRow[]>();
  const templatesByModelId = new Map<string, SqliteTemplateRow[]>();

  for (const row of fieldRows) {
    const key = String(row.ntid);
    const group = fieldsByModelId.get(key) ?? [];
    group.push(row);
    fieldsByModelId.set(key, group);
  }

  for (const row of templateRows) {
    const key = String(row.ntid);
    const group = templatesByModelId.get(key) ?? [];
    group.push(row);
    templatesByModelId.set(key, group);
  }

  return modelRows
    .map((row) => {
      const sourceModelId = String(row.id);
      const modelFields = (fieldsByModelId.get(sourceModelId) ?? []).sort((left, right) => left.ord - right.ord);
      const modelTemplates = (templatesByModelId.get(sourceModelId) ?? []).sort(
        (left, right) => left.ord - right.ord
      );

      return {
        sourceModelId,
        modelName: String(row.name ?? sourceModelId),
        fieldNames: modelFields.map((field) => field.name),
        templates: modelTemplates.map((template) => ({
          ord: template.ord,
          name: template.name,
          configLength: template.config?.length ?? 0,
        })),
        css: null,
        latexPre: null,
        latexPost: null,
        metadata: {
          modifiedAtSeconds: row.mtime_secs ?? null,
          usn: row.usn ?? null,
          configLength: row.config?.length ?? 0,
        },
      };
    })
    .sort((left, right) => left.modelName.localeCompare(right.modelName));
}

function readCollectionDb(filePath: string, warnings: string[]) {
  const tempDir = mkdtempSync(join(tmpdir(), "snaportho-anki-apkg-"));
  const sqlitePath = join(tempDir, "collection.sqlite");

  try {
    loadApkgArchive(filePath, tempDir);

    const compressedCollectionPath = join(tempDir, "collection.anki21b");
    const legacyCollectionPath = join(tempDir, "collection.anki2");

    try {
      const decompressed = zstdDecompressSync(readFileSync(compressedCollectionPath));
      writeFileSync(sqlitePath, decompressed);
    } catch (error) {
      try {
        writeFileSync(sqlitePath, readFileSync(legacyCollectionPath));
        warnings.push(
          `Fell back to collection.anki2 because collection.anki21b could not be decompressed: ${
            (error as Error).message
          }`
        );
      } catch (legacyError) {
        throw new Error(
          `Failed to load collection.anki21b or collection.anki2: ${
            (legacyError as Error).message
          }`
        );
      }
    }

    return {
      tempDir,
      sqlitePath,
      cleanup() {
        rmSync(tempDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function buildFieldMaps(
  noteRow: SqliteNoteRow,
  fieldNames: string[],
  warnings: string[]
): { fields: ParsedAnkiField[]; rawHtmlByField: Record<string, string> } {
  const rawValues = String(noteRow.flds ?? "").split("\u001f");

  if (rawValues.length !== fieldNames.length) {
    warnings.push(
      `Field count mismatch for note ${noteRow.id}: model expects ${fieldNames.length} but note contains ${rawValues.length}.`
    );
  }

  const fieldCount = Math.max(rawValues.length, fieldNames.length);
  const fields: ParsedAnkiField[] = [];
  const rawHtmlByField: Record<string, string> = {};

  for (let index = 0; index < fieldCount; index += 1) {
    const fieldName = fieldNames[index] ?? `Field ${index + 1}`;
    const rawValue = rawValues[index] ?? "";
    fields.push({
      ordinal: index,
      name: fieldName,
      rawValue,
      plainText: stripHtmlToText(rawValue),
    });
    rawHtmlByField[fieldName] = rawValue;
  }

  return { fields, rawHtmlByField };
}

export function parseApkg(filePath: string): ParsedAnkiImport {
  const warnings: string[] = [];
  const fileName = basename(filePath);
  const fileSha256 = createSha256Hex(readFileSync(filePath));
  const collection = readCollectionDb(filePath, warnings);

  try {
    const db = new DatabaseSync(collection.sqlitePath, {
      readonly: true,
      open: true,
    });

    try {
      const deckRows = db.prepare("select id, name, mtime_secs, usn from decks").all() as SqliteDeckRow[];
      const notetypeRows = db
        .prepare("select id, name, mtime_secs, usn, config from notetypes")
        .all() as SqliteNotetypeRow[];
      const fieldRows = db
        .prepare("select ntid, ord, name, config from fields order by ntid, ord")
        .all() as SqliteFieldRow[];
      const templateRows = db
        .prepare("select ntid, ord, name, config from templates order by ntid, ord")
        .all() as SqliteTemplateRow[];

      const decks = buildDecks(deckRows);
      const models = buildModels(notetypeRows, fieldRows, templateRows);
      const modelsById = new Map(models.map((model) => [model.sourceModelId, model]));
      const mediaManifest = parseMediaManifest(collection.tempDir, warnings);
      const packageHashes = buildPackageHashes(collection.tempDir);
      const notesRows = db.prepare(
        "select id, guid, mid, tags, flds, sfld, csum, flags, data from notes order by id"
      ).all() as SqliteNoteRow[];
      const cardsRows = db.prepare(
        "select id, nid, did, ord, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data from cards order by id"
      ).all() as SqliteCardRow[];

      const decksById = new Map(decks.map((deck) => [deck.sourceDeckId, deck]));
      const noteToDeckCounts = new Map<string, Map<string, number>>();
      const cards: ParsedAnkiCard[] = [];

      for (const row of cardsRows) {
        const sourceCardKey = `anki-card:${row.id}`;
        const sourceNoteKey = `anki-note:${row.nid}`;
        const sourceDeckId = row.did === null || row.did === undefined ? null : String(row.did);
        const schedulingPayload = {
          cardType: row.type,
          queue: row.queue,
          due: row.due,
          interval: row.ivl,
          easeFactor: row.factor,
          reps: row.reps,
          lapses: row.lapses,
          leftCount: row.left,
          originalDue: row.odue,
          originalDeckId: row.odid === null || row.odid === undefined ? null : String(row.odid),
          flags: row.flags,
          schedulingData: row.data ?? null,
        };

        cards.push({
          sourceCardKey,
          ankiCardId: String(row.id),
          sourceNoteKey,
          sourceDeckId,
          cardOrd: row.ord ?? 0,
          cardType: row.type ?? null,
          queue: row.queue ?? null,
          due: row.due ?? null,
          interval: row.ivl ?? null,
          easeFactor: row.factor ?? null,
          reps: row.reps ?? null,
          lapses: row.lapses ?? null,
          leftCount: row.left ?? null,
          originalDue: row.odue ?? null,
          originalDeckId: row.odid === null || row.odid === undefined ? null : String(row.odid),
          flags: row.flags ?? null,
          schedulingData: row.data ?? null,
          sourceContentHash: createStableHash({
            noteKey: sourceNoteKey,
            cardOrd: row.ord ?? 0,
          }),
          schedulingHash: createStableHash(schedulingPayload),
          metadata: {
            sourceDeckPresent: sourceDeckId ? decksById.has(sourceDeckId) : false,
          },
        });

        if (sourceDeckId) {
          const counts = noteToDeckCounts.get(sourceNoteKey) ?? new Map<string, number>();
          counts.set(sourceDeckId, (counts.get(sourceDeckId) ?? 0) + 1);
          noteToDeckCounts.set(sourceNoteKey, counts);
        }
      }

      const mediaRefs: ParsedAnkiMediaRef[] = [];
      const notes: ParsedAnkiNote[] = [];
      const uniqueTagNames = new Set<string>();

      for (const row of notesRows) {
        const sourceNoteKey = `anki-note:${row.id}`;
        const model = modelsById.get(String(row.mid));
        if (!model) {
          warnings.push(`Missing note model ${row.mid} for note ${row.id}.`);
        }

        const { fields, rawHtmlByField } = buildFieldMaps(row, model?.fieldNames ?? [], warnings);
        const noteTagNames = parseTags(row.tags);
        for (const tagName of noteTagNames) {
          uniqueTagNames.add(tagName);
        }

        const deckCounts = noteToDeckCounts.get(sourceNoteKey);
        const primaryDeckSourceId =
          deckCounts && deckCounts.size > 0
            ? [...deckCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
            : null;

        const notePayload = {
          ankiNoteId: String(row.id),
          ankiNoteGuid: row.guid,
          sourceModelId: row.mid === null || row.mid === undefined ? null : String(row.mid),
          fields: fields.map((field) => ({ name: field.name, rawValue: field.rawValue })),
          tags: noteTagNames,
        };

        notes.push({
          sourceNoteKey,
          ankiNoteId: String(row.id),
          ankiNoteGuid: row.guid || null,
          sourceModelId: row.mid === null || row.mid === undefined ? null : String(row.mid),
          primaryDeckSourceId,
          sortField: row.sfld === null || row.sfld === undefined ? null : String(row.sfld),
          tagsRaw: row.tags ?? null,
          tagNames: noteTagNames,
          fields,
          rawHtmlByField,
          sourceContentHash: createStableHash(notePayload),
          noteIdentityHash: createStableHash({
            ankiNoteId: String(row.id),
            ankiNoteGuid: row.guid || null,
          }),
          metadata: {
            csum: row.csum ?? null,
            flags: row.flags ?? null,
            data: row.data ?? null,
          },
        });

        for (const field of fields) {
          mediaRefs.push(
            ...extractMediaRefs({
              sourceNoteKey,
              fieldName: field.name,
              html: field.rawValue,
              mediaManifest,
              packageHashes,
            })
          );
        }

        if (!row.guid) {
          warnings.push(`Note ${row.id} is missing a GUID.`);
        }
      }

      return {
        filePath,
        fileName,
        fileType: "apkg",
        fileSha256,
        sourceSlug: "anki",
        sourceName: "Anki",
        warnings,
        decks,
        models,
        notes,
        cards,
        tags: buildUniqueTagRows([...uniqueTagNames]),
        mediaRefs,
        metadata: {
          parser: "apkg",
          usedCollection: "collection.anki21b_or_anki2",
        },
      };
    } finally {
      db.close();
    }
  } finally {
    collection.cleanup();
  }
}
