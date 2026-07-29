/**
 * Tests for the policy runtime adapter — especially the picker eligibility that fixes
 * bug #2 (buddy picker must show the PGY-1 Gen-Ortho intern, not the PGY-5 Backup pool).
 * Run with: npx tsx src/lib/workspace/call/policy/policy-runtime.test.ts
 */
import assert from "node:assert/strict";
import type {
  DraftDayAssignment,
  ProgramCallSlotDefinition,
  ProgramRule,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import { makeEngineHelpers } from "@/lib/workspace/call/policy/policy-runtime";

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.equal(cond, true, label);
  passed += 1;
}

function resident(
  id: string,
  gradYear: number,
  rotations: Array<{ name: string; start: string; end: string }> = []
): ResidentOption {
  return {
    residentId: id,
    membershipId: id,
    displayName: id,
    trainingLevel: null,
    pgyYear: null,
    gradYear,
    rotationAssignments: rotations.map((r) => ({
      rotationId: r.name,
      rotationName: r.name,
      startDate: r.start,
      endDate: r.end,
    })),
  };
}

// AY 2026: 2031→PGY-1, 2030→PGY-2, 2028→PGY-4, 2027→PGY-5.
const internGO = resident("internGO", 2031, [
  { name: "Gen Ortho/Pager", start: "2026-08-01", end: "2026-08-31" },
]);
const internOther = resident("internOther", 2031, [
  { name: "SICU", start: "2026-08-01", end: "2026-08-31" },
]);
const pgy2 = resident("pgy2", 2030);
const pgy4 = resident("pgy4", 2028);
const pgy5 = resident("pgy5", 2027);
const residents = [internGO, internOther, pgy2, pgy4, pgy5];

function rule(
  id: string,
  rule_type: ProgramRule["rule_type"],
  config: ProgramRule["config"]
): ProgramRule {
  return { id, name: id, rule_type, is_enabled: true, is_hard_rule: true, config };
}
const rules: ProgramRule[] = [
  rule("pool1", "restrict_call_type_by_pgy", { restrictedPgyYears: [1], allowedCallTypes: ["Buddy"] }),
  rule("pool2", "restrict_call_type_by_pgy", { restrictedPgyYears: [2], allowedCallTypes: ["Primary"] }),
  rule("pool4", "restrict_call_type_by_pgy", { restrictedPgyYears: [4], allowedCallTypes: ["Primary"] }),
  rule("pool5", "restrict_call_type_by_pgy", { restrictedPgyYears: [5], allowedCallTypes: ["Backup"] }),
];

const slotDefs: ProgramCallSlotDefinition[] = [
  { id: "primary", label: "Primary", shortLabel: "1°", callType: "Primary", colorKey: "sky", requiredMode: "always", countsTowardWorkload: true, sortOrder: 1, requiredWhenVisible: true },
  { id: "buddy", label: "Buddy", shortLabel: "B°", callType: "Buddy", colorKey: "violet", requiredMode: "conditional", daysOfWeek: [5, 6], condition: { type: "when_pgy_scheduled", pgyYears: [4], sourceSlotCallTypes: ["Primary"] }, countsTowardWorkload: true, sortOrder: 2, requiredWhenVisible: false },
  { id: "backup", label: "Backup", shortLabel: "2°", callType: "Backup", colorKey: "emerald", requiredMode: "conditional", condition: { type: "when_pgy_scheduled", pgyYears: [1, 2], sourceSlotCallTypes: ["Primary"] }, countsTowardWorkload: true, sortOrder: 2, requiredWhenVisible: false },
];

// 2026-08-15 is a Saturday. Put a PGY-4 on Primary → Buddy present.
// 2026-08-04 is a Tuesday. Put a PGY-2 on Primary → Backup present.
const assignments: Record<string, DraftDayAssignment> = {
  "2026-08-15": { primaryRosterId: "pgy4", backupRosterId: null, buddyRosterId: null },
  "2026-08-04": { primaryRosterId: "pgy2", backupRosterId: null, buddyRosterId: null },
};

const engine = makeEngineHelpers({ rules, slotDefinitions: slotDefs, residents, assignments });

// ── #2: Buddy picker shows the Gen-Ortho intern, not PGY-5, not the off-service intern ──
const buddyCandidates = engine
  .selectableResidentsForSlot("Buddy", "2026-08-15", residents)
  .map((r) => r.residentId);
ok("buddy candidates = [internGO]", JSON.stringify(buddyCandidates) === JSON.stringify(["internGO"]));
ok("buddy list excludes PGY-5 (the old bug)", !buddyCandidates.includes("pgy5"));
ok("buddy list excludes off-service intern", !buddyCandidates.includes("internOther"));

// ── Backup: only PGY-5 ──
const backupCandidates = engine
  .selectableResidentsForSlot("Backup", "2026-08-04", residents)
  .map((r) => r.residentId);
ok("backup candidates = [pgy5]", JSON.stringify(backupCandidates) === JSON.stringify(["pgy5"]));

// ── Primary: PGY-2 and PGY-4, not interns or PGY-5 ──
const primaryCandidates = engine
  .selectableResidentsForSlot("Primary", "2026-08-04", residents)
  .map((r) => r.residentId);
ok("primary includes pgy2 and pgy4", primaryCandidates.includes("pgy2") && primaryCandidates.includes("pgy4"));
ok("primary excludes interns and pgy5", !primaryCandidates.includes("internGO") && !primaryCandidates.includes("pgy5"));

// ── presence ──
ok("Buddy present on Sat under PGY-4 primary", engine.presence("Buddy", "2026-08-15").present);
ok("Backup present under PGY-2 primary", engine.presence("Backup", "2026-08-04").present);
ok("Buddy not present on a Tuesday", !engine.presence("Buddy", "2026-08-04").present);

// ── isAllowed sanity ──
ok("internGO isAllowed Buddy", engine.isAllowed(internGO, "Buddy", "2026-08-15"));
ok("pgy5 NOT allowed Buddy", !engine.isAllowed(pgy5, "Buddy", "2026-08-15"));

console.log(`policy-runtime.test.ts passed (${passed} assertions)`);
