/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import {
  BACKUP_REQUIRED_EXPLICIT_KEY,
  findBackupRequirementSources,
  migratePersistedCallRules,
} from "@/lib/workspace/call/persisted-rule-migration";
import { buildCallHubValidationInput } from "@/lib/workspace/call/call-hub-scheduling";
import type { CallHubValidationContext } from "@/lib/workspace/call/call-hub-scheduling";
import {
  validateCallMonthDraft,
  validateConditionalRequiredSlots,
  validateRequiredSlotRule,
} from "@/lib/workspace/call/validation";

const persistedDbRules = [
  {
    id: "required-slots",
    name: "Required daily call slots",
    rule_type: "required_daily_call_slots",
    is_enabled: true,
    is_hard_rule: true,
    config: {
      requiredCallTypes: ["Primary", "Backup"],
    },
  },
  {
    id: "slot-backup",
    name: "Backup",
    rule_type: "call_slot_definition",
    is_enabled: true,
    is_hard_rule: false,
    config: {
      slotCallType: "Backup",
      slotRequiredMode: "conditional",
      slotRequiredWhenVisible: true,
      slotCondition: {
        type: "when_pgy_scheduled",
        pgyYears: [1, 2],
        sourceSlotCallTypes: ["Primary"],
      },
    },
  },
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
  },
] as const;

const sources = findBackupRequirementSources([...persistedDbRules]);
assert.ok(sources.requiredDailyCallSlotsRule, "detects persisted required_daily_call_slots with Backup");
assert.ok(sources.backupSlotDefinitionRule, "detects persisted Backup slot with requiredWhenVisible true");

const migrated = migratePersistedCallRules([...persistedDbRules]);
assert.equal(migrated.changedCount, 2, "migrates legacy required-daily and backup slot rules");
assert.deepEqual(
  migrated.rules[0].config?.requiredCallTypes,
  ["Primary"],
  "removes Backup from legacy required_daily_call_slots"
);
assert.equal(
  migrated.rules[1].config?.slotRequiredWhenVisible,
  false,
  "clears legacy Backup slotRequiredWhenVisible"
);

const explicitRules = migratePersistedCallRules([
  {
    ...persistedDbRules[0],
    config: {
      requiredCallTypes: ["Primary", "Backup"],
      [BACKUP_REQUIRED_EXPLICIT_KEY]: true,
    },
  },
  {
    ...persistedDbRules[1],
    config: {
      ...persistedDbRules[1].config,
      [BACKUP_REQUIRED_EXPLICIT_KEY]: true,
    },
  },
]);
assert.equal(
  explicitRules.changedCount,
  0,
  "preserves explicit backup-required rules"
);

const dateKey = "2026-07-01";
const validationContext: CallHubValidationContext = {
  rules: migrated.rules as any,
  slotDefinitions: [],
  residents: [
    {
      rosterId: "pgy2-primary",
      programMembershipId: "pgy2-primary",
      residentName: "PGY2 Primary",
      trainingLevel: "PGY-2",
      pgyYear: 2,
      gradYear: 2030,
    },
    {
      rosterId: "pgy5-backup",
      programMembershipId: "pgy5-backup",
      residentName: "PGY5 Backup",
      trainingLevel: "PGY-5",
      pgyYear: 5,
      gradYear: 2027,
    },
  ],
  rotations: [],
  timeOff: [],
};

const primaryOnlyAssignment = [
  {
    callId: "primary-1",
    rosterId: "pgy2-primary",
    residentId: "pgy2-primary",
    callDate: dateKey,
    callType: "Primary" as const,
  },
];

const validationInput = buildCallHubValidationInput({
  assignments: primaryOnlyAssignment,
  context: validationContext,
  touchedDates: [dateKey],
});

const requiredSlotIssues = validateRequiredSlotRule(validationInput);
assert.equal(
  requiredSlotIssues.some(
    (issue) =>
      issue.code === "missing_required_slot" &&
      issue.callType === "Backup" &&
      issue.message.includes("Required Backup call slot is unassigned")
  ),
  false,
  "migrated persisted rules no longer trigger validateRequiredSlotRule Backup errors"
);

const conditionalIssues = validateConditionalRequiredSlots(validationInput);
assert.equal(
  conditionalIssues.some(
    (issue) => issue.code === "missing_required_slot" && issue.callType === "Backup"
  ),
  false,
  "migrated persisted rules no longer trigger validateConditionalRequiredSlots Backup errors"
);

const fullValidation = validateCallMonthDraft(validationInput);
assert.equal(
  fullValidation.errors.some(
    (issue) => issue.callType === "Backup" && issue.code === "missing_required_slot"
  ),
  false,
  "empty Backup is not an error after migrating persisted DB-shaped rules"
);

const assignedBackupValidation = validateCallMonthDraft(
  buildCallHubValidationInput({
    assignments: [
      ...primaryOnlyAssignment,
      {
        callId: "backup-1",
        rosterId: "pgy5-backup",
        residentId: "pgy5-backup",
        callDate: dateKey,
        callType: "Backup",
      },
    ],
    context: validationContext,
    touchedDates: [dateKey],
  })
);
assert.equal(assignedBackupValidation.hasErrors, false, "PGY-5 Backup assignment remains allowed");

const pgy5PrimaryBlocked = validateCallMonthDraft(
  buildCallHubValidationInput({
    assignments: [
      {
        callId: "primary-5",
        rosterId: "pgy5-backup",
        residentId: "pgy5-backup",
        callDate: dateKey,
        callType: "Primary",
      },
    ],
    context: validationContext,
    touchedDates: [dateKey],
  })
);
assert.ok(
  pgy5PrimaryBlocked.errors.some((issue) => issue.code === "pgy_restriction"),
  "PGY-5 Primary remains blocked"
);

console.log("persisted-rule-migration.test.ts passed");