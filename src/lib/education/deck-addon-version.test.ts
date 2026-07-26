import assert from "node:assert/strict";
import { addonVersionFromClientHeader, addonVersionAtLeast } from "./deck-addon-version";

// header parsing
assert.equal(addonVersionFromClientHeader("reviewer-addon/0.6.0"), "0.6.0");
assert.equal(addonVersionFromClientHeader("reviewer-addon/0.6.0 (mac)"), "0.6.0");
assert.equal(addonVersionFromClientHeader("something-else"), null);
assert.equal(addonVersionFromClientHeader(null), null);

// no floor => always allowed
assert.equal(addonVersionAtLeast("0.1.0", null), true);
assert.equal(addonVersionAtLeast(null, null), true);
// floor present but client unidentified => blocked
assert.equal(addonVersionAtLeast(null, "0.5.0"), false);
// comparisons
assert.equal(addonVersionAtLeast("0.6.0", "0.5.0"), true);
assert.equal(addonVersionAtLeast("0.5.0", "0.5.0"), true);
assert.equal(addonVersionAtLeast("0.4.9", "0.5.0"), false);
assert.equal(addonVersionAtLeast("0.5", "0.5.0"), true); // 0.5 == 0.5.0
assert.equal(addonVersionAtLeast("1.0.0", "0.9.9"), true);
assert.equal(addonVersionAtLeast("0.10.0", "0.9.0"), true); // numeric, not lexical

console.log("deck-addon-version.test.ts: all assertions passed");
