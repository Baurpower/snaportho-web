/**
 * #3 fix: buddy hard cap enforcement. computeBuddyCapTrim returns the excess buddy
 * days beyond the per-intern cap (earliest kept). Run with:
 *   npx tsx src/components/workspace/call/call-buddy-cap.test.ts
 */
import assert from "node:assert/strict";
import type { DraftDayAssignment } from "@/components/workspace/call/programcalltypes";
import { computeBuddyCapTrim } from "@/components/workspace/call/programcallautogenerator";

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.equal(cond, true, label);
  passed += 1;
}

function buddy(rosterId: string | null): DraftDayAssignment {
  return { primaryRosterId: "pgy4", backupRosterId: null, buddyRosterId: rosterId };
}

// Intern assigned buddy on 4 weekends; cap 2 → trim the 2 latest, keep earliest 2.
const assignments: Record<string, DraftDayAssignment> = {
  "2026-08-01": buddy("intern"),
  "2026-08-08": buddy("intern"),
  "2026-08-15": buddy("intern"),
  "2026-08-22": buddy("intern"),
  "2026-08-29": buddy(null),
};

const trim = computeBuddyCapTrim(assignments, 2);
const trimmed = trim.map((t) => t.dateKey).sort();
ok("trims exactly 2 buddy days", trim.length === 2);
ok(
  "keeps earliest two (2026-08-01, 08), trims 15 & 22",
  JSON.stringify(trimmed) === JSON.stringify(["2026-08-15", "2026-08-22"])
);
ok("all trimmed belong to the intern", trim.every((t) => t.rosterId === "intern"));

// Under cap → no trim.
ok("no trim at exactly the cap", computeBuddyCapTrim({ a: buddy("x"), b: buddy("x") }, 2).length === 0);
ok("no trim below the cap", computeBuddyCapTrim({ a: buddy("x") }, 2).length === 0);

// Two interns each over cap are trimmed independently.
const two: Record<string, DraftDayAssignment> = {
  d1: buddy("i1"), d2: buddy("i1"), d3: buddy("i1"),
  d4: buddy("i2"), d5: buddy("i2"), d6: buddy("i2"),
};
const trimTwo = computeBuddyCapTrim(two, 2);
ok("two interns over cap → 1 trimmed each = 2 total", trimTwo.length === 2);
ok("one from each intern", new Set(trimTwo.map((t) => t.rosterId)).size === 2);

// Cap 0 → trim all buddy days.
ok("cap 0 trims everything", computeBuddyCapTrim({ a: buddy("x"), b: buddy("x") }, 0).length === 2);

console.log(`call-buddy-cap.test.ts passed (${passed} assertions)`);
