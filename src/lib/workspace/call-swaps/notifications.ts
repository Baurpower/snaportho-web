import {
  createNotification,
  createNotificationAndMaybeEmail,
  notifyMany,
  notifyManyAndMaybeEmail,
} from "@/lib/workspace/notifications/service";
import type { SwapRequestListItem } from "./types";
import { getSwapAdminRecipientsForProgram } from "./admin-recipients";

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function logTrace(traceId: string | undefined, label: string, details?: Record<string, unknown>) {
  if (!isDev() || !traceId) return;
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.info(`[swap-approval:${traceId}] ${label}${payload}`);
}

function buildSwapActionUrl(requestId: string) {
  return `/work/call/swaps?swapId=${requestId}`;
}

function getCallLabel(request: SwapRequestListItem) {
  const callType = request.requesterCall?.callType ?? "Call";
  const callDate = request.requesterCall?.callDate
    ? new Date(`${request.requesterCall.callDate}T00:00:00`).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      )
    : "an upcoming shift";

  return `${callType} on ${callDate}`;
}

function getRecipientCallLabel(request: SwapRequestListItem) {
  const callType = request.recipientCall?.callType ?? "Call";
  const callDate = request.recipientCall?.callDate
    ? new Date(`${request.recipientCall.callDate}T00:00:00`).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      )
    : "an upcoming shift";

  return `${callType} on ${callDate}`;
}

function getRequesterName(request: SwapRequestListItem) {
  return request.requester?.fullName ?? "A resident";
}

function getRecipientName(request: SwapRequestListItem) {
  return request.recipient?.fullName ?? "The recipient";
}

export async function notifyRecipientOfSwapRequest(request: SwapRequestListItem) {
  const recipientUserId = request.recipient?.claimedByUserId;
  if (!recipientUserId) return;

  await createNotificationAndMaybeEmail({
    important: true,
    notification: {
      programId: request.program_id,
      recipientUserId,
      recipientRosterId: request.recipient?.id ?? null,
      actorUserId: request.requester?.claimedByUserId ?? null,
      actorRosterId: request.requester?.id ?? null,
      type: "call_swap_request_created",
      category: "call_swap",
      title: request.request_type === "trade" ? "Swap request" : "Coverage request",
      message:
        request.request_type === "trade" && request.recipientCall
          ? `${getRequesterName(request)} asked to swap ${getCallLabel(
              request
            )} for your ${getRecipientCallLabel(request)}.`
          : `${getRequesterName(request)} asked you to cover ${getCallLabel(request)}.`,
      actionUrl: buildSwapActionUrl(request.id),
      metadata: {
        swapRequestId: request.id,
        status: request.status,
      },
    },
  });
}

export async function notifyRequesterOfRecipientDecision(params: {
  request: SwapRequestListItem;
  decision: "accept" | "decline";
}) {
  const requesterUserId = params.request.requester?.claimedByUserId;
  if (!requesterUserId) return;

  const accepted = params.decision === "accept";
  const notification = {
    programId: params.request.program_id,
    recipientUserId: requesterUserId,
    recipientRosterId: params.request.requester?.id ?? null,
    actorUserId: params.request.recipient?.claimedByUserId ?? null,
    actorRosterId: params.request.recipient?.id ?? null,
    type: accepted
      ? "call_swap_request_accepted"
      : "call_swap_request_declined",
    category: "call_swap" as const,
    title: accepted
      ? params.request.request_type === "trade"
        ? "Swap request accepted"
        : "Coverage request accepted"
      : params.request.request_type === "trade"
      ? "Swap request declined"
      : "Coverage request declined",
    message: accepted
      ? params.request.request_type === "trade"
        ? `${getRecipientName(
            params.request
          )} accepted your swap request. It is awaiting admin approval.`
        : `${getRecipientName(
            params.request
          )} accepted your coverage request. It is awaiting admin approval.`
      : params.request.request_type === "trade"
      ? `${getRecipientName(params.request)} declined your swap request for ${getCallLabel(
          params.request
        )}.`
      : `${getRecipientName(params.request)} declined your coverage request for ${getCallLabel(
          params.request
        )}.`,
    actionUrl: buildSwapActionUrl(params.request.id),
    metadata: {
      swapRequestId: params.request.id,
      status: params.request.status,
      decision: params.decision,
    },
  };

  if (accepted) {
    await createNotificationAndMaybeEmail({
      important: true,
      notification,
    });
    return;
  }

  await createNotification(notification);
}

export async function notifyAdminsOfAcceptedSwap(request: SwapRequestListItem) {
  const recipients = await getSwapAdminRecipientsForProgram(request.program_id);
  const filteredRecipients = recipients.filter(
    (recipient) =>
      recipient.userId !== request.requester?.claimedByUserId &&
      recipient.userId !== request.recipient?.claimedByUserId
  );

  if (filteredRecipients.length === 0) return;

  await notifyManyAndMaybeEmail({
    important: true,
    notifications: filteredRecipients.map((recipient) => ({
      programId: request.program_id,
      recipientUserId: recipient.userId,
      recipientRosterId: recipient.rosterId,
      actorUserId: request.recipient?.claimedByUserId ?? null,
      actorRosterId: request.recipient?.id ?? null,
      type: "call_swap_admin_approval_needed",
      category: "call_swap",
      title: request.request_type === "trade" ? "Swap approval needed" : "Coverage approval needed",
      message:
        request.request_type === "trade" && request.recipientCall
          ? `${getRequesterName(request)} and ${getRecipientName(
              request
            )} agreed to swap calls.`
          : `${getRequesterName(request)} and ${getRecipientName(
              request
            )} agreed to a coverage change.`,
      actionUrl: buildSwapActionUrl(request.id),
      metadata: {
        swapRequestId: request.id,
        status: request.status,
      },
    })),
  });
}

export async function notifyUsersOfAdminDecision(params: {
  request: SwapRequestListItem;
  decision: "approve" | "reject";
  actorUserId?: string | null;
  actorRosterId?: string | null;
  debugTraceId?: string;
}) {
  const startedAt = Date.now();
  const notifications = [
    {
      userId: params.request.requester?.claimedByUserId ?? null,
      rosterId: params.request.requester?.id ?? null,
    },
    {
      userId: params.request.recipient?.claimedByUserId ?? null,
      rosterId: params.request.recipient?.id ?? null,
    },
  ].filter((recipient): recipient is { userId: string; rosterId: string | null } =>
    Boolean(recipient.userId)
  );

  if (notifications.length === 0) return;

  const approved = params.decision === "approve";
  const shouldEmail = approved || Boolean(params.request.admin_note?.trim());
  logTrace(params.debugTraceId, "notifications.admin_decision.prepare", {
    requestId: params.request.id,
    decision: params.decision,
    recipientCount: notifications.length,
    shouldEmail,
  });
  const mappedNotifications = notifications.map((recipient) => ({
    programId: params.request.program_id,
    recipientUserId: recipient.userId,
    recipientRosterId: recipient.rosterId,
    actorUserId: params.actorUserId ?? null,
    actorRosterId: params.actorRosterId ?? null,
    type: approved
      ? "call_swap_request_approved"
      : "call_swap_request_rejected",
    category: "call_swap" as const,
    title: approved
      ? params.request.request_type === "trade"
        ? "Swap request approved"
        : "Coverage request approved"
      : params.request.request_type === "trade"
      ? "Swap request rejected"
      : "Coverage request rejected",
    message: approved
      ? params.request.request_type === "trade"
        ? "Swap request approved. Both calls have been updated."
        : `Coverage request approved. ${getRecipientName(
            params.request
          )} now covers ${getCallLabel(params.request)}.`
      : params.request.request_type === "trade"
      ? `An admin rejected the swap request involving ${getCallLabel(
          params.request
        )}.`
      : `An admin rejected the coverage request for ${getCallLabel(
          params.request
        )}.`,
    actionUrl: buildSwapActionUrl(params.request.id),
    metadata: {
      swapRequestId: params.request.id,
      status: params.request.status,
      decision: params.decision,
    },
  }));

  if (shouldEmail) {
    await notifyManyAndMaybeEmail({
      important: true,
      notifications: mappedNotifications,
      debugLabel: params.debugTraceId
        ? `[swap-approval:${params.debugTraceId}] notifications.admin_decision`
        : undefined,
    });
    logTrace(params.debugTraceId, "notifications.admin_decision.sent", {
      durationMs: Date.now() - startedAt,
      mode: "notifyManyAndMaybeEmail",
    });
    return;
  }

  await notifyMany(mappedNotifications);
  logTrace(params.debugTraceId, "notifications.admin_decision.sent", {
    durationMs: Date.now() - startedAt,
    mode: "notifyMany",
  });
}

export async function notifyRecipientOfCancellation(params: {
  request: SwapRequestListItem;
  important?: boolean;
}) {
  const recipientUserId = params.request.recipient?.claimedByUserId;
  if (!recipientUserId) return;
  const notification = {
    programId: params.request.program_id,
    recipientUserId,
    recipientRosterId: params.request.recipient?.id ?? null,
    actorUserId: params.request.requester?.claimedByUserId ?? null,
    actorRosterId: params.request.requester?.id ?? null,
    type: "call_swap_request_cancelled",
    category: "call_swap",
    title:
      params.request.request_type === "trade"
        ? "Swap request cancelled"
        : "Coverage request cancelled",
    message:
      params.request.request_type === "trade"
        ? `${getRequesterName(params.request)} cancelled the swap request for ${getCallLabel(
            params.request
          )}.`
        : `${getRequesterName(params.request)} cancelled the coverage request for ${getCallLabel(
            params.request
          )}.`,
    actionUrl: buildSwapActionUrl(params.request.id),
    metadata: {
      swapRequestId: params.request.id,
      status: params.request.status,
    },
  };

  if (params.important) {
    await createNotificationAndMaybeEmail({
      important: true,
      notification,
    });
    return;
  }

  await createNotification(notification);
}

export async function notifyRequesterOfExpiration(request: SwapRequestListItem) {
  const requesterUserId = request.requester?.claimedByUserId;
  if (!requesterUserId) return;

  await createNotification({
    programId: request.program_id,
    recipientUserId: requesterUserId,
    recipientRosterId: request.requester?.id ?? null,
    actorUserId: null,
    actorRosterId: null,
    type: "call_swap_request_expired",
    category: "call_swap",
    title: request.request_type === "trade" ? "Swap request expired" : "Coverage request expired",
    message:
      request.request_type === "trade"
        ? `Your swap request involving ${getCallLabel(
            request
          )} expired before it was completed.`
        : `Your coverage request for ${getCallLabel(
            request
          )} expired before it was completed.`,
    actionUrl: buildSwapActionUrl(request.id),
    metadata: {
      swapRequestId: request.id,
      status: request.status,
    },
  });
}
