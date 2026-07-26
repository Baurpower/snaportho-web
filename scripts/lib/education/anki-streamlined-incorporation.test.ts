import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const sql = readFileSync(
  path.join(
    root,
    "supabase/migrations/20260726_200000_anki_streamlined_incorporation.sql",
  ),
  "utf8",
);
for (const pattern of [
  /claim_anki_workspace_proposal_for_incorporation/,
  /for update skip locked/,
  /incorporate_anki_workspace_proposal/,
  /proposal_evidence_changed/,
  /stale_card_version/,
  /insert into public\.canonical_card_versions/,
  /update public\.canonical_cards/,
  /insert into public\.card_canonical_entity_links/,
  /status='incorporated'/,
]) {
  assert.match(sql, pattern);
}
assert.doesNotMatch(sql, /insert into public\.canonical_entities/);
assert.doesNotMatch(sql, /insert into public\.educational_claims/);
console.log("anki-streamlined-incorporation.test.ts: all assertions passed");
