import type { SupabaseClient } from "@supabase/supabase-js";
import { canApproveSwapRequest, canCancelSwapRequest, canCreateSwapRequest, canRespondToSwapRequest } from "./permissions";
import {
  createSwapRequestRecord,
  getActiveRequestsTouchingCallIds,
  getSwapRequestById,
  getSwapRequestWithDetailsById,
  insertSwapAuditLog,
  updateSwapRequestStatus,
} from "./queries";
import {
  validateCanAdminApproveSwapRequest,
  validateCanCreateSwapRequest,
  validateCanRespondToSwapRequest,
} from "./rules";
import {
  applyApprovedCoverageSwap,
  applyApprovedTradeSwap,
} from "./schedule-mutation";
import {
  notifyAdminsOfAcceptedSwap,
  notifyRecipientOfCancellation,
  notifyRecipientOfSwapRequest,
  notifyRequesterOfExpiration,
  notifyRequesterOfRecipientDecision,
  notifyUsersOfAdminDecision,
} from "./notifications";
import type {
  AdminSwapDecisionInput,
  CancelSwapRequestInput,
  CreateSwapRequestInput,
  RespondToSwapRequestInput,
  ShiftSwapRequest,
  SwapCallOwnershipSnapshot,
  SwapPermissionContext,
  SwapRosterEligibility,
} from "./types";

type ServiceResult<T> = {
  data: T | null;
  error: string | null;
  warnings?: string[];
};

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function logTrace(traceId: string | undefined, label: string, details?: Record<string, unknown>) {
  if (!isDev() || !traceId) return;
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.info(`[swap-approval:${traceId}] ${label}${payload}`);
}

function logCreate(label: string, details?: Record<string, unknown>) {
  if (!isDev()) return;
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.info(`[swap-create-service] ${label}${payload}`);
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

function hasExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  const expiresAtDate = new Date(expiresAt);
  return !Number.isNaN(expiresAtDate.getTime()) && expiresAtDate.getTime() <= Date.now();
}

type CallRow = {
  id: string;
  program_id: string | null;
  roster_id: string | null;
  program_membership_id: string | null;
  call_type: string | null;
  call_date: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  site: string | null;
  is_home_call: boolean | null;
  notes: string | null;
};

type RosterRow = {
  id: string;
  program_id: string | null;
  role: string | null;
  grad_year: number | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  program_membership_id: string | null;
  claimed_by_user_id: string | null;
  isAdmin: boolean | null;
};

async function loadCallById(
  supabase: SupabaseClient,
  callId: string
): Promise<CallRow | null> {
  const { data, error } = await supabase
    .from("call_assignments")
    .select(
      "id, program_id, roster_id, program_membership_id, call_type, call_date, start_datetime, end_datetime, site, is_home_call, notes"
    )
    .eq("id", callId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load call assignment: ${error.message}`);
  }

  return (data as CallRow | null) ?? null;
}

async function loadRosterById(
  supabase: SupabaseClient,
  rosterId: string
): Promise<RosterRow | null> {
  const { data, error } = await supabase
    .from("program_roster")
    .select(
      "id, program_id, role, grad_year, full_name, first_name, last_name, program_membership_id, claimed_by_user_id, isAdmin"
    )
    .eq("id", rosterId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load roster member: ${error.message}`);
  }

  return (data as RosterRow | null) ?? null;
}

async function loadRecipientCallsOnDate(
  supabase: SupabaseClient,
  params: {
    rosterId: string;
    callDate: string | null;
    excludeCallIds?: string[];
  }
): Promise<SwapCallOwnershipSnapshot[]> {
  if (!params.callDate) return [];

  let query = supabase
    .from("call_assignments")
    .select("id, roster_id, program_id, call_date, start_datetime, end_datetime")
    .eq("roster_id", params.rosterId)
    .eq("call_date", params.callDate);

  for (const excludedId of params.excludeCallIds ?? []) {
    query = query.neq("id", excludedId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load roster schedule conflicts: ${error.message}`);
  }

  return ((data ?? []) as Array<{
    id: string;
    roster_id: string | null;
    program_id: string | null;
    call_date: string | null;
    start_datetime: string | null;
    end_datetime: string | null;
  }>).map((row) => ({
    callId: row.id,
    rosterId: row.roster_id,
    programId: row.program_id,
    callDate: row.call_date,
    startDatetime: row.start_datetime,
    endDatetime: row.end_datetime,
  }));
}

function toCallSnapshot(call: CallRow | null): SwapCallOwnershipSnapshot | null {
  if (!call) return null;

  return {
    callId: call.id,
    rosterId: call.roster_id,
    programId: call.program_id,
    callDate: call.call_date,
    startDatetime: call.start_datetime,
    endDatetime: call.end_datetime,
  };
}

function toRosterEligibility(roster: RosterRow | null): SwapRosterEligibility | null {
  if (!roster) return null;

  return {
    rosterId: roster.id,
    programId: roster.program_id,
    gradYear: roster.grad_year,
    role: roster.role,
  };
}

async function recordSwapAuditEvent(
  supabase: SupabaseClient,
  params: {
    request: ShiftSwapRequest;
    actorRosterId?: string | null;
    action: string;
    previousStatus: ShiftSwapRequest["status"] | null;
    newStatus: ShiftSwapRequest["status"] | null;
    metadata?: Record<string, unknown> | null;
  }
) {
  await insertSwapAuditLog(supabase, {
    request_id: params.request.id,
    program_id: params.request.program_id,
    actor_roster_id: params.actorRosterId ?? null,
    action: params.action,
    previous_status: params.previousStatus,
    new_status: params.newStatus,
    metadata: params.metadata ?? null,
  });
}

async function runBestEffortNotification(
  label: string,
  work: () => Promise<void>,
  traceId?: string
) {
  const startedAt = Date.now();
  logTrace(traceId, `notifications.${label}:start`);
  try {
    await work();
    logTrace(traceId, `notifications.${label}:finish`, {
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    logTrace(traceId, `notifications.${label}:error`, {
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`[call-swaps] ${label} notification failed`, error);
  }
}

export async function createDirectSwapRequest(
  supabase: SupabaseClient,
  context: SwapPermissionContext,
  input: CreateSwapRequestInput
): Promise<ServiceResult<Awaited<ReturnType<typeof getSwapRequestWithDetailsById>>>> {
  const requestType = input.requestType ?? "coverage_only";

  if (!canCreateSwapRequest(context, {
    requesterRosterId: input.requesterRosterId,
    programId: input.programId,
  })) {
    return {
      data: null,
      error: "You do not have permission to create this swap request.",
    };
  }

  if (hasExpired(input.expiresAt ?? null)) {
    return {
      data: null,
      error: "Expiration must be in the future.",
    };
  }

  logCreate("create.start", {
    requestType,
    requesterRosterId: input.requesterRosterId,
    recipientRosterId: input.recipientRosterId,
    requesterCallId: input.requesterCallId,
    recipientCallId: input.recipientCallId ?? null,
  });

  const requesterCall = await loadCallById(supabase, input.requesterCallId);
  const requester = await loadRosterById(supabase, input.requesterRosterId);
  const recipient = await loadRosterById(supabase, input.recipientRosterId);
  const recipientCall =
    requestType === "trade" && input.recipientCallId
      ? await loadCallById(supabase, input.recipientCallId)
      : null;

  logCreate("create.lookups.done", {
    requesterCallFound: !!requesterCall,
    requesterCallRosterId: requesterCall?.roster_id ?? null,
    requesterCallDate: requesterCall?.call_date ?? null,
    requesterFound: !!requester,
    recipientFound: !!recipient,
    recipientCallFound: requestType === "trade" ? !!recipientCall : "n/a (coverage_only)",
  });

  const recipientCalls = await loadRecipientCallsOnDate(supabase, {
    rosterId: input.recipientRosterId,
    callDate: requesterCall?.call_date ?? null,
    excludeCallIds: requestType === "trade" && input.recipientCallId
      ? [input.recipientCallId]
      : undefined,
  });
  const requesterCallsForRecipientTradeDate = await loadRecipientCallsOnDate(supabase, {
    rosterId: input.requesterRosterId,
    callDate: recipientCall?.call_date ?? null,
    excludeCallIds: [input.requesterCallId, input.recipientCallId ?? ""].filter(Boolean),
  });
  const recipientCallsForRequesterTradeDate = await loadRecipientCallsOnDate(supabase, {
    rosterId: input.recipientRosterId,
    callDate: requesterCall?.call_date ?? null,
    excludeCallIds: [input.requesterCallId, input.recipientCallId ?? ""].filter(Boolean),
  });
  const activeRequestsTouchingCalls = await getActiveRequestsTouchingCallIds(
    supabase,
    [input.requesterCallId, input.recipientCallId ?? ""]
  );

  logCreate("create.conflict-check.data", {
    recipientCallsOnSameDate: recipientCalls.length,
    recipientCallDates: recipientCalls.map((c) => c.callDate),
    activeRequestsTouchingCount: activeRequestsTouchingCalls.length,
    activeRequestIds: activeRequestsTouchingCalls.map((r) => ({
      id: r.id,
      status: r.status,
      type: r.request_type,
    })),
  });

  const requesterCallSnapshot = toCallSnapshot(requesterCall);
  const recipientCallSnapshot = toCallSnapshot(recipientCall);

  if (
    requesterCallSnapshot?.programId &&
    requesterCallSnapshot.programId !== input.programId
  ) {
    return {
      data: null,
      error: "Selected requester call does not belong to this program.",
    };
  }

  if (
    recipientCallSnapshot?.programId &&
    recipientCallSnapshot.programId !== input.programId
  ) {
    return {
      data: null,
      error: "Selected return shift does not belong to this program.",
    };
  }

  if (requestType === "trade" && !input.recipientCallId) {
    return {
      data: null,
      error: "Trade requests require selecting the other resident's shift.",
    };
  }

  if (requestType === "coverage_only" && input.recipientCallId) {
    return {
      data: null,
      error: "Coverage requests cannot include a return shift.",
    };
  }

  if (requestType === "trade" && input.requesterCallId === input.recipientCallId) {
    return {
      data: null,
      error: "Trade requests must involve two different call assignments.",
    };
  }

  const validation = validateCanCreateSwapRequest({
    requesterRosterId: input.requesterRosterId,
    requesterProgramId: input.programId,
    requester: toRosterEligibility(requester),
    requesterCall: requesterCallSnapshot,
    recipient: toRosterEligibility(recipient),
    recipientRosterId: input.recipientRosterId,
    recipientCall: recipientCallSnapshot,
    activeRequestsTouchingCalls,
    recipientCalls,
    requesterCallsForRecipientTradeDate,
    recipientCallsForRequesterTradeDate,
    requestType,
    now: new Date(),
    today: new Date().toISOString().slice(0, 10),
  });

  logCreate("create.validation.result", {
    ok: validation.ok,
    errors: validation.errors,
    warnings: validation.warnings,
  });

  if (!validation.ok) {
    return {
      data: null,
      error: validation.errors.join(" "),
      warnings: validation.warnings,
    };
  }

  const created = await createSwapRequestRecord(supabase, {
    program_id: input.programId,
    requester_roster_id: input.requesterRosterId,
    recipient_roster_id: input.recipientRosterId,
    requester_call_id: input.requesterCallId,
    recipient_call_id: input.recipientCallId ?? null,
    request_type: requestType,
    status: "pending_recipient",
    requester_note: input.requesterNote ?? null,
    recipient_note: null,
    admin_note: null,
    expires_at: input.expiresAt ?? null,
  });

  await recordSwapAuditEvent(supabase, {
    request: created,
    actorRosterId: context.rosterId ?? null,
    action: "created",
    previousStatus: null,
    newStatus: created.status,
    metadata: {
      requestType: created.request_type,
      requesterCallId: created.requester_call_id,
      recipientCallId: created.recipient_call_id,
      requesterNote: created.requester_note,
    },
  });

  const detailedRequest = await getSwapRequestWithDetailsById(supabase, created.id);

  if (detailedRequest) {
    await runBestEffortNotification("request-created", async () => {
      await notifyRecipientOfSwapRequest(detailedRequest);
    });
  }

  if (!detailedRequest) {
    return {
      data: null,
      error: "Swap request was created but could not be reloaded.",
      warnings: validation.warnings,
    };
  }

  return {
    data: detailedRequest,
    error: null,
    warnings: validation.warnings,
  };
}

export async function respondToSwapRequest(
  supabase: SupabaseClient,
  context: SwapPermissionContext,
  input: RespondToSwapRequestInput
): Promise<ServiceResult<Awaited<ReturnType<typeof getSwapRequestWithDetailsById>>>> {
  const existing = await getSwapRequestById(supabase, input.requestId);

  if (!existing) {
    return {
      data: null,
      error: "Swap request not found.",
    };
  }

  if (!canRespondToSwapRequest(context, existing)) {
    return {
      data: null,
      error: "You do not have permission to respond to this swap request.",
    };
  }

  if (hasExpired(existing.expires_at)) {
    return {
      data: null,
      error: "This swap request has expired.",
    };
  }

  const validation = validateCanRespondToSwapRequest({
    request: existing,
  });

  if (!validation.ok) {
    return {
      data: null,
      error: validation.errors.join(" "),
    };
  }

  const nextStatus =
    input.decision === "accept" ? "accepted_pending_admin" : "declined";

  const updated = await updateSwapRequestStatus(supabase, {
    requestId: existing.id,
    status: nextStatus,
    recipientNote: input.recipientNote ?? null,
  });

  await recordSwapAuditEvent(supabase, {
    request: updated,
    actorRosterId: context.rosterId ?? null,
    action: input.decision === "accept" ? "recipient_accepted" : "recipient_declined",
    previousStatus: existing.status,
    newStatus: updated.status,
    metadata: {
      recipientNote: input.recipientNote ?? null,
    },
  });

  const detailedRequest = await getSwapRequestWithDetailsById(supabase, updated.id);

  if (detailedRequest) {
    await runBestEffortNotification(`recipient-${input.decision}`, async () => {
      await notifyRequesterOfRecipientDecision({
        request: detailedRequest,
        decision: input.decision,
      });

      if (input.decision === "accept") {
        await notifyAdminsOfAcceptedSwap(detailedRequest);
      }
    });
  }

  if (!detailedRequest) {
    return {
      data: null,
      error: "Swap request was updated but could not be reloaded.",
    };
  }

  return {
    data: detailedRequest,
    error: null,
  };
}

export async function cancelSwapRequest(
  supabase: SupabaseClient,
  context: SwapPermissionContext,
  input: CancelSwapRequestInput
): Promise<ServiceResult<Awaited<ReturnType<typeof getSwapRequestWithDetailsById>>>> {
  const existing = await getSwapRequestById(supabase, input.requestId);

  if (!existing) {
    return {
      data: null,
      error: "Swap request not found.",
    };
  }

  if (!canCancelSwapRequest(context, existing)) {
    return {
      data: null,
      error: "You do not have permission to cancel this swap request.",
    };
  }

  if (hasExpired(existing.expires_at)) {
    return {
      data: null,
      error: "Expired swap requests cannot be cancelled.",
    };
  }

  const updated = await updateSwapRequestStatus(supabase, {
    requestId: existing.id,
    status: "cancelled",
    adminNote: input.cancelReason ?? undefined,
  });

  await recordSwapAuditEvent(supabase, {
    request: updated,
    actorRosterId: context.rosterId ?? null,
    action: "cancelled",
    previousStatus: existing.status,
    newStatus: updated.status,
    metadata: {
      cancelReason: input.cancelReason ?? null,
    },
  });

  const detailedRequest = await getSwapRequestWithDetailsById(supabase, updated.id);

  if (detailedRequest) {
    await runBestEffortNotification("request-cancelled", async () => {
      await notifyRecipientOfCancellation({
        request: detailedRequest,
        important: existing.status === "accepted_pending_admin",
      });
    });
  }

  if (!detailedRequest) {
    return {
      data: null,
      error: "Swap request was cancelled but could not be reloaded.",
    };
  }

  return {
    data: detailedRequest,
    error: null,
  };
}

export async function adminDecideSwapRequest(
  supabase: SupabaseClient,
  context: SwapPermissionContext,
  input: AdminSwapDecisionInput,
  options?: {
    traceId?: string;
  }
): Promise<ServiceResult<Awaited<ReturnType<typeof getSwapRequestWithDetailsById>>>> {
  const traceId = options?.traceId;
  logTrace(traceId, "service.admin_decide.entered", {
    requestId: input.requestId,
    decision: input.decision,
    actorRosterId: context.rosterId ?? null,
    actorUserId: context.userId ?? null,
  });

  const existing = await timedStep(traceId, "service.load_swap_request", async () =>
    getSwapRequestById(supabase, input.requestId)
  );

  if (!existing) {
    return {
      data: null,
      error: "Swap request not found.",
    };
  }

  if (!canApproveSwapRequest(context).canApprove) {
    return {
      data: null,
      error: "You do not have permission to approve this swap request.",
    };
  }

  if (hasExpired(existing.expires_at)) {
    return {
      data: null,
      error: "Expired swap requests cannot be processed.",
    };
  }

  const validation = await timedStep(traceId, "service.validate_admin_decision", async () =>
    validateCanAdminApproveSwapRequest({
      request: existing,
    })
  );

  if (!validation.ok) {
    return {
      data: null,
      error: validation.errors.join(" "),
    };
  }

  const nextStatus = input.decision === "approve" ? "approved" : "rejected";
  let updated: Awaited<ReturnType<typeof getSwapRequestWithDetailsById>> | null = null;

  if (input.decision === "approve") {
    const mutationResult =
      existing.request_type === "trade"
        ? await timedStep(traceId, "service.apply_trade_swap", async () =>
            applyApprovedTradeSwap(supabase, {
              requestId: existing.id,
              actorRosterId: context.rosterId ?? null,
              actorUserId: context.userId ?? null,
              adminNote: input.adminNote ?? null,
              debugTraceId: traceId,
            })
          )
        : await timedStep(traceId, "service.apply_coverage_swap", async () =>
            applyApprovedCoverageSwap(supabase, {
              requestId: existing.id,
              actorRosterId: context.rosterId ?? null,
              actorUserId: context.userId ?? null,
              adminNote: input.adminNote ?? null,
              debugTraceId: traceId,
            })
          );

    if (mutationResult.error || !mutationResult.data) {
      logTrace(traceId, "service.admin_decide.mutation_failed", {
        error: mutationResult.error ?? "Missing mutation data",
      });
      return {
        data: null,
        error: mutationResult.error ?? "Failed to approve swap request.",
      };
    }

    updated = mutationResult.data;
  } else {
    const rejected = await timedStep(traceId, "service.reject_swap_request", async () =>
      updateSwapRequestStatus(supabase, {
        requestId: existing.id,
        status: nextStatus,
        adminNote: input.adminNote ?? null,
      })
    );

    await timedStep(traceId, "service.record_admin_reject_audit", async () =>
      recordSwapAuditEvent(supabase, {
        request: rejected,
        actorRosterId: context.rosterId ?? null,
        action: "admin_rejected",
        previousStatus: existing.status,
        newStatus: rejected.status,
        metadata: {
          adminNote: input.adminNote ?? null,
        },
      })
    );

    updated = await timedStep(traceId, "service.reload_rejected_request", async () =>
      getSwapRequestWithDetailsById(supabase, rejected.id)
    );
  }

  if (!updated) {
    return {
      data: null,
      error: "Failed to load updated swap request.",
    };
  }

  await runBestEffortNotification(
    `admin-${input.decision}`,
    async () => {
      await timedStep(traceId, "service.notify_users_of_admin_decision", async () =>
        notifyUsersOfAdminDecision({
          request: updated,
          decision: input.decision,
          actorUserId: context.userId ?? null,
          actorRosterId: context.rosterId ?? null,
          debugTraceId: traceId,
        })
      );
    },
    traceId
  );

  logTrace(traceId, "service.admin_decide.completed", {
    requestId: updated.id,
    status: updated.status,
  });

  return {
    data: updated,
    error: null,
  };
}

export async function expireOldSwapRequests(
  supabase: SupabaseClient,
  params: {
    now?: string;
  } = {}
): Promise<ServiceResult<{ expiredCount: number }>> {
  const now = params.now ?? new Date().toISOString();

  const { data: rows, error } = await supabase
    .from("shift_swap_requests")
    .select("id")
    .eq("status", "pending_recipient")
    .not("expires_at", "is", null)
    .lt("expires_at", now);

  if (error) {
    return {
      data: null,
      error: `Failed to query expiring swap requests: ${error.message}`,
    };
  }

  let expiredCount = 0;

  for (const row of (rows ?? []) as Array<{ id: string }>) {
    const existing = await getSwapRequestById(supabase, row.id);
    if (!existing) continue;

    const updated = await updateSwapRequestStatus(supabase, {
      requestId: existing.id,
      status: "expired",
    });

    await recordSwapAuditEvent(supabase, {
      request: updated,
      actorRosterId: null,
      action: "expired",
      previousStatus: existing.status,
      newStatus: updated.status,
      metadata: {
        expiredAt: now,
      },
    });

    const detailedRequest = await getSwapRequestWithDetailsById(supabase, updated.id);
    if (detailedRequest) {
      await runBestEffortNotification("request-expired", async () => {
        await notifyRequesterOfExpiration(detailedRequest);
      });
    }

    expiredCount += 1;
  }

  return {
    data: { expiredCount },
    error: null,
  };
}
