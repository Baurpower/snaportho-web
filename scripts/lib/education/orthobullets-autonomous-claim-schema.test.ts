import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..');
const sql = readFileSync(path.join(root, 'supabase/migrations/20260926161059_orthobullets_autonomous_claim_runs.sql'), 'utf8');
const identity = readFileSync(path.join(root, 'supabase/migrations/20260926194551_orthobullets_claim_assertion_identity.sql'), 'utf8');
const verification = readFileSync(path.join(root, 'supabase/verification/orthobullets_autonomous_claim_runs.sql'), 'utf8');

for (const expected of [
  /create table public\.orthobullets_claim_runs/,
  /create table public\.orthobullets_claim_run_items/,
  /commit_orthobullets_machine_claim/,
  /resolve_orthobullets_machine_entity/,
  /pg_advisory_xact_lock/,
  /generator_critic_consensus/,
  /force row level security/,
  /from anon, authenticated, public/,
  /to service_role/,
]) assert.match(sql, expected);

for (const forbidden of [
  /\bstem\s+text/i,
  /\bexplanation\s+text/i,
  /\banswer_choices\b/i,
  /\braw_html\b/i,
]) assert.doesNotMatch(sql, forbidden);

assert.match(sql, /unique \(run_id, native_question_id\)/);
assert.match(sql, /source_fingerprint_hash/);
assert.match(sql, /review_status = 'auto_approved'/);
assert.match(verification, /transaction read only/);
assert.match(verification, /rollback/);

assert.match(identity, /educational_claim_assertion_fingerprint_hash/);
assert.match(identity, /assertion=/);
assert.match(identity, /orthobullets-autonomous-claim\.v3/);
assert.match(identity, /'needs_review', 'unreviewed'/);
assert.match(identity, /review_status = 'needs_review'/);
assert.match(identity, /vignette_in_claim/);
assert.match(identity, /v_match_count <> 1/);
assert.doesNotMatch(identity, /insert into public\.canonical_entities/i);
assert.doesNotMatch(identity, /'verified'/);
assert.doesNotMatch(identity, /update public\.educational_claims\s+set fingerprint_hash/i);

const reviewed = readFileSync(path.join(root, 'supabase/migrations/20260926203601_orthobullets_match_reviewed_entities.sql'), 'utf8');
assert.match(reviewed, /status in \('reviewed', 'canonical'\)/);
assert.doesNotMatch(reviewed, /insert into public\.canonical_entities/i);
assert.match(reviewed, /v_match_count <> 1/);

console.log('orthobullets-autonomous-claim-schema.test.ts: all assertions passed');
