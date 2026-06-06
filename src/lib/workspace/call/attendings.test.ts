/* eslint-disable @typescript-eslint/no-require-imports */

const {
  canManageProgramAttendings,
  DEFAULT_PROGRAM_ATTENDING_SCOPE,
  getMonthRange,
  normalizeProgramAttendingInput,
  normalizeProgramAttendingMonthAssignments,
  normalizeProgramScopedRole,
} = require("./attendings-shared.ts") as typeof import("./attendings-shared");

function assertEqual<T>(label: string, actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function assertOk(label: string, condition: unknown) {
  if (!condition) {
    throw new Error(`${label}: expected truthy value`);
  }
}

function assertNull(label: string, value: unknown) {
  if (value !== null) {
    throw new Error(`${label}: expected null, received ${JSON.stringify(value)}`);
  }
}

function run() {
  const adminPermission = canManageProgramAttendings({
    isRosterAdmin: true,
    rosterRole: "resident",
    membershipRole: "resident",
  });
  assertEqual("roster admin can manage", adminPermission.canManage, true);

  const chiefPermission = canManageProgramAttendings({
    rosterRole: "Chief Resident",
    membershipRole: "resident",
    isRosterAdmin: false,
  });
  assertEqual("chief resident can manage", chiefPermission.canManage, true);
  assertEqual("chief role normalized", chiefPermission.rosterRole, "chief_resident");
  assertEqual(
    "shared role normalization",
    normalizeProgramScopedRole("Faculty Lead"),
    "faculty_lead"
  );

  const memberPermission = canManageProgramAttendings({
    rosterRole: "resident",
    membershipRole: "resident",
    isRosterAdmin: false,
  });
  assertEqual("resident cannot manage", memberPermission.canManage, false);

  const normalizedInput = normalizeProgramAttendingInput({
    fullName: "  Jane Doe, MD  ",
    displayName: "  Dr. Doe ",
  });
  assertOk("valid attending input", normalizedInput);
  assertEqual("full name trimmed", normalizedInput?.fullName, "Jane Doe, MD");
  assertEqual("display name trimmed", normalizedInput?.displayName, "Dr. Doe");

  assertNull(
    "blank attending rejected",
    normalizeProgramAttendingInput({ fullName: "   " })
  );

  const monthRange = getMonthRange("2026-06");
  assertEqual("month start", monthRange.monthStart, "2026-06-01");
  assertEqual("month end", monthRange.monthEnd, "2026-06-30");

  const normalizedAssignments = normalizeProgramAttendingMonthAssignments(
    [
      {
        coverageDate: "2026-06-02",
        attendingId: "att-1",
      },
      {
        coverageDate: "2026-06-15",
        attendingId: "att-2",
        coverageScope: "weekend",
        isDefault: false,
      },
    ],
    "2026-06"
  );

  assertOk("assignments normalized", normalizedAssignments);
  assertEqual(
    "default scope applied",
    normalizedAssignments?.[0]?.coverageScope,
    DEFAULT_PROGRAM_ATTENDING_SCOPE
  );
  assertEqual(
    "explicit scope preserved",
    normalizedAssignments?.[1]?.coverageScope,
    "weekend"
  );
  assertEqual(
    "explicit default preserved",
    normalizedAssignments?.[1]?.isDefault,
    false
  );

  assertNull(
    "out of month assignment rejected",
    normalizeProgramAttendingMonthAssignments(
      [
        {
          coverageDate: "2026-07-01",
          attendingId: "att-1",
        },
      ],
      "2026-06"
    )
  );

  assertNull(
    "missing attending rejected",
    normalizeProgramAttendingMonthAssignments(
      [
        {
          coverageDate: "2026-06-10",
          attendingId: "   ",
        },
      ],
      "2026-06"
    )
  );

  assertNull(
    "multiple defaults for same day and scope rejected",
    normalizeProgramAttendingMonthAssignments(
      [
        {
          coverageDate: "2026-06-10",
          attendingId: "att-1",
        },
        {
          coverageDate: "2026-06-10",
          attendingId: "att-2",
        },
      ],
      "2026-06"
    )
  );
}

run();
