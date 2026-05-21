"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useWorkspaceInfo } from "@/lib/workspace/use-workspace-info";

type EventTypeOption = {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  default_duration_minutes?: number | null;
  default_required?: boolean | null;
};

type LocationOption = {
  id: string;
  name: string;
  room?: string | null;
  building?: string | null;
  is_virtual?: boolean | null;
};

type SessionPersonDraft = {
  localId: string;
  roster_id: string;
  role: string;
};

type SessionDraft = {
  localId: string;
  title: string;
  session_type: string;
  description: string;
  start_time: string;
  end_time: string;
  people: SessionPersonDraft[];
};

type RosterOption = {
  rosterId: string;
  programMembershipId: string | null;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
  gradYear: number | null;
  pgyYear: number | null;
  trainingLevel: string | null;
};

type AcademicSessionResponse = {
  id: string;
  title?: string | null;
  session_type?: string | null;
  description?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
};

type DescriptionMetadata = {
  description: string;
  manualLocation: string;
  meetingUrl: string;
};

const DEFAULT_EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  {
    id: "fallback:academic",
    name: "Academic",
    default_required: false,
  },
  {
    id: "fallback:lab",
    name: "Lab",
    default_required: false,
  },
  {
    id: "fallback:journal-club",
    name: "Journal Club",
    default_required: false,
  },
  {
    id: "fallback:grand-rounds",
    name: "Grand Rounds",
    default_required: false,
  },
  {
    id: "fallback:research",
    name: "Research",
    default_required: false,
  },
  {
    id: "fallback:other",
    name: "Other",
    default_required: false,
  },
];

const DESCRIPTION_METADATA_HEADER = "[Academic Event Metadata]";
const DESCRIPTION_LOCATION_PREFIX = "Location: ";
const DESCRIPTION_MEETING_LINK_PREFIX = "Meeting Link: ";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultTimeValue(hours: number, minutes = 0) {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function normalizeTimeValue(timeValue: string) {
  const parts = timeValue.split(":");

  if (parts.length < 2) {
    throw new Error("Invalid time format");
  }

  const hours = parts[0]?.padStart(2, "0");
  const minutes = parts[1]?.padStart(2, "0");

  return `${hours}:${minutes}:00`;
}

function buildDateTime(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    throw new Error("Date and time are required");
  }

  const normalizedTime = normalizeTimeValue(timeValue);
  const date = new Date(`${dateValue}T${normalizedTime}`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid datetime format: ${dateValue} ${timeValue}`);
  }

  return date.toISOString();
}

function newSessionDraft(): SessionDraft {
  return {
    localId: crypto.randomUUID(),
    title: "",
    session_type: "",
    description: "",
    start_time: "",
    end_time: "",
    people: [],
  };
}

function addMinutesToTimeValue(timeValue: string, minutesToAdd: number) {
  const parts = timeValue.split(":");

  if (parts.length < 2) {
    throw new Error("Invalid time format");
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error("Invalid time format");
  }

  const date = new Date();
  date.setHours(hours, minutes + minutesToAdd, 0, 0);

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function parseTimeValueToMinutes(timeValue: string) {
  const parts = timeValue.split(":");

  if (parts.length < 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function shouldAutoAdjustEndTime(startValue: string, endValue: string) {
  if (!startValue) return false;
  if (!endValue) return true;

  const startMinutes = parseTimeValueToMinutes(startValue);
  const endMinutes = parseTimeValueToMinutes(endValue);

  if (startMinutes == null || endMinutes == null) {
    return false;
  }

  return endMinutes <= startMinutes;
}

function getTimeRangeError(
  date: string,
  startValue: string,
  endValue: string
) {
  if (!date || !startValue || !endValue) return null;

  try {
    const startDatetime = buildDateTime(date, startValue);
    const endDatetime = buildDateTime(date, endValue);

    if (new Date(endDatetime) <= new Date(startDatetime)) {
      return "End time must be after start time.";
    }
  } catch {
    return "Enter a valid date and time range.";
  }

  return null;
}

function parseDescriptionMetadata(
  descriptionValue: string | null | undefined
): DescriptionMetadata {
  if (!descriptionValue) {
    return {
      description: "",
      manualLocation: "",
      meetingUrl: "",
    };
  }

  const normalized = descriptionValue.replace(/\r\n/g, "\n");

  if (!normalized.startsWith(DESCRIPTION_METADATA_HEADER)) {
    return {
      description: descriptionValue,
      manualLocation: "",
      meetingUrl: "",
    };
  }

  const lines = normalized.split("\n");
  let manualLocation = "";
  let meetingUrl = "";
  let index = 1;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (!line.trim()) {
      index += 1;
      break;
    }

    if (line.startsWith(DESCRIPTION_LOCATION_PREFIX)) {
      manualLocation = line.slice(DESCRIPTION_LOCATION_PREFIX.length).trim();
    } else if (line.startsWith(DESCRIPTION_MEETING_LINK_PREFIX)) {
      meetingUrl = line.slice(DESCRIPTION_MEETING_LINK_PREFIX.length).trim();
    }

    index += 1;
  }

  return {
    description: lines.slice(index).join("\n").trim(),
    manualLocation,
    meetingUrl,
  };
}

function buildStoredDescription({
  description,
  manualLocation,
  meetingUrl,
}: DescriptionMetadata) {
  const trimmedDescription = description.trim();
  const trimmedLocation = manualLocation.trim();
  const trimmedMeetingUrl = meetingUrl.trim();
  const metadataLines = [DESCRIPTION_METADATA_HEADER];

  if (trimmedLocation) {
    metadataLines.push(`${DESCRIPTION_LOCATION_PREFIX}${trimmedLocation}`);
  }

  if (trimmedMeetingUrl) {
    metadataLines.push(`${DESCRIPTION_MEETING_LINK_PREFIX}${trimmedMeetingUrl}`);
  }

  if (metadataLines.length === 1) {
    return trimmedDescription || null;
  }

  const metadataBlock = metadataLines.join("\n");
  return trimmedDescription
    ? `${metadataBlock}\n\n${trimmedDescription}`
    : metadataBlock;
}

function formatLocationOption(location: LocationOption) {
  if (location.is_virtual) {
    return `${location.name} · Virtual`;
  }

  return [location.name, location.room, location.building]
    .filter(Boolean)
    .join(" · ");
}

function AcademicAddEditEventPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    programId,
    loading: workspaceLoading,
    error: workspaceError,
  } = useWorkspaceInfo();

  const eventId = searchParams?.get("eventId") ?? null;
  const isEditMode = !!eventId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventTypeId, setEventTypeId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [locationEditorOpen, setLocationEditorOpen] = useState(false);
  const [meetingLinkExpanded, setMeetingLinkExpanded] = useState(false);
  const [dateValue, setDateValue] = useState(toDateInputValue(new Date()));
  const [startTime, setStartTime] = useState(getDefaultTimeValue(7, 0));
  const [endTime, setEndTime] = useState(getDefaultTimeValue(8, 0));
  const [isRequired, setIsRequired] = useState(false);
  const [sessions, setSessions] = useState<SessionDraft[]>([]);

  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);

  const [loading, setLoading] = useState(Boolean(isEditMode));
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageTitle = isEditMode ? "Edit Academic Event" : "Add Academic Event";
  const displayedEventTypes =
    eventTypes.length > 0 ? eventTypes : DEFAULT_EVENT_TYPE_OPTIONS;

  const canSave = useMemo(() => {
    return !!programId && title.trim().length > 0 && !saving;
  }, [programId, title, saving]);

  const [rosterOptions, setRosterOptions] = useState<RosterOption[]>([]);
  const timeRangeError = useMemo(
    () => getTimeRangeError(dateValue, startTime, endTime),
    [dateValue, startTime, endTime]
  );
  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === locationId) ?? null,
    [locationId, locations]
  );
  const selectedEventType = useMemo(
    () =>
      displayedEventTypes.find((type) => type.id === eventTypeId) ?? null,
    [displayedEventTypes, eventTypeId]
  );
  const hasLocationValue = Boolean(locationId || manualLocation.trim());
  const hasMeetingLinkValue = Boolean(meetingUrl.trim());
  const visibleLocationValue = selectedLocation
    ? formatLocationOption(selectedLocation)
    : manualLocation;
  const previewLocation = useMemo(() => {
    return selectedLocation
      ? formatLocationOption(selectedLocation)
      : manualLocation.trim();
  }, [manualLocation, selectedLocation]);

  useEffect(() => {
    if (!programId) return;

    let cancelled = false;

    async function loadOptions() {
  setLoadingOptions(true);

  try {
    const [typesResponse, locationsResponse, rosterResponse] =
      await Promise.all([
        fetch(
          `/api/program/academic-calendar/event-types?programId=${programId}`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/program/academic-calendar/locations?programId=${programId}`,
          { cache: "no-store" }
        ),
        fetch("/api/program/members", {
  cache: "no-store",
}),
      ]);

    const [typesJson, locationsJson, rosterJson] = await Promise.all([
      typesResponse.json(),
      locationsResponse.json(),
      rosterResponse.json(),
    ]);

    if (!typesResponse.ok) {
      throw new Error(typesJson?.error ?? "Failed to load event types");
    }

    if (!locationsResponse.ok) {
      throw new Error(locationsJson?.error ?? "Failed to load locations");
    }

    if (!rosterResponse.ok) {
      throw new Error(rosterJson?.error ?? "Failed to load roster");
    }

    if (!cancelled) {
      setEventTypes(typesJson.data ?? []);
      setLocations(locationsJson.data ?? []);
      setRosterOptions(rosterJson.roster ?? []);
    }
  } catch (err) {
    if (!cancelled) {
      setError(err instanceof Error ? err.message : "Failed to load options");
    }
  } finally {
    if (!cancelled) setLoadingOptions(false);
  }
}

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [programId]);

  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;

    async function loadEvent() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/program/academic-calendar/events/${eventId}`,
          { cache: "no-store" }
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.error ?? "Failed to load event");
        }

        const event = json.data;

        if (!cancelled) {
          const start = new Date(event.start_datetime);
          const end = new Date(event.end_datetime);
          const parsedDescription = parseDescriptionMetadata(event.description);

          setTitle(event.title ?? "");
          setDescription(parsedDescription.description);
          setEventTypeId(event.event_type?.id ?? "");
          setLocationId(event.location?.id ?? "");
          setManualLocation(parsedDescription.manualLocation);
          setMeetingUrl(parsedDescription.meetingUrl);
          setLocationEditorOpen(
            Boolean(event.location?.id ?? parsedDescription.manualLocation.trim())
          );
          setMeetingLinkExpanded(Boolean(parsedDescription.meetingUrl.trim()));
          setDateValue(toDateInputValue(start));
          setStartTime(
            `${String(start.getHours()).padStart(2, "0")}:${String(
              start.getMinutes()
            ).padStart(2, "0")}`
          );
          setEndTime(
            `${String(end.getHours()).padStart(2, "0")}:${String(
              end.getMinutes()
            ).padStart(2, "0")}`
          );
          setIsRequired(Boolean(event.is_required));

          setSessions(
  ((event.sessions ?? []) as AcademicSessionResponse[]).map((session) => ({
    localId: session.id,
    title: session.title ?? "",
    session_type: session.session_type ?? "",
    description: session.description ?? "",
    start_time: session.start_datetime
      ? `${String(new Date(session.start_datetime).getHours()).padStart(
          2,
          "0"
        )}:${String(
          new Date(session.start_datetime).getMinutes()
        ).padStart(2, "0")}`
      : "",
    end_time: session.end_datetime
      ? `${String(new Date(session.end_datetime).getHours()).padStart(
          2,
          "0"
        )}:${String(
          new Date(session.end_datetime).getMinutes()
        ).padStart(2, "0")}`
      : "",
    people: [],
  }))
);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load event");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    if (!shouldAutoAdjustEndTime(startTime, endTime)) {
      return;
    }

    setEndTime(addMinutesToTimeValue(startTime, 60));
  }, [endTime, startTime]);

  function addSession() {
    setSessions((current) => [...current, newSessionDraft()]);
  }

  function updateSession(localId: string, updates: Partial<SessionDraft>) {
    setSessions((current) =>
      current.map((session) =>
        session.localId === localId ? { ...session, ...updates } : session
      )
    );
  }

  function removeSession(localId: string) {
    setSessions((current) =>
      current.filter((session) => session.localId !== localId)
    );
  }

  function addSessionPerson(sessionLocalId: string) {
  setSessions((current) =>
    current.map((session) =>
      session.localId === sessionLocalId
        ? {
            ...session,
            people: [
              ...session.people,
              {
                localId: crypto.randomUUID(),
                roster_id: "",
                role: "presenter",
              },
            ],
          }
        : session
    )
  );
}

function updateSessionPerson(
  sessionLocalId: string,
  personLocalId: string,
  updates: Partial<SessionPersonDraft>
) {
  setSessions((current) =>
    current.map((session) =>
      session.localId === sessionLocalId
        ? {
            ...session,
            people: session.people.map((person) =>
              person.localId === personLocalId
                ? { ...person, ...updates }
                : person
            ),
          }
        : session
    )
  );
}

function removeSessionPerson(sessionLocalId: string, personLocalId: string) {
  setSessions((current) =>
    current.map((session) =>
      session.localId === sessionLocalId
        ? {
            ...session,
            people: session.people.filter(
              (person) => person.localId !== personLocalId
            ),
          }
        : session
    )
  );
}

  async function ensureEventTypeId() {
    if (!programId || !eventTypeId) {
      return null;
    }

    if (!eventTypeId.startsWith("fallback:")) {
      return eventTypeId;
    }

    const selectedFallbackType = DEFAULT_EVENT_TYPE_OPTIONS.find(
      (type) => type.id === eventTypeId
    );

    if (!selectedFallbackType) {
      return null;
    }

    const createResponse = await fetch("/api/program/academic-calendar/event-types", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        program_id: programId,
        name: selectedFallbackType.name,
        default_required: Boolean(selectedFallbackType.default_required),
      }),
    });

    const createJson = await createResponse.json().catch(() => null);

    if (createResponse.ok) {
      const createdType = createJson?.data as EventTypeOption;
      setEventTypes((current) => [...current, createdType]);
      setEventTypeId(createdType.id);
      return createdType.id;
    }

    if (createResponse.status !== 409) {
      throw new Error(createJson?.error ?? "Failed to create event type");
    }

    const typesResponse = await fetch(
      `/api/program/academic-calendar/event-types?programId=${programId}`,
      { cache: "no-store" }
    );
    const typesJson = await typesResponse.json().catch(() => null);

    if (!typesResponse.ok) {
      throw new Error(typesJson?.error ?? "Failed to reload event types");
    }

    const reloadedTypes = (typesJson?.data ?? []) as EventTypeOption[];
    const matchedType =
      reloadedTypes.find((type) => type.name === selectedFallbackType.name) ??
      null;

    if (!matchedType) {
      throw new Error("Selected event type could not be resolved");
    }

    setEventTypes(reloadedTypes);
    setEventTypeId(matchedType.id);
    return matchedType.id;
  }

  async function handleSave() {
    if (!programId) {
      setError("Missing programId");
      return;
    }

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    let startDatetime: string;
let endDatetime: string;

try {
  startDatetime = buildDateTime(dateValue, startTime);
  endDatetime = buildDateTime(dateValue, endTime);
} catch (err) {
  setError(err instanceof Error ? err.message : "Invalid event date/time");
  return;
}

    if (timeRangeError) {
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const resolvedEventTypeId = await ensureEventTypeId();
      const url = isEditMode
        ? `/api/program/academic-calendar/events/${eventId}`
        : "/api/program/academic-calendar/events";

      const response = await fetch(url, {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          program_id: programId,
          title: title.trim(),
          description: buildStoredDescription({
            description,
            manualLocation: locationId ? "" : manualLocation,
            meetingUrl,
          }),
          event_type_id: resolvedEventTypeId,
          location_id: locationId || null,
          start_datetime: startDatetime,
          end_datetime: endDatetime,
          is_required: isRequired,
          visibility: "program",
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error ?? "Failed to save event");
      }

      const savedEventId = json.data.id as string;

      if (!isEditMode) {
  const validSessions = sessions.filter((session) => session.title.trim());

  for (const [index, session] of validSessions.entries()) {
    const sessionResponse = await fetch(
      `/api/program/academic-calendar/events/${savedEventId}/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: session.title.trim(),
          session_type: session.session_type.trim() || null,
          description: session.description.trim() || null,
          start_datetime: session.start_time
  ? buildDateTime(dateValue, session.start_time)
  : null,
end_datetime: session.start_time
  ? buildDateTime(
      dateValue,
      session.end_time || addMinutesToTimeValue(session.start_time, 60)
    )
  : null,
          display_order: index,
        }),
      }
    );

    const sessionJson = await sessionResponse.json().catch(() => null);

    if (!sessionResponse.ok) {
      throw new Error(
        sessionJson?.error ??
          sessionJson?.message ??
          "Failed to create event session"
      );
    }

    const savedSessionId = sessionJson.data.id as string;

    for (const [personIndex, person] of session.people
      .filter((p) => p.roster_id)
      .entries()) {
      const personResponse = await fetch(
        `/api/program/academic-calendar/events/${savedEventId}/people`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            academic_event_session_id: savedSessionId,
            roster_id: person.roster_id,
            external_person_id: null,
            role: person.role || "presenter",
            display_order: personIndex,
          }),
        }
      );

      const personJson = await personResponse.json().catch(() => null);

      if (!personResponse.ok) {
        throw new Error(
          personJson?.error ??
            personJson?.message ??
            "Failed to assign presenter"
        );
      }
    }
  }
}

router.push("/work/academic");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  if (workspaceLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-slate-200 shadow-xl backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading workspace...
        </div>
      </main>
    );
  }

  if (workspaceError || !programId) {
    return (
      <main className="min-h-screen bg-slate-950 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-100 bg-red-50 p-6 text-red-700">
          {workspaceError ?? "No active program found."}
        </div>
      </main>
    );
  }

  if (loading) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-slate-200 shadow-xl backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading event...
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-slate-950 px-5 pb-10 pt-8 text-slate-900 md:px-8 md:pt-10">
  <div className="mx-auto max-w-[1400px] space-y-5">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button
                type="button"
                onClick={() => router.push("/work/academic")}
                className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to academic calendar
              </button>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
                <CalendarDays className="h-4 w-4" />
                Academic Calendar
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                {pageTitle}
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Build the event details, sessions, presenters, articles, and
                assignments.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-bold text-sky-950 shadow-sm transition hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Event
                </>
              )}
            </button>
          </div>
        </section>

        {error && (
          <section className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-950">
                Event Details
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-800">
                    Title
                  </label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Friday Academic Conference"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  />
                </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-gray-800">
                      Event Type
                    </label>
                    <select
                      value={eventTypeId}
                      onChange={(event) => {
  const nextId = event.target.value;
  setEventTypeId(nextId);

  const selectedType = displayedEventTypes.find((type) => type.id === nextId);

  if (selectedType?.default_required != null) {
    setIsRequired(Boolean(selectedType.default_required));
  }
}}
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
                    >
                      <option value="">Select event type</option>
                      {displayedEventTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Location
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Add an in-person location, a meeting link, or both.
                          </p>
                        </div>
                      </div>

                      {!locationEditorOpen && !hasLocationValue ? (
                        <button
                          type="button"
                          onClick={() => setLocationEditorOpen(true)}
                          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <MapPin className="h-4 w-4" />
                          Add location
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-semibold text-gray-800">
                              Location
                            </label>
                            <div className="mt-2 flex gap-2">
                              <input
                                value={visibleLocationValue}
                                onChange={(event) => {
                                  setLocationEditorOpen(true);
                                  setLocationId("");
                                  setManualLocation(event.target.value);
                                }}
                                placeholder="Room 301, Smith Building"
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setLocationId("");
                                  setManualLocation("");
                                  setLocationEditorOpen(false);
                                }}
                                className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                              >
                                Clear
                              </button>
                            </div>
                          </div>

                          {locations.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Saved locations
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {locations.map((location) => {
                                  const selected = locationId === location.id;

                                  return (
                                    <button
                                      key={location.id}
                                      type="button"
                                      onClick={() => {
                                        setLocationEditorOpen(true);
                                        setLocationId(location.id);
                                        setManualLocation("");
                                      }}
                                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                                        selected
                                          ? "border-slate-950 bg-slate-950 text-white"
                                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                      }`}
                                    >
                                      {formatLocationOption(location)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}

                      {meetingLinkExpanded || hasMeetingLinkValue ? (
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-sm font-semibold text-gray-800">
                              Meeting Link
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setMeetingUrl("");
                                setMeetingLinkExpanded(false);
                              }}
                              className="text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            type="url"
                            value={meetingUrl}
                            onChange={(event) => setMeetingUrl(event.target.value)}
                            placeholder="https://"
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          />
                        </div>
                      ) : null}

                      {!meetingLinkExpanded && !hasMeetingLinkValue ? (
                        <button
                          type="button"
                          onClick={() => setMeetingLinkExpanded(true)}
                          className="inline-flex items-center gap-2 self-start rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          Add meeting link
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div>
                    <label className="text-sm font-semibold text-gray-800">
                      Date
                    </label>
                    <input
                      type="date"
                      value={dateValue}
                      onChange={(event) => setDateValue(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-800">
                      Start
                    </label>
                    <input
                      type="time"
                      step="60"
                      value={startTime}
                      onChange={(event) => {
                        const nextStartTime = event.target.value;
                        setStartTime(nextStartTime);

                        if (shouldAutoAdjustEndTime(nextStartTime, endTime)) {
                          setEndTime(addMinutesToTimeValue(nextStartTime, 60));
                        }
                      }}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-800">
                      End
                    </label>
                    <input
  type="time"
  step="60"
  value={endTime}
  onChange={(event) => setEndTime(event.target.value)}
  className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-900 ${
    timeRangeError ? "border-red-300 focus:ring-2 focus:ring-red-200" : "border-gray-200"
  }`}
/>
                  </div>
                </div>

                {timeRangeError ? (
                  <p className="text-sm font-medium text-red-600">
                    {timeRangeError}
                  </p>
                ) : null}

                <div>
                  <label className="text-sm font-semibold text-gray-800">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    placeholder="Optional event description..."
                    className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Attendance Requirement
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Mark whether attendance is optional or required for the program.
                      </p>
                    </div>

                    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => setIsRequired(false)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                          !isRequired
                            ? "bg-slate-950 text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Optional
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRequired(true)}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                          isRequired
                            ? "bg-slate-950 text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {isRequired ? <Check className="h-4 w-4" /> : null}
                        Required
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-950">
                    Sessions
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Add blocks like M&M, grand rounds, journal club, or lecture
                    segments.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addSession}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Session
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {sessions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                    No sessions added yet. This event can still be saved as a
                    single calendar event.
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.localId}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-gray-900">
                          Session
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSession(session.localId)}
                          className="rounded-full p-2 text-gray-400 hover:bg-white hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <input
                          value={session.title}
                          onChange={(event) =>
                            updateSession(session.localId, {
                              title: event.target.value,
                            })
                          }
                          placeholder="M&M Conference"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
                        />

                        <div className="grid gap-3 sm:grid-cols-3">
                          <input
                            value={session.session_type}
                            onChange={(event) =>
                              updateSession(session.localId, {
                                session_type: event.target.value,
                              })
                            }
                            placeholder="m_and_m"
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
                          />

                          <input
  type="time"
  step="60"
  value={session.start_time}
  onChange={(event) => {
    const nextStartTime = event.target.value;

    updateSession(session.localId, {
      start_time: nextStartTime,
      end_time:
        nextStartTime && shouldAutoAdjustEndTime(nextStartTime, session.end_time)
          ? addMinutesToTimeValue(nextStartTime, 60)
          : session.end_time,
    });
  }}
  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
/>

                          <input
                            type="time"
                            step="60"
                            value={session.end_time}
                            onChange={(event) =>
                              updateSession(session.localId, {
                                end_time: event.target.value,
                              })
                            }
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
                          />
                        </div>

                        <textarea
                          value={session.description}
                          onChange={(event) =>
                            updateSession(session.localId, {
                              description: event.target.value,
                            })
                          }
                          placeholder="Optional session details..."
                          rows={2}
                          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
                        />
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
  <div className="mb-3 flex items-center justify-between gap-3">
    <div>
      <p className="text-sm font-semibold text-slate-950">
        Presenters / Assigned People
      </p>
      <p className="text-xs text-slate-500">
        Attach residents or faculty to this session.
      </p>
    </div>

    <button
      type="button"
      onClick={() => addSessionPerson(session.localId)}
      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
    >
      Add Person
    </button>
  </div>

  {session.people.length === 0 ? (
    <p className="text-xs text-slate-400">No people assigned.</p>
  ) : (
    <div className="space-y-2">
      {session.people.map((person) => (
        <div
          key={person.localId}
          className="grid gap-2 sm:grid-cols-[1fr_140px_auto]"
        >
          <select
            value={person.roster_id}
            onChange={(event) =>
              updateSessionPerson(session.localId, person.localId, {
                roster_id: event.target.value,
              })
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950"
          >
            <option value="">Select person</option>
            {rosterOptions.map((roster) => (
  <option key={roster.rosterId} value={roster.rosterId}>
    {roster.displayName}
    {roster.trainingLevel ? ` · ${roster.trainingLevel}` : ""}
  </option>
))}
          </select>

          <input
            value={person.role}
            onChange={(event) =>
              updateSessionPerson(session.localId, person.localId, {
                role: event.target.value,
              })
            }
            placeholder="presenter"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950"
          />

          <button
            type="button"
            onClick={() =>
              removeSessionPerson(session.localId, person.localId)
            }
            className="rounded-xl px-3 py-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )}
</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="sticky top-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl">
              <h2 className="text-sm font-semibold text-gray-950">
                Event Preview
              </h2>

              <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {selectedEventType?.name ?? "Academic"}
                </div>

                <div className="mt-2 text-base font-bold text-gray-950">
                  {title || "Untitled event"}
                </div>

                <div className="mt-3 space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {dateValue}
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {startTime} – {endTime}
                  </div>

                  {previewLocation ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {previewLocation}
                    </div>
                  ) : null}

                  {meetingUrl.trim() ? (
                    <div className="flex items-center gap-2 break-all">
                      <span className="inline-flex h-4 w-4 items-center justify-center text-xs font-bold text-gray-500">
                        @
                      </span>
                      {meetingUrl.trim()}
                    </div>
                  ) : null}
                </div>

                {isRequired && (
                  <div className="mt-4 inline-flex rounded-full bg-gray-950 px-3 py-1 text-xs font-semibold text-white">
                    Required
                  </div>
                )}
              </div>

              {loadingOptions && (
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading options...
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function AcademicAddEditEventPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-slate-200 shadow-xl backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading page...
      </div>
    </main>
  );
}

export default function AcademicAddEditEventPage() {
  return (
    <Suspense fallback={<AcademicAddEditEventPageFallback />}>
      <AcademicAddEditEventPageContent />
    </Suspense>
  );
}
