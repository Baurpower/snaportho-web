import assert from "node:assert/strict";
import type { ProgramRule } from "@/components/workspace/call/programcalltypes";
import { validateRotationCallLimitRule } from "@/lib/workspace/call/validation";
import {
  evaluateRotationCallLimitForResident,
  parseRotationCallLimitConfig,
  rotationCallLimitCallTypeApplies,
  rotationCallLimitDayScopeApplies,
} from "@/lib/workspace/call/rule-evaluator";

// --- Shared config parser: defaults and normalization ---

const defaults = parseRotationCallLimitConfig({});
assert.deepEqual([...defaults.limitRotationIds], [], "no rotation ids by default");
assert.equal(defaults.dayScope, "all", "day scope defaults to all");
assert.deepEqual(defaults.limitCallTypes, ["Primary"], "call types default to Primary");
assert.equal(defaults.maxCallDays, 1, "max defaults to 1");

const parsed = parseRotationCallLimitConfig({
  rotationCallLimitIds: ["  rot-onc  ", "", 42],
  rotationCallLimitDayScope: "weekend_only",
  rotationCallLimitCallTypes: ["Primary", "Backup"],
  rotationCallLimitMax: 2,
});
assert.deepEqual(
  [...parsed.limitRotationIds],
  ["rot-onc"],
  "rotation ids are trimmed and non-strings dropped"
);
assert.equal(parsed.dayScope, "weekend_only");
assert.equal(parsed.maxCallDays, 2);

assert.equal(parseRotationCallLimitConfig({ rotationCallLimitDayScope: "bogus" }).dayScope, "all");

// --- Shared predicates ---

assert.ok(rotationCallLimitCallTypeApplies(["Primary"], "Primary"));
assert.ok(rotationCallLimitCallTypeApplies(["primary"], "Primary"), "case-insensitive");
assert.ok(rotationCallLimitCallTypeApplies(["any"], "Buddy"), "any matches all");
assert.equal(rotationCallLimitCallTypeApplies(["Primary"], "Backup"), false);

assert.ok(rotationCallLimitDayScopeApplies("all", true));
assert.ok(rotationCallLimitDayScopeApplies("all", false));
assert.ok(rotationCallLimitDayScopeApplies("weekend_only", true));
assert.equal(rotationCallLimitDayScopeApplies("weekend_only", false), false);
assert.ok(rotationCallLimitDayScopeApplies("weekday_only", false));
assert.equal(rotationCallLimitDayScopeApplies("weekday_only", true), false);

// --- Generator's incremental evaluator (parity uses the same helpers) ---

const oncWeekendPrimaryMax1 = {
  id: "onc-weekend-primary-max-1",
  name: "Oncology: 1 weekend Primary/month",
  rule_type: "max_calls_for_rotation",
  is_enabled: true,
  is_hard_rule: false,
  config: {
    rotationCallLimitIds: ["rot-onc"],
    rotationCallLimitDayScope: "weekend_only",
    rotationCallLimitCallTypes: ["Primary"],
    rotationCallLimitMax: 1,
  },
} as ProgramRule;

// Projected 2 weekend Primary days > max 1 → violation.
const evalOver = evaluateRotationCallLimitForResident({
  rotationIds: ["rot-onc"],
  isWeekendDate: true,
  weekendCallDays: 2,
  weekdayCallDays: 0,
  totalCallDays: 2,
  callType: "Primary",
  rules: [oncWeekendPrimaryMax1],
});
assert.equal(evalOver.length, 1, "evaluator fires when projected weekend count exceeds max");

// Projected 1 weekend Primary day == max 1 → no violation.
const evalAtCap = evaluateRotationCallLimitForResident({
  rotationIds: ["rot-onc"],
  isWeekendDate: true,
  weekendCallDays: 1,
  weekdayCallDays: 0,
  totalCallDays: 1,
  callType: "Primary",
  rules: [oncWeekendPrimaryMax1],
});
assert.equal(evalAtCap.length, 0, "evaluator does not fire at the cap");

// --- Batch validator (must agree with the evaluator via the shared helpers) ---

const residents = [
  {
    rosterId: "r-onc",
    residentId: "r-onc",
    residentName: "Onc Resident",
    displayName: "Onc Resident",
    gradYear: 2029,
    pgyYear: 3,
  },
];

const rotations = [
  {
    rotationId: "rot-onc",
    rosterId: "r-onc",
    residentId: "r-onc",
    rotationName: "Oncology",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  },
];

function validateRotationLimit(
  assignments: Array<{
    callId: string;
    rosterId: string;
    residentId: string;
    callDate: string;
    callType: "Primary" | "Backup";
  }>
) {
  return validateRotationCallLimitRule({
    assignments,
    rules: [oncWeekendPrimaryMax1],
    residents,
    rotations,
    timeOff: [],
  });
}

// 2026-07-04 (Sat) and 2026-07-11 (Sat) → 2 weekend Primary days > max 1.
const overLimit = validateRotationLimit([
  { callId: "s1", rosterId: "r-onc", residentId: "r-onc", callDate: "2026-07-04", callType: "Primary" },
  { callId: "s2", rosterId: "r-onc", residentId: "r-onc", callDate: "2026-07-11", callType: "Primary" },
]);
assert.equal(
  overLimit.length,
  2,
  "validator flags each over-limit weekend Primary assignment"
);
assert.ok(overLimit.every((i) => i.code === "rotation_call_limit"));

// One weekend Primary → within limit.
const atCap = validateRotationLimit([
  { callId: "s1", rosterId: "r-onc", residentId: "r-onc", callDate: "2026-07-04", callType: "Primary" },
]);
assert.equal(atCap.length, 0, "validator allows a single weekend Primary at the cap");

// Weekday Primary calls are ignored under weekend_only scope.
const weekdayIgnored = validateRotationLimit([
  { callId: "w1", rosterId: "r-onc", residentId: "r-onc", callDate: "2026-07-06", callType: "Primary" },
  { callId: "w2", rosterId: "r-onc", residentId: "r-onc", callDate: "2026-07-07", callType: "Primary" },
]);
assert.equal(weekdayIgnored.length, 0, "weekday calls do not count under weekend_only scope");

// Backup calls are ignored when the rule targets Primary only.
const backupIgnored = validateRotationLimit([
  { callId: "b1", rosterId: "r-onc", residentId: "r-onc", callDate: "2026-07-04", callType: "Backup" },
  { callId: "b2", rosterId: "r-onc", residentId: "r-onc", callDate: "2026-07-11", callType: "Backup" },
]);
assert.equal(backupIgnored.length, 0, "Backup calls ignored when rule targets Primary only");

console.log("rotation-call-limit.test.ts passed");
