// lib/db/programavailability.ts
import { createClient } from "@/utils/supabase/server";
import { getProgramResidents } from "@/lib/workspace/call/calls";
import {
  getDefaultProgramRuleSet,
  getProgramRules,
} from "@/lib/workspace/call/programcallrules";
import {
  getResidentStatusDetails,
} from "@/lib/workspace/pgy";
import {
  countUniqueWeekendBuckets,
  evaluateMonthlyLimitForResident,
  evaluatePgyEligibility,
  evaluateRotationCallLimitForResident,
  evaluateRotationEligibility,
  evaluateSpacingForResident,
  evaluateWeekendLimitForResident,
  getWeekendBucket,
  isWeekendDateKey,
} from "@/lib/workspace/call/rule-evaluator";
import {
  getTimeOffTypeLabel,
  type TimeOffType,
} from "@/lib/workspace/call/time-off-shared";
import { getProgramRotationAssignmentsInRange } from "@/lib/workspace/call/rotations";
import { extractSlotDefinitions } from "@/lib/workspace/call/rule-definitions";

type AvailabilityFlag = {
  key: string;
  label: string;
  tone: "rose" | "amber" | "sky" | "violet" | "slate";
  description?: string | null;
  category?: "rule" | "time_off" | "rotation" | "warning";
};

type TimeOffConflict = {
  eventId: string;
  title: string | null;
  type: TimeOffType;
  usingPto: boolean;
  startDate: string | null;
  endDate: string | null;
  approvalStatus: "requested" | "approved" | "denied" | null;
  location?: string | null;
  notes?: string | null;
};

type RotationConflict = {
  rotationId: string | null;
  rotationName: string;
  startDate?: string | null;
  endDate?: string | null;
  reason?: string | null;
};

type RuleBlock = {
  ruleId?: string | null;
  ruleType: string;
  ruleName: string;
  message: string;
  isHardRule: boolean;
};

type AvailabilityResident = {
  residentId: string;
  membershipId: string; // compatibility alias for residentId
  rosterId: string;
  programMembershipId: string | null;
  displayName: string;
  residentStatus: string;
  trainingLevel: string | null;
  pgyYear: number | null;
  gradYear: number | null;
  isGraduated: boolean;
  isActiveResident: boolean;
  graduationDate: string | null;
};

export type ResidentAvailabilityDay = {
  isBlocked: boolean;
  isWarning: boolean;
  flags: AvailabilityFlag[];
  timeOffConflicts: TimeOffConflict[];
  rotationConflicts: RotationConflict[];
  ruleBlocks: RuleBlock[];
};

export type ProgramAvailabilityResponse = {
  monthStart: string;
  monthEnd: string;
  residents: AvailabilityResident[];
  availability: Record<string, Record<string, ResidentAvailabilityDay>>;
};

type TimeOffRow = {
  id: string;
  membership_id: string | null;
  roster_id: string | null;
  event_type: string;
  using_pto: boolean | null;
  start_date: string;
  end_date: string;
  title: string | null;
  location: string | null;
  notes: string | null;
  approval_status: string | null;
};

type CallRow = {
  id: string;
  roster_id: string | null;
  program_membership_id: string | null;
  call_type: string | null;
  call_date: string | null;
};

type RawResident = {
  residentId: string;
  rosterId: string;
  membershipId: string | null;
  displayName: string;
  gradYear: number | null;
  userId?: string | null;
};

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function toDateKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function enumerateDates(startDate: string, endDate: string) {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  const result: string[] = [];

  const cursor = new Date(start);
  while (cursor <= end) {
    result.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function isWeekend(dateKey: string) {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  return day === 0 || day === 6;
}

function pushFlagIfMissing(day: ResidentAvailabilityDay, flag: AvailabilityFlag) {
  const exists = day.flags.some((existing) => existing.key === flag.key);
  if (!exists) day.flags.push(flag);
}

function pushRuleBlockIfMissing(day: ResidentAvailabilityDay, block: RuleBlock) {
  const exists = day.ruleBlocks.some(
    (existing) =>
      existing.ruleId === block.ruleId &&
      existing.ruleType === block.ruleType &&
      existing.message === block.message
  );

  if (!exists) day.ruleBlocks.push(block);
}

export async function getProgramAvailabilityMonth(params: {
  programId: string;
  monthStart: string;
  monthEnd: string;
}): Promise<ProgramAvailabilityResponse> {
  const supabase = await createClient();
  const { programId, monthStart, monthEnd } = params;

  const rawResidents = (await getProgramResidents(programId, {
    effectiveDate: monthStart,
    includeGraduates: false,
  })) as RawResident[];

  const residents: AvailabilityResident[] = rawResidents.map((resident) => {
    const status = getResidentStatusDetails(resident.gradYear, monthStart);

    return {
      residentId: resident.residentId,
      membershipId: resident.rosterId,
      rosterId: resident.rosterId,
      programMembershipId: resident.membershipId ?? null,
      displayName: resident.displayName,
      gradYear: resident.gradYear ?? null,
      residentStatus: status.statusLabel,
      pgyYear: status.pgyYear,
      trainingLevel: status.statusLabel === "Unknown" ? null : status.statusLabel,
      isGraduated: status.isGraduated,
      isActiveResident: status.isActiveResident,
      graduationDate: status.graduationDate,
    };
  });

  const defaultRuleSet = await getDefaultProgramRuleSet(programId);
  const rules = defaultRuleSet
    ? await getProgramRules(programId, defaultRuleSet.id)
    : [];

  // Whether the program offers a Buddy slot. Used so a resident who is
  // PGY/rotation-restricted from Primary+Backup but still eligible for Buddy
  // (e.g. a PGY-1 intern on Gen Ortho) is NOT marked fully hard-blocked for the
  // day — buddy-only residents must stay assignable to Buddy call.
  const buddyIsProgramCallType = extractSlotDefinitions(rules).some(
    (definition) => definition.callType === "Buddy"
  );

  const { data: timeOffRows, error: timeOffError } = await supabase
    .from("availability_events")
    .select(`
      id,
      membership_id,
      roster_id,
      event_type,
      using_pto,
      start_date,
      end_date,
      title,
      location,
      notes,
      approval_status
    `)
    .eq("program_id", programId)
    .neq("approval_status", "denied")
    .lte("start_date", monthEnd)
    .gte("end_date", monthStart);

  if (timeOffError) {
    throw new Error(
      `Failed to load time-off availability: ${timeOffError.message}`
    );
  }

  // Unify on the canonical rotation loader so availability sees exactly the same
  // rotation data (identity + window) as validation and the generator's source.
  const rotationAssignments = await getProgramRotationAssignmentsInRange(
    programId,
    monthStart,
    monthEnd,
    supabase
  );

  const { data: callRows, error: callsError } = await supabase
    .from("call_assignments")
    .select(`
      id,
      roster_id,
      program_membership_id,
      call_type,
      call_date
    `)
    .eq("program_id", programId)
    .gte("call_date", monthStart)
    .lte("call_date", monthEnd);

  if (callsError) {
    throw new Error(`Failed to load call assignments: ${callsError.message}`);
  }

  const allDateKeys = enumerateDates(monthStart, monthEnd);

  const availability: Record<string, Record<string, ResidentAvailabilityDay>> = {};

  for (const resident of residents) {
    availability[resident.residentId] = {};

    for (const dateKey of allDateKeys) {
      availability[resident.residentId][dateKey] = {
        isBlocked: false,
        isWarning: false,
        flags: [],
        timeOffConflicts: [],
        rotationConflicts: [],
        ruleBlocks: [],
      };
    }
  }

  const callsByResident = new Map<string, string[]>();
  const membershipToRoster = new Map<string, string>();
  for (const resident of residents) {
    if (resident.programMembershipId) {
      membershipToRoster.set(resident.programMembershipId, resident.rosterId);
    }
  }

  for (const call of (callRows ?? []) as CallRow[]) {
    if (!call.call_date) continue;
    const residentKey =
      call.roster_id ??
      (call.program_membership_id
        ? membershipToRoster.get(call.program_membership_id) ?? null
        : null);
    if (!residentKey) continue;

    const existing = callsByResident.get(residentKey) ?? [];
    existing.push(call.call_date);
    callsByResident.set(residentKey, existing);
  }

  for (const [residentId, dates] of callsByResident.entries()) {
    callsByResident.set(
      residentId,
      [...new Set(dates)].sort((a, b) => a.localeCompare(b))
    );
  }

  for (const row of (timeOffRows ?? []) as TimeOffRow[]) {
    const residentKey =
      row.roster_id ??
      (row.membership_id
        ? membershipToRoster.get(row.membership_id) ?? null
        : null);
    if (!residentKey) continue;
    const residentAvailability = availability[residentKey];
    if (!residentAvailability) continue;

    const coveredDates = enumerateDates(row.start_date, row.end_date).filter(
      (dateKey) => dateKey >= monthStart && dateKey <= monthEnd
    );

    for (const dateKey of coveredDates) {
      const day = residentAvailability[dateKey];
      if (!day) continue;

      const conflict: TimeOffConflict = {
        eventId: row.id,
        title: row.title,
        type:
          row.event_type === "conference" ||
          row.event_type === "vacation" ||
          row.event_type === "sick" ||
          row.event_type === "other"
            ? row.event_type
            : "personal",
        usingPto: Boolean(row.using_pto),
        startDate: row.start_date,
        endDate: row.end_date,
        approvalStatus:
          row.approval_status === "requested" ||
          row.approval_status === "approved" ||
          row.approval_status === "denied"
            ? row.approval_status
            : null,
        location: row.location,
        notes: row.notes,
      };

      day.timeOffConflicts.push(conflict);

      if (row.approval_status === "approved") {
        day.isBlocked = true;
        const timeOffLabel = getTimeOffTypeLabel(row.event_type);
        pushFlagIfMissing(day, {
          key: `timeoff-approved-${row.id}-${dateKey}`,
          label: timeOffLabel,
          tone: "rose",
          description: row.title ?? "Approved time-off",
          category: "time_off",
        });
      } else if (row.approval_status === "requested") {
        day.isWarning = true;
        const timeOffLabel = getTimeOffTypeLabel(row.event_type);
        pushFlagIfMissing(day, {
          key: `timeoff-requested-${row.id}-${dateKey}`,
          label: `${timeOffLabel} Req`,
          tone: "amber",
          description: row.title ?? "Requested time-off",
          category: "time_off",
        });
      }
    }
  }

  for (const row of rotationAssignments) {
    if (!row.startDate || !row.endDate) continue;
    const residentKey =
      row.rosterId ??
      (row.programMembershipId
        ? membershipToRoster.get(row.programMembershipId) ?? null
        : null);
    if (!residentKey) continue;

    const residentAvailability = availability[residentKey];
    if (!residentAvailability) continue;

    const rotationId = row.rotation?.id ?? null;
    const rotationName =
      row.rotation?.short_name ||
      row.rotation?.name ||
      row.teamLabel ||
      row.siteLabel ||
      "Unknown Rotation";

    const coveredDates = enumerateDates(row.startDate, row.endDate).filter(
      (dateKey) => dateKey >= monthStart && dateKey <= monthEnd
    );

    for (const dateKey of coveredDates) {
      const day = residentAvailability[dateKey];
      if (!day) continue;

      day.rotationConflicts.push({
        rotationId,
        rotationName,
        startDate: row.startDate,
        endDate: row.endDate,
        reason: row.notes ?? row.teamLabel ?? row.siteLabel ?? null,
      });
    }
  }

  for (const resident of residents) {
    const assignedDates = [...(callsByResident.get(resident.residentId) ?? [])].sort();
    const assignedWeekendCount = countUniqueWeekendBuckets(assignedDates);

    for (const dateKey of allDateKeys) {
      const day = availability[resident.residentId][dateKey];
      if (!day) continue;

      const alreadyAssignedOnDate = assignedDates.includes(dateKey);
      const currentWeekendBucket = getWeekendBucket(dateKey);
      const alreadyAssignedInThisWeekendBucket =
        currentWeekendBucket !== null &&
        assignedDates.some(
          (assignedDate) => getWeekendBucket(assignedDate) === currentWeekendBucket
        );

      const projectedMonthCount = alreadyAssignedOnDate
        ? assignedDates.length
        : assignedDates.length + 1;
      for (const violation of evaluateMonthlyLimitForResident({
        assignmentCount: projectedMonthCount,
        rules,
      })) {
        day.isBlocked = day.isBlocked || violation.severity === "error";
        day.isWarning = day.isWarning || violation.severity === "warning";

        pushRuleBlockIfMissing(day, {
          ruleId: violation.rule.id,
          ruleType: violation.rule.rule_type ?? "",
          ruleName: violation.rule.name ?? "",
          message: violation.message,
          isHardRule: violation.severity === "error",
        });

        pushFlagIfMissing(day, {
          key: `rule-${violation.rule.id}-${dateKey}-month`,
          label: "Month Limit",
          tone: violation.severity === "error" ? "rose" : "amber",
          description: violation.message,
          category: "rule",
        });
      }

      const projectedWeekendCount = alreadyAssignedInThisWeekendBucket
        ? assignedWeekendCount
        : assignedWeekendCount + (isWeekend(dateKey) ? 1 : 0);
      for (const violation of evaluateWeekendLimitForResident({
        dateKey,
        weekendCount: projectedWeekendCount,
        rules,
      })) {
        day.isBlocked = day.isBlocked || violation.severity === "error";
        day.isWarning = day.isWarning || violation.severity === "warning";

        pushRuleBlockIfMissing(day, {
          ruleId: violation.rule.id,
          ruleType: violation.rule.rule_type ?? "",
          ruleName: violation.rule.name ?? "",
          message: violation.message,
          isHardRule: violation.severity === "error",
        });

        pushFlagIfMissing(day, {
          key: `rule-${violation.rule.id}-${dateKey}-weekend`,
          label: "Weekend Limit",
          tone: violation.severity === "error" ? "rose" : "amber",
          description: violation.message,
          category: "rule",
        });
      }

      for (const violation of evaluateSpacingForResident({
        assignedDates: assignedDates.filter((otherDate) => otherDate !== dateKey),
        dateKey,
        rules,
      })) {
        day.isBlocked = day.isBlocked || violation.severity === "error";
        day.isWarning = day.isWarning || violation.severity === "warning";

        pushRuleBlockIfMissing(day, {
          ruleId: violation.rule.id,
          ruleType: violation.rule.rule_type ?? "",
          ruleName: violation.rule.name ?? "",
          message: violation.message,
          isHardRule: violation.severity === "error",
        });

        pushFlagIfMissing(day, {
          key: `rule-${violation.rule.id}-${dateKey}-spacing`,
          label: "Spacing",
          tone: violation.severity === "error" ? "rose" : "amber",
          description: violation.message,
          category: "rule",
        });
      }

      const rotationIdsForConflicts = day.rotationConflicts.map(
        (conflict) => conflict.rotationId
      );
      const primaryRotationViolations = evaluateRotationEligibility({
        rotationIds: rotationIdsForConflicts,
        callType: "Primary",
        rules,
      });
      const backupRotationViolations = evaluateRotationEligibility({
        rotationIds: rotationIdsForConflicts,
        callType: "Backup",
        rules,
      });
      // A day is only fully hard-blocked by rotation if EVERY program call type
      // is blocked. If Buddy is offered and still allowed on this rotation, the
      // resident is not fully blocked (buddy-only residents stay assignable).
      const buddyRotationBlocked =
        !buddyIsProgramCallType ||
        evaluateRotationEligibility({
          rotationIds: rotationIdsForConflicts,
          callType: "Buddy",
          rules,
        }).length > 0;
      if (
        primaryRotationViolations.length > 0 &&
        backupRotationViolations.length > 0 &&
        buddyRotationBlocked
      ) {
        const matchingRotation = day.rotationConflicts[0];
        const representativeViolation = primaryRotationViolations[0];

        day.isBlocked = day.isBlocked || representativeViolation.severity === "error";
        day.isWarning = day.isWarning || representativeViolation.severity === "warning";

        pushRuleBlockIfMissing(day, {
          ruleId: representativeViolation.rule.id,
          ruleType:
            representativeViolation.rule.rule_type ?? "",
          ruleName: representativeViolation.rule.name ?? "",
          message: matchingRotation
            ? `Blocked by rotation: ${matchingRotation.rotationName}`
            : representativeViolation.message,
          isHardRule: representativeViolation.severity === "error",
        });

        pushFlagIfMissing(day, {
          key: `rule-${representativeViolation.rule.id}-${dateKey}-rotation`,
          label: "Rotation Restriction",
          tone: representativeViolation.severity === "error" ? "rose" : "amber",
          description: matchingRotation?.rotationName ?? representativeViolation.message,
          category: "rotation",
        });
      }

      // Per-rotation call-day limit (e.g. "Oncology residents: max 1 weekend Primary/month").
      const rotationIdsForDay = day.rotationConflicts.map((c) => c.rotationId);
      if (rotationIdsForDay.length > 0) {
        // Count already-published weekend/weekday Primary call days for this resident.
        const publishedCallDates = callsByResident.get(resident.residentId) ?? [];
        const weekendPublishedCount = publishedCallDates.filter((d) => isWeekendDateKey(d)).length;
        const weekdayPublishedCount = publishedCallDates.filter((d) => !isWeekendDateKey(d)).length;
        const totalPublishedCount = publishedCallDates.length;
        const thisDateIsWeekend = isWeekendDateKey(dateKey);

        // Projected counts include this tentative date.
        const alreadyHasCallOnDate = publishedCallDates.includes(dateKey);
        const projectedWeekend = thisDateIsWeekend && !alreadyHasCallOnDate
          ? weekendPublishedCount + 1
          : weekendPublishedCount;
        const projectedWeekday = !thisDateIsWeekend && !alreadyHasCallOnDate
          ? weekdayPublishedCount + 1
          : weekdayPublishedCount;
        const projectedTotal = alreadyHasCallOnDate
          ? totalPublishedCount
          : totalPublishedCount + 1;

        for (const violation of evaluateRotationCallLimitForResident({
          rotationIds: rotationIdsForDay,
          isWeekendDate: thisDateIsWeekend,
          weekendCallDays: projectedWeekend,
          weekdayCallDays: projectedWeekday,
          totalCallDays: projectedTotal,
          callType: "Primary",
          rules,
        })) {
          const matchedIds = (violation.metadata?.matchedRotationIds as string[] | undefined) ?? [];
          const matchedRotation = day.rotationConflicts.find(
            (c) => c.rotationId && matchedIds.includes(c.rotationId)
          );

          day.isBlocked = day.isBlocked || violation.severity === "error";
          day.isWarning = day.isWarning || violation.severity === "warning";

          pushRuleBlockIfMissing(day, {
            ruleId: violation.rule.id,
            ruleType: violation.rule.rule_type ?? "",
            ruleName: violation.rule.name ?? "",
            message: matchedRotation
              ? `${matchedRotation.rotationName}: ${violation.message}`
              : violation.message,
            isHardRule: violation.severity === "error",
          });

          pushFlagIfMissing(day, {
            key: `rule-${violation.rule.id}-${dateKey}-rotation-call-limit`,
            label: "Rotation Call Limit",
            tone: violation.severity === "error" ? "rose" : "amber",
            description: matchedRotation?.rotationName ?? violation.message,
            category: "rule",
          });
        }
      }

      const primaryPgyViolations = evaluatePgyEligibility({
        resident,
        callType: "Primary",
        rules,
        effectiveDate: dateKey,
      });
      const backupPgyViolations = evaluatePgyEligibility({
        resident,
        callType: "Backup",
        rules,
        effectiveDate: dateKey,
      });
      // Only mark the day fully hard-blocked when the resident is PGY-restricted
      // from EVERY program call type. A PGY-1 who may only take Buddy call (the
      // whole point of buddy call) must NOT show as blocked in Buddy mode.
      const buddyPgyBlocked =
        !buddyIsProgramCallType ||
        evaluatePgyEligibility({
          resident,
          callType: "Buddy",
          rules,
          effectiveDate: dateKey,
        }).length > 0;
      if (
        primaryPgyViolations.length > 0 &&
        backupPgyViolations.length > 0 &&
        buddyPgyBlocked
      ) {
        const representativeViolation = primaryPgyViolations[0];

        day.isBlocked = day.isBlocked || representativeViolation.severity === "error";
        day.isWarning = day.isWarning || representativeViolation.severity === "warning";

        pushRuleBlockIfMissing(day, {
          ruleId: representativeViolation.rule.id,
          ruleType:
            representativeViolation.rule.rule_type ?? "",
          ruleName: representativeViolation.rule.name ?? "",
          message: representativeViolation.message,
          isHardRule: representativeViolation.severity === "error",
        });

        pushFlagIfMissing(day, {
          key: `rule-${representativeViolation.rule.id}-${dateKey}-pgy`,
          label: "PGY Restriction",
          tone: representativeViolation.severity === "error" ? "rose" : "amber",
          description: representativeViolation.message,
          category: "rule",
        });
      }
    }
  }

  return {
    monthStart,
    monthEnd,
    residents,
    availability,
  };
}
