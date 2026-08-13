import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const migration = readFileSync(
  path.join(root, "supabase/migrations/20260728_120000_master_deck_metadata_pipeline.sql"),
  "utf8",
);
const verification = readFileSync(
  path.join(root, "supabase/verification/master_deck_metadata_pipeline.sql"),
  "utf8",
);
const seed = readFileSync(
  path.join(root, "supabase/migrations/20260728_121000_master_deck_metadata_taxonomy_v0_1_seed.sql"),
  "utf8",
);
const runner = readFileSync(
  path.join(root, "scripts/run-master-deck-metadata-pipeline.ts"),
  "utf8",
);

const tables = [
  "metadata_taxonomy_versions",
  "metadata_concepts",
  "metadata_concept_aliases",
  "metadata_pipeline_runs",
  "metadata_pipeline_batches",
  "metadata_pipeline_stage_results",
  "card_metadata_assertions",
  "anki_tag_dispositions",
  "anki_tag_disposition_targets",
  "metadata_releases",
  "metadata_release_assertions",
  "rendered_anki_tag_manifests",
  "rendered_anki_tag_manifest_cards",
  "rendered_anki_tag_sources",
];

for (const table of tables) {
  assert.match(migration, new RegExp(`create table public\\.${table}`));
  assert.match(migration, new RegExp(`'${table}'`));
  assert.match(verification, new RegExp(`'${table}'`));
}

for (const expected of [
  /FOR UPDATE SKIP LOCKED/i,
  /claim_metadata_pipeline_batch/,
  /ordered_card_version_ids uuid\[\]/,
  /unique nulls not distinct/,
  /one_target_check/,
  /metadata_evidence_spans_are_valid/,
  /decision_method text not null/,
  /card_metadata_assertions_one_primary_specialty_idx/,
  /accepted, pinned, in-release assertion/,
  /reviewed metadata evidence is immutable/,
  /rendered tag list contains duplicates/,
  /force row level security/,
  /from anon, authenticated, service_role/,
  /to service_role/,
]) {
  assert.match(migration, expected);
}

assert.match(migration, /metadata_evidence_spans_are_valid\(input_value jsonb\)/);
assert.match(migration, /from jsonb_array_elements\([\s\S]*as element\(item\)/);
assert.doesNotMatch(migration, /jsonb_array_elements\([\s\S]{0,200}\)\s+span;/);
assert.doesNotMatch(migration, /insert\s+into\s+public\./i);
assert.doesNotMatch(migration, /update\s+public\.(anki_tags|anki_note_tags|canonical_entities)\b/i);
assert.doesNotMatch(migration, /delete\s+from\s+public\./i);
assert.match(seed, /on conflict \(version\) do nothing/i);
assert.match(seed, /on conflict \(taxonomy_version_id, stable_key\) do nothing/i);
for (const specialty of [
  "Adult_Reconstruction",
  "Foot_Ankle",
  "Hand_Upper_Extremity",
  "Pediatric_Orthopedics",
  "Shoulder_Elbow",
  "Sports_Medicine",
  "Trauma",
]) {
  assert.match(seed, new RegExp(`'${specialty}'`));
}
assert.match(verification, /transaction read only/i);
assert.match(verification, /rollback/);
for (const expected of [
  /codex-cohort-export/,
  /sync-v2-cohort-export/,
  /just_in_time_cohorts/,
  /parallel_compact_packets/,
  /SIMPLE_DEFAULT_TAXONOMY_LIMIT = 12/,
  /remainingAfterThisCohort/,
  /decision_policy_version: SIMPLE_RUN_VERSION/,
  /disposition: "workflow_only"/,
  /GROK_TAG_REVIEW_RUN_KEY/,
  /official_note_join_misses/,
  /pendingPacketFileName/,
]) {
  assert.match(runner, expected);
}
assert.doesNotMatch(runner, /snaportho::caseprep[\s\S]{0,200}disposition: "contaminated"/i);

console.log("master-deck-metadata-pipeline-schema.test.ts: all assertions passed");
