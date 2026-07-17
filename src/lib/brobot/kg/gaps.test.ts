import assert from "node:assert/strict";

import { classifyBroBotKgGaps } from "./gaps";

const missing = classifyBroBotKgGaps({
  query: "unknown fracture concept",
  status: "miss",
  candidates: [],
  facts: [],
  coverage: "unknown",
  requiredPredicateFamilies: ["has_classification"],
});
assert.ok(missing.some((gap) => gap.gapType === "missing_entity"));
assert.ok(missing.some((gap) => gap.gapType === "missing_neighborhood"));

console.log("brobot kg gap tests passed");
