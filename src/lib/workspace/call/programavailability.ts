// lib/db/programavailability.ts
import { createClient } from "@/utils/supabase/server";
import { getProgramResidents } from "@/lib/workspace/call/calls";
import {
  getDefaultProgramRuleSet,
  getProgramRules,
} from "@/lib/workspace/call/programcallrules";
import {
  getPgyFromGradYear,
  getTrainingLevelFromPgy,
} from "@/lib/workspace/pgy";
import {
  countUniqueWeekendBuckets,
  evaluateMonthlyLimitForResident,
  evaluatePgyEligibility,
  evaluateRotationEligibility,
  evaluateSpacingForResident,
  evaluateWeekendLimitForResident,
  getWeekendBucket,
} from "@/lib/workspace/call/rule-evaluator";
import { getTimeOffTypeLabel, type TimeOffType } from "@/lib/workspace/call/time-off";

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
  trainingLevel: string | null;
  pgyYear: number | null;
  gradYear: number | null;
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

type RotationRow = {
  id: string;
  roster_id: string | null;
  program_membership_id: string | null;
  rotation_id: string | null;
  start_date: string | null;
  end_date: string | null;
  site_label: string | null;
  team_label: string | null;
  notes: string | null;
  rotations:
    | {
        id: string | null;
        name: string | null;
        short_name: string | null;
      }
    | {
        id: string | null;
        name: string | null;
        short_name: string | null;
      }[]
    | null;
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

function getRotationMeta(row: RotationRow) {
  const rel = Array.isArray(row.rotations) ? row.rotations[0] : row.rotations;

  return {
    rotationId: row.rotation_id ?? rel?.id ?? null,
    rotationName:
      rel?.short_name ||
      rel?.name ||
      row.team_label ||
      row.site_label ||
      "Unknown Rotation",
  };
}

export async function getProgramAvailabilityMonth(params: {
  programId: string;
  monthStart: string;
  monthEnd: string;
}): Promise<ProgramAvailabilityResponse> {
  const supabase = await createClient();
  const { programId, monthStart, monthEnd } = params;

  const evaluationDate = parseDateKey(monthStart);
  const rawResidents = (await getProgramResidents(programId)) as RawResident[];

  const residents: AvailabilityResident[] = rawResidents.map((resident) => {
    const pgyYear = getPgyFromGradYear(resident.gradYear, evaluationDate);

    return {
      residentId: resident.residentId,
      membershipId: resident.rosterId,
      rosterId: resident.rosterId,
      programMembershipId: resident.membershipId ?? null,
      displayName: resident.displayName,
      gradYear: resident.gradYear ?? null,
      pgyYear,
      trainingLevel: getTrainingLevelFromPgy(pgyYear),
    };
  });

  const defaultRuleSet = await getDefaultProgramRuleSet(programId);
  const rules = defaultRuleSet
    ? await getProgramRules(programId, defaultRuleSet.id)
    : [];

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

  const { data: rotationRows, error: rotationError } = await supabase
    .from("rotation_assignments")
    .select(`
      id,
      program_membership_id,
      rotation_id,
      start_date,
      end_date,
      site_label,
      team_label,
      notes,
      rotations (
        id,
        name,
        short_name
      )
    `)
    .eq("program_id", programId)
    .lte("start_date", monthEnd)
    .gte("end_date", monthStart);

  if (rotationError) {
    throw new Error(`Failed to load rotation assignments: ${rotationError.message}`);
  }

  const { data: callRows, error: callsError } = await supabase
    .from("call_assignments")
    .select(`
      id,
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

  for (const row of (rotationRows ?? []) as RotationRow[]) {
    if (!row.start_date || !row.end_date) continue;
    const residentKey =
      row.roster_id ??
      (row.program_membership_id
        ? membershipToRoster.get(row.program_membership_id) ?? null
        : null);
    if (!residentKey) continue;

    const residentAvailability = availability[residentKey];
    if (!residentAvailability) continue;

    const { rotationId, rotationName } = getRotationMeta(row);

    const coveredDates = enumerateDates(row.start_date, row.end_date).filter(
      (dateKey) => dateKey >= monthStart && dateKey <= monthEnd
    );

    for (const dateKey of coveredDates) {
      const day = residentAvailability[dateKey];
      if (!day) continue;

      day.rotationConflicts.push({
        rotationId,
        rotationName,
        startDate: row.start_date,
        endDate: row.end_date,
        reason: row.notes ?? row.team_label ?? row.site_label ?? null,
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

      const primaryRotationViolations = evaluateRotationEligibility({
        rotationIds: day.rotationConflicts.map((conflict) => conflict.rotationId),
        callType: "Primary",
        rules,
      });
      const backupRotationViolations = evaluateRotationEligibility({
        rotationIds: day.rotationConflicts.map((conflict) => conflict.rotationId),
        callType: "Backup",
        rules,
      });
      if (primaryRotationViolations.length > 0 && backupRotationViolations.length > 0) {
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

      const primaryPgyViolations = evaluatePgyEligibility({
        resident,
        callType: "Primary",
        rules,
      });
      const backupPgyViolations = evaluatePgyEligibility({
        resident,
        callType: "Backup",
        rules,
      });
      if (primaryPgyViolations.length > 0 && backupPgyViolations.length > 0) {
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
