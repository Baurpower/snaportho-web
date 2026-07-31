/**
 * Phase 4 consistency: the save-gate (validatePgyRestrictionRule) must agree with the
 * picker/generator once CALL_POLICY_V2 is the default — i.e. a 2nd-ortho-month intern on
 * Primary is NOT a PGY violation (grey-zone progression), while genuinely ineligible
 * residents still are. Kill-switch restores legacy behavior.
 * Run with: npx tsx src/lib/workspace/call/validate-greyzone-consistency.test.ts
 */
import assert from "node:assert/strict";
import { validatePgyRestrictionRule } from "@/lib/workspace/call/validation";

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.equal(cond, true, label);
  passed += 1;
}

const rules = [
  { ruleType: "call_slot_definition", isEnabled: true, isHardRule: false, config: { slotCallType: "Primary", slotLabel: "Primary", slotRequiredMode: "always", slotRequiredWhenVisible: true, slotSortOrder: 1 } },
  { ruleType: "restrict_call_type_by_pgy", isEnabled: true, isHardRule: true, config: { restrictedPgyYears: [1], allowedCallTypes: ["Buddy"] } },
  { ruleType: "restrict_call_type_by_pgy", isEnabled: true, isHardRule: true, config: { restrictedPgyYears: [2], allowedCallTypes: ["Primary"] } },
  { ruleType: "restrict_call_type_by_pgy", isEnabled: true, isHardRule: true, config: { restrictedPgyYears: [5], allowedCallTypes: ["Backup"] } },
  { ruleType: "buddy_requirement", isEnabled: true, isHardRule: true, config: { eligibleRotationNameTokens: ["genortho", "pager"], eligibleServiceMonthIndices: [1], internPrimaryFromServiceMonthIndex: 2, partnerPgyYears: [4, 5] } },
];

// Intern: Gen Ortho Aug (1st) + Oct (2nd). PGY-5 senior.
const residents = [
  { rosterId: "intern", gradYear: 2031 },
  { rosterId: "senior", gradYear: 2027 },
];
const rotations = [
  { rosterId: "intern", rotationName: "Gen Ortho/Pager", startDate: "2026-08-01", endDate: "2026-08-31" },
  { rosterId: "intern", rotationName: "Gen Ortho/Pager", startDate: "2026-10-01", endDate: "2026-10-31" },
];

function primaryOn(rosterId: string, dateKey: string) {
  return { rosterId, callType: "Primary", callDate: dateKey };
}

function issuesFor(assignments: Array<{ rosterId: string; callType: string; callDate: string }>) {
  return validatePgyRestrictionRule({ rules, residents, rotations, assignments } as never)
    .map((i) => `${i.rosterId}@${i.dateKey}`);
}

// ── Engine on (default) ──
delete process.env.NEXT_PUBLIC_CALL_POLICY_V2;

ok(
  "intern on Primary in 2nd ortho month (Oct) is NOT flagged [#4 save-gate]",
  issuesFor([primaryOn("intern", "2026-10-06")]).length === 0
);
ok(
  "intern on Primary in 1st ortho month (Aug) IS flagged (not yet eligible)",
  issuesFor([primaryOn("intern", "2026-08-04")]).includes("intern@2026-08-04")
);
ok(
  "PGY-5 on Primary IS flagged (never Primary-eligible)",
  issuesFor([primaryOn("senior", "2026-10-06")]).includes("senior@2026-10-06")
);

// ── Kill-switch → legacy behavior (2nd-month intern flagged again) ──
process.env.NEXT_PUBLIC_CALL_POLICY_V2 = "false";
ok(
  "kill-switch: intern 2nd-month Primary IS flagged (legacy pool)",
  issuesFor([primaryOn("intern", "2026-10-06")]).includes("intern@2026-10-06")
);
delete process.env.NEXT_PUBLIC_CALL_POLICY_V2;

console.log(`validate-greyzone-consistency.test.ts passed (${passed} assertions)`);
