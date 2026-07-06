import assert from "node:assert/strict";
import {
  buildSwapRosterQueryFilters,
  swapRowsMatchProgramScope,
} from "../academic-calendar/assignments-list-access.ts";

const PROGRAM_A = "11111111-1111-1111-1111-111111111111";
const PROGRAM_B = "22222222-2222-2222-2222-222222222222";
const ROSTER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ROSTER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const incomingFilters = buildSwapRosterQueryFilters({
  programId: PROGRAM_A,
  rosterId: ROSTER_A,
  direction: "incoming",
});

assert.equal(incomingFilters.program_id, PROGRAM_A);
assert.equal(incomingFilters.roster_id, ROSTER_A);
assert.equal(incomingFilters.roster_column, "recipient_roster_id");

const outgoingFilters = buildSwapRosterQueryFilters({
  programId: PROGRAM_A,
  rosterId: ROSTER_A,
  direction: "outgoing",
});

assert.equal(outgoingFilters.roster_column, "requester_roster_id");

function filterSwapRowsForProgram<T extends { program_id: string; recipient_roster_id?: string; requester_roster_id?: string }>(
  rows: T[],
  filters: ReturnType<typeof buildSwapRosterQueryFilters>
) {
  return rows.filter((row) => {
    if (row.program_id !== filters.program_id) {
      return false;
    }

    if (filters.roster_column === "recipient_roster_id") {
      return row.recipient_roster_id === filters.roster_id;
    }

    return row.requester_roster_id === filters.roster_id;
  });
}

const mixedProgramRows = [
  {
    id: "swap-1",
    program_id: PROGRAM_A,
    recipient_roster_id: ROSTER_A,
    requester_roster_id: ROSTER_B,
  },
  {
    id: "swap-2",
    program_id: PROGRAM_B,
    recipient_roster_id: ROSTER_A,
    requester_roster_id: ROSTER_B,
  },
];

const programAIncoming = filterSwapRowsForProgram(mixedProgramRows, incomingFilters);

assert.equal(programAIncoming.length, 1);
assert.equal(programAIncoming[0]?.id, "swap-1");
assert.equal(swapRowsMatchProgramScope(programAIncoming, PROGRAM_A), true);
assert.equal(swapRowsMatchProgramScope(programAIncoming, PROGRAM_B), false);

console.log("swap roster query program isolation tests passed");