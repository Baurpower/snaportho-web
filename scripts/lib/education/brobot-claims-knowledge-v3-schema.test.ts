import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260929040000_brobot_claims_knowledge_v3.sql",
  ),
  "utf8",
);

assert.match(
  sql,
  /create or replace function public\.retrieve_brobot_knowledge_v3/,
);
assert.match(sql, /security invoker/i);
assert.match(sql, /set search_path = ''/i);
assert.match(sql, /revoke execute[\s\S]*from public, anon, authenticated/i);
assert.match(sql, /grant execute[\s\S]*to service_role/i);
// Serving boundary: reviewed path (approved + verified) and factory path
// (card-claim-factory.v1 + evidence hashes), exclusions before ranking.
assert.match(sql, /eligible_claims as \(/);
assert.match(sql, /review_status = 'approved'/);
assert.match(sql, /content_source = 'verified'/);
assert.match(sql, /algorithm_version = 'card-claim-factory\.v1'/);
assert.match(sql, /cardinality\(l\.evidence_hashes\) > 0/);
assert.match(sql, /needs_review/);
assert.match(sql, /rejected/);
assert.match(sql, /superseded/);
// Hybrid channels: claim FTS/trigram/token/phrase, card text, entity
// traversal, relationship hop; broad pool with IDF packet for rerank.
assert.match(sql, /p_pool_size integer default 48/);
assert.match(sql, /'claimFts'/);
assert.match(sql, /'claimTrigram'/);
assert.match(sql, /'claimToken'/);
assert.match(sql, /'exactPhrase'/);
assert.match(sql, /'entityTraversal'/);
assert.match(sql, /'relationshipHop'/);
assert.match(sql, /'cardText'/);
assert.match(sql, /'termIdf'/);
// Telemetry columns for v3 diagnosis.
assert.match(sql, /add column if not exists query_variants/);
assert.match(sql, /add column if not exists requested_facets/);
assert.match(sql, /add column if not exists retrieval_channels/);
assert.match(sql, /add column if not exists claim_score_components/);
assert.match(sql, /add column if not exists exclusion_reasons/);
assert.match(sql, /add column if not exists rerank_version/);
assert.match(sql, /add column if not exists pool_size/);
assert.match(sql, /add column if not exists support_level/);
assert.doesNotMatch(
  sql,
  /ob_claim_candidates|ob_claim_extraction_events|ob_claim_candidate_decisions/,
);

console.log("BroBot claims knowledge v3 schema contract tests passed");
