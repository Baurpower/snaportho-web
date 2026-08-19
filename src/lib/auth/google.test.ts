import assert from "node:assert/strict";
import { isNewSupabaseUser } from "./google";

const now = Date.parse("2026-08-19T02:00:00.000Z");

assert.equal(isNewSupabaseUser("2026-08-19T01:59:30.000Z", now), true);
assert.equal(isNewSupabaseUser("2026-08-19T01:00:00.000Z", now), false);
assert.equal(isNewSupabaseUser(null, now), false);
assert.equal(isNewSupabaseUser("not-a-date", now), false);

console.log("google auth helper tests passed");
