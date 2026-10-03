import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261003170724_transactional_program_call_rules_replace.sql",
    import.meta.url
  ),
  "utf8"
);

test("call-rule replacement migration is atomic and server-only", () => {
  assert.match(migration, /for update/i);
  assert.match(migration, /delete from public\.program_call_rules/i);
  assert.match(migration, /insert into public\.program_call_rules/i);
  assert.match(migration, /raise exception 'STALE_RULE_SET'/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /revoke execute[\s\S]*authenticated/i);
  assert.match(migration, /grant execute[\s\S]*service_role/i);
});
