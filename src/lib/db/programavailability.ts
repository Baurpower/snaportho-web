// lib/db/programavailability.ts
import { createClient } from "@/utils/supabase/server";
import { getProgramResidents } from "@/lib/db/calls";
import {
  getDefaultProgramRuleSet,
  getProgramRules,
} from "@/lib/db/programcallrules";

type CallType = "Primary" | "Backup";

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
  type: "personal" | "conference";
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

type RuleConfig = {
  minDays?: number;
  excludeAdjacentWeekendPairing?: boolean;

  maxCalls?: number;
  maxWeekends?: number;

  restrictedPgyYears?: number[];
  allowedCallTypes?: CallType[];

  sameResidentForWeekend?: boolean;

  rotationIds?: string[];
  blockAllCall?: boolean;
  restrictedCallTypes?: CallType[];
};

type AvailabilityResident = {
  membershipId: string;
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
  membership_id: string;
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
  program_membership_id: string | null;
  call_type: string | null;
  call_date: string | null;
};

type RotationRow = {
  id: string;
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
  membershipId: string;
  displayName: string;
  gradYear: number | null;
  userId?: string | null;
};

function getAcademicYear(date = new Date()): number {
  const year = date.getFullYear();
  const julyFirst = new Date(year, 6, 1);
  return date >= julyFirst ? year + 1 : year;
}

function getPgyFromGradYear(
  gradYear: number | null,
  date = new Date()
): number | null {
  if (!gradYear) return null;

  const academicYear = getAcademicYear(date);
  const pgy = gradYear - academicYear + 1;

  if (pgy < 1 || pgy > 5) return null;
  return pgy;
}

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

function getResidentYearValue(resident: {
  trainingLevel: string | null;
  pgyYear: number | null;
}) {
  if (typeof resident.pgyYear === "number") return resident.pgyYear;

  const match = resident.trainingLevel?.match(/(\d+)/);
  if (match) return Number(match[1]);

  return null;
}

function isWeekend(dateKey: string) {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getDateDiffInDays(a: string, b: string) {
  const aDate = parseDateKey(a);
  const bDate = parseDateKey(b);
  const diffMs = Math.abs(aDate.getTime() - bDate.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function isAdjacentWeekendPair(a: string, b: string) {
  const dateA = parseDateKey(a);
  const dateB = parseDateKey(b);

  const diff = Math.abs(
    (dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff !== 1) return false;

  const dayA = dateA.getDay();
  const dayB = dateB.getDay();

  return (dayA === 6 && dayB === 0) || (dayA === 0 && dayB === 6);
}

function getWeekendBucket(dateKey: string): string | null {
  const date = parseDateKey(dateKey);
  const day = date.getDay();

  if (day === 6) return toDateKey(date);

  if (day === 0) {
    const saturday = new Date(date);
    saturday.setDate(saturday.getDate() - 1);
    return toDateKey(saturday);
  }

  return null;
}

function countUniqueWeekendBuckets(dateKeys: string[]) {
  const buckets = new Set<string>();

  for (const dateKey of dateKeys) {
    const bucket = getWeekendBucket(dateKey);
    if (bucket) buckets.add(bucket);
  }

  return buckets.size;
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
      membershipId: resident.membershipId,
      displayName: resident.displayName,
      gradYear: resident.gradYear ?? null,
      pgyYear,
      trainingLevel: pgyYear ? `PGY-${pgyYear}` : null,
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
    availability[resident.membershipId] = {};

    for (const dateKey of allDateKeys) {
      availability[resident.membershipId][dateKey] = {
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

  for (const call of (callRows ?? []) as CallRow[]) {
    if (!call.program_membership_id || !call.call_date) continue;

    const existing = callsByResident.get(call.program_membership_id) ?? [];
    existing.push(call.call_date);
    callsByResident.set(call.program_membership_id, existing);
  }

  for (const [residentId, dates] of callsByResident.entries()) {
    callsByResident.set(
      residentId,
      [...new Set(dates)].sort((a, b) => a.localeCompare(b))
    );
  }

  for (const row of (timeOffRows ?? []) as TimeOffRow[]) {
    const residentAvailability = availability[row.membership_id];
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
        type: row.event_type === "conference" ? "conference" : "personal",
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
        pushFlagIfMissing(day, {
          key: `timeoff-approved-${row.id}-${dateKey}`,
          label: row.event_type === "conference" ? "Conference" : "Time Off",
          tone: "rose",
          description: row.title ?? "Approved time-off",
          category: "time_off",
        });
      } else if (row.approval_status === "requested") {
        day.isWarning = true;
        pushFlagIfMissing(day, {
          key: `timeoff-requested-${row.id}-${dateKey}`,
          label:
            row.event_type === "conference" ? "Conference Req" : "Time-Off Req",
          tone: "amber",
          description: row.title ?? "Requested time-off",
          category: "time_off",
        });
      }
    }
  }

  for (const row of (rotationRows ?? []) as RotationRow[]) {
    if (!row.program_membership_id || !row.start_date || !row.end_date) continue;

    const residentAvailability = availability[row.program_membership_id];
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
    const residentYear = getResidentYearValue(resident);
    const assignedDates = [...(callsByResident.get(resident.membershipId) ?? [])].sort();
    const assignedWeekendCount = countUniqueWeekendBuckets(assignedDates);

    for (const dateKey of allDateKeys) {
      const day = availability[resident.membershipId][dateKey];
      if (!day) continue;

      const alreadyAssignedOnDate = assignedDates.includes(dateKey);
      const currentWeekendBucket = getWeekendBucket(dateKey);
      const alreadyAssignedInThisWeekendBucket =
        currentWeekendBucket !== null &&
        assignedDates.some(
          (assignedDate) => getWeekendBucket(assignedDate) === currentWeekendBucket
        );

      for (const rule of rules) {
        if (!rule.is_enabled) continue;

        const config = (rule.config ?? {}) as RuleConfig;

        if (rule.rule_type === "max_weekends_per_month" && isWeekend(dateKey)) {
          const maxWeekends = config.maxWeekends;

          if (typeof maxWeekends === "number") {
            const wouldExceed = alreadyAssignedInThisWeekendBucket
              ? assignedWeekendCount > maxWeekends
              : assignedWeekendCount >= maxWeekends;

            if (wouldExceed) {
              day.isBlocked = day.isBlocked || Boolean(rule.is_hard_rule);
              day.isWarning = day.isWarning || !rule.is_hard_rule;

              pushRuleBlockIfMissing(day, {
                ruleId: rule.id,
                ruleType: rule.rule_type,
                ruleName: rule.name,
                message: `Weekend limit reached (${assignedWeekendCount}/${maxWeekends})`,
                isHardRule: rule.is_hard_rule,
              });

              pushFlagIfMissing(day, {
                key: `rule-${rule.id}-${dateKey}`,
                label: "Weekend Limit",
                tone: rule.is_hard_rule ? "rose" : "amber",
                description: rule.name,
                category: "rule",
              });
            }
          }
        }

        if (rule.rule_type === "max_calls_per_month") {
          const maxCalls = config.maxCalls;

          if (typeof maxCalls === "number") {
            const wouldExceed = alreadyAssignedOnDate
              ? assignedDates.length > maxCalls
              : assignedDates.length >= maxCalls;

            if (wouldExceed) {
              day.isBlocked = day.isBlocked || Boolean(rule.is_hard_rule);
              day.isWarning = day.isWarning || !rule.is_hard_rule;

              pushRuleBlockIfMissing(day, {
                ruleId: rule.id,
                ruleType: rule.rule_type,
                ruleName: rule.name,
                message: `Monthly call limit reached (${assignedDates.length}/${maxCalls})`,
                isHardRule: rule.is_hard_rule,
              });

              pushFlagIfMissing(day, {
                key: `rule-${rule.id}-${dateKey}`,
                label: "Month Limit",
                tone: rule.is_hard_rule ? "rose" : "amber",
                description: rule.name,
                category: "rule",
              });
            }
          }
        }

        if (rule.rule_type === "min_days_between_assignments") {
          const minDays = Math.max(1, config.minDays ?? 2);
          const excludeAdjacentWeekendPairing =
            config.excludeAdjacentWeekendPairing ?? true;

          const violatesSpacing = assignedDates.some((otherDate) => {
            if (otherDate === dateKey) return false;

            if (
              excludeAdjacentWeekendPairing &&
              isAdjacentWeekendPair(otherDate, dateKey)
            ) {
              return false;
            }

            return getDateDiffInDays(otherDate, dateKey) <= minDays;
          });

          if (violatesSpacing) {
            day.isBlocked = day.isBlocked || Boolean(rule.is_hard_rule);
            day.isWarning = day.isWarning || !rule.is_hard_rule;

            pushRuleBlockIfMissing(day, {
              ruleId: rule.id,
              ruleType: rule.rule_type,
              ruleName: rule.name,
              message: excludeAdjacentWeekendPairing
                ? `Violates minimum spacing (${minDays} days, ignoring paired Sat/Sun)`
                : `Violates minimum spacing (${minDays} days)`,
              isHardRule: rule.is_hard_rule,
            });

            pushFlagIfMissing(day, {
              key: `rule-${rule.id}-${dateKey}`,
              label: "Spacing",
              tone: rule.is_hard_rule ? "rose" : "amber",
              description: rule.name,
              category: "rule",
            });
          }
        }

        if (rule.rule_type === "restrict_call_by_rotation") {
          const blockedRotationIds = (config.rotationIds ?? []).filter(Boolean);

          if (blockedRotationIds.length > 0) {
            const matchingRotation = day.rotationConflicts.find(
              (conflict) =>
                conflict.rotationId && blockedRotationIds.includes(conflict.rotationId)
            );

            if (matchingRotation) {
              day.isBlocked = day.isBlocked || Boolean(rule.is_hard_rule);
              day.isWarning = day.isWarning || !rule.is_hard_rule;

              pushRuleBlockIfMissing(day, {
                ruleId: rule.id,
                ruleType: rule.rule_type,
                ruleName: rule.name,
                message: `Blocked by rotation: ${matchingRotation.rotationName}`,
                isHardRule: rule.is_hard_rule,
              });

              pushFlagIfMissing(day, {
                key: `rule-${rule.id}-${dateKey}`,
                label: "Rotation Restriction",
                tone: rule.is_hard_rule ? "rose" : "amber",
                description: matchingRotation.rotationName,
                category: "rotation",
              });
            }
          }
        }

        if (rule.rule_type === "restrict_call_type_by_pgy") {
          const restrictedPgyYears = config.restrictedPgyYears ?? [];
          const allowedCallTypes = config.allowedCallTypes ?? [];

          const isRestrictedYear =
            typeof residentYear === "number" &&
            restrictedPgyYears.includes(residentYear);

          if (isRestrictedYear && allowedCallTypes.length === 0) {
            day.isBlocked = day.isBlocked || Boolean(rule.is_hard_rule);
            day.isWarning = day.isWarning || !rule.is_hard_rule;

            pushRuleBlockIfMissing(day, {
              ruleId: rule.id,
              ruleType: rule.rule_type,
              ruleName: rule.name,
              message: `PGY-${residentYear} is not allowed to take call`,
              isHardRule: rule.is_hard_rule,
            });

            pushFlagIfMissing(day, {
              key: `rule-${rule.id}-${dateKey}-pgy`,
              label: "PGY Restriction",
              tone: rule.is_hard_rule ? "rose" : "amber",
              description: rule.name,
              category: "rule",
            });
          }
        }
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