import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const kinds = readFileSync(
  path.join(root, "supabase/migrations/20260726_200000_anki_search_query_kinds.sql"),
  "utf8",
);
const search = readFileSync(
  path.join(root, "supabase/migrations/20260726_210000_anki_page_section_search.sql"),
  "utf8",
);

for (const pattern of [
  /query_kind text not null/,
  /page_sections jsonb not null/,
  /query_kind in \('question', 'topic_page'\)/,
  /page_sections_match_kind/,
  /educational_metadata_is_safe\(page_sections\)/,
]) assert.match(kinds, pattern);

for (const pattern of [
  /search_latest_anki_deck_by_sections/,
  /security definer/,
  /latest_release/,
  /jsonb_array_elements\(section_queries\)/,
  /where hits >= 1/,
  /least\(result_limit, 500\)/,
  /grant execute .*service_role/s,
]) assert.match(search, pattern);

assert.doesNotMatch(search, /\b(insert|update|delete)\b/i);

console.log("anki-page-search-schema.test.ts: all assertions passed");
