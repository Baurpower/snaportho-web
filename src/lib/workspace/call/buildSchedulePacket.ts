// src/lib/workspace/call/buildSchedulePacket.ts

type ScheduleSlotMode = "Primary" | "Both";
type Slot = "Primary" | "Backup";
type RuleStrictness = "never_break" | "avoid_breaking" | "bend_if_needed";

type UnknownRecord = Record<string, unknown>;

type AvailabilityItem =
  | string
  | {
      date?: string;
      dateKey?: string;
      callDate?: string;
      unavailable?: boolean;
      isUnavailable?: boolean;
      blocked?: boolean;
      isBlocked?: boolean;
      away?: boolean;
    };

type AvailabilityByResident = Record<
  string,
  AvailabilityItem[] | Record<string, unknown> | undefined
>;

type RuleLike = {
  name?: string;
  rule_type?: string;
  type?: string;
  config?: UnknownRecord | null;
  is_enabled?: boolean;
  enabled?: boolean;
  is_hard_rule?: boolean;
  isHardRule?: boolean;
};

type ResidentLike = {
  membershipId: string;
  displayName: string;
  trainingLevel?: string | null;
  pgyYear?: number | null;
};

type CalendarDayLike = {
  key: string;
  dayName?: string;
  isWeekend?: boolean;
};

type DraftAssignmentLike = {
  primaryMembershipId?: string | null;
  backupMembershipId?: string | null;
};

type DraftAssignments = Record<string, DraftAssignmentLike>;

type ResidentTotal = ResidentLike & {
  monthPrimary: number;
  monthBackup: number;
  monthTotal: number;
  monthWeekend: number;
  assignedDates: string[];
};

type BuildSchedulePacketBody = {
  monthLabel?: string;
  monthDays?: CalendarDayLike[];
  residents?: ResidentLike[];
  draftAssignments?: DraftAssignments;
  historicalStats?: unknown[];
  rules?: RuleLike[];
  availabilityByResident?: AvailabilityByResident;
  scheduleSlotMode?: ScheduleSlotMode;
  generationReport?: UnknownRecord | null;
};

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function getRuleType(rule: RuleLike) {
  return rule.rule_type ?? rule.type ?? "";
}

function getRuleConfig(rule: RuleLike) {
  return rule.config ?? {};
}

function isRuleEnabled(rule: RuleLike) {
  return rule.is_enabled ?? rule.enabled ?? true;
}

function isHardRule(rule: RuleLike) {
  return rule.is_hard_rule ?? rule.isHardRule ?? false;
}

function getResidentPgy(resident: ResidentLike) {
  if (typeof resident.pgyYear === "number") return resident.pgyYear;

  const match = String(resident.trainingLevel ?? "").match(/(\d+)/);

  return match ? Number(match[1]) : null;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asNumberArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map(Number).filter(Number.isFinite);
}

function asSlotArray(value: unknown): Slot[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is Slot => item === "Primary" || item === "Backup"
  );
}

function daysBetween(a: string, b: string) {
  const aDate = new Date(`${a}T00:00:00`);
  const bDate = new Date(`${b}T00:00:00`);

  return Math.abs(Math.round((aDate.getTime() - bDate.getTime()) / 86400000));
}

function getDateDayOfWeek(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).getDay();
}

function getRuleStrictness(rule: RuleLike): RuleStrictness {
  const type = getRuleType(rule).toLowerCase();

  if (
    type.includes("pgy") ||
    type.includes("call_type") ||
    type.includes("availability") ||
    type.includes("unavailable")
  ) {
    return "never_break";
  }

  if (isHardRule(rule)) return "avoid_breaking";

  return "bend_if_needed";
}

function isAvailabilityItem(value: unknown): value is Exclude<AvailabilityItem, string> {
  return typeof value === "object" && value !== null;
}

function isUnavailableForDate(
  availabilityByResident: AvailabilityByResident,
  membershipId: string,
  dateKey: string
) {
  const residentAvailability = availabilityByResident[membershipId];

  if (!residentAvailability) return false;

  if (Array.isArray(residentAvailability)) {
    return residentAvailability.some((item) => {
      if (typeof item === "string") return item === dateKey;

      return (
        item.date === dateKey ||
        item.dateKey === dateKey ||
        item.callDate === dateKey
      );
    });
  }

  const value = residentAvailability[dateKey];

  if (!value) return false;
  if (typeof value === "boolean") return value === true;

  if (typeof value === "string") {
    return ["unavailable", "away", "blocked", "off"].includes(value.toLowerCase());
  }

  if (isAvailabilityItem(value)) {
    return Boolean(
      value.unavailable ||
        value.isUnavailable ||
        value.blocked ||
        value.isBlocked ||
        value.away
    );
  }

  return false;
}

function getResidentTotals({
  residents,
  monthDays,
  draftAssignments,
}: {
  residents: ResidentLike[];
  monthDays: CalendarDayLike[];
  draftAssignments: DraftAssignments;
}): ResidentTotal[] {
  return residents.map((resident) => {
    let monthPrimary = 0;
    let monthBackup = 0;
    let monthWeekend = 0;

    const assignedDates: string[] = [];

    for (const day of monthDays) {
      const assignment = draftAssignments[day.key];

      if (assignment?.primaryMembershipId === resident.membershipId) {
        monthPrimary += 1;
        assignedDates.push(day.key);
        if (day.isWeekend) monthWeekend += 1;
      }

      if (assignment?.backupMembershipId === resident.membershipId) {
        monthBackup += 1;
        assignedDates.push(day.key);
        if (day.isWeekend) monthWeekend += 1;
      }
    }

    return {
      membershipId: resident.membershipId,
      displayName: resident.displayName,
      trainingLevel: resident.trainingLevel,
      pgyYear: resident.pgyYear,
      monthPrimary,
      monthBackup,
      monthTotal: monthPrimary + monthBackup,
      monthWeekend,
      assignedDates: Array.from(new Set(assignedDates)).sort(),
    };
  });
}

function evaluateCandidateForSlot({
  resident,
  day,
  slot,
  draftAssignments,
  availabilityByResident,
  rules,
}: {
  resident: ResidentTotal;
  day: CalendarDayLike;
  slot: Slot;
  draftAssignments: DraftAssignments;
  availabilityByResident: AvailabilityByResident;
  rules: RuleLike[];
}) {
  const assignment = draftAssignments[day.key] ?? {};

  const hardBlockers: string[] = [];
  const bendableWarnings: string[] = [];
  const helpfulReasons: string[] = [];

  if (!resident.membershipId) hardBlockers.push("Missing membership ID.");

  if (slot === "Primary" && resident.membershipId === assignment.backupMembershipId) {
    hardBlockers.push("Already assigned as backup on the same date.");
  }

  if (slot === "Backup" && resident.membershipId === assignment.primaryMembershipId) {
    hardBlockers.push("Already assigned as primary on the same date.");
  }

  if (
    resident.membershipId &&
    isUnavailableForDate(availabilityByResident, resident.membershipId, day.key)
  ) {
    hardBlockers.push("Resident is unavailable for this date.");
  }

  for (const rule of rules.filter(isRuleEnabled)) {
    const ruleType = getRuleType(rule);
    const config = getRuleConfig(rule);
    const strictness = getRuleStrictness(rule);
    const residentPgy = getResidentPgy(resident);

    if (
      ruleType === "restrict_call_type_by_pgy" ||
      ruleType === "pgy_slot_restriction"
    ) {
      const restrictedPgyYears = asNumberArray(
        config.restrictedPgyYears ??
          config.restricted_pgy_years ??
          config.pgyYears ??
          config.pgy_years
      );

      const allowedCallTypes = asSlotArray(
        config.allowedCallTypes ??
          config.allowed_call_types ??
          config.allowedSlots ??
          config.allowed_slots
      );

      if (residentPgy !== null && restrictedPgyYears.includes(residentPgy)) {
        if (allowedCallTypes.length === 0) {
          hardBlockers.push(
            `${resident.displayName} is PGY-${residentPgy} and cannot take call.`
          );
        } else if (!allowedCallTypes.includes(slot)) {
          hardBlockers.push(
            `${resident.displayName} is PGY-${residentPgy} and cannot take ${slot}.`
          );
        }
      }
    }

    if (
      ruleType === "min_days_between_assignments" ||
      ruleType === "minimum_spacing" ||
      ruleType === "avoid_consecutive_call"
    ) {
      const minDays = asNumber(config.minDays ?? config.min_days ?? config.days, 2);

      const excludeAdjacentWeekendPairing = Boolean(
        config.excludeAdjacentWeekendPairing ??
          config.exclude_adjacent_weekend_pairing ??
          true
      );

      for (const assignedDate of resident.assignedDates ?? []) {
        const gap = daysBetween(day.key, assignedDate);
        const currentDow = getDateDayOfWeek(day.key);
        const priorDow = getDateDayOfWeek(assignedDate);

        const isSatSunPair =
          excludeAdjacentWeekendPairing &&
          gap === 1 &&
          ((currentDow === 0 && priorDow === 6) ||
            (currentDow === 6 && priorDow === 0));

        if (isSatSunPair) continue;

        if (gap > 0 && gap <= minDays) {
          const msg = `${gap} day(s) from another assignment.`;

          if (strictness === "never_break") hardBlockers.push(msg);
          else bendableWarnings.push(msg);
        }
      }
    }

    if (ruleType === "max_calls_per_month" || ruleType === "max_monthly_calls") {
      const maxCalls = asNumber(config.maxCalls ?? config.max_calls, 6);

      if (resident.monthTotal >= maxCalls) {
        bendableWarnings.push(`At ${resident.monthTotal}/${maxCalls} monthly calls.`);
      }
    }

    if (
      (ruleType === "max_weekends_per_month" ||
        ruleType === "max_weekend_calls") &&
      day.isWeekend
    ) {
      const maxWeekends = asNumber(config.maxWeekends ?? config.max_weekends, 2);

      if (resident.monthWeekend >= maxWeekends) {
        bendableWarnings.push(
          `At ${resident.monthWeekend}/${maxWeekends} weekend calls.`
        );
      }
    }
  }

  if (resident.monthTotal <= 2) helpfulReasons.push("Low total monthly call burden.");
  if (day.isWeekend && resident.monthWeekend <= 1) {
    helpfulReasons.push("Low weekend burden.");
  }

  return {
    ...resident,
    eligible: hardBlockers.length === 0,
    hardBlockers,
    bendableWarnings,
    helpfulReasons,
  };
}

function getCandidatesForSlot(params: {
  residentTotals: ResidentTotal[];
  day: CalendarDayLike;
  slot: Slot;
  draftAssignments: DraftAssignments;
  availabilityByResident: AvailabilityByResident;
  rules: RuleLike[];
}) {
  return params.residentTotals
    .map((resident) =>
      evaluateCandidateForSlot({
        ...params,
        resident,
      })
    )
    .filter((candidate) => candidate.eligible)
    .sort((a, b) => {
      if (a.bendableWarnings.length !== b.bendableWarnings.length) {
        return a.bendableWarnings.length - b.bendableWarnings.length;
      }

      if (a.monthTotal !== b.monthTotal) return a.monthTotal - b.monthTotal;
      if (a.monthWeekend !== b.monthWeekend) return a.monthWeekend - b.monthWeekend;
      if (a.monthPrimary !== b.monthPrimary) return a.monthPrimary - b.monthPrimary;

      return String(a.displayName).localeCompare(String(b.displayName));
    })
    .slice(0, 10);
}

function getRequiredSlots({
  monthDays,
  draftAssignments,
  scheduleSlotMode,
}: {
  monthDays: CalendarDayLike[];
  draftAssignments: DraftAssignments;
  scheduleSlotMode: ScheduleSlotMode;
}) {
  const slots: Array<{
    dateKey: string;
    dayName: string;
    isWeekend: boolean;
    slot: Slot;
    currentMembershipId: string | null;
  }> = [];

  for (const day of monthDays) {
    const assignment = draftAssignments[day.key] ?? {};

    slots.push({
      dateKey: day.key,
      dayName: day.dayName ?? "",
      isWeekend: Boolean(day.isWeekend),
      slot: "Primary",
      currentMembershipId: assignment.primaryMembershipId ?? null,
    });

    if (scheduleSlotMode === "Both") {
      slots.push({
        dateKey: day.key,
        dayName: day.dayName ?? "",
        isWeekend: Boolean(day.isWeekend),
        slot: "Backup",
        currentMembershipId: assignment.backupMembershipId ?? null,
      });
    }
  }

  return slots;
}

export function buildSchedulePacket(body: BuildSchedulePacketBody) {
  const {
    monthLabel,
    monthDays = [],
    residents = [],
    draftAssignments,
    historicalStats,
    rules,
    availabilityByResident,
    scheduleSlotMode,
    generationReport,
  } = body ?? {};

  const normalizedSlotMode: ScheduleSlotMode =
    scheduleSlotMode === "Both" ? "Both" : "Primary";

  const safeDraftAssignments = draftAssignments ?? {};
  const safeRules = Array.isArray(rules) ? rules : [];
  const safeAvailabilityByResident = availabilityByResident ?? {};

  const residentTotals = getResidentTotals({
    residents,
    monthDays,
    draftAssignments: safeDraftAssignments,
  });

  const requiredSlots = getRequiredSlots({
    monthDays,
    draftAssignments: safeDraftAssignments,
    scheduleSlotMode: normalizedSlotMode,
  });

  const reviewedSlots = requiredSlots.map((slotInfo) => {
    const day = monthDays.find((item) => item.key === slotInfo.dateKey);

    const candidates = day
      ? getCandidatesForSlot({
          residentTotals,
          day,
          slot: slotInfo.slot,
          draftAssignments: safeDraftAssignments,
          availabilityByResident: safeAvailabilityByResident,
          rules: safeRules,
        })
      : [];

    return {
      ...slotInfo,
      isOpen: !slotInfo.currentMembershipId,
      candidates: candidates.map((candidate) => ({
        membershipId: candidate.membershipId,
        displayName: candidate.displayName,
        trainingLevel: candidate.trainingLevel,
        pgyYear: candidate.pgyYear,
        monthTotal: candidate.monthTotal,
        monthPrimary: candidate.monthPrimary,
        monthBackup: candidate.monthBackup,
        monthWeekend: candidate.monthWeekend,
        helpfulReasons: candidate.helpfulReasons,
        bendableWarnings: candidate.bendableWarnings,
      })),
    };
  });

  const openSlots = reviewedSlots.filter((slot) => slot.isOpen);
  const generationReportRecord = asRecord(generationReport);

  return {
    residentTotals,

    schedulePacket: {
      monthLabel,

      scheduleSlotMode: normalizedSlotMode,

      summary: {
        requiredSlots: requiredSlots.length,
        openRequiredSlots: openSlots.length,
        residentCount: residentTotals.length,

        completeCombinationCount:
          generationReportRecord.completeCombinationCount ?? null,

        uniqueCombinations: generationReportRecord.uniqueCombinations ?? null,

        attemptsRun: generationReportRecord.attemptsRun ?? null,
      },

      rules: safeRules.map((rule) => ({
        name: rule.name ?? "Unnamed rule",
        ruleType: getRuleType(rule),
        enabled: isRuleEnabled(rule),
        hardRule: isHardRule(rule),
        strictness: getRuleStrictness(rule),
        config: getRuleConfig(rule),
      })),

      residents: residentTotals,

      historicalStats: Array.isArray(historicalStats) ? historicalStats : [],

      schedule: monthDays.map((day) => ({
        dateKey: day.key,
        dayName: day.dayName,
        isWeekend: Boolean(day.isWeekend),

        primaryMembershipId:
          safeDraftAssignments[day.key]?.primaryMembershipId ?? null,

        backupMembershipId:
          normalizedSlotMode === "Both"
            ? safeDraftAssignments[day.key]?.backupMembershipId ?? null
            : null,
      })),

      reviewedSlots,

      generationReport: generationReport ?? null,
    },
  };
}