"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseMedical,
  CalendarDays,
  Check,
  Clock3,
  GraduationCap,
  Loader2,
  MoonStar,
  NotebookPen,
  PencilLine,
  Stethoscope,
  Sunset,
  X,
} from "lucide-react";
import {
  formatDayOfMonth,
  formatShortDateWithWeekday,
} from "@/lib/student-workspace/date";
import type {
  StudentWorkspaceBrobotAction,
  StudentWorkspaceResolvedScheduleEntry,
  StudentWorkspaceScheduleEntryType,
} from "@/lib/student-workspace/types";
import { STUDENT_WORKSPACE_BROBOT_ACTIONS } from "@/lib/student-workspace/types";

type StudentPlannerDay = {
  date: string;
  dayKey: string;
};

type StudentPrepWeekPanelProps = {
  days: StudentPlannerDay[];
  entries: StudentWorkspaceResolvedScheduleEntry[];
  initialActiveDate?: string | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

type StudentPlannerCategory =
  | "or"
  | "clinic"
  | "call"
  | "off"
  | "other";

type StudentDayDraft = {
  eventId: string | null;
  selected: boolean;
  category: StudentPlannerCategory;
  title: string;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  todayFocus: string;
  casesToReview: string;
  preparationWorkflow: string;
  resources: string;
  notes: string;
  tomorrowPrep: string;
  brobotAction: StudentWorkspaceBrobotAction | "";
  loadedFromServer: boolean;
  dirty: boolean;
};

type SaveSummary = {
  added: number;
  updated: number;
  removed: number;
};

const STUDENT_PLANNER_CATEGORIES: Array<{
  key: StudentPlannerCategory;
  label: string;
  helper: string;
  icon: ComponentType<{ className?: string }>;
  shortLabel: string;
}> = [
  { key: "or", label: "OR", helper: "Procedure and anatomy prep", icon: BriefcaseMedical, shortLabel: "OR" },
  { key: "clinic", label: "Clinic", helper: "Outpatient expectations", icon: Stethoscope, shortLabel: "Clinic" },
  { key: "call", label: "Call", helper: "High-readiness days", icon: MoonStar, shortLabel: "Call" },
  { key: "off", label: "Off", helper: "Protect recharge time", icon: Sunset, shortLabel: "Off" },
  { key: "other", label: "Other", helper: "Anything that does not fit the core buckets", icon: NotebookPen, shortLabel: "Other" },
];

function defaultTitleForCategory(category: StudentPlannerCategory) {
  return (
    STUDENT_PLANNER_CATEGORIES.find((item) => item.key === category)?.label ?? "Other"
  );
}

function isDefaultPlannerTitle(value: string) {
  return STUDENT_PLANNER_CATEGORIES.some(
    (item) => item.label.toLowerCase() === value.trim().toLowerCase()
  );
}

function formatPlannerDate(date: string) {
  return formatShortDateWithWeekday(date);
}

function formatDayNumber(date: string) {
  return formatDayOfMonth(date);
}

function formatShortPlannerDate(date: string) {
  return formatShortDateWithWeekday(date);
}

function isValidTimeString(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function createDefaultDraft(category: StudentPlannerCategory): StudentDayDraft {
  return {
    eventId: null,
    selected: false,
    category,
    title: defaultTitleForCategory(category),
    isAllDay: true,
    startTime: "07:00",
    endTime: "17:00",
    location: "",
    todayFocus: "",
    casesToReview: "",
    preparationWorkflow: "",
    resources: "",
    notes: "",
    tomorrowPrep: "",
    brobotAction: "",
    loadedFromServer: false,
    dirty: false,
  };
}

function createDraftFromExistingEntry(
  entry: StudentWorkspaceResolvedScheduleEntry
): StudentDayDraft {
  const category = mapEntryTypeToPlannerCategory(entry.entry_type);

  return {
    eventId: entry.id,
    selected: true,
    category,
    title: entry.title ?? defaultTitleForCategory(category),
    isAllDay: entry.is_all_day,
    startTime: entry.start_time?.slice(0, 5) ?? "07:00",
    endTime: entry.end_time?.slice(0, 5) ?? "17:00",
    location: entry.location ?? "",
    todayFocus: entry.today_focus ?? "",
    casesToReview: entry.cases_to_review ?? "",
    preparationWorkflow: entry.preparation_workflow ?? "",
    resources: entry.resources ?? "",
    notes: entry.notes ?? "",
    tomorrowPrep: entry.tomorrow_prep ?? "",
    brobotAction: entry.brobot_action ?? "",
    loadedFromServer: true,
    dirty: false,
  };
}

function getCategoryTheme(category: StudentPlannerCategory, active = false) {
  if (category === "or") {
    return active
      ? {
          card: "border-slate-900 bg-slate-900 text-white shadow-md",
          chip: "bg-slate-900 text-white",
          chipInactive: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
          badge: "bg-slate-900 text-white",
          border: "focus:border-slate-400 focus:ring-slate-100",
          daySelected: "border-slate-900 bg-slate-900 text-white shadow-sm",
          dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          tabActive: "bg-slate-900 text-white",
          tabInactive: "bg-slate-100 text-slate-700 hover:bg-slate-200",
        }
      : {
          card: "border-slate-200 bg-slate-50 text-slate-950 shadow-sm",
          chip: "bg-slate-900 text-white",
          chipInactive: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
          badge: "bg-slate-900 text-white",
          border: "focus:border-slate-400 focus:ring-slate-100",
          daySelected: "border-slate-900 bg-slate-900 text-white shadow-sm",
          dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          tabActive: "bg-slate-900 text-white",
          tabInactive: "bg-slate-100 text-slate-700 hover:bg-slate-200",
        };
  }

  if (category === "clinic") {
    return active
      ? {
          card: "border-sky-600 bg-sky-600 text-white shadow-md",
          chip: "bg-sky-600 text-white",
          chipInactive: "bg-sky-50 text-sky-900 ring-1 ring-sky-200",
          badge: "bg-sky-600 text-white",
          border: "focus:border-sky-300 focus:ring-sky-100",
          daySelected: "border-sky-600 bg-sky-600 text-white shadow-sm",
          dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          tabActive: "bg-sky-600 text-white",
          tabInactive: "bg-sky-50 text-sky-900 hover:bg-sky-100",
        }
      : {
          card: "border-sky-200 bg-sky-50 text-sky-950 shadow-sm",
          chip: "bg-sky-600 text-white",
          chipInactive: "bg-sky-50 text-sky-900 ring-1 ring-sky-200",
          badge: "bg-sky-600 text-white",
          border: "focus:border-sky-300 focus:ring-sky-100",
          daySelected: "border-sky-600 bg-sky-600 text-white shadow-sm",
          dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          tabActive: "bg-sky-600 text-white",
          tabInactive: "bg-sky-50 text-sky-900 hover:bg-sky-100",
        };
  }

  if (category === "other") {
    return active
      ? {
          card: "border-violet-700 bg-violet-700 text-white shadow-md",
          chip: "bg-violet-700 text-white",
          chipInactive: "bg-violet-50 text-violet-900 ring-1 ring-violet-200",
          badge: "bg-violet-700 text-white",
          border: "focus:border-violet-400 focus:ring-violet-100",
          daySelected: "border-violet-700 bg-violet-700 text-white shadow-sm",
          dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          tabActive: "bg-violet-700 text-white",
          tabInactive: "bg-violet-50 text-violet-900 hover:bg-violet-100",
        }
      : {
          card: "border-violet-200 bg-violet-50 text-violet-950 shadow-sm",
          chip: "bg-violet-700 text-white",
          chipInactive: "bg-violet-50 text-violet-900 ring-1 ring-violet-200",
          badge: "bg-violet-700 text-white",
          border: "focus:border-violet-400 focus:ring-violet-100",
          daySelected: "border-violet-700 bg-violet-700 text-white shadow-sm",
          dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          tabActive: "bg-violet-700 text-white",
          tabInactive: "bg-violet-50 text-violet-900 hover:bg-violet-100",
        };
  }

  if (category === "call") {
    return active
      ? {
          card: "border-rose-600 bg-rose-600 text-white shadow-md",
          chip: "bg-rose-600 text-white",
          chipInactive: "bg-rose-50 text-rose-900 ring-1 ring-rose-200",
          badge: "bg-rose-600 text-white",
          border: "focus:border-rose-300 focus:ring-rose-100",
          daySelected: "border-rose-600 bg-rose-600 text-white shadow-sm",
          dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          tabActive: "bg-rose-600 text-white",
          tabInactive: "bg-rose-50 text-rose-900 hover:bg-rose-100",
        }
      : {
          card: "border-rose-200 bg-rose-50 text-rose-950 shadow-sm",
          chip: "bg-rose-600 text-white",
          chipInactive: "bg-rose-50 text-rose-900 ring-1 ring-rose-200",
          badge: "bg-rose-600 text-white",
          border: "focus:border-rose-300 focus:ring-rose-100",
          daySelected: "border-rose-600 bg-rose-600 text-white shadow-sm",
          dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          tabActive: "bg-rose-600 text-white",
          tabInactive: "bg-rose-50 text-rose-900 hover:bg-rose-100",
        };
  }

  return active
    ? {
        card: "border-emerald-600 bg-emerald-600 text-white shadow-md",
        chip: "bg-emerald-600 text-white",
        chipInactive: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200",
        badge: "bg-emerald-600 text-white",
        border: "focus:border-emerald-300 focus:ring-emerald-100",
        daySelected: "border-emerald-600 bg-emerald-600 text-white shadow-sm",
        dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
        tabActive: "bg-emerald-600 text-white",
        tabInactive: "bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
      }
    : {
        card: "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-sm",
        chip: "bg-emerald-600 text-white",
        chipInactive: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200",
        badge: "bg-emerald-600 text-white",
        border: "focus:border-emerald-300 focus:ring-emerald-100",
        daySelected: "border-emerald-600 bg-emerald-600 text-white shadow-sm",
        dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
        tabActive: "bg-emerald-600 text-white",
        tabInactive: "bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
      };
}

function plannerTypeTone(category: StudentPlannerCategory, active: boolean) {
  const theme = getCategoryTheme(category, active);
  if (active) return theme.card;
  return "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";
}

function toEntryType(category: StudentPlannerCategory): StudentWorkspaceScheduleEntryType {
  return category;
}

function mapEntryTypeToPlannerCategory(
  entryType: StudentWorkspaceScheduleEntryType
): StudentPlannerCategory {
  switch (entryType) {
    case "or":
    case "clinic":
    case "call":
    case "off":
    case "other":
      return entryType;
    default:
      return "other";
  }
}

export function StudentPrepWeekPanel({
  days,
  entries,
  initialActiveDate,
  onClose,
  onSaved,
}: StudentPrepWeekPanelProps) {
  const [category, setCategory] = useState<StudentPlannerCategory>("other");
  const [drafts, setDrafts] = useState<Record<string, StudentDayDraft>>({});
  const [activeDate, setActiveDate] = useState<string | null>(
    initialActiveDate ?? days[0]?.date ?? null
  );
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saveSummary, setSaveSummary] = useState<SaveSummary | null>(null);

  useEffect(() => {
    const nextDrafts: Record<string, StudentDayDraft> = {};

    for (const day of days) {
      const existingEntry =
        entries
          .filter((entry) => entry.occurs_on === day.date)
          .sort((left, right) => {
            if (left.is_all_day !== right.is_all_day) {
              return left.is_all_day ? -1 : 1;
            }
            return left.start_time.localeCompare(right.start_time);
          })[0] ?? null;

      nextDrafts[day.date] = existingEntry
        ? createDraftFromExistingEntry(existingEntry)
        : createDefaultDraft("other");
    }

    setDrafts(nextDrafts);
    setActiveDate((current) => current ?? initialActiveDate ?? days[0]?.date ?? null);
  }, [days, entries, initialActiveDate]);

  useEffect(() => {
    if (initialActiveDate) {
      setActiveDate(initialActiveDate);
    }
  }, [initialActiveDate]);

  const selectedDates = useMemo(
    () => days.map((day) => day.date).filter((date) => drafts[date]?.selected),
    [days, drafts]
  );
  const selectedDatesForCategory = useMemo(
    () =>
      days
        .map((day) => day.date)
        .filter((date) => drafts[date]?.selected && drafts[date]?.category === category),
    [days, drafts, category]
  );
  const countsByCategory = useMemo(() => {
    const counts = Object.fromEntries(
      STUDENT_PLANNER_CATEGORIES.map((item) => [item.key, 0])
    ) as Record<StudentPlannerCategory, number>;

    for (const day of days) {
      const draft = drafts[day.date];
      if (draft?.selected) counts[draft.category] += 1;
    }

    return counts;
  }, [days, drafts]);
  const changedDates = useMemo(
    () => days.map((day) => day.date).filter((date) => drafts[date]?.dirty),
    [days, drafts]
  );

  const selectedCount = selectedDates.length;
  const changedCount = changedDates.length;
  const categorySelectedCount = selectedDatesForCategory.length;
  const activeDraft = activeDate ? drafts[activeDate] : null;
  const activeCategory = activeDraft?.category ?? category;
  const activeTheme = getCategoryTheme(activeCategory, true);
  const categoryTheme = getCategoryTheme(category, true);

  const saveLabel = useMemo(() => {
    if (saving) return "Saving...";
    if (changedCount === 0) return "No changes to save";
    return `Save ${changedCount} change${changedCount === 1 ? "" : "s"}`;
  }, [saving, changedCount]);

  useEffect(() => {
    if (!saveSummary) return;
    const timer = window.setTimeout(() => {
      setSaveSummary(null);
      onClose();
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [saveSummary, onClose]);

  function ensureDraft(date: string, nextCategory = category) {
    return drafts[date] ?? createDefaultDraft(nextCategory);
  }

  function activateDay(date: string) {
    setLocalError(null);
    setSuccessMessage(null);
    setActiveDate(date);
    const existing = drafts[date];
    if (existing?.selected) {
      setCategory(existing.category);
    }
  }

  function assignDayToCurrentCategory(date: string) {
    setLocalError(null);
    setSuccessMessage(null);

    setDrafts((prev) => {
      const current = prev[date] ?? createDefaultDraft(category);
      const wasSelected = current.selected;
      const sameCategory = current.category === category;

      if (wasSelected && sameCategory) {
        return {
          ...prev,
          [date]: { ...current, selected: false, dirty: true },
        };
      }

      const shouldResetTitle =
        isDefaultPlannerTitle(current.title) ||
        current.title.trim() === defaultTitleForCategory(current.category);

      return {
        ...prev,
        [date]: {
          ...current,
          selected: true,
          category,
          title: shouldResetTitle ? defaultTitleForCategory(category) : current.title,
          dirty: true,
        },
      };
    });

    setActiveDate(date);
  }

  function updateActiveDraft<K extends keyof StudentDayDraft>(
    key: K,
    value: StudentDayDraft[K]
  ) {
    if (!activeDate) return;

    setDrafts((prev) => {
      const current = prev[activeDate] ?? createDefaultDraft(category);
      return {
        ...prev,
        [activeDate]: {
          ...current,
          selected: true,
          [key]: value,
          dirty: true,
        },
      };
    });
  }

  function selectCategory(next: StudentPlannerCategory) {
    setCategory(next);
    setLocalError(null);
    setSuccessMessage(null);

    const firstInCategory = days.find(
      (day) => drafts[day.date]?.selected && drafts[day.date]?.category === next
    );
    if (firstInCategory) setActiveDate(firstInCategory.date);
  }

  function jumpToCategoryDay(date: string) {
    const draft = drafts[date];
    if (draft?.category) setCategory(draft.category);
    setActiveDate(date);
  }

  function copyActiveToSelectedInCategory() {
    if (!activeDate || !activeDraft) return;

    setDrafts((prev) => {
      const next = { ...prev };
      for (const date of selectedDatesForCategory) {
        if (date === activeDate) continue;

        const current = next[date] ?? createDefaultDraft(activeDraft.category);
        next[date] = {
          ...current,
          selected: true,
          category: activeDraft.category,
          title: activeDraft.title,
          isAllDay: activeDraft.isAllDay,
          startTime: activeDraft.startTime,
          endTime: activeDraft.endTime,
          location: activeDraft.location,
          todayFocus: activeDraft.todayFocus,
          casesToReview: activeDraft.casesToReview,
          preparationWorkflow: activeDraft.preparationWorkflow,
          resources: activeDraft.resources,
          notes: activeDraft.notes,
          tomorrowPrep: activeDraft.tomorrowPrep,
          brobotAction: activeDraft.brobotAction,
          dirty: true,
        };
      }
      return next;
    });

    setSuccessMessage(
      `Copied this ${defaultTitleForCategory(activeDraft.category)} plan to the other matching days.`
    );
  }

  async function createEventForDate(date: string, draft: StudentDayDraft) {
    const response = await fetch("/api/student-workspace/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title.trim(),
        entry_type: toEntryType(draft.category),
        specific_date: date,
        weekday: null,
        is_all_day: draft.isAllDay,
        start_time: draft.startTime,
        end_time: draft.endTime,
        location: draft.location.trim() || null,
        notes: draft.notes.trim() || null,
        today_focus: draft.todayFocus.trim() || null,
        cases_to_review: draft.casesToReview.trim() || null,
        preparation_workflow: draft.preparationWorkflow.trim() || null,
        resources: draft.resources.trim() || null,
        tomorrow_prep: draft.tomorrowPrep.trim() || null,
        brobot_action: draft.brobotAction.trim() || null,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error ?? `Failed to create ${formatPlannerDate(date)}`);
    }
    return payload?.entry?.id ?? null;
  }

  async function updateEventForDate(date: string, draft: StudentDayDraft) {
    if (!draft.eventId) {
      throw new Error(`Missing event id for ${formatPlannerDate(date)}`);
    }

    const response = await fetch(`/api/student-workspace/schedule/${draft.eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title.trim(),
        entry_type: toEntryType(draft.category),
        specific_date: date,
        weekday: null,
        is_all_day: draft.isAllDay,
        start_time: draft.startTime,
        end_time: draft.endTime,
        location: draft.location.trim() || null,
        notes: draft.notes.trim() || null,
        today_focus: draft.todayFocus.trim() || null,
        cases_to_review: draft.casesToReview.trim() || null,
        preparation_workflow: draft.preparationWorkflow.trim() || null,
        resources: draft.resources.trim() || null,
        tomorrow_prep: draft.tomorrowPrep.trim() || null,
        brobot_action: draft.brobotAction.trim() || null,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error ?? `Failed to update ${formatPlannerDate(date)}`);
    }
    return payload;
  }

  async function deleteEventForDate(date: string, draft: StudentDayDraft) {
    if (!draft.eventId) return;
    const response = await fetch(`/api/student-workspace/schedule/${draft.eventId}`, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error ?? `Failed to remove ${formatPlannerDate(date)}`);
    }
    return payload;
  }

  async function handleSave() {
    try {
      setLocalError(null);
      setSuccessMessage(null);

      if (changedDates.length === 0) {
        setLocalError("No changes to save.");
        return;
      }

      for (const date of changedDates) {
        const draft = drafts[date];
        if (!draft) continue;

        if (draft.selected && !draft.title.trim()) {
          setLocalError(`Add a title for ${formatPlannerDate(date)}.`);
          return;
        }

        if (draft.selected && !draft.isAllDay) {
          if (!isValidTimeString(draft.startTime) || !isValidTimeString(draft.endTime)) {
            setLocalError(`Use valid times for ${formatPlannerDate(date)}.`);
            return;
          }
        }
      }

      setSaving(true);
      let added = 0;
      let updated = 0;
      let removed = 0;

      for (const date of changedDates) {
        const draft = drafts[date];
        if (!draft) continue;

        if (!draft.selected) {
          if (draft.loadedFromServer && draft.eventId) {
            await deleteEventForDate(date, draft);
            removed += 1;
          }
          continue;
        }

        if (draft.loadedFromServer && draft.eventId) {
          await updateEventForDate(date, draft);
          updated += 1;
        } else {
          const eventId = await createEventForDate(date, draft);
          if (eventId) {
            setDrafts((prev) => ({
              ...prev,
              [date]: {
                ...prev[date],
                eventId,
              },
            }));
          }
          added += 1;
        }
      }

      if (onSaved) {
        await onSaved();
      }

      setSaveSummary({ added, updated, removed });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to save planner changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800 ring-1 ring-sky-200">
                <CalendarDays className="h-3.5 w-3.5" />
                Preparation planner
              </div>
              <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-950">
                Plan your week like the student everyone wants back
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Build a preparation plan across the week, then sharpen each day with the details that help you crush tomorrow.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5 md:px-6 md:py-6">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                1. Choose type
              </p>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryTheme.badge}`}>
                {defaultTitleForCategory(category)} selected
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              {STUDENT_PLANNER_CATEGORIES.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => selectCategory(item.key)}
                    className={`flex items-center justify-between gap-3 rounded-[1.2rem] border px-4 py-4 text-left transition ${plannerTypeTone(
                      item.key,
                      category === item.key
                    )}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-bold">{item.label}</p>
                        <p className="text-xs opacity-75">{item.helper}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                      {countsByCategory[item.key]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                2. Tap days across the week
              </p>
              <p className="text-xs text-slate-500">
                Tap again on the same type to remove it
              </p>
            </div>

            <div className="md:hidden mb-4">
              <div className="flex flex-wrap gap-2">
                {days.map((day) => {
                  const draft = ensureDraft(day.date);
                  const isSelected = draft.selected;
                  const isActive = activeDate === day.date;
                  const theme = getCategoryTheme(draft.category, false);
                  let cls = isSelected
                    ? theme.daySelected
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
                  if (isActive && !isSelected) {
                    cls = "border-slate-900 bg-slate-100 text-slate-900 ring-2 ring-slate-900/10";
                  }

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => assignDayToCurrentCategory(day.date)}
                      onDoubleClick={() => activateDay(day.date)}
                      className={`min-h-[44px] min-w-[44px] rounded-2xl border px-3 py-2 text-sm font-semibold transition ${cls}`}
                    >
                      <div className="text-center">
                        <div className="text-[10px] opacity-70">{day.dayKey}</div>
                        <div className="mt-0.5 text-base font-bold tabular-nums leading-none">
                          {formatDayNumber(day.date)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <div className="grid min-w-[760px] grid-cols-7 gap-2.5 lg:min-w-[840px] lg:gap-3">
                {days.map((day) => {
                  const draft = ensureDraft(day.date);
                  const isSelected = draft.selected;
                  const isActive = activeDate === day.date;
                  const draftTheme = getCategoryTheme(draft.category, false);
                  const currentTheme = getCategoryTheme(category, true);

                  let cardClass = currentTheme.dayUnselected;
                  if (isSelected) cardClass = draftTheme.daySelected;
                  if (isActive && !isSelected) {
                    cardClass =
                      "border-slate-900 bg-slate-100 text-slate-900 ring-2 ring-slate-900/10";
                  }

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => assignDayToCurrentCategory(day.date)}
                      onDoubleClick={() => activateDay(day.date)}
                      className={`rounded-[1.25rem] border px-2.5 py-4 text-left transition sm:px-3 ${cardClass}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-75">
                            {day.dayKey}
                          </p>
                          <p className="mt-1 text-2xl font-bold leading-none">
                            {formatDayNumber(day.date)}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {isSelected ? <Check className="h-4 w-4 shrink-0 opacity-90" /> : null}
                          {draft.loadedFromServer ? (
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                              Existing
                            </span>
                          ) : draft.selected ? (
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                              New
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="min-h-[20px] text-xs font-semibold opacity-85">
                          {isSelected ? defaultTitleForCategory(draft.category) : "Not added"}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs opacity-75">
                          {isSelected
                            ? draft.todayFocus || draft.title
                            : `Add ${defaultTitleForCategory(category)}`}
                        </p>
                        {draft.dirty ? (
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-wide opacity-90">
                            Unsaved changes
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Single click assigns or removes the current type. Double click jumps into editing that day.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-5">
            <div className="border-b border-slate-200 pb-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    3. Edit selected days
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {STUDENT_PLANNER_CATEGORIES.map((item) => {
                      const theme = getCategoryTheme(item.key, true);
                      const active = category === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => selectCategory(item.key)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            active ? theme.tabActive : theme.tabInactive
                          }`}
                        >
                          {item.shortLabel} • {countsByCategory[item.key]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {categorySelectedCount > 1 && activeDraft?.category === category ? (
                    <button
                      type="button"
                      onClick={copyActiveToSelectedInCategory}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Copy to other {defaultTitleForCategory(category)} days
                    </button>
                  ) : null}

                  {activeDate && activeDraft?.selected ? (
                    <button
                      type="button"
                      onClick={() => assignDayToCurrentCategory(activeDate)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Remove this day
                    </button>
                  ) : null}
                </div>
              </div>

              {categorySelectedCount > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <div className="flex min-w-max items-center gap-2">
                    {selectedDatesForCategory.map((date) => {
                      const isActive = activeDate === date;
                      const draft = drafts[date];
                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => jumpToCategoryDay(date)}
                          className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                            isActive ? categoryTheme.chip : categoryTheme.chipInactive
                          }`}
                        >
                          {formatShortPlannerDate(date)}
                          {draft?.loadedFromServer ? " • existing" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  No {defaultTitleForCategory(category)} days selected yet.
                </div>
              )}
            </div>

            {activeDate && activeDraft ? (
              <>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <h4 className="text-lg font-bold text-slate-950">
                    {formatPlannerDate(activeDate)}
                  </h4>

                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${activeTheme.badge}`}>
                    {defaultTitleForCategory(activeDraft.category)}
                  </span>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {activeDraft.loadedFromServer ? "Existing plan" : "New plan"}
                  </span>

                  {activeDraft.dirty ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Unsaved
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <PencilLine className="h-4 w-4" />
                      Title
                    </span>
                    <input
                      value={activeDraft.title}
                      onChange={(e) => updateActiveDraft("title", e.target.value)}
                      className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${activeTheme.border}`}
                      placeholder={defaultTitleForCategory(activeDraft.category)}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <GraduationCap className="h-4 w-4" />
                      Today&apos;s focus
                    </span>
                    <input
                      value={activeDraft.todayFocus}
                      onChange={(e) => updateActiveDraft("todayFocus", e.target.value)}
                      className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${activeTheme.border}`}
                      placeholder="What matters most today?"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Clock3 className="h-4 w-4" />
                      BroBot launch
                    </span>
                    <select
                      value={activeDraft.brobotAction}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        updateActiveDraft(
                          "brobotAction",
                          STUDENT_WORKSPACE_BROBOT_ACTIONS.includes(
                            nextValue as StudentWorkspaceBrobotAction
                          )
                            ? (nextValue as StudentWorkspaceBrobotAction)
                            : ""
                        );
                      }}
                      className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${activeTheme.border}`}
                    >
                      <option value="">No action yet</option>
                      {STUDENT_WORKSPACE_BROBOT_ACTIONS.map((action) => (
                        <option key={action} value={action}>
                          {action}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <GraduationCap className="h-4 w-4" />
                      Cases to review
                    </span>
                    <textarea
                      value={activeDraft.casesToReview}
                      onChange={(e) => updateActiveDraft("casesToReview", e.target.value)}
                      rows={3}
                      className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${activeTheme.border}`}
                      placeholder="Cases, anatomy, or decision points to review before tomorrow."
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <NotebookPen className="h-4 w-4" />
                      Preparation workflow
                    </span>
                    <textarea
                      value={activeDraft.preparationWorkflow}
                      onChange={(e) => updateActiveDraft("preparationWorkflow", e.target.value)}
                      rows={3}
                      className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${activeTheme.border}`}
                      placeholder="What is the practical prep sequence for this day?"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <CalendarDays className="h-4 w-4" />
                      Resources
                    </span>
                    <textarea
                      value={activeDraft.resources}
                      onChange={(e) => updateActiveDraft("resources", e.target.value)}
                      rows={3}
                      className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${activeTheme.border}`}
                      placeholder="Readings, videos, pearls, notes, or links to revisit."
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <MoonStar className="h-4 w-4" />
                      Tomorrow prep
                    </span>
                    <textarea
                      value={activeDraft.tomorrowPrep}
                      onChange={(e) => updateActiveDraft("tomorrowPrep", e.target.value)}
                      rows={3}
                      className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${activeTheme.border}`}
                      placeholder="What needs to be ready before you walk in tomorrow?"
                    />
                  </label>
                </div>

                <label className="mt-4 block">
                  <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <PencilLine className="h-4 w-4" />
                    Notes
                  </span>
                  <textarea
                    value={activeDraft.notes}
                    onChange={(e) => updateActiveDraft("notes", e.target.value)}
                    rows={3}
                    className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${activeTheme.border}`}
                    placeholder="Resident expectations, reminders, follow-up tasks, or quick reflections."
                  />
                </label>
              </>
            ) : (
              <div className="mt-5 rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Tap a day above to start planning.
              </div>
            )}
          </div>

          {localError ? (
            <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {localError}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              {changedCount === 0
                ? `${selectedCount} selected day${selectedCount === 1 ? "" : "s"}, no unsaved changes.`
                : `${changedCount} unsaved change${changedCount === 1 ? "" : "s"} ready to save.`}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || changedCount === 0}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4" />
                )}
                {saveLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      {saveSummary ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="w-full max-w-md rounded-[1.5rem] border border-emerald-200 bg-white p-6 shadow-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-700" />
            </div>
            <h4 className="mt-4 text-center text-xl font-bold text-slate-950">
              Week updated
            </h4>
            <p className="mt-2 text-center text-sm text-slate-500">
              Your preparation plan was saved successfully.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-[1rem] bg-emerald-50 px-3 py-3">
                <p className="text-lg font-bold text-emerald-700">{saveSummary.added}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Added
                </p>
              </div>
              <div className="rounded-[1rem] bg-sky-50 px-3 py-3">
                <p className="text-lg font-bold text-sky-700">{saveSummary.updated}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Updated
                </p>
              </div>
              <div className="rounded-[1rem] bg-rose-50 px-3 py-3">
                <p className="text-lg font-bold text-rose-700">{saveSummary.removed}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                  Removed
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
