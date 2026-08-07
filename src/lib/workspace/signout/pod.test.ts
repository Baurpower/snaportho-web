import assert from "node:assert/strict";
import {
  computeNextOr,
  computePod,
  computeTxDay,
  nextOrChip,
  podChip,
  shortDate,
  txDayChip,
} from "./pod";

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

// Non-op days since treatment start.
assert.equal(computeTxDay("2026-08-06", NOW)?.label, "Start day");
assert.equal(computeTxDay("2026-08-06", NOW)?.days, 0);
assert.equal(computeTxDay("2026-08-04", NOW)?.label, "Day 2");
assert.equal(computeTxDay("2026-08-04", NOW)?.days, 2);
assert.equal(txDayChip("2026-08-04", NOW), "Day 2");
assert.equal(txDayChip("2026-08-06", NOW), "Day 0");
const futureTx = computeTxDay("2026-08-08", NOW);
assert.equal(futureTx?.started, false);
assert.equal(futureTx?.label, "Starts in 2d");
assert.equal(txDayChip("2026-08-08", NOW), "Starts 2d");
assert.equal(computeTxDay("", NOW), null);

// Planned next OR countdown.
assert.equal(computeNextOr("2026-08-09", NOW)?.label, "Next OR (3d)");
assert.equal(computeNextOr("2026-08-09", NOW)?.upcoming, true);
assert.equal(computeNextOr("2026-08-06", NOW)?.label, "Next OR today");
assert.equal(computeNextOr("2026-08-04", NOW)?.label, "s/p reop POD 2");
assert.equal(computeNextOr("2026-08-04", NOW)?.upcoming, false);
assert.equal(nextOrChip("2026-08-09", NOW), "Next OR (3d)");
assert.equal(computeNextOr("", NOW), null);

// shortDate formats M/D.
assert.equal(shortDate("2026-08-03"), "8/3");
assert.equal(shortDate(""), "");

console.log("Sign-out POD tests passed");
