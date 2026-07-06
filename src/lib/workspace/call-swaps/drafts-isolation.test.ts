import assert from "node:assert/strict";

const PROGRAM_A = "11111111-1111-1111-1111-111111111111";
const PROGRAM_B = "22222222-2222-2222-2222-222222222222";
const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function canAccessProgramCallDraft(params: {
  authUserId: string;
  rowUserId: string;
  rowProgramId: string;
  activeProgramIds: string[];
}) {
  return (
    params.authUserId === params.rowUserId &&
    params.activeProgramIds.includes(params.rowProgramId)
  );
}

assert.equal(
  canAccessProgramCallDraft({
    authUserId: USER_A,
    rowUserId: USER_A,
    rowProgramId: PROGRAM_A,
    activeProgramIds: [PROGRAM_A],
  }),
  true
);

assert.equal(
  canAccessProgramCallDraft({
    authUserId: USER_A,
    rowUserId: USER_A,
    rowProgramId: PROGRAM_B,
    activeProgramIds: [PROGRAM_A],
  }),
  false
);

assert.equal(
  canAccessProgramCallDraft({
    authUserId: USER_A,
    rowUserId: USER_A,
    rowProgramId: PROGRAM_B,
    activeProgramIds: [PROGRAM_A, PROGRAM_B],
  }),
  true
);

console.log("program call schedule drafts isolation tests passed");