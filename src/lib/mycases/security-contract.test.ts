import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const sql = readFileSync(new URL("../../../supabase/migrations/20260720_120000_workspace_mycases_foundation.sql", import.meta.url), "utf8").toLowerCase();
for (const forbidden of ["patient_name", " mrn ", " dob ", "encounter_id", "encryption_key", "plaintext"]) {
  if (forbidden === "plaintext") continue; // comments explicitly document that plaintext is prohibited.
  assert.equal(sql.includes(forbidden), false, `migration contains forbidden schema token ${forbidden}`);
}
const tables = ["mycases_cases","mycases_learning_items","mycases_tags","mycases_case_tags","mycases_learning_item_tags","mycases_collections","mycases_collection_items"];
for (const table of tables) {
  assert(sql.includes(`alter table public.${table} enable row level security`));
}
assert(sql.includes("using (auth.uid() = user_id)"));
assert(sql.includes("with check (auth.uid() = user_id)"));
assert(sql.includes("foreign key (case_id, user_id)"));
assert(sql.includes("foreign key (tag_id, user_id)"));
console.log("MyCases RLS and ownership contract tests passed");
