import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRuleForSave, sanitizeRuleConfig } from "./rule-definitions.ts";

const persistedBuddyConfig = {
  requiredDaysPerMonth: 2,
  allowedDaysOfWeek: [5, 6],
  buddyPgyYears: [1],
  partnerPgyYear: 4,
  partnerPgyYears: [4, 5],
  eligibleRotationNameTokens: ["genortho", "pager"],
  eligibleServiceMonthIndices: [1],
  internPrimaryFromServiceMonthIndex: 2,
};

test("buddy requirement is a canonical, saveable rule type", () => {
  const normalized = normalizeRuleForSave({
    type: "buddy_requirement",
    name: "Buddy requirement (grey-zone)",
    enabled: true,
    isHardRule: true,
    config: persistedBuddyConfig,
  });

  assert.equal(normalized.type, "buddy_requirement");
  assert.deepEqual(normalized.config, persistedBuddyConfig);
});

test("buddy sanitizer retains policy-engine fields and rejects unsafe values", () => {
  const sanitized = sanitizeRuleConfig("buddy_requirement", {
    ...persistedBuddyConfig,
    requiredDaysPerMonth: -2,
    allowedDaysOfWeek: [5, 7, 6, 5],
    partnerPgyYears: [5, 4, 9],
    eligibleServiceMonthIndices: [2, 1, 0, -1, 2],
  });

  assert.equal(sanitized.requiredDaysPerMonth, 0);
  assert.deepEqual(sanitized.allowedDaysOfWeek, [5, 6]);
  assert.deepEqual(sanitized.partnerPgyYears, [4, 5]);
  assert.deepEqual(sanitized.eligibleServiceMonthIndices, [1, 2]);
  assert.equal(sanitized.internPrimaryFromServiceMonthIndex, 2);
});

test("slot sanitizer preserves registered Backup fallback fields", () => {
  const sanitized = sanitizeRuleConfig("call_slot_definition", {
    slotLabel: "Backup",
    slotShortLabel: "2°",
    slotCallType: "Backup",
    slotColorKey: "emerald",
    slotRequiredMode: "conditional",
    slotCountsTowardWorkload: true,
    slotRequiredWhenVisible: false,
    slotFallbackPgyYears: [4],
    slotFallbackLabel: "Fallback: PGY-4 covering",
  });

  assert.deepEqual(sanitized.slotFallbackPgyYears, [4]);
  assert.equal(sanitized.slotFallbackLabel, "Fallback: PGY-4 covering");
});
