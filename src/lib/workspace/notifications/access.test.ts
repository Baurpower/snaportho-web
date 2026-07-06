import assert from "node:assert/strict";

const PROGRAM_A = "11111111-1111-1111-1111-111111111111";
const PROGRAM_B = "22222222-2222-2222-2222-222222222222";

function parseRequestedProgramId(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get("programId");
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function assertResolvedProgramScope(params: {
  requestedProgramId: string | null;
  activeProgramId: string | null;
}) {
  if (!params.activeProgramId) {
    throw new Error("No active workspace access found.");
  }

  if (
    params.requestedProgramId &&
    params.requestedProgramId !== params.activeProgramId
  ) {
    throw new Error("You do not have access to this workspace program.");
  }

  return params.activeProgramId;
}

assert.equal(parseRequestedProgramId(new URLSearchParams()), null);
assert.equal(parseRequestedProgramId(new URLSearchParams("programId=")), null);
assert.equal(
  parseRequestedProgramId(new URLSearchParams(`programId=${PROGRAM_A}`)),
  PROGRAM_A
);
assert.equal(
  parseRequestedProgramId(new URLSearchParams(`programId=  ${PROGRAM_B}  `)),
  PROGRAM_B
);

assert.equal(
  assertResolvedProgramScope({
    requestedProgramId: null,
    activeProgramId: PROGRAM_A,
  }),
  PROGRAM_A
);

assert.equal(
  assertResolvedProgramScope({
    requestedProgramId: PROGRAM_A,
    activeProgramId: PROGRAM_A,
  }),
  PROGRAM_A
);

assert.throws(
  () =>
    assertResolvedProgramScope({
      requestedProgramId: PROGRAM_B,
      activeProgramId: PROGRAM_A,
    }),
  /do not have access/
);

assert.throws(
  () =>
    assertResolvedProgramScope({
      requestedProgramId: PROGRAM_A,
      activeProgramId: null,
    }),
  /No active workspace access/
);

console.log("workspace notification access isolation tests passed");