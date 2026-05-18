"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Loader2,
  MapPin,
  Plus,
Save,
Trash2,
UserRound,
X,
} from "lucide-react";

type RosterPerson = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  role?: string | null;
  grad_year?: number | null;
};

type ExternalPerson = {
  id: string;
  full_name: string;
  credentials?: string | null;
  institution?: string | null;
};

type AcademicEventDetail = {
  id: string;
  title: string;
  description?: string | null;
  start_datetime: string;
  end_datetime: string;
  is_required: boolean;
  visibility: string;
  event_type?: { id: string; name: string; color?: string | null; icon?: string | null } | null;
  location?: {
    id: string;
    name: string;
    address?: string | null;
    building?: string | null;
    room?: string | null;
    is_virtual?: boolean | null;
    virtual_url?: string | null;
  } | null;
  sessions?: {
    id: string;
    title: string;
    session_type?: string | null;
    description?: string | null;
    start_datetime?: string | null;
    end_datetime?: string | null;
    display_order?: number | null;
  }[];
  people?: {
    id: string;
    academic_event_session_id?: string | null;
    role: string;
    roster?: RosterPerson | null;
    roster_person?: RosterPerson | null;
    external_person?: ExternalPerson | null;
  }[];
  journal_articles?: {
    id: string;
    title: string;
    journal?: string | null;
    authors?: string | null;
    publication_year?: number | null;
    pubmed_url?: string | null;
    pdf_url?: string | null;
  }[];
  resources?: {
    id: string;
    resource_type: string;
    title: string;
    url?: string | null;
    file_path?: string | null;
    description?: string | null;
  }[];
  assignments?: {
    id: string;
    assignment_type: string;
    title?: string | null;
    due_date?: string | null;
    status: string;
    roster?: RosterPerson | null;
  }[];
};

type AcademicEventDetailProps = {
  eventId: string | null;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
};

type SessionDraft = {
  title: string;
  session_type: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoFromDateTimeLocal(value: string) {
  return new Date(value).toISOString();
}

function formatDate(value?: string | null) {
  if (!value) return "Date TBD";
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTimeRange(start?: string | null, end?: string | null) {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  return "Time TBD";
}

function getPersonName(person?: {
  roster?: RosterPerson | null;
  roster_person?: RosterPerson | null;
  external_person?: ExternalPerson | null;
}) {
  const roster = person?.roster ?? person?.roster_person;

  if (roster) {
    return (
      roster.full_name ||
      [roster.first_name, roster.last_name].filter(Boolean).join(" ") ||
      "Roster member"
    );
  }

  if (person?.external_person) {
    return [person.external_person.full_name, person.external_person.credentials]
      .filter(Boolean)
      .join(", ");
  }

  return "Assigned person";
}

function getLocationText(event: AcademicEventDetail) {
  if (!event.location) return "No location listed";
  if (event.location.is_virtual) return event.location.virtual_url ?? "Virtual";

  return [
    event.location.name,
    event.location.room,
    event.location.building,
    event.location.address,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          {icon}
        </div>
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function AcademicEventDetail({
  eventId,
  open,
  onClose,
  onDeleted,
}: AcademicEventDetailProps) {
  const [event, setEvent] = useState<AcademicEventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDatetime, setStartDatetime] = useState("");
  const [endDatetime, setEndDatetime] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [visibility, setVisibility] = useState("program");
  const [newSessions, setNewSessions] = useState<SessionDraft[]>([]);

  const sessionPeopleBySessionId = useMemo(() => {
    const grouped = new Map<string, NonNullable<AcademicEventDetail["people"]>>();

    for (const person of event?.people ?? []) {
      if (!person.academic_event_session_id) continue;
      grouped.set(person.academic_event_session_id, [
        ...(grouped.get(person.academic_event_session_id) ?? []),
        person,
      ]);
    }

    return grouped;
  }, [event]);

  useEffect(() => {
    if (!open || !eventId) return;

    let cancelled = false;

    async function loadEvent() {
      setLoading(true);
      setError(null);
      setEditMode(false);

      try {
        const response = await fetch(
          `/api/program/academic-calendar/events/${eventId}`,
          { method: "GET", cache: "no-store" }
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.error ?? "Failed to fetch event");
        }

        if (!cancelled) {
          const nextEvent = json.data as AcademicEventDetail;
          setEvent(nextEvent);
          setTitle(nextEvent.title ?? "");
          setDescription(nextEvent.description ?? "");
          setStartDatetime(toDateTimeLocal(nextEvent.start_datetime));
          setEndDatetime(toDateTimeLocal(nextEvent.end_datetime));
          setIsRequired(Boolean(nextEvent.is_required));
          setVisibility(nextEvent.visibility ?? "program");
          setNewSessions([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch event");
          setEvent(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [open, eventId]);

  function addNewSession() {
  setNewSessions((current) => [
    ...current,
    {
      title: "",
      session_type: "",
      description: "",
      start_datetime: "",
      end_datetime: "",
    },
  ]);
}

function updateNewSession(index: number, updates: Partial<SessionDraft>) {
  setNewSessions((current) =>
    current.map((session, currentIndex) =>
      currentIndex === index ? { ...session, ...updates } : session
    )
  );
}

function removeNewSession(index: number) {
  setNewSessions((current) =>
    current.filter((_, currentIndex) => currentIndex !== index)
  );
}

  async function handleSave() {
    if (!event) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/program/academic-calendar/events/${event.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            start_datetime: toIsoFromDateTimeLocal(startDatetime),
            end_datetime: toIsoFromDateTimeLocal(endDatetime),
            is_required: isRequired,
            visibility,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error ?? "Failed to update event");
      }

      setEvent(json.data);
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!event) return;
    const confirmed = window.confirm("Delete this academic event? This cannot be undone.");
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/program/academic-calendar/events/${event.id}`,
        { method: "DELETE" }
      );

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(json?.error ?? "Failed to delete event");
      }

      onClose();
onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddSessions() {
  if (!event) return;

  const validSessions = newSessions.filter((session) => session.title.trim());

  if (validSessions.length === 0) {
    return;
  }

  setSaving(true);
  setError(null);

  try {
    for (const [index, session] of validSessions.entries()) {

  if (
    session.start_datetime &&
    session.end_datetime &&
    new Date(session.end_datetime) <= new Date(session.start_datetime)
  ) {
    throw new Error("Session end time must be after session start time");
  }

  const response = await fetch(
        `/api/program/academic-calendar/events/${event.id}/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: session.title.trim(),
            session_type: session.session_type.trim() || null,
            description: session.description.trim() || null,
            start_datetime: session.start_datetime
              ? toIsoFromDateTimeLocal(session.start_datetime)
              : null,
            end_datetime: session.end_datetime
              ? toIsoFromDateTimeLocal(session.end_datetime)
              : null,
            display_order: (event.sessions?.length ?? 0) + index,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error ?? "Failed to add session");
      }
    }

    const refreshed = await fetch(
      `/api/program/academic-calendar/events/${event.id}`,
      { method: "GET", cache: "no-store" }
    );

    const refreshedJson = await refreshed.json();

    if (!refreshed.ok) {
      throw new Error(refreshedJson?.error ?? "Failed to refresh event");
    }

    setEvent(refreshedJson.data);
    setNewSessions([]);
    setEditMode(false);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to add sessions");
  } finally {
    setSaving(false);
  }
}

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close event detail"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full flex-col bg-slate-50 shadow-2xl sm:max-w-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-slate-600">
                  {event?.event_type?.name ?? "Academic Event"}
                </span>

                {event?.is_required && (
                  <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white">
                    Required
                  </span>
                )}
              </div>

              <h2 className="mt-2 line-clamp-2 text-2xl font-black leading-tight text-slate-950">
                {event?.title ?? "Academic Event"}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {event && (
                <button
                  type="button"
                  onClick={() => setEditMode((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Edit3 className="h-4 w-4" />
                  {editMode ? "Cancel" : "Edit"}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading event...
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            </div>
          ) : event ? (
            <div className="space-y-4">
              {editMode ? (
                <Section title="Edit Event" icon={<Edit3 className="h-4 w-4" />}>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Title
                      </label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-950"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Start
                        </label>
                        <input
                          type="datetime-local"
                          value={startDatetime}
                          onChange={(e) => setStartDatetime(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-950"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                          End
                        </label>
                        <input
                          type="datetime-local"
                          value={endDatetime}
                          onChange={(e) => setEndDatetime(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-950"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-950"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setIsRequired((current) => !current)}
                        className={`rounded-full px-4 py-2 text-sm font-bold ${
                          isRequired
                            ? "bg-slate-950 text-white"
                            : "border border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        Required Event
                      </button>

                      <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                      >
                        <option value="program">Program</option>
                        <option value="private">Private</option>
                        <option value="public">Public</option>
                      </select>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
  <div className="mb-3 flex items-center justify-between gap-3">
    <div>
      <h4 className="text-sm font-black text-slate-950">Add Sessions</h4>
      <p className="text-xs text-slate-500">
        Add lectures, presentations, journal club blocks, or M&M segments.
      </p>
    </div>

    <button
      type="button"
      onClick={addNewSession}
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
    >
      <Plus className="h-3.5 w-3.5" />
      Add
    </button>
  </div>

  {newSessions.length === 0 ? (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs font-semibold text-slate-400">
      No new sessions added.
    </div>
  ) : (
    <div className="space-y-3">
      {newSessions.map((session, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-200 bg-white p-3"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">
              New Session {index + 1}
            </div>

            <button
              type="button"
              onClick={() => removeNewSession(index)}
              className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <input
              value={session.title}
              onChange={(e) =>
                updateNewSession(index, { title: e.target.value })
              }
              placeholder="Session title"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-950"
            />

            <input
              value={session.session_type}
              onChange={(e) =>
                updateNewSession(index, { session_type: e.target.value })
              }
              placeholder="Session type, e.g. lecture, M&M, journal club"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-950"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="datetime-local"
                value={session.start_datetime}
                onChange={(e) =>
                  updateNewSession(index, { start_datetime: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-950"
              />

              <input
                type="datetime-local"
                value={session.end_datetime}
                onChange={(e) =>
                  updateNewSession(index, { end_datetime: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-950"
              />
            </div>

            <textarea
              value={session.description}
              onChange={(e) =>
                updateNewSession(index, { description: e.target.value })
              }
              rows={2}
              placeholder="Optional session details..."
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-950"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddSessions}
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Save New Sessions
      </button>
    </div>
  )}
</div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                      </button>

                      <button
                        type="button"
                        onClick={() => {
  setEditMode(false);
  setNewSessions([]);
}}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </Section>
              ) : (
                <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                        <CalendarDays className="h-4 w-4" />
                        Date
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-950">
                        {formatDate(event.start_datetime)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                        <Clock className="h-4 w-4" />
                        Time
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-950">
                        {getTimeRange(event.start_datetime, event.end_datetime)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                      <MapPin className="h-4 w-4" />
                      Location
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-950">
                      {getLocationText(event)}
                    </div>
                  </div>

                  {event.description && (
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                      {event.description}
                    </p>
                  )}
                </section>
              )}

              {!!event.sessions?.length && (
                <Section title="Schedule / Sessions" icon={<CalendarDays className="h-4 w-4" />}>
                  <div className="space-y-3">
                    {event.sessions.map((session, index) => {
                      const sessionPeople = sessionPeopleBySessionId.get(session.id) ?? [];

                      return (
                        <div key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                              {index + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                <h4 className="text-sm font-black text-slate-950">
                                  {session.title}
                                </h4>
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  {getTimeRange(session.start_datetime, session.end_datetime)}
                                </span>
                              </div>

                              {session.description && (
                                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                  {session.description}
                                </p>
                              )}

                              {!!sessionPeople.length && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {sessionPeople.map((person) => (
                                    <span
                                      key={person.id}
                                      className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600"
                                    >
                                      <UserRound className="h-3 w-3" />
                                      {getPersonName(person)}
                                      <span className="text-slate-400">· {person.role}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {!!event.people?.filter((p) => !p.academic_event_session_id).length && (
                <Section title="Event People" icon={<UserRound className="h-4 w-4" />}>
                  <div className="space-y-2">
                    {event.people
                      .filter((p) => !p.academic_event_session_id)
                      .map((person) => (
                        <div key={person.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                          <div className="text-sm font-bold text-slate-950">
                            {getPersonName(person)}
                          </div>
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500">
                            {person.role}
                          </span>
                        </div>
                      ))}
                  </div>
                </Section>
              )}

              {!!event.journal_articles?.length && (
                <Section title="Journal Articles" icon={<BookOpen className="h-4 w-4" />}>
                  <div className="space-y-3">
                    {event.journal_articles.map((article) => (
                      <div key={article.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-sm font-black text-slate-950">{article.title}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          {[article.journal, article.publication_year].filter(Boolean).join(" · ")}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {article.pubmed_url && (
                            <a href={article.pubmed_url} target="_blank" rel="noreferrer" className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-600">
                              PubMed
                            </a>
                          )}
                          {article.pdf_url && (
                            <a href={article.pdf_url} target="_blank" rel="noreferrer" className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-600">
                              PDF
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {!!event.resources?.length && (
                <Section title="Resources" icon={<FileText className="h-4 w-4" />}>
                  <div className="space-y-2">
                    {event.resources.map((resource) => (
                      <a
                        key={resource.id}
                        href={resource.url ?? resource.file_path ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl bg-slate-50 p-3 hover:bg-slate-100"
                      >
                        <div className="text-sm font-black text-slate-950">{resource.title}</div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {resource.resource_type}
                        </div>
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {!!event.assignments?.length && (
                <Section title="Assignments" icon={<CheckCircle2 className="h-4 w-4" />}>
                  <div className="space-y-2">
                    {event.assignments.map((assignment) => (
                      <div key={assignment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-slate-950">
                              {assignment.title ?? assignment.assignment_type}
                            </div>
                            <div className="text-xs text-slate-500">
                              {assignment.roster?.full_name ?? "Unassigned"}
                            </div>
                          </div>
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500">
                            {assignment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {editMode && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete Event
                </button>
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}