import assert from "node:assert/strict";
import test from "node:test";
import {
  assertEditableProgramRuleType,
  isProtectedProgramRuleType,
  mergeEditableRulesWithProtectedRows,
} from "./rule-persistence.ts";
import type { ProgramCallRule, UpsertProgramCallRuleInput } from "./programcallrules.ts";

const baseRow: ProgramCallRule = {
  id: "11111111-1111-1111-1111-111111111111",
  program_id: "22222222-2222-2222-2222-222222222222",
  rule_set_id: "33333333-3333-3333-3333-333333333333",
  rule_type: "buddy_requirement",
  name: "Buddy policy",
  is_enabled: true,
  is_hard_rule: true,
  priority: 90,
  scope: {},
  config: {
    requiredDaysPerMonth: 2,
    eligibleServiceMonthIndices: [1],
    partnerPgyYears: [4, 5],
    internPrimaryFromServiceMonthIndex: 2,
  },
  created_by: "44444444-4444-4444-4444-444444444444",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

test("buddy and future rule types are protected", () => {
  assert.equal(isProtectedProgramRuleType("buddy_requirement"), true);
  assert.equal(isProtectedProgramRuleType("future_scheduler_rule"), true);
  assert.equal(isProtectedProgramRuleType("min_days_between_assignments"), false);
  assert.throws(
    () => assertEditableProgramRuleType("buddy_requirement"),
    /system-managed/
  );
});

test("server merge preserves protected config and ignores client ownership", () => {
  const editable: UpsertProgramCallRuleInput = {
    programId: baseRow.program_id,
    ruleSetId: baseRow.rule_set_id,
    ruleType: "min_days_between_assignments",
    name: "Spacing",
    isEnabled: true,
    isHardRule: true,
    config: { minDays: 3 },
  };

  const merged = mergeEditableRulesWithProtectedRows({
    editableRules: [editable],
    existingRows: [baseRow],
  });

  assert.equal(merged.length, 2);
  assert.deepEqual(merged[1]?.config, baseRow.config);
  assert.equal(merged[1]?.id, baseRow.id);
  assert.equal(merged[1]?.createdBy, baseRow.created_by);
});
