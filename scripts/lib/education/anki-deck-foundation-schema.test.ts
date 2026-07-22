import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"../../..");
const sql=readFileSync(path.join(root,"supabase/migrations/20260720_140000_versioned_anki_deck_foundation.sql"),"utf8");
const verify=readFileSync(path.join(root,"supabase/verification/versioned_anki_deck_foundation.sql"),"utf8");
for(const table of ["anki_deck_releases","anki_deck_release_cards","anki_card_entity_mapping_runs_v2","anki_card_entity_version_mappings"]){
  assert.match(sql,new RegExp(`create table public\\.${table}`)); assert.match(sql,new RegExp(`'${table}'`)); assert.match(verify,new RegExp(`'${table}'`));
}
for(const invariant of [/published deck manifests are immutable/,/published release membership is immutable/,/published manifest checksum does not match immutable membership/,/mark_anki_version_mappings_stale/,/reviewed version mapping evidence and decision are immutable/,/current_version_id is distinct from new\.canonical_card_version_id/,/reviewer_confidence < 0\.950/,/direct_human_review/,/curriculum_node_bridge/,/eligible_release_count = 0/,/production_eligible boolean not null default false/,/force row level security/,/from anon, authenticated, service_role/]) assert.match(sql,invariant);
assert.doesNotMatch(sql,/insert\s+into\s+public\./i); assert.doesNotMatch(sql,/canonical_relationships/); assert.doesNotMatch(sql,/educational_resources/); assert.doesNotMatch(sql,/question_attempt|learning_event|recommendation_run/i);
assert.match(verify,/No canonical_relationships dependency/); assert.match(verify,/recursive metadata safety/i);
console.log("anki-deck-foundation-schema.test.ts: all assertions passed");
