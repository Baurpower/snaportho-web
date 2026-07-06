import type { DraftDayAssignment, ProgramRule } from "@/components/workspace/call/programcalltypes";
import type { ProgramCallSlotDefinition } from "@/lib/workspace/call/rule-definitions";
import {
  getVisibleCallSlotsForDay,
} from "@/lib/workspace/call/rule-definitions";
import {
  getBuddyDateStatesForMonth,
  type BuddyDateState,
} from "@/lib/workspace/call/buddy-requirements";
import type { ProgramCallItem } from "@/components/workspace/call/callmonthcalendar";
import {
  deserializeSlotId,
  serializeSlotId,
  validateCallMonthDraft,
  type CallDraftAssignment,
  type CallValidationIssue,
  type CallValidationResident,
  type CallValidationResult,
  type CallValidationRotation,
  type CallValidationRule,
  type CallValidationTimeOff,
} from "@/lib/workspace/call/validation";

export type CallHubResident = {
  rosterId: string;
  programMembershipId: string | null;
  residentName: string;
  trainingLevel: string | null;
  pgyYear?: number | null;
  gradYear?: number | null;
};

export type CallHubRotationAssignment = {
  rosterId?: string | null;
  roster_id?: string | null;
  rotationId?: string | null;
  rotation_id?: string | null;
  startDate?: string | null;
  start_date?: string | null;
  endDate?: string | null;
  end_date?: string | null;
  rotationName?: string | null;
  rotation_name?: string | null;
  rotationShortName?: string | null;
  rotation_short_name?: string | null;
  rotation?: {
    name?: string | null;
    shortName?: string | null;
    short_name?: string | null;
  } | null;
};

export type CallHubTimeOffItem = {
  id?: string | null;
  rosterId?: string | null;
  membershipId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  eventType?: string | null;
  type?: string | null;
  approvalStatus?: string | null;
  status?: string | null;
};

export type CallHubBulkPublishRow = {
  residentName: string;
  callDate: string;
  callType: "Primary" | "Backup" | "Buddy";
  site: string | null;
  isHomeCall: boolean;
  notes: string | null;
  matchedRosterId: string;
  matchedMembershipId: string | null;
};

export type CallHubValidationContext = {
  rules: ProgramRule[];
  slotDefinitions: ProgramCallSlotDefinition[];
  residents: CallHubResident[];
  rotations: CallHubRotationAssignment[];
  timeOff: CallHubTimeOffItem[];
};

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapProgramRulesToValidationRules(
  rules: ProgramRule[]
): CallValidationRule[] {
  return rules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    ruleType: rule.rule_type,
    ruleCode: rule.rule_type,
    isEnabled: rule.is_enabled,
    isHardRule: rule.is_hard_rule,
    config: rule.config as Record<string, unknown>,
  }));
}

export function mapRotationsToValidationRotations(
  rotations: CallHubRotationAssignment[]
): CallValidationRotation[] {
  const mapped: CallValidationRotation[] = [];

  for (const rotation of rotations) {
    const rosterId =
      normalizeString(rotation.rosterId) ??
      normalizeString(rotation.roster_id);
    const startDate =
      normalizeString(rotation.startDate) ??
      normalizeString(rotation.start_date);
    const endDate =
      normalizeString(rotation.endDate) ?? normalizeString(rotation.end_date);
    const rotationId =
      normalizeString(rotation.rotationId) ??
      normalizeString(rotation.rotation_id);

    if (!rosterId || !startDate || !endDate || !rotationId) continue;

    mapped.push({
      residentId: rosterId,
      rosterId,
      membershipId: rosterId,
      rotationId,
      rotationName:
        normalizeString(rotation.rotationName) ??
        normalizeString(rotation.rotation_name) ??
        normalizeString(rotation.rotation?.name) ??
        null,
      shortName:
        normalizeString(rotation.rotationShortName) ??
        normalizeString(rotation.rotation_short_name) ??
        normalizeString(rotation.rotation?.shortName) ??
        normalizeString(rotation.rotation?.short_name) ??
        null,
      startDate,
      endDate,
    });
  }

  return mapped;
}

export function mapTimeOffToValidationTimeOff(
  items: CallHubTimeOffItem[]
): CallValidationTimeOff[] {
  const mapped: CallValidationTimeOff[] = [];

  for (const item of items) {
    const rosterId =
      normalizeString(item.rosterId) ?? normalizeString(item.membershipId);
    const startDate = normalizeString(item.startDate);
    const endDate = normalizeString(item.endDate);
    if (!rosterId || !startDate || !endDate) continue;

    mapped.push({
      id: normalizeString(item.id),
      residentId: rosterId,
      rosterId,
      membershipId: rosterId,
      startDate,
      endDate,
      type:
        normalizeString(item.type) ?? normalizeString(item.eventType) ?? null,
      status:
        normalizeString(item.status) ??
        normalizeString(item.approvalStatus) ??
        null,
    });
  }

  return mapped;
}

export function buildCallHubValidationResidents(
  residents: CallHubResident[]
): CallValidationResident[] {
  return residents.map((resident) => ({
    residentId: resident.rosterId,
    rosterId: resident.rosterId,
    membershipId: resident.rosterId,
    programMembershipId: resident.programMembershipId,
    residentName: resident.residentName,
    displayName: resident.residentName,
    trainingLevel: resident.trainingLevel,
    pgyYear: resident.pgyYear ?? null,
    gradYear: resident.gradYear ?? null,
  }));
}

export function slotMapToDraftDayAssignments(
  slotMap: Map<string, ProgramCallItem | null>
): Record<string, DraftDayAssignment> {
  const result: Record<string, DraftDayAssignment> = {};

  for (const [slotId, call] of slotMap.entries()) {
    if (!call?.callDate) continue;
    const { dateKey, callType } = deserializeSlotId(slotId);
    const rosterId = call.rosterId ?? call.membershipId ?? null;
    if (!rosterId) continue;

    result[dateKey] ??= {
      primaryRosterId: null,
      backupRosterId: null,
      buddyRosterId: null,
    };

    const normalizedType = callType.toLowerCase();
    if (normalizedType === "primary") {
      result[dateKey].primaryRosterId = rosterId;
    } else if (normalizedType === "backup") {
      result[dateKey].backupRosterId = rosterId;
    } else if (normalizedType === "buddy") {
      result[dateKey].buddyRosterId = rosterId;
    }
  }

  return result;
}

export function slotMapToCallDraftAssignments(
  slotMap: Map<string, ProgramCallItem | null>
): CallDraftAssignment[] {
  const assignments: CallDraftAssignment[] = [];

  for (const [slotId, call] of slotMap.entries()) {
    if (!call) continue;

    assignments.push({
      id: call.id,
      callId: call.id,
      rosterId: call.rosterId ?? call.membershipId ?? null,
      residentId: call.rosterId ?? call.membershipId ?? null,
      membershipId: call.rosterId ?? call.membershipId ?? null,
      programMembershipId: call.programMembershipId ?? null,
      residentName: call.residentName,
      trainingLevel: call.trainingLevel,
      callDate: call.callDate,
      dateKey: call.callDate,
      callType: call.callType,
      startDatetime: call.startDatetime,
      endDatetime: call.endDatetime,
      slotId,
    });
  }

  return assignments;
}

export function buildBuddyEngineResidents(residents: CallHubResident[]) {
  return residents.map((resident) => ({
    residentId: resident.rosterId,
    rosterId: resident.rosterId,
    membershipId: resident.rosterId,
    programMembershipId: resident.programMembershipId,
    displayName: resident.residentName,
    trainingLevel: resident.trainingLevel,
    pgyYear: resident.pgyYear ?? null,
    gradYear: resident.gradYear ?? null,
    rotationAssignments: [],
  }));
}

export function buildBuddyEngineRotations(rotations: CallHubRotationAssignment[]) {
  return rotations.map((rotation) => ({
    residentId:
      normalizeString(rotation.rosterId) ??
      normalizeString(rotation.roster_id) ??
      null,
    rosterId:
      normalizeString(rotation.rosterId) ??
      normalizeString(rotation.roster_id) ??
      null,
    rotationId:
      normalizeString(rotation.rotationId) ??
      normalizeString(rotation.rotation_id) ??
      null,
    rotationName:
      normalizeString(rotation.rotationName) ??
      normalizeString(rotation.rotation_name) ??
      normalizeString(rotation.rotation?.name) ??
      null,
    rotationShortName:
      normalizeString(rotation.rotationShortName) ??
      normalizeString(rotation.rotation_short_name) ??
      normalizeString(rotation.rotation?.shortName) ??
      normalizeString(rotation.rotation?.short_name) ??
      null,
    startDate:
      normalizeString(rotation.startDate) ??
      normalizeString(rotation.start_date) ??
      null,
    endDate:
      normalizeString(rotation.endDate) ?? normalizeString(rotation.end_date) ?? null,
  }));
}

export function buildBuddyDateStateByDate(params: {
  year: number;
  monthIndex: number;
  residents: CallHubResident[];
  rotations: CallHubRotationAssignment[];
  rules: ProgramRule[];
  slotDefinitions: ProgramCallSlotDefinition[];
  draftAssignments: Record<string, DraftDayAssignment>;
}): Map<string, BuddyDateState> {
  const states = getBuddyDateStatesForMonth({
    year: params.year,
    month: params.monthIndex + 1,
    residents: buildBuddyEngineResidents(params.residents),
    rotations: buildBuddyEngineRotations(params.rotations),
    rules: params.rules,
    slotDefinitions: params.slotDefinitions,
    assignments: params.draftAssignments,
  });

  return new Map(states.map((state) => [state.dateKey, state]));
}

export function getCallHubVisibleSlotDefinitions(params: {
  dayOfWeek: number;
  primaryCallPgyYear: number | null;
  assignedCallTypeKeys: ReadonlySet<string>;
  slotDefinitions: ProgramCallSlotDefinition[];
  buddyDateState: BuddyDateState | null;
  draftDayAssignment?: DraftDayAssignment | null;
}): ProgramCallSlotDefinition[] {
  const visible = getVisibleCallSlotsForDay({
    dayOfWeek: params.dayOfWeek,
    primaryCallPgyYear: params.primaryCallPgyYear,
    assignedCallTypeKeys: params.assignedCallTypeKeys,
    slotDefinitions: params.slotDefinitions,
    buddyDateState: params.buddyDateState,
  });

  const buddyAssigned = Boolean(params.draftDayAssignment?.buddyRosterId);

  if (!buddyAssigned) {
    return visible;
  }

  // buddy_disables_backup: Backup is not offered once Buddy is assigned on this date.
  return visible.filter((definition) => definition.callType !== "Backup");
}

export function buildCallHubValidationInput(params: {
  assignments: CallDraftAssignment[];
  context: CallHubValidationContext;
  touchedDates?: string[];
}) {
  const validationResidents = buildCallHubValidationResidents(params.context.residents);
  const validationRules = mapProgramRulesToValidationRules(params.context.rules);
  const validationRotations = mapRotationsToValidationRotations(params.context.rotations);
  const validationTimeOff = mapTimeOffToValidationTimeOff(params.context.timeOff);

  return {
    assignments: params.assignments,
    rules: validationRules,
    residents: validationResidents,
    timeOff: validationTimeOff,
    rotations: validationRotations,
    context: {
      rules: validationRules,
      residents: validationResidents,
      timeOff: validationTimeOff,
      rotations: validationRotations,
      metadata: {
        touchedDates: params.touchedDates ?? [],
      },
    },
  };
}

export function validateCallHubSchedule(params: {
  assignments: CallDraftAssignment[];
  context: CallHubValidationContext;
  touchedDates?: string[];
}): CallValidationResult {
  return validateCallMonthDraft(
    buildCallHubValidationInput({
      assignments: params.assignments,
      context: params.context,
      touchedDates: params.touchedDates,
    })
  );
}

export function projectResidentOntoSlotMap(
  slotMap: Map<string, ProgramCallItem | null>,
  targetSlotId: string,
  resident: CallHubResident,
  existingCall?: ProgramCallItem | null
): Map<string, ProgramCallItem | null> {
  const next = new Map(slotMap);
  const slot = deserializeSlotId(targetSlotId);

  next.set(targetSlotId, {
    id:
      existingCall?.id ??
      `temp-${slot.dateKey}-${slot.callType.toLowerCase()}-${resident.rosterId}`,
    rosterId: resident.rosterId,
    programMembershipId: resident.programMembershipId,
    membershipId: resident.rosterId,
    residentName: resident.residentName,
    trainingLevel: resident.trainingLevel,
    pgyYear: resident.pgyYear ?? undefined,
    gradYear: resident.gradYear ?? null,
    classYear: existingCall?.classYear ?? null,
    userId: existingCall?.userId ?? null,
    callType: slot.callType,
    callDate: slot.dateKey,
    startDatetime: existingCall?.startDatetime ?? null,
    endDatetime: existingCall?.endDatetime ?? null,
    site: existingCall?.site ?? null,
    isHomeCall: existingCall?.isHomeCall ?? false,
    notes: existingCall?.notes ?? null,
    isMine: existingCall?.isMine ?? false,
  });

  return next;
}

export const CALL_HUB_PGY_GROUP_ORDER = [
  "PGY-1",
  "PGY-2",
  "PGY-3",
  "PGY-4",
  "PGY-5",
] as const;

export type SlotAssignmentEvaluation = {
  blockingError: string | null;
  warnings: CallValidationIssue[];
  slotUnavailable: boolean;
};

export type SlotPickerEligibleResident = {
  resident: CallHubResident;
  warnings: CallValidationIssue[];
};

export type SlotPickerEligibilityResult = {
  groups: Array<{ label: string; residents: SlotPickerEligibleResident[] }>;
  emptyStateMessage: string | null;
  slotUnavailable: boolean;
};

export function getCallHubPgyGroupLabel(resident: CallHubResident): string {
  if (typeof resident.pgyYear === "number") {
    return `PGY-${resident.pgyYear}`;
  }

  if (resident.trainingLevel) {
    const parsed = parsePgyFromTrainingLevel(resident.trainingLevel);
    if (parsed !== null) {
      return `PGY-${parsed}`;
    }
    return resident.trainingLevel;
  }

  return "Unknown";
}

function getSlotUnavailableMessage(callType: string): string {
  if (callType === "Buddy") {
    return "Buddy call is not available on this date. Buddy slots only appear on eligible Friday/Saturday dates when a PGY-1 on Gen Ortho/Pager still needs Buddy coverage.";
  }
  if (callType === "Backup") {
    return "Backup call is not available on this date. Backup appears when Primary is PGY-1 or PGY-2, and is hidden once Buddy is assigned.";
  }
  return `${callType} call is not available on this date.`;
}

function isTargetSlotVisible(params: {
  slotMap: Map<string, ProgramCallItem | null>;
  targetSlotId: string;
  context: CallHubValidationContext;
}): boolean {
  const targetSlot = deserializeSlotId(params.targetSlotId);
  const draftAssignments = slotMapToDraftDayAssignments(params.slotMap);
  const buddyDateStateByDate = buildBuddyDateStateByDate({
    year: Number(targetSlot.dateKey.slice(0, 4)),
    monthIndex: Number(targetSlot.dateKey.slice(5, 7)) - 1,
    residents: params.context.residents,
    rotations: params.context.rotations,
    rules: params.context.rules,
    slotDefinitions: params.context.slotDefinitions,
    draftAssignments,
  });

  const date = new Date(`${targetSlot.dateKey}T00:00:00`);
  const primarySlotId = serializeSlotId({
    dateKey: targetSlot.dateKey,
    callType: "Primary",
  });
  const primaryCall = params.slotMap.get(primarySlotId) ?? null;
  const primaryCallPgyYear =
    primaryCall?.pgyYear ??
    (primaryCall?.trainingLevel
      ? parsePgyFromTrainingLevel(primaryCall.trainingLevel)
      : null) ??
    null;

  const assignedCallTypeKeys = new Set<string>();
  for (const [slotId, call] of params.slotMap.entries()) {
    if (!call || !slotId.startsWith(`${targetSlot.dateKey}__`)) continue;
    assignedCallTypeKeys.add(deserializeSlotId(slotId).callType.toLowerCase());
  }

  const visibleSlots = getCallHubVisibleSlotDefinitions({
    dayOfWeek: date.getDay(),
    primaryCallPgyYear,
    assignedCallTypeKeys,
    slotDefinitions: params.context.slotDefinitions,
    buddyDateState: buddyDateStateByDate.get(targetSlot.dateKey) ?? null,
    draftDayAssignment: draftAssignments[targetSlot.dateKey] ?? null,
  });

  return visibleSlots.some(
    (definition) =>
      definition.callType.toLowerCase() === targetSlot.callType.toLowerCase()
  );
}

export function evaluateSlotAssignmentForResident(params: {
  slotMap: Map<string, ProgramCallItem | null>;
  targetSlotId: string;
  resident: CallHubResident;
  context: CallHubValidationContext;
  existingCall?: ProgramCallItem | null;
  ignoreCallId?: string | null;
}): SlotAssignmentEvaluation {
  const targetSlot = deserializeSlotId(params.targetSlotId);
  const targetVisible = isTargetSlotVisible({
    slotMap: params.slotMap,
    targetSlotId: params.targetSlotId,
    context: params.context,
  });

  if (!targetVisible) {
    return {
      blockingError: getSlotUnavailableMessage(targetSlot.callType),
      warnings: [],
      slotUnavailable: true,
    };
  }

  const projectedSlotMap = projectResidentOntoSlotMap(
    params.slotMap,
    params.targetSlotId,
    params.resident,
    params.existingCall
  );

  const projectedAssignments = slotMapToCallDraftAssignments(projectedSlotMap).filter(
    (assignment) => assignment.callId !== params.ignoreCallId
  );

  const validation = validateCallHubSchedule({
    assignments: projectedAssignments,
    context: params.context,
    touchedDates: [targetSlot.dateKey],
  });

  const slotErrors = (validation.issuesBySlotId[params.targetSlotId] ?? []).filter(
    (issue) => issue.severity === "error"
  );
  if (slotErrors.length > 0) {
    return {
      blockingError:
        slotErrors[0]?.message ?? "This assignment violates schedule rules.",
      warnings: [],
      slotUnavailable: false,
    };
  }

  const residentErrors = (
    validation.issuesByResidentId[params.resident.rosterId] ?? []
  ).filter(
    (issue) =>
      issue.severity === "error" &&
      (issue.dateKey === targetSlot.dateKey || issue.slotId === params.targetSlotId)
  );
  if (residentErrors.length > 0) {
    return {
      blockingError:
        residentErrors[0]?.message ?? "This resident is not eligible for this slot.",
      warnings: [],
      slotUnavailable: false,
    };
  }

  const slotWarnings = (validation.issuesBySlotId[params.targetSlotId] ?? []).filter(
    (issue) => issue.severity === "warning"
  );
  const residentWarnings = (
    validation.issuesByResidentId[params.resident.rosterId] ?? []
  ).filter(
    (issue) =>
      issue.severity === "warning" &&
      (issue.dateKey === targetSlot.dateKey || issue.slotId === params.targetSlotId)
  );

  return {
    blockingError: null,
    warnings: [...slotWarnings, ...residentWarnings],
    slotUnavailable: false,
  };
}

export function groupEligibleResidentsByPgy(
  residents: SlotPickerEligibleResident[]
): Array<{ label: string; residents: SlotPickerEligibleResident[] }> {
  const grouped = new Map<string, SlotPickerEligibleResident[]>();

  for (const entry of residents) {
    const label = getCallHubPgyGroupLabel(entry.resident);
    const current = grouped.get(label) ?? [];
    current.push(entry);
    grouped.set(label, current);
  }

  const ordered: Array<{ label: string; residents: SlotPickerEligibleResident[] }> = [];

  for (const label of CALL_HUB_PGY_GROUP_ORDER) {
    const groupResidents = grouped.get(label);
    if (!groupResidents?.length) continue;
    groupResidents.sort((left, right) =>
      left.resident.residentName.localeCompare(right.resident.residentName)
    );
    ordered.push({ label, residents: groupResidents });
    grouped.delete(label);
  }

  for (const [label, groupResidents] of grouped.entries()) {
    groupResidents.sort((left, right) =>
      left.resident.residentName.localeCompare(right.resident.residentName)
    );
    ordered.push({ label, residents: groupResidents });
  }

  return ordered;
}

function buildSlotPickerEmptyStateMessage(params: {
  callType: string;
  dateKey: string;
  slotUnavailable: boolean;
  rejectionReasons: string[];
}): string {
  if (params.slotUnavailable) {
    return getSlotUnavailableMessage(params.callType);
  }

  const uniqueReasons = [...new Set(params.rejectionReasons)].slice(0, 3);
  if (uniqueReasons.length > 0) {
    return `No residents are eligible for ${params.callType} on ${params.dateKey}. ${uniqueReasons.join(" ")}`;
  }

  return `No residents are eligible for ${params.callType} on ${params.dateKey}. Residents may be blocked by PGY rules, rotation restrictions, time off, duplicate same-day assignments, or spacing rules.`;
}

export function getEligibleResidentsForSlotPicker(params: {
  slotMap: Map<string, ProgramCallItem | null>;
  targetSlotId: string;
  context: CallHubValidationContext;
  existingCall?: ProgramCallItem | null;
  ignoreCallId?: string | null;
  excludeRosterIds?: string[];
}): SlotPickerEligibilityResult {
  const targetSlot = deserializeSlotId(params.targetSlotId);
  const excluded = new Set(
    (params.excludeRosterIds ?? []).filter((rosterId) => rosterId.trim().length > 0)
  );
  const slotUnavailable = !isTargetSlotVisible({
    slotMap: params.slotMap,
    targetSlotId: params.targetSlotId,
    context: params.context,
  });

  if (slotUnavailable) {
    return {
      groups: [],
      emptyStateMessage: getSlotUnavailableMessage(targetSlot.callType),
      slotUnavailable: true,
    };
  }

  const eligible: SlotPickerEligibleResident[] = [];
  const rejectionReasons: string[] = [];

  for (const resident of params.context.residents) {
    if (excluded.has(resident.rosterId)) continue;

    const evaluation = evaluateSlotAssignmentForResident({
      slotMap: params.slotMap,
      targetSlotId: params.targetSlotId,
      resident,
      context: params.context,
      existingCall: params.existingCall,
      ignoreCallId: params.ignoreCallId,
    });

    if (evaluation.blockingError) {
      rejectionReasons.push(evaluation.blockingError);
      continue;
    }

    eligible.push({
      resident,
      warnings: evaluation.warnings,
    });
  }

  const groups = groupEligibleResidentsByPgy(eligible);

  return {
    groups,
    emptyStateMessage:
      groups.length === 0
        ? buildSlotPickerEmptyStateMessage({
            callType: targetSlot.callType,
            dateKey: targetSlot.dateKey,
            slotUnavailable: false,
            rejectionReasons,
          })
        : null,
    slotUnavailable: false,
  };
}

export function getDropValidationMessage(params: {
  slotMap: Map<string, ProgramCallItem | null>;
  targetSlotId: string;
  resident: CallHubResident;
  context: CallHubValidationContext;
  existingCall?: ProgramCallItem | null;
  ignoreCallId?: string | null;
}): string | null {
  return evaluateSlotAssignmentForResident(params).blockingError;
}

export function formatPublishValidationError(
  validation: CallValidationResult
): string {
  const errors = validation.errors;
  if (errors.length === 0) {
    return "Schedule validation failed. Review the highlighted conflicts.";
  }

  const first = errors[0];
  const suffix =
    errors.length > 1 ? ` (+${errors.length - 1} more blocking issue${errors.length > 2 ? "s" : ""})` : "";
  return `${first.message}${suffix}`;
}

export function getTouchedDatesFromPendingChanges(
  pendingChanges: Array<{
    kind: string;
    slotId?: string;
    slot?: { dateKey: string };
    sourceSlotId?: string;
    targetSlotId?: string;
    firstSlotId?: string;
    secondSlotId?: string;
  }>
): string[] {
  const dates = new Set<string>();

  for (const change of pendingChanges) {
    if (change.kind === "create" && change.slot?.dateKey) {
      dates.add(change.slot.dateKey);
      continue;
    }

    const slotIds = [
      change.slotId,
      change.sourceSlotId,
      change.targetSlotId,
      change.firstSlotId,
      change.secondSlotId,
    ].filter((value): value is string => Boolean(value));

    for (const slotId of slotIds) {
      dates.add(deserializeSlotId(slotId).dateKey);
    }
  }

  return Array.from(dates).sort();
}

export function buildBulkPublishRowsFromSlotMap(params: {
  slotMap: Map<string, ProgramCallItem | null>;
  touchedDateKeys: string[];
  residentsByRosterId: Map<string, CallHubResident>;
}): CallHubBulkPublishRow[] {
  const rows: CallHubBulkPublishRow[] = [];
  const callTypes: Array<"Primary" | "Backup" | "Buddy"> = [
    "Primary",
    "Backup",
    "Buddy",
  ];

  for (const dateKey of params.touchedDateKeys) {
    for (const callType of callTypes) {
      const slotId = serializeSlotId({ dateKey, callType });
      const call = params.slotMap.get(slotId);
      if (!call) continue;

      const rosterId = call.rosterId ?? call.membershipId;
      if (!rosterId) continue;

      const resident = params.residentsByRosterId.get(rosterId);
      if (!resident) continue;

      rows.push({
        residentName: resident.residentName,
        callDate: dateKey,
        callType,
        site: call.site ?? null,
        isHomeCall: call.isHomeCall ?? true,
        notes: call.notes ?? null,
        matchedRosterId: rosterId,
        matchedMembershipId: resident.programMembershipId ?? null,
      });
    }
  }

  return rows;
}

function parsePgyFromTrainingLevel(trainingLevel: string | null | undefined) {
  if (!trainingLevel) return null;
  const match = trainingLevel.match(/pgy-?(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}