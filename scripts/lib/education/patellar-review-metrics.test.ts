import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { serializeCsv } from "./review-csv.ts";

const root = path.resolve(import.meta.dirname, "../../..");
const tempDir = mkdtempSync(path.join(tmpdir(), "patellar-review-metrics-"));
const input = path.join(tempDir, "completed.csv");
const output = path.join(tempDir, "metrics.json");
const reviewer = "11111111-1111-4111-8111-111111111111";
const rows = Array.from({ length: 30 }, (_, questionIndex) =>
  [1, 2, 3].map((rank) => ({
    sourceQuestionId: `Q-${questionIndex + 1}`,
    rank,
    canonicalCardId: `card-${rank}`,
    relevanceLabel: rank === 3 ? "weak" : "acceptable",
    mappingError: "false",
    missingObviousCard: "false",
    reviewerUserId: reviewer,
    reviewedAt: "2026-07-19T12:00:00.000Z",
  }))
).flat();
writeFileSync(input, serializeCsv(rows), "utf8");
execFileSync(process.execPath, ["--experimental-strip-types", path.join(root, "scripts/calculate-patellar-instability-review-metrics.ts"), `--input=${input}`, `--out=${output}`], { cwd: root, stdio: "pipe" });
const metrics = JSON.parse(readFileSync(output, "utf8"));
assert.equal(metrics.precisionAt1Pct, 100);
assert.equal(metrics.precisionAt3Pct, 66.7);
assert.equal(metrics.suitableQuestionPct, 100);
assert.equal(metrics.mappingErrorRatePct, 0);

rows[0].relevanceLabel = "";
writeFileSync(input, serializeCsv(rows), "utf8");
assert.throws(
  () => execFileSync(process.execPath, ["--experimental-strip-types", path.join(root, "scripts/calculate-patellar-instability-review-metrics.ts"), `--input=${input}`, `--out=${output}`], { cwd: root, stdio: "pipe" }),
  /Command failed/
);

process.stdout.write("Patellar review metrics tests passed\n");
