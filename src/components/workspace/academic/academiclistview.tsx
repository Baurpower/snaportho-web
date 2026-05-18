"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Presentation,
  UserRound,
} from "lucide-react";
import { useWorkspaceInfo } from "@/lib/workspace/use-workspace-info";

type AcademicEventPerson = {
  id: string;
  academic_event_session_id?: string | null;
  role: string;
  display_order?: number | null;
  roster_person?: {
    id: string;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    grad_year?: number | null;
    role?: string | null;
  } | null;
  external_person?: {
    id: string;
    full_name: string;
    credentials?: string | null;
    institution?: string | null;
  } | null;
};

type AcademicEventSession = {
  id: string;
  title: string;
  session_type?: string | null;
  description?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  display_order?: number | null;
  people?: AcademicEventPerson[];
};

type AcademicCalendarEvent = {
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
  sessions?: AcademicEventSession[];
};

type AcademicListViewProps = {
  selectedDate: Date;
  requiredOnly: boolean;
  eventTypeId: string | null;
  onOpenEvent: (eventId: string) => void;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateForApi(date: Date) {
  return date.toISOString();
}

function formatDateHeader(dateString?: string | null) {
  if (!dateString) return "Upcoming";

  return new Date(dateString).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateString?: string | null) {
  if (!dateString) return null;

  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDateKey(dateString: string) {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getLocationText(event: AcademicCalendarEvent) {
  if (!event.location) return null;
  if (event.location.is_virtual) return "Virtual";

  return [event.location.name, event.location.room, event.location.building]
    .filter(Boolean)
    .join(" · ");
}

function getPersonName(person: AcademicEventPerson) {
  if (person.roster_person) {
    return (
      person.roster_person.full_name ||
      [person.roster_person.first_name, person.roster_person.last_name]
        .filter(Boolean)
        .join(" ") ||
      "Roster member"
    );
  }

  if (person.external_person) {
    return [person.external_person.full_name, person.external_person.credentials]
      .filter(Boolean)
      .join(", ");
  }

  return "Assigned person";
}

function getTimeRange(start?: string | null, end?: string | null) {
  const startText = formatTime(start);
  const endText = formatTime(end);

  if (startText && endText) return `${startText} – ${endText}`;
  if (startText) return startText;
  return "Time TBD";
}

function LoadingState({ label }: { label: string }) {
  return (
    <section className="flex min-h-[360px] items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    </section>
  );
}

export default function AcademicListView({
  selectedDate,
  requiredOnly,
  eventTypeId,
  onOpenEvent,
}: AcademicListViewProps) {
  const {
    programId,
    loading: workspaceLoading,
    error: workspaceError,
  } = useWorkspaceInfo();

  const [events, setEvents] = useState<AcademicCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function getAcademicYearEnd(date = new Date()) {
  const year = date.getFullYear();
  const julyFirstThisYear = new Date(year, 6, 1);
  const endYear = date < julyFirstThisYear ? year : year + 1;

  return new Date(endYear, 6, 1);
}

const rangeStart = useMemo(() => {
  return startOfDay(new Date());
}, []);

const rangeEnd = useMemo(() => {
  return getAcademicYearEnd(new Date());
}, []);

useEffect(() => {
    if (!programId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const activeProgramId = programId;
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError(null);

      console.log("AcademicListView query", {
  programId,
  selectedDate,
  rangeStart,
  rangeEnd,
  requiredOnly,
  eventTypeId,
});

      const params = new URLSearchParams({
        programId: activeProgramId,
        startDate: formatDateForApi(rangeStart),
        endDate: formatDateForApi(rangeEnd),
      });

      if (requiredOnly) params.set("requiredOnly", "true");
      if (eventTypeId) params.set("eventTypeId", eventTypeId);

      try {
        const response = await fetch(
          `/api/program/academic-calendar/events?${params.toString()}`,
          { method: "GET", cache: "no-store" }
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.error ?? "Failed to fetch academic events");
        }

        const baseEvents: AcademicCalendarEvent[] = json.data ?? [];

        const hydratedEvents = await Promise.all(
          baseEvents.map(async (event) => {
            const [sessionsResponse, peopleResponse] = await Promise.all([
              fetch(
                `/api/program/academic-calendar/events/${event.id}/sessions`,
                { cache: "no-store" }
              ),
              fetch(
                `/api/program/academic-calendar/events/${event.id}/people`,
                { cache: "no-store" }
              ),
            ]);

            const [sessionsJson, peopleJson] = await Promise.all([
              sessionsResponse.json().catch(() => ({ data: [] })),
              peopleResponse.json().catch(() => ({ data: [] })),
            ]);

            const sessions: AcademicEventSession[] = sessionsResponse.ok
              ? sessionsJson.data ?? []
              : [];

            const people: AcademicEventPerson[] = peopleResponse.ok
              ? peopleJson.data ?? []
              : [];

            const sessionsWithPeople = sessions.map((session) => ({
              ...session,
              people: people.filter(
                (person) => person.academic_event_session_id === session.id
              ),
            }));

            return {
              ...event,
              sessions: sessionsWithPeople,
            };
          })
        );

        if (!cancelled) {
          setEvents(hydratedEvents);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to fetch academic events"
          );
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [programId, rangeStart, rangeEnd, requiredOnly, eventTypeId]);

  const groupedEvents = useMemo(() => {
    const grouped = new Map<string, AcademicCalendarEvent[]>();

    events
      .slice()
      .sort(
        (a, b) =>
          new Date(a.start_datetime).getTime() -
          new Date(b.start_datetime).getTime()
      )
      .forEach((event) => {
        const key = getDateKey(event.start_datetime);
        grouped.set(key, [...(grouped.get(key) ?? []), event]);
      });

    return Array.from(grouped.entries()).map(([dateKey, dayEvents]) => ({
      dateKey,
      date: dayEvents[0]?.start_datetime,
      events: dayEvents,
    }));
  }, [events]);

  if (workspaceLoading) {
    return <LoadingState label="Loading workspace..." />;
  }

  if (workspaceError || !programId) {
    return (
      <section className="rounded-[1.75rem] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4" />
          {workspaceError ?? "No active program found."}
        </div>
      </section>
    );
  }

  if (loading) {
    return <LoadingState label="Loading upcoming academic events..." />;
  }

  if (error) {
    return (
      <section className="rounded-[1.75rem] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl">
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600">
            <CalendarDays className="h-3.5 w-3.5" />
            Academic Schedule
          </div>

          <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950">
            Upcoming Academic Events
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Events, sessions, assigned presenters, and locations through the academic year.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
          {events.length} event{events.length === 1 ? "" : "s"}
        </div>
      </div>

      {groupedEvents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
            <CalendarDays className="h-5 w-5" />
          </div>

          <h3 className="mt-4 text-sm font-black text-slate-950">
            No upcoming academic events
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Try changing filters or moving to a different week.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedEvents.map((group) => (
            <div key={group.dateKey}>
              <div className="sticky top-0 z-10 mb-3 flex items-center gap-3 bg-white/95 py-2 backdrop-blur">
                <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
                  {formatDateHeader(group.date)}
                </div>
                <div className="h-px flex-1 bg-slate-200" />
                <div className="text-xs font-bold text-slate-400">
                  {group.events.length} event
                  {group.events.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="space-y-4">
                {group.events.map((event) => {
                  const locationText = getLocationText(event);
                  const sessions = event.sessions ?? [];

                  return (
                    <article
                      key={event.id}
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenEvent(event.id)}
                        className="w-full p-4 text-left transition hover:bg-slate-50"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-slate-600">
                                {event.event_type?.name ?? "Academic"}
                              </span>

                              {event.is_required && (
                                <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white">
                                  Required
                                </span>
                              )}

                              {sessions.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-sky-700">
                                  <Presentation className="h-3 w-3" />
                                  {sessions.length} session
                                  {sessions.length === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>

                            <h3 className="text-base font-black leading-snug text-slate-950 sm:text-lg">
                              {event.title}
                            </h3>

                            {event.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                {event.description}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 space-y-1 text-sm font-semibold text-slate-500 lg:text-right">
                            <div className="flex items-center gap-1.5 lg:justify-end">
                              <Clock className="h-3.5 w-3.5" />
                              <span>
                                {getTimeRange(
                                  event.start_datetime,
                                  event.end_datetime
                                )}
                              </span>
                            </div>

                            {locationText && (
                              <div className="flex items-center gap-1.5 lg:justify-end">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="line-clamp-1">
                                  {locationText}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>

                      {sessions.length > 0 && (
                        <div className="border-t border-slate-100 bg-slate-50 p-3">
                          <div className="space-y-2">
                            {sessions.map((session) => (
                              <button
                                key={session.id}
                                type="button"
                                onClick={() => onOpenEvent(event.id)}
                                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
                                      <p className="truncate text-sm font-black text-slate-900">
                                        {session.title}
                                      </p>
                                    </div>

                                    {session.description && (
                                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                        {session.description}
                                      </p>
                                    )}
                                  </div>

                                  <div className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">
                                    {getTimeRange(
                                      session.start_datetime,
                                      session.end_datetime
                                    )}
                                  </div>
                                </div>

                                {!!session.people?.length && (
                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {session.people.map((person) => (
                                      <span
                                        key={person.id}
                                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600"
                                      >
                                        <UserRound className="h-3 w-3" />
                                        {getPersonName(person)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}