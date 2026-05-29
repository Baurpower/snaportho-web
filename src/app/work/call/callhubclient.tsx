"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
import { MobileProgramCallAgenda } from "@/components/workspace/call/mobileprogramcallagenda";
import { MobileMonthSelector } from "@/components/workspace/mobile/mobilemonthselector";
import SwapRequestDetailDrawer from "@/components/workspace/call-swaps/SwapRequestDetailDrawer";
import { useSwapRequests } from "@/hooks/useSwapRequests";
import AdminSwapApprovalQueue from "@/components/workspace/call-swaps/AdminSwapApprovalQueue";
import AdminApprovalWorkspace from "@/components/workspace/call-swaps/AdminApprovalWorkspace";
import NotificationBell from "@/components/workspace/notifications/NotificationBell";
import { useRouter, useSearchParams } from "next/navigation";
import { parseCallMutationResponse } from "@/lib/workspace/call/mutation-error";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";
import type { SwapRequestListItem } from "@/lib/workspace/call-swaps/types";

const ChangeMyCallModal = dynamic(
  () => import("@/components/workspace/call-swaps/ChangeMyCallModal"),
  { ssr: false }
);

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type ProgramCallsMonthResponse = {
  programId: string | null;
  monthStart: string;
  monthEnd: string;
  myMembershipId: string | null;
  myRosterId: string | null;
  residents: ResidentOption[];
  calls: ProgramCallItem[];
};

type ResidentOption = {
  rosterId: string;
  programMembershipId: string | null;
  residentName: string;
  trainingLevel: string | null;
  pgyYear: number | null;
  gradYear: number | null;
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

function CompactRequestCountChip({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      <span>{label}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
        {count}
      </span>
    </Link>
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
  const { permissions, isAdmin } = useWorkspacePermissions();

  const [googleSyncStatus, setGoogleSyncStatus] =
  useState<GoogleSyncStatus | null>(null);
  const [googleStatusModalOpen, setGoogleStatusModalOpen] = useState(false);

  const [data, setData] = useState<ProgramCallsMonthResponse | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCalendar, setEditingCalendar] = useState(false);

  // Mobile-only UI state (Phase 3). Does not affect desktop or export/scope logic.
  const [mobileCallView, setMobileCallView] = useState<"mine" | "program">("mine");
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
  const [selectedSwapRequestId, setSelectedSwapRequestId] = useState<string | null>(null);
  const [selectedAdminRequestId, setSelectedAdminRequestId] = useState<string | null>(null);
  const [adminNotesByRequestId, setAdminNotesByRequestId] = useState<Record<string, string>>({});
  const [changeMyCallOpen, setChangeMyCallOpen] = useState(false);
  const canEditCallAssignments = permissions?.canEditCallAssignments ?? false;
  const canShowAdminCallActions =
    canEditCallAssignments || permissions?.mode === "admin" || isAdmin;
  const canExportProgramCallCalendar =
    permissions?.canExportProgramCallCalendar ?? false;
  const canSyncProgramCalendar = permissions?.canSyncProgramCalendar ?? false;
  const canShowResidentChangeMyCall =
    permissions?.mode === "resident" &&
    !canShowAdminCallActions &&
    Boolean(data?.myRosterId) &&
    Boolean(permissions?.canRequestCoverage) &&
    Boolean(permissions?.canRespondToCoverageRequests);
  

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

useEffect(() => {
  if (!canExportProgramCallCalendar && exportScope === "program") {
    setExportScope("mine");
  }
}, [canExportProgramCallCalendar, exportScope]);

useEffect(() => {
  if (!canSyncProgramCalendar && googleSyncScope === "program") {
    setGoogleSyncScope("mine");
  }
}, [canSyncProgramCalendar, googleSyncScope]);

  const calls = useMemo(() => data?.calls ?? [], [data?.calls]);

  const swapRequests = useSwapRequests(data?.myRosterId ?? null);
  const pendingAdminRequests = useMemo(
    () =>
      swapRequests.adminPending.filter(
        (request) => request.status === "accepted_pending_admin"
      ),
    [swapRequests.adminPending]
  );
  const pendingAdminRequestsByCallId = useMemo(() => {
    const map = new Map<string, SwapRequestListItem>();

    for (const request of pendingAdminRequests) {
      const callId = request.requesterCall?.id;
      if (!callId) continue;
      map.set(callId, request);
    }

    return map;
  }, [pendingAdminRequests]);
  const residentPendingAdminCount = useMemo(
    () =>
      swapRequests.items.filter(
        (request) =>
          request.status === "accepted_pending_admin" &&
          (request.requester?.id === data?.myRosterId ||
            request.recipient?.id === data?.myRosterId)
      ).length,
    [data?.myRosterId, swapRequests.items]
  );
  const urgentIncomingRequest = useMemo(
    () => swapRequests.incoming[0] ?? null,
    [swapRequests.incoming]
  );

  // Auto-select the first pending admin request when none is selected
  useEffect(() => {
    if (!swapRequests.canReviewAdmin) return;
    const pending = swapRequests.adminPending;
    if (pending.length === 0) {
      setSelectedAdminRequestId(null);
      return;
    }
    if (selectedAdminRequestId && pending.some((r) => r.id === selectedAdminRequestId)) {
      return;
    }
    setSelectedAdminRequestId(pending[0]?.id ?? null);
  }, [swapRequests.canReviewAdmin, swapRequests.adminPending, selectedAdminRequestId]);

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

  const selectedDayCalls = useMemo(
    () => (selectedDateKey ? callsByDate.get(selectedDateKey) ?? [] : []),
    [callsByDate, selectedDateKey]
  );
  const callsById = useMemo(() => {
    return new Map(calls.map((call) => [call.id, call]));
  }, [calls]);

  const myCalls = calls.filter((call) => call.isMine);
  const nextMyCall =
    myCalls
      .filter((call) => call.callDate && call.callDate >= toDateKey(new Date()))
      .sort((a, b) => (a.callDate ?? "").localeCompare(b.callDate ?? ""))[0] ??
    null;

  // Smart default for mobile toggle: prefer "mine" when the user has calls in this month
  // This effect runs when the loaded calls for the visible month change.
  useEffect(() => {
    if (myCalls.length > 0) {
      setMobileCallView("mine");
    } else {
      setMobileCallView("program");
    }
  }, [myCalls.length]); // Only depend on count to avoid thrashing on every render

  const totalCallDays = calls.length;
  const myCallDays = myCalls.length;

  const residentOptions = useMemo(() => {
    const map = new Map<string, ResidentOption>();

    for (const resident of data?.residents ?? []) {
      map.set(resident.rosterId, resident);
    }

    for (const call of calls) {
      const rosterId = call.rosterId ?? call.membershipId;
      if (!rosterId || map.has(rosterId)) continue;

      map.set(rosterId, {
        rosterId,
        programMembershipId: call.programMembershipId ?? null,
        residentName: call.residentName,
        trainingLevel: call.trainingLevel,
        pgyYear: call.pgyYear ?? null,
        gradYear: call.gradYear ?? null,
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.residentName.localeCompare(b.residentName)
    );
  }, [calls, data?.residents]);

  async function refreshSwapRequests() {
    await swapRequests.refresh();
  }

  function handleSelectDate(dateKey: string) {
    setSelectedDateKey(dateKey);
  }

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
      programMembershipId?: string | null;
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

    return parseCallMutationResponse(response, "Failed to update call");
  }

  async function deleteCall(callId: string) {
    const response = await fetch(`/api/program/calls/${callId}`, {
      method: "DELETE",
      credentials: "include",
    });

    return parseCallMutationResponse(response, "Failed to delete call");
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

    return parseCallMutationResponse(response, "Failed to swap calls");
  }

  async function createProgramCall(payload: {
    rosterId: string;
    callDate: string;
    callType: string;
    programMembershipId?: string | null;
  }) {
    const response = await fetch("/api/program/calls", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rows: [
          {
            rosterId: payload.rosterId,
            membershipId: payload.programMembershipId ?? null,
            dates: [payload.callDate],
            callType: payload.callType,
          },
        ],
      }),
    });

    return parseCallMutationResponse(response, "Failed to create call");
  }

  function exportCalendar() {
  const scope =
    exportScope === "program" && !canExportProgramCallCalendar
      ? "mine"
      : exportScope;
  const range = getExportRange(exportRange, visibleMonth);

  const params = new URLSearchParams({
    monthStart: range.monthStart,
    monthEnd: range.monthEnd,
    scope,
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

    const scope =
      googleSyncScope === "program" && !canSyncProgramCalendar
        ? "mine"
        : googleSyncScope;
    const range = getAcademicYearRange(visibleMonth);

    const response = await fetch("/api/program/calls/google-sync", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scope,
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

    const scope =
      googleSyncScope === "program" && !canSyncProgramCalendar
        ? "mine"
        : googleSyncScope;
    const range = getAcademicYearRange(visibleMonth);

    const response = await fetch("/api/program/calls/google-sync", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scope,
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
    fromRosterId: string | null;
    toRosterId: string;
    toProgramMembershipId?: string | null;
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
        (resident) => resident.rosterId === payload.toRosterId
      );

      if (!targetResident) {
        throw new Error("Target resident could not be found.");
      }

      await patchCall(payload.callId, {
        rosterId: payload.toRosterId,
        programMembershipId:
          payload.toProgramMembershipId ?? targetResident.programMembershipId,
      });

      await refreshMonth();
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
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete call.");
      throw err;
    }
  }

  async function handleCreate(payload: {
    rosterId: string;
    callDate: string;
    callType: string;
    programMembershipId?: string | null;
  }) {
    try {
      setActionError(null);

      const targetResident = residentOptions.find(
        (resident) => resident.rosterId === payload.rosterId
      );

      if (!targetResident) {
        throw new Error("Target resident could not be found.");
      }

      await createProgramCall(payload);
      await refreshMonth();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create call.");
      throw err;
    }
  }

  return (
    <>
      <main className="min-w-0 overflow-x-clip text-slate-900">
        <section className="relative overflow-hidden px-4 pb-4 pt-5 sm:px-5 md:px-6 md:pb-5 md:pt-7 xl:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.08),transparent_16%)]" />

          <div className="relative mx-auto max-w-[1440px] 2xl:max-w-[1520px]">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-5 md:p-6"
            >
              <div className="flex flex-col gap-3 sm:gap-4">
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

                <div className="grid gap-3 lg:grid-cols-3">
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

        <section className="px-4 pb-6 sm:px-5 md:px-6 md:pb-8 xl:px-8">
          <div className="mx-auto max-w-[1440px] space-y-4 2xl:max-w-[1520px]">
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
              className="rounded-[1.75rem] border border-slate-200 bg-white p-3.5 shadow-xl sm:p-4 md:p-5"
            >
              {!canShowAdminCallActions ? (
                <div className="mb-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                        Coverage requests
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Quick summary only. Use the swap requests page for full details and responses.
                      </p>
                    </div>

                    <Link
                      href="/work/call/swaps"
                      className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Open coverage requests
                    </Link>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <CompactRequestCountChip
                      label="Needs response"
                      count={swapRequests.incoming.length}
                      href="/work/call/swaps"
                    />
                    <CompactRequestCountChip
                      label="Sent"
                      count={swapRequests.outgoing.filter((request) => request.status === "pending_recipient").length}
                      href="/work/call/swaps"
                    />
                    <CompactRequestCountChip
                      label="Pending admin"
                      count={residentPendingAdminCount}
                      href="/work/call/swaps"
                    />
                    <CompactRequestCountChip
                      label="Completed"
                      count={swapRequests.completed.length}
                      href="/work/call/swaps"
                    />
                  </div>

                  {urgentIncomingRequest ? (
                    <div className="mt-3 flex flex-col gap-3 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                          Action needed
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {(urgentIncomingRequest.requester?.fullName ?? "A resident")} asked you to cover{" "}
                          {formatShortDate(urgentIncomingRequest.requesterCall?.callDate)}
                        </p>
                        {swapRequests.incoming.length > 1 ? (
                          <p className="mt-1 text-xs text-slate-600">
                            +{swapRequests.incoming.length - 1} more waiting on you
                          </p>
                        ) : null}
                      </div>

                      <Link
                        href="/work/call/swaps"
                        className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                      >
                        Review
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {swapRequests.canReviewAdmin && pendingAdminRequests.length > 0 ? (
                <div className="mb-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                        Coverage requests need approval
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {pendingAdminRequests.length} coverage request
                        {pendingAdminRequests.length === 1 ? "" : "s"} need approval
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Pending requested changes are marked directly on the schedule.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push("/work/call/swaps?tab=admin")}
                      className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Review requests
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Mobile month selector + view toggle (Phase 3) */}
              <div className="mb-4 md:hidden">
                <MobileMonthSelector
                  activeLabel={monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
                  onPrevious={() =>
                    setVisibleMonth((prev) => {
                      const nextDate = new Date(prev.year, prev.monthIndex - 1, 1);
                      return {
                        year: nextDate.getFullYear(),
                        monthIndex: nextDate.getMonth(),
                      };
                    })
                  }
                  onNext={() =>
                    setVisibleMonth((prev) => {
                      const nextDate = new Date(prev.year, prev.monthIndex + 1, 1);
                      return {
                        year: nextDate.getFullYear(),
                        monthIndex: nextDate.getMonth(),
                      };
                    })
                  }
                  subtitle="Program call assignments"
                />

                {/* Mobile-only view toggle */}
                <div className="mt-3 flex rounded-full border border-slate-200 bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setMobileCallView("mine")}
                    className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                      mobileCallView === "mine"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    My Calls
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileCallView("program")}
                    className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                      mobileCallView === "program"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Program
                  </button>
                </div>
              </div>

              {/* Original desktop month navigation + header — hidden on mobile (we use MobileMonthSelector + toggle above) */}
              <div className="mb-4 hidden md:flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
                <div className="flex flex-wrap items-center gap-3">
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
  <NotificationBell />

<button
  type="button"
  onClick={() => setExportModalOpen(true)}
  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:border-emerald-300 hover:bg-emerald-100"
>
  <Download className="h-4 w-4" />
  Export
</button>

{canShowAdminCallActions ? (
  <Link
    href={swapRequests.canReviewAdmin ? "/work/call/swaps?tab=admin" : "/work/call/swaps"}
    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
  >
    View coverage requests
    {swapRequests.canReviewAdmin && pendingAdminRequests.length > 0 ? (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200">
        {pendingAdminRequests.length}
      </span>
    ) : null}
  </Link>
) : null}

{canShowResidentChangeMyCall ? (
  <button
    type="button"
    onClick={() => setChangeMyCallOpen(true)}
    className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-950 transition hover:border-sky-300 hover:bg-sky-100"
  >
    <RefreshCw className="h-4 w-4" />
    New Coverage Request
  </button>
) : null}

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

{canShowAdminCallActions ? (
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
) : null}

{canShowAdminCallActions ? (
  <button
    type="button"
    onClick={() => router.push("/work/call/add")}
    className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-950 transition hover:border-sky-300 hover:bg-sky-100"
  >
    <Plus className="h-4 w-4" />
    Add Call
  </button>
) : null}
</div>
              </div>

              <div className="mb-4 hidden md:flex flex-wrap items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
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

              {/* Desktop / tablet calendar grid (unchanged behavior) */}
              <div className="hidden md:block">
                <div
                  className={
                    editingCalendar ? "min-w-0 overflow-x-hidden" : "min-w-0 overflow-x-auto"
                  }
                >
                  <div
                    className={
                      editingCalendar
                        ? "min-w-0"
                        : "min-w-[960px] xl:min-w-[1080px] 2xl:min-w-0"
                    }
                  >
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
                        onCreate={handleCreate}
                      />
                    ) : (
                      <CallMonthCalendar
                        year={visibleMonth.year}
                        monthIndex={visibleMonth.monthIndex}
                        calls={calls}
                        loading={loading}
                        onSelectDate={handleSelectDate}
                        pendingSwapRequestsByCallId={
                          swapRequests.canReviewAdmin ? pendingAdminRequestsByCallId : undefined
                        }
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile-only agenda/list view (Phase 3) */}
              <div className="md:hidden">
                {editingCalendar ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                    <p className="font-semibold">Drag-and-drop editing is available on tablet and desktop.</p>
                    <p className="mt-2">Exit edit mode or use a larger screen to rearrange call assignments.</p>
                    <button
                      type="button"
                      onClick={() => setEditingCalendar(false)}
                      className="mt-4 rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Exit Edit Mode
                    </button>
                  </div>
                ) : (
                  <MobileProgramCallAgenda
                    calls={calls}
                    monthLabel={monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
                    viewMode={mobileCallView}
                    onDayClick={(dateKey) => {
                      // Reuse existing detail modal flow (safe, already works on mobile)
                      setSelectedDateKey(dateKey);
                    }}
                    loading={loading}
                  />
                )}
              </div>
            </motion.div>

            {swapRequests.error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {swapRequests.error}
              </div>
            ) : null}

            {swapRequests.loading ? (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading coverage requests...
              </div>
            ) : null}

            {swapRequests.canReviewAdmin ? (
              <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                <AdminSwapApprovalQueue
                  requests={swapRequests.adminPending}
                  currentRosterId={data?.myRosterId ?? null}
                  selectedRequestId={selectedAdminRequestId}
                  onSelectRequest={setSelectedAdminRequestId}
                  onViewDetails={setSelectedSwapRequestId}
                />
                <AdminApprovalWorkspace
                  request={
                    selectedAdminRequestId
                      ? (swapRequests.adminPending.find(
                          (r) => r.id === selectedAdminRequestId
                        ) ?? null)
                      : null
                  }
                  adminNotesByRequestId={adminNotesByRequestId}
                  onChangeAdminNote={(requestId, note) =>
                    setAdminNotesByRequestId((prev) => ({
                      ...prev,
                      [requestId]: note,
                    }))
                  }
                  onRequestUpdated={async () => {
                    await Promise.all([refreshSwapRequests(), refreshMonth()]);
                  }}
                  onViewDetails={setSelectedSwapRequestId}
                />
              </div>
            ) : null}
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
        {() => (
          <CallDayDetailsContent
            calls={selectedDayCalls}
            pendingSwapRequestsByCallId={
              swapRequests.canReviewAdmin ? pendingAdminRequestsByCallId : undefined
            }
            canApprovePendingRequests={swapRequests.canReviewAdmin}
            onPendingRequestUpdated={async () => {
              await Promise.all([refreshSwapRequests(), refreshMonth()]);
            }}
            onViewPendingRequest={setSelectedSwapRequestId}
          />
        )}
      </DayDetailsModal>

      <SwapRequestDetailDrawer
        open={canShowAdminCallActions && !!selectedSwapRequestId}
        requestId={selectedSwapRequestId}
        onClose={() => setSelectedSwapRequestId(null)}
        viewerMode="default"
      />

      {canShowResidentChangeMyCall ? (
        <ChangeMyCallModal
          open={changeMyCallOpen}
          onClose={() => setChangeMyCallOpen(false)}
          programId={data?.programId ?? null}
          currentRosterId={data?.myRosterId ?? null}
          calls={calls}
          residents={residentOptions}
          outgoingRequests={swapRequests.items.filter(
            (request) => request.requester?.id === data?.myRosterId
          )}
          initialYear={visibleMonth.year}
          initialMonthIndex={visibleMonth.monthIndex}
          onCreated={async () => {
            await refreshSwapRequests();
          }}
        />
      ) : null}

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
              {canExportProgramCallCalendar
                ? "Export call schedule"
                : "Export my call calendar"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {canExportProgramCallCalendar
                ? "Download personal or program-wide .ics files for Apple Calendar, Google Calendar, Outlook, or another calendar app."
                : "Download an .ics calendar file that can be imported into Apple Calendar, Google Calendar, Outlook, or another calendar app."}
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

            {canExportProgramCallCalendar ? (
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
            ) : null}
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
              {canSyncProgramCalendar
                ? "Program calendar sync"
                : "Google Calendar sync"}
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              {googleConnected ? "Set up calendar sync" : "Allow calendar access"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {googleConnected
                ? canSyncProgramCalendar
                  ? "Choose how SnapOrtho should sync program call assignments into Google Calendar for administrative operations."
                  : "Choose how SnapOrtho should sync your call assignments into your connected Google Calendar."
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

              {canSyncProgramCalendar ? (
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
              ) : null}
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
