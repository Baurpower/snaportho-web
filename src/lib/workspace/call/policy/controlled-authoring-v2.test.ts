import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { projectLegacyRulesToPolicyDocumentV2 } from "./authoring-document-v2.ts";
import {
  ControlledPolicyEditError,
  validateControlledPolicyDocumentEdit,
} from "./controlled-authoring-v2.ts";

const fixture = JSON.parse(
  readFileSync(
    new URL("../../../../../fixtures/call-policy/residency-real-rules-2026-10-03.json", import.meta.url),
    "utf8"
  )
) as { rules: Array<Record<string, unknown>> };

function document() {
  return projectLegacyRulesToPolicyDocumentV2({
    ruleSetId: "fixture-rule-set",
    name: "Residency policy",
    rules: fixture.rules.map((rule, index) => ({
      id: `fixture-${index}`,
      rule_type: String(rule.rule_type),
      name: String(rule.name),
      is_enabled: rule.is_enabled as boolean,
      is_hard_rule: rule.is_hard_rule as boolean,
      priority: rule.priority as number,
      config: rule.config as Record<string, unknown>,
    })),
  });
}

test("controlled authoring permits workload edits", () => {
  const current = document();
  const candidate = structuredClone(current);
  const source = candidate.panels.find((panel) => panel.id === "workload")!.sources[0]!;
  source.config.targetMaxCalls = 5;
  const validated = validateControlledPolicyDocumentEdit({ current, candidate });
  assert.equal(
    validated.panels.find((panel) => panel.id === "workload")!.sources[0]!.config.targetMaxCalls,
    5
  );
});

test("controlled authoring rejects protected Buddy changes", () => {
  const current = document();
  const candidate = structuredClone(current);
  candidate.panels.find((panel) => panel.id === "buddyPathway")!.sources[0]!.config.requiredDaysPerMonth = 99;
  assert.throws(
    () => validateControlledPolicyDocumentEdit({ current, candidate }),
    ControlledPolicyEditError
  );
});

test("controlled authoring rejects relationship changes", () => {
  const current = document();
  const candidate = structuredClone(current);
  candidate.relationships[0]!.definition.partnerPgyYears = [1];
  assert.throws(
    () => validateControlledPolicyDocumentEdit({ current, candidate }),
    ControlledPolicyEditError
  );
});

test("controlled authoring rejects inconsistent workload bounds", () => {
  const current = document();
  const candidate = structuredClone(current);
  const source = candidate.panels.find((panel) => panel.id === "workload")!.sources[0]!;
  source.config.targetMinCalls = 7;
  source.config.targetMaxCalls = 5;
  assert.throws(
    () => validateControlledPolicyDocumentEdit({ current, candidate }),
    /minimum ≤ target maximum ≤ hard maximum/
  );
});
