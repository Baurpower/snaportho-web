import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { serializeCsv } from "./review-csv.ts";

const root = path.resolve(import.meta.dirname, "../../..");
const tempDir = mkdtempSync(path.join(tmpdir(), "patellar-direct-review-"));
const input = path.join(tempDir, "review.csv");
const output = path.join(tempDir, "assertions.json");
const reviewer = "11111111-1111-4111-8111-111111111111";
const entity = "1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a";
const rows = Array.from({ length: 34 }, (_, index) => {
  const question = index < 30;
  return {
    resourceType: question ? "orthobullets_question" : "anki_card",
    sourceResourceId: question ? `Q-${index + 1}` : `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    entityLinkId: `00000000-0000-4000-8000-${String(index + 101).padStart(12, "0")}`,
    canonicalEntityId: entity,
    mappingRole: question ? "tests" : "teaches",
    reviewerDecision: "approved",
    reviewerUserId: reviewer,
    reviewedAt: "2026-07-19T12:00:00.000Z",
    reviewedConfidence: "0.99",
    safeNotes: "",
    evidenceHashes: "",
  };
});
writeFileSync(input, serializeCsv(rows), "utf8");
execFileSync(process.execPath, ["--experimental-strip-types", path.join(root, "scripts/validate-patellar-instability-direct-review.ts"), `--input=${input}`, `--out=${output}`], { cwd: root, stdio: "pipe" });
const result = JSON.parse(readFileSync(output, "utf8"));
assert.equal(result.mappingCount, 34);
assert.equal(result.pilotEligibleCount, 34);
assert.deepEqual(result.questionStatus, { reviewed: 30, eligible: 30, expected: 30 });
assert.deepEqual(result.cardStatus, { reviewed: 4, eligible: 4, expected: 4 });

rows[0].reviewerDecision = "";
writeFileSync(input, serializeCsv(rows), "utf8");
assert.throws(
  () => execFileSync(process.execPath, ["--experimental-strip-types", path.join(root, "scripts/validate-patellar-instability-direct-review.ts"), `--input=${input}`, `--out=${output}`], { cwd: root, stdio: "pipe" }),
  /Command failed/
);

process.stdout.write("Patellar direct-review tests passed\n");
