"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import IncomingSwapRequestsPanel from "@/components/workspace/call-swaps/IncomingSwapRequestsPanel";
import OutgoingSwapRequestsPanel from "@/components/workspace/call-swaps/OutgoingSwapRequestsPanel";
import AdminSwapApprovalQueue from "@/components/workspace/call-swaps/AdminSwapApprovalQueue";
import AdminRequestCalendar from "@/components/workspace/call-swaps/AdminRequestCalendar";
import AdminApprovalWorkspace from "@/components/workspace/call-swaps/AdminApprovalWorkspace";
import SwapRequestDetailDrawer from "@/components/workspace/call-swaps/SwapRequestDetailDrawer";
import SwapRequestCalendarContext from "@/components/workspace/call-swaps/SwapRequestCalendarContext";
import { useRespondToSwapRequest } from "@/hooks/useRespondToSwapRequest";
import { useCancelSwapRequest } from "@/hooks/useCancelSwapRequest";
import { useSwapRequests } from "@/hooks/useSwapRequests";
import type { SwapRequestListItem } from "@/lib/workspace/call-swaps/types";
import { useWorkspaceInfo } from "@/lib/workspace/use-workspace-info";
import { canApproveSwapRequest } from "@/lib/workspace/call-swaps/permissions";
import type { CalendarCallItem } from "@/lib/workspace/call-swaps/calendar-overlay-utils";
import { computeAllProjectedValidations } from "@/lib/workspace/call-swaps/projected-schedule";
import type { RuleLike } from "@/lib/workspace/call/rule-evaluator";
import type { ProgramCallItem } from "@/components/workspace/call/callmonthcalendar";

const ChangeMyCallModal = dynamic(
  () => import("@/components/workspace/call-swaps/ChangeMyCallModal"),
  { ssr: false }
);

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type AdminCoverageView = "admin_approvals" | "approved_requests" | "personal_requests";
type ResidentInboxTab = "needs_response" | "sent" | "pending_admin" | "completed";

type ResidentOption = {
  rosterId: string;
  programMembershipId: string | null;
  residentName: string;
  trainingLevel: string | null;
  pgyYear: number | null;
  gradYear: number | null;
};

function SegmentedButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-slate-950 text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
      {typeof count === "number" ? (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
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

function formatCallDate(dateString: string | null | undefined) {
  if (!dateString) return "Date unavailable";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatRequestDateTime(dateString: string | null | undefined) {
  if (!dateString) return "Date unavailable";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatApprovedRequestSummary(request: SwapRequestListItem): string {
  const requesterName = request.requester?.fullName ?? "Unknown resident";
  const recipientName = request.recipient?.fullName ?? "Unknown resident";
  const callDate = formatCallDate(request.requesterCall?.callDate);

  if (request.request_type === "trade" && request.recipientCall) {
    const tradeDateB = formatCallDate(request.recipientCall.callDate);
    return `${requesterName} and ${recipientName} swapped ${callDate} and ${tradeDateB}`;
  }

  return `${recipientName} covered ${requesterName}'s ${callDate} call`;
}

function getResidentStageConfig(status: SwapRequestListItem["status"]) {
  switch (status) {
    case "pending_recipient":
      return {
        label: "Waiting for recipient",
        className: "bg-amber-100 text-amber-800",
      };
    case "accepted_pending_admin":
      return {
        label: "Accepted — pending admin approval",
        className: "bg-sky-100 text-sky-800",
      };
    case "approved":
      return {
        label: "Approved — schedule updated",
        className: "bg-emerald-100 text-emerald-800",
      };
    case "declined":
      return {
        label: "Declined",
        className: "bg-rose-100 text-rose-800",
      };
    case "rejected":
      return {
        label: "Rejected by admin",
        className: "bg-rose-100 text-rose-800",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "bg-slate-100 text-slate-700",
      };
    case "expired":
      return {
        label: "Expired",
        className: "bg-slate-100 text-slate-700",
      };
  }
}

function CompactStatusPill({ request }: { request: SwapRequestListItem }) {
  const config: Record<
    SwapRequestListItem["status"],
    { label: string; className: string }
  > = {
    pending_recipient: {
      label: "Needs response",
      className: "bg-amber-100 text-amber-800",
    },
    accepted_pending_admin: {
      label: "Pending admin",
      className: "bg-sky-100 text-sky-800",
    },
    approved: {
      label: "Approved",
      className: "bg-emerald-100 text-emerald-800",
    },
    declined: {
      label: "Declined",
      className: "bg-rose-100 text-rose-800",
    },
    rejected: {
      label: "Rejected",
      className: "bg-rose-100 text-rose-800",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-slate-100 text-slate-700",
    },
    expired: {
      label: "Expired",
      className: "bg-slate-100 text-slate-700",
    },
  };
  const item = config[request.status];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${item.className}`}
    >
      {item.label}
    </span>
  );
}

function getResidentRequestSummaryLine(
  request: SwapRequestListItem,
  currentRosterId: string | null
) {
  const callType = request.requesterCall?.callType ?? "Call";
  if (request.status === "accepted_pending_admin") {
    if (request.requester?.id === currentRosterId) {
      return `${request.recipient?.fullName ?? "Recipient"} accepted your ${callType.toLowerCase()} request`;
    }
    return `You accepted this ${callType.toLowerCase()} request`;
  }

  if (request.status === "approved") {
    return "Approved schedule change";
  }

  if (request.status === "declined") {
    return "Declined request";
  }

  if (request.status === "rejected") {
    return "Rejected by admin";
  }

  if (request.status === "cancelled") {
    return "Cancelled request";
  }

  if (request.status === "expired") {
    return "Expired request";
  }

  return request.recipient?.id === currentRosterId
    ? `Asked you to cover ${callType}`
    : `You asked for ${callType} coverage`;
}

function CompactRequestInboxItem({
  request,
  currentRosterId,
  selected,
  onSelect,
}: {
  request: SwapRequestListItem;
  currentRosterId: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const primaryName =
    request.requester?.id === currentRosterId
      ? request.recipient?.fullName ?? "Unknown resident"
      : request.requester?.fullName ?? "Unknown resident";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[1.1rem] border px-3 py-3 text-left transition ${
        selected
          ? "border-sky-300 bg-sky-50 ring-2 ring-sky-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">{primaryName}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-600">
            {formatCallDate(request.requesterCall?.callDate)} •{" "}
            {request.requesterCall?.callType ?? "Call"}
          </p>
        </div>
        <CompactStatusPill request={request} />
      </div>
      <p className="mt-2 line-clamp-1 text-xs text-slate-600">
        {getResidentRequestSummaryLine(request, currentRosterId)}
      </p>
    </button>
  );
}

function RequestPreviewWorkspace({
  request,
  currentRosterId,
  responseNote,
  onChangeResponseNote,
  onAccept,
  onDecline,
  onCancel,
  actionLoading,
  actionError,
  actionSuccess,
  onViewDetails,
}: {
  request: SwapRequestListItem | null;
  currentRosterId: string | null;
  responseNote: string;
  onChangeResponseNote: (value: string) => void;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  actionLoading: boolean;
  actionError: string | null;
  actionSuccess: string | null;
  onViewDetails: () => void;
}) {
  const [showActionNoteEditor, setShowActionNoteEditor] = useState(false);
  const canActOnRequest = Boolean(
    request &&
      ((request.recipient?.id === currentRosterId &&
        request.status === "pending_recipient") ||
        (request.requester?.id === currentRosterId &&
          (request.status === "pending_recipient" ||
            request.status === "accepted_pending_admin")))
  );

  useEffect(() => {
    if (!canActOnRequest) {
      setShowActionNoteEditor(false);
      return;
    }

    if (!responseNote.trim()) {
      setShowActionNoteEditor(false);
    }
  }, [canActOnRequest, responseNote]);

  if (!request) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Decision workspace
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
          Select a request
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Pick a request from the inbox to review the schedule impact, see the month context, and respond.
        </p>
      </div>
    );
  }

  const isIncoming = request.recipient?.id === currentRosterId;
  const isTrade = request.request_type === "trade" && request.recipientCall;
  const canAcceptDecline =
    isIncoming && request.status === "pending_recipient";
  const canCancel =
    request.requester?.id === currentRosterId &&
    (request.status === "pending_recipient" ||
      request.status === "accepted_pending_admin");
  const stage = getResidentStageConfig(request.status);
  const requestedAt = formatRequestDateTime(request.created_at);
  const statusUpdatedAt =
    request.updated_at && request.updated_at !== request.created_at
      ? formatRequestDateTime(request.updated_at)
      : null;
  const actionNoteLabel = canCancel
    ? "Optional cancel note"
    : "Optional response note";

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
            {request.request_type === "trade" ? "Swap request" : "Coverage request"}
          </p>
          <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-950 md:text-2xl">
            {formatCallDate(request.requesterCall?.callDate)} —{" "}
            {request.requesterCall?.callType ?? "Call"}
          </h2>
          <div className="mt-2 space-y-1 text-xs text-slate-500">
            <p>Requested: {requestedAt}</p>
            {request.status === "accepted_pending_admin" && statusUpdatedAt ? (
              <p>Accepted: {statusUpdatedAt}</p>
            ) : null}
            {(request.status === "approved" || request.status === "rejected") &&
            statusUpdatedAt ? (
              <p>Admin decision: {statusUpdatedAt}</p>
            ) : null}
          </div>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${stage.className}`}
        >
          {stage.label}
        </span>
      </div>

      <div className="mt-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-3.5 py-3">
        
        {!isTrade ? (
          <p className="mt-1 text-sm text-slate-600">
            No return shift — only this call changes hands.
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-600">
            Both calls exchange owners if approved.
          </p>
        )}
      </div>

      {actionSuccess ? (
        <div className="mt-3 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {actionSuccess}
        </div>
      ) : null}

      {actionError ? (
        <div className="mt-3 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canAcceptDecline ? (
          <>
            <button
              type="button"
              onClick={onAccept}
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Accept request
            </button>
            <button
              type="button"
              onClick={onDecline}
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Decline
            </button>
          </>
        ) : null}

        {canCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={actionLoading}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Cancel request
          </button>
        ) : null}

        {(canAcceptDecline || canCancel) && !showActionNoteEditor ? (
          <button
            type="button"
            onClick={() => setShowActionNoteEditor(true)}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Add note
          </button>
        ) : null}

        {request.requester?.id === currentRosterId &&
        !["approved", "rejected", "declined", "cancelled", "expired"].includes(
          request.status
        ) ? (
          <button
            type="button"
            disabled
            title="Editing the requester note needs backend support."
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400"
          >
            Edit note
          </button>
        ) : null}

        <button
          type="button"
          onClick={onViewDetails}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View details
        </button>
      </div>

      {(canAcceptDecline || canCancel) && showActionNoteEditor ? (
        <div className="mt-4 rounded-[1.1rem] border border-slate-200 bg-slate-50 p-3.5">
          <label className="block text-sm font-semibold text-slate-900">
            {actionNoteLabel}
          </label>
          <textarea
            value={responseNote}
            onChange={(event) => onChangeResponseNote(event.target.value)}
            placeholder="Optional note"
            className="mt-2 min-h-[82px] w-full rounded-[1rem] border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowActionNoteEditor(false)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Done
            </button>
            {responseNote ? (
              <button
                type="button"
                onClick={() => {
                  onChangeResponseNote("");
                  setShowActionNoteEditor(false);
                }}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear note
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// useAdminProgramRules
//
// Fetches call rules for projected-schedule validation. Only admins have the
// canManageCallRules permission; for all others the endpoint returns an error
// and the hook falls back to an empty array (→ "No conflicts detected" is
// shown, which is always the safe path).
// ---------------------------------------------------------------------------

function useAdminProgramRules(): { rules: RuleLike[]; loading: boolean } {
  const [rules, setRules] = useState<RuleLike[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch("/api/program/call-rules", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return [] as RuleLike[];
        const data = (await res.json().catch(() => null)) as
          | { rules?: RuleLike[] }
          | null;
        return data?.rules ?? ([] as RuleLike[]);
      })
      .then((fetched) => {
        if (!cancelled) setRules(fetched);
      })
      .catch(() => {
        if (!cancelled) setRules([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []); // Fetch once on mount

  return { rules, loading };
}

export default function CallSwapsDashboardClient() {
  const now = new Date();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() ?? "";
  const requestedTab = searchParams?.get("tab");
  const {
    programId: workspaceProgramId,
    workspaceInfo,
    loading: workspaceLoading,
    error: workspaceError,
  } =
    useWorkspaceInfo();
  const rosterId = workspaceInfo?.roster?.id ?? null;
  const swapRequests = useSwapRequests(rosterId);
  const { respond, loadingRequestId: respondingRequestId, error: respondError, setError: setRespondError } =
    useRespondToSwapRequest();
  const { cancelRequest, loadingRequestId: cancellingRequestId, error: cancelError, setError: setCancelError } =
    useCancelSwapRequest();
  const [residentTab, setResidentTab] = useState<ResidentInboxTab>("needs_response");
  const [selectedSwapRequestId, setSelectedSwapRequestId] = useState<string | null>(
    new URLSearchParams(searchParamsString).get("swapId")
  );
  const [changeMyCallOpen, setChangeMyCallOpen] = useState(false);
  const [detailDrawerRequestId, setDetailDrawerRequestId] = useState<string | null>(
    new URLSearchParams(searchParamsString).get("swapId")
  );
  const [responseNote, setResponseNote] = useState("");
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [modalCalls, setModalCalls] = useState<ProgramCallItem[]>([]);
  const [modalResidents, setModalResidents] = useState<ResidentOption[]>([]);
  const [selectedAdminRequestId, setSelectedAdminRequestId] = useState<string | null>(null);
  const [adminNotesByRequestId, setAdminNotesByRequestId] = useState<Record<string, string>>({});
  const [adminPreviewMode, setAdminPreviewMode] = useState<"current" | "preview">("current");
  const [adminCalendarRefreshKey, setAdminCalendarRefreshKey] = useState(0);
  const [adminView, setAdminView] = useState<AdminCoverageView>(() => {
    if (requestedTab === "approved") return "approved_requests";
    if (requestedTab === "personal") return "personal_requests";
    // "admin" (legacy) and "admin_approvals" both map to the approvals view
    return "admin_approvals";
  });

  // Projected-schedule validation state
  const { rules: adminProgramRules } = useAdminProgramRules();
  const [adminCalendarCalls, setAdminCalendarCalls] = useState<CalendarCallItem[]>([]);

  // Stable callback — passed to AdminRequestCalendar so it doesn't trigger
  // unnecessary re-mounts when the parent re-renders.
  const handleAdminCallsLoaded = useCallback((calls: CalendarCallItem[]) => {
    setAdminCalendarCalls(calls);
  }, []);

  // Recompute validation whenever the calendar data, pending requests, or
  // program rules change. Empty calls → skip (no data yet).
  const adminValidation = useMemo(() => {
    if (adminCalendarCalls.length === 0 || swapRequests.adminPending.length === 0) {
      return null;
    }
    return computeAllProjectedValidations({
      requests: swapRequests.adminPending,
      allCalls: adminCalendarCalls,
      programRules: adminProgramRules,
    });
  }, [adminCalendarCalls, swapRequests.adminPending, adminProgramRules]);

  // Per-request validation for the currently selected request
  const selectedRequestValidation = useMemo(() => {
    if (!selectedAdminRequestId || !adminValidation) return null;
    return (
      adminValidation.results.find((r) => r.requestId === selectedAdminRequestId) ??
      null
    );
  }, [selectedAdminRequestId, adminValidation]);

  // Program-wide approved requests — available to admins because view=all returns
  // all program items (getSwapRequestsForProgram) when canApproveSwapRequest is true.
  // No new backend query needed.
  const programApprovedRequests = useMemo(
    () => swapRequests.items.filter((r) => r.status === "approved"),
    [swapRequests.items]
  );

  const personalActiveCount = swapRequests.incoming.length + swapRequests.outgoing.length;

  const modalInitialYear = now.getFullYear();
  const modalInitialMonthIndex = now.getMonth();

  useEffect(() => {
    if (!changeMyCallOpen || !workspaceProgramId) return;

    let cancelled = false;
    const monthStart = new Date(
      Date.UTC(modalInitialYear, modalInitialMonthIndex, 1)
    )
      .toISOString()
      .slice(0, 10);
    const monthEnd = new Date(
      Date.UTC(modalInitialYear, modalInitialMonthIndex + 1, 0)
    )
      .toISOString()
      .slice(0, 10);

    async function loadInitialModalMonth() {
      try {
        const response = await fetch(
          `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
          {
            credentials: "include",
          }
        );

        const payload = (await response.json().catch(() => null)) as
          | { calls?: ProgramCallItem[]; residents?: ResidentOption[] }
          | { error?: string }
          | null;

        if (!response.ok || !payload || !("calls" in payload)) {
          return;
        }

        if (cancelled) return;
        setModalCalls(payload.calls ?? []);
        setModalResidents(payload.residents ?? []);
      } catch {
        if (cancelled) return;
      }
    }

    void loadInitialModalMonth();

    return () => {
      cancelled = true;
    };
  }, [changeMyCallOpen, modalInitialMonthIndex, modalInitialYear, workspaceProgramId]);

  const approvalAccess = useMemo(
    () =>
      canApproveSwapRequest({
        rosterId,
        rosterRole: workspaceInfo?.roster?.role ?? null,
        membershipRole: workspaceInfo?.membership?.role ?? null,
        isRosterAdmin: workspaceInfo?.roster?.isAdmin ?? false,
      }).canApprove,
    [rosterId, workspaceInfo?.membership?.role, workspaceInfo?.roster?.isAdmin, workspaceInfo?.roster?.role]
  );

  // Allow any user with the canRequestCoverage permission to open the modal —
  // admins use it from the Personal Requests tab; residents use it from their inbox.
  const canOpenChangeMyCallModal =
    workspaceInfo?.permissions?.canRequestCoverage ?? false;

  const statCards = approvalAccess
    ? [
        {
          title: "Admin Approvals",
          value: String(swapRequests.adminPending.length),
          subtitle: "Accepted requests awaiting approval",
        },
        {
          title: "Approved Requests",
          value: String(programApprovedRequests.length),
          subtitle: "Coverage and swap changes finalized program-wide",
        },
        {
          title: "Personal Active",
          value: String(personalActiveCount),
          subtitle: "Requests involving you personally",
        },
      ]
    : [
        {
          title: "Incoming",
          value: String(swapRequests.incoming.length),
          subtitle: "Coverage requests waiting on your response",
        },
        {
          title: "Outgoing",
          value: String(swapRequests.outgoing.length),
          subtitle: "Requests you have sent and are still active",
        },
        {
          title: "Completed",
          value: String(swapRequests.completed.length),
          subtitle: "Relevant requests with a final status",
        },
      ];

  const selectedRequest =
    swapRequests.items.find((request) => request.id === selectedSwapRequestId) ??
    null;

  const residentPendingAdmin = useMemo(
    () =>
      swapRequests.items.filter(
        (request) =>
          request.status === "accepted_pending_admin" &&
          (request.requester?.id === rosterId || request.recipient?.id === rosterId)
      ),
    [rosterId, swapRequests.items]
  );

  const residentCompleted = useMemo(
    () =>
      swapRequests.completed.filter(
        (request) =>
          request.requester?.id === rosterId || request.recipient?.id === rosterId
      ),
    [rosterId, swapRequests.completed]
  );

  const residentInboxItems = useMemo(() => {
    if (residentTab === "needs_response") return swapRequests.incoming;
    if (residentTab === "sent") {
      return swapRequests.outgoing.filter((request) => request.status === "pending_recipient");
    }
    if (residentTab === "pending_admin") return residentPendingAdmin;
    return residentCompleted;
  }, [
    residentCompleted,
    residentPendingAdmin,
    residentTab,
    swapRequests.incoming,
    swapRequests.outgoing,
  ]);

  const actionLoadingId = respondingRequestId ?? cancellingRequestId;
  const actionError = respondError ?? cancelError;
  const selectedActionLoading = actionLoadingId === selectedRequest?.id;

  useEffect(() => {
    const swapId = new URLSearchParams(searchParamsString).get("swapId");
    if (!swapId) return;
    setSelectedSwapRequestId(swapId);
    setDetailDrawerRequestId(swapId);
  }, [searchParamsString]);

  // Sync admin view from URL — covers external links and browser back/forward
  useEffect(() => {
    if (!approvalAccess) return;
    if (requestedTab === "admin" || requestedTab === "admin_approvals") {
      setAdminView("admin_approvals");
    } else if (requestedTab === "approved") {
      setAdminView("approved_requests");
    } else if (requestedTab === "personal") {
      setAdminView("personal_requests");
    }
  }, [requestedTab, approvalAccess]);

  useEffect(() => {
    if (approvalAccess || residentInboxItems.length === 0) return;
    if (selectedSwapRequestId && residentInboxItems.some((item) => item.id === selectedSwapRequestId)) {
      return;
    }
    const nextId = residentInboxItems[0]?.id ?? null;
    setSelectedSwapRequestId(nextId);
  }, [approvalAccess, residentInboxItems, selectedSwapRequestId]);

  // Auto-select the first pending admin request when the admin tab is active
  // and nothing is selected (or the previously selected request was resolved).
  useEffect(() => {
    if (!approvalAccess) return;
    const pending = swapRequests.adminPending;
    if (pending.length === 0) {
      setSelectedAdminRequestId(null);
      return;
    }
    if (selectedAdminRequestId && pending.some((r) => r.id === selectedAdminRequestId)) {
      return;
    }
    setSelectedAdminRequestId(pending[0]?.id ?? null);
  }, [approvalAccess, swapRequests.adminPending, selectedAdminRequestId]);

  function handleSelectAdminView(view: AdminCoverageView) {
    setAdminView(view);
    const params = new URLSearchParams(searchParamsString);
    // Map to short URL keys; "admin" is kept as legacy for admin_approvals
    const urlTab =
      view === "admin_approvals"
        ? "admin"
        : view === "approved_requests"
        ? "approved"
        : "personal";
    params.set("tab", urlTab);
    router.replace(`/work/call/swaps?${params.toString()}`, { scroll: false });
  }

  function handleOpenDetails(requestId: string) {
    setSelectedSwapRequestId(requestId);
    setDetailDrawerRequestId(requestId);
    const params = new URLSearchParams(searchParamsString);
    params.set("swapId", requestId);
    router.replace(`/work/call/swaps?${params.toString()}`, { scroll: false });
  }

  function handleSelectRequest(requestId: string) {
    setSelectedSwapRequestId(requestId);
  }

  function handleCloseDetails() {
    setDetailDrawerRequestId(null);
    const params = new URLSearchParams(searchParamsString);
    params.delete("swapId");
    const nextQuery = params.toString();
    router.replace(
      nextQuery ? `/work/call/swaps?${nextQuery}` : "/work/call/swaps",
      { scroll: false }
    );
  }

  async function handleAcceptSelected() {
    if (!selectedRequest) return;
    try {
      setRespondError(null);
      setCancelError(null);
      setActionSuccessMessage(null);
      await respond({
        requestId: selectedRequest.id,
        decision: "accept",
        note: responseNote.trim() || null,
      });
      setActionSuccessMessage(
        "Accepted. This request now needs admin approval before the official schedule changes."
      );
      setResponseNote("");
      await swapRequests.refresh();
    } catch {
      // hook manages error state
    }
  }

  async function handleDeclineSelected() {
    if (!selectedRequest) return;
    try {
      setRespondError(null);
      setCancelError(null);
      setActionSuccessMessage(null);
      await respond({
        requestId: selectedRequest.id,
        decision: "decline",
        note: responseNote.trim() || null,
      });
      setActionSuccessMessage(
        selectedRequest.request_type === "trade"
          ? "Swap request declined."
          : "Coverage request declined."
      );
      setResponseNote("");
      await swapRequests.refresh();
    } catch {
      // hook manages error state
    }
  }

  async function handleCancelSelected() {
    if (!selectedRequest) return;
    try {
      setRespondError(null);
      setCancelError(null);
      setActionSuccessMessage(null);
      await cancelRequest({
        requestId: selectedRequest.id,
        note: responseNote.trim() || null,
      });
      setActionSuccessMessage(
        selectedRequest.request_type === "trade"
          ? "Swap request cancelled."
          : "Coverage request cancelled."
      );
      setResponseNote("");
      await swapRequests.refresh();
    } catch {
      // hook manages error state
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
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href="/work/call"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200 transition hover:bg-white/10"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Call Hub
                    </Link>
                    <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                      Coverage Requests
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                      Track direct coverage requests from response through final approval.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                      Official schedule changes only after admin approval.
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-4">
                  {statCards.map((card) => (
                    <StatCard
                      key={card.title}
                      title={card.title}
                      value={card.value}
                      subtitle={card.subtitle}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-4 pb-6 sm:px-5 md:px-6 md:pb-8 xl:px-8">
          <div className="mx-auto max-w-[1440px] space-y-4 2xl:max-w-[1520px]">
            {workspaceError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {workspaceError}
              </div>
            ) : null}

            {swapRequests.error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>{swapRequests.error}</span>
                  <button
                    type="button"
                    onClick={() => void swapRequests.refresh()}
                    className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : null}

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl sm:p-5"
            >
              {approvalAccess ? (
                <div className="flex flex-col gap-4">
                  {/* ── Admin nav: primary workflow left, personal right ── */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <SegmentedButton
                        active={adminView === "admin_approvals"}
                        label="Admin Approvals"
                        count={swapRequests.adminPending.length}
                        onClick={() => handleSelectAdminView("admin_approvals")}
                      />
                      <SegmentedButton
                        active={adminView === "approved_requests"}
                        label="Approved Requests"
                        count={programApprovedRequests.length}
                        onClick={() => handleSelectAdminView("approved_requests")}
                      />
                    </div>
                    <div>
                      <SegmentedButton
                        active={adminView === "personal_requests"}
                        label="Personal Requests"
                        count={personalActiveCount || undefined}
                        onClick={() => handleSelectAdminView("personal_requests")}
                      />
                    </div>
                  </div>

                  {(workspaceLoading || swapRequests.loading) && !swapRequests.items.length ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading swap requests...
                    </div>
                  ) : null}

                  {/* ── Admin Approvals ──────────────────────────────── */}
                  {adminView === "admin_approvals" ? (
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-950">
                          Admin Approvals
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                          Review accepted coverage and swap requests before they update the official schedule.
                        </p>
                      </div>

                      {swapRequests.adminPending.length === 0 ? (
                        <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                          No requests awaiting admin approval.
                        </div>
                      ) : (
                        <>
                          {/* Preview mode toggle */}
                          <div className="flex items-center gap-2 px-1">
                            <div className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5">
                              <button
                                type="button"
                                onClick={() => setAdminPreviewMode("current")}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                  adminPreviewMode === "current"
                                    ? "border border-slate-200 bg-white text-slate-950 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                }`}
                              >
                                Current schedule
                              </button>
                              <button
                                type="button"
                                onClick={() => setAdminPreviewMode("preview")}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                  adminPreviewMode === "preview"
                                    ? "border border-amber-300 bg-amber-100 text-amber-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                }`}
                              >
                                Preview if all approved
                              </button>
                            </div>
                          </div>

                          {/* Preview banner */}
                          {adminPreviewMode === "preview" ? (
                            <div className="flex items-start gap-3 rounded-[1.25rem] border border-amber-300 bg-amber-50 px-4 py-3">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                              <div>
                                <p className="text-sm font-bold text-amber-900">
                                  Preview only
                                </p>
                                <p className="mt-0.5 text-xs leading-5 text-amber-700">
                                  Showing the schedule if all pending admin requests were approved. Official schedule updates only after individual approval.
                                </p>
                              </div>
                            </div>
                          ) : null}

                          {/* Aggregate validation banner */}
                          {adminValidation && adminValidation.requestsWithIssues > 0 ? (
                            <div className="flex items-start gap-3 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                              <div>
                                <p className="text-sm font-bold text-rose-900">
                                  {adminValidation.requestsWithIssues} of{" "}
                                  {adminValidation.totalRequests} pending{" "}
                                  {adminValidation.totalRequests === 1 ? "request has" : "requests have"}{" "}
                                  detected scheduling issues
                                </p>
                                <p className="mt-0.5 text-xs leading-5 text-rose-700">
                                  Select each request to review conflict details. Approval is still available — validation is informational only.
                                </p>
                              </div>
                            </div>
                          ) : null}

                          {/* Approval workflow — queue (narrow left) + workspace (wide right) */}
                          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                            <AdminSwapApprovalQueue
                              requests={swapRequests.adminPending}
                              currentRosterId={rosterId}
                              selectedRequestId={selectedAdminRequestId}
                              onSelectRequest={setSelectedAdminRequestId}
                              onViewDetails={handleOpenDetails}
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
                                if (process.env.NODE_ENV !== "production") {
                                  console.info(
                                    "[admin-approval-refresh] onRequestUpdated.start",
                                    {
                                      adminPendingBefore: swapRequests.adminPending.length,
                                      allItemsBefore: swapRequests.items.length,
                                      completedBefore: swapRequests.completed.length,
                                      selectedAdminRequestId,
                                      calendarRefreshKeyBefore: adminCalendarRefreshKey,
                                    }
                                  );
                                }
                                await swapRequests.refresh();
                                setAdminCalendarRefreshKey((k) => k + 1);
                                if (process.env.NODE_ENV !== "production") {
                                  console.info(
                                    "[admin-approval-refresh] onRequestUpdated.done — calendar refresh key incremented"
                                  );
                                }
                              }}
                              onViewDetails={handleOpenDetails}
                              previewMode={adminPreviewMode}
                              validation={selectedRequestValidation}
                            />
                          </div>

                          {/* Schedule context — full-width calendar below the approval workflow */}
                          <AdminRequestCalendar
                            requests={swapRequests.adminPending}
                            selectedRequestId={selectedAdminRequestId}
                            onSelectRequest={setSelectedAdminRequestId}
                            onCallsLoaded={handleAdminCallsLoaded}
                            previewMode={adminPreviewMode}
                            refreshKey={adminCalendarRefreshKey}
                          />
                        </>
                      )}
                    </div>
                  ) : null}

                  {/* ── Approved Requests ────────────────────────────── */}
                  {adminView === "approved_requests" ? (
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                            Admin log
                          </p>
                          <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-950">
                            Approved Requests
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Log of approved coverage and swap changes.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {programApprovedRequests.length === 0 ? (
                          <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                            No approved coverage or swap requests yet.
                          </div>
                        ) : (
                          programApprovedRequests.map((request) => (
                            <div
                              key={request.id}
                              className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">
                                  {formatApprovedRequestSummary(request)}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {request.request_type === "trade" ? "Swap" : "Coverage"}{" "}
                                  &middot;{" "}
                                  {formatRequestDateTime(request.updated_at)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(request.id)}
                                className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                View details
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* ── Personal Requests ────────────────────────────── */}
                  {adminView === "personal_requests" ? (
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-bold tracking-tight text-slate-950">
                            Personal Requests
                          </h2>
                          <p className="mt-0.5 text-sm text-slate-500">
                            Coverage and swap requests involving you personally.
                          </p>
                        </div>
                        {canOpenChangeMyCallModal ? (
                          <button
                            type="button"
                            onClick={() => setChangeMyCallOpen(true)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            <Plus className="h-4 w-4" />
                            New Coverage Request
                          </button>
                        ) : null}
                      </div>

                      {/* Sent to you + Sent by you side-by-side on large screens */}
                      <div className="grid gap-4 xl:grid-cols-2">
                        <div>
                          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Sent to you
                          </p>
                          <IncomingSwapRequestsPanel
                            requests={swapRequests.incoming}
                            currentRosterId={rosterId}
                            onRequestUpdated={swapRequests.refresh}
                            onViewDetails={handleOpenDetails}
                            selectedRequestId={selectedSwapRequestId}
                          />
                        </div>
                        <div>
                          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Sent by you
                          </p>
                          <OutgoingSwapRequestsPanel
                            activeRequests={swapRequests.outgoing}
                            completedRequests={residentCompleted}
                            currentRosterId={rosterId}
                            onRequestUpdated={swapRequests.refresh}
                            onViewDetails={handleOpenDetails}
                            selectedRequestId={selectedSwapRequestId}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                  <div className="min-h-0 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3 px-2 py-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Request inbox
                        </p>
                        <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">
                          Resident requests
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        {!approvalAccess && canOpenChangeMyCallModal ? (
                          <button
                            type="button"
                            onClick={() => setChangeMyCallOpen(true)}
                            title="New Coverage Request"
                            className="inline-flex items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            New
                          </button>
                        ) : null}
                        {(workspaceLoading || swapRequests.loading) && !swapRequests.items.length ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <SegmentedButton
                        active={residentTab === "needs_response"}
                        label="Needs response"
                        count={swapRequests.incoming.length}
                        onClick={() => setResidentTab("needs_response")}
                      />
                      <SegmentedButton
                        active={residentTab === "sent"}
                        label="Sent"
                        count={swapRequests.outgoing.filter((request) => request.status === "pending_recipient").length}
                        onClick={() => setResidentTab("sent")}
                      />
                      <SegmentedButton
                        active={residentTab === "pending_admin"}
                        label="Pending admin"
                        count={residentPendingAdmin.length}
                        onClick={() => setResidentTab("pending_admin")}
                      />
                      <SegmentedButton
                        active={residentTab === "completed"}
                        label="Completed"
                        count={residentCompleted.length}
                        onClick={() => setResidentTab("completed")}
                      />
                    </div>

                    <div className="mt-4 max-h-[78vh] space-y-2 overflow-y-auto pr-1">
                      {residentInboxItems.length === 0 ? (
                        <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                          No requests in this inbox.
                        </div>
                      ) : (
                        residentInboxItems.map((request) => (
                          <CompactRequestInboxItem
                            key={request.id}
                            request={request}
                            currentRosterId={rosterId}
                            selected={selectedSwapRequestId === request.id}
                            onSelect={() => handleSelectRequest(request.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <RequestPreviewWorkspace
                      request={selectedRequest}
                      currentRosterId={rosterId}
                      responseNote={responseNote}
                      onChangeResponseNote={setResponseNote}
                      onAccept={() => void handleAcceptSelected()}
                      onDecline={() => void handleDeclineSelected()}
                      onCancel={() => void handleCancelSelected()}
                      actionLoading={selectedActionLoading}
                      actionError={actionError}
                      actionSuccess={actionSuccessMessage}
                      onViewDetails={() => selectedRequest && handleOpenDetails(selectedRequest.id)}
                    />

                    <SwapRequestCalendarContext
                      currentRosterId={rosterId}
                      selectedRequest={selectedRequest}
                      requests={swapRequests.items}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </section>
      </main>

      <SwapRequestDetailDrawer
        open={!!detailDrawerRequestId}
        requestId={detailDrawerRequestId}
        onClose={handleCloseDetails}
        viewerMode={approvalAccess ? "default" : "resident"}
      />

      {canOpenChangeMyCallModal ? (
        <ChangeMyCallModal
          open={changeMyCallOpen}
          onClose={() => setChangeMyCallOpen(false)}
          programId={workspaceProgramId}
          currentRosterId={rosterId}
          calls={modalCalls}
          residents={modalResidents}
          outgoingRequests={swapRequests.items.filter(
            (request) => request.requester?.id === rosterId
          )}
          initialYear={modalInitialYear}
          initialMonthIndex={modalInitialMonthIndex}
          onCreated={async () => {
            await swapRequests.refresh();
          }}
        />
      ) : null}
    </>
  );
}
