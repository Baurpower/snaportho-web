"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Download,
  ChevronLeft,
  ChevronRight,
  PencilLine,
  PhoneCall,
  Plus,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";
import DayDetailsModal from "@/components/workspace/shared/daydetailsmodal";
import CallDayDetailsContent from "@/components/workspace/call/calldaydetailscontent";
import CallMonthCalendar, {
  type ProgramCallItem,
} from "@/components/workspace/call/callmonthcalendar";
import EditCallMonthCalendar from "@/components/workspace/call/editcallmonthcalendar";
import { useRouter, useSearchParams } from "next/navigation";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type ProgramCallsMonthResponse = {
  monthStart: string;
  monthEnd: string;
  myMembershipId: string | null;
  calls: ProgramCallItem[];
};

type ResidentOption = {
  membershipId: string;
  residentName: string;
  trainingLevel: string | null;
};

type SuccessModalState = {
  title: string;
  message: string;
} | null;

function monthLabel(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthRange(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    monthStart: start.toISOString().slice(0, 10),
    monthEnd: end.toISOString().slice(0, 10),
  };
}

function formatShortDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isEditableQuickCall(call: ProgramCallItem) {
  return !call.startDatetime && !call.endDatetime && !!call.callDate;
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-xl font-black tracking-tight text-slate-950 md:text-2xl">
        {value}
      </p>
      <p className="mt-1.5 text-xs text-slate-600 md:text-sm">{subtitle}</p>
    </div>
  );
}

type CalendarScope = "mine" | "program";
type ExportRange = "visibleMonth" | "next3Months" | "academicYear";
type GoogleSyncMode = "once" | "automatic";
type GoogleCalendarOption = {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string | null;
};
type GoogleSyncStatus = {
  connected: boolean;
  email: string | null;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncedCount: number;
  calendarName: string | null;
  calendarId: string | null;
};



function getExportRange(
  range: ExportRange,
  visibleMonth: { year: number; monthIndex: number }
) {
  if (range === "visibleMonth") {
    const { monthStart, monthEnd } = getMonthRange(
      visibleMonth.year,
      visibleMonth.monthIndex
    );

    return { monthStart, monthEnd };
  }

  if (range === "next3Months") {
    const start = new Date(Date.UTC(visibleMonth.year, visibleMonth.monthIndex, 1));
    const end = new Date(Date.UTC(visibleMonth.year, visibleMonth.monthIndex + 3, 0));

    return {
      monthStart: start.toISOString().slice(0, 10),
      monthEnd: end.toISOString().slice(0, 10),
    };
  }

  const currentMonth = visibleMonth.monthIndex;
  const academicStartYear =
    currentMonth >= 6 ? visibleMonth.year : visibleMonth.year - 1;

  return {
    monthStart: new Date(Date.UTC(academicStartYear, 6, 1))
      .toISOString()
      .slice(0, 10),
    monthEnd: new Date(Date.UTC(academicStartYear + 1, 5, 30))
      .toISOString()
      .slice(0, 10),
  };
}

function getAcademicYearRange(visibleMonth: { year: number; monthIndex: number }) {
  const academicStartYear =
    visibleMonth.monthIndex >= 6 ? visibleMonth.year : visibleMonth.year - 1;

  return {
    monthStart: new Date(Date.UTC(academicStartYear, 6, 1))
      .toISOString()
      .slice(0, 10),
    monthEnd: new Date(Date.UTC(academicStartYear + 1, 5, 30))
      .toISOString()
      .slice(0, 10),
  };
}

export default function CallHubPage() {
  const now = new Date();

  const [visibleMonth, setVisibleMonth] = useState({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  });

  const router = useRouter();
  const searchParams = useSearchParams();

  const [googleSyncStatus, setGoogleSyncStatus] =
  useState<GoogleSyncStatus | null>(null);
  const [googleStatusModalOpen, setGoogleStatusModalOpen] = useState(false);

  const [data, setData] = useState<ProgramCallsMonthResponse | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCalendar, setEditingCalendar] = useState(false);
  const [successModal, setSuccessModal] = useState<SuccessModalState>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportScope, setExportScope] = useState<CalendarScope>("mine");
  const [exportRange, setExportRange] = useState<ExportRange>("visibleMonth");
  const [googleSyncScope, setGoogleSyncScope] = useState<CalendarScope>("mine");
  const [googleSyncMode, setGoogleSyncMode] = useState<GoogleSyncMode>("automatic");
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendarOption[]>([]);
  const [selectedGoogleCalendarId, setSelectedGoogleCalendarId] = useState("primary");
  const [googleCalendarsLoading, setGoogleCalendarsLoading] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [googleSyncModalOpen, setGoogleSyncModalOpen] = useState(false);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleSynced, setGoogleSynced] = useState(false);
  const [googleSyncError, setGoogleSyncError] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleAccountEmail, setGoogleAccountEmail] = useState<string | null>(null);
  const [googleStopModalOpen, setGoogleStopModalOpen] = useState(false);
  const [removeGoogleEvents, setRemoveGoogleEvents] = useState(false);
  const [googleStopping, setGoogleStopping] = useState(false);
  const [creatingGoogleCalendar, setCreatingGoogleCalendar] = useState(false);
  const [googleStopMessage, setGoogleStopMessage] = useState<string | null>(null);
  

  const { monthStart, monthEnd } = useMemo(
    () => getMonthRange(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth.year, visibleMonth.monthIndex]
  );


  useEffect(() => {
    let cancelled = false;

    async function loadCalls() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load program call");
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load program call");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCalls();

    return () => {
      cancelled = true;
    };
  }, [monthStart, monthEnd]);

  useEffect(() => {
  let cancelled = false;

  async function checkGoogleStatus() {
    const response = await fetch("/api/integrations/google/status", {
      credentials: "include",
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);

    if (!cancelled) {
      const connected = Boolean(payload?.connected);
      const synced = Boolean(payload?.syncEnabled || payload?.lastSyncedAt);

      setGoogleConnected(connected);
      setGoogleAccountEmail(payload?.email ?? null);
      setGoogleSynced(synced);

      setGoogleSyncStatus({
  connected,
  email: payload?.email ?? null,
  syncEnabled: Boolean(payload?.syncEnabled),
  lastSyncedAt: payload?.lastSyncedAt ?? null,
  lastSyncedCount: payload?.lastSyncedCount ?? 0,
  calendarName: payload?.calendarName ?? null,
  calendarId: payload?.calendarId ?? null,
});
    }
  }

  checkGoogleStatus();

  return () => {
    cancelled = true;
  };
}, []);

useEffect(() => {
  if (!searchParams) return;

  const googleStatus = searchParams.get("google");
  const shouldSetupGoogleSync =
    searchParams.get("setupGoogleSync") === "1" || googleStatus === "connected";

  if (!shouldSetupGoogleSync) return;

  async function finishGoogleConnect() {
    try {
      const response = await fetch("/api/integrations/google/status", {
        credentials: "include",
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      const connected = Boolean(payload?.connected);

      setGoogleConnected(connected);
      setGoogleAccountEmail(payload?.email ?? null);
      setGoogleSyncModalOpen(true);

      if (connected) {
        await loadGoogleCalendars();
      } else {
        setGoogleSyncError(
          googleStatus === "failed"
            ? "Google connection failed. Please try connecting again."
            : "Google is not connected yet. Please allow calendar access."
        );
      }
    } finally {
      router.replace("/work/call");
    }
  }

  finishGoogleConnect();
}, [searchParams, router]);

  const calls = data?.calls ?? [];

  const callsByDate = useMemo(() => {
    const map = new Map<string, ProgramCallItem[]>();

    for (const call of calls) {
      if (!call.callDate) continue;
      const existing = map.get(call.callDate) ?? [];
      existing.push(call);
      map.set(call.callDate, existing);
    }

    for (const [key, value] of map.entries()) {
      value.sort((a, b) => {
        if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
        return a.residentName.localeCompare(b.residentName);
      });
      map.set(key, value);
    }

    return map;
  }, [calls]);

  const callsById = useMemo(() => {
    return new Map(calls.map((call) => [call.id, call]));
  }, [calls]);

  const selectedDayCalls = selectedDateKey
    ? callsByDate.get(selectedDateKey) ?? []
    : [];

  const myCalls = calls.filter((call) => call.isMine);
  const nextMyCall =
    myCalls
      .filter((call) => call.callDate && call.callDate >= toDateKey(new Date()))
      .sort((a, b) => (a.callDate ?? "").localeCompare(b.callDate ?? ""))[0] ??
    null;

  const totalCallDays = calls.length;
  const myCallDays = myCalls.length;

  const residentOptions = useMemo(() => {
    const map = new Map<string, ResidentOption>();

    for (const call of calls) {
      if (!call.membershipId) continue;
      if (map.has(call.membershipId)) continue;

      map.set(call.membershipId, {
        membershipId: call.membershipId,
        residentName: call.residentName,
        trainingLevel: call.trainingLevel,
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.residentName.localeCompare(b.residentName)
    );
  }, [calls]);

  async function refreshMonth() {
    const response = await fetch(
      `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to refresh program call");
    }

    setData(payload);
  }

  async function patchCall(
    callId: string,
    body: {
      rosterId?: string;
      programMembershipId?: string;
      callType?: string;
      callDate?: string | null;
      startDatetime?: string | null;
      endDatetime?: string | null;
      site?: string | null;
      isHomeCall?: boolean;
      notes?: string | null;
    }
  ) {
    const response = await fetch(`/api/program/calls/${callId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to update call");
    }

    return payload;
  }

  async function deleteCall(callId: string) {
    const response = await fetch(`/api/program/calls/${callId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to delete call");
    }

    return payload;
  }

  async function swapCalls(firstCallId: string, secondCallId: string) {
    const response = await fetch("/api/program/calls/swap", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstCallId,
        secondCallId,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to swap calls");
    }

    return payload;
  }

  function finishSuccessfulEdit(title: string, message: string) {
    setEditingCalendar(false);
    setSuccessModal({ title, message });
  }

  function exportCalendar() {
  const range = getExportRange(exportRange, visibleMonth);

  const params = new URLSearchParams({
    monthStart: range.monthStart,
    monthEnd: range.monthEnd,
    scope: exportScope,
  });

  setExportModalOpen(false);
  window.location.href = `/api/program/calls/export?${params.toString()}`;
}

async function loadGoogleCalendars() {
  try {
    setGoogleCalendarsLoading(true);

    const response = await fetch("/api/integrations/google/calendars", {
      credentials: "include",
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to load Google calendars");
    }

    const calendars = (payload?.calendars ?? []) as GoogleCalendarOption[];

    setGoogleCalendars(calendars);

    const primaryCalendar = calendars.find((calendar) => calendar.primary);
    setSelectedGoogleCalendarId(
      payload?.selectedCalendarId ??
        primaryCalendar?.id ??
        calendars[0]?.id ??
        "primary"
    );
  } catch (err) {
    setGoogleSyncError(
      err instanceof Error ? err.message : "Failed to load Google calendars"
    );
  } finally {
    setGoogleCalendarsLoading(false);
  }
}

async function createSnapOrthoWorkspaceCalendar() {
  try {
    setCreatingGoogleCalendar(true);
    setGoogleSyncError(null);

    const response = await fetch("/api/integrations/google/calendars/create", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to create Google Calendar");
    }

    if (payload?.calendar?.id) {
      const newCalendar = payload.calendar as GoogleCalendarOption;

      setGoogleCalendars((prev) => {
        const alreadyExists = prev.some((calendar) => calendar.id === newCalendar.id);
        return alreadyExists ? prev : [...prev, newCalendar];
      });

      setSelectedGoogleCalendarId(newCalendar.id);
    }
  } catch (err) {
    setGoogleSyncError(
      err instanceof Error ? err.message : "Failed to create Google Calendar"
    );
  } finally {
    setCreatingGoogleCalendar(false);
  }
}

async function syncGoogleCalendar() {
  try {
    setGoogleSyncing(true);
    setGoogleSyncError(null);

    const range = getAcademicYearRange(visibleMonth);

    const response = await fetch("/api/program/calls/google-sync", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scope: googleSyncScope,
        syncMode: googleSyncMode,
        calendarId: selectedGoogleCalendarId,
        monthStart: range.monthStart,
        monthEnd: range.monthEnd,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to sync Google Calendar");
    }

    setGoogleSynced(true);
    setGoogleSyncStatus({
  connected: true,
  email: googleAccountEmail,
  syncEnabled: googleSyncMode === "automatic",
  lastSyncedAt: new Date().toISOString(),
  lastSyncedCount: payload?.syncedCount ?? 0,
  calendarName: payload?.calendarName ?? "Google Calendar",
  calendarId: payload?.calendarId ?? selectedGoogleCalendarId,
});
    setGoogleSyncModalOpen(false);

    setSuccessModal({
      title:
        googleSyncMode === "automatic"
          ? "Google Sync Enabled"
          : "Synced with Google",
      message:
        googleSyncMode === "automatic"
          ? `Google Calendar will stay updated for the current academic year. ${payload?.syncedCount ?? 0} call assignment${
              payload?.syncedCount === 1 ? "" : "s"
            } synced now.`
          : `${payload?.syncedCount ?? 0} call assignment${
              payload?.syncedCount === 1 ? "" : "s"
            } synced to Google Calendar.`,
    });
  } catch (err) {
    setGoogleSyncError(
      err instanceof Error ? err.message : "Failed to sync Google Calendar"
    );
  } finally {
    setGoogleSyncing(false);
  }
}

async function manualGoogleSyncFromStatus() {
  try {
    setGoogleSyncing(true);
    setGoogleSyncError(null);

    const range = getAcademicYearRange(visibleMonth);

    const response = await fetch("/api/program/calls/google-sync", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scope: googleSyncScope,
        syncMode: googleSyncStatus?.syncEnabled ? "automatic" : "once",
        calendarId:
          googleSyncStatus?.calendarId ??
          selectedGoogleCalendarId ??
          "primary",
        monthStart: range.monthStart,
        monthEnd: range.monthEnd,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to sync Google Calendar");
    }

    const nextStatus: GoogleSyncStatus = {
      connected: true,
      email: googleAccountEmail,
      syncEnabled: Boolean(payload?.syncEnabled ?? googleSyncStatus?.syncEnabled),
      lastSyncedAt: new Date().toISOString(),
      lastSyncedCount: payload?.syncedCount ?? 0,
      calendarName: payload?.calendarName ?? googleSyncStatus?.calendarName ?? "Google Calendar",
      calendarId: payload?.calendarId ?? googleSyncStatus?.calendarId ?? selectedGoogleCalendarId,
    };

    setGoogleSynced(true);
    setGoogleSyncStatus(nextStatus);

    setSuccessModal({
      title: "Google Calendar Updated",
      message: `${nextStatus.lastSyncedCount} call event${
        nextStatus.lastSyncedCount === 1 ? "" : "s"
      } synced to ${nextStatus.calendarName}.`,
    });

    setGoogleStatusModalOpen(false);
  } catch (err) {
    setGoogleSyncError(
      err instanceof Error ? err.message : "Failed to sync Google Calendar"
    );
  } finally {
    setGoogleSyncing(false);
  }
}

async function stopGoogleSync() {
  try {
    setGoogleStopping(true);
    setGoogleStopMessage(
      removeGoogleEvents
        ? "Removing SnapOrtho events from Google Calendar..."
        : "Turning off automatic Google Sync..."
    );
    setGoogleSyncError(null);

    const response = await fetch("/api/program/calls/google-sync/stop", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeEvents: removeGoogleEvents }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to stop Google Sync");
    }

    setGoogleSynced(false);
    setGoogleStopModalOpen(false);
    setGoogleSyncModalOpen(false);

    setSuccessModal({
      title: "Google Sync Stopped",
      message: removeGoogleEvents
        ? `${payload?.removedCount ?? 0} synced call event${
            payload?.removedCount === 1 ? "" : "s"
          } removed from Google Calendar.`
        : "SnapOrtho will no longer update your Google Calendar automatically.",
    });
  } catch (err) {
    setGoogleSyncError(
      err instanceof Error ? err.message : "Failed to stop Google Sync"
    );
  } finally {
    setGoogleStopping(false);
    setGoogleStopMessage(null);
  }
}

  async function handleSwitch(payload: {
    callId: string;
    fromMembershipId: string | null;
    toMembershipId: string;
  }) {
    try {
      setActionError(null);

      const selectedCall = callsById.get(payload.callId);
      if (!selectedCall) {
        throw new Error("Selected call could not be found.");
      }

      if (!isEditableQuickCall(selectedCall)) {
        throw new Error("This call cannot be quick-edited from this view.");
      }

      const targetResident = residentOptions.find(
        (resident) => resident.membershipId === payload.toMembershipId
      );

      if (!targetResident) {
        throw new Error("Target resident could not be found.");
      }

      await patchCall(payload.callId, {
        rosterId: payload.toMembershipId,
      });

      await refreshMonth();

      finishSuccessfulEdit(
        "Call switched",
        `${selectedCall.callType ?? "Call"} on ${formatShortDate(
          selectedCall.callDate
        )} was reassigned from ${selectedCall.residentName} to ${targetResident.residentName}.`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to switch call.");
      throw err;
    }
  }

  async function handleSwap(payload: {
    firstCallId: string;
    secondCallId: string;
  }) {
    try {
      setActionError(null);

      const firstCall = callsById.get(payload.firstCallId);
      const secondCall = callsById.get(payload.secondCallId);

      if (!firstCall || !secondCall) {
        throw new Error("One or both selected calls could not be found.");
      }

      if (!isEditableQuickCall(firstCall) || !isEditableQuickCall(secondCall)) {
        throw new Error("One or both calls cannot be quick-edited from this view.");
      }

      await swapCalls(payload.firstCallId, payload.secondCallId);
      await refreshMonth();

      finishSuccessfulEdit(
        "Calls swapped",
        `${firstCall.residentName} and ${secondCall.residentName} were swapped successfully.`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to swap calls.");
      throw err;
    }
  }

  async function handleDelete(payload: { callId: string }) {
    try {
      setActionError(null);

      const selectedCall = callsById.get(payload.callId);
      if (!selectedCall) {
        throw new Error("Selected call could not be found.");
      }

      if (!isEditableQuickCall(selectedCall)) {
        throw new Error("This call cannot be quick-deleted from this view.");
      }

      await deleteCall(payload.callId);
      await refreshMonth();

      finishSuccessfulEdit(
        "Call deleted",
        `${selectedCall.callType ?? "Call"} for ${selectedCall.residentName} on ${formatShortDate(
          selectedCall.callDate
        )} was removed.`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete call.");
      throw err;
    }
  }

  return (
    <>
      <main className="min-w-0 text-slate-900">
        <section className="relative overflow-hidden px-5 pb-5 pt-6 md:px-8 md:pb-6 md:pt-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.08),transparent_16%)]" />

          <div className="relative mx-auto max-w-[1600px]">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-6"
            >
              <div className="flex flex-col gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
                    <PhoneCall className="h-3.5 w-3.5" />
                    SnapOrtho
                  </div>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                    Call Hub
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                    A single place to see program-wide call, with your own call emphasized first.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <StatCard
                    title="Visible Month"
                    value={monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
                    subtitle={`${formatShortDate(monthStart)} – ${formatShortDate(monthEnd)}`}
                  />
                  <StatCard
                    title="My Call Days"
                    value={String(myCallDays)}
                    subtitle={
                      nextMyCall
                        ? `Next: ${formatShortDate(nextMyCall.callDate)}`
                        : "No upcoming call in view"
                    }
                  />
                  <StatCard
                    title="Program Call Assignments"
                    value={String(totalCallDays)}
                    subtitle="All visible resident call assignments this month"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-5 pb-8 md:px-8 md:pb-10">
          <div className="mx-auto max-w-[1600px] space-y-4">
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {actionError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {actionError}
              </div>
            ) : null}

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl md:p-5"
            >
              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleMonth((prev) => {
                        const nextDate = new Date(prev.year, prev.monthIndex - 1, 1);
                        return {
                          year: nextDate.getFullYear(),
                          monthIndex: nextDate.getMonth(),
                        };
                      })
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Call Schedule
                    </p>
                    <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                      {monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 md:text-sm">
                      Program-wide monthly call view
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setVisibleMonth((prev) => {
                        const nextDate = new Date(prev.year, prev.monthIndex + 1, 1);
                        return {
                          year: nextDate.getFullYear(),
                          monthIndex: nextDate.getMonth(),
                        };
                      })
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
  <button
  type="button"
  onClick={() => setExportModalOpen(true)}
  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:border-emerald-300 hover:bg-emerald-100"
>
  <Download className="h-4 w-4" />
  Export
</button>

<button
  type="button"
  onClick={() => {
    setGoogleSyncError(null);

    if (googleSynced) {
      setGoogleStatusModalOpen(true);
      return;
    }

    setGoogleSyncModalOpen(true);

    if (googleConnected) {
      loadGoogleCalendars();
    }
  }}
  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
    googleSynced
      ? "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300 hover:bg-emerald-100"
      : googleConnected
      ? "border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-300 hover:bg-sky-100"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
  }`}
>
  {googleSynced ? (
    <CheckCircle2 className="h-4 w-4" />
  ) : (
    <RefreshCw className="h-4 w-4" />
  )}

  {googleSynced
    ? "Synced with Google"
    : googleConnected
    ? "Sync with Google"
    : "Connect Google"}
</button>

  <button
    type="button"
    onClick={() => {
      setEditingCalendar((prev) => !prev);
      setActionError(null);
    }}
    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
      editingCalendar
        ? "border border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    }`}
  >
    <PencilLine className="h-4 w-4" />
    {editingCalendar ? "Exit Edit" : "Edit"}
  </button>

  <button
    type="button"
    onClick={() => router.push("/work/call/add")}
    className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-950 transition hover:border-sky-300 hover:bg-sky-100"
  >
    <Plus className="h-4 w-4" />
    Add Call
  </button>
</div>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  My call emphasized
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                  Home call tone
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                  <UserRound className="h-3.5 w-3.5" />
                  Entire program visible
                </div>
                {editingCalendar ? (
                  <>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-amber-700">
                      <PencilLine className="h-3.5 w-3.5" />
                      Quick edit mode active
                    </div>
                  </>
                ) : null}
              </div>

              {editingCalendar ? (
                <EditCallMonthCalendar
                  year={visibleMonth.year}
                  monthIndex={visibleMonth.monthIndex}
                  calls={calls}
                  loading={loading}
                  residents={residentOptions}
                  onCancel={() => setEditingCalendar(false)}
                  onSwitch={handleSwitch}
                  onSwap={handleSwap}
                  onDelete={handleDelete}
                />
              ) : (
                <CallMonthCalendar
                  year={visibleMonth.year}
                  monthIndex={visibleMonth.monthIndex}
                  calls={calls}
                  loading={loading}
                  onSelectDate={setSelectedDateKey}
                />
              )}
            </motion.div>
          </div>
        </section>
      </main>

      <DayDetailsModal
        open={!!selectedDateKey && !editingCalendar}
        onClose={() => setSelectedDateKey(null)}
        title="Call Day Details"
        subtitle="Full call assignments visible for this selected day."
        dateLabel={formatLongDate(selectedDateKey)}
      >
        {() => <CallDayDetailsContent calls={selectedDayCalls} />}
      </DayDetailsModal>

        {exportModalOpen ? (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
    <div className="w-full max-w-lg rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Download className="h-5 w-5" />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Calendar export
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              Export call calendar
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Download an .ics calendar file that can be imported into Apple Calendar,
              Google Calendar, Outlook, or another calendar app.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExportModalOpen(false)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Calendar type
          </p>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setExportScope("mine")}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                exportScope === "mine"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <p className="text-sm font-bold">My call</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Only exports your assigned call days.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setExportScope("program")}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                exportScope === "program"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <p className="text-sm font-bold">Program call</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Exports all visible program call assignments.
              </p>
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Time period
          </p>

          <div className="mt-2 space-y-2">
            {[
              {
                value: "visibleMonth",
                title: "Visible month",
                subtitle: `${formatShortDate(monthStart)} – ${formatShortDate(monthEnd)}`,
              },
              {
                value: "next3Months",
                title: "Next 3 months",
                subtitle: "Starts from the currently visible month.",
              },
              {
                value: "academicYear",
                title: "Academic year",
                subtitle: "July 1 through June 30.",
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setExportRange(option.value as ExportRange)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                  exportRange === option.value
                    ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>
                  <span className="block text-sm font-bold">{option.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {option.subtitle}
                  </span>
                </span>

                <span
                  className={`ml-4 h-3 w-3 rounded-full ${
                    exportRange === option.value ? "bg-emerald-600" : "bg-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => setExportModalOpen(false)}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={exportCalendar}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Download className="h-4 w-4" />
          Download .ics
        </button>
      </div>
    </div>
  </div>
) : null}

{googleSyncModalOpen ? (
  <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-8">
    <div className="my-auto w-full max-w-lg rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
      <div className="max-h-[calc(100vh-4rem)] overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <RefreshCw className="h-5 w-5" />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
              Google Calendar sync
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              {googleConnected ? "Set up calendar sync" : "Allow calendar access"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {googleConnected
                ? "Choose how SnapOrtho should sync call assignments into your connected Google Calendar."
                : "First, allow SnapOrtho to access Google Calendar. After approval, you’ll return here to choose your sync settings."}
            </p>

            {googleAccountEmail ? (
              <p className="mt-2 text-xs font-semibold text-sky-700">
                Connected as {googleAccountEmail}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGoogleSyncModalOpen(false)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {googleSyncError ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {googleSyncError}
        </div>
      ) : null}

      {googleConnected ? (
        <div className="mt-6 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              What should sync?
            </p>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setGoogleSyncScope("mine")}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  googleSyncScope === "mine"
                    ? "border-sky-300 bg-sky-50 text-sky-950"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-bold">My calls only</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Sync only call assignments assigned to you.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setGoogleSyncScope("program")}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  googleSyncScope === "program"
                    ? "border-sky-300 bg-sky-50 text-sky-950"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-bold">Program calendar</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Sync all program call assignments.
                </p>
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Sync behavior
            </p>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setGoogleSyncMode("once")}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  googleSyncMode === "once"
                    ? "border-sky-300 bg-sky-50 text-sky-950"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-bold">Sync once now</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Push the current academic year once.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setGoogleSyncMode("automatic")}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  googleSyncMode === "automatic"
                    ? "border-sky-300 bg-sky-50 text-sky-950"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-bold">Keep updated automatically</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Best option. Future call edits can update Google.
                </p>
              </button>
            </div>
          </div>

          <div>
  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
    Calendar destination
  </p>

  <div className="mt-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      {googleCalendarsLoading ? (
        <p className="text-sm font-semibold text-slate-600">
          Loading calendars...
        </p>
      ) : googleCalendars.length > 0 ? (
        <div className="space-y-2">
          {googleCalendars.map((calendar) => {
            const selected = selectedGoogleCalendarId === calendar.id;

            return (
              <button
                key={calendar.id}
                type="button"
                onClick={() => setSelectedGoogleCalendarId(calendar.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                  selected
                    ? "border-sky-300 bg-sky-50 text-sky-950"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>
                  <span className="block text-sm font-bold">
                    {calendar.summary}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {calendar.primary
                      ? "Primary Google Calendar"
                      : `Google Calendar • ${calendar.accessRole ?? "writable"}`}
                  </span>
                </span>

                <span
                  className={`ml-4 flex h-5 w-5 items-center justify-center rounded-full border ${
                    selected
                      ? "border-sky-600 bg-sky-600"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {selected ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm font-semibold text-slate-600">
          No writable Google calendars found.
        </p>
      )}
    </div>

    <button
      type="button"
      onClick={createSnapOrthoWorkspaceCalendar}
      disabled={creatingGoogleCalendar || googleCalendarsLoading}
      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-950 transition hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Plus className="h-4 w-4" />
      {creatingGoogleCalendar
        ? "Creating calendar..."
        : "Create SnapOrtho-Workspace Calendar"}
    </button>

    <p className="mt-2 text-xs leading-5 text-slate-600">
      Choose an existing calendar or create a dedicated SnapOrtho-Workspace calendar to keep call events separate.
    </p>
  </div>
</div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Sync window
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              Current academic year
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {formatShortDate(getAcademicYearRange(visibleMonth).monthStart)} –{" "}
              {formatShortDate(getAcademicYearRange(visibleMonth).monthEnd)}
            </p>
          </div>

          {googleSynced ? (
            <button
              type="button"
              onClick={() => {
                setRemoveGoogleEvents(false);
                setGoogleStopModalOpen(true);
              }}
              className="inline-flex w-full items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Stop Google Sync
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
          <p className="text-sm font-bold text-sky-950">
            Step 1: Allow Google Calendar access
          </p>
          <p className="mt-2 text-sm leading-6 text-sky-900">
            You’ll be redirected to Google to approve calendar access. SnapOrtho
            will only use this permission to create and update call schedule
            events.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => setGoogleSyncModalOpen(false)}
          disabled={(googleConnected && googleSyncing) || googleStopping}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => {
  if (!googleConnected) {
    window.location.href =
      `/api/integrations/google/connect?next=${encodeURIComponent(
        "/work/call?setupGoogleSync=1"
      )}`;

    return;
  }

  syncGoogleCalendar();
}}
          disabled={(googleConnected && googleSyncing) || googleStopping}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${googleSyncing ? "animate-spin" : ""}`} />
          {!googleConnected
            ? "Allow Google Calendar Access"
            : googleSyncing
            ? "Syncing..."
            : googleSyncMode === "automatic"
            ? "Enable Google Sync"
            : "Sync Once to Google"}
        </button>
      </div>
          </div>
    </div>
  </div>
) : null}

{googleStatusModalOpen ? (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
    <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Google Sync Active
            </p>

            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              Your call calendar is synced
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {googleSyncStatus?.syncEnabled
                ? "Automatic syncing is enabled. Future call edits can update Google Calendar."
                : "This calendar was synced once. Automatic syncing is not currently enabled."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGoogleStatusModalOpen(false)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Last sync
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {googleSyncStatus?.lastSyncedAt
              ? new Date(googleSyncStatus.lastSyncedAt).toLocaleString()
              : "No sync recorded yet"}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Events synced
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {googleSyncStatus?.lastSyncedCount ?? 0} call event
            {(googleSyncStatus?.lastSyncedCount ?? 0) === 1 ? "" : "s"}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Calendar
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {googleSyncStatus?.calendarName ?? "Google Calendar"}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
  <button
    type="button"
    onClick={() => {
      setGoogleStatusModalOpen(false);
      setRemoveGoogleEvents(false);
      setGoogleStopModalOpen(true);
    }}
    disabled={googleSyncing}
    className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
  >
    Stop Sync
  </button>

  <button
    type="button"
    onClick={() => {
      setGoogleStatusModalOpen(false);
      setGoogleSyncModalOpen(true);
      loadGoogleCalendars();
    }}
    disabled={googleSyncing}
    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
  >
    Settings
  </button>

  <button
    type="button"
    onClick={manualGoogleSyncFromStatus}
    disabled={googleSyncing}
    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
  >
    <RefreshCw className={`h-4 w-4 ${googleSyncing ? "animate-spin" : ""}`} />
    {googleSyncing ? "Syncing..." : "Sync Now"}
  </button>
</div>
      </div>
    </div>
  </div>
) : null}

{googleStopModalOpen ? (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
    <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
      {googleStopping ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>

          <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
            Working on it...
          </h3>

          <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">
            {googleStopMessage ?? "Updating your Google Sync settings..."}
          </p>
        </div>
      ) : (
        <>
          <h3 className="text-xl font-bold tracking-tight text-slate-950">
            Stop Google Sync?
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            SnapOrtho will stop automatically updating your Google Calendar when call assignments change.
          </p>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={removeGoogleEvents}
              onChange={(event) => setRemoveGoogleEvents(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />

            <span>
              <span className="block text-sm font-bold text-slate-950">
                Also remove synced call events
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">
                This removes events SnapOrtho created in Google Calendar. Manually created calendar events will not be affected.
              </span>
            </span>
          </label>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setGoogleStopModalOpen(false)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={stopGoogleSync}
              className="inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Stop Sync
            </button>
          </div>
        </>
      )}
    </div>
  </div>
) : null}

      {successModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Update complete
                  </p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                    {successModal.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {successModal.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSuccessModal(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSuccessModal(null)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Back to calendar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
