import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const migration = readFileSync(
  path.join(root, "supabase/migrations/20260919_120000_educational_claim_fingerprint.sql"),
  "utf8",
);
const verification = readFileSync(
  path.join(root, "supabase/verification/educational_claim_fingerprint.sql"),
  "utf8",
);

const tables = [
  "educational_claims",
  "educational_claim_versions",
  "card_claim_links",
  "question_claim_links",
  "educational_claim_gaps",
];
for (const table of tables) {
  assert.match(migration, new RegExp(`'${table}'`));
  assert.match(verification, new RegExp(`'${table}'`));
}

assert.match(migration, /create table if not exists public\.educational_claim_versions/);
assert.match(migration, /create table if not exists public\.card_claim_links/);
assert.match(migration, /create table if not exists public\.question_claim_links/);
assert.match(migration, /create table if not exists public\.educational_claim_gaps/);
assert.match(migration, /add column if not exists fingerprint_hash/);
assert.match(migration, /add column if not exists predicate/);
assert.match(migration, /add column if not exists object_text/);
assert.match(migration, /add column if not exists qualifiers/);
assert.match(migration, /add column if not exists approval_method/);
assert.match(migration, /add column if not exists current_version_id/);
assert.match(migration, /educational_claim_fingerprint_hash/);
assert.match(migration, /educational_claim_qualifiers_are_valid/);
assert.match(migration, /type=' \|\| public\.educational_claim_normalize_text\(claim_type\)/);
assert.match(migration, /force row level security/);
assert.match(migration, /revoke all on table public\.%I from anon, authenticated, service_role/);
assert.match(migration, /for all to service_role using \(true\) with check \(true\)/);
assert.match(migration, /mapping_role text not null default 'teaches'/);
assert.match(migration, /mapping_role in \('tests_primary', 'tests_secondary'\)/);
assert.match(migration, /educational_claim_versions rows are immutable/);
assert.match(migration, /mark_card_claim_links_stale/);
assert.match(migration, /educational_metadata_is_safe/);
assert.match(migration, /provider in \('orthobullets', 'rock_himalaya'\)/);
assert.match(migration, /gap_class in \(/);
assert.match(migration, /missing_claim/);
assert.doesNotMatch(migration, /direct_human_review/);
assert.doesNotMatch(migration, /create table if not exists public\.educational_resources/);
assert.doesNotMatch(migration, /^\s*(question_text|answer_choices|raw_html|card_body)\s+/m);

assert.match(verification, /transaction read only/);
assert.match(verification, /rollback/);
assert.match(verification, /Protected educational-content column found/);
assert.match(verification, /Fingerprint hash is not stable under allowed normalization/);
assert.match(verification, /has client grant/);

console.log("educational-claim-fingerprint-schema.test.ts: all assertions passed");
