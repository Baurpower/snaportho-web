import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createStableHash, truncateForTitle } from "./hash.ts";
import { parseApkg } from "./parse-apkg.ts";
import { parseTsv } from "./parse-tsv.ts";
import type {
  ImportOptions,
  ImportSummary,
  ParsedAnkiCard,
  ParsedAnkiImport,
  ParsedAnkiNote,
} from "./types.ts";

type DatabaseClient = ReturnType<typeof createClient>;

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function loadEnvFile(filePath: string) {
  const env = Object.create(null) as Record<string, string>;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }

  return env;
}

function getSupabaseAdminClient(): DatabaseClient {
  const envFilePath = path.join(process.cwd(), ".env.local");
  if (existsSync(envFilePath)) {
    const env = loadEnvFile(envFilePath);
    for (const [key, value] of Object.entries(env)) {
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function detectFileType(filePath: string): "apkg" | "tsv" {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".apkg")) {
    return "apkg";
  }

  if (lower.endsWith(".tsv") || lower.endsWith(".txt")) {
    return "tsv";
  }

  throw new Error(`Unsupported import file type for ${filePath}. Expected .apkg, .tsv, or .txt`);
}

export function parseAnkiImport(filePath: string): ParsedAnkiImport {
  const fileType = detectFileType(filePath);
  return fileType === "apkg" ? parseApkg(filePath) : parseTsv(filePath);
}

async function ensureExternalSource(supabase: DatabaseClient) {
  const payload = {
    slug: "anki",
    name: "Anki",
    source_type: "flashcard_deck",
    description: "User-owned spaced-repetition deck imported into SnapOrtho as a read-only source.",
    comments:
      "SnapOrtho owns canonical metadata, mappings, and review state. Anki remains the source of scheduling truth.",
    is_active: true,
  };

  const { data, error } = await supabase
    .from("external_sources")
    .upsert(payload, { onConflict: "slug" })
    .select("id,slug")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

async function upsertInChunks<T extends Record<string, unknown>>(
  supabase: DatabaseClient,
  table: string,
  rows: T[],
  onConflict: string,
  selectColumns: string
) {
  const results: Array<Record<string, unknown>> = [];

  for (const chunk of chunkArray(rows, 200)) {
    if (chunk.length === 0) {
      continue;
    }

    const { data, error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict })
      .select(selectColumns);

    if (error) {
      throw error;
    }

    results.push(...((data ?? []) as unknown as Array<Record<string, unknown>>));
  }

  return results;
}

async function insertInChunks<T extends Record<string, unknown>>(
  supabase: DatabaseClient,
  table: string,
  rows: T[]
) {
  for (const chunk of chunkArray(rows, 200)) {
    if (chunk.length === 0) {
      continue;
    }

    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      throw error;
    }
  }
}

async function updateCanonicalVersionPointers(
  supabase: DatabaseClient,
  rows: Array<{
    id: string;
    current_version_id: string | null;
    current_version_number: number;
    source_content_hash: string;
  }>
) {
  for (const chunk of chunkArray(rows, 200)) {
    if (chunk.length === 0) {
      continue;
    }

    const { error } = await supabase
      .from("canonical_cards")
      .upsert(chunk, { onConflict: "id" });

    if (error) {
      throw error;
    }
  }
}

function buildCanonicalContentHash(note: ParsedAnkiNote, card: ParsedAnkiCard) {
  return createStableHash({
    noteFields: note.fields.map((field) => ({ name: field.name, rawValue: field.rawValue })),
    tags: note.tagNames,
    cardOrd: card.cardOrd,
  });
}

export async function importAnkiFile(filePath: string, options: ImportOptions): Promise<ImportSummary> {
  const parsed = parseAnkiImport(filePath);

  if (options.dryRun) {
    return {
      importBatchId: null,
      fileType: parsed.fileType,
      fileName: parsed.fileName,
      deckCount: parsed.decks.length,
      modelCount: parsed.models.length,
      noteCount: parsed.notes.length,
      cardCount: parsed.cards.length,
      tagCount: parsed.tags.length,
      mediaRefCount: parsed.mediaRefs.length,
      canonicalCardCount: parsed.cards.length,
      qualityReviewCount: parsed.cards.length,
      warnings: parsed.warnings,
    };
  }

  const supabase = getSupabaseAdminClient();
  const sourceId = await ensureExternalSource(supabase);
  let importBatchId: string | null = null;

  try {
    const { data: batchRow, error: batchError } = await supabase
      .from("anki_import_batches")
      .insert({
        source_id: sourceId,
        file_name: parsed.fileName,
        file_type: parsed.fileType,
        file_sha256: parsed.fileSha256,
        importer_version: "v1",
        import_mode: "apply",
        status: "pending",
        warnings: parsed.warnings,
        metadata: parsed.metadata,
        comments: null,
        is_active: true,
      })
      .select("id")
      .single();

    if (batchError) {
      throw batchError;
    }

    importBatchId = batchRow.id as string;

    const decks = await upsertInChunks(
    supabase,
    "anki_decks",
    parsed.decks.map((deck) => ({
      import_batch_id: importBatchId,
      source_id: sourceId,
      anki_deck_id: deck.sourceDeckId,
      parent_deck_id: null,
      full_name: deck.fullName,
      deck_name: deck.deckName,
      deck_path: deck.deckPath,
      metadata: deck.metadata,
      comments: null,
      is_active: true,
    })),
    "source_id,anki_deck_id",
    "id,anki_deck_id,full_name"
  );
    const deckIdBySourceId = new Map(
      decks.map((deck) => [String(deck.anki_deck_id), String(deck.id)])
    );
    const deckByFullName = new Map(parsed.decks.map((deck) => [deck.fullName, deck]));

    for (const deck of parsed.decks) {
      if (deck.deckPath.length < 2) {
        continue;
      }

      const parentFullName = deck.deckPath.slice(0, -1).join("::");
      const parentDeck = deckByFullName.get(parentFullName);
      if (!parentDeck) {
        continue;
      }

      const { error } = await supabase
        .from("anki_decks")
        .update({ parent_deck_id: deckIdBySourceId.get(parentDeck.sourceDeckId) ?? null })
        .eq("source_id", sourceId)
        .eq("anki_deck_id", deck.sourceDeckId);

      if (error) {
        throw error;
      }
    }

    const models = await upsertInChunks(
    supabase,
    "anki_note_models",
    parsed.models.map((model) => ({
      import_batch_id: importBatchId,
      source_id: sourceId,
      anki_model_id: model.sourceModelId,
      model_name: model.modelName,
      field_names: model.fieldNames,
      templates: model.templates,
      css: model.css,
      latex_pre: model.latexPre,
      latex_post: model.latexPost,
      metadata: model.metadata,
      comments: null,
      is_active: true,
    })),
    "source_id,anki_model_id",
    "id,anki_model_id"
  );
    const modelIdBySourceId = new Map(
      models.map((model) => [String(model.anki_model_id), String(model.id)])
    );

    const notes = await upsertInChunks(
    supabase,
    "anki_notes",
    parsed.notes.map((note) => ({
      import_batch_id: importBatchId,
      source_id: sourceId,
      note_model_id: note.sourceModelId ? modelIdBySourceId.get(note.sourceModelId) ?? null : null,
      primary_deck_id: note.primaryDeckSourceId
        ? deckIdBySourceId.get(note.primaryDeckSourceId) ?? null
        : null,
      source_note_key: note.sourceNoteKey,
      anki_note_id: note.ankiNoteId,
      anki_note_guid: note.ankiNoteGuid,
      sort_field: note.sortField,
      tags_raw: note.tagsRaw,
      field_values: note.fields,
      field_name_map: Object.fromEntries(
        note.fields.map((field) => [field.name, field.rawValue])
      ),
      raw_html: note.rawHtmlByField,
      source_content_hash: note.sourceContentHash,
      note_identity_hash: note.noteIdentityHash,
      metadata: note.metadata,
      comments: null,
      is_active: true,
    })),
    "source_id,source_note_key",
    "id,source_note_key"
  );
    const noteIdBySourceKey = new Map(
      notes.map((note) => [String(note.source_note_key), String(note.id)])
    );
    const noteBySourceKey = new Map(parsed.notes.map((note) => [note.sourceNoteKey, note]));

    const cards = await upsertInChunks(
    supabase,
    "anki_cards",
    parsed.cards.map((card) => ({
      import_batch_id: importBatchId,
      source_id: sourceId,
      note_id: noteIdBySourceKey.get(card.sourceNoteKey),
      deck_id: card.sourceDeckId ? deckIdBySourceId.get(card.sourceDeckId) ?? null : null,
      source_card_key: card.sourceCardKey,
      anki_card_id: card.ankiCardId,
      card_ord: card.cardOrd,
      card_type: card.cardType,
      queue: card.queue,
      due: card.due,
      interval: card.interval,
      ease_factor: card.easeFactor,
      reps: card.reps,
      lapses: card.lapses,
      left_count: card.leftCount,
      original_due: card.originalDue,
      original_deck_id: card.originalDeckId,
      flags: card.flags,
      scheduling_data: card.schedulingData,
      source_content_hash: card.sourceContentHash,
      scheduling_hash: card.schedulingHash,
      metadata: card.metadata,
      comments: null,
      is_active: true,
    })),
    "source_id,source_card_key",
    "id,source_card_key,note_id"
  );
    const cardIdBySourceKey = new Map(
      cards.map((card) => [String(card.source_card_key), String(card.id)])
    );

    const tags = await upsertInChunks(
    supabase,
    "anki_tags",
    parsed.tags.map((tag) => ({
      import_batch_id: importBatchId,
      source_id: sourceId,
      raw_name: tag.rawName,
      slug: tag.slug,
      metadata: tag.metadata,
      comments: null,
      is_active: true,
    })),
    "source_id,raw_name",
    "id,raw_name"
  );
    const tagIdByRawName = new Map(tags.map((tag) => [String(tag.raw_name), String(tag.id)]));

    const noteTagRows = parsed.notes.flatMap((note) =>
      note.tagNames
        .map((tagName) => {
          const noteId = noteIdBySourceKey.get(note.sourceNoteKey);
          const tagId = tagIdByRawName.get(tagName);
          if (!noteId || !tagId) {
            return null;
          }
          return {
            note_id: noteId,
            tag_id: tagId,
            import_batch_id: importBatchId,
            metadata: {},
            comments: null,
            is_active: true,
          };
        })
        .filter(Boolean)
    ) as Array<Record<string, unknown>>;
    await upsertInChunks(
      supabase,
      "anki_note_tags",
      noteTagRows,
      "note_id,tag_id",
      "id"
    );

    const mediaRows = parsed.mediaRefs
      .map((mediaRef) => {
        const noteId = noteIdBySourceKey.get(mediaRef.sourceNoteKey);
        if (!noteId) {
          return null;
        }

        return {
          import_batch_id: importBatchId,
          note_id: noteId,
          card_id: mediaRef.sourceCardKey
            ? cardIdBySourceKey.get(mediaRef.sourceCardKey) ?? null
            : null,
          field_name: mediaRef.fieldName,
          media_kind: mediaRef.mediaKind,
          media_src: mediaRef.mediaSrc,
          package_entry_name: mediaRef.packageEntryName,
          media_sha256: mediaRef.mediaSha256,
          exists_in_package: mediaRef.existsInPackage,
          metadata: mediaRef.metadata,
          comments: null,
          is_active: true,
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;
    await upsertInChunks(
      supabase,
      "anki_media_refs",
      mediaRows,
      "note_id,field_name,media_src",
      "id"
    );

    const canonicalCards = await upsertInChunks(
    supabase,
    "canonical_cards",
    parsed.cards.map((card) => {
      const note = noteBySourceKey.get(card.sourceNoteKey);
      const title = note ? truncateForTitle(note.fields[0]?.plainText ?? card.sourceCardKey) : card.sourceCardKey;
      return {
        anki_note_id: noteIdBySourceKey.get(card.sourceNoteKey),
        anki_card_id: cardIdBySourceKey.get(card.sourceCardKey),
        current_version_id: null,
        current_version_number: 1,
        canonical_status: "imported",
        title,
        source_content_hash: note ? buildCanonicalContentHash(note, card) : card.sourceContentHash,
        metadata: {
          import_source: parsed.fileType,
        },
        comments: null,
        is_active: true,
      };
    }),
    "anki_card_id",
    "id,anki_card_id,current_version_id,current_version_number"
  );
    const canonicalCardIdByCardId = new Map(
      canonicalCards.map((row) => [String(row.anki_card_id), String(row.id)])
    );

    const canonicalIds = canonicalCards.map((row) => String(row.id));
    const existingVersionRows: Array<Record<string, unknown>> = [];
    for (const chunk of chunkArray(canonicalIds, 200)) {
      const { data, error } = await supabase
        .from("canonical_card_versions")
        .select("id,canonical_card_id,content_hash,version_number")
        .in("canonical_card_id", chunk);
      if (error) {
        throw error;
      }
      existingVersionRows.push(...((data ?? []) as Array<Record<string, unknown>>));
    }

    const versionsByCanonicalId = new Map<string, Array<Record<string, unknown>>>();
    for (const row of existingVersionRows) {
      const canonicalId = String(row.canonical_card_id);
      const group = versionsByCanonicalId.get(canonicalId) ?? [];
      group.push(row);
      versionsByCanonicalId.set(canonicalId, group);
    }

    const missingVersionPayloads: Array<Record<string, unknown>> = [];
    const desiredVersionPointers = new Map<
      string,
      { contentHash: string; versionId?: string; versionNumber: number }
    >();

    for (const card of parsed.cards) {
      const note = noteBySourceKey.get(card.sourceNoteKey);
      const ankiCardRowId = cardIdBySourceKey.get(card.sourceCardKey);
      const canonicalCardId = ankiCardRowId ? canonicalCardIdByCardId.get(ankiCardRowId) : null;
      const noteRowId = noteIdBySourceKey.get(card.sourceNoteKey);
      if (!note || !ankiCardRowId || !canonicalCardId || !noteRowId) {
        continue;
      }

      const contentHash = buildCanonicalContentHash(note, card);
      const existingVersions = versionsByCanonicalId.get(canonicalCardId) ?? [];
      const existingMatch = existingVersions.find(
        (row) => String(row.content_hash) === contentHash
      );

      if (existingMatch) {
        desiredVersionPointers.set(canonicalCardId, {
          contentHash,
          versionId: String(existingMatch.id),
          versionNumber: Number(existingMatch.version_number),
        });
        continue;
      }

      const nextVersionNumber =
        existingVersions.reduce(
          (maxValue, row) => Math.max(maxValue, Number(row.version_number ?? 0)),
          0
        ) + 1;

      desiredVersionPointers.set(canonicalCardId, {
        contentHash,
        versionNumber: nextVersionNumber,
      });
      missingVersionPayloads.push({
        canonical_card_id: canonicalCardId,
        version_number: nextVersionNumber,
        source_note_id: noteRowId,
        source_card_id: ankiCardRowId,
        content_hash: contentHash,
        field_snapshot: note.fields,
        raw_html_snapshot: note.rawHtmlByField,
        tag_snapshot: note.tagNames,
        metadata: {
          import_batch_id: importBatchId,
        },
        comments: null,
        is_active: true,
      });
    }

    if (missingVersionPayloads.length > 0) {
      const insertedVersions = await upsertInChunks(
        supabase,
        "canonical_card_versions",
        missingVersionPayloads,
        "canonical_card_id,content_hash",
        "id,canonical_card_id,content_hash,version_number"
      );
      for (const row of insertedVersions) {
        desiredVersionPointers.set(String(row.canonical_card_id), {
          contentHash: String(row.content_hash),
          versionId: String(row.id),
          versionNumber: Number(row.version_number),
        });
      }
    }

    await updateCanonicalVersionPointers(
      supabase,
      [...desiredVersionPointers.entries()].map(([canonicalCardId, pointer]) => ({
        id: canonicalCardId,
        current_version_id: pointer.versionId ?? null,
        current_version_number: pointer.versionNumber,
        source_content_hash: pointer.contentHash,
      }))
    );

    const existingQualityRows: Array<Record<string, unknown>> = [];
    for (const chunk of chunkArray(canonicalIds, 200)) {
      const { data, error } = await supabase
        .from("card_quality_reviews")
        .select("id,canonical_card_id")
        .eq("is_current", true)
        .in("canonical_card_id", chunk);
      if (error) {
        throw error;
      }
      existingQualityRows.push(...((data ?? []) as Array<Record<string, unknown>>));
    }
    const canonicalIdsWithCurrentReviews = new Set(
      existingQualityRows.map((row) => String(row.canonical_card_id))
    );

    const missingQualityPayloads = canonicalIds
      .filter((canonicalId) => !canonicalIdsWithCurrentReviews.has(canonicalId))
      .map((canonicalId) => ({
        canonical_card_id: canonicalId,
        import_batch_id: importBatchId,
        review_status: "unreviewed",
        is_current: true,
        clarity: null,
        atomicity: null,
        cloze_quality: null,
        factual_accuracy: null,
        source_support: null,
        high_yield_value: null,
        exam_relevance: null,
        clinical_relevance: null,
        suggested_training_level: null,
        min_training_level: null,
        max_training_level: null,
        level_confidence: null,
        level_rationale: null,
        is_core_knowledge: null,
        is_rotation_level: null,
        is_oite_level: null,
        is_boards_level: null,
        is_attending_nuance: null,
        metadata: {
          created_by: "importer",
        },
        comments: null,
        reviewed_by: null,
        reviewed_at: null,
        is_active: true,
      }));

    if (missingQualityPayloads.length > 0) {
      await insertInChunks(supabase, "card_quality_reviews", missingQualityPayloads);
    }

    const { error: finalizeError } = await supabase
      .from("anki_import_batches")
      .update({
        status: "completed",
        warnings: parsed.warnings,
      })
      .eq("id", importBatchId);
    if (finalizeError) {
      throw finalizeError;
    }

    return {
      importBatchId,
      fileType: parsed.fileType,
      fileName: parsed.fileName,
      deckCount: parsed.decks.length,
      modelCount: parsed.models.length,
      noteCount: parsed.notes.length,
      cardCount: parsed.cards.length,
      tagCount: parsed.tags.length,
      mediaRefCount: parsed.mediaRefs.length,
      canonicalCardCount: parsed.cards.length,
      qualityReviewCount: missingQualityPayloads.length,
      warnings: parsed.warnings,
    };
  } catch (error) {
    if (importBatchId) {
      await supabase
        .from("anki_import_batches")
        .update({
          status: "failed",
          warnings: [...parsed.warnings, `Import failed: ${String((error as Error)?.message ?? error)}`],
        })
        .eq("id", importBatchId);
    }
    throw error;
  }
}
