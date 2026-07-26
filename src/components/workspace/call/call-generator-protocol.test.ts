/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import type {
  CalendarDay,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import {
  calendarDayFromSnapshot,
  runGenerateRequest,
  toCalendarDaySnapshot,
  type GenerateRequestPayload,
} from "@/components/workspace/call/call-generator-protocol";

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

// --- 1. Snapshot round-trip preserves everything the generator reads ---
const originalDay = makeDay("2026-07-04"); // Saturday
const snapshot = toCalendarDaySnapshot(originalDay);

// Snapshot must be JSON-serializable (no Date).
assert.deepEqual(
  JSON.parse(JSON.stringify(snapshot)),
  snapshot,
  "snapshot is plain JSON"
);
assert.equal((snapshot as any).date, undefined, "snapshot carries no Date");

const rebuilt = calendarDayFromSnapshot(snapshot);
assert.equal(rebuilt.key, originalDay.key);
assert.equal(rebuilt.dayNumber, originalDay.dayNumber);
assert.equal(rebuilt.dayName, originalDay.dayName);
assert.equal(rebuilt.isWeekend, originalDay.isWeekend);
// The reconstructed Date must agree with the original on the fields the
// generator/buddy engine actually read.
assert.equal(rebuilt.date.getFullYear(), originalDay.date.getFullYear());
assert.equal(rebuilt.date.getMonth(), originalDay.date.getMonth());
assert.equal(rebuilt.date.getDay(), originalDay.date.getDay());

// --- 2. runGenerateRequest end-to-end from a serialized payload ---
const monthKeys = [
  "2026-07-01",
  "2026-07-02",
  "2026-07-03",
  "2026-07-04",
  "2026-07-05",
  "2026-07-06",
  "2026-07-07",
  "2026-07-08",
];
const residents = [
  makeResident("R1", 3),
  makeResident("R2", 3),
  makeResident("R3", 3),
  makeResident("R4", 3),
];

function buildPayload(overrides: Partial<GenerateRequestPayload> = {}): GenerateRequestPayload {
  return {
    requestId: "req-1",
    monthDays: monthKeys.map((key) => toCalendarDaySnapshot(makeDay(key))),
    residents,
    existingAssignments: {},
    rules: [],
    availabilityByResident: {},
    historicalStats: [],
    slotMode: "Primary",
    generationVersion: 7,
    forceRegenerate: true,
    ...overrides,
  };
}

// The whole request must be serializable (this is what crosses the worker boundary).
const payload = buildPayload();
assert.deepEqual(
  JSON.parse(JSON.stringify(payload)),
  payload,
  "request payload is plain JSON (worker-safe)"
);

const response = runGenerateRequest(payload);
assert.equal(response.requestId, "req-1");
for (const key of monthKeys) {
  assert.ok(
    response.assignments[key]?.primaryRosterId,
    `generated schedule fills Primary on ${key}`
  );
}

// --- 3. The RESPONSE must also be JSON-serializable (crosses back over the worker) ---
const serializedResponse = JSON.parse(JSON.stringify(response));
assert.deepEqual(
  serializedResponse.assignments,
  response.assignments,
  "response assignments survive JSON round-trip"
);
assert.ok(
  serializedResponse.generationReport,
  "response generationReport survives JSON round-trip"
);

// --- 4. enableLocalSearch flows through the protocol ---
const optimizedResponse = runGenerateRequest(
  buildPayload({ requestId: "req-2", enableLocalSearch: true, localSearchMaxIterations: 1500 })
);
const optReport = (optimizedResponse.generationReport as any).optimization;
assert.ok(optReport, "enableLocalSearch flows through runGenerateRequest");
assert.ok(optReport.softScoreAfter <= optReport.softScoreBefore);

// --- 5. Determinism across the protocol ---
const again = runGenerateRequest(buildPayload());
assert.deepEqual(
  again.assignments,
  response.assignments,
  "same payload + generationVersion yields identical assignments"
);

console.log("call-generator-protocol.test.ts passed");
