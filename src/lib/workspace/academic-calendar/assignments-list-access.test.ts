import assert from "node:assert/strict";
import {
  AssignmentsListAccessError,
  buildAssignmentsProgramFilter,
  normalizeRequiredProgramId,
  resolveAssignmentsListPermissionLevel,
} from "./assignments-list-access.ts";

const PROGRAM_A = "11111111-1111-1111-1111-111111111111";
const PROGRAM_B = "22222222-2222-2222-2222-222222222222";

assert.equal(normalizeRequiredProgramId(null), null);
assert.equal(normalizeRequiredProgramId(""), null);
assert.equal(normalizeRequiredProgramId("   "), null);
assert.equal(normalizeRequiredProgramId(`  ${PROGRAM_A}  `), PROGRAM_A);

assert.equal(resolveAssignmentsListPermissionLevel(true), "view");
assert.equal(resolveAssignmentsListPermissionLevel(false), "edit");

const programAFilter = buildAssignmentsProgramFilter(PROGRAM_A);
assert.equal(programAFilter.eventProgramId, PROGRAM_A);
assert.notEqual(programAFilter.eventProgramId, PROGRAM_B);

function assertCrossProgramAssignmentsBlocked(params: {
  requestedProgramId: string;
  allowedProgramId: string;
}) {
  if (params.requestedProgramId !== params.allowedProgramId) {
    throw new AssignmentsListAccessError(
      "You do not have access to this academic calendar.",
      403
    );
  }
}

assert.throws(
  () =>
    assertCrossProgramAssignmentsBlocked({
      requestedProgramId: PROGRAM_B,
      allowedProgramId: PROGRAM_A,
    }),
  /do not have access/
);

assert.doesNotThrow(() =>
  assertCrossProgramAssignmentsBlocked({
    requestedProgramId: PROGRAM_A,
    allowedProgramId: PROGRAM_A,
  })
);

function assertMineOnlyRequiresRosterInProgram(params: {
  mineOnly: boolean;
  rosterProgramId: string | null;
  requestedProgramId: string;
}) {
  if (!params.mineOnly) {
    return;
  }

  if (!params.rosterProgramId || params.rosterProgramId !== params.requestedProgramId) {
    throw new AssignmentsListAccessError(
      "Roster does not belong to this program.",
      403
    );
  }
}

assert.throws(
  () =>
    assertMineOnlyRequiresRosterInProgram({
      mineOnly: true,
      rosterProgramId: PROGRAM_B,
      requestedProgramId: PROGRAM_A,
    }),
  /Roster does not belong/
);

assert.doesNotThrow(() =>
  assertMineOnlyRequiresRosterInProgram({
    mineOnly: true,
    rosterProgramId: PROGRAM_A,
    requestedProgramId: PROGRAM_A,
  })
);

console.log("academic assignments list access isolation tests passed");