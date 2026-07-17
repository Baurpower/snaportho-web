import assert from "node:assert/strict";

import { BoundedTtlCache, normalizeKgQuery } from "./cache";

const cache = new BoundedTtlCache<string>(2, 60_000);
cache.set("release-a:query", "a");
cache.set("release-b:query", "b");
assert.equal(cache.get("release-a:query"), "a");
assert.equal(cache.get("release-b:query"), "b");
assert.equal(cache.get("release-c:query"), null);
assert.equal(normalizeKgQuery("Distal-radius  ORIF"), "distal radius orif");

console.log("brobot kg cache tests passed");
