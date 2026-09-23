import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const sql = readFileSync(
  path.join(root, "supabase/migrations/20260922_130000_claim_overlap_direct_launch.sql"),
  "utf8",
);
assert.match(sql, /alter column recommendation_item_id drop not null/);
assert.match(sql, /contract_version = 'claim-overlap\.v1'/);
assert.match(sql, /claim-overlap launch GUID\/ordinal does not match canonical card identity/);
assert.match(sql, /direct_human_review/);
assert.doesNotMatch(sql, /insert\s+into\s+public\./i);
console.log("claim-overlap-launch-schema.test.ts: all assertions passed");
