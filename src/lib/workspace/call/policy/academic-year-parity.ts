import type {
  DraftDayAssignment,
  ProgramCallSlotDefinition,
  ProgramRule,
  ResidentAvailabilityMap,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import { buildSchedulingContext } from "./context";
import { compilePolicy } from "./compile";
import { evaluateSlot } from "./evaluator";
import {
  projectLegacyRulesToPolicyDocumentV2,
  type ProgramCallPolicyDocumentV2,
} from "./authoring-document-v2";
import { compilePolicyDocumentV2 } from "./compile-authoring-v2";

export type AcademicYearParityDifference = {
  dateKey: string;
  residentId: string;
  slot: string;
  source: unknown;
  projected: unknown;
};

export type AcademicYearParityReport = {
  kind: "academic_year_synthetic";
  academicYear: string;
  days: number;
  residents: number;
  slots: number;
  evaluations: number;
  differences: AcademicYearParityDifference[];
  passed: boolean;
};

type ParityProgramRule = {
  id?: string | null;
  rule_type: string;
  name?: string | null;
  is_enabled?: boolean;
  is_hard_rule?: boolean;
  priority?: number;
  config?: Record<string, unknown> | null;
};

function datesInclusive(start: string, end: string) {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function slotDefinitions(rules: ParityProgramRule[]): ProgramCallSlotDefinition[] {
  return rules
    .filter((rule) => rule.rule_type === "call_slot_definition" && rule.is_enabled !== false)
    .map((rule, index) => ({
      id: rule.id ?? `slot-${index}`,
      label: String(rule.config?.slotLabel ?? rule.name ?? rule.rule_type),
      shortLabel: String(rule.config?.slotShortLabel ?? ""),
      callType: String(rule.config?.slotCallType ?? rule.name ?? rule.rule_type),
      colorKey: String(rule.config?.slotColorKey ?? "slate"),
      requiredMode: rule.config?.slotRequiredMode as ProgramCallSlotDefinition["requiredMode"],
      daysOfWeek: rule.config?.slotDaysOfWeek as number[] | undefined,
      condition: rule.config?.slotCondition as ProgramCallSlotDefinition["condition"],
      countsTowardWorkload: rule.config?.slotCountsTowardWorkload !== false,
      requiredWhenVisible: rule.config?.slotRequiredWhenVisible !== false,
      sortOrder: Number(rule.config?.slotSortOrder ?? index),
    }));
}

function rotationIds(rules: ParityProgramRule[], key: string): string[] {
  return rules.flatMap((rule) => {
    const value = (rule.config as Record<string, unknown> | null | undefined)?.[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  });
}

function resident(
  residentId: string,
  gradYear: number,
  rotations: Array<{ rotationId: string; rotationName: string; startDate: string; endDate: string }>
): ResidentOption {
  return {
    residentId,
    membershipId: residentId,
    displayName: residentId,
    trainingLevel: null,
    pgyYear: null,
    gradYear,
    rotationAssignments: rotations,
  };
}

function buildCohort(rules: ParityProgramRule[]) {
  const blocked = rotationIds(rules, "rotationIds");
  const limited = rotationIds(rules, "rotationCallLimitIds");
  const preferred = rotationIds(rules, "preferenceRotationIds");
  const allYear = { startDate: "2026-07-01", endDate: "2027-06-30" };
  const residents: ResidentOption[] = [
    resident("pgy1-service", 2031, [
      { rotationId: "service-one", rotationName: "Gen Ortho / Pager", startDate: "2026-08-01", endDate: "2026-08-31" },
      { rotationId: "service-two", rotationName: "Gen Ortho / Pager", startDate: "2026-10-01", endDate: "2026-10-31" },
    ]),
    resident("pgy1-neutral", 2031, []),
    resident("pgy2-neutral", 2030, []),
    resident("pgy3-neutral", 2029, []),
    resident("pgy4-neutral", 2028, []),
    resident("pgy5-neutral", 2027, []),
  ];

  blocked.forEach((rotationId, index) => {
    residents.push(
      resident(`blocked-${index}`, 2030, [
        { rotationId, rotationName: `Blocked rotation ${index + 1}`, ...allYear },
      ])
    );
  });
  limited.forEach((rotationId, index) => {
    residents.push(
      resident(`limited-${index}`, 2029, [
        { rotationId, rotationName: `Limited rotation ${index + 1}`, ...allYear },
      ])
    );
  });
  preferred.forEach((rotationId, index) => {
    residents.push(
      resident(`preferred-${index}`, 2028, [
        { rotationId, rotationName: `Preferred rotation ${index + 1}`, ...allYear },
      ])
    );
  });
  return residents;
}

function buildAssignments(dates: string[]): Record<string, DraftDayAssignment> {
  const primaryCycle = ["pgy2-neutral", "pgy3-neutral", "pgy4-neutral", "pgy5-neutral"];
  return Object.fromEntries(
    dates
      .filter((_, index) => index % 5 === 0)
      .map((dateKey, index) => [
        dateKey,
        {
          primaryRosterId: primaryCycle[index % primaryCycle.length] ?? null,
          backupRosterId: index % 2 === 0 ? "pgy5-neutral" : null,
          buddyRosterId: index % 4 === 2 ? "pgy1-service" : null,
        },
      ])
  );
}

function buildAvailability(residents: ResidentOption[]): ResidentAvailabilityMap {
  const availability: ResidentAvailabilityMap = {};
  for (const residentOption of residents) {
    for (const dateKey of ["2026-08-14", "2026-10-16"]) {
      availability[residentOption.residentId] ??= {};
      availability[residentOption.residentId]![dateKey] = {
        residentId: residentOption.residentId,
        membershipId: residentOption.membershipId,
        dateKey,
        isBlocked: dateKey.endsWith("14"),
        isWarning: dateKey.endsWith("16"),
        timeOffConflicts: [
          {
            eventId: `${residentOption.residentId}-${dateKey}`,
            title: dateKey.endsWith("14") ? "Approved leave" : "Requested leave",
            type: "vacation",
            usingPto: true,
            startDate: dateKey,
            endDate: dateKey,
            approvalStatus: dateKey.endsWith("14") ? "approved" : "requested",
          },
        ],
        rotationConflicts: (residentOption.rotationAssignments ?? [])
          .filter((rotation) => (rotation.startDate ?? "") <= dateKey && (rotation.endDate ?? "") >= dateKey)
          .map((rotation) => ({
            rotationId: rotation.rotationId ?? "",
            rotationName: rotation.rotationName ?? "Rotation",
          })),
        flags: [],
      };
    }
  }
  return availability;
}

function stableEvaluation(value: ReturnType<typeof evaluateSlot>) {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

export function runAcademicYearPolicyParity(params: {
  ruleSetId: string;
  ruleSetName: string;
  rules: ParityProgramRule[];
  startDate?: string;
  endDate?: string;
  document?: ProgramCallPolicyDocumentV2;
}): AcademicYearParityReport {
  const startDate = params.startDate ?? "2026-07-01";
  const endDate = params.endDate ?? "2027-06-30";
  const dates = datesInclusive(startDate, endDate);
  const definitions = slotDefinitions(params.rules);
  const document = params.document ?? projectLegacyRulesToPolicyDocumentV2({
    ruleSetId: params.ruleSetId,
    name: params.ruleSetName,
    rules: params.rules.map((rule) => ({
      id: rule.id ?? `${rule.rule_type}-${rule.priority ?? 0}`,
      rule_type: rule.rule_type,
      name: rule.name ?? rule.rule_type,
      is_enabled: rule.is_enabled !== false,
      is_hard_rule: rule.is_hard_rule === true,
      priority: rule.priority ?? 0,
      config: rule.config ?? {},
    })),
    generatedAt: `${startDate}T00:00:00.000Z`,
  });
  // Projection rejects unknown rule types before the generic persisted shape is
  // handed to the existing strongly typed compiler.
  const sourcePolicy = compilePolicy(params.rules as ProgramRule[], definitions);
  const projectedPolicy = compilePolicyDocumentV2(document);
  const residents = buildCohort(params.rules);
  const assignments = buildAssignments(dates);
  const availability = buildAvailability(residents);
  const context = buildSchedulingContext({ residents, availability, assignments });
  const slots = definitions.map((definition) => definition.callType);
  const differences: AcademicYearParityDifference[] = [];
  let evaluations = 0;

  for (const dateKey of dates) {
    for (const residentOption of residents) {
      for (const slot of slots) {
        const shared = {
          resident: residentOption,
          slot,
          dateKey,
          ctx: context,
          assignments,
          availabilityByResident: availability,
        };
        const source = stableEvaluation(evaluateSlot({ ...shared, policy: sourcePolicy }));
        const projected = stableEvaluation(evaluateSlot({ ...shared, policy: projectedPolicy }));
        evaluations += 1;
        if (JSON.stringify(source) !== JSON.stringify(projected) && differences.length < 100) {
          differences.push({ dateKey, residentId: residentOption.residentId, slot, source, projected });
        }
      }
    }
  }

  return {
    kind: "academic_year_synthetic",
    academicYear: `${startDate}/${endDate}`,
    days: dates.length,
    residents: residents.length,
    slots: slots.length,
    evaluations,
    differences,
    passed: differences.length === 0,
  };
}
