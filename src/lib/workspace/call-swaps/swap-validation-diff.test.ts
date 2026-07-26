import assert from "node:assert/strict";
import type { CallValidationIssue } from "@/lib/workspace/call/validation";
import {
  callValidationErrorSignature,
  computeIntroducedHardViolations,
} from "@/lib/workspace/call-swaps/swap-call-rule-diff";

function issue(overrides: Partial<CallValidationIssue>): CallValidationIssue {
  return {
    code: "spacing_rule",
    severity: "error",
    message: "violation",
    source: "rule",
    slotId: null,
    residentId: null,
    rosterId: null,
    dateKey: null,
    callType: null,
    assignmentId: null,
    ruleCode: null,
    metadata: null,
    ...overrides,
  };
}

// Signature ignores message/slot but keys on code + resident + date + ruleCode.
assert.equal(
  callValidationErrorSignature(
    issue({ code: "time_off", rosterId: "r1", dateKey: "2026-07-04", ruleCode: "time_off", message: "A" })
  ),
  callValidationErrorSignature(
    issue({ code: "time_off", rosterId: "r1", dateKey: "2026-07-04", ruleCode: "time_off", message: "B" })
  ),
  "signature is stable across differing messages"
);

// A violation on the recipient introduced by the swap is flagged.
const before1 = [issue({ code: "spacing_rule", rosterId: "requester", dateKey: "2026-07-04" })];
const after1 = [issue({ code: "time_off", rosterId: "recipient", dateKey: "2026-07-04", ruleCode: "time_off" })];
const introduced1 = computeIntroducedHardViolations(before1, after1);
assert.equal(introduced1.length, 1, "recipient time-off violation is introduced");
assert.equal(introduced1[0].code, "time_off");

// A pre-existing violation present both before and after does NOT block.
const preExisting = issue({ code: "spacing_rule", rosterId: "someone", dateKey: "2026-07-20", ruleCode: "minimum_spacing" });
const before2 = [preExisting];
const after2 = [preExisting];
assert.equal(
  computeIntroducedHardViolations(before2, after2).length,
  0,
  "unrelated pre-existing violation does not count as introduced"
);

// Mixed: one carried-over + one new → only the new one is introduced.
const before3 = [preExisting];
const after3 = [
  preExisting,
  issue({ code: "monthly_load_target", rosterId: "recipient", dateKey: "2026-07-04", ruleCode: "monthly_load_target_by_pgy" }),
];
const introduced3 = computeIntroducedHardViolations(before3, after3);
assert.equal(introduced3.length, 1, "only the newly-introduced violation is returned");
assert.equal(introduced3[0].code, "monthly_load_target");

// A violation that disappears after the swap (requester loses the call) is not introduced.
const before4 = [issue({ code: "weekend_rule", rosterId: "requester", dateKey: "2026-07-04" })];
const after4: CallValidationIssue[] = [];
assert.equal(
  computeIntroducedHardViolations(before4, after4).length,
  0,
  "resolved violations are never treated as introduced"
);

console.log("swap-validation-diff.test.ts passed");
