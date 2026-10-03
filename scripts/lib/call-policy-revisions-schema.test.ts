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
