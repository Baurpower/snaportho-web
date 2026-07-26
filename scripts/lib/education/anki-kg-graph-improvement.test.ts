import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const migration = readFileSync(
  path.join(
    root,
    "supabase/migrations/20260726_140000_anki_kg_graph_improvements.sql",
  ),
  "utf8",
);
const verification = readFileSync(
  path.join(root, "supabase/verification/anki_kg_graph_improvements.sql"),
  "utf8",
);
const suggest = readFileSync(
  path.join(
    root,
    "src/app/api/anki/reviewer/kg/improvements/suggest/route.ts",
  ),
  "utf8",
);
const decision = readFileSync(
  path.join(
    root,
    "src/app/api/anki/reviewer/kg/improvements/decision/route.ts",
  ),
  "utf8",
);
const adjudicate = readFileSync(
  path.join(
    root,
    "src/app/api/anki/reviewer/kg/improvements/adjudicate/route.ts",
  ),
  "utf8",
);
const addonPanel = readFileSync(
  path.join(
    root,
    "integrations/snaportho-anki/addon/snaportho_reviewer/surfaces.py",
  ),
  "utf8",
);

for (const table of [
  "anki_kg_improvement_suggestions",
  "anki_kg_improvement_decisions",
  "anki_kg_improvement_adjudications",
])
  assert.match(migration, new RegExp(`create table public\\.${table}`));
for (const required of [
  /graph_diff/,
  /evidence_hash/,
  /independent_adjudicator_required/,
  /approved_operations_required/,
  /guard_anki_kg_improvement_suggestions_immutable/,
  /force row level security/,
])
  assert.match(migration, required);
for (const forbidden of [
  /insert into public\.canonical_entities/,
  /insert into public\.educational_claims/,
  /insert into public\.canonical_relationships/,
  /insert into public\.card_canonical_entity_links/,
])
  assert.doesNotMatch(migration, forbidden);

assert.match(suggest, /buildImprovementContext/);
assert.match(suggest, /canonicalDataChanged:\s*false/);
assert.match(decision, /queuedForReview/);
assert.match(decision, /server_version_changed/);
assert.match(adjudicate, /independent adjudicator required/);
assert.match(adjudicate, /ontology review requires administrator/);
assert.match(adjudicate, /kg_automation_proposals/);
assert.match(adjudicate, /review_status:\s*"needs_review"/);
assert.doesNotMatch(
  [suggest, decision, adjudicate].join("\n"),
  /from\("(?:canonical_entities|educational_claims|canonical_relationships|card_canonical_entity_links)"\)\s*\.(?:insert|upsert|update|delete)/,
);
for (const label of [
  "Suggest KG improvements",
  "Accept improvement",
  "Review details",
  "Not useful",
])
  assert.match(addonPanel, new RegExp(label));
assert.match(addonPanel, /kg_suggest_improvement/);
assert.match(addonPanel, /kg_improvement_decision/);
assert.match(verification, /transaction read only/);
assert.match(verification, /accepted_without_adjudication/);
assert.match(verification, /rollback/);

console.log("anki-kg-graph-improvement.test.ts: all assertions passed");
