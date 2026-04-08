"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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

  const monthStart = `${start.getFullYear()}-${String(
    start.getMonth() + 1
  ).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;

  const monthEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(end.getDate()).padStart(2, "0")}`;

  return { monthStart, monthEnd };
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
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function pgyLabel(
  resident:
    | ResidentOption
    | {
        trainingLevel: string | null;
        pgyYear?: number | null;
      }
) {
  if (resident.trainingLevel) return resident.trainingLevel;
  if (typeof resident.pgyYear === "number") return `PGY-${resident.pgyYear}`;
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

    if (call.callType === "Primary") {
      current.primaryMembershipId = call.membershipId;
    }

    if (call.callType === "Backup") {
      current.backupMembershipId = call.membershipId;
    }

    nextAssignments[call.callDate] = current;
  }

  return nextAssignments;
}

export default function ProgramCallManager() {
  const [builderMonth, setBuilderMonth] = useState(getCurrentMonthValue());
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [residentLoading, setResidentLoading] = useState(true);

  const [rules, setRules] = useState<ProgramRule[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [existingCalls, setExistingCalls] = useState<MonthCall[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [historicalStats, setHistoricalStats] = useState<
    ExistingResidentStats[]
  >([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [programAvailability, setProgramAvailability] =
    useState<ProgramAvailabilityMonthResponse | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsCollapsed, setStatsCollapsed] = useState(false);

  const [draftAssignments, setDraftAssignments] = useState<
    Record<string, DraftDayAssignment>
  >({});
  const [originalAssignments, setOriginalAssignments] = useState<
    Record<string, DraftDayAssignment>
  >({});

  const [showRulesSheet, setShowRulesSheet] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSlot, setPickerSlot] = useState<{
    dateKey: string;
    slot: "Primary" | "Backup";
  } | null>(null);

  const [quickAssignResidentId, setQuickAssignResidentId] = useState("");
  const [quickAssignSlotMode, setQuickAssignSlotMode] =
    useState<QuickAssignSlotMode>("Primary");

  const monthDays = useMemo(() => getMonthDays(builderMonth), [builderMonth]);
  const calendarGrid = useMemo(
    () => getCalendarGrid(builderMonth),
    [builderMonth]
  );

  type ProgramMembersApiResident = {
  membershipId?: string | null;
  displayName?: string | null;
  trainingLevel?: string | null;
  pgyYear?: number | null;
  gradYear?: number | null;
};

type ProgramMembersApiResponse = {
  residents?: ProgramMembersApiResident[];
};

    useEffect(() => {
    let cancelled = false;

    async function loadResidents() {
      try {
        setResidentLoading(true);

        const response = await fetch("/api/program/members", {
          credentials: "include",
        });

        const payload: ProgramMembersApiResponse | null = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error("Failed to load residents");
        }

        if (cancelled) return;

        const items: ResidentOption[] = Array.isArray(payload?.residents)
          ? payload.residents
              .map((item): ResidentOption => ({
                membershipId: String(item.membershipId ?? ""),
                displayName: String(item.displayName ?? "Unknown"),
                trainingLevel: item.trainingLevel ?? null,
                pgyYear:
                  typeof item.pgyYear === "number" ? item.pgyYear : null,
                gradYear:
                  typeof item.gradYear === "number" ? item.gradYear : null,
              }))
              .filter((item) => !!item.membershipId)
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRules() {
      try {
        const response = await fetch("/api/program/call-rules", {
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to load rules");
        const payload = await response.json();

        if (cancelled) return;
        setRules(Array.isArray(payload?.rules) ? payload.rules : []);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load rules", err);
          setRules([]);
        }
      }
    }

    loadRules();

    return () => {
      cancelled = true;
    };
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
        setExistingCalls(calls);

        const nextAssignments = buildAssignmentsFromCalls(calls);

        setDraftAssignments(nextAssignments);
        setOriginalAssignments(nextAssignments);
        setQuickAssignResidentId("");
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
          throw new Error(
            payload?.error ?? "Failed to load program availability"
          );
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
    return new Map(residents.map((r) => [r.membershipId, r]));
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
      const slot =
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
        (item) => item.membershipId === resident.membershipId
      );

      perResident.set(resident.membershipId, {
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
        resident.membershipId,
        draftAssignments
      );

      const entry = perResident.get(resident.membershipId);
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

  const selectedResidentStats = useMemo(() => {
    if (!quickAssignResidentId) return null;

    return (
      computedStats.residentRows.find(
        (row) => row.resident.membershipId === quickAssignResidentId
      ) ?? null
    );
  }, [computedStats.residentRows, quickAssignResidentId]);

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

  function openPicker(dateKey: string, slot: "Primary" | "Backup") {
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
          current.primaryMembershipId === resident.membershipId;

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
            next.primaryMembershipId = resident.membershipId;
          }
        }
      }

      if (toggleBackup) {
        const isCurrentlySelected =
          current.backupMembershipId === resident.membershipId;

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
            next.backupMembershipId = resident.membershipId;
          }
        }
      }

      return {
        ...prev,
        [dateKey]: next,
      };
    });
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
    setExistingCalls(calls);

    const nextAssignments = buildAssignmentsFromCalls(calls);
    setDraftAssignments(nextAssignments);
    setOriginalAssignments(nextAssignments);
  }

  async function handleSaveBuilderMonth() {
    try {
      setError(null);

      const rows = monthDays.flatMap((day) => {
        const assignment = draftAssignments[day.key];
        if (!assignment) return [];

        const output: Array<{
          residentName: string;
          callDate: string;
          callType: "Primary" | "Backup";
          site: string | null;
          isHomeCall: boolean;
          notes: string | null;
          matchedMembershipId: string;
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
              matchedMembershipId: resident.membershipId,
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
              matchedMembershipId: resident.membershipId,
            });
          }
        }

        return output;
      });

      if (rows.length === 0) {
        setError("Add at least one assignment before saving the month.");
        return;
      }

      setSaving(true);

      const response = await fetch("/api/program/calls/bulk", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: `${formatMonthLabel(builderMonth)} Call Schedule`,
          notes: null,
          rows,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save generated schedule");
      }

      await refreshMonthData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save generated schedule"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEditedMonth() {
    try {
      setError(null);

      const rows = monthDays.flatMap((day) => {
        const assignment = draftAssignments[day.key];
        if (!assignment) return [];

        const output: Array<{
          residentName: string;
          callDate: string;
          callType: "Primary" | "Backup";
          site: string | null;
          isHomeCall: boolean;
          notes: string | null;
          matchedMembershipId: string;
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
              matchedMembershipId: resident.membershipId,
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
              matchedMembershipId: resident.membershipId,
            });
          }
        }

        return output;
      });

      setSaving(true);

      const response = await fetch("/api/program/calls/bulk", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: `${formatMonthLabel(builderMonth)} Call Schedule`,
          notes: null,
          rows,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save edited schedule");
      }

      await refreshMonthData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save edited schedule"
      );
    } finally {
      setSaving(false);
    }
  }

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
                    disabled
                    className="inline-flex h-[46px] items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-900 opacity-70"
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
                    disabled={saving || computedStats.fullyBuiltDays === 0}
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
          </div>
        </div>
      </div>

      <ProgramRulesSheet
        open={showRulesSheet}
        onClose={() => setShowRulesSheet(false)}
      />

      <ResidentPickerSheet
        open={pickerOpen}
        onClose={closePicker}
        title={
          pickerSlot
            ? `${pickerSlot.slot} assignment · ${
                monthDays.find((d) => d.key === pickerSlot.dateKey)?.dayName ?? ""
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
      />
    </>
  );
}