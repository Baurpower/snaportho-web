import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditRulesForAuthoringV2 } from "./authoring-schema-v2.ts";
import { compilePolicy } from "./compile.ts";
import { sanitizeRuleConfig } from "../rule-definitions.ts";
import {
  projectLegacyRulesToPolicyDocumentV2,
  recoverLegacySourcesFromPolicyDocumentV2,
} from "./authoring-document-v2.ts";
import { materializePolicyDocumentV2 } from "./compile-authoring-v2.ts";
import type { ProgramCallSlotDefinition, ProgramRule } from "../rule-definitions.ts";

const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../../../fixtures/call-policy/residency-real-rules-2026-10-03.json",
      import.meta.url
    ),
    "utf8"
  )
) as {
  rules: Array<{
    rule_type: string;
    name: string;
    is_enabled: boolean;
    is_hard_rule: boolean;
    priority: number;
    config: Record<string, unknown>;
  }>;
};

test("real Residency rules have complete v2 authoring coverage", () => {
  const audit = auditRulesForAuthoringV2(fixture.rules);

  assert.equal(fixture.rules.length, 19);
  assert.deepEqual(audit.blockers, []);
  assert.deepEqual(audit.panelCounts, {
    slots: 4,
    eligibility: 5,
    rotationAvailability: 3,
    workload: 4,
    spacingPreferences: 2,
    buddyPathway: 1,
  });
});

test("migration audit identifies sources that must be consolidated", () => {
  const audit = auditRulesForAuthoringV2(fixture.rules);
  const warningCodes = audit.warnings.map((warning) => warning.code).sort();

  assert.deepEqual(warningCodes, [
    "buddy_partner_source_drift",
    "buddy_presence_requires_relationship_migration",
    "duplicate_requiredness_source",
    "priority_is_not_dependency_order",
  ]);
});

test("the save sanitizer preserves every configuration field in the real rules", () => {
  for (const rule of fixture.rules) {
    const sanitized = sanitizeRuleConfig(
      rule.rule_type as Parameters<typeof sanitizeRuleConfig>[0],
      rule.config
    );
    for (const [key, value] of Object.entries(rule.config)) {
      assert.deepEqual(
        sanitized[key as keyof typeof sanitized],
        value,
        `${rule.name} lost or changed config.${key}`
      );
    }
  }
});

function persistedSlotDefinitions(): ProgramCallSlotDefinition[] {
  return fixture.rules
    .filter((rule) => rule.rule_type === "call_slot_definition")
    .map((rule, index) => ({
      id: `slot-${index}`,
      label: String(rule.config.slotLabel ?? rule.name),
      shortLabel: String(rule.config.slotShortLabel ?? ""),
      callType: String(rule.config.slotCallType ?? rule.name),
      colorKey: String(rule.config.slotColorKey ?? "slate"),
      requiredMode: rule.config.slotRequiredMode as ProgramCallSlotDefinition["requiredMode"],
      daysOfWeek: rule.config.slotDaysOfWeek as number[] | undefined,
      condition: rule.config.slotCondition as ProgramCallSlotDefinition["condition"],
      countsTowardWorkload: rule.config.slotCountsTowardWorkload !== false,
      requiredWhenVisible: rule.config.slotRequiredWhenVisible !== false,
      sortOrder: Number(rule.config.slotSortOrder ?? index),
    }));
}

test("audit exposes the persisted-row Buddy presence migration gap", () => {
  const rules = fixture.rules.map((rule, index) => ({
    id: `fixture-${index}`,
    ...rule,
  })) as ProgramRule[];
  const policy = compilePolicy(rules);
  const buddy = policy.slots.find((slot) => slot.callType === "Buddy");

  assert.ok(buddy);
  assert.deepEqual(buddy.present, { kind: "never" });
});

test("normalized v2 slot relationships express the complete grey-zone policy", () => {
  const rules = fixture.rules.map((rule, index) => ({
    id: `fixture-${index}`,
    ...rule,
  })) as ProgramRule[];
  const policy = compilePolicy(rules, persistedSlotDefinitions());

  const primary = policy.slots.find((slot) => slot.callType === "Primary");
  const backup = policy.slots.find((slot) => slot.callType === "Backup");
  const buddy = policy.slots.find((slot) => slot.callType === "Buddy");

  assert.ok(primary);
  assert.ok(backup);
  assert.ok(buddy);

  // Primary pool plus PGY-1 service-month progression.
  assert.equal(primary.eligibility.length, 2);
  assert.deepEqual(primary.eligibility[1]?.predicate, {
    kind: "and",
    of: [
      { kind: "pgyIn", years: [1] },
      { kind: "serviceMonthIndex", tokens: ["ortho"], op: "gte", n: 2 },
    ],
  });

  // PGY-5 preferred Backup pool plus PGY-4 fallback.
  assert.equal(backup.eligibility.length, 2);
  assert.equal(backup.eligibility[1]?.preference, 1);
  assert.deepEqual(backup.eligibility[1]?.predicate, { kind: "pgyIn", years: [4] });

  // Buddy pairing and visibility share the effective PGY-4/5 relationship.
  assert.deepEqual(buddy.pairing[0]?.predicate, { kind: "pgyIn", years: [4, 5] });
  assert.deepEqual(buddy.present, {
    kind: "and",
    of: [
      { kind: "dayOfWeekIn", days: [5, 6] },
      { kind: "slotOccupantPgyIn", slot: "Primary", years: [4, 5] },
    ],
  });
  assert.equal(policy.globals.buddy.maxWeekendsPerInternMonth, 2);
});

test("v2 document projection is lossless and materializes explicit relationships", () => {
  const sourceRules = fixture.rules.map((rule, index) => ({
    id: `fixture-${index}`,
    ...rule,
  }));
  const document = projectLegacyRulesToPolicyDocumentV2({
    ruleSetId: "fixture-rule-set",
    name: "Residency policy",
    rules: sourceRules,
    generatedAt: "2026-10-03T00:00:00.000Z",
  });
  const recovered = recoverLegacySourcesFromPolicyDocumentV2(document);

  assert.equal(document.schemaVersion, 2);
  assert.equal(document.panels.length, 6);
  assert.equal(document.relationships.length, 3);
  assert.deepEqual(
    document.relationships.find((relationship) => relationship.id === "buddy-primary-pairing")
      ?.definition,
    { partnerPgyYears: [4, 5], daysOfWeek: [5, 6], severity: "hard" }
  );
  assert.deepEqual(
    document.relationships.find((relationship) => relationship.id === "backup-fallback-tier")
      ?.definition,
    { pgyYears: [4], label: "Fallback: PGY-4 covering", preference: 1 }
  );
  assert.deepEqual(
    recovered,
    sourceRules.map((rule) => ({ ...rule, config: { ...rule.config } }))
  );

  const materialized = materializePolicyDocumentV2(document);
  const buddySlot = materialized.find(
    (rule) => rule.rule_type === "call_slot_definition" && rule.config.slotCallType === "Buddy"
  );
  assert.deepEqual(buddySlot?.config.slotCondition, {
    type: "when_pgy_scheduled",
    pgyYears: [4, 5],
    sourceSlotCallTypes: ["Primary"],
  });
});
