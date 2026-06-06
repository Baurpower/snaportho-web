"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ProgramCallSlotDefinition,
  ProgramRule,
  QuickAssignSlotMode,
  ResidentOption,
  ResidentSchedulingStats,
} from "@/components/workspace/call/programcalltypes";
import {
  extractSlotDefinitions,
  DEFAULT_SLOT_DEFINITIONS,
  getSlotStatusForDay,
} from "@/components/workspace/call/programcalltypes";
import {
  getFlagsForAssignedResident,
  isResidentAllowedForSlot,
} from "@/components/workspace/call/programcallevaluator";
import {
  getCallMutationValidation,
  parseCallMutationResponse,
  isCallMutationError,
} from "@/lib/workspace/call/mutation-error";
import {
  areProgramCallDraftPayloadsEqual,
  normalizeDraftAssignments,
  PROGRAM_CALL_DRAFT_SCHEMA_VERSION,
  type ProgramCallScheduleDraftPayload,
} from "@/lib/workspace/call/drafts";
import {
  getRotationAssignmentForDate,
  getRotationDisplayLabel,
} from "@/lib/workspace/call/resident-display";

type Slot = "Primary" | "Backup" | "Buddy";
type ScheduleSlotMode = "Primary" | "Both";

type RuleViolationDetail = {
  ruleType: string;
  ruleName: string | null;
  residentName: string | null;
  rosterId: string | null;
  rotationName: string | null;
  callType: string | null;
  dates: string[];
  maxAllowed: number;
  message: string;
};

type RotationAssignmentLike = {
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
    name?: string | null;
    shortName?: string | null;
    short_name?: string | null;
  } | null;
  startDate?: string | null;
  start_date?: string | null;
  endDate?: string | null;
  end_date?: string | null;
  siteLabel?: string | null;
  site_label?: string | null;
  teamLabel?: string | null;
  team_label?: string | null;
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
    primaryRosterId: string | null;
    backupRosterId: string | null;
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

type ProgramCallDraftApiResponse = {
  hasDraft?: boolean;
  invalidDraftFound?: boolean;
  latestPublishedScheduleUpdatedAt?: string | null;
  draft?: {
    id: string;
    monthStart: string;
    schemaVersion: number;
    updatedAt: string;
    publishedScheduleUpdatedAt: string | null;
    hasPublishedScheduleChangedSinceDraft?: boolean;
    payload: ProgramCallScheduleDraftPayload | null;
  } | null;
};

type DraftSaveState = "idle" | "saving" | "saved" | "error";

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
        assignment?.primaryRosterId === residentId ||
        assignment?.backupRosterId === residentId ||
        assignment?.buddyRosterId === residentId
    )
    .map(([dateKey]) => dateKey)
    .sort();
}

function hasMeaningfulDraftAssignments(
  assignments: Record<string, DraftDayAssignment> | null | undefined
): boolean {
  if (!assignments) return false;
  return Object.values(assignments).some(
    (day) => Boolean(day?.primaryRosterId || day?.backupRosterId || day?.buddyRosterId)
  );
}

function buildAssignmentsFromCalls(calls: MonthCall[]) {
  const nextAssignments: Record<string, DraftDayAssignment> = {};

  if (process.env.NODE_ENV !== "production" && calls.length > 0) {
    const s = calls[0];
    console.log("[DEBUG] buildAssignmentsFromCalls raw calls[0]", {
      id: s.id,
      residentId: s.residentId,
      rosterId: s.rosterId,
      membershipId: s.membershipId,
      callDate: s.callDate,
      callType: s.callType,
      callTypeType: typeof s.callType,
      residentName: s.residentName,
    });
  }

  for (const call of calls) {
    if (!call.callDate || !call.callType) continue;

    const current = nextAssignments[call.callDate] ?? {
      primaryRosterId: null,
      backupRosterId: null,
      buddyRosterId: null,
    };

    // Canonical identifier is roster_id. Fall back to residentId, then membershipId.
    const residentId = call.rosterId ?? call.residentId ?? call.membershipId;
    const ct = (call.callType as string).toLowerCase().trim();

    if (ct === "buddy") {
      current.buddyRosterId = residentId;
    } else if (ct === "backup") {
      current.backupRosterId = residentId;
    } else {
      // "primary", "weekday", "weekend", and any legacy type → primary slot
      current.primaryRosterId = residentId;
    }

    nextAssignments[call.callDate] = current;
  }

  if (process.env.NODE_ENV !== "production") {
    const days = Object.keys(nextAssignments);
    const filled = days.filter(
      (k) => nextAssignments[k]?.primaryRosterId || nextAssignments[k]?.backupRosterId || nextAssignments[k]?.buddyRosterId
    ).length;
    const empty = days.length - filled;
    const firstDay = days[0];
    console.log("[DEBUG] buildAssignmentsFromCalls result", {
      totalDays: days.length,
      filledSlots: filled,
      emptySlots: empty,
      sampleDay: firstDay,
      sampleAssignment: firstDay ? nextAssignments[firstDay] : null,
    });
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
      rotationName:
        item.rotation?.name ?? item.rotation?.shortName ?? item.rotation?.short_name ?? null,
      rotation_name:
        item.rotation?.name ?? item.rotation?.shortName ?? item.rotation?.short_name ?? null,
      rotationShortName:
        item.rotation?.shortName ?? item.rotation?.short_name ?? item.rotation?.name ?? null,
      rotation_short_name:
        item.rotation?.shortName ?? item.rotation?.short_name ?? item.rotation?.name ?? null,
      teamLabel: item.teamLabel ?? item.team_label ?? null,
      team_label: item.teamLabel ?? item.team_label ?? null,
      siteLabel: item.siteLabel ?? item.site_label ?? null,
      site_label: item.siteLabel ?? item.site_label ?? null,
      startDate,
      start_date: startDate,
      endDate,
      end_date: endDate,
    });

    rotationAssignmentsByRosterId.set(rosterId, current);
  }

  return rotationAssignmentsByRosterId;
}

function extractRuleViolations(err: unknown): RuleViolationDetail[] {
  if (!isCallMutationError(err)) return [];
  const payload = err.payload;
  if (!payload || payload.error !== "CALL_RULE_VIOLATION") return [];
  const violations = payload.violations;
  if (!Array.isArray(violations)) return [];
  return violations.filter(
    (v): v is RuleViolationDetail =>
      v && typeof v === "object" && typeof v.message === "string"
  );
}

function buildProgramCallDraftPayload(params: {
  builderMonth: string;
  draftAssignments: Record<string, DraftDayAssignment>;
  scheduleSlotMode: ScheduleSlotMode;
  quickAssignSlotMode: QuickAssignSlotMode;
  quickAssignResidentId: string;
}) {
  return {
    month: params.builderMonth,
    assignments: normalizeDraftAssignments(params.draftAssignments),
    scheduleSlotMode: params.scheduleSlotMode,
    quickAssignSlotMode: params.quickAssignSlotMode,
    quickAssignResidentId: params.quickAssignResidentId || null,
  } satisfies ProgramCallScheduleDraftPayload;
}

/**
 * Returns the set of filled, savable slot rows for a single day.
 *
 * Rules:
 * - Primary: always savable when filled and resident is known.
 * - Backup / Buddy: savable when filled and resident is known.
 *   The canonical `getSlotStatusForDay` backward-compat rule guarantees that
 *   any slot that already has a saved assignment returns `isVisible = true`
 *   (`hasAssignment = true` path), so filled slots are always preserved.
 *   Empty slots are never included — missing-required validation happens
 *   server-side, not at save-button-enable time.
 *
 * `slotDefinitions` is accepted for future extensions (e.g. completely
 * removing a slot type that is disabled in rules). Currently all filled
 * slots are considered savable regardless of slot definitions.
 */
function getSavableSlotRowsForDay(
  day: { key: string },
  assignment: DraftDayAssignment | undefined,
  residentsById: Map<string, ResidentOption>
): Array<{ slot: Slot; resident: ResidentOption }> {
  if (!assignment) return [];

  const rows: Array<{ slot: Slot; resident: ResidentOption }> = [];

  if (assignment.primaryRosterId) {
    const resident = residentsById.get(assignment.primaryRosterId);
    if (resident) rows.push({ slot: "Primary", resident });
  }

  if (assignment.backupRosterId) {
    const resident = residentsById.get(assignment.backupRosterId);
    if (resident) rows.push({ slot: "Backup", resident });
  }

  if (assignment.buddyRosterId) {
    const resident = residentsById.get(assignment.buddyRosterId);
    if (resident) rows.push({ slot: "Buddy", resident });
  }

  return rows;
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
  const [ruleViolations, setRuleViolations] = useState<RuleViolationDetail[]>([]);
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const [draftAssignments, setDraftAssignments] = useState<
    Record<string, DraftDayAssignment>
  >({});
  const [originalAssignments, setOriginalAssignments] = useState<
    Record<string, DraftDayAssignment>
  >({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationReport, setGenerationReport] = useState<unknown>(null);
  const [aiAutoReviewToken, setAiAutoReviewToken] = useState<number | null>(null);
  const [showRulesSheet, setShowRulesSheet] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSlot, setPickerSlot] = useState<{
    dateKey: string;
    slot: string;
  } | null>(null);
  const [quickAssignResidentId, setQuickAssignResidentId] = useState("");
  const [quickAssignSlotMode, setQuickAssignSlotMode] =
    useState<QuickAssignSlotMode>("Primary");
  const [scheduleSlotMode, setScheduleSlotMode] =
    useState<ScheduleSlotMode>("Primary");
  const [rules, setRules] = useState<ProgramRule[]>([]);
  const [slotDefinitions, setSlotDefinitions] = useState<ProgramCallSlotDefinition[]>([]);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>("idle");
  const [draftStatusMessage, setDraftStatusMessage] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRecordExists, setDraftRecordExists] = useState(false);
  const [invalidDraftFound, setInvalidDraftFound] = useState(false);
  const [draftConflictMessage, setDraftConflictMessage] = useState<string | null>(null);
  const [latestPublishedScheduleUpdatedAt, setLatestPublishedScheduleUpdatedAt] =
    useState<string | null>(null);
  const [publishedBaselineDraftPayload, setPublishedBaselineDraftPayload] =
    useState<ProgramCallScheduleDraftPayload | null>(null);
  const [lastSavedDraftPayload, setLastSavedDraftPayload] =
    useState<ProgramCallScheduleDraftPayload | null>(null);

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
      const nextSlotDefs = extractSlotDefinitions(nextRules);
      setRules(nextRules.filter((r: ProgramRule) => r.rule_type !== "call_slot_definition"));
      setSlotDefinitions(nextSlotDefs.length > 0 ? nextSlotDefs : DEFAULT_SLOT_DEFINITIONS);

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
          currentRotationLabel: null,
          currentRotationName: null,
        };

        const monthRotation = getRotationAssignmentForDate(
          resident.rotationAssignments,
          monthStart
        );
        resident.currentRotationLabel = getRotationDisplayLabel(monthRotation);
        resident.currentRotationName = resident.currentRotationLabel;

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
        setDraftReady(false);
        setDraftConflictMessage(null);
        setDraftStatusMessage(null);
        setDraftSaveState("idle");
        setInvalidDraftFound(false);

        const { monthStart, monthEnd } = getMonthRange(builderMonth);

        const [response, draftResponse] = await Promise.all([
          fetch(
            `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
            { credentials: "include" }
          ),
          fetch(
            `/api/program/calls/draft?monthStart=${encodeURIComponent(monthStart)}`,
            {
              credentials: "include",
              cache: "no-store",
            }
          ),
        ]);

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to load month calls");
        }

        const payload: MonthResponse = await response.json();

        // Draft API is best-effort — failure (e.g. table not yet migrated, 403, 500)
        // must not abort loading the published call schedule.
        let draftPayload: ProgramCallDraftApiResponse | null = null;
        if (draftResponse.ok) {
          draftPayload = await draftResponse.json().catch(() => null) as ProgramCallDraftApiResponse | null;
        } else if (process.env.NODE_ENV !== "production") {
          console.warn("[ProgramCallManager] Draft API unavailable:", draftResponse.status, draftResponse.statusText);
        }

        if (cancelled) return;

        const calls = Array.isArray(payload.calls) ? payload.calls : [];
        const nextAssignments = buildAssignmentsFromCalls(calls);
        const inferredSlotMode =
          calls.some((call) => call.callType === "Backup") ? "Both" : "Primary";
        const defaultScheduleSlotMode =
          getScheduleSlotModeFromRules(rules) ?? inferredSlotMode ?? "Primary";
        const publishedBaseline = buildProgramCallDraftPayload({
          builderMonth,
          draftAssignments: nextAssignments,
          scheduleSlotMode: defaultScheduleSlotMode,
          quickAssignSlotMode: "Primary",
          quickAssignResidentId: "",
        });

        setExistingCalls(calls);
        setOriginalAssignments(nextAssignments);
        setPublishedBaselineDraftPayload(publishedBaseline);
        setLatestPublishedScheduleUpdatedAt(
          draftPayload?.latestPublishedScheduleUpdatedAt ?? null
        );

        const restoredDraft = draftPayload?.draft?.payload ?? null;
        const { monthStart: draftMonthStart } = getMonthRange(builderMonth);

        const hasValidDraft =
          Boolean(restoredDraft) &&
          draftPayload?.draft?.schemaVersion === PROGRAM_CALL_DRAFT_SCHEMA_VERSION &&
          restoredDraft?.month === builderMonth;

        const draftHasAssignments = hasMeaningfulDraftAssignments(
          restoredDraft?.assignments
        );

        if (hasValidDraft && draftHasAssignments && restoredDraft) {
          setDraftAssignments(restoredDraft.assignments);
          setQuickAssignResidentId(restoredDraft.quickAssignResidentId ?? "");
          setQuickAssignSlotMode(restoredDraft.quickAssignSlotMode);
          setScheduleSlotMode(restoredDraft.scheduleSlotMode);
          setLastSavedDraftPayload(restoredDraft);
          setDraftRecordExists(true);
          setDraftSaveState("saved");
          setDraftStatusMessage(
            draftPayload?.draft?.updatedAt
              ? `Restored draft from ${new Date(
                  draftPayload.draft.updatedAt
                ).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "Restored saved draft"
          );
          if (draftPayload?.draft?.hasPublishedScheduleChangedSinceDraft) {
            setDraftConflictMessage(
              "The published schedule changed after this draft was created. Review carefully before publishing."
            );
          }
        } else {
          setDraftAssignments(nextAssignments);
          setQuickAssignResidentId("");
          setQuickAssignSlotMode("Primary");
          setScheduleSlotMode(defaultScheduleSlotMode);
          setLastSavedDraftPayload(null);
          setDraftRecordExists(false);

          // A valid draft exists but it has no assignments — it's a stale blank draft.
          // Delete it so it cannot keep overwriting the published schedule on future loads.
          if (hasValidDraft && !draftHasAssignments) {
            void fetch(
              `/api/program/calls/draft?monthStart=${encodeURIComponent(draftMonthStart)}`,
              { method: "DELETE", credentials: "include" }
            ).catch(() => {
              // Non-blocking cleanup; ignore failures.
            });
          }

          if (draftPayload?.invalidDraftFound) {
            setInvalidDraftFound(true);
            setDraftStatusMessage("An older draft could not be restored safely.");
          }
        }

        if (!hasValidDraft || !draftHasAssignments) {
          setScheduleSlotMode(defaultScheduleSlotMode);
        }

        setDraftReady(true);
      } catch (err) {
        if (!cancelled) {
          setExistingCalls([]);
          setDraftAssignments({});
          setOriginalAssignments({});
          setPublishedBaselineDraftPayload(null);
          setLastSavedDraftPayload(null);
          setDraftRecordExists(false);
          setDraftReady(false);
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
    const map = new Map<string, ResidentOption>();
    for (const resident of residents) {
      map.set(resident.residentId, resident);
      // Also key by programMembershipId for calls where roster_id was NULL in the DB
      // and only program_membership_id was stored on the assignment.
      if (
        resident.programMembershipId &&
        resident.programMembershipId !== resident.residentId
      ) {
        map.set(resident.programMembershipId, resident);
      }
    }
    return map;
  }, [residents]);

  // Track which month's draft IDs have already been normalized to roster IDs so we
  // only run once per month load, not on every re-render.
  const normalizedForMonthRef = useRef<string | null>(null);

  // Normalize draft assignment IDs to roster IDs after residents load.
  // Old drafts may store program_membership_id values; the bi-keyed residentLookup
  // can resolve them, and we upgrade in-place to canonical program_roster.id (rosterId).
  useEffect(() => {
    if (!draftReady || residentLookup.size === 0) return;
    if (normalizedForMonthRef.current === builderMonth) return;

    normalizedForMonthRef.current = builderMonth;

    function normalizeAssignmentMap(
      prev: Record<string, DraftDayAssignment>
    ): Record<string, DraftDayAssignment> | null {
      let changed = false;
      const next: Record<string, DraftDayAssignment> = {};

      for (const [dateKey, day] of Object.entries(prev)) {
        const primaryResident = day.primaryRosterId ? residentLookup.get(day.primaryRosterId) : null;
        const backupResident = day.backupRosterId ? residentLookup.get(day.backupRosterId) : null;
        const buddyResident = day.buddyRosterId ? residentLookup.get(day.buddyRosterId) : null;

        const normalizedPrimary =
          primaryResident && primaryResident.residentId !== day.primaryRosterId
            ? primaryResident.residentId
            : day.primaryRosterId;

        const normalizedBackup =
          backupResident && backupResident.residentId !== day.backupRosterId
            ? backupResident.residentId
            : day.backupRosterId;

        const normalizedBuddy =
          buddyResident && buddyResident.residentId !== day.buddyRosterId
            ? buddyResident.residentId
            : day.buddyRosterId;

        if (
          normalizedPrimary !== day.primaryRosterId ||
          normalizedBackup !== day.backupRosterId ||
          normalizedBuddy !== day.buddyRosterId
        ) {
          changed = true;

          if (process.env.NODE_ENV !== "production") {
            console.info(
              "[ProgramCallManager] normalizeAssignmentMap: upgraded stale ID on",
              dateKey,
              {
                primary: day.primaryRosterId !== normalizedPrimary
                  ? { was: day.primaryRosterId, now: normalizedPrimary }
                  : null,
                backup: day.backupRosterId !== normalizedBackup
                  ? { was: day.backupRosterId, now: normalizedBackup }
                  : null,
                buddy: day.buddyRosterId !== normalizedBuddy
                  ? { was: day.buddyRosterId, now: normalizedBuddy }
                  : null,
              }
            );
          }
        }

        next[dateKey] = {
          primaryRosterId: normalizedPrimary,
          backupRosterId: normalizedBackup,
          buddyRosterId: normalizedBuddy ?? null,
        };
      }

      return changed ? next : null;
    }

    setDraftAssignments((prev) => normalizeAssignmentMap(prev) ?? prev);
    setOriginalAssignments((prev) => normalizeAssignmentMap(prev) ?? prev);
  }, [builderMonth, draftReady, residentLookup]);

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
        assignmentForDay?.primaryRosterId === params.residentId
          ? "Primary"
          : assignmentForDay?.buddyRosterId === params.residentId
          ? "Buddy"
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
        monthBuddy: 0,
        monthTotal: 0,
        monthWeekend: 0,
        yearPrimary: baseline?.primaryCallsYear ?? 0,
        yearBackup: baseline?.backupCallsYear ?? 0,
        yearBuddy: baseline?.buddyCallsYear ?? 0,
        yearTotal: baseline?.totalCallsYear ?? 0,
        yearWeekend: baseline?.weekendCallsYear ?? 0,
        spacingFlags: 0,
      });
    }

    for (const day of monthDays) {
      const assignment = draftAssignments[day.key];
      if (!assignment) continue;

      if (assignment.primaryRosterId) {
        const entry = perResident.get(assignment.primaryRosterId);
        if (entry) {
          entry.monthPrimary += 1;
          entry.monthTotal += 1;
          entry.yearPrimary += 1;
          entry.yearTotal += 1;
          if (day.isWeekend) { entry.monthWeekend += 1; entry.yearWeekend += 1; }
        }
      }

      if (assignment.backupRosterId) {
        const entry = perResident.get(assignment.backupRosterId);
        if (entry) {
          entry.monthBackup += 1;
          entry.monthTotal += 1;
          entry.yearBackup += 1;
          entry.yearTotal += 1;
          if (day.isWeekend) { entry.monthWeekend += 1; entry.yearWeekend += 1; }
        }
      }

      if (assignment.buddyRosterId) {
        const entry = perResident.get(assignment.buddyRosterId);
        if (entry) {
          entry.monthBuddy += 1;
          entry.yearBuddy += 1;
          // Buddy does not count toward monthTotal/yearTotal by default.
          // Slot definition's countsTowardWorkload controls this in Phase 3.
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
      return assignment?.primaryRosterId && assignment?.backupRosterId;
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
    // Per-day backup visibility: respect conditional slot definitions.
    const backupSlotDefs = slotDefinitions.filter((def) => def.callType === "Backup");
    const hasConditionalBackupDefs = backupSlotDefs.some((def) => def.requiredMode === "conditional");

    let assignedSlots = 0;
    let expectedSlots = 0;
    const unfilledRequiredSlots: AIReviewContext["coverage"]["unfilledRequiredSlots"] = [];

    const schedule = monthDays.map((day) => {
      const assignment = draftAssignments[day.key] ?? {
        primaryRosterId: null,
        backupRosterId: null,
        buddyRosterId: null,
      };

      const primary = assignment.primaryRosterId
        ? residentLookup.get(assignment.primaryRosterId)
        : null;

      const backup = assignment.backupRosterId
        ? residentLookup.get(assignment.backupRosterId)
        : null;

      // Primary always counts.
      expectedSlots += 1;
      if (assignment.primaryRosterId) assignedSlots += 1;

      if (!assignment.primaryRosterId) {
        unfilledRequiredSlots.push({
          dateKey: day.key,
          dayName: day.dayName,
          isWeekend: day.isWeekend,
          slot: "Primary",
        });
      }

      // Backup: use per-day slot status for conditional defs, global flag otherwise.
      let backupVisible = false;
      let backupRequired = false;

      if (hasConditionalBackupDefs && backupSlotDefs.length > 0) {
        const primaryPgyYear = primary?.pgyYear ?? null;
        const dayOfWeek = day.date.getDay();
        const hasBackupAssignment = Boolean(assignment.backupRosterId);
        for (const def of backupSlotDefs) {
          const { isVisible, isRequired } = getSlotStatusForDay({
            def,
            dayOfWeek,
            primaryPgyYear,
            hasAssignment: hasBackupAssignment,
          });
          if (isVisible) backupVisible = true;
          if (isRequired) backupRequired = true;
        }
      } else if (scheduleSlotMode === "Both") {
        backupVisible = true;
        backupRequired = true;
      }

      if (backupVisible) {
        expectedSlots += 1;
        if (assignment.backupRosterId) assignedSlots += 1;
      }

      if (backupRequired && !assignment.backupRosterId) {
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
        primaryRosterId: assignment.primaryRosterId ?? null,
        backupRosterId: backupVisible ? (assignment.backupRosterId ?? null) : null,
        primaryName: primary?.displayName ?? null,
        backupName: backupVisible ? (backup?.displayName ?? null) : null,
        primaryFlags: assignment.primaryRosterId
          ? getAssignedResidentFlags({
              residentId: assignment.primaryRosterId,
              dateKey: day.key,
              assignments: draftAssignments,
              rules,
            })
          : [],
        backupFlags:
          backupVisible && assignment.backupRosterId
            ? getAssignedResidentFlags({
                residentId: assignment.backupRosterId,
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
    slotDefinitions,
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

  const currentDraftPayload = useMemo(
    () =>
      buildProgramCallDraftPayload({
        builderMonth,
        draftAssignments,
        scheduleSlotMode,
        quickAssignSlotMode,
        quickAssignResidentId,
      }),
    [
      builderMonth,
      draftAssignments,
      scheduleSlotMode,
      quickAssignSlotMode,
      quickAssignResidentId,
    ]
  );

  const hasSavableAssignments = useMemo(() => {
    // True as soon as any day has at least one filled savable slot.
    // Primary is the only slot that must exist for a day to be worth saving.
    // Whether required secondary slots (Backup/Buddy) are filled is enforced
    // by validation at submit time — not here. This ensures conditional-Backup
    // schedules (where Backup is absent on PGY-3/4/5 days) are not incorrectly
    // blocked from saving just because scheduleSlotMode === "Both".
    return monthDays.some((day) => {
      const rows = getSavableSlotRowsForDay(day, draftAssignments[day.key], residentLookup);
      return rows.some((r) => r.slot === "Primary");
    });
  }, [draftAssignments, monthDays, residentLookup]);

  const hasExistingSchedule = useMemo(() => {
    return existingCalls.length > 0;
  }, [existingCalls]);

  const hasDraftChanges = useMemo(() => {
    if (!publishedBaselineDraftPayload) return false;
    return !areProgramCallDraftPayloadsEqual(
      currentDraftPayload,
      publishedBaselineDraftPayload
    );
  }, [currentDraftPayload, publishedBaselineDraftPayload]);

  const filteredPickerResidents = useMemo(() => {
    if (!pickerSlot) return [];

    const slotLower = pickerSlot.slot.toLowerCase();
    const source =
      slotLower === "primary"
        ? selectableResidentsBySlot.Primary
        : selectableResidentsBySlot.Backup;

    const query = pickerSearch.trim().toLowerCase();
    if (!query) return source;

    return source.filter((resident) => {
      const label = `${resident.displayName} ${pgyLabel(resident)} ${
        resident.currentRotationLabel ?? ""
      }`.toLowerCase();
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
        primaryRosterId: null,
        backupRosterId: null,
        buddyRosterId: null,
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

  async function resetEditDraft() {
    setDraftAssignments(originalAssignments);
    setQuickAssignResidentId("");
    setQuickAssignSlotMode("Primary");
    if (publishedBaselineDraftPayload) {
      setScheduleSlotMode(publishedBaselineDraftPayload.scheduleSlotMode);
    }
    try {
      await deleteDraftForMonth(getMonthRange(builderMonth).monthStart);
      setDraftRecordExists(false);
      setLastSavedDraftPayload(null);
      setDraftSaveState("idle");
      setDraftStatusMessage("Draft discarded");
    } catch (draftError) {
      console.error("Failed to discard call draft", draftError);
      setDraftSaveState("error");
      setDraftStatusMessage("Draft discard failed");
    }
  }

  function openPicker(dateKey: string, slot: string) {
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

    const slotLower = pickerSlot.slot.toLowerCase();
    if (slotLower === "primary") {
      updateDayAssignment(pickerSlot.dateKey, { primaryRosterId: membershipId });
    } else if (slotLower === "buddy") {
      updateDayAssignment(pickerSlot.dateKey, { buddyRosterId: membershipId });
    } else {
      updateDayAssignment(pickerSlot.dateKey, { backupRosterId: membershipId });
    }

    closePicker();
  }

  function toggleQuickAssignDay(dateKey: string) {
    if (!quickAssignResidentId) return;

    const resident = residentLookup.get(quickAssignResidentId);
    if (!resident) return;

    setDraftAssignments((prev) => {
      const current = prev[dateKey] ?? {
        primaryRosterId: null,
        backupRosterId: null,
        buddyRosterId: null,
      };

      const next = { ...current };

      const togglePrimary = quickAssignSlotMode === "Primary" || quickAssignSlotMode === "Both";
      const toggleBackup = quickAssignSlotMode === "Backup" || quickAssignSlotMode === "Both";
      const toggleBuddy = quickAssignSlotMode === "Buddy";

      if (togglePrimary) {
        if (current.primaryRosterId === resident.residentId) {
          next.primaryRosterId = null;
        } else {
          const allowed = isResidentAllowedForSlot({
            resident,
            slot: "Primary",
            dateKey,
            assignments: prev,
            rules,
            availabilityByResident: programAvailability?.availability ?? {},
          });
          if (allowed) next.primaryRosterId = resident.residentId;
        }
      }

      if (toggleBackup) {
        if (current.backupRosterId === resident.residentId) {
          next.backupRosterId = null;
        } else {
          const allowed = isResidentAllowedForSlot({
            resident,
            slot: "Backup",
            dateKey,
            assignments: prev,
            rules,
            availabilityByResident: programAvailability?.availability ?? {},
          });
          if (allowed) next.backupRosterId = resident.residentId;
        }
      }

      if (toggleBuddy) {
        next.buddyRosterId =
          current.buddyRosterId === resident.residentId ? null : resident.residentId;
      }

      return { ...prev, [dateKey]: next };
    });
  }

  async function handleAutoGenerate(forceRegenerate = true) {
    if (isGenerating) return;
    try {
      setError(null);
      setIsGenerating(true);

      const { rules: latestRules, slotDefinitions: latestSlotDefinitions } =
        await loadLatestRules();

      const generated = generateCallSchedule({
        monthDays,
        residents: sortedResidents,
        existingAssignments: forceRegenerate ? {} : draftAssignments,
        rules: latestRules,
        slotDefinitions: latestSlotDefinitions,
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
    } finally {
      setIsGenerating(false);
    }
  }

  async function loadLatestRules(): Promise<{
    rules: ProgramRule[];
    slotDefinitions: ProgramCallSlotDefinition[];
  }> {
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
      setSlotDefinitions(DEFAULT_SLOT_DEFINITIONS);
      return {
        rules: [],
        slotDefinitions: DEFAULT_SLOT_DEFINITIONS,
      };
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
    const latestSlotDefs = extractSlotDefinitions(latestRules);
    setRules(latestRules.filter((r: ProgramRule) => r.rule_type !== "call_slot_definition"));
    setSlotDefinitions(latestSlotDefs.length > 0 ? latestSlotDefs : DEFAULT_SLOT_DEFINITIONS);

    return {
      rules: latestRules.filter((r: ProgramRule) => r.rule_type !== "call_slot_definition"),
      slotDefinitions:
        latestSlotDefs.length > 0 ? latestSlotDefs : DEFAULT_SLOT_DEFINITIONS,
    };
  }

  const deleteDraftForMonth = useCallback(async (monthStart: string) => {
    const response = await fetch(
      `/api/program/calls/draft?monthStart=${encodeURIComponent(monthStart)}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "Failed to delete schedule draft");
    }
  }, []);

  const persistDraftForMonth = useCallback(
    async (params: {
      monthStart: string;
      payload: ProgramCallScheduleDraftPayload;
    }) => {
      const response = await fetch("/api/program/calls/draft", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          monthStart: params.monthStart,
          payload: params.payload,
          schemaVersion: PROGRAM_CALL_DRAFT_SCHEMA_VERSION,
          publishedScheduleUpdatedAt: latestPublishedScheduleUpdatedAt,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to save schedule draft");
      }

      return (await response.json()) as ProgramCallDraftApiResponse;
    },
    [latestPublishedScheduleUpdatedAt]
  );

  async function refreshMonthData() {
    const { monthStart, monthEnd } = getMonthRange(builderMonth);

    const [monthResponse, draftResponse] = await Promise.all([
      fetch(
        `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
        { credentials: "include" }
      ),
      fetch(`/api/program/calls/draft?monthStart=${encodeURIComponent(monthStart)}`, {
        credentials: "include",
        cache: "no-store",
      }),
    ]);

    if (!monthResponse.ok) {
      const payload = await monthResponse.json().catch(() => null);
      throw new Error(payload?.error ?? "Failed to refresh month schedule");
    }

    const refreshed: MonthResponse = await monthResponse.json();
    // Draft metadata is best-effort on refresh too.
    let refreshedDraftMeta: ProgramCallDraftApiResponse | null = null;
    if (draftResponse.ok) {
      refreshedDraftMeta = await draftResponse.json().catch(() => null) as ProgramCallDraftApiResponse | null;
    }
    const calls = Array.isArray(refreshed.calls) ? refreshed.calls : [];
    const nextAssignments = buildAssignmentsFromCalls(calls);

    setExistingCalls(calls);
    setDraftAssignments(nextAssignments);
    setOriginalAssignments(nextAssignments);
    const defaultScheduleSlotMode =
      getScheduleSlotModeFromRules(rules) ??
      (calls.some((call) => call.callType === "Backup") ? "Both" : "Primary");
    const baseline = buildProgramCallDraftPayload({
      builderMonth,
      draftAssignments: nextAssignments,
      scheduleSlotMode: defaultScheduleSlotMode,
      quickAssignSlotMode: "Primary",
      quickAssignResidentId: "",
    });
    setPublishedBaselineDraftPayload(baseline);
    setLastSavedDraftPayload(null);
    setDraftRecordExists(false);
    setDraftReady(true);
    setDraftSaveState("idle");
    setDraftStatusMessage(null);
    setDraftConflictMessage(null);
    setLatestPublishedScheduleUpdatedAt(
      refreshedDraftMeta?.latestPublishedScheduleUpdatedAt ?? null
    );
  }

  function buildSaveRows() {
    if (process.env.NODE_ENV !== "production") {
      // Canary check: warn if any resident has a real membershipId that differs
      // from their rosterId. This would indicate the legacy membershipId is leaking
      // into scheduler state and must be investigated before shipping.
      for (const resident of residents) {
        if (
          resident.programMembershipId &&
          resident.programMembershipId !== resident.residentId
        ) {
          console.warn(
            "[ProgramCallManager] buildSaveRows: resident has distinct programMembershipId",
            {
              residentId: resident.residentId,
              programMembershipId: resident.programMembershipId,
              displayName: resident.displayName,
            }
          );
        }
      }
    }

    return monthDays.flatMap((day) => {
      const savableRows = getSavableSlotRowsForDay(
        day,
        draftAssignments[day.key],
        residentLookup
      );

      return savableRows.map(({ slot, resident }) => ({
        residentName: resident.displayName,
        callDate: day.key,
        callType: slot,
        site: null as string | null,
        isHomeCall: true,
        notes: null as string | null,
        matchedRosterId: resident.residentId,
        matchedMembershipId: resident.programMembershipId ?? null,
      }));
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

      await deleteDraftForMonth(getMonthRange(builderMonth).monthStart).catch(
        (draftError) => {
          console.error("Failed to clear call draft after publish", draftError);
        }
      );

      await refreshMonthData();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveBuilderMonth() {
    try {
      setError(null);
      setServerValidationResult(null);
      setRuleViolations([]);

      const rows = buildSaveRows();

      if (rows.length === 0) {
        setError("Add at least one assignment before saving the month.");
        return;
      }

      await saveRows(rows, "Failed to save generated schedule");
    } catch (err) {
      const violations = extractRuleViolations(err);
      if (violations.length > 0) {
        setRuleViolations(violations);
        setError("Schedule violates hard call rules. See details below.");
        return;
      }
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
      setRuleViolations([]);

      const rows = buildSaveRows();

      await saveRows(rows, "Failed to save edited schedule");
    } catch (err) {
      const violations = extractRuleViolations(err);
      if (violations.length > 0) {
        setRuleViolations(violations);
        setError("Schedule violates hard call rules. See details below.");
        return;
      }
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
    setServerValidationResult(null);
    setRuleViolations([]);
  }, [
    builderMonth,
    draftAssignments,
    residents,
    rules,
    programAvailability,
  ]);

  useEffect(() => {
    if (!draftReady || !publishedBaselineDraftPayload) {
      return;
    }

    const monthStart = getMonthRange(builderMonth).monthStart;

    const saveTimeout = window.setTimeout(async () => {
      try {
        if (!hasDraftChanges) {
          if (!draftRecordExists && !lastSavedDraftPayload) {
            setDraftSaveState("idle");
            return;
          }

          setDraftSaveState("saving");
          await deleteDraftForMonth(monthStart);
          setDraftRecordExists(false);
          setLastSavedDraftPayload(null);
          setDraftSaveState("idle");
          setDraftStatusMessage("Draft cleared");
          return;
        }

        if (
          lastSavedDraftPayload &&
          areProgramCallDraftPayloadsEqual(currentDraftPayload, lastSavedDraftPayload)
        ) {
          return;
        }

        // Guard: never persist a draft that has no real assignments.
        // This prevents a blank draft from permanently overwriting the published schedule.
        if (!hasMeaningfulDraftAssignments(currentDraftPayload.assignments)) {
          setDraftSaveState("idle");
          return;
        }

        setDraftSaveState("saving");
        const saved = await persistDraftForMonth({
          monthStart,
          payload: currentDraftPayload,
        });
        setDraftRecordExists(true);
        setLastSavedDraftPayload(currentDraftPayload);
        setDraftSaveState("saved");
        setDraftStatusMessage(
          saved.draft?.updatedAt
            ? `Draft saved ${new Date(saved.draft.updatedAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}`
            : "Draft saved"
        );
      } catch (draftError) {
        console.error("Failed to persist call draft", draftError);
        setDraftSaveState("error");
        setDraftStatusMessage(
          draftError instanceof Error
            ? `Draft save failed: ${draftError.message}`
            : "Draft save failed"
        );
      }
    }, 900);

    return () => {
      window.clearTimeout(saveTimeout);
    };
  }, [
    builderMonth,
    currentDraftPayload,
    deleteDraftForMonth,
    draftReady,
    draftRecordExists,
    hasDraftChanges,
    lastSavedDraftPayload,
    latestPublishedScheduleUpdatedAt,
    persistDraftForMonth,
    publishedBaselineDraftPayload,
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

            {draftStatusMessage || draftConflictMessage || invalidDraftFound ? (
              <div
                className={`mb-6 rounded-[1rem] border px-4 py-3 text-sm ${
                  draftSaveState === "error" || draftConflictMessage || invalidDraftFound
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : draftSaveState === "saving"
                    ? "border-sky-200 bg-sky-50 text-sky-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {draftSaveState === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  <span className="font-semibold">
                    {draftSaveState === "saving"
                      ? "Saving draft..."
                      : draftStatusMessage ?? "Draft status updated"}
                  </span>
                </div>
                {draftConflictMessage ? (
                  <p className="mt-1">{draftConflictMessage}</p>
                ) : null}
                {invalidDraftFound ? (
                  <p className="mt-1">
                    A stale or invalid draft was ignored to protect the published schedule.
                  </p>
                ) : null}
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
                      isGenerating ||
                      residentLoading ||
                      availabilityLoading ||
                      callsLoading ||
                      sortedResidents.length === 0
                    }
                    onClick={() => handleAutoGenerate(true)}
                    className="inline-flex h-[46px] items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    {isGenerating ? "Generating..." : "Auto generate"}
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
                  {callsLoading || (hasExistingSchedule && residentLoading) ? (
                    <div className="rounded-[1.3rem] border border-slate-200 bg-white px-5 py-16 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
                      <p className="mt-3 text-sm text-slate-500">
                        {callsLoading ? "Loading month schedule..." : "Loading residents..."}
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
                      slotDefinitions={slotDefinitions}
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
                      slotDefinitions={slotDefinitions}
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

            {ruleViolations.length > 0 ? (
              <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                    Hard rule violation
                  </span>
                  <span className="font-semibold text-rose-900">
                    Schedule blocked by call rules
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {ruleViolations.map((violation, index) => (
                    <div
                      key={index}
                      className="rounded-[0.85rem] border border-rose-200 bg-white px-3 py-2.5"
                    >
                      <p className="font-semibold text-rose-900">
                        {violation.rotationName
                          ? `${violation.rotationName} rule violation`
                          : violation.ruleName ?? "Rule violation"}
                        {violation.residentName ? ` · ${violation.residentName}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-rose-700">{violation.message}</p>
                      {violation.dates.length > 0 ? (
                        <p className="mt-1 text-[11px] text-rose-500">
                          Affected dates:{" "}
                          {violation.dates
                            .map((d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }))
                            .join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-xs text-rose-600">
                  Fix the assignments above, then try saving again.
                </p>
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
        currentMembershipId={(() => {
          if (!pickerSlot) return null;
          const sl = pickerSlot.slot.toLowerCase();
          const a = draftAssignments[pickerSlot.dateKey];
          if (sl === "primary") return a?.primaryRosterId ?? null;
          if (sl === "buddy") return a?.buddyRosterId ?? null;
          return a?.backupRosterId ?? null;
        })()}
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
        slotDefinitions={slotDefinitions}
        availabilityByResident={programAvailability?.availability ?? {}}
        scheduleSlotMode={scheduleSlotMode}
        aiReviewContext={aiReviewContext}
        generationReport={generationReport}
        autoReviewToken={aiAutoReviewToken}
      />

      {isGenerating ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 ring-2 ring-sky-100">
                <Wand2 className="h-6 w-6 text-sky-700" />
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-950">
                Generating call schedule
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Checking rules, availability, spacing, and fairness.
              </p>

              <div className="mt-6 w-full space-y-2 text-left">
                {[
                  "Loading rules",
                  "Checking resident availability",
                  "Assigning primary calls",
                  "Applying conditional backup / buddy rules",
                  "Reviewing violations",
                ].map((step) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  >
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-500" />
                    {step}
                  </div>
                ))}
              </div>

              <p className="mt-6 text-xs text-slate-400">
                This usually takes a few seconds. Please wait.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
