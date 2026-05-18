"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
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
  roster_id?: string | null;
  external_person_id?: string | null;
  role: string;
  display_order: number;
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

type AcademicWeekViewProps = {
  weekStart: Date;
  weekEnd: Date;
  requiredOnly: boolean;
  eventTypeId: string | null;
  onOpenEvent: (eventId: string) => void;
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateForApi(date: Date) {
  return date.toISOString();
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function formatDayNumber(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
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

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
    return [
      person.external_person.full_name,
      person.external_person.credentials,
    ]
      .filter(Boolean)
      .join(", ");
  }

  return "Assigned person";
}

function getSessionTimeText(session: AcademicEventSession) {
  const start = formatTime(session.start_datetime);
  const end = formatTime(session.end_datetime);

  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return "Time TBD";
}

function LoadingCard({ label }: { label: string }) {
  return (
    <section className="flex min-h-[360px] items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl backdrop-blur">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-slate-200">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    </section>
  );
}

export default function AcademicWeekView({
  weekStart,
  weekEnd,
  requiredOnly,
  eventTypeId,
  onOpenEvent,
}: AcademicWeekViewProps) {
  const {
    programId,
    loading: workspaceLoading,
    error: workspaceError,
  } = useWorkspaceInfo();

  const [events, setEvents] = useState<AcademicCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

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

      const params = new URLSearchParams({
  programId: activeProgramId,
  startDate: formatDateForApi(weekStart),
  endDate: formatDateForApi(addDays(weekEnd, 1)),
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
              fetch(`/api/program/academic-calendar/events/${event.id}/sessions`, {
                cache: "no-store",
              }),
              fetch(`/api/program/academic-calendar/events/${event.id}/people`, {
                cache: "no-store",
              }),
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
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [programId, weekStart, weekEnd, requiredOnly, eventTypeId]);

  const eventsByDay = useMemo(() => {
    return days.map((day) => {
      const dayEvents = events
        .filter((event) => isSameDay(new Date(event.start_datetime), day))
        .sort(
          (a, b) =>
            new Date(a.start_datetime).getTime() -
            new Date(b.start_datetime).getTime()
        );

      return { day, events: dayEvents };
    });
  }, [days, events]);

  if (workspaceLoading) return <LoadingCard label="Loading workspace..." />;

  if (workspaceError || !programId) {
    return (
      <section className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4" />
          {workspaceError ?? "No active program found."}
        </div>
      </section>
    );
  }

  if (loading) return <LoadingCard label="Loading academic calendar..." />;

  if (error) {
    return (
      <section className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl">
        <div className="grid min-w-[1400px] grid-cols-7 gap-3">
        {eventsByDay.map(({ day, events: dayEvents }) => {
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[300px] rounded-3xl border p-3 ${
                isToday
                  ? "border-slate-950 bg-slate-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-black uppercase tracking-wide text-slate-950">
                    {formatDayLabel(day)}
                  </div>
                  <div className="text-xs font-semibold text-slate-400">
                    {formatDayNumber(day)}
                  </div>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    dayEvents.length
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {dayEvents.length}
                </span>
              </div>

              {dayEvents.length === 0 ? (
                <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs font-medium text-slate-400">
                  No academic events
                </div>
              ) : (
                <div className="max-h-[450px] space-y-3 overflow-y-auto pr-1">
                  {dayEvents.map((event) => {
                    const locationText = getLocationText(event);
                    const eventStart = formatTime(event.start_datetime);
                    const eventEnd = formatTime(event.end_datetime);
                    const sessionCount = event.sessions?.length ?? 0;

                    return (
                      <article
                        key={event.id}
                        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() => onOpenEvent(event.id)}
                          className="w-full p-3 text-left transition hover:bg-slate-50"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
                              {event.event_type?.name ?? "Academic"}
                            </span>

                            {event.is_required && (
                              <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                Required
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-black leading-snug text-slate-950">
                            {event.title}
                          </h3>

                          <div className="mt-2 space-y-1 text-xs font-medium text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>
  {eventStart && eventEnd
    ? `${eventStart} – ${eventEnd}`
    : eventStart ?? "Time TBD"}
</span>
                            </div>

                            {locationText && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="line-clamp-1">
                                  {locationText}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5">
                              <Presentation className="h-3.5 w-3.5" />
                              <span>
                                {sessionCount} session
                                {sessionCount === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>
                        </button>

                        {sessionCount > 0 && (
                          <div className="border-t border-slate-100 bg-slate-50 p-2">
                            <div className="space-y-2">
                              {event.sessions?.map((session) => (
                                <button
                                  key={session.id}
                                  type="button"
                                  onClick={() => onOpenEvent(event.id)}
                                  className="w-full rounded-2xl border border-slate-200 bg-white p-2.5 text-left transition hover:border-slate-300 hover:shadow-sm"
                                >
                                  <div className="mb-1 flex flex-col gap-1">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                      <span className="truncate text-xs font-black text-slate-900">
                                        {session.title}
                                      </span>
                                    </div>

                                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
  {getSessionTimeText(session)}
</span>
                                  </div>

                                  {session.description && (
                                    <p className="line-clamp-2 text-xs text-slate-500">
                                      {session.description}
                                    </p>
                                  )}

                                  {!!session.people?.length && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {session.people.slice(0, 3).map((person) => (
                                        <span
                                          key={person.id}
                                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                                        >
                                          <UserRound className="h-3 w-3" />
                                          {getPersonName(person)}
                                        </span>
                                      ))}

                                      {session.people.length > 3 && (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                          +{session.people.length - 3}
                                        </span>
                                      )}
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
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}