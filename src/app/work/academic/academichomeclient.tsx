"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Loader2,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import AcademicWeekView from "@/components/workspace/academic/academicweekview";
import AcademicListView from "@/components/workspace/academic/academiclistview";
import AcademicEventDetailDrawer from "@/components/workspace/academic/academiceventdetail";
import { useWorkspaceInfo } from "@/lib/workspace/use-workspace-info";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";

type ViewMode = "week" | "list";

type MonthEvent = {
  id: string;
  title: string;
  description?: string | null;
  start_datetime: string;
  end_datetime: string;
  is_required: boolean;
  event_type?: {
    id: string;
    name: string;
    color?: string | null;
    icon?: string | null;
  } | null;
  location?: {
    id: string;
    name: string;
    room?: string | null;
    building?: string | null;
    is_virtual?: boolean | null;
    virtual_url?: string | null;
  } | null;
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfMonth(date: Date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date: Date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getMonthGridDays(date: Date) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = addDays(startOfWeek(monthEnd), 6);

  const days: Date[] = [];
  let current = new Date(gridStart);

  while (current <= gridEnd) {
    days.push(new Date(current));
    current = addDays(current, 1);
  }

  return days;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatDateRange(start: Date, end: Date) {
  return `${start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} – ${end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatTime(value?: string | null) {
  if (!value) return "Time TBD";

  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMonthEventTime(event: MonthEvent) {
  return `${formatTime(event.start_datetime)} – ${formatTime(
    event.end_datetime
  )}`;
}

function formatMonthEventDate(event: MonthEvent) {
  return new Date(event.start_datetime).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getLocationText(event: MonthEvent) {
  if (!event.location) return null;

  if (event.location.is_virtual) {
    return event.location.virtual_url ?? "Virtual";
  }

  return [event.location.name, event.location.room, event.location.building]
    .filter(Boolean)
    .join(" · ");
}

export default function AcademicCalendarHomePage() {
  const router = useRouter();
  const { programId } = useWorkspaceInfo();
  const { permissions } = useWorkspacePermissions();
  const canCreateAcademicEvents = permissions?.canCreateAcademicEvents ?? false;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [academicRefreshKey, setAcademicRefreshKey] = useState(0);
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [eventTypeId] = useState<string | null>(null);

  const [monthPreviewOpen, setMonthPreviewOpen] = useState(false);
  const [monthEvents, setMonthEvents] = useState<MonthEvent[]>([]);
  const [monthEventsLoading, setMonthEventsLoading] = useState(false);
  const [monthEventsError, setMonthEventsError] = useState<string | null>(null);
  const [selectedMonthEvent, setSelectedMonthEvent] =
    useState<MonthEvent | null>(null);

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const monthDays = useMemo(
    () => getMonthGridDays(selectedDate),
    [selectedDate]
  );

  const monthLabel = useMemo(() => {
    return selectedDate.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }, [selectedDate]);

  const [nextEvent, setNextEvent] = useState<MonthEvent | null>(null);
const [nextEventLoading, setNextEventLoading] = useState(false);

const monthStats = useMemo(() => {
  const requiredCount = monthEvents.filter((event) => event.is_required).length;

  return {
    total: monthEvents.length,
    required: requiredCount,
    optional: monthEvents.length - requiredCount,
  };
}, [monthEvents]);

  function goToPreviousWeek() {
    setSelectedDate((current) => addDays(current, -7));
  }

  function goToNextWeek() {
    setSelectedDate((current) => addDays(current, 7));
  }

  function openEventFromMonth(event: MonthEvent) {
    setSelectedMonthEvent(event);
  }

  function jumpToDay(day: Date) {
    setSelectedDate(day);
    setViewMode("week");
    setMonthPreviewOpen(false);
    setSelectedMonthEvent(null);
  }

  function openFullEventDetail(eventId: string) {
    setSelectedEventId(eventId);
    setMonthPreviewOpen(false);
    setSelectedMonthEvent(null);
  }

  useEffect(() => {
  if (!programId) {
    setNextEvent(null);
    setNextEventLoading(false);
    return;
  }

  const activeProgramId = programId;
  let cancelled = false;

  async function loadNextEvent() {
    setNextEventLoading(true);

    const now = new Date();
    const end = addDays(now, 120);

    const params = new URLSearchParams({
      programId: activeProgramId,
      startDate: now.toISOString(),
      endDate: end.toISOString(),
    });

    try {
      const response = await fetch(
        `/api/program/academic-calendar/events?${params.toString()}`,
        { cache: "no-store" }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error ?? "Failed to load next event");
      }

      const upcomingEvents = (json.data ?? []) as MonthEvent[];

      const sorted = upcomingEvents
        .filter((event) => new Date(event.start_datetime) >= now)
        .sort(
          (a, b) =>
            new Date(a.start_datetime).getTime() -
            new Date(b.start_datetime).getTime()
        );

      if (!cancelled) {
        setNextEvent(sorted[0] ?? null);
      }
    } catch {
      if (!cancelled) {
        setNextEvent(null);
      }
    } finally {
      if (!cancelled) {
        setNextEventLoading(false);
      }
    }
  }

  loadNextEvent();

  return () => {
    cancelled = true;
  };
}, [programId, academicRefreshKey]);

  useEffect(() => {
    if (!monthPreviewOpen || !programId) return;

    let cancelled = false;

    async function loadMonthEvents() {
      setMonthEventsLoading(true);
      setMonthEventsError(null);

      const monthStart = startOfMonth(selectedDate);
      const monthEnd = addDays(endOfMonth(selectedDate), 1);

      const activeProgramId = programId;

if (!activeProgramId) return;

const params = new URLSearchParams({
  programId: activeProgramId,
  startDate: monthStart.toISOString(),
  endDate: monthEnd.toISOString(),
});

      if (requiredOnly) params.set("requiredOnly", "true");
      if (eventTypeId) params.set("eventTypeId", eventTypeId);

      try {
        const response = await fetch(
          `/api/program/academic-calendar/events?${params.toString()}`,
          { cache: "no-store" }
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.error ?? "Failed to load month events");
        }

        if (!cancelled) {
          setMonthEvents(json.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setMonthEvents([]);
          setMonthEventsError(
            err instanceof Error ? err.message : "Failed to load month events"
          );
        }
      } finally {
        if (!cancelled) setMonthEventsLoading(false);
      }
    }

    loadMonthEvents();

    return () => {
      cancelled = true;
    };
  }, [monthPreviewOpen, programId, selectedDate, requiredOnly, eventTypeId]);

  return (
    <main className="min-h-screen overflow-x-clip bg-slate-950 text-slate-900">
      <section className="relative overflow-hidden px-4 pb-4 pt-5 sm:px-5 md:px-6 md:pb-5 md:pt-7 xl:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.08),transparent_16%)]" />

        <div className="relative mx-auto max-w-[1440px] 2xl:max-w-[1520px]">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-5 md:p-6">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
                  <GraduationCap className="h-3.5 w-3.5" />
                  SnapOrtho
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                  Academics
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  A clean place to track conferences, journal clubs, grand
                  rounds, assignments, and educational events.
                </p>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.8fr)] 2xl:min-w-[720px]">
  <button
    type="button"
    onClick={() => nextEvent && setSelectedEventId(nextEvent.id)}
    disabled={!nextEvent}
    className="rounded-[1.25rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:shadow-sm"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Next Event
        </p>

        {nextEventLoading ? (
          <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading next event...
          </div>
        ) : nextEvent ? (
          <>
            <p className="mt-2 truncate text-xl font-black tracking-tight text-slate-950 md:text-2xl">
              {nextEvent.title}
            </p>

            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatMonthEventDate(nextEvent)}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                <Clock className="h-3.5 w-3.5" />
                {formatMonthEventTime(nextEvent)}
              </span>
            </div>

            {getLocationText(nextEvent) && (
              <p className="mt-2 line-clamp-1 text-xs font-semibold text-slate-500">
                {getLocationText(nextEvent)}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-2 text-xl font-black tracking-tight text-slate-950 md:text-2xl">
              Nothing scheduled
            </p>
            <p className="mt-1.5 text-xs text-slate-600 md:text-sm">
              No upcoming academic events found.
            </p>
          </>
        )}
      </div>

      {nextEvent?.is_required && (
        <span className="shrink-0 rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
          Required
        </span>
      )}
    </div>
  </button>

  <button
    type="button"
    onClick={() => router.push("/work/academic/assignments")}
    className="rounded-[1.25rem] border border-sky-200 bg-sky-50 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-100 hover:shadow-md"
  >
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">
      My Assignments
    </p>

    <p className="mt-2 text-xl font-black tracking-tight text-sky-950 md:text-2xl">
      View Tasks
    </p>

    <p className="mt-1.5 text-xs font-semibold text-sky-800 md:text-sm">
      See your upcoming readings, presentations, and academic duties.
    </p>
  </button>
</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-6 sm:px-5 md:px-6 md:pb-8 xl:px-8">
        <div className="mx-auto max-w-[1440px] space-y-4 2xl:max-w-[1520px]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-3.5 shadow-xl sm:p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={goToPreviousWeek}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={goToNextWeek}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Academic Calendar
                  </p>
                  <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                    This week
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 md:text-sm">
                    {formatDateRange(weekStart, weekEnd)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonthEvent(null);
                    setMonthPreviewOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <CalendarDays className="h-4 w-4" />
                  Month Preview
                </button>

                <button
                  type="button"
                  onClick={() => setRequiredOnly((current) => !current)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    requiredOnly
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Required only
                </button>

                <div className="rounded-full border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("week")}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      viewMode === "week"
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Week
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      viewMode === "list"
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    List
                  </button>
                </div>

                {canCreateAcademicEvents ? (
                  <button
                    type="button"
                    onClick={() => router.push("/work/academic/add")}
                    className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-950 transition hover:border-sky-300 hover:bg-sky-100"
                  >
                    <Plus className="h-4 w-4" />
                    Manage Academic Calendar
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                Lectures and conferences
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <BookOpen className="h-3.5 w-3.5" />
                Journal club articles
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Required education marked clearly
              </div>
            </div>

            {viewMode === "week" ? (
              <AcademicWeekView
                key={`week-${academicRefreshKey}`}
                weekStart={weekStart}
                weekEnd={weekEnd}
                requiredOnly={requiredOnly}
                eventTypeId={eventTypeId}
                onOpenEvent={setSelectedEventId}
              />
            ) : (
              <AcademicListView
                key={`list-${academicRefreshKey}`}
                selectedDate={selectedDate}
                requiredOnly={requiredOnly}
                eventTypeId={eventTypeId}
                onOpenEvent={setSelectedEventId}
              />
            )}
          </div>
        </div>
      </section>

      <AcademicEventDetailDrawer
        eventId={selectedEventId}
        open={!!selectedEventId}
        onClose={() => setSelectedEventId(null)}
        onDeleted={() => setAcademicRefreshKey((current) => current + 1)}
      />

      {monthPreviewOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close month preview"
            onClick={() => {
              setMonthPreviewOpen(false);
              setSelectedMonthEvent(null);
            }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <div className="absolute left-1/2 top-1/2 flex max-h-[92vh] w-[min(1320px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl xl:w-[min(1360px,calc(100vw-2rem))]">
            <div className="border-b border-slate-200 p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Month Preview
                  </div>

                  <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                    {monthLabel}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Review the month, click an event for details, or click a day
                    to jump to that week.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMonthPreviewOpen(false);
                    setSelectedMonthEvent(null);
                  }}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Total Events
                  </div>
                  <div className="mt-1 text-2xl font-black text-slate-950">
                    {monthStats.total}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Required
                  </div>
                  <div className="mt-1 text-2xl font-black text-slate-950">
                    {monthStats.required}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Optional
                  </div>
                  <div className="mt-1 text-2xl font-black text-slate-950">
                    {monthStats.optional}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-h-0 overflow-auto p-3 sm:p-4 md:p-5 xl:p-6">
                {monthEventsLoading ? (
                  <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-slate-50">
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading month events...
                    </div>
                  </div>
                ) : monthEventsError ? (
                  <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
                    {monthEventsError}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <div className="min-w-[920px] xl:min-w-0">
                        <div className="mb-3 grid grid-cols-7 gap-2 text-center text-[11px] font-black uppercase tracking-wide text-slate-400">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                            (day) => (
                              <div key={day}>{day}</div>
                            )
                          )}
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                          {monthDays.map((day) => {
                            const isSelected = isSameDay(day, selectedDate);
                            const isToday = isSameDay(day, new Date());
                            const inMonth = isSameMonth(day, selectedDate);
                            const dayEvents = monthEvents
                              .filter((event) => isSameDay(new Date(event.start_datetime), day))
                              .sort(
                                (a, b) =>
                                  new Date(a.start_datetime).getTime() -
                                  new Date(b.start_datetime).getTime()
                              );

                            return (
                              <div
                                key={day.toISOString()}
                                className={`min-h-[140px] rounded-2xl border p-2.5 text-left ${
                                  isSelected
                                    ? "border-slate-950 bg-slate-950 text-white"
                                    : isToday
                                    ? "border-sky-300 bg-sky-50 text-slate-950"
                                    : inMonth
                                    ? "border-slate-200 bg-white text-slate-950"
                                    : "border-slate-100 bg-slate-50 text-slate-300"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => jumpToDay(day)}
                                  className="flex w-full items-center justify-between gap-2 rounded-xl px-1 py-0.5 text-left hover:bg-black/5"
                                >
                                  <span className="text-sm font-black">
                                    {day.getDate()}
                                  </span>

                                  <div className="flex items-center gap-1">
                                    {dayEvents.length > 0 && (
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                          isSelected
                                            ? "bg-white/15 text-white"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {dayEvents.length}
                                      </span>
                                    )}

                                    {isToday && (
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                          isSelected
                                            ? "bg-white text-slate-950"
                                            : "bg-sky-200 text-sky-950"
                                        }`}
                                      >
                                        Today
                                      </span>
                                    )}
                                  </div>
                                </button>

                                <div className="mt-2 space-y-1.5">
                                  {dayEvents.length === 0 ? (
                                    <div
                                      className={`rounded-xl border border-dashed px-2 py-3 text-center text-[11px] font-semibold ${
                                        isSelected
                                          ? "border-white/15 text-slate-300"
                                          : "border-slate-200 text-slate-400"
                                      }`}
                                    >
                                      No events
                                    </div>
                                  ) : (
                                    dayEvents.slice(0, 4).map((event) => (
                                      <button
                                        key={event.id}
                                        type="button"
                                        onClick={(clickEvent) => {
                                          clickEvent.stopPropagation();
                                          openEventFromMonth(event);
                                        }}
                                        className={`w-full rounded-xl px-2 py-1.5 text-left transition hover:scale-[1.01] ${
                                          selectedMonthEvent?.id === event.id
                                            ? isSelected
                                              ? "bg-white text-slate-950"
                                              : "bg-slate-950 text-white"
                                            : isSelected
                                            ? "bg-white/15 text-white hover:bg-white/20"
                                            : event.is_required
                                            ? "bg-slate-950 text-white hover:bg-slate-800"
                                            : "bg-sky-50 text-sky-900 hover:bg-sky-100"
                                        }`}
                                      >
                                        <div className="truncate text-[11px] font-black">
                                          {event.title}
                                        </div>
                                        <div
                                          className={`mt-0.5 truncate text-[10px] font-semibold ${
                                            selectedMonthEvent?.id === event.id
                                              ? selectedMonthEvent?.id === event.id &&
                                                !isSelected
                                                ? "text-slate-200"
                                                : "text-slate-500"
                                              : isSelected || event.is_required
                                              ? "text-slate-200"
                                              : "text-sky-700"
                                          }`}
                                        >
                                          {formatTime(event.start_datetime)}
                                          {event.event_type?.name
                                            ? ` · ${event.event_type.name}`
                                            : ""}
                                        </div>
                                      </button>
                                    ))
                                  )}

                                  {dayEvents.length > 4 && (
                                    <button
                                      type="button"
                                      onClick={() => jumpToDay(day)}
                                      className={`w-full rounded-xl px-2 py-1 text-left text-[11px] font-black ${
                                        isSelected
                                          ? "bg-white/10 text-slate-200"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      +{dayEvents.length - 4} more
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-slate-50 p-4 xl:border-l xl:border-t-0 md:p-5 2xl:p-6">
                {!selectedMonthEvent ? (
                  <div className="flex h-full min-h-[320px] flex-col justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <CalendarDays className="h-5 w-5" />
                    </div>

                    <h3 className="mt-4 text-sm font-black text-slate-950">
                      Select an event
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Click any event in the month grid to preview the details
                      here.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
                            {selectedMonthEvent.event_type?.name ?? "Academic"}
                          </span>

                          {selectedMonthEvent.is_required && (
                            <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                              Required
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 text-xl font-black leading-tight text-slate-950">
                          {selectedMonthEvent.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedMonthEvent(null)}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                          <CalendarDays className="h-4 w-4" />
                          Date
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-950">
                          {formatMonthEventDate(selectedMonthEvent)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                          <Clock className="h-4 w-4" />
                          Time
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-950">
                          {formatMonthEventTime(selectedMonthEvent)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                          <MapPin className="h-4 w-4" />
                          Location
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-950">
                          {getLocationText(selectedMonthEvent) ??
                            "No location listed"}
                        </div>
                      </div>

                      {selectedMonthEvent.description && (
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Description
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                            {selectedMonthEvent.description}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={() => openFullEventDetail(selectedMonthEvent.id)}
                        className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
                      >
                        Open Full Details
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          jumpToDay(new Date(selectedMonthEvent.start_datetime))
                        }
                        className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
                      >
                        Jump to This Week
                      </button>
                    </div>
                  </div>
                )}
              </aside>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 md:p-5">
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(new Date());
                  setSelectedMonthEvent(null);
                }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Jump to Current Month
              </button>

              <button
                type="button"
                onClick={() => {
                  setMonthPreviewOpen(false);
                  setSelectedMonthEvent(null);
                }}
                className="rounded-full bg-slate-950 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
