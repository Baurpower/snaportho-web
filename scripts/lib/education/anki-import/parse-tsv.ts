import { basename, extname } from "node:path";
import { readFileSync } from "node:fs";
import { extractMediaRefs } from "./extract-media-refs.ts";
import { createSha256Hex, createStableHash, stripHtmlToText } from "./hash.ts";
import type {
  ParsedAnkiCard,
  ParsedAnkiDeck,
  ParsedAnkiField,
  ParsedAnkiImport,
  ParsedAnkiModel,
  ParsedAnkiNote,
} from "./types.ts";

function parseDirective(line: string, prefix: string): number | null {
  if (!line.startsWith(prefix)) {
    return null;
  }

  const value = Number.parseInt(line.slice(prefix.length).trim(), 10);
  return Number.isFinite(value) ? value : null;
}

function parseDelimitedRows(content: string, delimiter = "\t"): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
}

function normalizeTagSlug(tagName: string): string {
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
    const baseSlug = normalizeTagSlug(rawName);
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

export function parseTsv(filePath: string): ParsedAnkiImport {
  const raw = readFileSync(filePath, "utf8");
  const fileName = basename(filePath);
  const warnings: string[] = [
    "TSV fallback import does not preserve native Anki note IDs, card IDs, or scheduling history.",
  ];
  const rows = parseDelimitedRows(raw);
  const directives = rows.filter((row) => row.length > 0 && String(row[0]).startsWith("#"));
  const dataRows = rows.filter((row) => !(row.length > 0 && String(row[0]).startsWith("#")));

  let deckColumn = 1;
  let tagsColumn = 0;

  for (const directive of directives) {
    const value = directive[0] ?? "";
    deckColumn = parseDirective(value, "#deck column:") ?? deckColumn;
    tagsColumn = parseDirective(value, "#tags column:") ?? tagsColumn;
  }

  const zeroBasedDeckColumn = Math.max(0, deckColumn - 1);
  const zeroBasedTagsColumn = tagsColumn > 0 ? tagsColumn - 1 : -1;

  const deckMap = new Map<string, ParsedAnkiDeck>();
  const uniqueTagNames = new Set<string>();
  const modelsMap = new Map<string, ParsedAnkiModel>();
  const notes: ParsedAnkiNote[] = [];
  const cards: ParsedAnkiCard[] = [];
  const mediaRefs = [];
  const noteHashCounts = new Map<string, number>();

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex += 1) {
    const row = dataRows[rowIndex];
    if (row.length === 1 && row[0] === "") {
      continue;
    }

    const deckFullName = row[zeroBasedDeckColumn]?.trim() ?? "Imported Deck";
    const deckPath = deckFullName.split("::");
    if (!deckMap.has(deckFullName)) {
      deckMap.set(deckFullName, {
        sourceDeckId: `tsv-deck:${createStableHash(deckFullName)}`,
        fullName: deckFullName,
        deckName: deckPath[deckPath.length - 1] ?? deckFullName,
        deckPath,
        metadata: {
          importSource: "tsv",
        },
      });
    }

    const tagNames =
      zeroBasedTagsColumn >= 0
        ? (row[zeroBasedTagsColumn] ?? "")
            .split(/\s+/)
            .map((value) => value.trim())
            .filter(Boolean)
        : [];
    for (const tagName of tagNames) {
      uniqueTagNames.add(tagName);
    }

    const includedFields = row
      .map((value, columnIndex) => ({ value, columnIndex }))
      .filter(
        ({ columnIndex }) =>
          columnIndex !== zeroBasedDeckColumn && columnIndex !== zeroBasedTagsColumn
      );
    const modelKey = `tsv-model:${includedFields.length}`;
    if (!modelsMap.has(modelKey)) {
      modelsMap.set(modelKey, {
        sourceModelId: modelKey,
        modelName: `TSV Import (${includedFields.length} fields)`,
        fieldNames: includedFields.map((_, index) => `Field ${index + 1}`),
        templates: [],
        css: null,
        latexPre: null,
        latexPost: null,
        metadata: {
          extension: extname(fileName),
        },
      });
    }

    const fields: ParsedAnkiField[] = includedFields.map(({ value }, index) => ({
      ordinal: index,
      name: `Field ${index + 1}`,
      rawValue: value ?? "",
      plainText: stripHtmlToText(value ?? ""),
    }));
    const rawHtmlByField = Object.fromEntries(fields.map((field) => [field.name, field.rawValue]));
    const hashBase = createStableHash({
      deckFullName,
      fields: fields.map((field) => ({ name: field.name, rawValue: field.rawValue })),
      tagNames,
    });
    const occurrenceCount = (noteHashCounts.get(hashBase) ?? 0) + 1;
    noteHashCounts.set(hashBase, occurrenceCount);
    const sourceNoteKey = `tsv-note:${hashBase}:${occurrenceCount}`;
    const sourceCardKey = `tsv-card:${hashBase}:${occurrenceCount}`;
    const deck = deckMap.get(deckFullName)!;

    notes.push({
      sourceNoteKey,
      ankiNoteId: null,
      ankiNoteGuid: null,
      sourceModelId: modelKey,
      primaryDeckSourceId: deck.sourceDeckId,
      sortField: fields[0]?.plainText ?? null,
      tagsRaw: zeroBasedTagsColumn >= 0 ? row[zeroBasedTagsColumn] ?? null : null,
      tagNames,
      fields,
      rawHtmlByField,
      sourceContentHash: createStableHash({
        deckFullName,
        fields: fields.map((field) => ({ name: field.name, rawValue: field.rawValue })),
        tagNames,
      }),
      noteIdentityHash: createStableHash({
        syntheticKey: sourceNoteKey,
      }),
      metadata: {
        importSource: "tsv",
        rowNumber: rowIndex + 1,
      },
    });

    cards.push({
      sourceCardKey,
      ankiCardId: null,
      sourceNoteKey,
      sourceDeckId: deck.sourceDeckId,
      cardOrd: 0,
      cardType: null,
      queue: null,
      due: null,
      interval: null,
      easeFactor: null,
      reps: null,
      lapses: null,
      leftCount: null,
      originalDue: null,
      originalDeckId: null,
      flags: null,
      schedulingData: null,
      sourceContentHash: createStableHash({
        sourceNoteKey,
        cardOrd: 0,
      }),
      schedulingHash: null,
      metadata: {
        importSource: "tsv",
      },
    });

    for (const field of fields) {
      mediaRefs.push(
        ...extractMediaRefs({
          sourceNoteKey,
          sourceCardKey,
          fieldName: field.name,
          html: field.rawValue,
        })
      );
    }
  }

  if (notes.some((note) => note.ankiNoteGuid === null)) {
    warnings.push("TSV import contains no Anki GUIDs; synthetic note/card keys were generated.");
  }

  return {
    filePath,
    fileName,
    fileType: "tsv",
    fileSha256: createSha256Hex(raw),
    sourceSlug: "anki",
    sourceName: "Anki",
    warnings,
    decks: [...deckMap.values()].sort((left, right) => left.fullName.localeCompare(right.fullName)),
    models: [...modelsMap.values()].sort((left, right) => left.modelName.localeCompare(right.modelName)),
    notes,
    cards,
    tags: buildUniqueTagRows([...uniqueTagNames]),
    mediaRefs,
    metadata: {
      parser: "tsv",
      deckColumn,
      tagsColumn,
    },
  };
}
