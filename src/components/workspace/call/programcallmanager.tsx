"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import ProgramCallReviewModal from "@/components/workspace/call/programcallreviewmodal";
import { generateCallSchedule } from "@/components/workspace/call/programcallautogenerator";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Settings2,
  Wand2,
} from "lucide-react";
import ProgramRulesSheet from "@/components/workspace/call/programrulessheet";
import ResidentPickerSheet from "@/components/workspace/call/residentpickersheet";
import ProgramCallAddView from "@/components/workspace/call/programcalladdview";
import ProgramCallEditView from "@/components/workspace/call/programcalleditview";
import type { CallValidationResult } from "@/lib/workspace/call/validation";
import { serializeSlotId } from "@/lib/workspace/call/validation";
import {
  getValidationBadgeText,
  getValidationSeverityClass,
  getValidationSummary,
  getValidationTooltip,
} from "@/lib/workspace/call/validation-display";
import type {
  AssignmentFlag,
  CalendarDay,
  DraftDayAssignment,
  ExistingResidentStats,
  MonthCall,
  MonthResponse,
  ProgramAvailabilityMonthResponse,
  ProgramRule,
  QuickAssignSlotMode,
  ResidentOption,
  ResidentSchedulingStats,
} from "@/components/workspace/call/programcalltypes";
import {
  getFlagsForAssignedResident,
  isResidentAllowedForSlot,
} from "@/components/workspace/call/programcallevaluator";
import {
  getCallMutationValidation,
  parseCallMutationResponse,
} from "@/lib/workspace/call/mutation-error";

type Slot = "Primary" | "Backup";
type ScheduleSlotMode = "Primary" | "Both";

type RotationAssignmentLike = {
  rotationId?: string | null;
  rotation_id?: string | null;
  startDate?: string | null;
  start_date?: string | null;
  endDate?: string | null;
  end_date?: string | null;
};

type ResidentWithRotation = ResidentOption & {
  rosterId?: string | null;
  roster_id?: string | null;
  currentRotationId?: string | null;
  rotationId?: string | null;
  activeRotationId?: string | null;
  current_rotation_id?: string | null;
  rotation_id?: string | null;
  rotationAssignments?: RotationAssignmentLike[];
};

type ProgramMembersApiResident = {
  residentId?: string | null;
  membershipId?: string | null;
  programMembershipId?: string | null;
  rosterId?: string | null;    
  roster_id?: string | null;
  displayName?: string | null;
  trainingLevel?: string | null;
  pgyYear?: number | null;
  gradYear?: number | null;
};

type ProgramMembersApiResponse = {
  residents?: ProgramMembersApiResident[];
};

type CoverageItem = {
  rosterId?: string | null;
  roster_id?: string | null;
  membershipId?: string | null;
  membership_id?: string | null;
  rotationId?: string | null;
  rotation_id?: string | null;
  rotation?: {
    id?: string | null;
  } | null;
  startDate?: string | null;
  start_date?: string | null;
  endDate?: string | null;
  end_date?: string | null;
};

type CoveragePayload = {
  coverage?: CoverageItem[];
  assignments?: CoverageItem[];
  rotationAssignments?: CoverageItem[];
};

type AIReviewContext = {
  monthLabel: string;
  scheduleSlotMode: ScheduleSlotMode;
  coverage: {
    assignedSlots: number;
    expectedSlots: number;
    unfilledRequiredSlots: Array<{
      dateKey: string;
      dayName: string;
      isWeekend: boolean;
      slot: Slot;
    }>;
  };
  schedule: Array<{
    dateKey: string;
    dayName: string;
    isWeekend: boolean;
    primaryMembershipId: string | null;
    backupMembershipId: string | null;
    primaryName: string | null;
    backupName: string | null;
    primaryFlags: AssignmentFlag[];
    backupFlags: AssignmentFlag[];
  }>;
  residentStats: ResidentSchedulingStats[];
  pgyStats: {
    label: string;
    monthTotal: number;
    monthWeekend: number;
    yearTotal: number;
    yearWeekend: number;
  }[];
};

function getScheduleSlotModeFromRules(rules: ProgramRule[]): ScheduleSlotMode | null {
  const requiredSlotsRule = rules.find(
    (rule) => rule.rule_type === "required_daily_call_slots" && rule.is_enabled
  );

  if (!requiredSlotsRule) return null;

  const requiredCallTypes = Array.isArray(requiredSlotsRule.config?.requiredCallTypes)
    ? requiredSlotsRule.config.requiredCallTypes
    : [];

  return requiredCallTypes.includes("Backup") ? "Both" : "Primary";
}

function formatMonthLabel(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getMonthStart(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function getMonthRange(monthValue: string) {
  const start = getMonthStart(monthValue);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

  return {
    monthStart: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(start.getDate()).padStart(2, "0")}`,
    monthEnd: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(end.getDate()).padStart(2, "0")}`,
  };
}

function getMonthDays(monthValue: string): CalendarDay[] {
  const start = getMonthStart(monthValue);
  const year = start.getFullYear();
  const monthIndex = start.getMonth();
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: lastDay }, (_, i) => {
    const date = new Date(year, monthIndex, i + 1);
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(
      i + 1
    ).padStart(2, "0")}`;

    return {
      date,
      key,
      dayNumber: i + 1,
      dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    };
  });
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(monthValue: string, amount: number) {
  const [year, month] = monthValue.split("-").map(Number);
  const next = new Date(year, month - 1 + amount, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function pgyLabel(
  resident:
    | ResidentOption
    | {
        trainingLevel: string | null;
        pgyYear?: number | null;
      }
) {
  if (typeof resident.pgyYear === "number") return `PGY-${resident.pgyYear}`;
  if (resident.trainingLevel) return resident.trainingLevel;
  return "Unknown";
}

function getCalendarGrid(monthValue: string) {
  const days = getMonthDays(monthValue);
  const firstDay = getMonthStart(monthValue).getDay();
  const blanks = Array.from(
    { length: firstDay },
    () => null as CalendarDay | null
  );
  return [...blanks, ...days];
}

function getResidentYearValue(resident: ResidentOption) {
  if (typeof resident.pgyYear === "number") return resident.pgyYear;
  if (resident.gradYear !== null) return 99;

  const match = resident.trainingLevel?.match(/(\d+)/);
  if (match) return Number(match[1]);

  return 99;
}

function sortResidentsForSchedule(residents: ResidentOption[]) {
  return [...residents].sort((a, b) => {
    const yearDiff = getResidentYearValue(a) - getResidentYearValue(b);
    if (yearDiff !== 0) return yearDiff;
    return a.displayName.localeCompare(b.displayName);
  });
}

function getAssignedDatesForResident(
  residentId: string,
  assignments: Record<string, DraftDayAssignment>
) {
  return Object.entries(assignments)
    .filter(
      ([, assignment]) =>
        assignment?.primaryMembershipId === residentId ||
        assignment?.backupMembershipId === residentId
    )
    .map(([dateKey]) => dateKey)
    .sort();
}

function buildAssignmentsFromCalls(calls: MonthCall[]) {
  const nextAssignments: Record<string, DraftDayAssignment> = {};

  for (const call of calls) {
    if (!call.callDate || !call.callType) continue;

    const current = nextAssignments[call.callDate] ?? {
      primaryMembershipId: null,
      backupMembershipId: null,
    };

    const residentId = call.residentId ?? call.rosterId ?? call.membershipId;

    if (call.callType === "Primary") {
      current.primaryMembershipId = residentId;
    }

    if (call.callType === "Backup") {
      current.backupMembershipId = residentId;
    }

    nextAssignments[call.callDate] = current;
  }

  return nextAssignments;
}

function getCoverageItems(payload: CoveragePayload | null): CoverageItem[] {
  if (Array.isArray(payload?.coverage)) return payload.coverage;
  if (Array.isArray(payload?.assignments)) return payload.assignments;
  if (Array.isArray(payload?.rotationAssignments)) return payload.rotationAssignments;
  return [];
}

function buildRotationAssignmentsByRosterId(payload: CoveragePayload | null) {
  const rotationAssignmentsByRosterId = new Map<string, RotationAssignmentLike[]>();

  for (const item of getCoverageItems(payload)) {
    const rosterId = String(
      item.rosterId ?? item.roster_id ?? item.membershipId ?? item.membership_id ?? ""
    );

    const rotationId = item.rotation?.id ?? item.rotationId ?? item.rotation_id ?? null;

    if (!rosterId || !rotationId) continue;

    const current = rotationAssignmentsByRosterId.get(rosterId) ?? [];
    const startDate = item.startDate ?? item.start_date ?? null;
    const endDate = item.endDate ?? item.end_date ?? null;

    current.push({
      rotationId,
      rotation_id: rotationId,
      startDate,
      start_date: startDate,
      endDate,
      end_date: endDate,
    });

    rotationAssignmentsByRosterId.set(rosterId, current);
  }

  return rotationAssignmentsByRosterId;
}

export default function ProgramCallManager() {
  const [builderMonth, setBuilderMonth] = useState(getCurrentMonthValue());
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [residentLoading, setResidentLoading] = useState(true);
  const [callsLoading, setCallsLoading] = useState(false);
  const [existingCalls, setExistingCalls] = useState<MonthCall[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [historicalStats, setHistoricalStats] = useState<ExistingResidentStats[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [programAvailability, setProgramAvailability] =
    useState<ProgramAvailabilityMonthResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverValidationResult, setServerValidationResult] =
    useState<CallValidationResult | null>(null);
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const [draftAssignments, setDraftAssignments] = useState<
    Record<string, DraftDayAssignment>
  >({});
  const [originalAssignments, setOriginalAssignments] = useState<
    Record<string, DraftDayAssignment>
  >({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [generationReport, setGenerationReport] = useState<unknown>(null);
  const [aiAutoReviewToken, setAiAutoReviewToken] = useState<number | null>(null);
  const [showRulesSheet, setShowRulesSheet] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSlot, setPickerSlot] = useState<{
    dateKey: string;
    slot: Slot;
  } | null>(null);
  const [quickAssignResidentId, setQuickAssignResidentId] = useState("");
  const [quickAssignSlotMode, setQuickAssignSlotMode] =
    useState<QuickAssignSlotMode>("Primary");
  const [scheduleSlotMode, setScheduleSlotMode] =
    useState<ScheduleSlotMode>("Primary");
  const [rules, setRules] = useState<ProgramRule[]>([]);

  const monthDays = useMemo(() => getMonthDays(builderMonth), [builderMonth]);
  const calendarGrid = useMemo(() => getCalendarGrid(builderMonth), [builderMonth]);

  async function loadRules() {
    try {
      const ruleSetResponse = await fetch("/api/program/call-rule-sets", {
        credentials: "include",
      });

      const ruleSetPayload = await ruleSetResponse.json();
      const ruleSetId = ruleSetPayload.defaultRuleSetId;

      if (!ruleSetId) {
        setRules([]);
        return;
      }

      const rulesResponse = await fetch(
        `/api/program/call-rules?ruleSetId=${encodeURIComponent(ruleSetId)}`,
        {
          credentials: "include",
        }
      );

      const rulesPayload = await rulesResponse.json();
      const nextRules = Array.isArray(rulesPayload?.rules) ? rulesPayload.rules : [];
      setRules(nextRules);

      const persistedSlotMode = getScheduleSlotModeFromRules(nextRules);
      if (persistedSlotMode) {
        setScheduleSlotMode(persistedSlotMode);
      }
    } catch (error) {
      console.error("Failed to load rules", error);
      setRules([]);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadResidents() {
      try {
        setResidentLoading(true);

        const { monthStart, monthEnd } = getMonthRange(builderMonth);

const [membersResponse, rotationAssignmentsResponse] = await Promise.all([
  fetch(`/api/program/members?effectiveDate=${encodeURIComponent(monthStart)}`, {
    credentials: "include",
  }),
  fetch(
    `/api/program/rotation-assignments?monthStart=${encodeURIComponent(
      monthStart
    )}&monthEnd=${encodeURIComponent(monthEnd)}`,
    {
      credentials: "include",
      cache: "no-store",
    }
  ),
]);

const payload: ProgramMembersApiResponse | null = await membersResponse
  .json()
  .catch(() => null);

const rotationAssignmentsPayload: CoveragePayload | null =
  await rotationAssignmentsResponse.json().catch(() => null);

if (!membersResponse.ok) {
  throw new Error("Failed to load residents");
}

if (!rotationAssignmentsResponse.ok) {
  throw new Error("Failed to load rotation assignments");
}

if (cancelled) return;

const rotationAssignmentsByRosterId =
  buildRotationAssignmentsByRosterId(rotationAssignmentsPayload);

        const items: ResidentOption[] = Array.isArray(payload?.residents)
  ? payload.residents
      .map((item) => {
        const rosterId = String(item.rosterId ?? item.roster_id ?? "");

        if (!rosterId) return null;

        const resident: ResidentWithRotation = {
          residentId: rosterId,
          membershipId: rosterId,
          programMembershipId:
            item.programMembershipId ?? item.membershipId ?? null,
          rosterId,
          roster_id: rosterId,
          displayName: String(item.displayName ?? "Unknown"),
          trainingLevel: item.trainingLevel ?? null,
          pgyYear: typeof item.pgyYear === "number" ? item.pgyYear : null,
          gradYear: typeof item.gradYear === "number" ? item.gradYear : null,
          rotationAssignments: rotationAssignmentsByRosterId.get(rosterId) ?? [],
        };

        return resident;
      })
      .filter((item): item is ResidentOption => item !== null)
  : [];

        setResidents(items);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load residents", err);
          setResidents([]);
        }
      } finally {
        if (!cancelled) setResidentLoading(false);
      }
    }

    loadResidents();

    return () => {
      cancelled = true;
    };
  }, [builderMonth]);

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMonth() {
      try {
        setCallsLoading(true);
        setError(null);

        const { monthStart, monthEnd } = getMonthRange(builderMonth);

        const response = await fetch(
          `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
          { credentials: "include" }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to load month calls");
        }

        const payload: MonthResponse = await response.json();

        if (cancelled) return;

        const calls = Array.isArray(payload.calls) ? payload.calls : [];
        const nextAssignments = buildAssignmentsFromCalls(calls);
        const inferredSlotMode =
          calls.some((call) => call.callType === "Backup") ? "Both" : "Primary";

        setExistingCalls(calls);
        setDraftAssignments(nextAssignments);
        setOriginalAssignments(nextAssignments);
        setQuickAssignResidentId("");
        setScheduleSlotMode((current) => {
          const persistedMode = getScheduleSlotModeFromRules(rules);
          return persistedMode ?? inferredSlotMode ?? current;
        });
      } catch (err) {
        if (!cancelled) {
          setExistingCalls([]);
          setDraftAssignments({});
          setOriginalAssignments({});
          setError(err instanceof Error ? err.message : "Failed to load month");
        }
      } finally {
        if (!cancelled) setCallsLoading(false);
      }
    }

    loadMonth();

    return () => {
      cancelled = true;
    };
  }, [builderMonth]);

    useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        setStatsLoading(true);

        const response = await fetch(
          `/api/program/calls/stats?month=${builderMonth}`,
          { credentials: "include" }
        );

        if (!response.ok) throw new Error("Failed to load stats");

        const payload = await response.json();

        if (cancelled) return;

        setHistoricalStats(
          Array.isArray(payload?.residentStats) ? payload.residentStats : []
        );
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load stats", err);
          setHistoricalStats([]);
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [builderMonth]);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      try {
        setAvailabilityLoading(true);

        const { monthStart, monthEnd } = getMonthRange(builderMonth);

        const response = await fetch(
          `/api/program/availability/month?monthStart=${encodeURIComponent(
            monthStart
          )}&monthEnd=${encodeURIComponent(monthEnd)}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load program availability");
        }

        if (cancelled) return;

        setProgramAvailability(payload as ProgramAvailabilityMonthResponse);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load program availability", err);
          setProgramAvailability(null);
        }
      } finally {
        if (!cancelled) setAvailabilityLoading(false);
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [builderMonth]);

  const sortedResidents = useMemo(
    () => sortResidentsForSchedule(residents),
    [residents]
  );

  const residentLookup = useMemo(() => {
    return new Map(residents.map((resident) => [resident.residentId, resident]));
  }, [residents]);

  const getAssignedResidentFlags = useCallback(
    (params: {
      residentId: string | null | undefined;
      dateKey: string;
      assignments: Record<string, DraftDayAssignment>;
      rules: ProgramRule[];
    }): AssignmentFlag[] => {
      if (!params.residentId) return [];

      const resident = residentLookup.get(params.residentId);
      if (!resident) return [];

      const assignmentForDay = params.assignments[params.dateKey];

      const slot: Slot =
        assignmentForDay?.primaryMembershipId === params.residentId
          ? "Primary"
          : "Backup";

      return getFlagsForAssignedResident({
        resident,
        slot,
        dateKey: params.dateKey,
        assignments: params.assignments,
        rules: params.rules,
        availabilityByResident: programAvailability?.availability ?? {},
      });
    },
    [residentLookup, programAvailability]
  );

  const selectableResidentsBySlot = useMemo(() => {
    return {
      Primary: sortedResidents.filter((resident) =>
        !pickerSlot
          ? true
          : isResidentAllowedForSlot({
              resident,
              slot: "Primary",
              dateKey: pickerSlot.dateKey,
              assignments: draftAssignments,
              rules,
              availabilityByResident: programAvailability?.availability ?? {},
            })
      ),
      Backup: sortedResidents.filter((resident) =>
        !pickerSlot
          ? true
          : isResidentAllowedForSlot({
              resident,
              slot: "Backup",
              dateKey: pickerSlot.dateKey,
              assignments: draftAssignments,
              rules,
              availabilityByResident: programAvailability?.availability ?? {},
            })
      ),
    };
  }, [sortedResidents, pickerSlot, draftAssignments, rules, programAvailability]);

  const computedStats = useMemo(() => {
    const perResident = new Map<string, ResidentSchedulingStats>();

    for (const resident of residents) {
      const baseline = historicalStats.find(
        (item) => item.residentId === resident.residentId
      );

      perResident.set(resident.residentId, {
        resident,
        monthPrimary: 0,
        monthBackup: 0,
        monthTotal: 0,
        monthWeekend: 0,
        yearPrimary: baseline?.primaryCallsYear ?? 0,
        yearBackup: baseline?.backupCallsYear ?? 0,
        yearTotal: baseline?.totalCallsYear ?? 0,
        yearWeekend: baseline?.weekendCallsYear ?? 0,
        spacingFlags: 0,
      });
    }

    for (const day of monthDays) {
      const assignment = draftAssignments[day.key];
      if (!assignment) continue;

      if (assignment.primaryMembershipId) {
        const entry = perResident.get(assignment.primaryMembershipId);

        if (entry) {
          entry.monthPrimary += 1;
          entry.monthTotal += 1;
          entry.yearPrimary += 1;
          entry.yearTotal += 1;

          if (day.isWeekend) {
            entry.monthWeekend += 1;
            entry.yearWeekend += 1;
          }
        }
      }

      if (assignment.backupMembershipId) {
        const entry = perResident.get(assignment.backupMembershipId);

        if (entry) {
          entry.monthBackup += 1;
          entry.monthTotal += 1;
          entry.yearBackup += 1;
          entry.yearTotal += 1;

          if (day.isWeekend) {
            entry.monthWeekend += 1;
            entry.yearWeekend += 1;
          }
        }
      }
    }

    for (const resident of residents) {
      const assignedDates = getAssignedDatesForResident(
        resident.residentId,
        draftAssignments
      );

      const entry = perResident.get(resident.residentId);

      if (entry) {
        entry.spacingFlags = Math.max(0, assignedDates.length - 1);
      }
    }

    const residentRows = Array.from(perResident.values()).sort((a, b) => {
      const yearDiff =
        getResidentYearValue(a.resident) - getResidentYearValue(b.resident);

      if (yearDiff !== 0) return yearDiff;
      if (b.monthTotal !== a.monthTotal) return b.monthTotal - a.monthTotal;

      return a.resident.displayName.localeCompare(b.resident.displayName);
    });

    const byPgy = new Map<
      string,
      {
        label: string;
        monthTotal: number;
        monthWeekend: number;
        yearTotal: number;
        yearWeekend: number;
      }
    >();

    for (const row of residentRows) {
      const label = pgyLabel(row.resident);
      const current = byPgy.get(label) ?? {
        label,
        monthTotal: 0,
        monthWeekend: 0,
        yearTotal: 0,
        yearWeekend: 0,
      };

      current.monthTotal += row.monthTotal;
      current.monthWeekend += row.monthWeekend;
      current.yearTotal += row.yearTotal;
      current.yearWeekend += row.yearWeekend;

      byPgy.set(label, current);
    }

    const fullyBuiltDays = monthDays.filter((day) => {
      const assignment = draftAssignments[day.key];
      return assignment?.primaryMembershipId && assignment?.backupMembershipId;
    }).length;

    return {
      residentRows,
      pgyRows: Array.from(byPgy.values()).sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true })
      ),
      fullyBuiltDays,
    };
  }, [draftAssignments, historicalStats, monthDays, residents]);

  const aiReviewContext: AIReviewContext = useMemo(() => {
    const expectedSlots =
      scheduleSlotMode === "Primary" ? monthDays.length : monthDays.length * 2;

    let assignedSlots = 0;

    const unfilledRequiredSlots: AIReviewContext["coverage"]["unfilledRequiredSlots"] =
      [];

    const schedule = monthDays.map((day) => {
      const assignment = draftAssignments[day.key] ?? {
        primaryMembershipId: null,
        backupMembershipId: null,
      };

      const primary = assignment.primaryMembershipId
        ? residentLookup.get(assignment.primaryMembershipId)
        : null;

      const backup = assignment.backupMembershipId
        ? residentLookup.get(assignment.backupMembershipId)
        : null;

      if (assignment.primaryMembershipId) assignedSlots += 1;

      if (scheduleSlotMode === "Both" && assignment.backupMembershipId) {
        assignedSlots += 1;
      }

      if (!assignment.primaryMembershipId) {
        unfilledRequiredSlots.push({
          dateKey: day.key,
          dayName: day.dayName,
          isWeekend: day.isWeekend,
          slot: "Primary",
        });
      }

      if (scheduleSlotMode === "Both" && !assignment.backupMembershipId) {
        unfilledRequiredSlots.push({
          dateKey: day.key,
          dayName: day.dayName,
          isWeekend: day.isWeekend,
          slot: "Backup",
        });
      }

      return {
        dateKey: day.key,
        dayName: day.dayName,
        isWeekend: day.isWeekend,
        primaryMembershipId: assignment.primaryMembershipId ?? null,
        backupMembershipId:
          scheduleSlotMode === "Both" ? assignment.backupMembershipId ?? null : null,
        primaryName: primary?.displayName ?? null,
        backupName: scheduleSlotMode === "Both" ? backup?.displayName ?? null : null,
        primaryFlags: assignment.primaryMembershipId
          ? getAssignedResidentFlags({
              residentId: assignment.primaryMembershipId,
              dateKey: day.key,
              assignments: draftAssignments,
              rules,
            })
          : [],
        backupFlags:
          scheduleSlotMode === "Both" && assignment.backupMembershipId
            ? getAssignedResidentFlags({
                residentId: assignment.backupMembershipId,
                dateKey: day.key,
                assignments: draftAssignments,
                rules,
              })
            : [],
      };
    });

    return {
      monthLabel: formatMonthLabel(builderMonth),
      scheduleSlotMode,
      coverage: {
        assignedSlots,
        expectedSlots,
        unfilledRequiredSlots,
      },
      schedule,
      residentStats: computedStats.residentRows,
      pgyStats: computedStats.pgyRows,
    };
  }, [
    builderMonth,
    monthDays,
    draftAssignments,
    scheduleSlotMode,
    residentLookup,
    getAssignedResidentFlags,
    rules,
    computedStats.residentRows,
    computedStats.pgyRows,
  ]);

  const selectedResidentStats = useMemo(() => {
    if (!quickAssignResidentId) return null;

    return (
      computedStats.residentRows.find(
        (row) => row.resident.residentId === quickAssignResidentId
      ) ?? null
    );
  }, [computedStats.residentRows, quickAssignResidentId]);

  const hasSavableAssignments = useMemo(() => {
    return monthDays.some((day) => {
      const assignment = draftAssignments[day.key];

      if (scheduleSlotMode === "Primary") {
        return !!assignment?.primaryMembershipId;
      }

      return !!assignment?.primaryMembershipId && !!assignment?.backupMembershipId;
    });
  }, [draftAssignments, monthDays, scheduleSlotMode]);

  const hasExistingSchedule = useMemo(() => {
    return existingCalls.length > 0;
  }, [existingCalls]);

  const filteredPickerResidents = useMemo(() => {
    if (!pickerSlot) return [];

    const source =
      pickerSlot.slot === "Primary"
        ? selectableResidentsBySlot.Primary
        : selectableResidentsBySlot.Backup;

    const query = pickerSearch.trim().toLowerCase();
    if (!query) return source;

    return source.filter((resident) => {
      const label = `${resident.displayName} ${pgyLabel(resident)}`.toLowerCase();
      return label.includes(query);
    });
  }, [pickerSlot, pickerSearch, selectableResidentsBySlot]);

  const pickerGroupedResidents = useMemo(() => {
    const grouped = new Map<string, ResidentOption[]>();

    for (const resident of filteredPickerResidents) {
      const label = pgyLabel(resident);
      const current = grouped.get(label) ?? [];
      current.push(resident);
      grouped.set(label, current);
    }

    return Array.from(grouped.entries());
  }, [filteredPickerResidents]);

  function updateDayAssignment(
    dateKey: string,
    updates: Partial<DraftDayAssignment>
  ) {
    setDraftAssignments((prev) => {
      const current = prev[dateKey] ?? {
        primaryMembershipId: null,
        backupMembershipId: null,
      };

      return {
        ...prev,
        [dateKey]: {
          ...current,
          ...updates,
        },
      };
    });
  }

  function clearMonthDraft() {
    setDraftAssignments({});
  }

  function resetEditDraft() {
    setDraftAssignments(originalAssignments);
  }

  function openPicker(dateKey: string, slot: Slot) {
    setPickerSlot({ dateKey, slot });
    setPickerSearch("");
    setPickerOpen(true);
  }

  function closePicker() {
    setPickerOpen(false);
    setPickerSlot(null);
    setPickerSearch("");
  }

  function assignResidentToPickerSlot(membershipId: string | null) {
    if (!pickerSlot) return;

    if (pickerSlot.slot === "Primary") {
      updateDayAssignment(pickerSlot.dateKey, {
        primaryMembershipId: membershipId,
      });
    } else {
      updateDayAssignment(pickerSlot.dateKey, {
        backupMembershipId: membershipId,
      });
    }

    closePicker();
  }

  function toggleQuickAssignDay(dateKey: string) {
    if (!quickAssignResidentId) return;

    const resident = residentLookup.get(quickAssignResidentId);
    if (!resident) return;

    setDraftAssignments((prev) => {
      const current = prev[dateKey] ?? {
        primaryMembershipId: null,
        backupMembershipId: null,
      };

      const next = { ...current };

      const togglePrimary =
        quickAssignSlotMode === "Primary" || quickAssignSlotMode === "Both";

      const toggleBackup =
        quickAssignSlotMode === "Backup" || quickAssignSlotMode === "Both";

      if (togglePrimary) {
        const isCurrentlySelected =
          current.primaryMembershipId === resident.residentId;

        if (isCurrentlySelected) {
          next.primaryMembershipId = null;
        } else {
          const allowed = isResidentAllowedForSlot({
            resident,
            slot: "Primary",
            dateKey,
            assignments: prev,
            rules,
            availabilityByResident: programAvailability?.availability ?? {},
          });

          if (allowed) {
            next.primaryMembershipId = resident.residentId;
          }
        }
      }

      if (toggleBackup) {
        const isCurrentlySelected =
          current.backupMembershipId === resident.residentId;

        if (isCurrentlySelected) {
          next.backupMembershipId = null;
        } else {
          const allowed = isResidentAllowedForSlot({
            resident,
            slot: "Backup",
            dateKey,
            assignments: prev,
            rules,
            availabilityByResident: programAvailability?.availability ?? {},
          });

          if (allowed) {
            next.backupMembershipId = resident.residentId;
          }
        }
      }

      return {
        ...prev,
        [dateKey]: next,
      };
    });
  }

  async function handleAutoGenerate(forceRegenerate = true) {
    try {
      setError(null);

      const latestRules = await loadLatestRules();

      const generated = generateCallSchedule({
        monthDays,
        residents: sortedResidents,
        existingAssignments: forceRegenerate ? {} : draftAssignments,
        rules: latestRules,
        generationVersion: Date.now(),
        forceRegenerate,
        availabilityByResident: programAvailability?.availability ?? {},
        historicalStats,
        slotMode: scheduleSlotMode,
      });

      setDraftAssignments(generated.assignments);
      setGenerationReport(generated.generationReport ?? null);
      setReviewOpen(true);
      setAiAutoReviewToken(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to auto-generate schedule");
    }
  }

  async function loadLatestRules() {
    const ruleSetResponse = await fetch(
      `/api/program/call-rule-sets?ts=${Date.now()}`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );

    if (!ruleSetResponse.ok) throw new Error("Failed to load rule set");

    const ruleSetPayload = await ruleSetResponse.json();
    const ruleSetId = ruleSetPayload.defaultRuleSetId;

    if (!ruleSetId) {
      setRules([]);
      return [];
    }

    const response = await fetch(
      `/api/program/call-rules?ruleSetId=${encodeURIComponent(
        ruleSetId
      )}&ts=${Date.now()}`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );

    if (!response.ok) throw new Error("Failed to load latest rules");

    const payload = await response.json();
    const latestRules = Array.isArray(payload?.rules) ? payload.rules : [];

    setRules(latestRules);
    return latestRules;
  }

  async function refreshMonthData() {
    const { monthStart, monthEnd } = getMonthRange(builderMonth);

    const monthResponse = await fetch(
      `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
      { credentials: "include" }
    );

    if (!monthResponse.ok) {
      const payload = await monthResponse.json().catch(() => null);
      throw new Error(payload?.error ?? "Failed to refresh month schedule");
    }

    const refreshed: MonthResponse = await monthResponse.json();
    const calls = Array.isArray(refreshed.calls) ? refreshed.calls : [];
    const nextAssignments = buildAssignmentsFromCalls(calls);

    setExistingCalls(calls);
    setDraftAssignments(nextAssignments);
    setOriginalAssignments(nextAssignments);
  }

  function buildSaveRows() {
    return monthDays.flatMap((day) => {
      const assignment = draftAssignments[day.key];
      if (!assignment) return [];

      const output: Array<{
        residentName: string;
        callDate: string;
        callType: Slot;
        site: string | null;
        isHomeCall: boolean;
        notes: string | null;
        matchedRosterId: string;
        matchedMembershipId: string | null;
      }> = [];

      if (assignment.primaryMembershipId) {
        const resident = residentLookup.get(assignment.primaryMembershipId);

        if (resident) {
          output.push({
            residentName: resident.displayName,
            callDate: day.key,
            callType: "Primary",
            site: null,
            isHomeCall: true,
            notes: null,
            matchedRosterId: resident.residentId,
            matchedMembershipId: resident.programMembershipId ?? null,
          });
        }
      }

      if (assignment.backupMembershipId) {
        const resident = residentLookup.get(assignment.backupMembershipId);

        if (resident) {
          output.push({
            residentName: resident.displayName,
            callDate: day.key,
            callType: "Backup",
            site: null,
            isHomeCall: true,
            notes: null,
            matchedRosterId: resident.residentId,
            matchedMembershipId: resident.programMembershipId ?? null,
          });
        }
      }

      return output;
    });
  }

  async function saveRows(
    rows: ReturnType<typeof buildSaveRows>,
    fallbackError: string
  ) {
    setSaving(true);

    try {
      const response = await fetch("/api/program/calls/bulk", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: `${formatMonthLabel(builderMonth)} Call Schedule`,
          notes: null,
          replaceExistingForDates: monthDays.map((day) => day.key),
          rows,
        }),
      });
      await parseCallMutationResponse(response, fallbackError);

      await refreshMonthData();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveBuilderMonth() {
    try {
      setError(null);
      setServerValidationResult(null);

      const rows = buildSaveRows();

      if (rows.length === 0) {
        setError("Add at least one assignment before saving the month.");
        return;
      }

      await saveRows(rows, "Failed to save generated schedule");
    } catch (err) {
      const validation = getCallMutationValidation(err);
      setServerValidationResult(validation);
      setError(
        validation
          ? "Schedule validation failed. Review conflicts below."
          : err instanceof Error
          ? err.message
          : "Failed to save generated schedule"
      );
    }
  }

  async function handleSaveEditedMonth() {
    try {
      setError(null);
      setServerValidationResult(null);

      const rows = buildSaveRows();

      await saveRows(rows, "Failed to save edited schedule");
    } catch (err) {
      const validation = getCallMutationValidation(err);
      setServerValidationResult(validation);
      setError(
        validation
          ? "Schedule validation failed. Review conflicts below."
          : err instanceof Error
          ? err.message
          : "Failed to save edited schedule"
      );
    }
  }

  const validationSummary = serverValidationResult
    ? getValidationSummary(serverValidationResult)
    : null;

  useEffect(() => {
    if (!serverValidationResult) return;
    setServerValidationResult(null);
  }, [
    builderMonth,
    draftAssignments,
    residents,
    rules,
    programAvailability,
  ]);

  return (
    <>
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 px-5 py-5 md:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Program Call Manager
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              {hasExistingSchedule ? "Edit the month" : "Build a new month"}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Empty month opens in fast add mode. Existing month opens in edit
              mode with change highlighting and resident-level balance.
            </p>
          </div>

          <div className="p-5 md:p-6">
            {availabilityLoading ? (
              <div className="mb-6 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Loading program availability...
              </div>
            ) : null}

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Schedule Month
                  </p>

                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setBuilderMonth((prev) => shiftMonth(prev, -1))}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="min-w-[220px] rounded-full border border-slate-200 bg-white px-5 py-2.5 text-center shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Current month
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-slate-950">
                        {formatMonthLabel(builderMonth)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBuilderMonth((prev) => shiftMonth(prev, 1))}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRulesSheet(true)}
                    className="inline-flex h-[46px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Settings2 className="h-4 w-4" />
                    Rules
                  </button>

                  <button
                    type="button"
                    disabled={
                      residentLoading ||
                      availabilityLoading ||
                      callsLoading ||
                      sortedResidents.length === 0
                    }
                    onClick={() => handleAutoGenerate(true)}
                    className="inline-flex h-[46px] items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Wand2 className="h-4 w-4" />
                    Auto generate
                  </button>

                  <button
                    type="button"
                    onClick={clearMonthDraft}
                    className="h-[46px] rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Clear month
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <div className="rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
                <div className="p-3 md:p-4">
                  {callsLoading ? (
                    <div className="rounded-[1.3rem] border border-slate-200 bg-white px-5 py-16 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
                      <p className="mt-3 text-sm text-slate-500">
                        Loading month schedule...
                      </p>
                    </div>
                  ) : hasExistingSchedule ? (
                    <ProgramCallEditView
                      calendarGrid={calendarGrid}
                      draftAssignments={draftAssignments}
                      originalAssignments={originalAssignments}
                      validation={serverValidationResult}
                      residentLookup={residentLookup}
                      getAssignmentFlags={getAssignedResidentFlags}
                      rules={rules}
                      onOpenPicker={openPicker}
                      pgyRows={computedStats.pgyRows}
                      statsLoading={statsLoading}
                      residentLoading={residentLoading}
                      statsCollapsed={statsCollapsed}
                      setStatsCollapsed={setStatsCollapsed}
                      availabilityByResident={programAvailability?.availability ?? {}}
                      onSave={handleSaveEditedMonth}
                      onReset={resetEditDraft}
                      saving={saving}
                    />
                  ) : (
                    <ProgramCallAddView
                      monthDays={monthDays}
                      calendarGrid={calendarGrid}
                      residents={sortedResidents}
                      residentLookup={residentLookup}
                      draftAssignments={draftAssignments}
                      originalAssignments={originalAssignments}
                      validation={serverValidationResult}
                      rules={rules}
                      availabilityByResident={programAvailability?.availability ?? {}}
                      loading={callsLoading}
                      saving={saving}
                      quickAssignResidentId={quickAssignResidentId}
                      setQuickAssignResidentId={setQuickAssignResidentId}
                      quickAssignSlotMode={quickAssignSlotMode}
                      setQuickAssignSlotMode={setQuickAssignSlotMode}
                      onToggleQuickAssignDay={toggleQuickAssignDay}
                      pgyRows={computedStats.pgyRows}
                      residentStats={computedStats.residentRows}
                      selectedResidentStats={selectedResidentStats}
                      statsLoading={statsLoading}
                      residentLoading={residentLoading}
                      statsCollapsed={statsCollapsed}
                      setStatsCollapsed={setStatsCollapsed}
                    />
                  )}
                </div>
              </div>

              {!hasExistingSchedule ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveBuilderMonth}
                    disabled={saving || !hasSavableAssignments}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {saving ? "Saving..." : "Save month"}
                  </button>
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="mt-6 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {validationSummary ? (
              <div
                className={`mt-4 rounded-[1rem] border px-4 py-3 text-sm text-slate-700 ${getValidationSeverityClass(
                  validationSummary.issues
                )}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                      validationSummary.hasErrors
                        ? "bg-rose-600 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {getValidationBadgeText(validationSummary.issues) ?? "Issue"}
                  </span>
                  <span className="font-semibold text-slate-900">
                    Schedule validation failed
                  </span>
                  <span>
                    {validationSummary.counts.error} error
                    {validationSummary.counts.error === 1 ? "" : "s"} ·{" "}
                    {validationSummary.counts.warning} warning
                    {validationSummary.counts.warning === 1 ? "" : "s"}
                  </span>
                </div>
                {validationSummary.firstIssues.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-700">
                    {validationSummary.firstIssues.map((issue, index) => (
                      <span
                        key={`${issue.code}-${issue.slotId ?? issue.residentId ?? index}`}
                        title={getValidationTooltip([issue])}
                      >
                        • {issue.message}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ProgramRulesSheet
        open={showRulesSheet}
        onClose={() => setShowRulesSheet(false)}
        onSaved={loadRules}
        scheduleSlotMode={scheduleSlotMode}
        onScheduleSlotModeChange={setScheduleSlotMode}
      />

      <ResidentPickerSheet
        open={pickerOpen}
        onClose={closePicker}
        title={
          pickerSlot
            ? `${pickerSlot.slot} assignment · ${
                monthDays.find((day) => day.key === pickerSlot.dateKey)?.dayName ?? ""
              } ${pickerSlot.dateKey}`
            : "Select resident"
        }
        searchValue={pickerSearch}
        onSearchChange={setPickerSearch}
        groupedResidents={pickerGroupedResidents}
        currentMembershipId={
          pickerSlot
            ? pickerSlot.slot === "Primary"
              ? draftAssignments[pickerSlot.dateKey]?.primaryMembershipId ?? null
              : draftAssignments[pickerSlot.dateKey]?.backupMembershipId ?? null
            : null
        }
        onSelectResident={(membershipId: string) =>
          assignResidentToPickerSlot(membershipId)
        }
        onClearResident={() => assignResidentToPickerSlot(null)}
        validation={serverValidationResult}
        activeSlotId={
          pickerSlot
            ? serializeSlotId({
                dateKey: pickerSlot.dateKey,
                callType: pickerSlot.slot,
              })
            : null
        }
        activeDateKey={pickerSlot?.dateKey ?? null}
        activeCallType={pickerSlot?.slot ?? null}
      />

      <ProgramCallReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onConfirm={async () => {
          setReviewOpen(false);

          if (hasExistingSchedule) {
            await handleSaveEditedMonth();
          } else {
            await handleSaveBuilderMonth();
          }
        }}
        onRegenerate={() => handleAutoGenerate(true)}
        onSelectGeneratedOption={(assignments) => {
          setDraftAssignments(assignments);
          setAiAutoReviewToken((token) => (token ?? 0) + 1);
        }}
        saving={saving}
        monthLabel={formatMonthLabel(builderMonth)}
        monthDays={monthDays}
        residents={sortedResidents}
        draftAssignments={draftAssignments}
        historicalStats={historicalStats}
        rules={rules}
        availabilityByResident={programAvailability?.availability ?? {}}
        scheduleSlotMode={scheduleSlotMode}
        aiReviewContext={aiReviewContext}
        generationReport={generationReport}
        autoReviewToken={aiAutoReviewToken}
      />
    </>
  );
}
