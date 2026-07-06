import assert from "node:assert/strict";
import type { ProgramRule } from "@/components/workspace/call/programcalltypes";
import {
  validateCallMonthDraft,
  validateConditionalRequiredSlots,
  validateRequiredSlotRule,
} from "@/lib/workspace/call/validation";
import { buildCallHubValidationInput } from "@/lib/workspace/call/call-hub-scheduling";
import type { CallHubValidationContext } from "@/lib/workspace/call/call-hub-scheduling";

const primarySlotRule = {
  id: "slot-primary",
  name: "Primary",
  rule_type: "call_slot_definition",
  is_enabled: true,
  is_hard_rule: false,
  config: {
    slotCallType: "Primary",
    slotRequiredMode: "always",
    slotRequiredWhenVisible: true,
  },
} as ProgramRule;

const backupSlotRule = {
  id: "slot-backup",
  name: "Backup",
  rule_type: "call_slot_definition",
  is_enabled: true,
  is_hard_rule: false,
  config: {
    slotCallType: "Backup",
    slotRequiredMode: "conditional",
    slotRequiredWhenVisible: false,
    slotCondition: {
      type: "when_pgy_scheduled",
      pgyYears: [1, 2],
      sourceSlotCallTypes: ["Primary"],
    },
  },
} as ProgramRule;

const backupSlotRuleExplicitRequired = {
  ...backupSlotRule,
  config: {
    ...backupSlotRule.config,
    slotRequiredWhenVisible: true,
  },
} as ProgramRule;

const pgy5BackupOnlyRule = {
  id: "pgy5-backup-only",
  name: "PGY-5: Backup call only",
  rule_type: "restrict_call_type_by_pgy",
  is_enabled: true,
  is_hard_rule: true,
  config: {
    restrictedPgyYears: [5],
    allowedCallTypes: ["Backup"],
  },
} as ProgramRule;

const requiredPrimaryOnlyRule = {
  id: "required-slots",
  name: "Required daily call slots",
  rule_type: "required_daily_call_slots",
  is_enabled: true,
  is_hard_rule: true,
  config: {
    requiredCallTypes: ["Primary"],
  },
} as ProgramRule;

const requiredPrimaryAndBackupRule = {
  ...requiredPrimaryOnlyRule,
  config: {
    requiredCallTypes: ["Primary", "Backup"],
  },
} as ProgramRule;

const residents = [
  {
    rosterId: "pgy2-primary",
    residentId: "pgy2-primary",
    residentName: "PGY2 Primary",
    displayName: "PGY2 Primary",
    gradYear: 2030,
    trainingLevel: "PGY-2",
    pgyYear: 2,
  },
  {
    rosterId: "pgy5-backup",
    residentId: "pgy5-backup",
    residentName: "PGY5 Backup",
    displayName: "PGY5 Backup",
    gradYear: 2027,
    trainingLevel: "PGY-5",
    pgyYear: 5,
  },
];

const validationContext: CallHubValidationContext = {
  rules: [
    primarySlotRule,
    backupSlotRule,
    pgy5BackupOnlyRule,
    requiredPrimaryOnlyRule,
  ],
  slotDefinitions: [],
  residents: residents.map((resident) => ({
    rosterId: resident.rosterId,
    programMembershipId: resident.rosterId,
    residentName: resident.residentName,
    trainingLevel: resident.trainingLevel,
    pgyYear: resident.pgyYear,
    gradYear: resident.gradYear,
  })),
  rotations: [],
  timeOff: [],
};

const dateKey = "2026-07-02";

function validateAssignments(
  assignments: Array<{
    callId: string;
    rosterId: string;
    residentId: string;
    callDate: string;
    callType: "Primary" | "Backup" | "Buddy";
  }>,
  rules = validationContext.rules
) {
  return validateCallMonthDraft(
    buildCallHubValidationInput({
      assignments,
      context: { ...validationContext, rules },
      touchedDates: [dateKey],
    })
  );
}

const primaryOnlyAssignment = [
  {
    callId: "primary-1",
    rosterId: "pgy2-primary",
    residentId: "pgy2-primary",
    callDate: dateKey,
    callType: "Primary" as const,
  },
];

const emptyBackupValidation = validateAssignments(primaryOnlyAssignment);
assert.equal(
  emptyBackupValidation.errors.some(
    (issue) =>
      issue.code === "missing_required_slot" &&
      issue.callType === "Backup"
  ),
  false,
  "Empty Backup does not produce a validation error by default"
);

const emptyPrimaryValidation = validateAssignments([]);
assert.ok(
  emptyPrimaryValidation.errors.some(
    (issue) =>
      issue.code === "missing_required_slot" &&
      issue.callType === "Primary"
  ),
  "Empty Primary still produces a validation error when Primary is required"
);

const assignedBackupValidation = validateAssignments([
  ...primaryOnlyAssignment,
  {
    callId: "backup-1",
    rosterId: "pgy5-backup",
    residentId: "pgy5-backup",
    callDate: dateKey,
    callType: "Backup",
  },
]);
assert.equal(
  assignedBackupValidation.hasErrors,
  false,
  "Assigned Backup validates normally"
);

const pgy5PrimaryBlocked = validateAssignments([
  {
    callId: "primary-5",
    rosterId: "pgy5-backup",
    residentId: "pgy5-backup",
    callDate: dateKey,
    callType: "Primary",
  },
]);
assert.ok(
  pgy5PrimaryBlocked.errors.some((issue) => issue.code === "pgy_restriction"),
  "PGY-5 Primary remains blocked"
);

const pgy5BackupAllowed = validateAssignments([
  ...primaryOnlyAssignment,
  {
    callId: "backup-5",
    rosterId: "pgy5-backup",
    residentId: "pgy5-backup",
    callDate: dateKey,
    callType: "Backup",
  },
]);
assert.equal(
  pgy5BackupAllowed.errors.some((issue) => issue.code === "pgy_restriction"),
  false,
  "PGY-5 Backup remains allowed"
);

const explicitRequiredDailyBackup = validateAssignments(
  primaryOnlyAssignment,
  [
    primarySlotRule,
    backupSlotRule,
    pgy5BackupOnlyRule,
    requiredPrimaryAndBackupRule,
  ]
);
assert.ok(
  explicitRequiredDailyBackup.errors.some(
    (issue) =>
      issue.code === "missing_required_slot" &&
      issue.callType === "Backup" &&
      issue.message.includes("Required Backup call slot is unassigned")
  ),
  "Explicit required_daily_call_slots rule still errors on missing Backup"
);

const explicitConditionalBackupRequired = validateConditionalRequiredSlots(
  buildCallHubValidationInput({
    assignments: primaryOnlyAssignment,
    context: {
      ...validationContext,
      rules: [primarySlotRule, backupSlotRuleExplicitRequired, requiredPrimaryOnlyRule],
    },
    touchedDates: [dateKey],
  })
);
assert.ok(
  explicitConditionalBackupRequired.some(
    (issue) =>
      issue.code === "missing_required_slot" &&
      issue.callType === "Backup"
  ),
  "Backup with explicit requiredWhenVisible=true still errors when visible and empty"
);

const legacyBackupSlotRule = {
  ...backupSlotRule,
  config: {
    slotCallType: "Backup",
    slotRequiredMode: "conditional",
    slotCondition: {
      type: "when_pgy_scheduled",
      pgyYears: [1, 2],
      sourceSlotCallTypes: ["Primary"],
    },
  },
} as ProgramRule;

const legacyBackupValidation = validateConditionalRequiredSlots(
  buildCallHubValidationInput({
    assignments: primaryOnlyAssignment,
    context: {
      ...validationContext,
      rules: [primarySlotRule, legacyBackupSlotRule, requiredPrimaryOnlyRule],
    },
    touchedDates: [dateKey],
  })
);
assert.equal(
  legacyBackupValidation.some(
    (issue) =>
      issue.code === "missing_required_slot" && issue.callType === "Backup"
  ),
  false,
  "Legacy Backup slot definitions without slotRequiredWhenVisible default to optional"
);

const requiredSlotOnlyPrimary = validateRequiredSlotRule(
  buildCallHubValidationInput({
    assignments: primaryOnlyAssignment,
    context: validationContext,
    touchedDates: [dateKey],
  })
);
assert.equal(
  requiredSlotOnlyPrimary.some(
    (issue) =>
      issue.code === "missing_required_slot" && issue.callType === "Backup"
  ),
  false,
  "required_daily_call_slots with Primary only does not require Backup"
);

console.log("validation.test.ts passed");