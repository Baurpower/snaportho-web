/**
 * Pure projected-schedule builder and frontend validation engine for admin
 * preview mode.
 *
 * `buildProjectedCalls` takes the current month's call list and all
 * accepted_pending_admin requests, and returns a new array with projected
 * ownership changes applied entirely in memory.
 *
 * `computeProjectedValidation` / `computeAllProjectedValidations` evaluate
 * scheduling rule violations against the projected schedule.
 *
 * IMPORTANT: No DB reads, no DB writes, no mutations of the input array.
 * All functions here are pure computational helpers used for frontend-only
 * preview and informational validation. Validation never blocks approval.
 */

import {
  evaluateMonthlyLimitForResident,
  evaluatePgyEligibility,
  evaluateSpacingForResident,
  normalizeCallType,
  type RuleLike,
} from "@/lib/workspace/call/rule-evaluator";
import { getResidentStatusDetails } from "@/lib/workspace/pgy";
import type { CalendarCallItem } from "@/lib/workspace/call-swaps/calendar-overlay-utils";
import type { SwapRequestListItem } from "@/lib/workspace/call-swaps/types";

// ---------------------------------------------------------------------------
// ProjectedCallItem
//
// Extends CalendarCallItem with optional projection metadata.
// All extra fields are optional so CalendarCallItem values satisfy this type.
// ---------------------------------------------------------------------------

export type ProjectedCallItem = CalendarCallItem & {
  /** Set to true when this call's owner was changed by a pending-admin request. */
  _isProjected?: boolean;
  /** The request ID whose projection changed this call. */
  _projectedFromRequestId?: string;
  /** Projected (new) owner full name — same as residentName after projection. */
  _projectedOwnerLabel?: string;
  /** Original owner full name before the projection was applied. */
  _originalOwnerLabel?: string;
  /** Whether the projection came from a coverage-only or trade request. */
  _projectionKind?: "coverage_only" | "trade";
};

// ---------------------------------------------------------------------------
// buildProjectedCalls
//
// Pure function — does NOT mutate the input `calls` array.
// Returns a shallow-copied array with projected owner changes applied.
//
// Projection rules
// ─────────────────
//   coverage_only:
//     requesterCall owner → recipient
//
//   trade:
//     requesterCall owner → recipient
//     recipientCall owner → requester
//
// Cross-month safety
// ──────────────────
//   If a pending request references a call that is not present in the
//   `calls` array (e.g. the call falls in a different month), that call
//   is silently skipped. No error is thrown.
//
//   For trade requests where only one of the two calls is in the current
//   month, only the visible call is projected.
// ---------------------------------------------------------------------------

export function buildProjectedCalls(
  calls: CalendarCallItem[],
  pendingRequests: SwapRequestListItem[]
): ProjectedCallItem[] {
  // Shallow-copy the array and each element so input is never mutated.
  const projected: ProjectedCallItem[] = calls.map((c) => ({ ...c }));

  // Build an ID → call map for O(1) lookup.
  const callMap = new Map<string, ProjectedCallItem>(
    projected.map((c) => [c.id, c])
  );

  for (const request of pendingRequests) {
    // Only project accepted_pending_admin requests.
    if (request.status !== "accepted_pending_admin") continue;

    const isTrade = request.request_type === "trade" && !!request.recipientCall;

    if (!isTrade) {
      // ── Coverage-only (or degenerate trade without recipientCall) ─────────
      const reqCallId = request.requesterCall?.id;
      if (!reqCallId) continue;

      const call = callMap.get(reqCallId);
      if (!call) continue; // Call not in this month's view — skip silently.

      const recipient = request.recipient;
      if (!recipient) continue;

      call._originalOwnerLabel = call.residentName;
      call.residentName = recipient.fullName;
      call.rosterId = request.recipient_roster_id;
      call.isMine = false; // Admin view — never "mine"
      call._isProjected = true;
      call._projectedFromRequestId = request.id;
      call._projectedOwnerLabel = recipient.fullName;
      call._projectionKind = "coverage_only";
    } else {
      // ── Trade: swap owners between requesterCall and recipientCall ─────────
      const reqCallId = request.requesterCall?.id;
      // recipientCall existence is guaranteed by the isTrade check above.
      const recCallId = request.recipientCall!.id;

      const reqCall = reqCallId ? callMap.get(reqCallId) : undefined;
      const recCall = recCallId ? callMap.get(recCallId) : undefined;

      const requester = request.requester;
      const recipient = request.recipient;
      if (!requester || !recipient) continue;

      // Either or both calls may be outside this month — handle each independently.
      if (reqCall) {
        reqCall._originalOwnerLabel = reqCall.residentName;
        reqCall.residentName = recipient.fullName;
        reqCall.rosterId = request.recipient_roster_id;
        reqCall.isMine = false;
        reqCall._isProjected = true;
        reqCall._projectedFromRequestId = request.id;
        reqCall._projectedOwnerLabel = recipient.fullName;
        reqCall._projectionKind = "trade";
      }

      if (recCall) {
        recCall._originalOwnerLabel = recCall.residentName;
        recCall.residentName = requester.fullName;
        recCall.rosterId = request.requester_roster_id;
        recCall.isMine = false;
        recCall._isProjected = true;
        recCall._projectedFromRequestId = request.id;
        recCall._projectedOwnerLabel = requester.fullName;
        recCall._projectionKind = "trade";
      }
    }
  }

  return projected;
}

// ---------------------------------------------------------------------------
// Projected-schedule validation
//
// These functions run AFTER buildProjectedCalls so that validations reflect
// the full "all pending approved" world — not just one request in isolation.
//
// Rules checked (informational only — never blocks approval):
//   1. Same-date conflict  — recipient already has a call on the same date
//   2. Monthly limit       — evaluateMonthlyLimitForResident
//   3. Spacing             — evaluateSpacingForResident
//   4. PGY eligibility     — evaluatePgyEligibility + getPgyFromGradYear
//
// For trade requests, both sides (recipient ← requesterCall, requester ←
// recipientCall) are validated independently.
// ---------------------------------------------------------------------------

export type ProjectedValidationResult = {
  requestId: string;
  errors: string[];
  warnings: string[];
};

export type AggregateProjectedValidation = {
  totalRequests: number;
  requestsWithIssues: number;
  results: ProjectedValidationResult[];
};

/** Returns the last space-separated token of a full name. */
function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

/**
 * Validates a single accepted_pending_admin request against the fully-projected
 * schedule (all pending requests already applied).
 *
 * Errors and warnings are purely informational — they do NOT block approval.
 */
export function computeProjectedValidation(params: {
  request: SwapRequestListItem;
  projectedCalls: ProjectedCallItem[];
  programRules: RuleLike[];
}): ProjectedValidationResult {
  const { request, projectedCalls, programRules } = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  const isTrade = request.request_type === "trade" && !!request.recipientCall;

  /** All projected dates for a given roster member, optionally excluding one call. */
  function getProjectedDates(rosterId: string, excludeCallId?: string): string[] {
    return projectedCalls
      .filter(
        (c) =>
          c.rosterId === rosterId &&
          c.callDate &&
          (!excludeCallId || c.id !== excludeCallId)
      )
      .map((c) => c.callDate as string);
  }

  /**
   * Validates one side of the swap (either recipient ← requesterCall or
   * requester ← recipientCall) and appends violations to errors/warnings.
   */
  function validateSide(
    rosterId: string,
    gradYear: number | null,
    residentDisplayName: string,
    callId: string,
    callDate: string | null,
    callType: string | null
  ) {
    if (!callDate || !rosterId) return;

    const prefix = `${lastName(residentDisplayName)}:`;

    // 1. Same-date conflict
    const sameDay = projectedCalls.find(
      (c) => c.rosterId === rosterId && c.callDate === callDate && c.id !== callId
    );
    if (sameDay) {
      errors.push(
        `${prefix} already has a call on this date (${sameDay.callType ?? "call"} conflict)`
      );
    }

    // 2. Monthly limit — count includes the new call (already in projected)
    const allDates = getProjectedDates(rosterId);
    const monthlyViolations = evaluateMonthlyLimitForResident({
      assignmentCount: allDates.length,
      rules: programRules,
    });
    for (const v of monthlyViolations) {
      const msg = `${prefix} ${v.message}`;
      if (v.severity === "error") errors.push(msg);
      else warnings.push(msg);
    }

    // 3. Spacing — check new date against other dates (exclude this call itself)
    const otherDates = getProjectedDates(rosterId, callId);
    const spacingViolations = evaluateSpacingForResident({
      assignedDates: otherDates,
      dateKey: callDate,
      rules: programRules,
    });
    for (const v of spacingViolations) {
      const msg = `${prefix} ${v.message}`;
      if (v.severity === "error") errors.push(msg);
      else warnings.push(msg);
    }

    // 4. PGY eligibility
    const status = getResidentStatusDetails(gradYear, callDate);
    if (!status.isActiveResident) {
      errors.push(
        status.isGraduated
          ? `${prefix} is graduated and should not receive this call.`
          : `${prefix} is missing a valid grad year for eligibility checks.`
      );
      return;
    }

    const normalizedType = normalizeCallType(callType);
    if (normalizedType && typeof status.pgyYear === "number") {
      const pgyViolations = evaluatePgyEligibility({
        resident: { pgyYear: status.pgyYear },
        callType: normalizedType,
        rules: programRules,
      });
      for (const v of pgyViolations) {
        const msg = `${prefix} ${v.message}`;
        if (v.severity === "error") errors.push(msg);
        else warnings.push(msg);
      }
    }
  }

  // Validate recipient taking requesterCall
  if (request.recipient && request.requesterCall) {
    validateSide(
      request.recipient_roster_id,
      request.recipient.gradYear,
      request.recipient.fullName,
      request.requesterCall.id,
      request.requesterCall.callDate,
      request.requesterCall.callType
    );
  }

  // For trades: also validate requester taking recipientCall
  if (isTrade && request.requester && request.recipientCall) {
    validateSide(
      request.requester_roster_id,
      request.requester.gradYear,
      request.requester.fullName,
      request.recipientCall.id,
      request.recipientCall.callDate,
      request.recipientCall.callType
    );
  }

  return { requestId: request.id, errors, warnings };
}

/**
 * Builds the projected schedule once, then validates all pending requests
 * against it. Returns an aggregate summary plus per-request results.
 *
 * Pass `programRules: []` to disable rule-based checks (safe fallback —
 * only same-date conflicts are reported, which require no rules).
 */
export function computeAllProjectedValidations(params: {
  requests: SwapRequestListItem[];
  allCalls: CalendarCallItem[];
  programRules: RuleLike[];
}): AggregateProjectedValidation {
  const { requests, allCalls, programRules } = params;

  const pendingRequests = requests.filter(
    (r) => r.status === "accepted_pending_admin"
  );

  // Build projected schedule once — O(n) applied to all requests
  const projectedCalls = buildProjectedCalls(allCalls, pendingRequests);

  const results = pendingRequests.map((request) =>
    computeProjectedValidation({ request, projectedCalls, programRules })
  );

  const requestsWithIssues = results.filter(
    (r) => r.errors.length > 0 || r.warnings.length > 0
  ).length;

  return {
    totalRequests: pendingRequests.length,
    requestsWithIssues,
    results,
  };
}
