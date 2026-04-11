"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BriefcaseMedical,
  CalendarPlus2,
  Check,
  Clock3,
  Loader2,
  MapPin,
  PencilLine,
  Plus,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";

export type PlannerCategory = "or" | "clinic" | "custom";

export type PlannerDay = {
  date: string;
  dayKey: string;
};

type WeekPlannerPanelProps = {
  days: PlannerDay[];
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
};

type ExistingScheduleEvent = {
  id: string;
  title: string;
  category: PlannerCategory;
  event_date: string;
  is_all_day: boolean | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  attending: string | null;
  description: string | null;
};

type DayDraft = {
  eventId: string | null;
  selected: boolean;
  category: PlannerCategory;
  title: string;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  attending: string;
  description: string;
  loadedFromServer: boolean;
  dirty: boolean;
};

type SaveSummary = {
  added: number;
  updated: number;
  removed: number;
};

function defaultTitleForCategory(category: PlannerCategory) {
  if (category === "or") return "OR";
  if (category === "clinic") return "Clinic";
  return "Custom";
}

function isDefaultPlannerTitle(value: string) {
  return ["OR", "Clinic", "Custom"].includes(value.trim());
}

function isValidTimeString(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function formatPlannerDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatShortPlannerDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDayNumber(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
  });
}

function createDefaultDraft(category: PlannerCategory): DayDraft {
  return {
    eventId: null,
    selected: false,
    category,
    title: defaultTitleForCategory(category),
    isAllDay: true,
    startTime: "07:00",
    endTime: "17:00",
    location: "",
    attending: "",
    description: "",
    loadedFromServer: false,
    dirty: false,
  };
}

function createDraftFromExistingEvent(event: ExistingScheduleEvent): DayDraft {
  return {
    eventId: event.id,
    selected: true,
    category: event.category,
    title: event.title ?? defaultTitleForCategory(event.category),
    isAllDay: event.is_all_day ?? true,
    startTime: event.start_time ?? "07:00",
    endTime: event.end_time ?? "17:00",
    location: event.location ?? "",
    attending: event.attending ?? "",
    description: event.description ?? "",
    loadedFromServer: true,
    dirty: false,
  };
}

function getCategoryTheme(category: PlannerCategory, active = false) {
  if (category === "or") {
    return active
      ? {
          card: "border-slate-900 bg-slate-900 text-white shadow-md",
          subtle: "bg-slate-100 text-slate-700",
          chip: "bg-slate-900 text-white",
          chipInactive: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
          pill: "bg-white/15 text-white",
          button: "bg-white text-slate-900",
          badge: "bg-slate-900 text-white",
          border: "focus:border-slate-400 focus:ring-slate-100",
          soft: "border-slate-200 bg-slate-50 text-slate-900",
          daySelected: "border-slate-900 bg-slate-900 text-white shadow-sm",
          dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          tabActive: "bg-slate-900 text-white",
          tabInactive: "bg-slate-100 text-slate-700 hover:bg-slate-200",
        }
      : {
          card: "border-slate-300 bg-slate-50 text-slate-950 shadow-sm",
          subtle: "bg-slate-100 text-slate-700",
          chip: "bg-slate-900 text-white",
          chipInactive: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
          pill: "bg-slate-100 text-slate-700",
          button: "bg-slate-900 text-white",
          badge: "bg-slate-900 text-white",
          border: "focus:border-slate-400 focus:ring-slate-100",
          soft: "border-slate-200 bg-slate-50 text-slate-900",
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
          subtle: "bg-sky-100 text-sky-900",
          chip: "bg-sky-600 text-white",
          chipInactive: "bg-sky-50 text-sky-900 ring-1 ring-sky-200",
          pill: "bg-white/15 text-white",
          button: "bg-white text-sky-900",
          badge: "bg-sky-600 text-white",
          border: "focus:border-sky-300 focus:ring-sky-100",
          soft: "border-sky-200 bg-sky-50 text-sky-900",
          daySelected: "border-sky-600 bg-sky-600 text-white shadow-sm",
          dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          tabActive: "bg-sky-600 text-white",
          tabInactive: "bg-sky-50 text-sky-900 hover:bg-sky-100",
        }
      : {
          card: "border-sky-200 bg-sky-50 text-sky-950 shadow-sm",
          subtle: "bg-sky-100 text-sky-900",
          chip: "bg-sky-600 text-white",
          chipInactive: "bg-sky-50 text-sky-900 ring-1 ring-sky-200",
          pill: "bg-sky-100 text-sky-900",
          button: "bg-sky-600 text-white",
          badge: "bg-sky-600 text-white",
          border: "focus:border-sky-300 focus:ring-sky-100",
          soft: "border-sky-200 bg-sky-50 text-sky-900",
          daySelected: "border-sky-600 bg-sky-600 text-white shadow-sm",
          dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          tabActive: "bg-sky-600 text-white",
          tabInactive: "bg-sky-50 text-sky-900 hover:bg-sky-100",
        };
  }

  return active
    ? {
        card: "border-violet-700 bg-violet-700 text-white shadow-md",
        subtle: "bg-violet-100 text-violet-900",
        chip: "bg-violet-700 text-white",
        chipInactive: "bg-violet-50 text-violet-900 ring-1 ring-violet-200",
        pill: "bg-white/15 text-white",
        button: "bg-white text-violet-900",
        badge: "bg-violet-700 text-white",
        border: "focus:border-violet-400 focus:ring-violet-100",
        soft: "border-violet-200 bg-violet-50 text-violet-900",
        daySelected: "border-violet-700 bg-violet-700 text-white shadow-sm",
        dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
        tabActive: "bg-violet-700 text-white",
        tabInactive: "bg-violet-50 text-violet-900 hover:bg-violet-100",
      }
    : {
        card: "border-violet-200 bg-violet-50 text-violet-950 shadow-sm",
        subtle: "bg-violet-100 text-violet-900",
        chip: "bg-violet-700 text-white",
        chipInactive: "bg-violet-50 text-violet-900 ring-1 ring-violet-200",
        pill: "bg-violet-100 text-violet-900",
        button: "bg-violet-700 text-white",
        badge: "bg-violet-700 text-white",
        border: "focus:border-violet-400 focus:ring-violet-100",
        soft: "border-violet-200 bg-violet-50 text-violet-900",
        daySelected: "border-violet-700 bg-violet-700 text-white shadow-sm",
        dayUnselected: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
        tabActive: "bg-violet-700 text-white",
        tabInactive: "bg-violet-50 text-violet-900 hover:bg-violet-100",
      };
}

function plannerTypeTone(category: PlannerCategory, active: boolean) {
  const theme = getCategoryTheme(category, active);
  if (active) return theme.card;
  return "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";
}

export function PlanWeekButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
        isOpen
          ? "bg-slate-950 text-white shadow-sm"
          : "border border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-300 hover:bg-sky-100"
      }`}
    >
      {isOpen ? <X className="h-4 w-4" /> : <CalendarPlus2 className="h-4 w-4" />}
      {isOpen ? "Close Planner" : "Plan Week"}
    </button>
  );
}

export function WeekPlannerPanel({
  days,
  onClose,
  onCreated,
}: WeekPlannerPanelProps) {
  const [category, setCategory] = useState<PlannerCategory>("or");
  const [drafts, setDrafts] = useState<Record<string, DayDraft>>({});
  const [activeDate, setActiveDate] = useState<string | null>(days[0]?.date ?? null);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saveSummary, setSaveSummary] = useState<SaveSummary | null>(null);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const day of days) {
        if (!next[day.date]) {
          next[day.date] = createDefaultDraft(category);
        }
      }
      return next;
    });

    if (!activeDate && days[0]?.date) {
      setActiveDate(days[0].date);
    }
  }, [days, category, activeDate]);

  useEffect(() => {
    async function loadExistingWeekEvents() {
      if (days.length === 0) return;

      const weekStart = days[0]?.date;
      const weekEnd = days[days.length - 1]?.date;
      if (!weekStart || !weekEnd) return;

      try {
        setLoadingExisting(true);
        setLocalError(null);

        const response = await fetch(
          `/api/me/schedule-events/week?start=${weekStart}&end=${weekEnd}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load existing schedule events");
        }

        const events: ExistingScheduleEvent[] = Array.isArray(payload?.events)
          ? payload.events
          : [];

        setDrafts((prev) => {
          const next: Record<string, DayDraft> = {};

          for (const day of days) {
            next[day.date] = prev[day.date] ?? createDefaultDraft(category);
          }

          for (const event of events) {
            if (!event.event_date) continue;
            if (!next[event.event_date]) continue;
            next[event.event_date] = createDraftFromExistingEvent(event);
          }

          return next;
        });

        const firstLoaded = events[0]?.event_date;
        if (firstLoaded) {
          setActiveDate((current) => current ?? firstLoaded);
        }
      } catch (error) {
        setLocalError(
          error instanceof Error ? error.message : "Failed to load existing schedule events"
        );
      } finally {
        setLoadingExisting(false);
      }
    }

    loadExistingWeekEvents();
  }, [days]);

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

  const countsByCategory = useMemo(
    () => ({
      or: days.filter((day) => drafts[day.date]?.selected && drafts[day.date]?.category === "or")
        .length,
      clinic: days.filter(
        (day) => drafts[day.date]?.selected && drafts[day.date]?.category === "clinic"
      ).length,
      custom: days.filter(
        (day) => drafts[day.date]?.selected && drafts[day.date]?.category === "custom"
      ).length,
    }),
    [days, drafts]
  );

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
          [date]: {
            ...current,
            selected: false,
            dirty: true,
          },
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

  function updateActiveDraft<K extends keyof DayDraft>(key: K, value: DayDraft[K]) {
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

  function changeActiveDraftCategory(nextCategory: PlannerCategory) {
    if (!activeDate) {
      setCategory(nextCategory);
      return;
    }

    setCategory(nextCategory);
    setLocalError(null);
    setSuccessMessage(null);

    setDrafts((prev) => {
      const current = prev[activeDate] ?? createDefaultDraft(nextCategory);

      const shouldResetTitle =
        isDefaultPlannerTitle(current.title) ||
        current.title.trim() === defaultTitleForCategory(current.category);

      return {
        ...prev,
        [activeDate]: {
          ...current,
          selected: true,
          category: nextCategory,
          title: shouldResetTitle ? defaultTitleForCategory(nextCategory) : current.title,
          dirty: true,
        },
      };
    });
  }

  function selectCategory(next: PlannerCategory) {
    const shouldApplyToActive =
      !!activeDate &&
      !!drafts[activeDate] &&
      drafts[activeDate].selected &&
      activeDate === activeDate;

    if (shouldApplyToActive) {
      changeActiveDraftCategory(next);
    } else {
      setCategory(next);
      setLocalError(null);
      setSuccessMessage(null);
    }

    const firstInCategory = days.find(
      (day) => drafts[day.date]?.selected && drafts[day.date]?.category === next
    );

    if (firstInCategory) {
      setActiveDate(firstInCategory.date);
    }
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
          attending: activeDraft.attending,
          description: activeDraft.description,
          dirty: true,
        };
      }

      return next;
    });

    setSuccessMessage(
      `Copied this ${activeDraft.category.toUpperCase()} day to the other ${activeDraft.category.toUpperCase()} days.`
    );
  }

  async function createEventForDate(date: string, draft: DayDraft) {
    const response = await fetch("/api/me/schedule-events", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: draft.title.trim(),
        category: draft.category,
        dates: [date],
        isAllDay: draft.isAllDay,
        startTime: draft.isAllDay ? null : draft.startTime,
        endTime: draft.isAllDay ? null : draft.endTime,
        location: draft.location.trim() || null,
        attending: draft.attending.trim() || null,
        description: draft.description.trim() || null,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? `Failed to create ${formatPlannerDate(date)}`);
    }

    return payload;
  }

  async function updateEventForDate(date: string, draft: DayDraft) {
    if (!draft.eventId) {
      throw new Error(`Missing event id for ${formatPlannerDate(date)}`);
    }

    const response = await fetch(`/api/me/schedule-events/${draft.eventId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: draft.title.trim(),
        category: draft.category,
        eventDate: date,
        isAllDay: draft.isAllDay,
        startTime: draft.isAllDay ? null : draft.startTime,
        endTime: draft.isAllDay ? null : draft.endTime,
        location: draft.location.trim() || null,
        attending: draft.attending.trim() || null,
        description: draft.description.trim() || null,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? `Failed to update ${formatPlannerDate(date)}`);
    }

    return payload;
  }

  async function deleteEventForDate(date: string, draft: DayDraft) {
    if (!draft.eventId) return;

    const response = await fetch(`/api/me/schedule-events/${draft.eventId}`, {
      method: "DELETE",
      credentials: "include",
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
          await createEventForDate(date, draft);
          added += 1;
        }
      }

      setDrafts((prev) => {
        const next = { ...prev };

        for (const date of Object.keys(next)) {
          const draft = next[date];
          if (!draft) continue;

          if (!draft.selected) {
            next[date] = createDefaultDraft(category);
            continue;
          }

          next[date] = {
            ...draft,
            dirty: false,
            loadedFromServer: true,
          };
        }

        return next;
      });

      if (onCreated) {
        await onCreated();
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
                <Plus className="h-3.5 w-3.5" />
                Quick planner
              </div>

              <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-950">
                Plan and edit your week fast
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Existing events load automatically, so you can update what is already there instead of rebuilding the week from scratch.
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
          {loadingExisting ? (
            <div className="flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your existing week events...
            </div>
          ) : null}

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                1. Choose type
              </p>

              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryTheme.badge}`}>
                {category.toUpperCase()} selected
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => selectCategory("or")}
                className={`flex items-center justify-between gap-3 rounded-[1.2rem] border px-4 py-4 text-left transition ${plannerTypeTone("or", category === "or")}`}
              >
                <div className="flex items-center gap-3">
                  <BriefcaseMedical className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-bold">OR</p>
                    <p className="text-xs opacity-75">Dark block days</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                  {countsByCategory.or}
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectCategory("clinic")}
                className={`flex items-center justify-between gap-3 rounded-[1.2rem] border px-4 py-4 text-left transition ${plannerTypeTone("clinic", category === "clinic")}`}
              >
                <div className="flex items-center gap-3">
                  <Stethoscope className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-bold">Clinic</p>
                    <p className="text-xs opacity-75">Blue outpatient days</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                  {countsByCategory.clinic}
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectCategory("custom")}
                className={`flex items-center justify-between gap-3 rounded-[1.2rem] border px-4 py-4 text-left transition ${plannerTypeTone("custom", category === "custom")}`}
              >
                <div className="flex items-center gap-3">
                  <PencilLine className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-bold">Custom</p>
                    <p className="text-xs opacity-75">Purple catch-all</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                  {countsByCategory.custom}
                </span>
              </button>
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

            <div className="overflow-x-auto">
              <div className="grid min-w-[840px] grid-cols-7 gap-3">
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
                      className={`rounded-[1.25rem] border px-3 py-4 text-left transition ${cardClass}`}
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
                          {isSelected ? draft.category.toUpperCase() : "Not added"}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs opacity-75">
                          {isSelected ? draft.title : `Add ${category.toUpperCase()}`}
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
              Single click assigns or removes the current category. Double click jumps into editing that day.
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
                    {(["or", "clinic", "custom"] as PlannerCategory[]).map((item) => {
                      const theme = getCategoryTheme(item, true);
                      const active = category === item;
                      const count =
                        item === "or"
                          ? countsByCategory.or
                          : item === "clinic"
                          ? countsByCategory.clinic
                          : countsByCategory.custom;

                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => selectCategory(item)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            active ? theme.tabActive : theme.tabInactive
                          }`}
                        >
                          {item.toUpperCase()} • {count}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    Switching a selected day from one type to another will update its default title too.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {categorySelectedCount > 1 && activeDraft?.category === category ? (
                    <button
                      type="button"
                      onClick={copyActiveToSelectedInCategory}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Copy to other {category.toUpperCase()} days
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
                  No {category.toUpperCase()} days selected yet.
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
                    {activeDraft.category.toUpperCase()}
                  </span>

                  {activeDraft.loadedFromServer ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Existing event
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      New event
                    </span>
                  )}

                  {activeDraft.dirty ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Unsaved
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                      <UserRound className="h-4 w-4" />
                      Attending
                    </span>
                    <input
                      value={activeDraft.attending}
                      onChange={(e) => updateActiveDraft("attending", e.target.value)}
                      className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${activeTheme.border}`}
                      placeholder="Dr. Smith"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <MapPin className="h-4 w-4" />
                      Location
                    </span>
                    <input
                      value={activeDraft.location}
                      onChange={(e) => updateActiveDraft("location", e.target.value)}
                      className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${activeTheme.border}`}
                      placeholder="Norfolk General"
                    />
                  </label>

                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Clock3 className="h-4 w-4" />
                          All day
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Toggle off to enter times
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateActiveDraft("isAllDay", !activeDraft.isAllDay)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                          activeDraft.isAllDay ? categoryTheme.chip.split(" ")[0] : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                            activeDraft.isAllDay ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {!activeDraft.isAllDay ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Clock3 className="h-4 w-4" />
                        Start time
                      </span>
                      <input
                        value={activeDraft.startTime}
                        onChange={(e) => updateActiveDraft("startTime", e.target.value)}
                        className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${activeTheme.border}`}
                        placeholder="07:00"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Clock3 className="h-4 w-4" />
                        End time
                      </span>
                      <input
                        value={activeDraft.endTime}
                        onChange={(e) => updateActiveDraft("endTime", e.target.value)}
                        className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${activeTheme.border}`}
                        placeholder="17:00"
                      />
                    </label>
                  </div>
                ) : null}

                <label className="mt-4 block">
                  <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <PencilLine className="h-4 w-4" />
                    Notes
                  </span>
                  <textarea
                    value={activeDraft.description}
                    onChange={(e) => updateActiveDraft("description", e.target.value)}
                    rows={3}
                    className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${activeTheme.border}`}
                    placeholder="Optional details, room, service notes, etc."
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
                  <CalendarPlus2 className="h-4 w-4" />
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
              Your planner changes were saved successfully.
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

            <p className="mt-4 text-center text-xs text-slate-400">
              Closing automatically…
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}