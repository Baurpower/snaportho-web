import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const migration = readFileSync(
  path.join(root, "supabase/migrations/20260922_120000_claim_overlap_learner_contract.sql"),
  "utf8",
);
const verification = readFileSync(
  path.join(root, "supabase/verification/claim_overlap_learner_contract.sql"),
  "utf8",
);
const phase0 = readFileSync(
  path.join(root, "supabase/migrations/20260720_130000_orthobullets_anki_phase0_contract.sql"),
  "utf8",
);

assert.match(migration, /claim-overlap\.v1/);
assert.match(migration, /native_question_id text/);
assert.match(migration, /attempt_id text/);
assert.match(migration, /identity_status text/);
assert.match(migration, /card_claim_link_id uuid/);
assert.match(migration, /question_link_id is null/);
assert.match(migration, /no curriculum-bridge link/);
assert.match(migration, /exact_claim_overlap/);
assert.match(migration, /status in \('completed', 'abstain', 'no_card', 'failed'\)/);
assert.match(migration, /add column if not exists claim_id uuid/);
assert.match(migration, /educational_recommendation_runs_claim_pin_check/);
assert.match(migration, /identity_status in \('stable', 'missing_native_id', 'attempt_id_only'\)/);
assert.match(migration, /anki_note_guid is distinct from new\.note_guid/);
assert.match(migration, /direct_human_review/);
assert.match(migration, /1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a/);
assert.match(migration, /educational_attempts_entity_check/);
assert.match(phase0, /topic_slug <> 'patellar-instability'/);
assert.doesNotMatch(migration, /insert\s+into\s+public\./i);
assert.doesNotMatch(migration, /^\s*(question_text|answer_choices|raw_html|card_body|deck_name)\s+/m);

assert.match(verification, /transaction read only/);
assert.match(verification, /rollback/);
assert.match(verification, /Protected educational-content column found/);
assert.match(verification, /Empty recommendation statuses are missing/);
assert.match(verification, /Patellar allowlist must remain/);

console.log("claim-overlap-learner-schema.test.ts: all assertions passed");
