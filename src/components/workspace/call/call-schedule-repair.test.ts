/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import type {
  CalendarDay,
  DraftDayAssignment,
  ProgramRule,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import { repairCallSchedule } from "@/components/workspace/call/programcallautogenerator";
import { evaluateResidentForSlot } from "@/components/workspace/call/programcallevaluator";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function makeDay(dateKey: string): CalendarDay {
  const date = new Date(`${dateKey}T00:00:00`);
  const dow = date.getDay();
  return {
    date,
    key: dateKey,
    dayNumber: date.getDate(),
    dayName: DAY_NAMES[dow],
    isWeekend: dow === 0 || dow === 6,
  };
}

function makeResident(id: string, pgy: number): ResidentOption {
  return {
    residentId: id,
    rosterId: id,
    membershipId: id,
    displayName: id,
    trainingLevel: `PGY-${pgy}`,
    pgyYear: pgy,
    gradYear: null,
    rotationAssignments: [],
  };
}

function timeOff(): any {
  return {
    flags: [],
    timeOffConflicts: [{ approvalStatus: "approved", title: "Vacation" }],
    rotationConflicts: [],
  };
}

function assertNoHardViolations(
  assignments: Record<string, DraftDayAssignment>,
  monthKeys: string[],
  residents: ResidentOption[],
  rules: ProgramRule[],
  availabilityByResident: any
) {
  for (const key of monthKeys) {
    const a = assignments[key];
    for (const [slot, roster] of [
      ["Primary", a?.primaryRosterId],
      ["Backup", a?.backupRosterId],
    ] as Array<["Primary" | "Backup", string | null | undefined]>) {
      if (!roster) continue;
      const resident = residents.find((r) => r.residentId === roster)!;
      const evaluation = evaluateResidentForSlot({
        resident,
        slot,
        dateKey: key,
        assignments,
        rules,
        availabilityByResident,
      });
      assert.equal(
        evaluation.blocked,
        false,
        `no hard violation after repair (${roster} ${slot} ${key})`
      );
    }
  }
}

// --- 1. Direct fill of open required Primary slots ---
{
  const monthKeys = ["2026-07-06", "2026-07-07", "2026-07-08"];
  const monthDays = monthKeys.map(makeDay);
  const residents = [makeResident("R1", 3), makeResident("R2", 3), makeResident("R3", 3)];
  const start: Record<string, DraftDayAssignment> = {
    "2026-07-06": { primaryRosterId: "R1", backupRosterId: null, buddyRosterId: null },
    "2026-07-07": { primaryRosterId: null, backupRosterId: null, buddyRosterId: null },
    "2026-07-08": { primaryRosterId: null, backupRosterId: null, buddyRosterId: null },
  };
  const result = repairCallSchedule({
    assignments: start,
    monthDays,
    residents,
    rules: [],
    availabilityByResident: {},
    historicalStats: [],
    slotMode: "Primary",
    seed: 1,
  });
  assert.equal(result.feasible, true, "direct fill reaches feasibility");
  assert.ok(result.filledSlots >= 2, "filled the two open Primary slots");
  for (const key of monthKeys) {
    assert.ok(result.assignments[key]?.primaryRosterId, `Primary filled on ${key}`);
  }
  assertNoHardViolations(result.assignments, monthKeys, residents, [], {});
}

// --- 2. Swap-to-unstick: an open slot only fillable by freeing someone elsewhere ---
{
  // Hard spacing rule: no calls on adjacent days.
  const spacingRule = {
    id: "spacing",
    name: "No consecutive call",
    rule_type: "min_days_between_assignments",
    is_enabled: true,
    is_hard_rule: true,
    config: { minDays: 1 },
  } as ProgramRule;

  const monthKeys = ["2026-07-01", "2026-07-02", "2026-07-03"];
  const monthDays = monthKeys.map(makeDay);
  const residents = [makeResident("R1", 3), makeResident("R2", 3), makeResident("R3", 3)];
  // R3 is on approved time-off on the open day (2026-07-02).
  const availabilityByResident: any = { R3: { "2026-07-02": timeOff() } };

  // 07-02 is open; its only non-time-off candidates (R1, R2) are both spacing-
  // blocked (R1 on 07-01, R2 on 07-03). Only a swap can fill it.
  const start: Record<string, DraftDayAssignment> = {
    "2026-07-01": { primaryRosterId: "R1", backupRosterId: null, buddyRosterId: null },
    "2026-07-02": { primaryRosterId: null, backupRosterId: null, buddyRosterId: null },
    "2026-07-03": { primaryRosterId: "R2", backupRosterId: null, buddyRosterId: null },
  };

  const rules = [spacingRule];
  const result = repairCallSchedule({
    assignments: start,
    monthDays,
    residents,
    rules,
    availabilityByResident,
    historicalStats: [],
    slotMode: "Primary",
    seed: 3,
  });

  assert.equal(result.feasible, true, "swap-to-unstick reaches feasibility");
  assert.ok(result.swapUnsticks >= 1, "used at least one swap-to-unstick");
  assert.ok(result.assignments["2026-07-02"]?.primaryRosterId, "the stuck slot got filled");
  assertNoHardViolations(result.assignments, monthKeys, residents, rules, availabilityByResident);
}

// --- 3. Genuine infeasibility is reported, not silently ignored ---
{
  const monthKeys = ["2026-07-01"];
  const monthDays = monthKeys.map(makeDay);
  const residents = [makeResident("R1", 3)];
  const availabilityByResident: any = { R1: { "2026-07-01": timeOff() } };
  const start: Record<string, DraftDayAssignment> = {
    "2026-07-01": { primaryRosterId: null, backupRosterId: null, buddyRosterId: null },
  };
  const result = repairCallSchedule({
    assignments: start,
    monthDays,
    residents,
    rules: [],
    availabilityByResident,
    historicalStats: [],
    slotMode: "Primary",
    seed: 1,
  });
  assert.equal(result.feasible, false, "reports infeasible when no arrangement works");
  assert.equal(result.infeasibleSlots.length, 1);
  assert.equal(result.infeasibleSlots[0].dateKey, "2026-07-01");
  assert.equal(result.infeasibleSlots[0].slot, "Primary");
  assert.match(result.infeasibleSlots[0].reason, /No eligible resident/);
  // Never fabricates a violating assignment.
  assert.equal(result.assignments["2026-07-01"]?.primaryRosterId ?? null, null);
}

// --- 4. Hard-violating occupants are purged and refilled ---
{
  const monthKeys = ["2026-07-01"];
  const monthDays = monthKeys.map(makeDay);
  const residents = [makeResident("R1", 3), makeResident("R2", 3)];
  // R1 is on time-off but was (wrongly) assigned on 07-01.
  const availabilityByResident: any = { R1: { "2026-07-01": timeOff() } };
  const start: Record<string, DraftDayAssignment> = {
    "2026-07-01": { primaryRosterId: "R1", backupRosterId: null, buddyRosterId: null },
  };
  const result = repairCallSchedule({
    assignments: start,
    monthDays,
    residents,
    rules: [],
    availabilityByResident,
    historicalStats: [],
    slotMode: "Primary",
    seed: 1,
  });
  assert.equal(result.purgedViolations, 1, "purged the time-off violation");
  assert.equal(result.feasible, true, "refilled after purge");
  assert.equal(result.assignments["2026-07-01"]?.primaryRosterId, "R2", "refilled with an eligible resident");
  assertNoHardViolations(result.assignments, monthKeys, residents, [], availabilityByResident);
}

// --- 5. Already-complete feasible schedule is a no-op ---
{
  const monthKeys = ["2026-07-06", "2026-07-07"];
  const monthDays = monthKeys.map(makeDay);
  const residents = [makeResident("R1", 3), makeResident("R2", 3)];
  const start: Record<string, DraftDayAssignment> = {
    "2026-07-06": { primaryRosterId: "R1", backupRosterId: null, buddyRosterId: null },
    "2026-07-07": { primaryRosterId: "R2", backupRosterId: null, buddyRosterId: null },
  };
  const result = repairCallSchedule({
    assignments: start,
    monthDays,
    residents,
    rules: [],
    availabilityByResident: {},
    historicalStats: [],
    slotMode: "Primary",
    seed: 1,
  });
  assert.equal(result.feasible, true);
  assert.equal(result.filledSlots, 0, "no fills needed");
  assert.equal(result.purgedViolations, 0, "no purges needed");
  assert.equal(result.swapUnsticks, 0, "no swaps needed");
}

// --- 6. Deterministic ---
{
  const monthKeys = ["2026-07-06", "2026-07-07", "2026-07-08"];
  const monthDays = monthKeys.map(makeDay);
  const residents = [makeResident("R1", 3), makeResident("R2", 3), makeResident("R3", 3)];
  const start = (): Record<string, DraftDayAssignment> => ({
    "2026-07-06": { primaryRosterId: null, backupRosterId: null, buddyRosterId: null },
    "2026-07-07": { primaryRosterId: null, backupRosterId: null, buddyRosterId: null },
    "2026-07-08": { primaryRosterId: null, backupRosterId: null, buddyRosterId: null },
  });
  const base = {
    monthDays,
    residents,
    rules: [],
    availabilityByResident: {},
    historicalStats: [],
    slotMode: "Primary" as const,
    seed: 77,
  };
  const a = repairCallSchedule({ ...base, assignments: start() });
  const b = repairCallSchedule({ ...base, assignments: start() });
  assert.deepEqual(a.assignments, b.assignments, "same seed → identical repair");
}

console.log("call-schedule-repair.test.ts passed");
