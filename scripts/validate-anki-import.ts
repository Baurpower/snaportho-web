import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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

function parseArgs(argv: string[]) {
  let batchId: string | null = null;

  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--batch-id") {
      batchId = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return { batchId };
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = 1000
) {
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) {
      break;
    }
  }

  return rows;
}

async function main() {
  const { batchId: requestedBatchId } = parseArgs(process.argv);
  const env = loadEnvFile(path.join(process.cwd(), ".env.local"));
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let batchId = requestedBatchId;
  if (!batchId) {
    const { data, error } = await supabase
      .from("anki_import_batches")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error) {
      throw error;
    }
    batchId = data.id as string;
  }

  const { data: batchSummary, error: batchSummaryError } = await supabase
    .from("v_anki_import_batch_summary")
    .select("*")
    .eq("import_batch_id", batchId)
    .single();
  if (batchSummaryError) {
    throw batchSummaryError;
  }

  const notes = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("anki_notes")
      .select("id, anki_note_id, anki_note_guid, source_note_key")
      .eq("import_batch_id", batchId)
      .range(from, to);
    if (error) {
      throw error;
    }
    return data ?? [];
  });

  const cards = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("anki_cards")
      .select("id, note_id, anki_card_id, source_card_key")
      .eq("import_batch_id", batchId)
      .range(from, to);
    if (error) {
      throw error;
    }
    return data ?? [];
  });

  const canonicalCards = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("canonical_cards")
      .select("id, anki_note_id, anki_card_id, current_version_id, source_content_hash")
      .range(from, to);
    if (error) {
      throw error;
    }
    return data ?? [];
  });

  const qualityReviews = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("card_quality_reviews")
      .select("id, canonical_card_id, import_batch_id")
      .eq("import_batch_id", batchId)
      .range(from, to);
    if (error) {
      throw error;
    }
    return data ?? [];
  });

  const cardIdsForBatch = new Set(cards.map((card) => card.id as string));
  const noteIdsForBatch = new Set(notes.map((note) => note.id as string));
  const canonicalCardsForBatch = canonicalCards.filter(
    (card) =>
      noteIdsForBatch.has(card.anki_note_id as string) || cardIdsForBatch.has(card.anki_card_id as string)
  );

  const deckRows = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("v_anki_cards_by_deck_path")
      .select("deck_name, card_count")
      .eq("import_batch_id", batchId)
      .order("card_count", { ascending: false })
      .range(from, to);
    if (error) {
      throw error;
    }
    return data ?? [];
  });

  const tagRows = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("v_anki_cards_by_tag")
      .select("tag_name, card_count")
      .eq("import_batch_id", batchId)
      .order("card_count", { ascending: false })
      .range(from, to);
    if (error) {
      throw error;
    }
    return data ?? [];
  });

  const duplicateGuidMap = new Map<string, number>();
  for (const note of notes) {
    const guid = String(note.anki_note_guid ?? "").trim();
    if (!guid) {
      continue;
    }
    duplicateGuidMap.set(guid, (duplicateGuidMap.get(guid) ?? 0) + 1);
  }

  const duplicateCardIdMap = new Map<string, number>();
  for (const card of cards) {
    const cardId = String(card.anki_card_id ?? "").trim();
    if (!cardId) {
      continue;
    }
    duplicateCardIdMap.set(cardId, (duplicateCardIdMap.get(cardId) ?? 0) + 1);
  }

  const duplicateCanonicalKeyMap = new Map<string, number>();
  for (const card of canonicalCardsForBatch) {
    const key = String(card.source_content_hash ?? "").trim();
    if (!key) {
      continue;
    }
    duplicateCanonicalKeyMap.set(key, (duplicateCanonicalKeyMap.get(key) ?? 0) + 1);
  }

  const cardsByNoteId = new Map<string, number>();
  for (const card of cards) {
    const noteId = String(card.note_id ?? "");
    cardsByNoteId.set(noteId, (cardsByNoteId.get(noteId) ?? 0) + 1);
  }

  const notesWithoutCards = notes.filter((note) => !cardsByNoteId.has(String(note.id))).length;
  const cardsWithoutNotes = cards.filter((card) => !noteIdsForBatch.has(String(card.note_id))).length;
  const qualityReviewsMissingCanonicalCards = qualityReviews.filter(
    (review) => !canonicalCardsForBatch.some((card) => card.id === review.canonical_card_id)
  ).length;

  console.log(
    JSON.stringify(
      {
        batchId,
        summary: batchSummary,
        validation: {
          deckCount: batchSummary.deck_count,
          noteCount: batchSummary.note_count,
          cardCount: batchSummary.card_count,
          tagCount: batchSummary.tag_count,
          mediaRefCount: batchSummary.media_ref_count,
          canonicalCardCount: batchSummary.canonical_card_count,
          qualityReviewCount: batchSummary.quality_review_count,
          notesWithoutGuid: notes.filter((note) => !String(note.anki_note_guid ?? "").trim()).length,
          cardsWithoutAnkiCardId: cards.filter((card) => !String(card.anki_card_id ?? "").trim()).length,
          notesWithoutCards,
          cardsWithoutNotes,
          duplicateNoteGuids: [...duplicateGuidMap.values()].filter((count) => count > 1).length,
          duplicateCardIds: [...duplicateCardIdMap.values()].filter((count) => count > 1).length,
          duplicateCanonicalKeys: [...duplicateCanonicalKeyMap.values()].filter((count) => count > 1).length,
          canonicalCardsWithoutCurrentVersion: canonicalCardsForBatch.filter(
            (card) => !card.current_version_id
          ).length,
          qualityReviewsMissingCanonicalCards,
        },
        topDeckPathsByCardCount: deckRows.slice(0, 25),
        topTagsByCardCount: tagRows.slice(0, 50),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(
      JSON.stringify(
        {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        null,
        2
      )
    );
  } else {
    console.error(JSON.stringify({ error }, null, 2));
  }
  process.exit(1);
});
