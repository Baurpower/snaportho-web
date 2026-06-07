import type {
  DraftDayAssignment,
  ProgramCallSlotDefinition,
  ProgramRule,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import { getRotationAssignmentForDate, getRotationDisplayLabel } from "@/lib/workspace/call/resident-display";
import { extractSlotDefinitions } from "@/lib/workspace/call/rule-definitions";
import {
  getResidentPgyYear,
  normalizeCallTypeList,
  normalizeNumericList,
  resolveMatchingRules,
} from "@/lib/workspace/call/rule-evaluator";

type RotationLike = {
  residentId?: string | null;
  rosterId?: string | null;
  roster_id?: string | null;
  programMembershipId?: string | null;
  program_membership_id?: string | null;
  rotationId?: string | null;
  rotation_id?: string | null;
  rotationName?: string | null;
  rotation_name?: string | null;
  rotationShortName?: string | null;
  rotation_short_name?: string | null;
  teamLabel?: string | null;
  team_label?: string | null;
  siteLabel?: string | null;
  site_label?: string | null;
  startDate?: string | null;
  start_date?: string | null;
  endDate?: string | null;
  end_date?: string | null;
};

export type BuddyRequirement = {
  pgy1RosterId: string;
  residentName: string;
  requiredBuddyDays: number;
  maxBuddyDays: number;
  eligibleDates: string[];
  assignedDates: string[];
  remainingNeeded: number;
  remainingCapacity: number;
  reason: string;
};

export type BuddyDateState = {
  dateKey: string;
  isFridayOrSaturday: boolean;
  slotEnabled: boolean;
  isVisible: boolean;
  isRequired: boolean;
  reason: string;
  eligibleRequirementRosterIds: string[];
  eligibleRequirementResidentNames: string[];
  visibleEligibleRosterIds: string[];
  visibleEligibleResidentNames: string[];
  selectedBuddyRosterId: string | null;
  selectedBuddyResidentName: string | null;
  remainingNeededByResidentBefore: Record<string, number>;
  remainingNeededByResidentAfter: Record<string, number>;
  backupRequiredOnBuddyDay: false;
  requiredPrimaryPartnerPgy: number;
};

export const BUDDY_REQUIRED_DAYS_PER_MONTH = 2;
export const BUDDY_ALLOWED_DAYS_OF_WEEK = [5, 6] as const;
export const BUDDY_PRIMARY_PARTNER_PGY = 4;

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getMonthDateKeys(year: number, month: number) {
  const totalDays = new Date(year, month, 0).getDate();
  return Array.from({ length: totalDays }, (_, index) =>
    toDateKey(year, month, index + 1)
  );
}

function isFridayOrSaturday(dateKey: string) {
  const dayOfWeek = new Date(`${dateKey}T00:00:00`).getDay();
  return BUDDY_ALLOWED_DAYS_OF_WEEK.includes(dayOfWeek as 5 | 6);
}

export function normalizeBuddyRotationName(value: string | null | undefined) {
  if (!value) return "";
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function isBuddyEligibleRotationName(value: string | null | undefined) {
  const normalized = normalizeBuddyRotationName(value);
  return normalized.includes("genortho") || normalized.includes("pager");
}

function getBuddySlotDefinition(
  rules: ProgramRule[],
  slotDefinitions?: ProgramCallSlotDefinition[]
) {
  const definitions =
    slotDefinitions && slotDefinitions.length > 0
      ? slotDefinitions
      : extractSlotDefinitions(rules);
  return (
    definitions.find(
      (definition) => definition.callType === "Buddy"
    ) ?? null
  );
}

function getRotationLabelForResidentOnDate(
  resident: ResidentOption,
  dateKey: string,
  rotations: RotationLike[]
) {
  const fromResident = getRotationAssignmentForDate(
    resident.rotationAssignments,
    dateKey
  );

  if (fromResident) {
    return getRotationDisplayLabel(fromResident);
  }

  const fromExternal = rotations.find((rotation) => {
    const rosterId = rotation.rosterId ?? rotation.roster_id ?? null;
    const startDate = rotation.startDate ?? rotation.start_date ?? null;
    const endDate = rotation.endDate ?? rotation.end_date ?? null;
    return (
      rosterId === resident.residentId &&
      (!startDate || startDate <= dateKey) &&
      (!endDate || endDate >= dateKey)
    );
  });

  if (!fromExternal) return null;

  return getRotationDisplayLabel(fromExternal);
}

function getAssignedBuddyDates(
  residentId: string,
  assignments: Record<string, DraftDayAssignment>
) {
  return Object.entries(assignments)
    .filter(([, assignment]) => assignment.buddyRosterId === residentId)
    .map(([dateKey]) => dateKey)
    .sort();
}

function getBuddyMaxForResident(
  resident: ResidentOption,
  rules: ProgramRule[],
  eligibleDateCount: number,
  effectiveDate: string
) {
  const residentPgy = getResidentPgyYear(resident, effectiveDate);
  const hardCaps: number[] = [];
  const softCaps: number[] = [];

  for (const match of resolveMatchingRules(rules, ["monthly_load_target_by_pgy"])) {
    const targetPgyYears = normalizeNumericList(match.config.targetPgyYears);
    if (targetPgyYears.length > 0 && !targetPgyYears.includes(residentPgy ?? -1)) {
      continue;
    }

    const targetCallTypes = normalizeCallTypeList(
      Array.isArray(match.config.targetCallType)
        ? match.config.targetCallType
        : [match.config.targetCallType]
    );
    const targetCallType =
      typeof match.config.targetCallType === "string"
        ? match.config.targetCallType
        : null;
    const appliesToBuddy =
      targetCallType === "any" ||
      targetCallType === "Buddy" ||
      targetCallTypes.includes("Buddy");

    if (!appliesToBuddy) continue;

    if (
      typeof match.config.targetHardMaxCalls === "number" &&
      Number.isFinite(match.config.targetHardMaxCalls)
    ) {
      hardCaps.push(match.config.targetHardMaxCalls);
    } else if (
      typeof match.config.targetMaxCalls === "number" &&
      Number.isFinite(match.config.targetMaxCalls)
    ) {
      softCaps.push(match.config.targetMaxCalls);
    }
  }

  for (const match of resolveMatchingRules(rules, [
    "max_calls_per_month",
    "max_monthly_calls",
  ])) {
    if (
      typeof match.config.maxCalls === "number" &&
      Number.isFinite(match.config.maxCalls)
    ) {
      hardCaps.push(match.config.maxCalls);
    }
  }

  const configuredCap =
    hardCaps.length > 0
      ? Math.min(...hardCaps)
      : softCaps.length > 0
      ? Math.min(...softCaps)
      : BUDDY_REQUIRED_DAYS_PER_MONTH;

  return Math.max(0, Math.min(eligibleDateCount, configuredCap));
}

export function getBuddyRequirementsForMonth(params: {
  year: number;
  month: number;
  residents: ResidentOption[];
  rotations: RotationLike[];
  rules: ProgramRule[];
  slotDefinitions?: ProgramCallSlotDefinition[];
  assignments?: Record<string, DraftDayAssignment>;
}): BuddyRequirement[] {
  const {
    year,
    month,
    residents,
    rotations,
    rules,
    slotDefinitions,
    assignments = {},
  } = params;

  const buddySlotDefinition = getBuddySlotDefinition(rules, slotDefinitions);
  if (!buddySlotDefinition) return [];

  const monthDateKeys = getMonthDateKeys(year, month);
  const buddyDateKeys = monthDateKeys.filter(isFridayOrSaturday);

  return residents
    .filter((resident) => {
      return buddyDateKeys.some((dateKey) => {
        return (
          getResidentPgyYear(resident, dateKey) === 1 &&
          isBuddyEligibleRotationName(
            getRotationLabelForResidentOnDate(resident, dateKey, rotations)
          )
        );
      });
    })
    .map((resident) => {
      const eligibleDates = buddyDateKeys.filter((dateKey) => {
        return (
          getResidentPgyYear(resident, dateKey) === 1 &&
          isBuddyEligibleRotationName(
            getRotationLabelForResidentOnDate(resident, dateKey, rotations)
          )
        )
      });
      const maxBuddyDays = getBuddyMaxForResident(
        resident,
        rules,
        eligibleDates.length,
        buddyDateKeys[0] ?? toDateKey(year, month, 1)
      );
      const requiredBuddyDays = Math.min(BUDDY_REQUIRED_DAYS_PER_MONTH, maxBuddyDays);
      const assignedDates = getAssignedBuddyDates(resident.residentId, assignments).filter(
        (dateKey) => eligibleDates.includes(dateKey)
      );
      const remainingNeeded = Math.max(
        0,
        requiredBuddyDays - assignedDates.length
      );
      const remainingCapacity = Math.max(0, maxBuddyDays - assignedDates.length);

      let reason = "Resident needs Buddy assignments.";
      if (eligibleDates.length === 0) {
        reason = "Resident is not on Gen Ortho/Pager on any Friday/Saturday this month.";
      } else if (maxBuddyDays === 0) {
        reason = "Resident is eligible for Buddy dates but program call limits allow 0 Buddy assignments.";
      } else if (remainingNeeded === 0) {
        reason =
          remainingCapacity === 0
            ? "Resident already satisfied Buddy assignment maximum for this month."
            : "Resident already satisfied required Buddy minimum and may take optional Buddy call.";
      } else {
        reason = `Resident needs ${remainingNeeded} more Buddy day${remainingNeeded === 1 ? "" : "s"} this month.`;
      }

      return {
        pgy1RosterId: resident.residentId,
        residentName: resident.displayName,
        requiredBuddyDays,
        maxBuddyDays,
        eligibleDates,
        assignedDates,
        remainingNeeded,
        remainingCapacity,
        reason,
      };
    })
    .sort((left, right) => {
      if (left.eligibleDates.length !== right.eligibleDates.length) {
        return left.eligibleDates.length - right.eligibleDates.length;
      }
      return left.residentName.localeCompare(right.residentName);
    });
}

export function getBuddyDateStatesForMonth(params: {
  year: number;
  month: number;
  residents: ResidentOption[];
  rotations: RotationLike[];
  rules: ProgramRule[];
  slotDefinitions?: ProgramCallSlotDefinition[];
  assignments?: Record<string, DraftDayAssignment>;
}): BuddyDateState[] {
  const {
    year,
    month,
    residents,
    rotations,
    rules,
    slotDefinitions,
    assignments = {},
  } = params;
  const buddySlotDefinition = getBuddySlotDefinition(rules, slotDefinitions);
  const requirements = getBuddyRequirementsForMonth({
    year,
    month,
    residents,
    rotations,
    rules,
    slotDefinitions,
    assignments,
  });
  const remainingByRosterId = new Map(
    requirements.map((requirement) => [
      requirement.pgy1RosterId,
      requirement.requiredBuddyDays,
    ])
  );
  const remainingCapacityByRosterId = new Map(
    requirements.map((requirement) => [
      requirement.pgy1RosterId,
      requirement.maxBuddyDays,
    ])
  );
  const residentNameByRosterId = new Map(
    requirements.map((requirement) => [requirement.pgy1RosterId, requirement.residentName])
  );

  return getMonthDateKeys(year, month).map((dateKey) => {
    const isEligibleWeekendDate = isFridayOrSaturday(dateKey);
    const remainingNeededByResidentBefore = Object.fromEntries(
      [...remainingByRosterId.entries()]
    );
    const eligibleRequirements = requirements.filter((requirement) => {
      return (
        isEligibleWeekendDate &&
        requirement.eligibleDates.includes(dateKey) &&
        (remainingByRosterId.get(requirement.pgy1RosterId) ?? 0) > 0
      );
    });
    const visibleRequirements = requirements.filter((requirement) => {
      return (
        isEligibleWeekendDate &&
        requirement.eligibleDates.includes(dateKey) &&
        (remainingCapacityByRosterId.get(requirement.pgy1RosterId) ?? 0) > 0
      );
    });
    const selectedBuddyRosterId = assignments[dateKey]?.buddyRosterId ?? null;
    const selectedBuddyResidentName = selectedBuddyRosterId
      ? residentNameByRosterId.get(selectedBuddyRosterId) ?? null
      : null;

    let reason = "Buddy slot disabled/missing.";
    if (!buddySlotDefinition) {
      reason = "Buddy slot definition disabled/missing.";
    } else if (!isEligibleWeekendDate) {
      reason = "Buddy not required because this is not Friday or Saturday.";
    } else if (eligibleRequirements.length === 0) {
      reason =
        visibleRequirements.length === 0
          ? "No PGY-1 Gen Ortho/Pager resident can take Buddy on this date."
          : "Buddy slot visible but no PGY-1 still needs required Buddy days on this date.";
    } else if (selectedBuddyRosterId) {
      reason = "Buddy date selected for an eligible PGY-1 resident.";
    } else {
      reason = "Buddy date available because an eligible PGY-1 still needs Buddy days.";
    }

    if (
      selectedBuddyRosterId &&
      eligibleRequirements.some(
        (requirement) => requirement.pgy1RosterId === selectedBuddyRosterId
      )
    ) {
      remainingByRosterId.set(
        selectedBuddyRosterId,
        Math.max(0, (remainingByRosterId.get(selectedBuddyRosterId) ?? 0) - 1)
      );
    }

    if (
      selectedBuddyRosterId &&
      remainingCapacityByRosterId.has(selectedBuddyRosterId)
    ) {
      remainingCapacityByRosterId.set(
        selectedBuddyRosterId,
        Math.max(
          0,
          (remainingCapacityByRosterId.get(selectedBuddyRosterId) ?? 0) - 1
        )
      );
    }

    const remainingNeededByResidentAfter = Object.fromEntries(
      [...remainingByRosterId.entries()]
    );

    return {
      dateKey,
      isFridayOrSaturday: isEligibleWeekendDate,
      slotEnabled: Boolean(buddySlotDefinition),
      isVisible: Boolean(buddySlotDefinition) && visibleRequirements.length > 0,
      isRequired: Boolean(buddySlotDefinition) && eligibleRequirements.length > 0,
      reason,
      eligibleRequirementRosterIds: eligibleRequirements.map(
        (requirement) => requirement.pgy1RosterId
      ),
      eligibleRequirementResidentNames: eligibleRequirements.map(
        (requirement) => requirement.residentName
      ),
      visibleEligibleRosterIds: visibleRequirements.map(
        (requirement) => requirement.pgy1RosterId
      ),
      visibleEligibleResidentNames: visibleRequirements.map(
        (requirement) => requirement.residentName
      ),
      selectedBuddyRosterId,
      selectedBuddyResidentName,
      remainingNeededByResidentBefore,
      remainingNeededByResidentAfter,
      backupRequiredOnBuddyDay: false,
      requiredPrimaryPartnerPgy: BUDDY_PRIMARY_PARTNER_PGY,
    };
  });
}
