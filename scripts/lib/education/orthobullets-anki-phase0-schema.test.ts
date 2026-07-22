import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const migration = readFileSync(path.join(root, "supabase/migrations/20260720_130000_orthobullets_anki_phase0_contract.sql"), "utf8");
const verification = readFileSync(path.join(root, "supabase/verification/orthobullets_anki_phase0_contract.sql"), "utf8");

const tables = [
  "educational_question_attempt_events", "educational_recommendation_runs",
  "educational_recommendation_items", "educational_recommendation_actions",
  "educational_anki_launch_commands", "educational_anki_launch_acknowledgements",
];
for (const table of tables) {
  assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
  assert.match(migration, new RegExp(`'${table}'`));
  assert.match(verification, new RegExp(`'${table}'`));
}
assert.match(migration, /alter table public\.%I force row level security/);
assert.match(migration, /revoke all on table public\.%I from anon, authenticated, service_role/);
assert.match(migration, /for all to service_role using \(true\) with check \(true\)/);
assert.match(migration, /correct boolean not null/);
assert.match(migration, /review_state = 'answered_review' and correct = false/);
assert.match(migration, /status = 'completed' and result_count between 1 and 3/);
assert.match(migration, /rank between 1 and 3/);
assert.match(migration, /expires_at <= requested_at \+ interval '5 minutes'/);
assert.match(migration, /retained_until <= received_at \+ interval '90 days'/);
assert.match(migration, /direct_human_review/);
assert.match(migration, /confidence < 0\.950/);
assert.match(migration, /source_slug <> 'orthobullets'/);
assert.match(migration, /topic_slug <> 'patellar-instability'/);
assert.match(migration, /current_version_id is distinct from new\.canonical_card_version_id/);
assert.match(migration, /anki_note_guid is distinct from new\.note_guid/);
assert.match(migration, /1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a/g);
assert.match(migration, /educational_metadata_is_safe/);
assert.match(verification, /Protected educational-content column found/);
assert.doesNotMatch(migration, /insert\s+into\s+public\./i);
assert.doesNotMatch(migration, /canonical_relationships/);
assert.doesNotMatch(migration, /educational_resources/);

for (const forbiddenColumn of ["question_text", "answer_text", "answer_choices", "explanation", "raw_html", "card_body"]) {
  assert.doesNotMatch(migration, new RegExp(`^\\s*${forbiddenColumn}\\s+`, "mi"));
}

console.log("orthobullets-anki-phase0-schema.test.ts: all assertions passed");
