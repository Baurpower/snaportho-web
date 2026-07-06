import assert from "node:assert/strict";

function requireProgramId(programId: string | null | undefined, label: string) {
  if (!programId || !programId.trim()) {
    throw new Error(`${label}: programId is required.`);
  }

  return programId.trim();
}

const PROGRAM_A = "11111111-1111-1111-1111-111111111111";

assert.equal(
  requireProgramId(`  ${PROGRAM_A}  `, "test"),
  PROGRAM_A
);

assert.throws(
  () => requireProgramId(null, "getNotificationsForCurrentUser"),
  /programId is required/
);

assert.throws(
  () => requireProgramId("   ", "markAllNotificationsRead"),
  /programId is required/
);

function buildNotificationQueryFilters(params: {
  userId: string;
  programId: string;
  unreadOnly?: boolean;
}) {
  const programId = requireProgramId(
    params.programId,
    "getNotificationsForCurrentUser"
  );

  return {
    recipient_user_id: params.userId,
    program_id: programId,
    unread_only: Boolean(params.unreadOnly),
  };
}

const filters = buildNotificationQueryFilters({
  userId: "user-a",
  programId: PROGRAM_A,
  unreadOnly: true,
});

assert.equal(filters.recipient_user_id, "user-a");
assert.equal(filters.program_id, PROGRAM_A);
assert.equal(filters.unread_only, true);
assert.notEqual(filters.program_id, "22222222-2222-2222-2222-222222222222");

console.log("workspace notification query scoping tests passed");