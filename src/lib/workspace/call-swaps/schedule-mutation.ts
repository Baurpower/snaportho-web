import type { SupabaseClient } from "@supabase/supabase-js";
import { getResidentStatusDetails } from "@/lib/workspace/pgy";
import { getSwapRequestWithDetailsById } from "./queries";
import type { ShiftSwapRequest, SwapRequestListItem } from "./types";

type CallAssignmentRow = {
  id: string;
  program_id: string | null;
  roster_id: string | null;
  program_membership_id: string | null;
  call_type: string | null;
  call_date: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
};

type RosterRow = {
  id: string;
  program_id: string | null;
  role: string | null;
  grad_year: number | null;
  program_membership_id: string | null;
  claimed_by_user_id: string | null;
  isAdmin: boolean | null;
};

type MutationResult<T> = {
  data: T | null;
  error: string | null;
};

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function logTrace(traceId: string | undefined, label: string, details?: Record<string, unknown>) {
  if (!isDev() || !traceId) return;
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.info(`[swap-approval:${traceId}] ${label}${payload}`);
}

async function timedStep<T>(
  traceId: string | undefined,
  label: string,
  work: () => Promise<T>
) {
  const startedAt = Date.now();
  logTrace(traceId, `${label}:start`);

  try {
    const result = await work();
    logTrace(traceId, `${label}:finish`, { durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    logTrace(traceId, `${label}:error`, {
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function isExpired(request: ShiftSwapRequest) {
  if (!request.expires_at) return false;
  const expiresAt = new Date(request.expires_at);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now();
}

function hasTimedOverlap(
  firstStart: string | null,
  firstEnd: string | null,
  secondStart: string | null,
  secondEnd: string | null
) {
  if (!firstStart || !firstEnd || !secondStart || !secondEnd) return false;

  const firstStartDate = new Date(firstStart);
  const firstEndDate = new Date(firstEnd);
  const secondStartDate = new Date(secondStart);
  const secondEndDate = new Date(secondEnd);

  if (
    Number.isNaN(firstStartDate.getTime()) ||
    Number.isNaN(firstEndDate.getTime()) ||
    Number.isNaN(secondStartDate.getTime()) ||
    Number.isNaN(secondEndDate.getTime())
  ) {
    return false;
  }

  return firstStartDate < secondEndDate && secondStartDate < firstEndDate;
}

async function loadCallAssignment(
  supabase: SupabaseClient,
  callId: string
) {
  const { data, error } = await supabase
    .from("call_assignments")
    .select(
      "id, program_id, roster_id, program_membership_id, call_type, call_date, start_datetime, end_datetime"
    )
    .eq("id", callId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load call assignment: ${error.message}`);
  }

  return (data as CallAssignmentRow | null) ?? null;
}

async function loadRoster(
  supabase: SupabaseClient,
  rosterId: string
) {
  const { data, error } = await supabase
    .from("program_roster")
    .select(
      "id, program_id, role, grad_year, program_membership_id, claimed_by_user_id, isAdmin"
    )
    .eq("id", rosterId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load roster member: ${error.message}`);
  }

  return (data as RosterRow | null) ?? null;
}

async function loadConflictingCall(
  supabase: SupabaseClient,
  params: {
    rosterId: string;
    callDate: string | null;
    startDatetime: string | null;
    endDatetime: string | null;
    excludeCallIds?: string[];
  }
) {
  if (!params.callDate) return null;

  let query = supabase
    .from("call_assignments")
    .select(
      "id, program_id, roster_id, program_membership_id, call_type, call_date, start_datetime, end_datetime"
    )
    .eq("roster_id", params.rosterId)
    .eq("call_date", params.callDate);

  for (const excludedId of params.excludeCallIds ?? []) {
    query = query.neq("id", excludedId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load roster schedule conflicts: ${error.message}`);
  }

  const rows = (data ?? []) as CallAssignmentRow[];
  return (
    rows.find((row) => {
      if (
        params.startDatetime &&
        params.endDatetime &&
        row.start_datetime &&
        row.end_datetime
      ) {
        return hasTimedOverlap(
          params.startDatetime,
          params.endDatetime,
          row.start_datetime,
          row.end_datetime
        );
      }

      return true;
    }) ?? null
  );
}

async function approveCoverageSwapViaRpc(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    recipientRosterId: string;
    recipientProgramMembershipId: string;
    actorRosterId: string | null;
    actorUserId?: string | null;
    adminNote?: string | null;
  }
) {
  const { data, error } = await supabase.rpc("approve_shift_swap_request", {
    p_request_id: params.requestId,
    p_recipient_roster_id: params.recipientRosterId,
    p_recipient_program_membership_id: params.recipientProgramMembershipId,
    p_actor_roster_id: params.actorRosterId,
    p_actor_user_id: params.actorUserId ?? null,
    p_admin_note: params.adminNote ?? null,
  });

  if (error) {
    throw new Error(`Failed to approve coverage swap: ${error.message}`);
  }

  const approvedRequestId = Array.isArray(data) ? data[0]?.request_id ?? null : data ?? null;

  if (!approvedRequestId || approvedRequestId !== params.requestId) {
    throw new Error("Approval mutation did not return the expected swap request id.");
  }

  return approvedRequestId;
}

async function approveTradeSwapViaRpc(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    requesterRosterId: string;
    recipientRosterId: string;
    requesterProgramMembershipId: string;
    recipientProgramMembershipId: string;
    actorRosterId: string | null;
    actorUserId?: string | null;
    adminNote?: string | null;
  }
) {
  const { data, error } = await supabase.rpc("approve_shift_trade_request", {
    p_request_id: params.requestId,
    p_requester_roster_id: params.requesterRosterId,
    p_recipient_roster_id: params.recipientRosterId,
    p_requester_program_membership_id: params.requesterProgramMembershipId,
    p_recipient_program_membership_id: params.recipientProgramMembershipId,
    p_actor_roster_id: params.actorRosterId,
    p_actor_user_id: params.actorUserId ?? null,
    p_admin_note: params.adminNote ?? null,
  });

  if (error) {
    throw new Error(`Failed to approve trade swap: ${error.message}`);
  }

  const approvedRequestId = Array.isArray(data) ? data[0]?.request_id ?? null : data ?? null;

  if (!approvedRequestId || approvedRequestId !== params.requestId) {
    throw new Error("Trade approval mutation did not return the expected swap request id.");
  }

  return approvedRequestId;
}

export async function applyApprovedCoverageSwap(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    actorRosterId: string | null;
    actorUserId?: string | null;
    adminNote?: string | null;
    debugTraceId?: string;
  }
): Promise<MutationResult<SwapRequestListItem>> {
  const traceId = params.debugTraceId;

  try {
    logTrace(traceId, "mutation.coverage.supabase:start", {
      requestId: params.requestId,
    });

    const request = await timedStep(traceId, "mutation.coverage.load_request", async () => {
      const { data, error } = await supabase
        .from("shift_swap_requests")
        .select(
          "id, program_id, requester_roster_id, recipient_roster_id, requester_call_id, recipient_call_id, request_type, status, requester_note, recipient_note, admin_note, expires_at, created_at, updated_at"
        )
        .eq("id", params.requestId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to load swap request: ${error.message}`);
      }

      return (data as ShiftSwapRequest | null) ?? null;
    });

    if (!request) {
      throw new Error("Swap request not found.");
    }

    if (request.status !== "accepted_pending_admin") {
      throw new Error("Swap request is no longer awaiting admin approval.");
    }

    if (request.request_type !== "coverage_only") {
      throw new Error("Coverage approval only supports coverage_only requests.");
    }

    if (isExpired(request)) {
      throw new Error("Swap request has expired.");
    }

    const requesterCall = await timedStep(
      traceId,
      "mutation.coverage.load_assignment",
      async () => loadCallAssignment(supabase, request.requester_call_id)
    );

    if (!requesterCall) {
      throw new Error("Call assignment not found.");
    }

    if (requesterCall.program_id !== request.program_id) {
      throw new Error("Call assignment no longer belongs to this program.");
    }

    if (requesterCall.roster_id !== request.requester_roster_id) {
      throw new Error("Call assignment is no longer assigned to the requester.");
    }

    logTrace(traceId, "mutation.coverage.assignment_loaded", {
      callAssignmentId: requesterCall.id,
      currentRosterId: requesterCall.roster_id,
      currentProgramMembershipId: requesterCall.program_membership_id,
    });

    const recipient = await timedStep(
      traceId,
      "mutation.coverage.load_recipient_membership",
      async () => loadRoster(supabase, request.recipient_roster_id)
    );

    if (!recipient) {
      throw new Error("Recipient roster not found.");
    }

    if (recipient.program_id !== request.program_id) {
      throw new Error("Recipient roster no longer belongs to this program.");
    }

    if (!recipient.program_membership_id) {
      throw new Error("Recipient membership not found.");
    }

    if (recipient.grad_year === null) {
      throw new Error("Recipient must have a grad year before approval.");
    }

    const recipientStatus = getResidentStatusDetails(
      recipient.grad_year,
      requesterCall.call_date ?? requesterCall.start_datetime?.slice(0, 10) ?? undefined
    );

    if (!recipientStatus.isActiveResident) {
      throw new Error(
        recipientStatus.isGraduated
          ? "Recipient is graduated for the selected call date."
          : "Recipient must have a valid grad year before approval."
      );
    }

    const conflictingCall = await timedStep(
      traceId,
      "mutation.coverage.check_conflicts",
      async () =>
        loadConflictingCall(supabase, {
          rosterId: request.recipient_roster_id,
          callDate: requesterCall.call_date,
          startDatetime: requesterCall.start_datetime,
          endDatetime: requesterCall.end_datetime,
          excludeCallIds: [requesterCall.id],
        })
    );

    if (conflictingCall) {
      throw new Error("Recipient already has a conflicting call assignment.");
    }

    logTrace(traceId, "mutation.coverage.recipient_ready", {
      recipientRosterId: recipient.id,
      recipientProgramMembershipId: recipient.program_membership_id,
    });

    await timedStep(traceId, "mutation.coverage.rpc", async () =>
      approveCoverageSwapViaRpc(supabase, {
        requestId: request.id,
        recipientRosterId: request.recipient_roster_id,
        recipientProgramMembershipId: recipient.program_membership_id!,
        actorRosterId: params.actorRosterId,
        actorUserId: params.actorUserId ?? null,
        adminNote: params.adminNote ?? null,
      })
    );

    const refreshed = await timedStep(traceId, "mutation.coverage.reload_request", async () =>
      getSwapRequestWithDetailsById(supabase, request.id)
    );

    if (!refreshed) {
      throw new Error("Failed to reload approved swap request details.");
    }

    if (refreshed.status !== "approved") {
      throw new Error("Swap request status did not persist as approved.");
    }

    if (refreshed.requesterCall?.rosterId !== request.recipient_roster_id) {
      throw new Error("Official call assignment did not update to the recipient.");
    }

    if (refreshed.requesterCall?.programMembershipId !== recipient.program_membership_id) {
      throw new Error("Official call assignment did not update the recipient membership.");
    }

    logTrace(traceId, "mutation.coverage.supabase:finish", {
      requestId: refreshed.id,
      finalStatus: refreshed.status,
      updatedRosterId: refreshed.requesterCall?.rosterId ?? null,
      updatedProgramMembershipId: refreshed.requesterCall?.programMembershipId ?? null,
    });

    return {
      data: refreshed,
      error: null,
    };
  } catch (error) {
    logTrace(traceId, "mutation.coverage.failed", {
      requestId: params.requestId,
      error: error instanceof Error ? error.message : "unknown",
    });

    return {
      data: null,
      error:
        error instanceof Error ? error.message : "Failed to apply approved coverage swap.",
    };
  }
}

export async function applyApprovedTradeSwap(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    actorRosterId: string | null;
    actorUserId?: string | null;
    adminNote?: string | null;
    debugTraceId?: string;
  }
): Promise<MutationResult<SwapRequestListItem>> {
  const traceId = params.debugTraceId;

  try {
    logTrace(traceId, "mutation.trade.supabase:start", {
      requestId: params.requestId,
    });

    const request = await timedStep(traceId, "mutation.trade.load_request", async () => {
      const { data, error } = await supabase
        .from("shift_swap_requests")
        .select(
          "id, program_id, requester_roster_id, recipient_roster_id, requester_call_id, recipient_call_id, request_type, status, requester_note, recipient_note, admin_note, expires_at, created_at, updated_at"
        )
        .eq("id", params.requestId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to load swap request: ${error.message}`);
      }

      return (data as ShiftSwapRequest | null) ?? null;
    });

    if (!request) {
      throw new Error("Swap request not found.");
    }

    if (request.status !== "accepted_pending_admin") {
      throw new Error("Swap request is no longer awaiting admin approval.");
    }

    if (request.request_type !== "trade") {
      throw new Error("Trade approval only supports trade requests.");
    }

    if (!request.recipient_call_id) {
      throw new Error("Trade request is missing the recipient call assignment.");
    }

    if (isExpired(request)) {
      throw new Error("Swap request has expired.");
    }

    const [requesterCall, recipientCall] = await timedStep(
      traceId,
      "mutation.trade.load_assignments",
      async () =>
        Promise.all([
          loadCallAssignment(supabase, request.requester_call_id),
          loadCallAssignment(supabase, request.recipient_call_id!),
        ])
    );

    if (!requesterCall || !recipientCall) {
      throw new Error("One of the trade call assignments could not be found.");
    }

    if (
      requesterCall.program_id !== request.program_id ||
      recipientCall.program_id !== request.program_id
    ) {
      throw new Error("One of the trade call assignments no longer belongs to this program.");
    }

    if (requesterCall.roster_id !== request.requester_roster_id) {
      throw new Error("Requester no longer owns the selected call.");
    }

    if (recipientCall.roster_id !== request.recipient_roster_id) {
      throw new Error("Recipient no longer owns the selected return shift.");
    }

    const [requester, recipient] = await timedStep(
      traceId,
      "mutation.trade.load_memberships",
      async () =>
        Promise.all([
          loadRoster(supabase, request.requester_roster_id),
          loadRoster(supabase, request.recipient_roster_id),
        ])
    );

    if (!requester || !recipient) {
      throw new Error("One of the trade roster records could not be found.");
    }

    if (
      requester.program_id !== request.program_id ||
      recipient.program_id !== request.program_id
    ) {
      throw new Error("One of the trade residents no longer belongs to this program.");
    }

    if (!requester.program_membership_id || !recipient.program_membership_id) {
      throw new Error("Both residents must have active program memberships.");
    }

    if (requester.grad_year === null || recipient.grad_year === null) {
      throw new Error("Both residents must have grad years before approval.");
    }

    const requesterStatus = getResidentStatusDetails(
      requester.grad_year,
      recipientCall.call_date ?? recipientCall.start_datetime?.slice(0, 10) ?? undefined
    );
    const recipientStatus = getResidentStatusDetails(
      recipient.grad_year,
      requesterCall.call_date ?? requesterCall.start_datetime?.slice(0, 10) ?? undefined
    );

    if (!requesterStatus.isActiveResident || !recipientStatus.isActiveResident) {
      throw new Error(
        requesterStatus.isGraduated || recipientStatus.isGraduated
          ? "One of the residents is graduated for the selected call date."
          : "Both residents must have valid grad years before approval."
      );
    }

    const [requesterConflict, recipientConflict] = await timedStep(
      traceId,
      "mutation.trade.check_conflicts",
      async () =>
        Promise.all([
          loadConflictingCall(supabase, {
            rosterId: request.requester_roster_id,
            callDate: recipientCall.call_date,
            startDatetime: recipientCall.start_datetime,
            endDatetime: recipientCall.end_datetime,
            excludeCallIds: [request.requester_call_id, request.recipient_call_id!],
          }),
          loadConflictingCall(supabase, {
            rosterId: request.recipient_roster_id,
            callDate: requesterCall.call_date,
            startDatetime: requesterCall.start_datetime,
            endDatetime: requesterCall.end_datetime,
            excludeCallIds: [request.requester_call_id, request.recipient_call_id!],
          }),
        ])
    );

    if (requesterConflict) {
      throw new Error("Requester already has a conflicting call on the selected return-shift date.");
    }

    if (recipientConflict) {
      throw new Error("Recipient already has a conflicting call on the requester's call date.");
    }

    await timedStep(traceId, "mutation.trade.rpc", async () =>
      approveTradeSwapViaRpc(supabase, {
        requestId: request.id,
        requesterRosterId: request.requester_roster_id,
        recipientRosterId: request.recipient_roster_id,
        requesterProgramMembershipId: requester.program_membership_id!,
        recipientProgramMembershipId: recipient.program_membership_id!,
        actorRosterId: params.actorRosterId,
        actorUserId: params.actorUserId ?? null,
        adminNote: params.adminNote ?? null,
      })
    );

    const refreshed = await timedStep(traceId, "mutation.trade.reload_request", async () =>
      getSwapRequestWithDetailsById(supabase, request.id)
    );

    if (!refreshed) {
      throw new Error("Failed to reload approved trade request details.");
    }

    if (refreshed.status !== "approved") {
      throw new Error("Trade request status did not persist as approved.");
    }

    if (refreshed.requesterCall?.rosterId !== request.recipient_roster_id) {
      throw new Error("Requester call did not transfer to the recipient.");
    }

    if (refreshed.recipientCall?.rosterId !== request.requester_roster_id) {
      throw new Error("Recipient call did not transfer to the requester.");
    }

    logTrace(traceId, "mutation.trade.supabase:finish", {
      requestId: refreshed.id,
      finalStatus: refreshed.status,
      requesterCallRosterId: refreshed.requesterCall?.rosterId ?? null,
      recipientCallRosterId: refreshed.recipientCall?.rosterId ?? null,
    });

    return {
      data: refreshed,
      error: null,
    };
  } catch (error) {
    logTrace(traceId, "mutation.trade.rpc:error", {
      requestId: params.requestId,
      error: error instanceof Error ? error.message : "unknown",
    });

    return {
      data: null,
      error:
        error instanceof Error ? error.message : "Failed to apply approved trade swap.",
    };
  }
}
