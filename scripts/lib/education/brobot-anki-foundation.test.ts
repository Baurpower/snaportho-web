import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const migration = readFileSync(path.join(root, "supabase/migrations/20260719_120000_brobot_anki_schema_reconciliation.sql"), "utf8");
const studyRoute = readFileSync(path.join(root, "src/app/api/brobot-anki/study-session/route.ts"), "utf8");
const matchesRoute = readFileSync(path.join(root, "src/app/api/brobot-anki/session-matches/route.ts"), "utf8");
const authLibrary = readFileSync(path.join(root, "src/app/api/brobot-anki/_lib.ts"), "utf8");

for (const table of ["device_links", "device_tokens", "addon_devices", "prep_requests", "study_sessions", "session_matches"]) {
  assert.match(migration, new RegExp(`create table if not exists public\\.brobot_anki_${table}`));
  assert.match(migration, new RegExp(`alter table public\\.brobot_anki_${table} force row level security`));
  assert.match(migration, new RegExp(`revoke all on table public\\.brobot_anki_${table} from anon, authenticated`));
}
for (const column of ["max_cards", "min_match_score", "include_cloze_siblings", "total_candidates_found"]) {
  assert.match(migration, new RegExp(`add column if not exists ${column}`));
}
assert.match(studyRoute, /applied_base_tag: body\.appliedBaseTag \?\? "SnapOrtho::Tonight"/);
assert.match(studyRoute, /matching_strategy: body\.matchingStrategy \?\? "local_keyword"/);
assert.match(matchesRoute, /user_id: userId/);
assert.match(authLibrary, /supabase: createAdminClient\(\)/);
assert.doesNotMatch(migration, /brobot_anki_launch_commands/);

process.stdout.write("BroBot Anki foundation tests passed\n");
