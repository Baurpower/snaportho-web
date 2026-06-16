"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  MoreHorizontal,
  Paintbrush,
  Plus,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Users,
  UserRound,
  X,
} from "lucide-react";
import type {
  ProgramAttending,
  ProgramAttendingCoverageSlot,
} from "@/lib/workspace/call/types";
import {
  composeProgramAttendingFullName,
  getAttendingDisplayName,
  parseProgramAttendingFullName,
} from "@/lib/workspace/call/attendings-shared";
import AttendingCombobox from "./attendingcombobox";
import AttendingCoverageCalendar from "./attendingcoveragecalendar";

type AssignmentMap = Record<string, Record<string, string>>;
type ReplacementAssignment = {
  coverageDate: string;
  slotId: string;
  attendingId: string;
  coverageScope: "program_call";
  isDefault: true;
};
type RangeMode =
  | "all"
  | "weekdays"
  | "weekends"
  | "rest"
  | "sun"
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat";

const panelClass =
  "rounded-[1.5rem] border border-white/10 bg-white/[0.045] shadow-[0_18px_55px_rgba(2,8,23,0.28)] backdrop-blur";
const inputClass =
  "w-full min-w-0 rounded-xl border border-white/10 bg-slate-950/45 px-2.5 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-teal-300/40 focus:ring-2 focus:ring-teal-300/10 disabled:cursor-not-allowed disabled:opacity-60";

function monthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cloneAssignments(assignments: AssignmentMap): AssignmentMap {
  return Object.fromEntries(
    Object.entries(assignments).map(([date, slotMap]) => [
      date,
      { ...slotMap },
    ])
  );
}

function attendingLabel(attending: ProgramAttending) {
  return getAttendingDisplayName(attending);
}

function initials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatSelectedDate(dateKey: string | null) {
  if (!dateKey) return "Select a day";
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function lastDateKey(year: number, monthIndex: number) {
  return toDateKey(new Date(year, monthIndex + 1, 0));
}

function getDateKeysBetween(startKey: string, endKey: string) {
  const start = new Date(`${startKey}T00:00:00`);
  const end = new Date(`${endKey}T00:00:00`);
  const first = start <= end ? start : end;
  const last = start <= end ? end : start;
  const dateKeys: string[] = [];

  for (
    let cursor = new Date(first);
    cursor <= last;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    dateKeys.push(toDateKey(cursor));
  }

  return dateKeys;
}

export default function AttendingCallCoverage() {
  const router = useRouter();
  const now = new Date();
  const [visibleMonth, setVisibleMonth] = useState({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  });
  const [attendings, setAttendings] = useState<ProgramAttending[]>([]);
  const [slots, setSlots] = useState<ProgramAttendingCoverageSlot[]>([]);
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [initialAssignments, setInitialAssignments] =
    useState<AssignmentMap>({});
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(now));
  const [attendingSearch, setAttendingSearch] = useState("");
  const [canManageAttendings, setCanManageAttendings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAttendingModal, setShowAttendingModal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [newAttendingFirstName, setNewAttendingFirstName] = useState("");
  const [newAttendingLastName, setNewAttendingLastName] = useState("");
  const [editingAttending, setEditingAttending] =
    useState<ProgramAttending | null>(null);
  const [openAttendingMenuId, setOpenAttendingMenuId] = useState<string | null>(
    null
  );
  const [newSlotName, setNewSlotName] = useState("");
  const [newSlotAbbreviation, setNewSlotAbbreviation] = useState("");
  const [newSlotColor, setNewSlotColor] = useState("#38bdf8");
  const [bulkSlotId, setBulkSlotId] = useState("");
  const [bulkAttendingId, setBulkAttendingId] = useState("");
  const [bulkStart, setBulkStart] = useState(
    `${monthKey(now.getFullYear(), now.getMonth())}-01`
  );
  const [bulkEnd, setBulkEnd] = useState(
    lastDateKey(now.getFullYear(), now.getMonth())
  );
  const [bulkMode, setBulkMode] = useState<RangeMode>("all");
  const [editMode, setEditMode] = useState(false);
  const [paintSlotId, setPaintSlotId] = useState("");
  const [paintAttendingId, setPaintAttendingId] = useState("");
  const [recentAttendingIds, setRecentAttendingIds] = useState<string[]>([]);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [patternOpen, setPatternOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [lastPaintedDate, setLastPaintedDate] = useState<string | null>(null);

  const activeAttendings = useMemo(
    () =>
      attendings
        .filter((attending) => attending.isActive)
        .sort((a, b) => attendingLabel(a).localeCompare(attendingLabel(b))),
    [attendings]
  );
  const filteredAttendings = useMemo(() => {
    const query = attendingSearch.trim().toLowerCase();
    if (!query) return activeAttendings;
    return activeAttendings.filter((attending) =>
      attendingLabel(attending).toLowerCase().includes(query)
    );
  }, [activeAttendings, attendingSearch]);
  const activeSlots = useMemo(
    () =>
      slots
        .filter((slot) => slot.isActive)
        .sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
        ),
    [slots]
  );
  const currentMonthKey = monthKey(
    visibleMonth.year,
    visibleMonth.monthIndex
  );
  const currentMonthLabel = new Date(
    visibleMonth.year,
    visibleMonth.monthIndex,
    1
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const isDirty = useMemo(
    () => JSON.stringify(assignments) !== JSON.stringify(initialAssignments),
    [assignments, initialAssignments]
  );
  const monthDayCount = new Date(
    visibleMonth.year,
    visibleMonth.monthIndex + 1,
    0
  ).getDate();
  const totalAssignmentCount = monthDayCount * activeSlots.length;
  const filledAssignmentCount = useMemo(() => {
    let count = 0;
    for (let day = 1; day <= monthDayCount; day += 1) {
      const dateKey = `${currentMonthKey}-${String(day).padStart(2, "0")}`;
      for (const slot of activeSlots) {
        if (assignments[dateKey]?.[slot.id]) count += 1;
      }
    }
    return count;
  }, [activeSlots, assignments, currentMonthKey, monthDayCount]);
  const missingAssignmentCount = Math.max(
    totalAssignmentCount - filledAssignmentCount,
    0
  );
  const completionPercentage =
    totalAssignmentCount === 0
      ? 0
      : Math.round((filledAssignmentCount / totalAssignmentCount) * 100);

  const loadMonth = useCallback(async (month: string) => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/program/call-attending-assignments/month?month=${month}`,
        { credentials: "include", cache: "no-store" }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load attending coverage.");
      }

      const nextAttendings = Array.isArray(payload?.attendings)
        ? (payload.attendings as ProgramAttending[])
        : [];
      const nextSlots = Array.isArray(payload?.slots)
        ? (payload.slots as ProgramAttendingCoverageSlot[])
        : [];
      const nextAssignments: AssignmentMap = {};

      for (const assignment of Array.isArray(payload?.assignments)
        ? payload.assignments
        : []) {
        if (
          assignment?.coverageDate &&
          assignment?.slotId &&
          assignment?.attendingId
        ) {
          nextAssignments[assignment.coverageDate] ??= {};
          nextAssignments[assignment.coverageDate][assignment.slotId] =
            assignment.attendingId;
        }
      }

      setCanManageAttendings(Boolean(payload?.canManageAttendings));
      setAttendings(nextAttendings);
      setSlots(nextSlots);
      setPaintSlotId((current) =>
        nextSlots.some((slot) => slot.id === current && slot.isActive)
          ? current
          : nextSlots.find((slot) => slot.isActive)?.id ?? ""
      );
      setPaintAttendingId((current) =>
        nextAttendings.some(
          (attending) => attending.id === current && attending.isActive
        )
          ? current
          : nextAttendings.find((attending) => attending.isActive)?.id ?? ""
      );
      setAssignments(nextAssignments);
      setInitialAssignments(cloneAssignments(nextAssignments));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load attending coverage."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMonth(currentMonthKey);
  }, [currentMonthKey, loadMonth]);

  useEffect(() => {
    const monthStart = `${currentMonthKey}-01`;
    const monthEnd = lastDateKey(
      visibleMonth.year,
      visibleMonth.monthIndex
    );
    setBulkStart(monthStart);
    setBulkEnd(monthEnd);
    setBulkMode("all");
    setSelectedDateKey((current) =>
      current.startsWith(currentMonthKey) ? current : monthStart
    );
  }, [currentMonthKey, visibleMonth.monthIndex, visibleMonth.year]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function confirmDiscard(message: string) {
    return !isDirty || window.confirm(message);
  }

  function navigateAway(path: string) {
    if (
      confirmDiscard(
        "You have unsaved attending coverage changes. Discard them and leave?"
      )
    ) {
      router.push(path);
    }
  }

  function changeMonth(delta: number) {
    if (
      !confirmDiscard(
        "You have unsaved changes for this month. Discard them and switch months?"
      )
    ) {
      return;
    }
    setVisibleMonth(({ year, monthIndex }) => {
      const target = new Date(year, monthIndex + delta, 1);
      return { year: target.getFullYear(), monthIndex: target.getMonth() };
    });
  }

  function goToToday() {
    if (
      !confirmDiscard(
        "You have unsaved changes for this month. Discard them and go to today?"
      )
    ) {
      return;
    }
    const today = new Date();
    setVisibleMonth({
      year: today.getFullYear(),
      monthIndex: today.getMonth(),
    });
    setSelectedDateKey(toDateKey(today));
  }

  function updateAssignment(
    dateKey: string,
    slotId: string,
    attendingId: string | null
  ) {
    if (!canManageAttendings) return;
    setAssignments((current) => {
      const next = cloneAssignments(current);
      next[dateKey] ??= {};

      if (attendingId) {
        next[dateKey][slotId] = attendingId;
      } else {
        delete next[dateKey][slotId];
        if (Object.keys(next[dateKey]).length === 0) delete next[dateKey];
      }
      return next;
    });
    setNotice(null);
  }

  function choosePaintAttending(attendingId: string) {
    setPaintAttendingId(attendingId);
    setRecentAttendingIds((current) => [
      attendingId,
      ...current.filter((id) => id !== attendingId),
    ].slice(0, 6));
  }

  function paintDate(
    dateKey: string,
    options: { shiftKey: boolean; forceAssign: boolean }
  ) {
    if (
      !canManageAttendings ||
      !editMode ||
      !paintSlotId ||
      !paintAttendingId
    ) {
      return;
    }

    setAssignments((current) => {
      const next = cloneAssignments(current);
      const dateKeys =
        options.shiftKey && lastPaintedDate
          ? getDateKeysBetween(lastPaintedDate, dateKey).filter((key) =>
              key.startsWith(currentMonthKey)
            )
          : [dateKey];

      for (const targetDateKey of dateKeys) {
        next[targetDateKey] ??= {};
        const existingAttendingId = next[targetDateKey][paintSlotId];
        if (
          !options.forceAssign &&
          dateKeys.length === 1 &&
          existingAttendingId === paintAttendingId
        ) {
          delete next[targetDateKey][paintSlotId];
          if (Object.keys(next[targetDateKey]).length === 0) {
            delete next[targetDateKey];
          }
        } else {
          next[targetDateKey][paintSlotId] = paintAttendingId;
        }
      }
      return next;
    });

    setSelectedDateKey(dateKey);
    setLastPaintedDate(dateKey);
    setNotice(null);
  }

  async function saveChanges() {
    if (!canManageAttendings || !isDirty || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const validSlotIds = new Set(activeSlots.map((slot) => slot.id));
      const validAttendingIds = new Set(attendings.map((attending) => attending.id));
      const seenSlotKeys = new Set<string>();
      const replacement: ReplacementAssignment[] = [];

      for (const [coverageDate, slotMap] of Object.entries(assignments)) {
        if (!coverageDate.startsWith(`${currentMonthKey}-`)) {
          throw new Error("Coverage draft contains an assignment outside the visible month.");
        }

        for (const [slotId, attendingId] of Object.entries(slotMap)) {
          if (!validSlotIds.has(slotId)) {
            throw new Error("Coverage draft contains an unknown coverage slot. Reload and try again.");
          }

          if (!validAttendingIds.has(attendingId)) {
            throw new Error("Coverage draft contains an unknown attending. Reload and try again.");
          }

          const slotKey = `${coverageDate}__${slotId}`;
          if (seenSlotKeys.has(slotKey)) {
            throw new Error("Coverage draft contains duplicate assignments for the same date and slot.");
          }
          seenSlotKeys.add(slotKey);

          replacement.push({
            coverageDate,
            slotId,
            attendingId,
            coverageScope: "program_call",
            isDefault: true,
          });
        }
      }

      const response = await fetch(
        "/api/program/call-attending-assignments/month",
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month: currentMonthKey,
            assignments: replacement,
          }),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save attending coverage.");
      }

      const saved: AssignmentMap = {};
      for (const assignment of Array.isArray(payload?.assignments)
        ? payload.assignments
        : []) {
        if (
          assignment?.coverageDate &&
          assignment?.slotId &&
          assignment?.attendingId
        ) {
          saved[assignment.coverageDate] ??= {};
          saved[assignment.coverageDate][assignment.slotId] =
            assignment.attendingId;
        }
      }
      setAssignments(saved);
      setInitialAssignments(cloneAssignments(saved));
      setNotice("Attending coverage saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save attending coverage."
      );
    } finally {
      setSaving(false);
    }
  }

  function discardChanges() {
    setAssignments(cloneAssignments(initialAssignments));
    setNotice("Unsaved changes discarded.");
    setError(null);
  }

  function clearSelectedDay() {
    if (!selectedDateKey || !canManageAttendings) return;
    setAssignments((current) => {
      const next = cloneAssignments(current);
      delete next[selectedDateKey];
      return next;
    });
    setNotice(null);
  }

  function openCreateAttending() {
    setEditingAttending(null);
    setNewAttendingFirstName("");
    setNewAttendingLastName("");
    setShowAttendingModal(true);
  }

  function openEditAttending(attending: ProgramAttending) {
    const parsed = parseProgramAttendingFullName(attendingLabel(attending));
    setEditingAttending(attending);
    setNewAttendingFirstName(attending.firstName ?? parsed.firstName);
    setNewAttendingLastName(attending.lastName ?? parsed.lastName);
    setShowAttendingModal(true);
  }

  async function saveAttending() {
    const firstName = newAttendingFirstName.trim();
    const lastName = newAttendingLastName.trim();
    if (!firstName || !lastName) return;
    const fullName = composeProgramAttendingFullName(firstName, lastName);
    setCreating(true);
    setError(null);
    try {
      const response = await fetch(
        editingAttending
          ? `/api/program/attendings/${editingAttending.id}`
          : "/api/program/attendings",
        {
        method: editingAttending ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          fullName,
          displayName: fullName,
        }),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.attending) {
        throw new Error(payload?.error ?? "Failed to save attending.");
      }
      setAttendings((current) =>
        editingAttending
          ? current.map((attending) =>
              attending.id === payload.attending.id
                ? payload.attending
                : attending
            )
          : [...current, payload.attending]
      );
      setPaintAttendingId((current) => current || payload.attending.id);
      setNewAttendingFirstName("");
      setNewAttendingLastName("");
      setEditingAttending(null);
      setShowAttendingModal(false);
      setNotice(
        editingAttending
          ? `${fullName} updated.`
          : `${fullName} added to the attending pool.`
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to save attending."
      );
    } finally {
      setCreating(false);
    }
  }

  async function deactivateAttending(attending: ProgramAttending) {
    const label = attendingLabel(attending);
    if (
      !window.confirm(
        `Deactivate ${label}? Existing coverage remains visible, but this attending will no longer be available for new assignments.`
      )
    ) {
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const response = await fetch(`/api/program/attendings/${attending.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.attending) {
        throw new Error(payload?.error ?? "Failed to deactivate attending.");
      }
      setAttendings((current) =>
        current.map((candidate) =>
          candidate.id === payload.attending.id
            ? payload.attending
            : candidate
        )
      );
      if (paintAttendingId === attending.id) {
        setPaintAttendingId("");
        setEditMode(false);
      }
      setNotice(`${label} deactivated.`);
    } catch (deactivateError) {
      setError(
        deactivateError instanceof Error
          ? deactivateError.message
          : "Failed to deactivate attending."
      );
    } finally {
      setCreating(false);
    }
  }

  async function createSlot() {
    const name = newSlotName.trim();
    const abbreviation = newSlotAbbreviation.trim().toUpperCase();
    if (!name || !abbreviation) return;
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/program/attending-coverage-slots", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          abbreviation,
          color: newSlotColor,
          sortOrder: activeSlots.length,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.slot) {
        throw new Error(payload?.error ?? "Failed to create coverage slot.");
      }
      setSlots((current) => [...current, payload.slot]);
      setPaintSlotId((current) => current || payload.slot.id);
      setNewSlotName("");
      setNewSlotAbbreviation("");
      setShowSlotModal(false);
      setNotice(`${name} coverage slot added.`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create coverage slot."
      );
    } finally {
      setCreating(false);
    }
  }

  function chooseRange(mode: RangeMode) {
    setBulkMode(mode);
    setBulkStart(
      mode === "rest" && selectedDateKey
        ? selectedDateKey
        : `${currentMonthKey}-01`
    );
    setBulkEnd(lastDateKey(visibleMonth.year, visibleMonth.monthIndex));
  }

  function applyBulkFill() {
    if (!canManageAttendings) return false;
    if (!bulkSlotId) {
      setError("Choose a coverage slot before applying a range.");
      return false;
    }
    const start = new Date(`${bulkStart}T00:00:00`);
    const end = new Date(`${bulkEnd}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      setError("Choose a valid start and end date.");
      return false;
    }
    if (!bulkAttendingId) {
      const confirmed = window.confirm(
        "No attending is selected. Clear this slot for the chosen range?"
      );
      if (!confirmed) return false;
    }

    let count = 0;
    setAssignments((current) => {
      const next = cloneAssignments(current);
      for (
        let cursor = new Date(start);
        cursor <= end;
        cursor.setDate(cursor.getDate() + 1)
      ) {
        if (
          cursor.getFullYear() !== visibleMonth.year ||
          cursor.getMonth() !== visibleMonth.monthIndex
        ) {
          continue;
        }
        const weekend = cursor.getDay() === 0 || cursor.getDay() === 6;
        if (bulkMode === "weekdays" && weekend) continue;
        if (bulkMode === "weekends" && !weekend) continue;
        const weekdayModes: RangeMode[] = [
          "sun",
          "mon",
          "tue",
          "wed",
          "thu",
          "fri",
          "sat",
        ];
        if (
          weekdayModes.includes(bulkMode) &&
          cursor.getDay() !== weekdayModes.indexOf(bulkMode)
        ) {
          continue;
        }

        const dateKey = toDateKey(cursor);
        next[dateKey] ??= {};
        if (bulkAttendingId) {
          next[dateKey][bulkSlotId] = bulkAttendingId;
        } else {
          delete next[dateKey][bulkSlotId];
          if (Object.keys(next[dateKey]).length === 0) delete next[dateKey];
        }
        count += 1;
      }
      return next;
    });
    setError(null);
    setNotice(
      `${count} day${count === 1 ? "" : "s"} updated locally. Save Changes to persist.`
    );
    return true;
  }

  return (
    <main className="min-h-screen bg-[#06101f] pt-[54px] text-white md:pt-[52px]">
      <div className="relative z-10 border-b border-white/10 bg-[#081423]">
        <div className="flex flex-col gap-3 px-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-4">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => navigateAway("/work/call")}
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Back to Call Hub"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Attending Call Coverage
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Assign attendings to coverage slots for each day.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!canManageAttendings && !loading ? (
              <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-200">
                Read-only coverage
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-3 lg:p-4">
        {error ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadMonth(currentMonthKey)}
              className="shrink-0 text-xs font-semibold underline"
            >
              Retry
            </button>
          </div>
        ) : null}
        {notice ? (
          <div className="mb-4 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}

        {loading ? (
          <div className={`${panelClass} flex min-h-[420px] items-center justify-center`}>
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin text-teal-300" />
              Loading attending coverage...
            </div>
          </div>
        ) : (
          <section
            className={`min-w-0 rounded-[1.25rem] border bg-slate-100 p-2.5 shadow-[0_18px_55px_rgba(2,8,23,0.22)] transition ${
              editMode
                ? "border-teal-300 ring-2 ring-teal-500/10"
                : "border-slate-200"
            }`}
          >
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-[124px] text-center text-base font-bold text-slate-900">
                    {currentMonthLabel}
                  </div>
                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goToToday}
                    className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Today
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-right shadow-sm">
                    <p
                      className={`text-xs font-bold ${
                        missingAssignmentCount > 0
                          ? "text-amber-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {missingAssignmentCount} missing
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {completionPercentage}% complete
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMissingOnly((current) => !current)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {showMissingOnly ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    {showMissingOnly ? "Show all" : "Missing only"}
                  </button>
                  {canManageAttendings ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setResourcesOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <Users className="h-3.5 w-3.5" />
                        Manage
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditMode((current) => !current);
                          setLastPaintedDate(null);
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          editMode
                            ? "bg-slate-900 text-white hover:bg-slate-800"
                            : "bg-teal-600 text-white hover:bg-teal-500"
                        }`}
                      >
                        <Paintbrush className="h-3.5 w-3.5" />
                        {editMode ? "Exit Edit Mode" : "Edit Coverage"}
                      </button>
                      {isDirty ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                          Unsaved
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={discardChanges}
                        disabled={!isDirty || saving}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Discard
                      </button>
                      <button
                        type="button"
                        onClick={saveChanges}
                        disabled={!isDirty || saving}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        {saving ? "Saving" : "Save"}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {editMode && canManageAttendings ? (
                <div className="grid gap-2 rounded-xl border border-teal-200 bg-teal-50 p-2.5 lg:grid-cols-[180px_minmax(260px,420px)_auto_1fr] lg:items-end">
                  <label className="block min-w-0">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-teal-800">
                      Coverage slot
                    </span>
                    <select
                      value={paintSlotId}
                      onChange={(event) => {
                        setPaintSlotId(event.target.value);
                        setLastPaintedDate(null);
                      }}
                      className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="">Choose slot</option>
                      {activeSlots.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          {slot.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="min-w-0">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-teal-800">
                      Attending
                    </span>
                    <AttendingCombobox
                      attendings={activeAttendings}
                      selectedId={paintAttendingId}
                      recentIds={recentAttendingIds}
                      onSelect={choosePaintAttending}
                      disabled={activeAttendings.length === 0}
                    />
                  </div>

                  <div className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white">
                    <Paintbrush className="h-4 w-4" />
                    Editing Coverage
                  </div>

                  <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkSlotId((current) => current || paintSlotId);
                        setBulkAttendingId(
                          (current) => current || paintAttendingId
                        );
                        setPatternOpen(true);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Fill Pattern
                    </button>
                    <span className="text-xs font-medium text-teal-800">
                      Click or drag dates. Shift-click fills a range.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pt-2.5">
              <AttendingCoverageCalendar
                year={visibleMonth.year}
                monthIndex={visibleMonth.monthIndex}
                attendings={attendings}
                slots={activeSlots}
                assignments={assignments}
                selectedDateKey={selectedDateKey}
                editMode={editMode && canManageAttendings}
                showMissingOnly={showMissingOnly}
                selectedSlotId={paintSlotId}
                onSelectDate={(dateKey) => {
                  setSelectedDateKey(dateKey);
                  setInspectorOpen(true);
                }}
                onPaintDate={paintDate}
              />
            </div>
          </section>
        )}
      </div>

      {inspectorOpen ? (
        <div className="fixed inset-0 z-[180] flex justify-end bg-slate-950/35 backdrop-blur-[2px]">
          <button
            type="button"
            className="min-w-0 flex-1 cursor-default"
            onClick={() => setInspectorOpen(false)}
            aria-label="Close day inspector"
          />
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-5 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">
                  Day review
                </p>
                <h2 className="mt-1.5 text-xl font-bold">
                  {formatSelectedDate(selectedDateKey)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectorOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Close day inspector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {canManageAttendings && selectedDateKey ? (
              <button
                type="button"
                onClick={clearSelectedDay}
                className="mt-4 text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                Clear all assignments for this day
              </button>
            ) : null}

            <div className="mt-5 space-y-3">
              {activeSlots.map((slot) => (
                <label
                  key={slot.id}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: slot.color || "#38bdf8" }}
                    />
                    <span
                      className="text-[10px] font-black uppercase"
                      style={{ color: slot.color || "#0284c7" }}
                    >
                      {slot.abbreviation}
                    </span>
                    {slot.name}
                  </span>
                  <select
                    value={
                      selectedDateKey
                        ? assignments[selectedDateKey]?.[slot.id] ?? ""
                        : ""
                    }
                    onChange={(event) =>
                      selectedDateKey &&
                      updateAssignment(
                        selectedDateKey,
                        slot.id,
                        event.target.value || null
                      )
                    }
                    disabled={!canManageAttendings || !selectedDateKey}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="">Unassigned</option>
                    {activeAttendings.map((attending) => (
                      <option key={attending.id} value={attending.id}>
                        {attendingLabel(attending)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      {patternOpen ? (
        <div className="fixed inset-0 z-[190] flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:items-center">
          <section className="w-full max-w-xl rounded-[1.75rem] border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700">
                  Fill pattern
                </p>
                <h2 className="mt-1.5 text-xl font-bold">
                  Apply repeating coverage
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Updates remain local until Save Changes is selected.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPatternOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Close fill pattern"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Coverage slot
                </span>
                <select
                  value={bulkSlotId}
                  onChange={(event) => setBulkSlotId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="">Choose slot</option>
                  {activeSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Attending
                </span>
                <select
                  value={bulkAttendingId}
                  onChange={(event) => setBulkAttendingId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="">Clear assignments</option>
                  {activeAttendings.map((attending) => (
                    <option key={attending.id} value={attending.id}>
                      {attendingLabel(attending)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Start date
                </span>
                <input
                  type="date"
                  value={bulkStart}
                  min={`${currentMonthKey}-01`}
                  max={lastDateKey(
                    visibleMonth.year,
                    visibleMonth.monthIndex
                  )}
                  onChange={(event) => setBulkStart(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  End date
                </span>
                <input
                  type="date"
                  value={bulkEnd}
                  min={`${currentMonthKey}-01`}
                  max={lastDateKey(
                    visibleMonth.year,
                    visibleMonth.monthIndex
                  )}
                  onChange={(event) => setBulkEnd(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["all", "Entire month"],
                  ["weekdays", "Weekdays"],
                  ["weekends", "Weekends"],
                  ["mon", "Mondays"],
                  ["tue", "Tuesdays"],
                  ["wed", "Wednesdays"],
                  ["thu", "Thursdays"],
                  ["fri", "Fridays"],
                  ["sat", "Saturdays"],
                  ["sun", "Sundays"],
                  ["rest", "Rest of month"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => chooseRange(mode)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    bulkMode === mode
                      ? "border-teal-500 bg-teal-50 text-teal-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (applyBulkFill()) setPatternOpen(false);
              }}
              className="mt-5 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white hover:bg-teal-500"
            >
              Apply pattern locally
            </button>
          </section>
        </div>
      ) : null}

      {resourcesOpen ? (
        <div className="fixed inset-0 z-[180] flex justify-end bg-slate-950/35 backdrop-blur-[2px]">
          <button
            type="button"
            className="min-w-0 flex-1 cursor-default"
            onClick={() => setResourcesOpen(false)}
            aria-label="Close resource manager"
          />
          <aside className="h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-5 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Setup
                </p>
                <h2 className="mt-1.5 text-xl font-bold">Manage resources</h2>
              </div>
              <button
                type="button"
                onClick={() => setResourcesOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Close resource manager"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <section className="mt-5 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">Attendings</h3>
                  <p className="text-xs text-slate-500">
                    {activeAttendings.length} active
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateAttending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={attendingSearch}
                  onChange={(event) => setAttendingSearch(event.target.value)}
                  placeholder="Search attendings..."
                  className="w-full rounded-xl bg-slate-100 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                {filteredAttendings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                    <UserRound className="mx-auto mb-2 h-5 w-5" />
                    No matching attendings.
                  </div>
                ) : (
                  filteredAttendings.map((attending) => {
                    const label = attendingLabel(attending);
                    return (
                      <div
                        key={attending.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-800">
                          {initials(label)}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-semibold">
                          {label}
                        </span>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenAttendingMenuId((current) =>
                                current === attending.id ? null : attending.id
                              )
                            }
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            aria-label={`Manage ${label}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {openAttendingMenuId === attending.id ? (
                            <div className="absolute right-0 top-10 z-20 w-32 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-xl">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenAttendingMenuId(null);
                                  openEditAttending(attending);
                                }}
                                className="block w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-slate-50"
                              >
                                Edit name
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenAttendingMenuId(null);
                                  void deactivateAttending(attending);
                                }}
                                className="block w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                              >
                                Deactivate
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">Coverage slots</h3>
                  <p className="text-xs text-slate-500">
                    {activeSlots.length} configured
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSlotModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {activeSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: slot.color || "#38bdf8" }}
                    />
                    <span className="text-xs font-black uppercase text-slate-500">
                      {slot.abbreviation}
                    </span>
                    <span className="text-sm font-semibold">{slot.name}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      ) : null}

      {showAttendingModal ? (
        <div className="fixed inset-0 z-[220] flex items-end justify-center bg-slate-950/75 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-[#0d1728] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
                  {editingAttending ? "Edit attending" : "New attending"}
                </p>
                <h2 className="mt-2 text-xl font-bold text-white">
                  {editingAttending
                    ? "Update attending details"
                    : "Add to attending pool"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAttendingModal(false);
                  setEditingAttending(null);
                }}
                disabled={creating}
                className="rounded-full border border-white/10 p-2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  First name
                </span>
                <input
                  autoFocus
                  value={newAttendingFirstName}
                  onChange={(event) =>
                    setNewAttendingFirstName(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void saveAttending();
                  }}
                  placeholder="Dan"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Last name
                </span>
                <input
                  value={newAttendingLastName}
                  onChange={(event) =>
                    setNewAttendingLastName(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void saveAttending();
                  }}
                  placeholder="Lee"
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAttendingModal(false);
                  setEditingAttending(null);
                }}
                disabled={creating}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveAttending()}
                disabled={
                  creating ||
                  !newAttendingFirstName.trim() ||
                  !newAttendingLastName.trim()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  editingAttending ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )
                )}
                {editingAttending ? "Save attending" : "Create attending"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSlotModal ? (
        <div className="fixed inset-0 z-[220] flex items-end justify-center bg-slate-950/75 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-[#0d1728] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
                  New coverage slot
                </p>
                <h2 className="mt-2 text-xl font-bold text-white">
                  Add service or coverage role
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSlotModal(false)}
                disabled={creating}
                className="rounded-full border border-white/10 p-2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Slot name
                </span>
                <input
                  autoFocus
                  value={newSlotName}
                  onChange={(event) => setNewSlotName(event.target.value)}
                  placeholder="Trauma"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Abbreviation
                </span>
                <input
                  value={newSlotAbbreviation}
                  onChange={(event) =>
                    setNewSlotAbbreviation(
                      event.target.value.toUpperCase().slice(0, 8)
                    )
                  }
                  placeholder="TRAUMA"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Color
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newSlotColor}
                    onChange={(event) => setNewSlotColor(event.target.value)}
                    className="h-10 w-14 rounded-lg border border-white/10 bg-transparent p-1"
                  />
                  <span className="text-sm text-slate-400">{newSlotColor}</span>
                </div>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSlotModal(false)}
                disabled={creating}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void createSlot()}
                disabled={
                  creating ||
                  !newSlotName.trim() ||
                  !newSlotAbbreviation.trim()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create slot
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
