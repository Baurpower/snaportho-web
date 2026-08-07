import assert from "node:assert/strict";
import { computePod, podChip, shortDate } from "./pod";

const NOW = new Date("2026-08-06T09:00:00");

// Day of surgery = POD 0.
assert.equal(computePod("2026-08-06", NOW)?.label, "Day of surgery");
assert.equal(computePod("2026-08-06", NOW)?.days, 0);

// Past surgery counts up.
assert.equal(computePod("2026-08-03", NOW)?.label, "POD 3");
assert.equal(computePod("2026-08-03", NOW)?.days, 3);
assert.equal(podChip("2026-08-03", NOW), "POD 3");

// Future (planned) surgery is pre-op with days until.
const preop = computePod("2026-08-09", NOW);
assert.equal(preop?.preOp, true);
assert.equal(preop?.days, -3);
assert.equal(preop?.label, "Pre-op (3d)");
assert.equal(podChip("2026-08-09", NOW), "Pre-op");

// No / invalid date -> null.
assert.equal(computePod("", NOW), null);
assert.equal(computePod(null, NOW), null);
assert.equal(computePod("not-a-date", NOW), null);

// shortDate formats M/D.
assert.equal(shortDate("2026-08-03"), "8/3");
assert.equal(shortDate(""), "");

console.log("Sign-out POD tests passed");
