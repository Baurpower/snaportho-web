import assert from "node:assert/strict";

import {
  assertStagingTarget,
  getProjectRefFromUrl,
  STAGING_PROJECT_REFS,
} from "./kg-staging-guard.ts";

assert.equal(getProjectRefFromUrl("https://geznczcokbgybsseipjg.supabase.co"), "geznczcokbgybsseipjg");
assert.ok(STAGING_PROJECT_REFS.has("geznczcokbgybsseipjg"));

const prev = process.env.KG_TARGET_ENV;
process.env.KG_TARGET_ENV = "staging";
const ok = assertStagingTarget("test");
assert.equal(ok.allowed, true);

process.env.KG_TARGET_ENV = "production";
const blocked = assertStagingTarget("test");
assert.equal(blocked.allowed, false);

process.env.KG_TARGET_ENV = prev;

console.log("kg-staging-guard.test.ts: all assertions passed");