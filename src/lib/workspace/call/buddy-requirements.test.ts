/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import type {
  DraftDayAssignment,
  ProgramCallSlotDefinition,
  ProgramRule,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import {
  BUDDY_PRIMARY_PARTNER_PGY,
  DEFAULT_BUDDY_POLICY,
  getBuddyDateStatesForMonth,
  getBuddyRequirementsForMonth,
  resolveBuddyPolicy,
} from "@/lib/workspace/call/buddy-requirements";
import { getSlotStatusForDay } from "@/lib/workspace/call/rule-definitions";

function makeResident(params: {
  residentId: string;
  displayName: string;
  trainingLevel: string;
  gradYear?: number | null;
  rotationAssignments?: ResidentOption["rotationAssignments"];
}) {
  return {
    residentId: params.residentId,
    rosterId: params.residentId,
    displayName: params.displayName,
    trainingLevel: params.trainingLevel,
    gradYear: params.gradYear ?? null,
    pgyYear: null,
    rotationAssignments: params.rotationAssignments ?? [],
  } as ResidentOption;
}

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
  condition: undefined,
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

const rules: ProgramRule[] = [
  {
    id: "buddy-slot-rule",
    name: "Buddy Call Rule",
    rule_type: "call_slot_definition",
    is_enabled: true,
    is_hard_rule: false,
    config: {
      slotLabel: "Buddy",
      slotShortLabel: "B°",
      slotCallType: "Buddy",
      slotColorKey: "violet",
      slotRequiredMode: "conditional",
      slotDaysOfWeek: [5, 6],
      slotCountsTowardWorkload: false,
      slotSortOrder: 2,
    },
  } as ProgramRule,
  {
    id: "buddy-max-rule",
    name: "PGY-1 Buddy max",
    rule_type: "monthly_load_target_by_pgy",
    is_enabled: true,
    is_hard_rule: true,
    config: {
      targetPgyYears: [1],
      targetCallType: "Buddy",
      targetHardMaxCalls: 3,
    },
  } as ProgramRule,
];

const residents = [
  makeResident({
    residentId: "pgy1-gen-ortho",
    displayName: "PGY1 Gen Ortho",
    trainingLevel: "PGY-1",
    rotationAssignments: [
      {
        rotationName: "Gen Ortho",
        startDate: "2026-07-01",
        endDate: "2026-07-31",
      } as any,
    ],
  }),
  makeResident({
    residentId: "pgy4-primary-a",
    displayName: "PGY4 A",
    trainingLevel: "PGY-4",
  }),
  makeResident({
    residentId: "pgy4-primary-b",
    displayName: "PGY4 B",
    trainingLevel: "PGY-4",
  }),
];

const baseAssignments: Record<string, DraftDayAssignment> = {
  "2026-07-03": {
    primaryRosterId: "pgy4-primary-a",
    backupRosterId: null,
    buddyRosterId: "pgy1-gen-ortho",
  },
  "2026-07-10": {
    primaryRosterId: "pgy4-primary-b",
    backupRosterId: null,
    buddyRosterId: "pgy1-gen-ortho",
  },
};

const buddyRequirements = getBuddyRequirementsForMonth({
  year: 2026,
  month: 7,
  residents,
  rotations: [],
  rules,
  slotDefinitions: [buddySlotDefinition],
  assignments: {},
});

assert.equal(
  buddyRequirements[0]?.requiredBuddyDays,
  2,
  "PGY-1 on Gen Ortho/Pager requires two Buddy days"
);
assert.equal(
  buddyRequirements[0]?.maxBuddyDays,
  3,
  "PGY-1 Buddy max follows the configured monthly load cap"
);
assert.ok(
  buddyRequirements[0]?.eligibleDates.every((dateKey) => {
    const day = new Date(`${dateKey}T00:00:00`).getDay();
    return day === 5 || day === 6;
  }),
  "Buddy only uses Friday/Saturday dates"
);

const satisfiedStates = getBuddyDateStatesForMonth({
  year: 2026,
  month: 7,
  residents,
  rotations: [],
  rules,
  slotDefinitions: [buddySlotDefinition, backupSlotDefinition],
  assignments: baseAssignments,
});

assert.equal(
  satisfiedStates.some(
    (state) => state.dateKey === "2026-07-17" && state.isVisible && !state.isRequired
  ),
  true,
  "Buddy can remain visible as an optional slot after the required minimum is met"
);

const satisfiedRequirements = getBuddyRequirementsForMonth({
  year: 2026,
  month: 7,
  residents,
  rotations: [],
  rules,
  slotDefinitions: [buddySlotDefinition],
  assignments: baseAssignments,
});
assert.equal(
  satisfiedRequirements[0]?.remainingNeeded,
  0,
  "Buddy requirement minimum is satisfied after two Buddy assignments"
);
assert.equal(
  satisfiedRequirements[0]?.remainingCapacity,
  1,
  "Remaining Buddy capacity tracks optional Buddy slots beyond the required minimum"
);

const openStates = getBuddyDateStatesForMonth({
  year: 2026,
  month: 7,
  residents,
  rotations: [],
  rules,
  slotDefinitions: [buddySlotDefinition, backupSlotDefinition],
  assignments: {},
});
const firstBuddyState = openStates.find((state) => state.dateKey === "2026-07-03");
assert.equal(
  firstBuddyState?.isRequired,
  true,
  "Buddy becomes required when an eligible PGY-1 still needs Buddy days"
);
assert.equal(
  firstBuddyState?.requiredPrimaryPartnerPgy,
  BUDDY_PRIMARY_PARTNER_PGY,
  "Buddy day requires a PGY-4 Primary partner"
);
assert.equal(
  firstBuddyState?.backupRequiredOnBuddyDay,
  false,
  "Backup is not required on Buddy days"
);

const visibleBuddy = getSlotStatusForDay({
  def: buddySlotDefinition,
  dayOfWeek: 5,
  primaryPgyYear: 4,
  hasAssignment: false,
  buddyDateState: firstBuddyState ?? null,
});
assert.equal(
  visibleBuddy.isVisible,
  true,
  "Buddy visibility comes from Buddy requirements, not from PGY-4 Primary alone"
);

const noEligibleResidents = getBuddyRequirementsForMonth({
  year: 2026,
  month: 7,
  residents: [
    makeResident({
      residentId: "pgy4-primary-only",
      displayName: "PGY4 only",
      trainingLevel: "PGY-4",
    }),
  ],
  rotations: [],
  rules,
  slotDefinitions: [buddySlotDefinition],
  assignments: {},
});
assert.equal(
  noEligibleResidents.length,
  0,
  "PGY-4 Friday/Saturday Primary alone does not create Buddy requirements"
);

// --- Configurable buddy policy (buddy_requirement rule) ---

// resolveBuddyPolicy falls back to defaults when no rule is present.
assert.deepEqual(
  resolveBuddyPolicy([]),
  DEFAULT_BUDDY_POLICY,
  "resolveBuddyPolicy returns the default policy when no buddy_requirement rule exists"
);

const buddySlotRule = rules[0];

function rulesWithBuddyPolicy(config: Record<string, unknown>): ProgramRule[] {
  return [
    buddySlotRule,
    {
      id: "buddy-requirement-rule",
      name: "Buddy policy",
      rule_type: "buddy_requirement",
      is_enabled: true,
      is_hard_rule: false,
      config,
    } as ProgramRule,
  ];
}

const genOrthoPgy1 = () =>
  makeResident({
    residentId: "pgy1-gen-ortho",
    displayName: "PGY1 Gen Ortho",
    trainingLevel: "PGY-1",
    rotationAssignments: [
      {
        rotationName: "Gen Ortho",
        startDate: "2026-07-01",
        endDate: "2026-07-31",
      } as any,
    ],
  });

// requiredDaysPerMonth override.
const oneDayReq = getBuddyRequirementsForMonth({
  year: 2026,
  month: 7,
  residents: [genOrthoPgy1()],
  rotations: [],
  rules: rulesWithBuddyPolicy({ requiredDaysPerMonth: 1 }),
  slotDefinitions: [buddySlotDefinition],
  assignments: {},
});
assert.equal(
  oneDayReq[0]?.requiredBuddyDays,
  1,
  "requiredDaysPerMonth override changes the required buddy days"
);

// partnerPgyYear override flows into BuddyDateState.
const partnerOverrideStates = getBuddyDateStatesForMonth({
  year: 2026,
  month: 7,
  residents: [genOrthoPgy1()],
  rotations: [],
  rules: rulesWithBuddyPolicy({ partnerPgyYear: 5 }),
  slotDefinitions: [buddySlotDefinition],
  assignments: {},
});
assert.ok(
  partnerOverrideStates.some((state) => state.requiredPrimaryPartnerPgy === 5),
  "partnerPgyYear override changes the required Primary partner PGY"
);

// allowedDaysOfWeek override: Sundays only → no Friday/Saturday eligible dates.
const sundayOnly = getBuddyRequirementsForMonth({
  year: 2026,
  month: 7,
  residents: [genOrthoPgy1()],
  rotations: [],
  rules: rulesWithBuddyPolicy({ allowedDaysOfWeek: [0] }),
  slotDefinitions: [buddySlotDefinition],
  assignments: {},
});
assert.ok(
  (sundayOnly[0]?.eligibleDates ?? []).every(
    (dateKey) => new Date(`${dateKey}T00:00:00`).getDay() === 0
  ),
  "allowedDaysOfWeek override restricts buddy dates to the configured weekdays"
);

// buddyPgyYears override: a PGY-2 on Gen Ortho becomes buddy-eligible.
const pgy2Buddy = getBuddyRequirementsForMonth({
  year: 2026,
  month: 7,
  residents: [
    makeResident({
      residentId: "pgy2-gen-ortho",
      displayName: "PGY2 Gen Ortho",
      trainingLevel: "PGY-2",
      rotationAssignments: [
        {
          rotationName: "Gen Ortho",
          startDate: "2026-07-01",
          endDate: "2026-07-31",
        } as any,
      ],
    }),
  ],
  rotations: [],
  rules: rulesWithBuddyPolicy({ buddyPgyYears: [2] }),
  slotDefinitions: [buddySlotDefinition],
  assignments: {},
});
assert.equal(
  pgy2Buddy.length,
  1,
  "buddyPgyYears override lets a PGY-2 take the buddy slot"
);

// eligibleRotationNameTokens override: Gen Ortho no longer eligible.
const nightFloatOnly = getBuddyRequirementsForMonth({
  year: 2026,
  month: 7,
  residents: [genOrthoPgy1()],
  rotations: [],
  rules: rulesWithBuddyPolicy({ eligibleRotationNameTokens: ["nightfloat"] }),
  slotDefinitions: [buddySlotDefinition],
  assignments: {},
});
assert.equal(
  nightFloatOnly.length,
  0,
  "eligibleRotationNameTokens override excludes rotations that no longer match"
);

console.log("buddy-requirements.test.ts passed");
