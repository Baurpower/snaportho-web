import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260929021738_brobot_claims_knowledge_v2.sql",
  ),
  "utf8",
);

assert.match(
  sql,
  /create or replace function public\.retrieve_brobot_knowledge_v2/,
);
assert.match(sql, /security invoker/i);
assert.match(sql, /set search_path = ''/i);
assert.match(sql, /revoke execute[\s\S]*from public, anon, authenticated/i);
assert.match(sql, /grant execute[\s\S]*to service_role/i);
assert.match(sql, /c\.current_version_id/);
assert.match(sql, /v\.review_status = 'approved'/);
assert.match(sql, /v\.content_source = 'verified'/);
assert.match(sql, /l\.algorithm_version = 'card-claim-factory\.v1'/);
assert.match(sql, /l\.review_status = 'auto_approved'/);
assert.match(sql, /cardinality\(l\.evidence_hashes\) > 0/);
assert.match(sql, /v\.review_status = 'unreviewed'/);
assert.match(sql, /v\.content_source = 'generated_draft'/);
assert.match(sql, /card_canonical_entity_links/);
assert.match(sql, /l\.claim_version_id = rc\.claim_version_id/);
assert.match(sql, /drc\.inclusion_status = 'included'/);
assert.match(sql, /cc\.current_version_id = l\.canonical_card_version_id/);
assert.doesNotMatch(
  sql,
  /ob_claim_candidates|ob_claim_extraction_events|ob_claim_candidate_decisions/,
);

console.log("BroBot claims knowledge v2 schema contract tests passed");
