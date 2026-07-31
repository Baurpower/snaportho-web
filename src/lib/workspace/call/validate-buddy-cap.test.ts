/**
 * #3 save-gate: validateBuddyCapRule flags interns over the buddy weekend cap, but
 * ONLY when CALL_POLICY_V2 is enabled (legacy save-gate byte-unchanged when off).
 * Run with: npx tsx src/lib/workspace/call/validate-buddy-cap.test.ts
 */
import assert from "node:assert/strict";
import { validateBuddyCapRule } from "@/lib/workspace/call/validation";

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.equal(cond, true, label);
  passed += 1;
}

function buddy(rosterId: string, dateKey: string) {
  return { rosterId, callType: "Buddy", callDate: dateKey };
}

// One intern with 3 buddy weekends; default cap is 2.
const input = {
  rules: [],
  residents: [{ rosterId: "intern", gradYear: 2031 }],
  assignments: [
    buddy("intern", "2026-08-01"),
    buddy("intern", "2026-08-08"),
    buddy("intern", "2026-08-15"),
    buddy("other", "2026-08-22"),
  ],
};

// Kill-switch (explicit opt-out) → no issues (legacy save-gate unchanged).
process.env.NEXT_PUBLIC_CALL_POLICY_V2 = "false";
ok("kill-switch → no cap issues", validateBuddyCapRule(input as never).length === 0);

// Default (engine on) → the 3rd (latest) buddy weekend is flagged.
delete process.env.NEXT_PUBLIC_CALL_POLICY_V2;
const issues = validateBuddyCapRule(input as never);
ok("flag on → exactly 1 cap issue", issues.length === 1);
ok("issue is on the latest date", issues[0].dateKey === "2026-08-15");
ok("issue is a hard error", issues[0].severity === "error");
ok("issue targets the intern", issues[0].rosterId === "intern");
ok("issue is Buddy call type", issues[0].callType === "Buddy");

console.log(`validate-buddy-cap.test.ts passed (${passed} assertions)`);
