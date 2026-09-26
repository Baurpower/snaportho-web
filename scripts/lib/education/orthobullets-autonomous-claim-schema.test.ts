import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..');
const sql = readFileSync(path.join(root, 'supabase/migrations/20260926161059_orthobullets_autonomous_claim_runs.sql'), 'utf8');
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

console.log('orthobullets-autonomous-claim-schema.test.ts: all assertions passed');
