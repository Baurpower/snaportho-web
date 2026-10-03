import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ProgramRule } from "../rule-definitions.ts";
import { runAcademicYearPolicyParity } from "./academic-year-parity.ts";

const fixture = JSON.parse(
  readFileSync(
    new URL("../../../../../fixtures/call-policy/residency-real-rules-2026-10-03.json", import.meta.url),
    "utf8"
  )
) as { rules: ProgramRule[] };

test("the real Residency policy has full v2 parity across an academic year", () => {
  const rules = fixture.rules.map((rule, index) => ({ ...rule, id: rule.id ?? `fixture-${index}` }));
  const report = runAcademicYearPolicyParity({
    ruleSetId: "fixture-rule-set",
    ruleSetName: "Residency policy",
    rules,
  });

  assert.equal(report.days, 365);
  assert.ok(report.evaluations >= 15_000, "parity matrix must exercise a broad policy surface");
  assert.equal(report.passed, true);
  assert.deepEqual(report.differences, []);
});
