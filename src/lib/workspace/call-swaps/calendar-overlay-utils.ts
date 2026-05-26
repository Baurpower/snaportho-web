/**
 * Shared pure helpers for request-aware calendar overlays.
 *
 * Used by both:
 *   - SwapRequestCalendarContext (resident mode)
 *   - AdminRequestCalendar       (admin mode)
 *
 * No React imports. No side-effects. All functions are pure utilities.
 */

import type {
  SwapRequestListItem,
  SwapRequestStatus,
  SwapRequestType,
} from "@/lib/workspace/call-swaps/types";

// ---------------------------------------------------------------------------
// Shared calendar call item shape
// ---------------------------------------------------------------------------

export type CalendarCallItem = {
  id: string;
  rosterId?: string | null;
  membershipId: string | null;
  residentName: string;
  callType: string | null;
  callDate: string | null;
  site: string | null;
  isHomeCall: boolean | null;
  isMine: boolean;
  // Optional validation-relevant fields — present in month API responses
  pgyYear?: number | null;
  trainingLevel?: string | null;
  gradYear?: number | null;
  startDatetime?: string | null;
  endDatetime?: string | null;
};

export type CalendarMonthResponse = {
  monthStart: string;
  monthEnd: string;
  myRosterId: string | null;
  calls: CalendarCallItem[];
};

// ---------------------------------------------------------------------------
// Overlay type definitions
// ---------------------------------------------------------------------------

export type OverlayColorTone =
  | "amber"
  | "blue"
  | "green"
  | "rose"
  | "slate"
  | "violet";

export type OverlayViewerRole = "requester" | "recipient" | "other" | "admin";

export type OverlayKind =
  | "incoming_coverage"
  | "outgoing_coverage"
  | "pending_admin"
  | "approved"
  | "declined"
  | "rejected"
  | "cancelled"
  | "expired"
  | "trade_requester_side"
  | "trade_recipient_side"
  | "admin_pending_coverage"
  | "admin_pending_trade_side";

export type RequestCalendarOverlay = {
  requestId: string;
  assignmentId: string;
  requestType: SwapRequestType;
  status: SwapRequestStatus;
  viewerRole: OverlayViewerRole;
  overlayKind: OverlayKind;
  stageLabel: string;
  relationshipLine: string;
  colorTone: OverlayColorTone;
  isSelectedRequest: boolean;
  isActiveRequest: boolean;
  isCompletedRequest: boolean;
};

export type RequestCalendarOverlayState = {
  overlaysByAssignmentId: Map<string, RequestCalendarOverlay[]>;
  selectedAssignmentIds: Set<string>;
  hasVisibleActiveOverlays: boolean;
};

// ---------------------------------------------------------------------------
// Status sets
// ---------------------------------------------------------------------------

export const ACTIVE_REQUEST_STATUSES = new Set<SwapRequestStatus>([
  "pending_recipient",
  "accepted_pending_admin",
]);

export const COMPLETED_REQUEST_STATUSES = new Set<SwapRequestStatus>([
  "approved",
  "declined",
  "rejected",
  "cancelled",
  "expired",
]);

// ---------------------------------------------------------------------------
// Date / calendar grid utilities
// ---------------------------------------------------------------------------

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfWeekSunday(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function buildCalendarWeeksSunday(
  year: number,
  monthIndex: number
): Date[][] {
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const gridStart = startOfWeekSunday(monthStart);
  const gridEnd = addDays(startOfWeekSunday(monthEnd), 6);

  const weeks: Date[][] = [];
  let cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }

  return weeks;
}

export function isSameMonth(
  date: Date,
  year: number,
  monthIndex: number
): boolean {
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}

export function monthRange(
  year: number,
  monthIndex: number
): { monthStart: string; monthEnd: string } {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    monthStart: start.toISOString().slice(0, 10),
    monthEnd: end.toISOString().slice(0, 10),
  };
}

export function monthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(
  dateString: string | null | undefined
): string {
  if (!dateString) return "Date unavailable";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Name helpers
// ---------------------------------------------------------------------------

export function getResidentLastName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return displayName;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? displayName;
}

// ---------------------------------------------------------------------------
// Request-to-month helpers
// ---------------------------------------------------------------------------

export function getRequestDate(request: SwapRequestListItem | null): {
  year: number;
  monthIndex: number;
} {
  const fallback = new Date();
  const dateString = request?.requesterCall?.callDate ?? null;
  if (!dateString) {
    return { year: fallback.getFullYear(), monthIndex: fallback.getMonth() };
  }
  const date = new Date(`${dateString}T00:00:00`);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function getPreferredRequestMonth(
  requests: SwapRequestListItem[]
): { year: number; monthIndex: number } {
  const activeRequest =
    requests.find((r) => ACTIVE_REQUEST_STATUSES.has(r.status)) ??
    requests[0] ??
    null;
  return getRequestDate(activeRequest);
}

// ---------------------------------------------------------------------------
// Viewer-role helpers
// ---------------------------------------------------------------------------

export function getViewerRole(
  request: SwapRequestListItem,
  currentRosterId: string | null
): OverlayViewerRole {
  if (!currentRosterId) return "other";
  if (request.requester?.id === currentRosterId) return "requester";
  if (request.recipient?.id === currentRosterId) return "recipient";
  return "other";
}

export function shouldIncludeByDefault(
  request: SwapRequestListItem
): boolean {
  return ACTIVE_REQUEST_STATUSES.has(request.status);
}

// ---------------------------------------------------------------------------
// Status / display helpers
// ---------------------------------------------------------------------------

export function getStatusColorTone(
  status: SwapRequestStatus
): OverlayColorTone {
  if (status === "accepted_pending_admin") return "blue";
  if (status === "approved") return "green";
  if (status === "declined" || status === "rejected") return "rose";
  if (status === "cancelled" || status === "expired") return "slate";
  return "amber";
}

export function getStageLabel(status: SwapRequestStatus): string {
  if (status === "accepted_pending_admin") return "Pending admin";
  if (status === "approved") return "Approved";
  if (status === "declined") return "Declined";
  if (status === "rejected") return "Rejected";
  if (status === "cancelled") return "Cancelled";
  if (status === "expired") return "Expired";
  return "Waiting";
}

// ---------------------------------------------------------------------------
// Overlay map helpers
// ---------------------------------------------------------------------------

export function pushOverlay(
  target: Map<string, RequestCalendarOverlay[]>,
  overlay: RequestCalendarOverlay
): void {
  const existing = target.get(overlay.assignmentId) ?? [];
  existing.push(overlay);
  target.set(overlay.assignmentId, existing);
}

// ---------------------------------------------------------------------------
// Overlay builders
//
// viewerRole "admin" produces neutral two-party labels:
//   coverage:   "Rosevear → Gupta"
//   trade side: "Rosevear ↔ Walsh" / "Walsh ↔ Rosevear"
//
// All other viewerRole values produce resident-centric labels:
//   coverage:   "→ Gupta"
//   trade side: "↔ Walsh" / "↔ Rosevear"
// ---------------------------------------------------------------------------

export function buildCoverageOverlay(
  request: SwapRequestListItem,
  viewerRole: OverlayViewerRole,
  isSelectedRequest: boolean
): RequestCalendarOverlay[] {
  const assignmentId = request.requesterCall?.id;
  if (!assignmentId) return [];

  const isActiveRequest = ACTIVE_REQUEST_STATUSES.has(request.status);
  const isCompletedRequest = COMPLETED_REQUEST_STATUSES.has(request.status);

  let overlayKind: OverlayKind;

  if (request.status === "accepted_pending_admin") {
    overlayKind =
      viewerRole === "admin" ? "admin_pending_coverage" : "pending_admin";
  } else if (request.status === "approved") {
    overlayKind = "approved";
  } else if (request.status === "declined") {
    overlayKind = "declined";
  } else if (request.status === "rejected") {
    overlayKind = "rejected";
  } else if (request.status === "cancelled") {
    overlayKind = "cancelled";
  } else if (request.status === "expired") {
    overlayKind = "expired";
  } else if (viewerRole === "recipient") {
    overlayKind = "incoming_coverage";
  } else {
    overlayKind = "outgoing_coverage";
  }

  const requesterLastName = getResidentLastName(
    request.requester?.fullName ?? "Requester"
  );
  const recipientLastName = getResidentLastName(
    request.recipient?.fullName ?? "Resident"
  );

  const relationshipLine =
    viewerRole === "admin"
      ? `${requesterLastName} → ${recipientLastName}`
      : `→ ${recipientLastName}`;

  return [
    {
      requestId: request.id,
      assignmentId,
      requestType: "coverage_only",
      status: request.status,
      viewerRole,
      overlayKind,
      stageLabel: getStageLabel(request.status),
      relationshipLine,
      colorTone: getStatusColorTone(request.status),
      isSelectedRequest,
      isActiveRequest,
      isCompletedRequest,
    },
  ];
}

export function buildTradeOverlays(
  request: SwapRequestListItem,
  viewerRole: OverlayViewerRole,
  isSelectedRequest: boolean
): RequestCalendarOverlay[] {
  const requesterAssignmentId = request.requesterCall?.id;
  const recipientAssignmentId = request.recipientCall?.id;

  if (!requesterAssignmentId || !recipientAssignmentId) {
    // Degenerate trade — treat as coverage
    return buildCoverageOverlay(
      { ...request, request_type: "coverage_only", recipientCall: null },
      viewerRole,
      isSelectedRequest
    );
  }

  const isActiveRequest = ACTIVE_REQUEST_STATUSES.has(request.status);
  const isCompletedRequest = COMPLETED_REQUEST_STATUSES.has(request.status);

  const requesterLastName = getResidentLastName(
    request.requester?.fullName ?? "Requester"
  );
  const recipientLastName = getResidentLastName(
    request.recipient?.fullName ?? "Recipient"
  );
  const stageLabel = getStageLabel(request.status);

  const resolvedOverlayKind: OverlayKind =
    request.status === "accepted_pending_admin"
      ? viewerRole === "admin"
        ? "admin_pending_trade_side"
        : "pending_admin"
      : request.status === "approved"
      ? "approved"
      : request.status === "declined"
      ? "declined"
      : request.status === "rejected"
      ? "rejected"
      : request.status === "cancelled"
      ? "cancelled"
      : request.status === "expired"
      ? "expired"
      : "trade_requester_side";

  const isWaiting = request.status === "pending_recipient";
  const requesterTone: OverlayColorTone = isWaiting
    ? "amber"
    : getStatusColorTone(request.status);
  const recipientTone: OverlayColorTone = isWaiting
    ? "violet"
    : getStatusColorTone(request.status);

  const requesterOverlayKind: OverlayKind =
    resolvedOverlayKind === "trade_requester_side"
      ? "trade_requester_side"
      : resolvedOverlayKind;
  const recipientOverlayKind: OverlayKind =
    resolvedOverlayKind === "trade_requester_side"
      ? "trade_recipient_side"
      : resolvedOverlayKind;

  // Relationship lines: admin sees both names; residents see only the other party
  const requesterRelationshipLine =
    viewerRole === "admin"
      ? `${requesterLastName} ↔ ${recipientLastName}`
      : `↔ ${recipientLastName}`;
  const recipientRelationshipLine =
    viewerRole === "admin"
      ? `${recipientLastName} ↔ ${requesterLastName}`
      : `↔ ${requesterLastName}`;

  return [
    {
      requestId: request.id,
      assignmentId: requesterAssignmentId,
      requestType: "trade",
      status: request.status,
      viewerRole,
      overlayKind: requesterOverlayKind,
      stageLabel,
      relationshipLine: requesterRelationshipLine,
      colorTone: requesterTone,
      isSelectedRequest,
      isActiveRequest,
      isCompletedRequest,
    },
    {
      requestId: request.id,
      assignmentId: recipientAssignmentId,
      requestType: "trade",
      status: request.status,
      viewerRole,
      overlayKind: recipientOverlayKind,
      stageLabel,
      relationshipLine: recipientRelationshipLine,
      colorTone: recipientTone,
      isSelectedRequest,
      isActiveRequest,
      isCompletedRequest,
    },
  ];
}

export function sortOverlays(
  overlays: RequestCalendarOverlay[]
): RequestCalendarOverlay[] {
  return [...overlays].sort((a, b) => {
    if (a.isSelectedRequest !== b.isSelectedRequest) {
      return a.isSelectedRequest ? -1 : 1;
    }
    if (a.isActiveRequest !== b.isActiveRequest) {
      return a.isActiveRequest ? -1 : 1;
    }
    if (a.colorTone !== b.colorTone) {
      const toneRank: Record<OverlayColorTone, number> = {
        amber: 0,
        violet: 1,
        blue: 2,
        green: 3,
        rose: 4,
        slate: 5,
      };
      return toneRank[a.colorTone] - toneRank[b.colorTone];
    }
    return a.stageLabel.localeCompare(b.stageLabel);
  });
}

/**
 * Build the overlay state for a calendar from a list of requests.
 *
 * @param viewerRoleOverride   Pass `"admin"` to force admin neutral labels for
 *                              every request regardless of currentRosterId.
 *                              Omit (or pass undefined) for resident-centric labels.
 */
export function buildRequestCalendarOverlayState({
  calls,
  requests,
  selectedRequest,
  currentRosterId,
  viewerRoleOverride,
}: {
  calls: CalendarCallItem[];
  requests: SwapRequestListItem[];
  selectedRequest: SwapRequestListItem | null;
  currentRosterId: string | null;
  viewerRoleOverride?: OverlayViewerRole;
}): RequestCalendarOverlayState {
  const callIds = new Set(calls.map((c) => c.id));
  const overlaysByAssignmentId = new Map<string, RequestCalendarOverlay[]>();
  const selectedAssignmentIds = new Set<string>();

  for (const request of requests) {
    const isSelectedRequest = selectedRequest?.id === request.id;
    if (!isSelectedRequest && !shouldIncludeByDefault(request)) {
      continue;
    }

    const viewerRole =
      viewerRoleOverride ?? getViewerRole(request, currentRosterId);
    const isTrade = request.request_type === "trade" && request.recipientCall;
    const overlays = isTrade
      ? buildTradeOverlays(request, viewerRole, isSelectedRequest)
      : buildCoverageOverlay(request, viewerRole, isSelectedRequest);

    for (const overlay of overlays) {
      if (!callIds.has(overlay.assignmentId)) continue;
      pushOverlay(overlaysByAssignmentId, overlay);
      if (isSelectedRequest) {
        selectedAssignmentIds.add(overlay.assignmentId);
      }
    }
  }

  for (const [id, overlays] of overlaysByAssignmentId.entries()) {
    overlaysByAssignmentId.set(id, sortOverlays(overlays));
  }

  return {
    overlaysByAssignmentId,
    selectedAssignmentIds,
    hasVisibleActiveOverlays: Array.from(
      overlaysByAssignmentId.values()
    ).some((items) => items.some((item) => item.isActiveRequest)),
  };
}

// ---------------------------------------------------------------------------
// Tone / card styling
// ---------------------------------------------------------------------------

export function getToneClasses(
  tone: OverlayColorTone,
  selected: boolean
): { card: string; strip: string; pill: string; sublabel: string } {
  const selectedRing = selected ? "ring-2 ring-offset-0" : "ring-1 ring-offset-0";

  if (tone === "blue") {
    return {
      card: `border-blue-300 bg-blue-50 ${selectedRing} ring-blue-200`,
      strip: "bg-blue-500",
      pill: "bg-blue-100 text-blue-900 border-blue-200",
      sublabel: "text-blue-800",
    };
  }
  if (tone === "green") {
    return {
      card: `border-emerald-300 bg-emerald-50 ${selectedRing} ring-emerald-200`,
      strip: "bg-emerald-500",
      pill: "bg-emerald-100 text-emerald-900 border-emerald-200",
      sublabel: "text-emerald-800",
    };
  }
  if (tone === "rose") {
    return {
      card: `border-rose-300 bg-rose-50 ${selectedRing} ring-rose-200`,
      strip: "bg-rose-500",
      pill: "bg-rose-100 text-rose-900 border-rose-200",
      sublabel: "text-rose-800",
    };
  }
  if (tone === "slate") {
    return {
      card: `border-slate-300 bg-slate-100 ${selectedRing} ring-slate-200`,
      strip: "bg-slate-500",
      pill: "bg-slate-200 text-slate-900 border-slate-300",
      sublabel: "text-slate-700",
    };
  }
  if (tone === "violet") {
    return {
      card: `border-violet-300 bg-violet-50 ${selectedRing} ring-violet-200`,
      strip: "bg-violet-500",
      pill: "bg-violet-100 text-violet-900 border-violet-200",
      sublabel: "text-violet-800",
    };
  }
  // amber (default)
  return {
    card: `border-amber-300 bg-amber-50 ${selectedRing} ring-amber-200`,
    strip: "bg-amber-500",
    pill: "bg-amber-100 text-amber-900 border-amber-200",
    sublabel: "text-amber-900",
  };
}

export function getCallCardClasses(call: CalendarCallItem): {
  card: string;
  label: string;
  chip: string;
} {
  if (call.isMine) {
    return {
      card: "border-sky-200 bg-sky-50",
      label: "text-sky-950",
      chip: "bg-sky-100 text-sky-800",
    };
  }
  return {
    card: "border-slate-200 bg-white",
    label: "text-slate-950",
    chip: "bg-slate-100 text-slate-600",
  };
}
