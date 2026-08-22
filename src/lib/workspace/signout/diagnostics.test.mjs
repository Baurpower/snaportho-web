import assert from "node:assert/strict";

import {
  diagnosticItemSummary,
  formatDiagnosticsText,
  labTrend,
  normalizeDiagnostics,
  sortDiagnosticItems,
} from "./diagnostics.ts";

function item(partial) {
  return {
    date: "2026-08-21",
    status: "Current",
    details: "",
    pinned: false,
    labValues: [],
    ptDistance: "",
    ptRecommendation: "",
    ...partial,
  };
}

const hgb = item({
  id: "hgb",
  type: "lab",
  label: "Hgb",
  pinned: true,
  status: "Recheck",
  labValues: [
    { id: "v2", value: "8.1", date: "2026-08-21" },
    { id: "v1", value: "9.4", date: "2026-08-20" },
  ],
});
const mri = item({ id: "mri", type: "imaging", label: "MRI R knee", status: "Performed", details: "Read pending" });
const pt = item({ id: "pt", type: "pt", label: "PT", status: "Seen", ptDistance: "40 ft", ptRecommendation: "SNF" });

assert.equal(labTrend(hgb.labValues), "down");
assert.equal(diagnosticItemSummary(hgb), "Hgb 8.1 ← 9.4 ↓");
assert.equal(diagnosticItemSummary(pt), "40 ft · SNF");
assert.deepEqual(sortDiagnosticItems([mri, hgb, pt]).map((entry) => entry.id), ["hgb", "mri", "pt"]);
assert.match(formatDiagnosticsText({ version: 1, items: [hgb, mri, pt] }), /MRI R knee: Read pending/);

const normalized = normalizeDiagnostics({
  version: 1,
  items: [{ ...hgb, details: " x ", ignored: "no" }, { type: "invalid" }],
});
assert.equal(normalized.items.length, 1);
assert.equal(normalized.items[0].details, "x");

console.log("Sign-out diagnostics tests passed");
