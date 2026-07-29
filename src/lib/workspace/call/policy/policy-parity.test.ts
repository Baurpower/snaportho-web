/**
 * Golden parity test: the new policy engine's hard eligibility (evaluateSlot.eligible)
 * must equal today's evaluateResidentForSlot(...).allowed for every (resident, slot,
 * date) across a month grid, on a rich rule set exercising every constraint branch.
 * This is the gate that lets Phase 2 point consumers at the engine without behavior
 * change. Run with:
 *   npx tsx src/lib/workspace/call/policy/policy-parity.test.ts
 */
import assert from "node:assert/strict";
import type {
  CallType,
  DraftDayAssignment,
  ProgramCallSlotDefinition,
  ProgramRule,
  ResidentAvailabilityForDate,
  ResidentAvailabilityMap,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import { evaluateResidentForSlot } from "@/components/workspace/call/programcallevaluator";
import { buildSchedulingContext } from "@/lib/workspace/call/policy/context";
import { compilePolicy } from "@/lib/workspace/call/policy/compile";
import { evaluateSlot } from "@/lib/workspace/call/policy/evaluator";

// ── Fixtures ──────────────────────────────────────────────────────────────

function resident(
  id: string,
  gradYear: number,
  rotations: Array<{ name: string; id: string; start: string; end: string }> = []
): ResidentOption {
  return {
    residentId: id,
    membershipId: id,
    displayName: id,
    trainingLevel: null,
    pgyYear: null,
    gradYear,
    rotationAssignments: rotations.map((r) => ({
      rotationId: r.id,
      rotationName: r.name,
      startDate: r.start,
      endDate: r.end,
    })),
  };
}

const ROT_X = "rot-oncology";

// AY 2026: 2031→PGY-1, 2030→PGY-2, 2029→PGY-3, 2028→PGY-4, 2027→PGY-5.
const residents: ResidentOption[] = [
  resident("intern", 2031, [
    { name: "Gen Ortho/Pager", id: "rot-go", start: "2026-08-01", end: "2026-08-31" },
  ]),
  resident("pgy2a", 2030),
  resident("pgy2b", 2030),
  resident("pgy3", 2029, [{ name: "Oncology", id: ROT_X, start: "2026-08-01", end: "2026-08-31" }]),
  resident("pgy4", 2028),
  resident("pgy5", 2027),
];

function r(
  id: string,
  rule_type: ProgramRule["rule_type"],
  config: ProgramRule["config"],
  is_hard_rule = true
): ProgramRule {
  return { id, name: id, rule_type, is_enabled: true, is_hard_rule, config };
}

const rules: ProgramRule[] = [
  // PGY call pools (hard)
  r("pool1", "restrict_call_type_by_pgy", { restrictedPgyYears: [1], allowedCallTypes: ["Buddy"] }),
  r("pool2", "restrict_call_type_by_pgy", { restrictedPgyYears: [2], allowedCallTypes: ["Primary"] }),
  r("pool3", "restrict_call_type_by_pgy", { restrictedPgyYears: [3], allowedCallTypes: ["Primary"] }),
  r("pool4", "restrict_call_type_by_pgy", { restrictedPgyYears: [4], allowedCallTypes: ["Primary"] }),
  r("pool5", "restrict_call_type_by_pgy", { restrictedPgyYears: [5], allowedCallTypes: ["Backup"] }),
  // Spacing (soft), monthly + weekend caps (hard)
  r("spacing", "min_days_between_assignments", { minDays: 3, excludeAdjacentWeekendPairing: true }, false),
  r("maxmonth", "max_calls_per_month", { maxCalls: 8 }),
  r("maxwknd", "max_weekends_per_month", { maxWeekends: 2 }),
  // Load targets (soft) with hard max
  r("load2", "monthly_load_target_by_pgy", { targetPgyYears: [2], targetCallType: "Primary", targetMinCalls: 3, targetMaxCalls: 7, targetHardMaxCalls: 9 }, false),
  // Rotation restriction (hard) + rotation call limit (hard)
  r("rotrestrict", "restrict_call_by_rotation", { rotationIds: [ROT_X], blockAllCall: true, restrictedCallTypes: ["Primary", "Backup"] }),
  r("rotlimit", "max_calls_for_rotation", { rotationCallLimitIds: [ROT_X], rotationCallLimitMax: 1, rotationCallLimitPeriod: "month", rotationCallLimitDayScope: "weekend_only", rotationCallLimitCallTypes: ["Primary"] }),
  // Weekend pairing (hard) + day-of-week preference (soft)
  r("wkndpair", "weekend_pairing", { sameResidentForWeekend: true }),
  r("dowpref", "day_of_week_preference", { preferenceCallTypes: ["Primary"], preferenceDaysOfWeek: [2, 4] }, false),
];

const slotDefs: ProgramCallSlotDefinition[] = [
  { id: "primary", label: "Primary", shortLabel: "1°", callType: "Primary", colorKey: "sky", requiredMode: "always", countsTowardWorkload: true, sortOrder: 1, requiredWhenVisible: true },
  { id: "buddy", label: "Buddy", shortLabel: "B°", callType: "Buddy", colorKey: "violet", requiredMode: "conditional", daysOfWeek: [5, 6], condition: { type: "when_pgy_scheduled", pgyYears: [4], sourceSlotCallTypes: ["Primary"] }, countsTowardWorkload: true, sortOrder: 2, requiredWhenVisible: false },
  { id: "backup", label: "Backup", shortLabel: "2°", callType: "Backup", colorKey: "emerald", requiredMode: "conditional", condition: { type: "when_pgy_scheduled", pgyYears: [1, 2], sourceSlotCallTypes: ["Primary"] }, countsTowardWorkload: true, sortOrder: 2, requiredWhenVisible: false },
];

// Partial assignments to exercise spacing / weekend / load / pairing counts.
const assignments: Record<string, DraftDayAssignment> = {
  "2026-08-01": { primaryRosterId: "pgy2a", backupRosterId: "pgy5", buddyRosterId: null }, // Sat
  "2026-08-02": { primaryRosterId: "pgy2a", backupRosterId: null, buddyRosterId: null }, // Sun
  "2026-08-04": { primaryRosterId: "pgy2b", backupRosterId: null, buddyRosterId: null }, // Tue
  "2026-08-08": { primaryRosterId: "pgy4", backupRosterId: null, buddyRosterId: "intern" }, // Fri
  "2026-08-09": { primaryRosterId: "pgy3", backupRosterId: null, buddyRosterId: null }, // Sat (pgy3 on ROT_X)
};

// Availability: pgy3 is on the restricted rotation every day; intern has approved +
// requested time off on two days.
function availabilityDay(
  residentId: string,
  dateKey: string,
  opts: Partial<ResidentAvailabilityForDate>
): ResidentAvailabilityForDate {
  return {
    residentId,
    membershipId: residentId,
    dateKey,
    isBlocked: false,
    isWarning: false,
    timeOffConflicts: [],
    rotationConflicts: [],
    flags: [],
    ...opts,
  };
}

const availabilityByResident: ResidentAvailabilityMap = {};
function monthDates(): string[] {
  const days: string[] = [];
  for (let d = 1; d <= 28; d++) days.push(`2026-08-${String(d).padStart(2, "0")}`);
  return days;
}
for (const dateKey of monthDates()) {
  availabilityByResident.pgy3 ??= {};
  availabilityByResident.pgy3[dateKey] = availabilityDay("pgy3", dateKey, {
    rotationConflicts: [{ rotationId: ROT_X, rotationName: "Oncology" }],
  });
}
availabilityByResident.intern ??= {};
availabilityByResident.intern["2026-08-15"] = availabilityDay("intern", "2026-08-15", {
  timeOffConflicts: [
    { eventId: "e1", title: "Vacation", type: "vacation", usingPto: true, startDate: "2026-08-15", endDate: "2026-08-15", approvalStatus: "approved" },
  ],
});
availabilityByResident.intern["2026-08-22"] = availabilityDay("intern", "2026-08-22", {
  timeOffConflicts: [
    { eventId: "e2", title: "Conf", type: "conference", usingPto: false, startDate: "2026-08-22", endDate: "2026-08-22", approvalStatus: "requested" },
  ],
});

// ── Parity sweep ──────────────────────────────────────────────────────────

const policy = compilePolicy(rules, slotDefs);
const ctx = buildSchedulingContext({ residents, availability: availabilityByResident, assignments });

const slots: CallType[] = ["Primary", "Backup", "Buddy"];
let checks = 0;
const mismatches: string[] = [];

for (const dateKey of monthDates()) {
  for (const res of residents) {
    for (const slot of slots) {
      const old = evaluateResidentForSlot({
        resident: res,
        slot,
        dateKey,
        assignments,
        rules,
        availabilityByResident,
      }).allowed;
      const next = evaluateSlot({
        resident: res,
        slot,
        dateKey,
        ctx,
        policy,
        assignments,
        availabilityByResident,
      }).eligible;
      checks += 1;
      if (old !== next) {
        mismatches.push(`${dateKey} ${res.residentId} ${slot}: old.allowed=${old} new.eligible=${next}`);
      }
    }
  }
}

if (mismatches.length > 0) {
  console.error(`PARITY MISMATCHES (${mismatches.length}/${checks}):`);
  for (const m of mismatches.slice(0, 25)) console.error("  " + m);
}
assert.equal(mismatches.length, 0, `${mismatches.length} eligibility mismatches vs evaluateResidentForSlot`);

// Sanity: the sweep actually exercised both true and false outcomes.
let anyEligible = false;
let anyBlocked = false;
for (const dateKey of monthDates()) {
  for (const res of residents) {
    for (const slot of slots) {
      const e = evaluateSlot({ resident: res, slot, dateKey, ctx, policy, assignments, availabilityByResident }).eligible;
      anyEligible ||= e;
      anyBlocked ||= !e;
    }
  }
}
assert.equal(anyEligible && anyBlocked, true, "sweep should include both eligible and blocked outcomes");

console.log(`policy-parity.test.ts passed (${checks} eligibility checks, 0 mismatches)`);
