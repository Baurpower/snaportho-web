import {
  evaluateMonthlyLimitForResident,
  evaluatePgyEligibility,
  evaluateRotationEligibility,
  evaluateSpacingForResident,
  evaluateWeekendLimitForResident,
  evaluateWeekendPairingForResident,
  getAdjacentWeekendDateKey,
  getRequiredCallTypesFromRules,
  getRuleSeverity,
  isWeekendDateKey,
  normalizeCallType as normalizeEvaluatedCallType,
  normalizeCallTypeList,
  normalizeRuleCode as normalizeEvaluatorRuleCode,
  resolveMatchingRules,
} from "@/lib/workspace/call/rule-evaluator";
import {
  buildResidentIdentityMaps,
  normalizeScheduleResidentId,
} from "@/lib/workspace/call/resident-identity";
import { getResidentStatusDetails } from "@/lib/workspace/pgy";
import {
  extractSlotDefinitions,
  getSlotStatusForDay,
} from "@/lib/workspace/call/rule-definitions";

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationIssueCode =
  | "duplicate_occupied_slot"
  | "duplicate_resident_assignment"
  | "duplicate_resident_same_day"
  | "missing_resident_identity"
  | "invalid_resident_identity"
  | "resident_not_found"
  | "invalid_call_date"
  | "invalid_call_type";

export type CallValidationRule = {
  id?: string | null;
  ruleSetId?: string | null;
  name?: string | null;
  ruleType?: string | null;
  ruleCode?: string | null;
  isEnabled?: boolean | null;
  isHardRule?: boolean | null;
  severity?: Exclude<ValidationSeverity, "info"> | null;
  priority?: number | null;
  scope?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
};

export type CallValidationResident = {
  residentId?: string | null;
  membershipId?: string | null;
  rosterId?: string | null;
  programMembershipId?: string | null;
  residentName?: string | null;
  displayName?: string | null;
  trainingLevel?: string | null;
  residentStatus?: string | null;
  role?: string | null;
  pgyYear?: number | null;
  gradYear?: number | null;
  classYear?: number | null;
  isGraduated?: boolean | null;
  isActiveResident?: boolean | null;
};

export type CallValidationTimeOff = {
  id?: string | null;
  residentId?: string | null;
  membershipId?: string | null;
  rosterId?: string | null;
  programMembershipId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  type?: string | null;
  status?: string | null;
  reason?: string | null;
};

export type CallValidationRotation = {
  id?: string | null;
  residentId?: string | null;
  membershipId?: string | null;
  rosterId?: string | null;
  programMembershipId?: string | null;
  rotationId?: string | null;
  rotationName?: string | null;
  shortName?: string | null;
  category?: string | null;
  service?: string | null;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type CallValidationProgramContext = {
  rules?: CallValidationRule[] | null;
  residents?: CallValidationResident[] | null;
  timeOff?: CallValidationTimeOff[] | null;
  rotations?: CallValidationRotation[] | null;
  metadata?: Record<string, unknown> | null;
};

export type CallSlotIdentity = {
  dateKey: string;
  callType: string;
};

export type CallDraftAssignment = {
  id?: string | null;
  callId?: string | null;
  slotId?: string | null;
  dateKey?: string | null;
  callDate?: string | null;
  callType?: string | null;
  residentId?: string | null;
  membershipId?: string | null;
  rosterId?: string | null;
  programMembershipId?: string | null;
  residentName?: string | null;
  trainingLevel?: string | null;
  startDatetime?: string | null;
  endDatetime?: string | null;
  isDeleted?: boolean | null;
  isActive?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

export type CallValidationIssue = {
  code: ValidationIssueCode | string;
  severity: ValidationSeverity;
  message: string;
  source?: string | null;
  slotId: string | null;
  residentId: string | null;
  rosterId: string | null;
  dateKey: string | null;
  callType: string | null;
  assignmentId: string | null;
  ruleCode: string | null;
  metadata: Record<string, unknown> | null;
};

export type CallValidationResult = {
  issues: CallValidationIssue[];
  errors: CallValidationIssue[];
  issuesBySlotId: Record<string, CallValidationIssue[]>;
  issuesByResidentId: Record<string, CallValidationIssue[]>;
  counts: Record<ValidationSeverity, number>;
  hasErrors: boolean;
  hasWarnings: boolean;
  isValid: boolean;
};

export type CallValidationInput = {
  assignments?: CallDraftAssignment[] | null;
  rules?: CallValidationRule[] | null;
  residents?: CallValidationResident[] | null;
  timeOff?: CallValidationTimeOff[] | null;
  rotations?: CallValidationRotation[] | null;
  context?: CallValidationProgramContext | null;
};

type IntegrityAssignmentContext = {
  assignment: CallDraftAssignment;
  assignmentId: string | null;
  residentId: string | null;
  rosterId: string | null;
  programMembershipId: string | null;
  rawDateKey: string | null;
  normalizedDateKey: string | null;
  rawCallType: string | null;
  normalizedCallType: string | null;
  slotId: string | null;
};

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDateKey(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const date = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(date.getTime())) return null;
  return normalized;
}

function getAssignmentId(assignment: CallDraftAssignment) {
  return normalizeString(assignment.id) ?? null;
}

function getResidentIdentity(assignment: CallDraftAssignment) {
  const rosterId =
    normalizeRosterId(assignment.rosterId) ??
    normalizeRosterId(assignment.residentId) ??
    normalizeRosterId(assignment.membershipId);
  const residentId = rosterId;
  const programMembershipId = normalizeRosterId(assignment.programMembershipId);

  return { residentId, rosterId, programMembershipId };
}

function isActiveAssignment(assignment: CallDraftAssignment) {
  if (assignment.isDeleted) return false;
  if (assignment.isActive === false) return false;
  return true;
}

function getIntegrityAssignmentContext(
  assignment: CallDraftAssignment
): IntegrityAssignmentContext {
  const assignmentId = getAssignmentId(assignment);
  const { residentId, rosterId, programMembershipId } = getResidentIdentity(
    assignment
  );
  const rawDateKey =
    normalizeString(assignment.callDate) ?? normalizeString(assignment.dateKey);
  const normalizedDateKey = normalizeDateKey(rawDateKey);
  const rawCallType = normalizeString(assignment.callType);
  const normalizedCallType = rawCallType ? normalizeCallType(rawCallType) : null;
  const slotId =
    normalizedDateKey && normalizedCallType
      ? serializeSlotId({
          dateKey: normalizedDateKey,
          callType: normalizedCallType,
        })
      : null;

  return {
    assignment,
    assignmentId,
    residentId,
    rosterId,
    programMembershipId,
    rawDateKey,
    normalizedDateKey,
    rawCallType,
    normalizedCallType,
    slotId,
  };
}

export function normalizeCallType(callType: string | null | undefined) {
  const normalized = normalizeString(callType);

  if (!normalized) return "Primary";
  return normalized;
}

export function normalizeRuleCode(ruleCode: string | null | undefined) {
  return normalizeEvaluatorRuleCode(ruleCode);
}

export function normalizeRosterId(value: string | null | undefined) {
  return normalizeScheduleResidentId(value);
}

export function serializeSlotId(slot: CallSlotIdentity) {
  return `${slot.dateKey}__${normalizeCallType(slot.callType)}`;
}

export function deserializeSlotId(id: string): CallSlotIdentity {
  const [dateKey, ...rest] = id.split("__");

  return {
    dateKey,
    callType: rest.join("__") || "Primary",
  };
}

export function isEditableQuickCall(call: {
  startDatetime?: string | null;
  endDatetime?: string | null;
  callDate?: string | null;
}) {
  return !call.startDatetime && !call.endDatetime && !!normalizeDateKey(call.callDate);
}

export function createValidationIssue(
  issue: Partial<CallValidationIssue> &
    Pick<CallValidationIssue, "code" | "severity" | "message">
) {
  return {
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    source: issue.source ?? null,
    slotId: issue.slotId ?? null,
    residentId: issue.residentId ?? null,
    rosterId: issue.rosterId ?? null,
    dateKey: issue.dateKey ?? null,
    callType: issue.callType ? normalizeCallType(issue.callType) : null,
    assignmentId: issue.assignmentId ?? null,
    ruleCode: normalizeRuleCode(issue.ruleCode) ?? null,
    metadata: issue.metadata ?? null,
  } satisfies CallValidationIssue;
}

export function groupIssuesBySlotId(issues: CallValidationIssue[]) {
  const grouped: Record<string, CallValidationIssue[]> = {};

  for (const issue of issues) {
    if (!issue.slotId) continue;
    grouped[issue.slotId] ??= [];
    grouped[issue.slotId].push(issue);
  }

  return grouped;
}

export function groupIssuesByResidentId(issues: CallValidationIssue[]) {
  const grouped: Record<string, CallValidationIssue[]> = {};

  for (const issue of issues) {
    const residentKey = issue.residentId ?? issue.rosterId;

    if (!residentKey) continue;

    grouped[residentKey] ??= [];
    grouped[residentKey].push(issue);
  }

  return grouped;
}

export function buildValidationResult(issues: CallValidationIssue[]) {
  const counts: Record<ValidationSeverity, number> = {
    error: 0,
    warning: 0,
    info: 0,
  };

  for (const issue of issues) {
    counts[issue.severity] += 1;
  }

  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error"),
    issuesBySlotId: groupIssuesBySlotId(issues),
    issuesByResidentId: groupIssuesByResidentId(issues),
    counts,
    hasErrors: counts.error > 0,
    hasWarnings: counts.warning > 0,
    isValid: counts.error === 0,
  } satisfies CallValidationResult;
}

function validateIntegrity(input: CallValidationInput) {
  const issues: CallValidationIssue[] = [];
  const assignments = input.assignments ?? [];
  const activeAssignments = assignments.filter(isActiveAssignment);
  const contexts = activeAssignments.map(getIntegrityAssignmentContext);
  const { residentByIdentity } = getResidentMaps(input);

  const slotMap = new Map<string, IntegrityAssignmentContext[]>();
  const residentSlotMap = new Map<string, IntegrityAssignmentContext[]>();
  const residentDayMap = new Map<string, IntegrityAssignmentContext[]>();

  for (const context of contexts) {
    if (!context.residentId && !context.rosterId) {
      issues.push(
        createValidationIssue({
          code: context.programMembershipId
            ? "invalid_resident_identity"
            : "missing_resident_identity",
          severity: "error",
          message: context.programMembershipId
            ? "Assignment is missing canonical rosterId and only includes programMembershipId."
            : "Assignment is missing canonical resident identity (rosterId).",
          slotId: context.slotId,
          residentId: context.residentId,
          rosterId: context.rosterId,
          dateKey: context.normalizedDateKey ?? context.rawDateKey,
          callType: context.normalizedCallType ?? context.rawCallType,
          assignmentId: context.assignmentId,
        })
      );
    }

    if (!context.normalizedDateKey) {
      issues.push(
        createValidationIssue({
          code: "invalid_call_date",
          severity: "error",
          message: "Assignment is missing a valid call date.",
          slotId: null,
          residentId: context.residentId,
          rosterId: context.rosterId,
          dateKey: context.rawDateKey,
          callType: context.normalizedCallType ?? context.rawCallType,
          assignmentId: context.assignmentId,
        })
      );
    }

    if (!context.rawCallType) {
      issues.push(
        createValidationIssue({
          code: "invalid_call_type",
          severity: "error",
          message: "Assignment is missing a valid call type.",
          slotId: null,
          residentId: context.residentId,
          rosterId: context.rosterId,
          dateKey: context.normalizedDateKey ?? context.rawDateKey,
          callType: context.rawCallType,
          assignmentId: context.assignmentId,
        })
      );
    }

    const resident =
      (context.rosterId && residentByIdentity.get(context.rosterId)) ||
      (context.residentId && residentByIdentity.get(context.residentId)) ||
      null;

    if ((context.residentId || context.rosterId) && !resident) {
      issues.push(
        createValidationIssue({
          code: "resident_not_found",
          severity: "error",
          message: `Roster ID ${context.residentId ?? context.rosterId} is not loaded for this program. This may be stale data or wrong program scope.`,
          slotId: context.slotId,
          residentId: context.residentId,
          rosterId: context.rosterId,
          dateKey: context.normalizedDateKey ?? context.rawDateKey,
          callType: context.normalizedCallType ?? context.rawCallType,
          assignmentId: context.assignmentId,
        })
      );
    }

    if (!context.slotId || !context.normalizedDateKey || !context.normalizedCallType) {
      continue;
    }

    const slotKey = context.slotId;
    const residentKey = context.residentId ?? context.rosterId;

    slotMap.set(slotKey, [...(slotMap.get(slotKey) ?? []), context]);

    if (residentKey) {
      const residentSlotKey = `${residentKey}__${slotKey}`;
      residentSlotMap.set(residentSlotKey, [
        ...(residentSlotMap.get(residentSlotKey) ?? []),
        context,
      ]);

      const residentDayKey = `${residentKey}__${context.normalizedDateKey}`;
      residentDayMap.set(residentDayKey, [
        ...(residentDayMap.get(residentDayKey) ?? []),
        context,
      ]);
    }
  }

  for (const [slotId, slotAssignments] of slotMap.entries()) {
    if (slotAssignments.length <= 1) continue;

    for (const context of slotAssignments) {
      issues.push(
        createValidationIssue({
          code: "duplicate_occupied_slot",
          severity: "error",
          message: "Multiple active assignments occupy the same call slot.",
          slotId,
          residentId: context.residentId,
          rosterId: context.rosterId,
          dateKey: context.normalizedDateKey,
          callType: context.normalizedCallType,
          assignmentId: context.assignmentId,
          metadata: {
            conflictingAssignmentIds: slotAssignments
              .map((item) => item.assignmentId)
              .filter((value): value is string => Boolean(value)),
          },
        })
      );
    }
  }

  for (const residentAssignments of residentSlotMap.values()) {
    if (residentAssignments.length <= 1) continue;

    for (const context of residentAssignments) {
      issues.push(
        createValidationIssue({
          code: "duplicate_resident_assignment",
          severity: "error",
          message:
            "Resident or roster is assigned more than once to the same date and call type.",
          slotId: context.slotId,
          residentId: context.residentId,
          rosterId: context.rosterId,
          dateKey: context.normalizedDateKey,
          callType: context.normalizedCallType,
          assignmentId: context.assignmentId,
          metadata: {
            conflictingAssignmentIds: residentAssignments
              .map((item) => item.assignmentId)
              .filter((value): value is string => Boolean(value)),
          },
        })
      );
    }
  }

  for (const residentAssignments of residentDayMap.values()) {
    if (residentAssignments.length <= 1) continue;

    for (const context of residentAssignments) {
      issues.push(
        createValidationIssue({
          code: "duplicate_resident_same_day",
          severity: "error",
          message: "Resident is assigned to more than one call slot on the same date.",
          slotId: context.slotId,
          residentId: context.residentId,
          rosterId: context.rosterId,
          dateKey: context.normalizedDateKey,
          callType: context.normalizedCallType,
          assignmentId: context.assignmentId,
          metadata: {
            conflictingAssignmentIds: residentAssignments
              .map((item) => item.assignmentId)
              .filter((value): value is string => Boolean(value)),
            conflictingCallTypes: residentAssignments
              .map((item) => item.normalizedCallType)
              .filter((value): value is string => Boolean(value)),
          },
        })
      );
    }
  }

  return issues;
}

function isDateWithinInclusiveRange(
  dateKey: string,
  startDate: string,
  endDate: string
) {
  return dateKey >= startDate && dateKey <= endDate;
}

function getResolvedRuleSeverity(rule: CallValidationRule) {
  return getRuleSeverity(rule);
}

function resolveValidationRules(
  rules: CallValidationRule[] | null | undefined,
  supportedRuleCodes: string[]
) {
  return resolveMatchingRules(rules, supportedRuleCodes).map((match) => ({
    id: normalizeString(match.rule.id) ?? null,
    name: normalizeString(match.rule.name) ?? null,
    ruleType: normalizeString(match.rule.ruleType) ?? null,
    ruleCode: match.ruleCode,
    severity: getResolvedRuleSeverity(match.rule),
    config: match.config,
  }));
}

function getResidentMaps(input: CallValidationInput) {
  const residents = input.residents ?? [];
  const { residentById, residentIdByProgramMembershipId } =
    buildResidentIdentityMaps(
      residents.map((resident) => ({
        ...resident,
        residentId:
          normalizeRosterId(resident.residentId) ??
          normalizeRosterId(resident.rosterId) ??
          normalizeRosterId(resident.membershipId),
        rosterId:
          normalizeRosterId(resident.rosterId) ??
          normalizeRosterId(resident.residentId) ??
          normalizeRosterId(resident.membershipId),
        membershipId:
          normalizeRosterId(resident.membershipId) ??
          normalizeRosterId(resident.rosterId) ??
          normalizeRosterId(resident.residentId),
      }))
    );

  return {
    residents,
    residentByIdentity: residentById,
    residentIdByProgramMembershipId,
  };
}

export function validateSpacingRule(input: CallValidationInput) {
  const issues: CallValidationIssue[] = [];
  const rules = resolveValidationRules(input.rules, [
    "min_days_between_assignments",
    "minimum_spacing",
    "avoid_consecutive_call",
  ]);
  const assignments = (input.assignments ?? []).filter(isActiveAssignment);

  if (rules.length === 0 || assignments.length === 0) {
    return issues;
  }

  const contexts = assignments
    .map((assignment) => ({
      assignment,
      context: getIntegrityAssignmentContext(assignment),
    }))
    .filter(
      (entry): entry is {
        assignment: CallDraftAssignment;
        context: IntegrityAssignmentContext & { normalizedDateKey: string };
      } =>
        Boolean(entry.context.normalizedDateKey)
    );

  const assignmentsByResident = new Map<
    string,
    Array<{ assignment: CallDraftAssignment; context: IntegrityAssignmentContext & { normalizedDateKey: string } }>
  >();

  for (const entry of contexts) {
    const residentKey = entry.context.residentId ?? entry.context.rosterId;
    if (!residentKey) continue;

    assignmentsByResident.set(residentKey, [
      ...(assignmentsByResident.get(residentKey) ?? []),
      entry,
    ]);
  }

  for (const residentAssignments of assignmentsByResident.values()) {
    const sortedAssignments = [...residentAssignments].sort((a, b) =>
      a.context.normalizedDateKey.localeCompare(b.context.normalizedDateKey)
    );

    for (const { assignment, context } of sortedAssignments) {
      const otherAssignments = sortedAssignments.filter(
        (other) => other.context.assignmentId !== context.assignmentId
      );
      const spacingViolations = evaluateSpacingForResident({
        assignedDates: otherAssignments.map(
          (other) => other.context.normalizedDateKey
        ),
        dateKey: context.normalizedDateKey,
        rules,
      });

      for (const violation of spacingViolations) {
        const conflictingAssignment = otherAssignments.find(
          (other) =>
            other.context.normalizedDateKey ===
            violation.metadata?.conflictingDateKey
        );

        issues.push(
          createValidationIssue({
            code: "spacing_rule",
            ruleCode: violation.ruleCode,
            severity: violation.severity,
            source: "rule",
            message: violation.message,
            slotId: context.slotId,
            residentId: context.residentId,
            rosterId: context.rosterId,
            dateKey: context.normalizedDateKey,
            callType: context.normalizedCallType ?? context.rawCallType,
            assignmentId: assignment.callId ?? context.assignmentId,
            metadata: {
              blockingRuleId: normalizeString(violation.rule.id) ?? null,
              blockingRuleName: normalizeString(violation.rule.name) ?? null,
              conflictingAssignmentId:
                conflictingAssignment?.context.assignmentId ?? null,
              ...violation.metadata,
            },
          })
        );
      }
    }
  }

  return issues;
}

export function validateMonthlyLimitRule(input: CallValidationInput) {
  const issues: CallValidationIssue[] = [];
  const rules = resolveValidationRules(input.rules, [
    "max_calls_per_month",
    "max_monthly_calls",
  ]);
  const assignments = (input.assignments ?? []).filter(isActiveAssignment);

  if (rules.length === 0 || assignments.length === 0) {
    return issues;
  }

  const countsByResidentMonth = new Map<string, number>();
  const contexts = assignments.map((assignment) => ({
    assignment,
    context: getIntegrityAssignmentContext(assignment),
  }));

  for (const { context } of contexts) {
    const residentKey = context.residentId ?? context.rosterId;
    const dateKey = context.normalizedDateKey;

    if (!residentKey || !dateKey) continue;

    const monthKey = dateKey.slice(0, 7);
    const aggregateKey = `${residentKey}__${monthKey}`;
    countsByResidentMonth.set(aggregateKey, (countsByResidentMonth.get(aggregateKey) ?? 0) + 1);
  }

  for (const { assignment, context } of contexts) {
    const residentKey = context.residentId ?? context.rosterId;
    const dateKey = context.normalizedDateKey;

    if (!residentKey || !dateKey) continue;

    const monthKey = dateKey.slice(0, 7);
    const aggregateKey = `${residentKey}__${monthKey}`;
    const residentMonthCount = countsByResidentMonth.get(aggregateKey) ?? 0;

    for (const violation of evaluateMonthlyLimitForResident({
      assignmentCount: residentMonthCount,
      rules,
    })) {
      issues.push(
        createValidationIssue({
          code: "monthly_limit",
          ruleCode: violation.ruleCode,
          severity: violation.severity,
          source: "rule",
          message: `Resident exceeds the ${violation.message.toLowerCase()}.`,
          slotId: context.slotId,
          residentId: context.residentId,
          rosterId: context.rosterId,
          dateKey,
          callType: context.normalizedCallType ?? context.rawCallType,
          assignmentId: assignment.callId ?? context.assignmentId,
          metadata: {
            blockingRuleId: normalizeString(violation.rule.id) ?? null,
            blockingRuleName: normalizeString(violation.rule.name) ?? null,
            monthKey,
            ...violation.metadata,
          },
        })
      );
    }
  }

  return issues;
}

export function validateWeekendRule(input: CallValidationInput) {
  const issues: CallValidationIssue[] = [];
  const rules = resolveValidationRules(input.rules, [
    "max_weekends_per_month",
    "max_weekend_calls",
    "weekend_pairing",
  ]);
  const assignments = (input.assignments ?? []).filter(isActiveAssignment);

  if (rules.length === 0 || assignments.length === 0) {
    return issues;
  }

  const contexts = assignments.map((assignment) => ({
    assignment,
    context: getIntegrityAssignmentContext(assignment),
  }));

  const weekendBucketsByResidentMonth = new Map<string, Set<string>>();

  for (const { context } of contexts) {
    const residentKey = context.residentId ?? context.rosterId;
    const dateKey = context.normalizedDateKey;

    if (!residentKey || !dateKey) continue;

    const date = new Date(`${dateKey}T00:00:00`);
    const day = date.getDay();
    if (day !== 0 && day !== 6) continue;

    const bucketDate = new Date(date);
    if (day === 0) {
      bucketDate.setDate(bucketDate.getDate() - 1);
    }

    const bucketKey = bucketDate.toISOString().slice(0, 10);
    const monthKey = dateKey.slice(0, 7);
    const aggregateKey = `${residentKey}__${monthKey}`;
    const existing = weekendBucketsByResidentMonth.get(aggregateKey) ?? new Set<string>();
    existing.add(bucketKey);
    weekendBucketsByResidentMonth.set(aggregateKey, existing);
  }

  const assignmentByResidentDateType = new Map<string, IntegrityAssignmentContext>();
  for (const { context } of contexts) {
    const residentKey = context.residentId ?? context.rosterId;
    if (!residentKey || !context.normalizedDateKey || !context.normalizedCallType) continue;

    assignmentByResidentDateType.set(
      `${residentKey}__${context.normalizedDateKey}__${context.normalizedCallType}`,
      context
    );
  }

  for (const { assignment, context } of contexts) {
    const residentKey = context.residentId ?? context.rosterId;
    const dateKey = context.normalizedDateKey;

    if (!residentKey || !dateKey) continue;

    const weekendCount = weekendBucketsByResidentMonth.get(
      `${residentKey}__${dateKey.slice(0, 7)}`
    )?.size ?? 0;
    const adjacentDateKey = getAdjacentWeekendDateKey(dateKey);
    const adjacentSlotOccupant = adjacentDateKey
      ? contexts.find(
          (entry) =>
            entry.context.normalizedDateKey === adjacentDateKey &&
            entry.context.normalizedCallType === context.normalizedCallType
        )
      : null;
    const adjacentResidentId =
      adjacentSlotOccupant?.context.residentId ??
      adjacentSlotOccupant?.context.rosterId ??
      null;

    for (const violation of evaluateWeekendLimitForResident({
      dateKey,
      weekendCount,
      rules,
    })) {
      issues.push(
        createValidationIssue({
          code: "weekend_limit",
          ruleCode: violation.ruleCode,
          severity: violation.severity,
          source: "rule",
          message: `Resident exceeds the ${violation.message.toLowerCase()}.`,
          slotId: context.slotId,
          residentId: context.residentId,
          rosterId: context.rosterId,
          dateKey,
          callType: context.normalizedCallType ?? context.rawCallType,
          assignmentId: assignment.callId ?? context.assignmentId,
          metadata: {
            blockingRuleId: normalizeString(violation.rule.id) ?? null,
            blockingRuleName: normalizeString(violation.rule.name) ?? null,
            monthKey: dateKey.slice(0, 7),
            ...violation.metadata,
          },
        })
      );
    }

    if (context.normalizedCallType) {
      const adjacentAssignment = adjacentDateKey
        ? assignmentByResidentDateType.get(
            `${residentKey}__${adjacentDateKey}__${context.normalizedCallType}`
          )
        : null;

      // Skip weekend pairing evaluation for Buddy and other non-Primary/Backup
      // slot types; normalizeEvaluatedCallType returns null for them.
      const pairingCallType = normalizeEvaluatedCallType(context.normalizedCallType);

      for (const violation of (pairingCallType ? evaluateWeekendPairingForResident({
        residentId: residentKey,
        adjacentResidentId: adjacentAssignment ? residentKey : adjacentResidentId,
        dateKey,
        callType: pairingCallType,
        rules,
      }) : [])) {
        if (adjacentAssignment) continue;

        issues.push(
          createValidationIssue({
            code: "weekend_pairing",
            ruleCode: violation.ruleCode,
            severity: violation.severity,
            source: "rule",
            message: `${violation.message}.`,
            slotId: context.slotId,
            residentId: context.residentId,
            rosterId: context.rosterId,
            dateKey,
            callType: context.normalizedCallType,
            assignmentId: assignment.callId ?? context.assignmentId,
            metadata: {
              blockingRuleId: normalizeString(violation.rule.id) ?? null,
              blockingRuleName: normalizeString(violation.rule.name) ?? null,
              adjacentDateKey,
              ...violation.metadata,
            },
          })
        );
      }
    }
  }

  return issues;
}

export function validatePgyRestrictionRule(input: CallValidationInput) {
  const issues: CallValidationIssue[] = [];
  const rules = resolveValidationRules(input.rules, [
    "restrict_call_type_by_pgy",
    "pgy_slot_restriction",
  ]);
  const assignments = (input.assignments ?? []).filter(isActiveAssignment);

  if (rules.length === 0 || assignments.length === 0) {
    return issues;
  }

  const { residentByIdentity } = getResidentMaps(input);

  for (const assignment of assignments) {
    const context = getIntegrityAssignmentContext(assignment);
    const resident =
      (context.rosterId && residentByIdentity.get(context.rosterId)) ||
      (context.residentId && residentByIdentity.get(context.residentId)) ||
      null;

    if (!resident || !context.normalizedCallType) {
      continue;
    }

    const residentStatus = getResidentStatusDetails(
      resident.gradYear ?? null,
      context.normalizedDateKey ?? undefined
    );

    if (!residentStatus.isActiveResident) {
      const residentName =
        resident.residentName ?? resident.displayName ?? assignment.residentName ?? "Resident";
      issues.push(
        createValidationIssue({
          code: "pgy_restriction",
          ruleCode: "restrict_call_type_by_pgy",
          severity: "error",
          source: "rule",
          message: residentStatus.isGraduated
            ? `${residentName} is graduated and is not eligible for ${context.normalizedCallType} call.`
            : `${residentName} is missing a valid grad year and is not eligible for ${context.normalizedCallType} call.`,
          slotId: context.slotId,
          residentId: context.residentId,
          rosterId: context.rosterId,
          dateKey: context.normalizedDateKey,
          callType: context.normalizedCallType,
          assignmentId: assignment.callId ?? context.assignmentId,
          metadata: null,
        })
      );
      continue;
    }

    if (typeof residentStatus.pgyYear !== "number") {
      continue;
    }

    // normalizeEvaluatedCallType only recognises Primary/Backup; skip PGY
    // evaluation entirely for Buddy and other custom slot types rather than
    // misclassifying them as Primary, which would produce false violations.
    const evaluatedCallType = normalizeEvaluatedCallType(context.normalizedCallType);
    if (!evaluatedCallType) continue;

    const pgyViolations = evaluatePgyEligibility({
      resident,
      callType: evaluatedCallType,
      rules,
      effectiveDate: context.normalizedDateKey,
    });

    for (const violation of pgyViolations) {
      const residentName =
        resident.residentName ?? resident.displayName ?? assignment.residentName ?? "Resident";
      const message = violation.message.includes("not allowed to take call")
        ? `${residentName} is PGY-${residentStatus.pgyYear} and is not eligible for call.`
        : `${residentName} is PGY-${residentStatus.pgyYear} and is not eligible for ${context.normalizedCallType} call.`;

      issues.push(
        createValidationIssue({
          code: "pgy_restriction",
          ruleCode: violation.ruleCode,
          severity: violation.severity,
          source: "rule",
          message,
          slotId: context.slotId,
          residentId: context.residentId,
          rosterId: context.rosterId,
          dateKey: context.normalizedDateKey,
          callType: context.normalizedCallType,
          assignmentId: assignment.callId ?? context.assignmentId,
          metadata: {
            blockingRuleId: normalizeString(violation.rule.id) ?? null,
            blockingRuleName: normalizeString(violation.rule.name) ?? null,
            ...violation.metadata,
          },
        })
      );
    }
  }

  return issues;
}

export function validateRequiredSlotRule(input: CallValidationInput) {
  const issues: CallValidationIssue[] = [];
  const rules = resolveValidationRules(input.rules, ["required_daily_call_slots"]);
  const touchedDates = Array.isArray(input.context?.metadata?.touchedDates)
    ? input.context?.metadata?.touchedDates
        .map((value) => normalizeDateKey(value))
        .filter((value): value is string => Boolean(value))
    : [];
  const assignments = (input.assignments ?? []).filter(isActiveAssignment);

  if (rules.length === 0 || touchedDates.length === 0) {
    return issues;
  }

  const activeSlotIds = new Set(
    assignments
      .map((assignment) => getIntegrityAssignmentContext(assignment))
      .filter(
        (context): context is IntegrityAssignmentContext & { slotId: string } => Boolean(context.slotId)
      )
      .map((context) => context.slotId)
  );

  const requiredCallTypes = getRequiredCallTypesFromRules(rules);
  if (requiredCallTypes.length === 0) return issues;

  for (const dateKey of touchedDates) {
    for (const callType of requiredCallTypes) {
      const slotId = serializeSlotId({ dateKey, callType });

      if (activeSlotIds.has(slotId)) continue;

      const blockingRule = rules.find((rule) =>
        normalizeCallTypeList(rule.config.requiredCallTypes).includes(callType)
      );

      issues.push(
        createValidationIssue({
          code: "missing_required_slot",
          ruleCode: blockingRule?.ruleCode ?? "required_daily_call_slots",
          severity: blockingRule?.severity ?? "error",
          source: "rule",
          message: `Required ${callType} call slot is unassigned on ${dateKey}.`,
          slotId,
          residentId: null,
          rosterId: null,
          dateKey,
          callType,
          assignmentId: null,
          metadata: {
            blockingRuleId: blockingRule?.id ?? null,
            blockingRuleName: blockingRule?.name ?? null,
            requiredCallTypes,
          },
        })
      );
    }
  }

  return issues;
}

export function validateTimeOffRule(input: CallValidationInput) {
  const issues: CallValidationIssue[] = [];
  const assignments = (input.assignments ?? []).filter(isActiveAssignment);
  const timeOff = input.timeOff ?? [];
  const { residentByIdentity } = getResidentMaps(input);

  for (const assignment of assignments) {
    const context = getIntegrityAssignmentContext(assignment);

    if (!context.normalizedDateKey) continue;

    for (const entry of timeOff) {
      const timeOffStart = normalizeDateKey(entry.startDate);
      const timeOffEnd = normalizeDateKey(entry.endDate);

      if (!timeOffStart || !timeOffEnd) continue;

      const timeOffResidentId =
        normalizeRosterId(entry.residentId) ??
        normalizeRosterId(entry.rosterId) ??
        normalizeRosterId(entry.membershipId);

      const matchesResident =
        Boolean(context.residentId && timeOffResidentId === context.residentId);

      if (!matchesResident) continue;

      if (
        !isDateWithinInclusiveRange(
          context.normalizedDateKey,
          timeOffStart,
          timeOffEnd
        )
      ) {
        continue;
      }

      const resident =
        (context.rosterId && residentByIdentity.get(context.rosterId)) ||
        (context.residentId && residentByIdentity.get(context.residentId)) ||
        null;
      const residentName =
        resident?.residentName ??
        resident?.displayName ??
        assignment.residentName ??
        "Resident";

      issues.push(
        createValidationIssue({
          code: "time_off",
          ruleCode: "time_off",
          severity: "error",
          source: "availability",
          message: `${residentName} is unavailable on ${context.normalizedDateKey} due to approved time off.`,
          slotId: context.slotId,
          residentId: context.residentId,
          rosterId: context.rosterId,
          dateKey: context.normalizedDateKey,
          callType: context.normalizedCallType ?? context.rawCallType,
          assignmentId: assignment.callId ?? context.assignmentId,
          metadata: {
            timeOffId: entry.id ?? null,
            timeOffType: entry.type ?? null,
            timeOffStatus: entry.status ?? null,
            timeOffReason: entry.reason ?? null,
          },
        })
      );
    }
  }

  return issues;
}

export function validateRotationConflictRule(input: CallValidationInput) {
  const issues: CallValidationIssue[] = [];
  const assignments = (input.assignments ?? []).filter(isActiveAssignment);
  const rotations = input.rotations ?? [];
  const { residentByIdentity } = getResidentMaps(input);
  const rotationRules = resolveValidationRules(input.rules, ["restrict_call_by_rotation"]);

  if (rotationRules.length === 0) {
    return issues;
  }

  for (const assignment of assignments) {
    const context = getIntegrityAssignmentContext(assignment);

    if (!context.normalizedDateKey) continue;
    if (!context.normalizedCallType) continue;

    const matchingRotations = rotations.filter((rotation) => {
      const rotationStart = normalizeDateKey(rotation.startDate);
      const rotationEnd = normalizeDateKey(rotation.endDate);

      if (!rotationStart || !rotationEnd) return false;

      const rotationResidentId =
        normalizeRosterId(rotation.residentId) ??
        normalizeRosterId(rotation.rosterId) ??
        normalizeRosterId(rotation.membershipId);

      const matchesResident =
        Boolean(context.residentId && rotationResidentId === context.residentId);

      if (!matchesResident) return false;

      return context.normalizedDateKey
        ? isDateWithinInclusiveRange(
            context.normalizedDateKey,
            rotationStart,
            rotationEnd
          )
        : false;
    });

    if (matchingRotations.length === 0) continue;

    for (const rotation of matchingRotations) {
      const normalizedRotationId = normalizeRosterId(rotation.rotationId);
      if (!normalizedRotationId) continue;

      const rotationViolations = evaluateRotationEligibility({
        rotationIds: [normalizedRotationId],
        callType:
          normalizeEvaluatedCallType(context.normalizedCallType) ?? "Primary",
        rules: rotationRules,
      });

      for (const violation of rotationViolations) {
        const resident =
          (context.rosterId && residentByIdentity.get(context.rosterId)) ||
          (context.residentId && residentByIdentity.get(context.residentId)) ||
          null;
        const residentName =
          resident?.residentName ??
          resident?.displayName ??
          assignment.residentName ??
          "Resident";
        const rotationName =
          rotation.rotationName ??
          rotation.shortName ??
          rotation.service ??
          "this rotation";

        issues.push(
          createValidationIssue({
            code: "rotation_conflict",
            ruleCode: violation.ruleCode,
            severity: violation.severity,
            source: "availability",
            message: `${residentName} is on ${rotationName} on ${context.normalizedDateKey}, which is not eligible for call.`,
            slotId: context.slotId,
            residentId: context.residentId,
            rosterId: context.rosterId,
            dateKey: context.normalizedDateKey,
            callType: context.normalizedCallType,
            assignmentId: assignment.callId ?? context.assignmentId,
            metadata: {
              rotationAssignmentId: rotation.id ?? null,
              rotationId: rotation.rotationId ?? null,
              rotationName: rotation.rotationName ?? null,
              rotationCategory: rotation.category ?? null,
              rotationService: rotation.service ?? null,
              rotationStartDate: rotation.startDate ?? null,
              rotationEndDate: rotation.endDate ?? null,
              blockingRuleId: normalizeString(violation.rule.id) ?? null,
              blockingRuleCode: violation.ruleCode,
              ...violation.metadata,
            },
          })
        );
      }
    }
  }

  return issues;
}

/**
 * Validates conditional slot definitions where requiredWhenVisible === true.
 *
 * For each date in touchedDates, finds the Primary resident's PGY year, evaluates
 * which conditional slot definitions are visible (and required), then flags any
 * that are missing. Slots with requiredWhenVisible === false are never flagged.
 *
 * This supplements validateRequiredSlotRule which only handles always-required slots
 * from the required_daily_call_slots rule.
 */
export function validateConditionalRequiredSlots(input: CallValidationInput) {
  const issues: CallValidationIssue[] = [];

  const rulesRaw = input.rules ?? input.context?.rules ?? [];
  // extractSlotDefinitions expects rules with rule_type or type field
  const slotDefs = extractSlotDefinitions(
    rulesRaw.map((r) => ({
      id: normalizeString(r.id) ?? "",
      name: normalizeString(r.name) ?? "",
      rule_type: normalizeString(r.ruleType ?? r.ruleCode) ?? undefined,
      type: normalizeString(r.ruleType ?? r.ruleCode) ?? undefined,
      is_enabled: r.isEnabled !== false,
      config: (r.config as Record<string, unknown>) ?? {},
    }))
  );

  // Only handle conditional slot definitions with requiredWhenVisible=true.
  const conditionalRequired = slotDefs.filter(
    (def) => def.requiredMode === "conditional" && def.requiredWhenVisible !== false
  );

  if (conditionalRequired.length === 0) return issues;

  const touchedDates = Array.isArray(input.context?.metadata?.touchedDates)
    ? input.context?.metadata?.touchedDates
        .map((value) => normalizeDateKey(value))
        .filter((value): value is string => Boolean(value))
    : [];

  if (touchedDates.length === 0) return issues;

  const activeAssignments = (input.assignments ?? []).filter(isActiveAssignment);

  // Build lookup: dateKey → Primary roster ID
  const primaryByDate = new Map<string, string>();
  for (const assignment of activeAssignments) {
    const ctx = getIntegrityAssignmentContext(assignment);
    if (!ctx.normalizedDateKey || !ctx.residentId) continue;
    if ((ctx.normalizedCallType ?? "").toLowerCase() === "primary") {
      primaryByDate.set(ctx.normalizedDateKey, ctx.residentId);
    }
  }

  // Build resident PGY lookup keyed by roster ID
  const { residentByIdentity } = getResidentMaps(input);
  const pgyByRosterId = new Map<string, number | null>();
  for (const [id, resident] of residentByIdentity.entries()) {
    const status = getResidentStatusDetails(resident.gradYear ?? null);
    pgyByRosterId.set(id, status.pgyYear ?? null);
  }

  // Build active slot set for quick lookup
  const activeSlotIds = new Set(
    activeAssignments
      .map((a) => getIntegrityAssignmentContext(a))
      .filter((ctx): ctx is ReturnType<typeof getIntegrityAssignmentContext> & { slotId: string } =>
        Boolean(ctx.slotId)
      )
      .map((ctx) => ctx.slotId)
  );

  for (const dateKey of touchedDates) {
    const primaryRosterId = primaryByDate.get(dateKey) ?? null;
    const primaryPgyYear = primaryRosterId ? (pgyByRosterId.get(primaryRosterId) ?? null) : null;

    const date = new Date(`${dateKey}T00:00:00`);
    const dayOfWeek = date.getDay();

    for (const def of conditionalRequired) {
      const { isRequired } = getSlotStatusForDay({
        def,
        dayOfWeek,
        primaryPgyYear,
        hasAssignment: false,
      });

      if (!isRequired) continue;

      const callType = def.callType;
      const slotId = serializeSlotId({ dateKey, callType });

      if (activeSlotIds.has(slotId)) continue;

      issues.push(
        createValidationIssue({
          code: "missing_required_slot",
          ruleCode: "conditional_slot_required",
          severity: "error",
          source: "rule",
          message: `Required ${callType} slot "${def.label}" is unassigned on ${dateKey} (condition: Primary PGY ${def.condition?.pgyYears?.join(" or ") ?? "?"}).`,
          slotId,
          residentId: null,
          rosterId: null,
          dateKey,
          callType,
          assignmentId: null,
          metadata: {
            slotDefinitionId: def.id,
            slotLabel: def.label,
            primaryRosterId,
            primaryPgyYear,
            conditionPgyYears: def.condition?.pgyYears ?? [],
          },
        })
      );
    }
  }

  return issues;
}

/**
 * Validates `max_calls_for_rotation` rules.
 *
 * For each rule, finds residents whose rotation assignment overlaps the call
 * dates and counts how many relevant call days they have in the period.
 * Issues a violation against every over-limit assignment so the UI can
 * highlight the exact rows that need to be fixed.
 *
 * Identity resolution uses roster_id (program_roster.id) throughout.
 * Legacy programMembershipId fallback is handled by the caller via
 * `buildResidentIdentityMaps` before this function is reached.
 */
export function validateRotationCallLimitRule(input: CallValidationInput): CallValidationIssue[] {
  const issues: CallValidationIssue[] = [];

  const limitRules = resolveValidationRules(input.rules, ["max_calls_for_rotation"]);
  if (limitRules.length === 0) return issues;

  const activeAssignments = (input.assignments ?? []).filter(isActiveAssignment);
  if (activeAssignments.length === 0) return issues;

  const rotations = input.rotations ?? [];
  if (rotations.length === 0) return issues;

  const { residentByIdentity } = getResidentMaps(input);

  // Build resident → rotation list
  const rotationsByResident = new Map<string, CallValidationRotation[]>();
  for (const rotation of rotations) {
    const residentId =
      normalizeRosterId(rotation.residentId) ??
      normalizeRosterId(rotation.rosterId) ??
      normalizeRosterId(rotation.membershipId);
    if (!residentId || !rotation.rotationId || !rotation.startDate || !rotation.endDate) continue;
    const existing = rotationsByResident.get(residentId) ?? [];
    existing.push(rotation);
    rotationsByResident.set(residentId, existing);
  }

  // Build resident → assignment contexts
  type AssignmentEntry = {
    assignment: CallDraftAssignment;
    context: IntegrityAssignmentContext;
    dateKey: string;
    callType: string;
    isWeekend: boolean;
  };
  const assignmentsByResident = new Map<string, AssignmentEntry[]>();
  for (const assignment of activeAssignments) {
    const context = getIntegrityAssignmentContext(assignment);
    if (!context.normalizedDateKey || !context.normalizedCallType) continue;
    const residentId = context.residentId ?? context.rosterId;
    if (!residentId) continue;

    const entry: AssignmentEntry = {
      assignment,
      context,
      dateKey: context.normalizedDateKey,
      callType: context.normalizedCallType,
      isWeekend: isWeekendDateKey(context.normalizedDateKey),
    };
    const existing = assignmentsByResident.get(residentId) ?? [];
    existing.push(entry);
    assignmentsByResident.set(residentId, existing);
  }

  for (const limitRule of limitRules) {
    const limitRotationIds = new Set(
      (Array.isArray(limitRule.config.rotationCallLimitIds)
        ? limitRule.config.rotationCallLimitIds
        : []
      ).filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    );
    if (limitRotationIds.size === 0) continue;

    const dayScope =
      typeof limitRule.config.rotationCallLimitDayScope === "string"
        ? limitRule.config.rotationCallLimitDayScope
        : "all";

    const limitCallTypes = (
      Array.isArray(limitRule.config.rotationCallLimitCallTypes)
        ? (limitRule.config.rotationCallLimitCallTypes as unknown[]).filter(
            (t): t is string => typeof t === "string"
          )
        : ["Primary"]
    );

    const maxCallDays =
      typeof limitRule.config.rotationCallLimitMax === "number" &&
      Number.isFinite(limitRule.config.rotationCallLimitMax)
        ? limitRule.config.rotationCallLimitMax
        : 1;

    for (const [residentId, residentRotations] of rotationsByResident.entries()) {
      // Which of this resident's rotations match the rule?
      const matchingRotations = residentRotations.filter(
        (r) => r.rotationId && limitRotationIds.has(r.rotationId)
      );
      if (matchingRotations.length === 0) continue;

      const residentEntries = assignmentsByResident.get(residentId) ?? [];

      // Filter assignments to those that fall under the rule's scope.
      const relevant = residentEntries.filter((entry) => {
        // Call type scope
        const callTypeMatches =
          limitCallTypes.includes("any") ||
          limitCallTypes.map((t) => t.toLowerCase()).includes(entry.callType.toLowerCase());
        if (!callTypeMatches) return false;

        // Day scope
        if (dayScope === "weekend_only" && !entry.isWeekend) return false;
        if (dayScope === "weekday_only" && entry.isWeekend) return false;

        // Overlaps with at least one matching rotation period
        return matchingRotations.some((rotation) => {
          const start = normalizeDateKey(rotation.startDate);
          const end = normalizeDateKey(rotation.endDate);
          if (!start || !end) return false;
          return entry.dateKey >= start && entry.dateKey <= end;
        });
      });

      if (relevant.length <= maxCallDays) continue;

      // Build a human-readable message for this violation.
      const resident = residentByIdentity.get(residentId);
      const residentName =
        resident?.residentName ?? resident?.displayName ?? "Resident";

      const matchedRotation = matchingRotations[0];
      const rotationName =
        matchedRotation?.rotationName ??
        matchedRotation?.shortName ??
        matchedRotation?.service ??
        "the rotation";

      const violationDates = relevant.map((e) => e.dateKey).sort();
      const monthKey = violationDates[0]?.slice(0, 7) ?? "";
      const scopeLabel =
        dayScope === "weekend_only"
          ? "weekend "
          : dayScope === "weekday_only"
          ? "weekday "
          : "";
      const callTypeLabel = limitCallTypes.filter((t) => t !== "any").join("/") || "call";
      const message = `${rotationName} service limit: ${residentName} has ${relevant.length} ${scopeLabel}${callTypeLabel} call day${relevant.length === 1 ? "" : "s"} in ${monthKey}. Maximum allowed is ${maxCallDays}.`;

      // Issue one violation per over-limit assignment so the UI can highlight each row.
      for (const entry of relevant) {
        issues.push(
          createValidationIssue({
            code: "rotation_call_limit",
            ruleCode: limitRule.ruleCode ?? "max_calls_for_rotation",
            severity: limitRule.severity,
            source: "rule",
            message,
            slotId: entry.context.slotId,
            residentId: entry.context.residentId,
            rosterId: entry.context.rosterId,
            dateKey: entry.dateKey,
            callType: entry.callType,
            assignmentId: entry.assignment.callId ?? entry.context.assignmentId,
            metadata: {
              blockingRuleId: limitRule.id,
              blockingRuleName: limitRule.name,
              residentName,
              rotationName,
              rotationId: matchedRotation?.rotationId ?? null,
              maxCallDays,
              actualCount: relevant.length,
              violationDates,
              dayScope,
              callTypes: limitCallTypes,
            },
          })
        );
      }
    }
  }

  return issues;
}

export function validateCallMonthDraft(input: CallValidationInput) {
  const normalizedInput: CallValidationInput = {
    assignments: input.assignments ?? [],
    rules: input.rules ?? input.context?.rules ?? [],
    residents: input.residents ?? input.context?.residents ?? [],
    timeOff: input.timeOff ?? input.context?.timeOff ?? [],
    rotations: input.rotations ?? input.context?.rotations ?? [],
    context: input.context ?? null,
  };

  const issues = [
    ...validateIntegrity(normalizedInput),
    ...validateRequiredSlotRule(normalizedInput),
    ...validateConditionalRequiredSlots(normalizedInput),
    ...validateSpacingRule(normalizedInput),
    ...validateMonthlyLimitRule(normalizedInput),
    ...validateWeekendRule(normalizedInput),
    ...validatePgyRestrictionRule(normalizedInput),
    ...validateTimeOffRule(normalizedInput),
    ...validateRotationConflictRule(normalizedInput),
    ...validateRotationCallLimitRule(normalizedInput),
  ];

  return buildValidationResult(issues);
}

export function validateCallAssignment(input: CallValidationInput) {
  return validateCallMonthDraft(input);
}

export function validateCallMove(input: CallValidationInput) {
  return validateCallMonthDraft(input);
}

export function validateCallSwap(input: CallValidationInput) {
  return validateCallMonthDraft(input);
}

export function validateCallDelete(input: CallValidationInput) {
  return validateCallMonthDraft(input);
}
