import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261003170726_program_call_policy_revisions_v2.sql",
    import.meta.url
  ),
  "utf8"
);
const hardeningMigration = readFileSync(
  new URL(
    "../../supabase/migrations/20261005024144_harden_call_policy_architecture.sql",
    import.meta.url
  ),
  "utf8"
);

test("policy revisions are immutable, RLS-protected, and server-only", () => {
  assert.match(migration, /create table if not exists public\.program_call_policy_revisions/i);
  assert.match(migration, /unique \(rule_set_id, revision_number\)/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /compatibility blockers/i);
  assert.match(migration, /failed academic-year parity/i);
  assert.match(migration, /parity_status text not null/i);
  assert.match(migration, /parity_report jsonb not null/i);
  assert.match(migration, /Policy revision content is immutable/i);
  assert.match(migration, /before update on public\.program_call_policy_revisions/i);
  assert.match(migration, /activate_program_call_policy_revision_v2/i);
  assert.match(migration, /Policy revision is not an activatable passing draft/i);
  assert.match(migration, /set status = 'superseded'/i);
  assert.match(migration, /set status = 'active', activated_at/i);
  assert.match(migration, /STALE_RULE_SET/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /revoke all .* from anon, authenticated/is);
  assert.match(migration, /grant select, insert, update .* to service_role/is);
  assert.match(migration, /revoke delete .* from service_role/is);
  assert.match(migration, /revoke execute .* from public, anon, authenticated/is);
  assert.match(migration, /grant execute .* to service_role/is);
  assert.doesNotMatch(migration, /create policy/i);
});

test("policy drafts and schedule publication are concurrency-safe", () => {
  assert.match(hardeningMigration, /base_rule_set_updated_at timestamptz/i);
  assert.match(hardeningMigration, /base_rules_hash text/i);
  assert.match(hardeningMigration, /metadata jsonb not null/i);
  assert.match(hardeningMigration, /STALE_POLICY_REVISION/i);
  assert.match(hardeningMigration, /one_active_idx/i);
  assert.match(hardeningMigration, /replace_program_call_assignments_transactional/i);
  assert.match(hardeningMigration, /pg_advisory_xact_lock/i);
  assert.match(hardeningMigration, /STALE_CALL_SCHEDULE/i);
  assert.match(hardeningMigration, /SOURCE_OWNED_ASSIGNMENT/i);
  assert.match(hardeningMigration, /base_rules_hash is distinct from old\.base_rules_hash/i);
  assert.match(hardeningMigration, /from public, anon, authenticated, service_role/i);
});
