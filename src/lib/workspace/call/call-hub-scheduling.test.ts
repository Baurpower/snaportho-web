import assert from "node:assert/strict";
import type {
  DraftDayAssignment,
  ProgramCallSlotDefinition,
  ProgramRule,
} from "@/components/workspace/call/programcalltypes";
import type { ProgramCallItem } from "@/components/workspace/call/callmonthcalendar";
import {
  buildBulkPublishRowsFromSlotMap,
  buildBuddyDateStateByDate,
  getCallHubVisibleSlotDefinitions,
  getDropValidationMessage,
  getEligibleResidentsForSlotPicker,
  groupEligibleResidentsByPgy,
  slotMapToDraftDayAssignments,
  validateCallHubSchedule,
  type CallHubResident,
  type CallHubRotationAssignment,
  type CallHubValidationContext,
} from "@/lib/workspace/call/call-hub-scheduling";
import { serializeSlotId as validationSerializeSlotId } from "@/lib/workspace/call/validation";

const buddySlotDefinition: ProgramCallSlotDefinition = {
  id: "slot-buddy",
  label: "Buddy",
  shortLabel: "B°",
  callType: "Buddy",
  colorKey: "violet",
  requiredMode: "conditional",
  requiredWhenVisible: false,
  countsTowardWorkload: false,
  sortOrder: 2,
  daysOfWeek: [5, 6],
};

const backupSlotDefinition: ProgramCallSlotDefinition = {
  id: "slot-backup",
  label: "Backup",
  shortLabel: "2°",
  callType: "Backup",
  colorKey: "sky",
  requiredMode: "conditional",
  requiredWhenVisible: false,
  countsTowardWorkload: true,
  sortOrder: 1,
  condition: {
    type: "when_pgy_scheduled",
    pgyYears: [1, 2],
    sourceSlotCallTypes: ["Primary"],
  },
};

const primarySlotDefinition: ProgramCallSlotDefinition = {
  id: "slot-primary",
  label: "Primary",
  shortLabel: "1°",
  callType: "Primary",
  colorKey: "amber",
  requiredMode: "always",
  requiredWhenVisible: true,
  countsTowardWorkload: true,
  sortOrder: 0,
};

const slotDefinitions = [
  primarySlotDefinition,
  backupSlotDefinition,
  buddySlotDefinition,
];

const rules: ProgramRule[] = [
  {
    id: "slot-primary",
    name: "Primary",
    rule_type: "call_slot_definition",
    is_enabled: true,
    is_hard_rule: false,
    config: {
      slotCallType: "Primary",
      slotRequiredMode: "always",
    },
  } as ProgramRule,
  {
    id: "slot-backup",
    name: "Backup",
    rule_type: "call_slot_definition",
    is_enabled: true,
    is_hard_rule: false,
    config: {
      slotCallType: "Backup",
      slotRequiredMode: "conditional",
      slotCondition: {
        type: "when_pgy_scheduled",
        pgyYears: [1, 2],
      },
    },
  } as ProgramRule,
  {
    id: "slot-buddy",
    name: "Buddy",
    rule_type: "call_slot_definition",
    is_enabled: true,
    is_hard_rule: false,
    config: {
      slotCallType: "Buddy",
      slotRequiredMode: "conditional",
      slotDaysOfWeek: [5, 6],
    },
  } as ProgramRule,
  {
    id: "pgy5-backup-only",
    name: "PGY-5: Backup call only",
    rule_type: "restrict_call_type_by_pgy",
    is_enabled: true,
    is_hard_rule: true,
    config: {
      restrictedPgyYears: [5],
      allowedCallTypes: ["Backup"],
    },
  } as ProgramRule,
  {
    id: "pgy1-gen-ortho-primary-block",
    name: "PGY-1 Gen Ortho blocked from Primary",
    rule_type: "restrict_call_by_rotation",
    is_enabled: true,
    is_hard_rule: true,
    config: {
      rotationIds: ["rotation-gen-ortho"],
      blockAllCall: false,
      restrictedCallTypes: ["Primary"],
      restrictedPgyYears: [1],
    },
  } as ProgramRule,
];

const residents: CallHubResident[] = [
  {
    rosterId: "pgy1-gen-ortho",
    programMembershipId: "mem-pgy1",
    residentName: "PGY1 Gen Ortho",
    trainingLevel: "PGY-1",
    pgyYear: 1,
    gradYear: 2031,
  },
  {
    rosterId: "pgy2-primary",
    programMembershipId: "mem-pgy2",
    residentName: "PGY2 Primary",
    trainingLevel: "PGY-2",
    pgyYear: 2,
    gradYear: 2030,
  },
  {
    rosterId: "pgy4-primary",
    programMembershipId: "mem-pgy4",
    residentName: "PGY4 Primary",
    trainingLevel: "PGY-4",
    pgyYear: 4,
    gradYear: 2028,
  },
  {
    rosterId: "pgy4-backup",
    programMembershipId: "mem-pgy4b",
    residentName: "PGY4 Backup",
    trainingLevel: "PGY-4",
    pgyYear: 4,
    gradYear: 2028,
  },
  {
    rosterId: "pgy5-backup",
    programMembershipId: "mem-pgy5",
    residentName: "PGY5 Backup",
    trainingLevel: "PGY-5",
    pgyYear: 5,
    gradYear: 2027,
  },
  {
    rosterId: "pgy3-alpha",
    programMembershipId: "mem-pgy3a",
    residentName: "Alpha PGY3",
    trainingLevel: "PGY-3",
    pgyYear: 3,
    gradYear: 2029,
  },
  {
    rosterId: "pgy3-zulu",
    programMembershipId: "mem-pgy3z",
    residentName: "Zulu PGY3",
    trainingLevel: "PGY-3",
    pgyYear: 3,
    gradYear: 2029,
  },
];

const rotations: CallHubRotationAssignment[] = [
  {
    rosterId: "pgy1-gen-ortho",
    rotationId: "rotation-gen-ortho",
    rotationName: "Gen Ortho",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  },
];

const validationContext: CallHubValidationContext = {
  rules,
  slotDefinitions,
  residents,
  rotations,
  timeOff: [],
};

function makeCall(params: {
  id: string;
  rosterId: string;
  callDate: string;
  callType: "Primary" | "Backup" | "Buddy";
  pgyYear?: number | null;
  residentName?: string;
}): ProgramCallItem {
  return {
    id: params.id,
    rosterId: params.rosterId,
    membershipId: params.rosterId,
    programMembershipId: null,
    residentName: params.residentName ?? params.rosterId,
    trainingLevel: params.pgyYear ? `PGY-${params.pgyYear}` : null,
    pgyYear: params.pgyYear ?? null,
    gradYear: null,
    classYear: null,
    userId: null,
    callType: params.callType,
    callDate: params.callDate,
    startDatetime: null,
    endDatetime: null,
    site: null,
    isHomeCall: true,
    notes: null,
    isMine: false,
  };
}

function buildSlotMap(assignments: Record<string, DraftDayAssignment>) {
  const slotMap = new Map<string, ProgramCallItem | null>();

  for (const [dateKey, day] of Object.entries(assignments)) {
    const slots: Array<{ callType: "Primary" | "Backup" | "Buddy"; rosterId: string | null }> = [
      { callType: "Primary", rosterId: day.primaryRosterId },
      { callType: "Backup", rosterId: day.backupRosterId },
      { callType: "Buddy", rosterId: day.buddyRosterId },
    ];

    for (const slot of slots) {
      const slotId = validationSerializeSlotId({
        dateKey,
        callType: slot.callType,
      });
      slotMap.set(
        slotId,
        slot.rosterId
          ? makeCall({
              id: `${dateKey}-${slot.callType}`,
              rosterId: slot.rosterId,
              callDate: dateKey,
              callType: slot.callType,
              pgyYear:
                slot.rosterId === "pgy1-gen-ortho"
                  ? 1
                  : slot.rosterId === "pgy2-primary"
                  ? 2
                  : 4,
            })
          : null
      );
    }
  }

  return slotMap;
}

function visibleCallTypesForDate(
  dateKey: string,
  slotMap: Map<string, ProgramCallItem | null>
) {
  const draftAssignments = slotMapToDraftDayAssignments(slotMap);
  const buddyDateStateByDate = buildBuddyDateStateByDate({
    year: 2026,
    monthIndex: 6,
    residents,
    rotations,
    rules,
    slotDefinitions,
    draftAssignments,
  });
  const date = new Date(`${dateKey}T00:00:00`);
  const primarySlotId = validationSerializeSlotId({
    dateKey,
    callType: "Primary",
  });
  const primaryCall = slotMap.get(primarySlotId) ?? null;
  const assignedCallTypeKeys = new Set<string>();

  for (const [slotId, call] of slotMap.entries()) {
    if (!call || !slotId.startsWith(`${dateKey}__`)) continue;
    assignedCallTypeKeys.add(slotId.split("__")[1]?.toLowerCase() ?? "");
  }

  return getCallHubVisibleSlotDefinitions({
    dayOfWeek: date.getDay(),
    primaryCallPgyYear: primaryCall?.pgyYear ?? null,
    assignedCallTypeKeys,
    slotDefinitions,
    buddyDateState: buddyDateStateByDate.get(dateKey) ?? null,
    draftDayAssignment: draftAssignments[dateKey] ?? null,
  }).map((definition) => definition.callType);
}

const eligibleBuddyDate = "2026-07-03";
const ineligibleBuddyDate = "2026-07-01";

const openBuddySlotMap = buildSlotMap({
  [eligibleBuddyDate]: {
    primaryRosterId: "pgy4-primary",
    backupRosterId: null,
    buddyRosterId: null,
  },
});

const buddyDateStateByDate = buildBuddyDateStateByDate({
  year: 2026,
  monthIndex: 6,
  residents,
  rotations,
  rules,
  slotDefinitions,
  draftAssignments: slotMapToDraftDayAssignments(openBuddySlotMap),
});

assert.equal(
  buddyDateStateByDate.get(eligibleBuddyDate)?.isVisible,
  true,
  "Buddy date state is visible on an eligible Friday with PGY-1 Gen Ortho requirement"
);

const eligibleVisible = visibleCallTypesForDate(eligibleBuddyDate, openBuddySlotMap);
assert.ok(
  eligibleVisible.includes("Buddy"),
  "Buddy renders on eligible Friday when buddy requirements are active"
);

const pgy2BuddyVisibleFriday = buildSlotMap({
  [eligibleBuddyDate]: {
    primaryRosterId: "pgy2-primary",
    backupRosterId: null,
    buddyRosterId: null,
  },
});
const pgy2BuddyVisibleFridayTypes = visibleCallTypesForDate(
  eligibleBuddyDate,
  pgy2BuddyVisibleFriday
);
assert.ok(
  pgy2BuddyVisibleFridayTypes.includes("Primary") &&
    pgy2BuddyVisibleFridayTypes.includes("Backup") &&
    pgy2BuddyVisibleFridayTypes.includes("Buddy"),
  "PGY-2 Primary Friday shows Backup when Buddy is visible but unassigned"
);

const ineligibleVisible = visibleCallTypesForDate(
  ineligibleBuddyDate,
  buildSlotMap({
    [ineligibleBuddyDate]: {
      primaryRosterId: "pgy4-primary",
      backupRosterId: null,
      buddyRosterId: null,
    },
  })
);
assert.ok(
  !ineligibleVisible.includes("Buddy"),
  "Buddy does not render on ineligible weekdays"
);

const pgy2Thursday = "2026-07-02";
const pgy2BackupVisible = visibleCallTypesForDate(
  pgy2Thursday,
  buildSlotMap({
    [pgy2Thursday]: {
      primaryRosterId: "pgy2-primary",
      backupRosterId: null,
      buddyRosterId: null,
    },
  })
);
assert.ok(
  pgy2BackupVisible.includes("Primary") && pgy2BackupVisible.includes("Backup"),
  "Backup renders when Primary is PGY-2"
);

const pgy2Friday = "2026-07-10";
const pgy2FridayVisible = visibleCallTypesForDate(
  pgy2Friday,
  buildSlotMap({
    [pgy2Friday]: {
      primaryRosterId: "pgy2-primary",
      backupRosterId: null,
      buddyRosterId: null,
    },
  })
);
assert.ok(
  pgy2FridayVisible.includes("Primary") &&
    pgy2FridayVisible.includes("Backup") &&
    pgy2FridayVisible.includes("Buddy"),
  "PGY-2 Primary Friday shows Backup and Buddy when Buddy is not assigned"
);

const pgy2BuddyAssignedFriday = buildSlotMap({
  [eligibleBuddyDate]: {
    primaryRosterId: "pgy2-primary",
    backupRosterId: null,
    buddyRosterId: "pgy1-gen-ortho",
  },
});
const pgy2BuddyAssignedFridayTypes = visibleCallTypesForDate(
  eligibleBuddyDate,
  pgy2BuddyAssignedFriday
);
assert.ok(
  pgy2BuddyAssignedFridayTypes.includes("Primary") &&
    pgy2BuddyAssignedFridayTypes.includes("Buddy") &&
    !pgy2BuddyAssignedFridayTypes.includes("Backup"),
  "Backup is hidden when Buddy is assigned on Friday"
);

const backupDropWithBuddyVisibleOnly = getDropValidationMessage({
  slotMap: pgy2BuddyVisibleFriday,
  targetSlotId: validationSerializeSlotId({
    dateKey: eligibleBuddyDate,
    callType: "Backup",
  }),
  resident: residents.find((resident) => resident.rosterId === "pgy5-backup")!,
  context: validationContext,
});
assert.equal(
  backupDropWithBuddyVisibleOnly,
  null,
  "Backup can be assigned when Buddy is visible but unassigned"
);

const backupDropWithBuddyAssigned = getDropValidationMessage({
  slotMap: pgy2BuddyAssignedFriday,
  targetSlotId: validationSerializeSlotId({
    dateKey: eligibleBuddyDate,
    callType: "Backup",
  }),
  resident: residents.find((resident) => resident.rosterId === "pgy5-backup")!,
  context: validationContext,
});
assert.ok(
  backupDropWithBuddyAssigned,
  "Backup assignment is blocked once Buddy is assigned on the same date"
);

const pgy4BackupHidden = visibleCallTypesForDate(
  "2026-07-02",
  buildSlotMap({
    "2026-07-02": {
      primaryRosterId: "pgy4-primary",
      backupRosterId: null,
      buddyRosterId: null,
    },
  })
);
assert.ok(
  pgy4BackupHidden.includes("Primary") && !pgy4BackupHidden.includes("Backup"),
  "Backup is hidden when Primary is PGY-4"
);

const buddyDropMessage = getDropValidationMessage({
  slotMap: openBuddySlotMap,
  targetSlotId: validationSerializeSlotId({
    dateKey: eligibleBuddyDate,
    callType: "Buddy",
  }),
  resident: residents[0],
  context: validationContext,
});
assert.equal(
  buddyDropMessage,
  null,
  "PGY-1 Gen Ortho resident can be assigned to Buddy on an eligible Buddy day"
);

const primaryBackupCoexist = validateCallHubSchedule({
  assignments: [
    {
      callId: "p1",
      rosterId: "pgy2-primary",
      residentId: "pgy2-primary",
      callDate: "2026-07-02",
      callType: "Primary",
    },
    {
      callId: "b1",
      rosterId: "pgy4-backup",
      residentId: "pgy4-backup",
      callDate: "2026-07-02",
      callType: "Backup",
    },
  ],
  context: validationContext,
  touchedDates: ["2026-07-02"],
});
assert.equal(
  primaryBackupCoexist.hasErrors,
  false,
  "Primary and Backup can coexist when Backup is allowed"
);

const primaryBuddyCoexist = validateCallHubSchedule({
  assignments: [
    {
      callId: "p1",
      rosterId: "pgy4-primary",
      residentId: "pgy4-primary",
      callDate: eligibleBuddyDate,
      callType: "Primary",
    },
    {
      callId: "buddy1",
      rosterId: "pgy1-gen-ortho",
      residentId: "pgy1-gen-ortho",
      callDate: eligibleBuddyDate,
      callType: "Buddy",
    },
  ],
  context: validationContext,
  touchedDates: [eligibleBuddyDate],
});
assert.equal(
  primaryBuddyCoexist.hasErrors,
  false,
  "Primary and Buddy can coexist on an eligible Buddy day"
);

const backupBuddyConflict = validateCallHubSchedule({
  assignments: [
    {
      callId: "p1",
      rosterId: "pgy4-primary",
      residentId: "pgy4-primary",
      callDate: eligibleBuddyDate,
      callType: "Primary",
    },
    {
      callId: "buddy1",
      rosterId: "pgy1-gen-ortho",
      residentId: "pgy1-gen-ortho",
      callDate: eligibleBuddyDate,
      callType: "Buddy",
    },
    {
      callId: "backup1",
      rosterId: "pgy4-backup",
      residentId: "pgy4-backup",
      callDate: eligibleBuddyDate,
      callType: "Backup",
    },
  ],
  context: validationContext,
  touchedDates: [eligibleBuddyDate],
});
assert.ok(
  backupBuddyConflict.errors.some((issue) => issue.code === "buddy_day_backup_conflict"),
  "Backup + Buddy conflict is blocked when buddy_disables_backup applies"
);

const publishSlotMap = buildSlotMap({
  [eligibleBuddyDate]: {
    primaryRosterId: "pgy4-primary",
    backupRosterId: null,
    buddyRosterId: "pgy1-gen-ortho",
  },
  "2026-07-02": {
    primaryRosterId: "pgy2-primary",
    backupRosterId: "pgy4-backup",
    buddyRosterId: null,
  },
});

const publishRows = buildBulkPublishRowsFromSlotMap({
  slotMap: publishSlotMap,
  touchedDateKeys: [eligibleBuddyDate, "2026-07-02"],
  residentsByRosterId: new Map(residents.map((resident) => [resident.rosterId, resident])),
});

assert.deepEqual(
  publishRows.map((row) => `${row.callDate}:${row.callType}`).sort(),
  [
    "2026-07-02:Backup",
    "2026-07-02:Primary",
    `${eligibleBuddyDate}:Buddy`,
    `${eligibleBuddyDate}:Primary`,
  ].sort(),
  "Publish rows preserve Primary, Backup, and Buddy assignments"
);

const primaryPickerDate = "2026-07-07";
const openPrimarySlotMap = buildSlotMap({
  [primaryPickerDate]: {
    primaryRosterId: null,
    backupRosterId: null,
    buddyRosterId: null,
  },
});

const primaryPickerEligibility = getEligibleResidentsForSlotPicker({
  slotMap: openPrimarySlotMap,
  targetSlotId: validationSerializeSlotId({
    dateKey: primaryPickerDate,
    callType: "Primary",
  }),
  context: validationContext,
});

const primaryPickerRosterIds = primaryPickerEligibility.groups.flatMap((group) =>
  group.residents.map((entry) => entry.resident.rosterId)
);
assert.ok(
  !primaryPickerRosterIds.includes("pgy5-backup"),
  "PGY-5 is hidden from Primary picker because PGY-5 is Backup-only"
);
assert.ok(
  primaryPickerRosterIds.includes("pgy2-primary"),
  "PGY-2 remains visible in Primary picker when otherwise eligible"
);

const backupPickerDate = "2026-07-02";
const backupPickerSlotMap = buildSlotMap({
  [backupPickerDate]: {
    primaryRosterId: "pgy2-primary",
    backupRosterId: null,
    buddyRosterId: null,
  },
});

const backupPickerEligibility = getEligibleResidentsForSlotPicker({
  slotMap: backupPickerSlotMap,
  targetSlotId: validationSerializeSlotId({
    dateKey: backupPickerDate,
    callType: "Backup",
  }),
  context: validationContext,
});
const backupPickerRosterIds = backupPickerEligibility.groups.flatMap((group) =>
  group.residents.map((entry) => entry.resident.rosterId)
);
assert.ok(
  backupPickerRosterIds.includes("pgy5-backup"),
  "PGY-5 is visible in Backup picker when otherwise eligible"
);

const buddyPickerEligibility = getEligibleResidentsForSlotPicker({
  slotMap: openBuddySlotMap,
  targetSlotId: validationSerializeSlotId({
    dateKey: eligibleBuddyDate,
    callType: "Buddy",
  }),
  context: validationContext,
});
const buddyPickerRosterIds = buddyPickerEligibility.groups.flatMap((group) =>
  group.residents.map((entry) => entry.resident.rosterId)
);
assert.ok(
  buddyPickerRosterIds.includes("pgy1-gen-ortho"),
  "PGY-1 Gen Ortho resident is visible in Buddy picker when eligible"
);

const duplicateSameDaySlotMap = buildSlotMap({
  [backupPickerDate]: {
    primaryRosterId: "pgy2-primary",
    backupRosterId: null,
    buddyRosterId: null,
  },
});
const duplicateSameDayEligibility = getEligibleResidentsForSlotPicker({
  slotMap: duplicateSameDaySlotMap,
  targetSlotId: validationSerializeSlotId({
    dateKey: backupPickerDate,
    callType: "Backup",
  }),
  context: validationContext,
});
const duplicateSameDayRosterIds = duplicateSameDayEligibility.groups.flatMap(
  (group) => group.residents.map((entry) => entry.resident.rosterId)
);
assert.ok(
  !duplicateSameDayRosterIds.includes("pgy2-primary"),
  "Resident already assigned Primary same day is excluded from Backup picker"
);

const rotationBlockedEligibility = getEligibleResidentsForSlotPicker({
  slotMap: openPrimarySlotMap,
  targetSlotId: validationSerializeSlotId({
    dateKey: primaryPickerDate,
    callType: "Primary",
  }),
  context: validationContext,
});
const rotationBlockedRosterIds = rotationBlockedEligibility.groups.flatMap(
  (group) => group.residents.map((entry) => entry.resident.rosterId)
);
assert.ok(
  !rotationBlockedRosterIds.includes("pgy1-gen-ortho"),
  "PGY-1 on Gen Ortho rotation is excluded from Primary picker by rotation rule"
);

const timeOffContext: CallHubValidationContext = {
  ...validationContext,
  timeOff: [
    {
      id: "pto-pgy4",
      rosterId: "pgy4-primary",
      startDate: primaryPickerDate,
      endDate: primaryPickerDate,
      type: "pto",
      status: "approved",
    },
  ],
};
const timeOffEligibility = getEligibleResidentsForSlotPicker({
  slotMap: openPrimarySlotMap,
  targetSlotId: validationSerializeSlotId({
    dateKey: primaryPickerDate,
    callType: "Primary",
  }),
  context: timeOffContext,
});
const timeOffRosterIds = timeOffEligibility.groups.flatMap((group) =>
  group.residents.map((entry) => entry.resident.rosterId)
);
assert.ok(
  !timeOffRosterIds.includes("pgy4-primary"),
  "Resident with approved time off is excluded from picker"
);

const groupedResidents = groupEligibleResidentsByPgy(
  residents.map((resident) => ({ resident, warnings: [] }))
);
assert.deepEqual(
  groupedResidents.map((group) => group.label),
  ["PGY-1", "PGY-2", "PGY-3", "PGY-4", "PGY-5"],
  "Residents are grouped in PGY order"
);
const pgy3Group = groupedResidents.find((group) => group.label === "PGY-3");
assert.deepEqual(
  pgy3Group?.residents.map((entry) => entry.resident.residentName),
  ["Alpha PGY3", "Zulu PGY3"],
  "Residents are sorted alphabetically within each PGY group"
);

const primaryGroupingEligibility = getEligibleResidentsForSlotPicker({
  slotMap: openPrimarySlotMap,
  targetSlotId: validationSerializeSlotId({
    dateKey: primaryPickerDate,
    callType: "Primary",
  }),
  context: validationContext,
});
assert.deepEqual(
  primaryGroupingEligibility.groups.map((group) => group.label),
  ["PGY-2", "PGY-3", "PGY-4"],
  "Primary picker groups eligible residents by PGY level"
);

console.log("call-hub-scheduling.test.ts passed");