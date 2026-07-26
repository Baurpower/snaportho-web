/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import type {
  CalendarDay,
  DraftDayAssignment,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import {
  generateCallSchedule,
  optimizeCallSchedule,
} from "@/components/workspace/call/programcallautogenerator";
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

function availabilityDay(overrides: Record<string, unknown> = {}) {
  return {
    flags: [],
    timeOffConflicts: [],
    rotationConflicts: [],
    ...overrides,
  };
}

const monthDayKeys = [
  "2026-07-01",
  "2026-07-02",
  "2026-07-03",
  "2026-07-04",
  "2026-07-05",
  "2026-07-06",
  "2026-07-07",
  "2026-07-08",
  "2026-07-09",
  "2026-07-10",
  "2026-07-11",
  "2026-07-12",
];
const monthDays = monthDayKeys.map(makeDay);

const residents = [
  makeResident("R1", 3),
  makeResident("R2", 3),
  makeResident("R3", 3),
  makeResident("R4", 3),
  makeResident("R5", 3),
  makeResident("R6", 3),
];

// R3 has approved time-off on 2026-07-07 (a hard block). The starting schedule
// never places R3 there, so the start is feasible; the optimizer must keep it so.
const availabilityByResident: any = {
  R3: {
    "2026-07-07": availabilityDay({
      timeOffConflicts: [{ approvalStatus: "approved", title: "Vacation" }],
    }),
  },
};

// Deliberately unbalanced feasible start: R1 takes every Primary, R2 every
// Backup, except 2026-07-10 which is a frozen buddy day (R5 Primary / R6 Buddy).
function buildStartAssignments(): Record<string, DraftDayAssignment> {
  const assignments: Record<string, DraftDayAssignment> = {};
  for (const key of monthDayKeys) {
    if (key === "2026-07-10") {
      assignments[key] = {
        primaryRosterId: "R5",
        backupRosterId: null,
        buddyRosterId: "R6",
      };
    } else {
      assignments[key] = {
        primaryRosterId: "R1",
        backupRosterId: "R2",
        buddyRosterId: null,
      };
    }
  }
  return assignments;
}

const baseParams = {
  monthDays,
  residents,
  rules: [],
  availabilityByResident,
  historicalStats: [],
  maxIterations: 6000,
};

// --- 1. Improves the fairness objective on an unbalanced start ---
const run = optimizeCallSchedule({
  ...baseParams,
  assignments: buildStartAssignments(),
  seed: 42,
});

assert.ok(
  run.softScoreAfter <= run.softScoreBefore,
  "optimizer never returns a worse schedule than it started with"
);
assert.ok(
  run.softScoreAfter < run.softScoreBefore,
  "optimizer measurably improves a badly-unbalanced feasible start"
);

// Primary load is meaningfully more even than the start (R1 no longer has all 11).
const primaryCounts = new Map<string, number>();
for (const key of monthDayKeys) {
  const primary = run.assignments[key]?.primaryRosterId;
  if (primary) primaryCounts.set(primary, (primaryCounts.get(primary) ?? 0) + 1);
}
const maxPrimary = Math.max(...primaryCounts.values());
assert.ok(
  maxPrimary < 11,
  `optimizer spreads Primary load off the overloaded resident (max was ${maxPrimary})`
);

// --- 2. Hard feasibility preserved (no cell is hard-blocked) ---
for (const key of monthDayKeys) {
  const assignment = run.assignments[key];
  const checks: Array<["Primary" | "Backup" | "Buddy", string | null]> = [
    ["Primary", assignment?.primaryRosterId ?? null],
    ["Backup", assignment?.backupRosterId ?? null],
    ["Buddy", assignment?.buddyRosterId ?? null],
  ];
  for (const [slot, rosterId] of checks) {
    if (!rosterId) continue;
    const resident = residents.find((r) => r.residentId === rosterId)!;
    const evaluation = evaluateResidentForSlot({
      resident,
      slot,
      dateKey: key,
      assignments: run.assignments,
      rules: [],
      availabilityByResident,
    });
    assert.equal(
      evaluation.blocked,
      false,
      `no hard-blocked assignment after optimize (${rosterId} ${slot} ${key})`
    );
  }
}
// Specifically: R3 is never placed on their approved time-off date.
assert.notEqual(run.assignments["2026-07-07"]?.primaryRosterId, "R3");
assert.notEqual(run.assignments["2026-07-07"]?.backupRosterId, "R3");

// --- 3. Completeness preserved (no filled slot was emptied) ---
const start = buildStartAssignments();
for (const key of monthDayKeys) {
  const before = start[key];
  const after = run.assignments[key];
  assert.equal(
    Boolean(after?.primaryRosterId),
    Boolean(before.primaryRosterId),
    `Primary filled-ness preserved on ${key}`
  );
  assert.equal(
    Boolean(after?.backupRosterId),
    Boolean(before.backupRosterId),
    `Backup filled-ness preserved on ${key}`
  );
}

// --- 4. Buddy day is frozen (untouched) ---
assert.deepEqual(
  run.assignments["2026-07-10"],
  { primaryRosterId: "R5", backupRosterId: null, buddyRosterId: "R6" },
  "buddy day is excluded from optimization and left identical"
);

// --- 5. Deterministic for a given seed ---
const runA = optimizeCallSchedule({
  ...baseParams,
  assignments: buildStartAssignments(),
  seed: 123,
});
const runB = optimizeCallSchedule({
  ...baseParams,
  assignments: buildStartAssignments(),
  seed: 123,
});
assert.deepEqual(
  runA.assignments,
  runB.assignments,
  "same seed produces identical schedules"
);

// Different seeds are allowed to differ (sanity: the search actually explores).
const runC = optimizeCallSchedule({
  ...baseParams,
  assignments: buildStartAssignments(),
  seed: 999,
});
assert.ok(
  runC.softScoreAfter <= runC.softScoreBefore,
  "a different seed still never worsens the schedule"
);

// --- 6. Already-balanced / trivial inputs are safe no-ops ---
const singleResident = optimizeCallSchedule({
  ...baseParams,
  residents: [makeResident("solo", 3)],
  assignments: { "2026-07-01": { primaryRosterId: "solo", backupRosterId: null, buddyRosterId: null } },
  seed: 1,
});
assert.equal(
  singleResident.softScoreAfter,
  singleResident.softScoreBefore,
  "with fewer than two residents the optimizer is a no-op"
);

// --- 7. Integration: generateCallSchedule with enableLocalSearch ---
// Default path (enableLocalSearch omitted) reports no optimization.
const genDefault = generateCallSchedule({
  monthDays,
  residents,
  existingAssignments: {},
  rules: [],
  generationVersion: 7,
  forceRegenerate: true,
  availabilityByResident: {},
  historicalStats: [],
  slotMode: "Primary",
});
assert.equal(
  (genDefault.generationReport as any).optimization,
  null,
  "local search is off by default"
);

// Opt-in path stays complete + valid and records an optimization block.
const genOptimized = generateCallSchedule({
  monthDays,
  residents,
  existingAssignments: {},
  rules: [],
  generationVersion: 7,
  forceRegenerate: true,
  availabilityByResident: {},
  historicalStats: [],
  slotMode: "Primary",
  enableLocalSearch: true,
  localSearchMaxIterations: 2000,
});
const optReport = (genOptimized.generationReport as any).optimization;
assert.ok(optReport, "enableLocalSearch produces an optimization report");
assert.ok(
  optReport.softScoreAfter <= optReport.softScoreBefore,
  "integrated local search never worsens the selected schedule"
);
for (const key of monthDayKeys) {
  assert.ok(
    genOptimized.assignments[key]?.primaryRosterId,
    `every day still has a Primary after optimization (${key})`
  );
}

console.log("call-schedule-optimizer.test.ts passed");
