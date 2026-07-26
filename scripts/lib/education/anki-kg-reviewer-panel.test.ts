import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const draftRoute = readFileSync(
  path.join(root, "src/app/api/anki/reviewer/kg/draft/route.ts"),
  "utf8",
);
const confirmRoute = readFileSync(
  path.join(root, "src/app/api/anki/reviewer/kg/confirm/route.ts"),
  "utf8",
);
const analyzeRoute = readFileSync(
  path.join(root, "src/app/api/anki/reviewer/kg/analyze/route.ts"),
  "utf8",
);
const migration = readFileSync(
  path.join(
    root,
    "supabase/migrations/20260726_130000_anki_reviewer_card_kg_outcomes.sql",
  ),
  "utf8",
);

assert.match(draftRoute, /source_aliases/);
assert.doesNotMatch(draftRoute, /pull a small anatomy\/condition sample/);
assert.doesNotMatch(draftRoute, /\.limit\(80\)/);
for (const expected of [
  /snaportho-anki-kg-analyze\.v1/,
  /analyzeKgCardEvidence/,
  /canonical_card_versions/,
])
  assert.match(analyzeRoute, expected);
assert.doesNotMatch(analyzeRoute, /canonical_entities/);

for (const expected of [
  /anki_reviewer_card_kg_outcomes/,
  /no-mapping cannot be combined/,
  /device_token_id:\s*a\.ctx\.deviceTokenId/,
  /reviewer_notes:\s*proposal\.notes/,
  /canonicalDataChanged:\s*false/,
])
  assert.match(confirmRoute, expected);
for (const staleColumn of [/device_link_id:/, /\n\s*notes:\s*proposal\.notes/])
  assert.doesNotMatch(confirmRoute, staleColumn);

for (const expected of [
  /create table public\.anki_reviewer_card_kg_outcomes/,
  /no_reliable_existing_entity/,
  /unique \(reviewer_user_id, idempotency_key\)/,
  /force row level security/,
  /guard_anki_reviewer_card_kg_outcomes_immutable/,
  /drop constraint if exists anki_editor_workspace_fields/,
])
  assert.match(migration, expected);
for (const forbidden of [
  /insert into public\.canonical_entities/,
  /insert into public\.card_canonical_entity_links/,
])
  assert.doesNotMatch(migration, forbidden);

console.log("anki-kg-reviewer-panel.test.ts: all assertions passed");
