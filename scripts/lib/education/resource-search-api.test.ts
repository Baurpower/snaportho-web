import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const route = readFileSync(
  path.join(root, "src/app/api/anki/reviewer/resource-search/route.ts"),
  "utf8",
);
const ranking = readFileSync(
  path.join(root, "src/lib/education/anki-search-ranking.ts"),
  "utf8",
);
const precisionMigration = readFileSync(
  path.join(root, "supabase/migrations/20260728_132000_precision_first_anki_concept_search.sql"),
  "utf8",
);

for (const required of [
  /authenticateBroBotAnkiRequest\(request\)/,
  /auth\.authMethod !== "device_token"/,
  /input\.query\.kind === "topic_page"/,
  /matchedSectionIds/,
  /question_canonical_entity_links/,
  /card_canonical_entity_links/,
  /educational_link_review_assertions/,
  /direct_human_review/,
  /reviewed_exact_entity_overlap/,
  /question_not_registered/,
  /question_mapping_missing/,
  /card_mapping_missing/,
  /anki_deck_releases/,
  /anki_deck_release_cards/,
  /search_latest_anki_deck_by_concept/,
  /search_latest_anki_deck_by_sections/,
  /note_guid/,
  /card_ordinal/,
  /latest_deck_concept_coverage/,
])
  assert.match(route, required);

assert.doesNotMatch(route, /reviewerAuth\(/);
assert.doesNotMatch(route, /latestDeckConceptResults\(db,\s*input\)\.catch\(\(\) => \[\]\)/);
assert.match(ranking, /perSectionLimit/);
assert.match(ranking, /matchedSectionIds/);
assert.match(route, /if \(directResults\.length\)/);
assert.match(route, /selectConfidentQuestionCandidates/);
assert.doesNotMatch(route, /QUESTION_SEARCH_MAX_RESULTS/);
assert.doesNotMatch(route, /anchors\.map/);
assert.match(ranking, /QUESTION_SEARCH_MIN_COVERAGE/);
assert.match(precisionMigration, /cardinality\(d\.terms\) >= 2/);
assert.match(precisionMigration, /primary_hits >= 1/);
assert.match(precisionMigration, /ceil\(cardinality\(terms\) \* 0\.5\)/);
assert.match(precisionMigration, /setweight\(to_tsvector\('english', d\.primary_document\), 'A'\)/);
assert.doesNotMatch(precisionMigration, /least\(result_limit,/);
assert.doesNotMatch(route, /\.(insert|update|upsert|delete)\(/);
assert.doesNotMatch(route, /openai|embedding|completion/i);
assert.doesNotMatch(route, /console\.(log|error)/);
console.log("resource-search-api.test.ts: all assertions passed");
