import type {
  ShiftSwapRequest,
  SwapCallOwnershipSnapshot,
  SwapRequestStatus,
  SwapRequestType,
  SwapRosterEligibility,
  SwapRuleResult,
} from "./types";

const ACTIVE_DUPLICATE_STATUSES: SwapRequestStatus[] = [
  "pending_recipient",
  "accepted_pending_admin",
];

function buildResult(errors: string[], warnings: string[] = []): SwapRuleResult {
  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function isDateInPast(callDate: string | null, now = new Date()) {
  if (!callDate) return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${callDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return false;
  return target < today;
}

function hasTimeOverlap(
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

export function validateRequesterOwnsCall(params: {
  requesterRosterId: string;
  requesterCall: SwapCallOwnershipSnapshot | null;
}) {
  const errors: string[] = [];

  if (!params.requesterCall) {
    errors.push("Selected call could not be found.");
  } else if (params.requesterCall.rosterId !== params.requesterRosterId) {
    errors.push("Requester does not own the selected call.");
  }

  return buildResult(errors);
}

export function validateRecipientEligible(params: {
  requesterRosterId: string;
  requesterProgramId: string;
  recipient: SwapRosterEligibility | null;
  today?: string | null;
}) {
  const errors: string[] = [];

  if (!params.recipient) {
    errors.push("Recipient could not be found.");
    return buildResult(errors);
  }

  if (params.requesterRosterId === params.recipient.rosterId) {
    errors.push("Requester cannot send a swap request to themselves.");
  }

  if (params.recipient.programId !== params.requesterProgramId) {
    errors.push("Recipient must belong to the same program.");
  }

  if (params.recipient.gradYear === null) {
    errors.push("Recipient must have a grad year before receiving coverage requests.");
  }

  if (params.today && params.recipient.gradYear !== null) {
    const currentYear = Number(params.today.slice(0, 4));
    if (Number.isInteger(currentYear) && params.recipient.gradYear < currentYear) {
      errors.push("Recipient cannot be graduated.");
    }
  }

  return buildResult(errors);
}

export function validateRequesterEligibleForTrade(params: {
  requestType: SwapRequestType;
  requesterProgramId: string;
  requester: SwapRosterEligibility | null;
  today?: string | null;
}) {
  const errors: string[] = [];

  if (params.requestType !== "trade") {
    return buildResult(errors);
  }

  if (!params.requester) {
    errors.push("Requester could not be found.");
    return buildResult(errors);
  }

  if (params.requester.programId !== params.requesterProgramId) {
    errors.push("Requester must belong to the same program.");
  }

  if (params.requester.gradYear === null) {
    errors.push("Requester must have a grad year before trading calls.");
  }

  if (params.today && params.requester.gradYear !== null) {
    const currentYear = Number(params.today.slice(0, 4));
    if (Number.isInteger(currentYear) && params.requester.gradYear < currentYear) {
      errors.push("Requester cannot be graduated.");
    }
  }

  return buildResult(errors);
}

export function validateCallNotInPast(params: {
  requesterCall: SwapCallOwnershipSnapshot | null;
  now?: Date;
}) {
  const errors: string[] = [];

  if (!params.requesterCall) {
    errors.push("Selected call could not be found.");
    return buildResult(errors);
  }

  if (isDateInPast(params.requesterCall.callDate, params.now)) {
    errors.push("Past calls cannot be used for swap requests.");
  }

  return buildResult(errors);
}

export function validateNoDuplicateActiveRequest(params: {
  duplicateRequest:
    | Pick<ShiftSwapRequest, "id" | "status" | "request_type">
    | null;
  requestType: SwapRequestType;
}) {
  const errors: string[] = [];

  if (
    params.duplicateRequest &&
    ACTIVE_DUPLICATE_STATUSES.includes(params.duplicateRequest.status) &&
    params.duplicateRequest.request_type === params.requestType
  ) {
    errors.push("An active request already exists for this call and recipient.");
  }

  return buildResult(errors);
}

export function validateTradeHasRecipientCall(params: {
  requestType: SwapRequestType;
  recipientCall: SwapCallOwnershipSnapshot | null;
}) {
  const errors: string[] = [];

  if (params.requestType === "trade" && !params.recipientCall) {
    errors.push("Trade requests require selecting the other resident's call.");
  }

  if (params.requestType === "coverage_only" && params.recipientCall) {
    errors.push("Coverage-only requests cannot include a return shift.");
  }

  return buildResult(errors);
}

export function validateTradeCallsDistinct(params: {
  requestType: SwapRequestType;
  requesterCall: SwapCallOwnershipSnapshot | null;
  recipientCall: SwapCallOwnershipSnapshot | null;
}) {
  const errors: string[] = [];

  if (params.requestType !== "trade") {
    return buildResult(errors);
  }

  if (!params.requesterCall || !params.recipientCall) {
    return buildResult(errors);
  }

  if (params.requesterCall.callId === params.recipientCall.callId) {
    errors.push("Trade requests must involve two different call assignments.");
  }

  return buildResult(errors);
}

export function validateRecipientOwnsTradeCall(params: {
  requestType: SwapRequestType;
  recipientRosterId: string;
  recipientCall: SwapCallOwnershipSnapshot | null;
}) {
  const errors: string[] = [];

  if (params.requestType !== "trade") {
    return buildResult(errors);
  }

  if (!params.recipientCall) {
    errors.push("Selected return shift could not be found.");
  } else if (params.recipientCall.rosterId !== params.recipientRosterId) {
    errors.push("Recipient no longer owns the selected return shift.");
  }

  return buildResult(errors);
}

export function validateNoScheduleConflict(params: {
  requesterCall: SwapCallOwnershipSnapshot | null;
  recipientCalls: SwapCallOwnershipSnapshot[];
}) {
  const errors: string[] = [];

  if (!params.requesterCall) {
    errors.push("Selected call could not be found.");
    return buildResult(errors);
  }

  const conflictingCall = params.recipientCalls.find((call) => {
    if (!call.callDate || !params.requesterCall?.callDate) return false;
    if (call.callDate !== params.requesterCall.callDate) return false;

    if (
      hasTimeOverlap(
        params.requesterCall.startDatetime,
        params.requesterCall.endDatetime,
        call.startDatetime,
        call.endDatetime
      )
    ) {
      return true;
    }

    return (
      !params.requesterCall.startDatetime ||
      !params.requesterCall.endDatetime ||
      !call.startDatetime ||
      !call.endDatetime
    );
  });

  if (conflictingCall) {
    errors.push("Recipient already has a conflicting call assignment.");
  }

  return buildResult(errors);
}

export function validateNoTradeConflict(params: {
  requestType: SwapRequestType;
  incomingCall: SwapCallOwnershipSnapshot | null;
  otherCalls: SwapCallOwnershipSnapshot[];
  actorLabel: string;
}) {
  const errors: string[] = [];

  if (params.requestType !== "trade") {
    return buildResult(errors);
  }

  if (!params.incomingCall) {
    errors.push("Selected return shift could not be found.");
    return buildResult(errors);
  }

  const conflictingCall = params.otherCalls.find((call) => {
    if (!call.callDate || !params.incomingCall?.callDate) return false;
    if (call.callDate !== params.incomingCall.callDate) return false;

    if (
      hasTimeOverlap(
        params.incomingCall.startDatetime,
        params.incomingCall.endDatetime,
        call.startDatetime,
        call.endDatetime
      )
    ) {
      return true;
    }

    return (
      !params.incomingCall.startDatetime ||
      !params.incomingCall.endDatetime ||
      !call.startDatetime ||
      !call.endDatetime
    );
  });

  if (conflictingCall) {
    errors.push(`${params.actorLabel} already has a conflicting call assignment.`);
  }

  return buildResult(errors);
}

export function validateNoCoverageDuplicateActiveRequests(params: {
  requestType: SwapRequestType;
  activeRequestsTouchingCalls: Array<
    Pick<
      ShiftSwapRequest,
      | "id"
      | "status"
      | "request_type"
      | "requester_call_id"
      | "recipient_call_id"
    >
  >;
  requesterCallId: string;
}) {
  const errors: string[] = [];

  if (params.requestType !== "coverage_only") {
    return buildResult(errors);
  }

  const duplicate = params.activeRequestsTouchingCalls.find((request) => {
    if (!ACTIVE_DUPLICATE_STATUSES.includes(request.status)) return false;
    return (
      request.requester_call_id === params.requesterCallId ||
      request.recipient_call_id === params.requesterCallId
    );
  });

  if (duplicate) {
    errors.push("This call already has an active coverage or trade request.");
  }

  return buildResult(errors);
}

export function validateNoTradeDuplicateActiveRequests(params: {
  requestType: SwapRequestType;
  activeRequestsTouchingCalls: Array<
    Pick<
      ShiftSwapRequest,
      | "id"
      | "status"
      | "request_type"
      | "requester_call_id"
      | "recipient_call_id"
    >
  >;
  requesterCallId: string;
  recipientCallId: string | null;
}) {
  const errors: string[] = [];

  if (params.requestType !== "trade" || !params.recipientCallId) {
    return buildResult(errors);
  }

  const duplicate = params.activeRequestsTouchingCalls.find((request) => {
    if (!ACTIVE_DUPLICATE_STATUSES.includes(request.status)) return false;
    return (
      request.requester_call_id === params.requesterCallId ||
      request.requester_call_id === params.recipientCallId ||
      request.recipient_call_id === params.requesterCallId ||
      request.recipient_call_id === params.recipientCallId
    );
  });

  if (duplicate) {
    errors.push(
      "One of the selected calls already has an active coverage or trade request."
    );
  }

  return buildResult(errors);
}

export function validateCanCreateSwapRequest(params: {
  requesterRosterId: string;
  requesterProgramId: string;
  requester: SwapRosterEligibility | null;
  requesterCall: SwapCallOwnershipSnapshot | null;
  recipient: SwapRosterEligibility | null;
  recipientRosterId: string;
  recipientCall: SwapCallOwnershipSnapshot | null;
  activeRequestsTouchingCalls: Array<
    Pick<
      ShiftSwapRequest,
      | "id"
      | "status"
      | "request_type"
      | "requester_call_id"
      | "recipient_call_id"
    >
  >;
  recipientCalls: SwapCallOwnershipSnapshot[];
  requesterCallsForRecipientTradeDate: SwapCallOwnershipSnapshot[];
  recipientCallsForRequesterTradeDate: SwapCallOwnershipSnapshot[];
  requestType: SwapRequestType;
  now?: Date;
  today?: string | null;
}) {
  const results = [
    validateRequesterOwnsCall({
      requesterRosterId: params.requesterRosterId,
      requesterCall: params.requesterCall,
    }),
    validateRecipientEligible({
      requesterRosterId: params.requesterRosterId,
      requesterProgramId: params.requesterProgramId,
      recipient: params.recipient,
      today: params.today,
    }),
    validateRequesterEligibleForTrade({
      requestType: params.requestType,
      requesterProgramId: params.requesterProgramId,
      requester: params.requester,
      today: params.today,
    }),
    validateCallNotInPast({
      requesterCall: params.requesterCall,
      now: params.now,
    }),
    // For trade requests, also verify the recipient's return call is not in the
    // past. For coverage_only, there is no recipient call — passing null here
    // would incorrectly trigger "Selected call could not be found." so we use a
    // no-op result instead.
    params.requestType === "trade"
      ? validateCallNotInPast({
          requesterCall: params.recipientCall,
          now: params.now,
        })
      : buildResult([]),
    validateTradeHasRecipientCall({
      requestType: params.requestType,
      recipientCall: params.recipientCall,
    }),
    validateTradeCallsDistinct({
      requestType: params.requestType,
      requesterCall: params.requesterCall,
      recipientCall: params.recipientCall,
    }),
    validateRecipientOwnsTradeCall({
      requestType: params.requestType,
      recipientRosterId: params.recipientRosterId,
      recipientCall: params.recipientCall,
    }),
    validateNoCoverageDuplicateActiveRequests({
      requestType: params.requestType,
      activeRequestsTouchingCalls: params.activeRequestsTouchingCalls,
      requesterCallId: params.requesterCall?.callId ?? "",
    }),
    validateNoTradeDuplicateActiveRequests({
      requestType: params.requestType,
      activeRequestsTouchingCalls: params.activeRequestsTouchingCalls,
      requesterCallId: params.requesterCall?.callId ?? "",
      recipientCallId: params.recipientCall?.callId ?? null,
    }),
    validateNoScheduleConflict({
      requesterCall: params.requesterCall,
      recipientCalls: params.recipientCalls,
    }),
    validateNoTradeConflict({
      requestType: params.requestType,
      incomingCall: params.recipientCall,
      otherCalls: params.requesterCallsForRecipientTradeDate,
      actorLabel: "Requester",
    }),
    validateNoTradeConflict({
      requestType: params.requestType,
      incomingCall: params.requesterCall,
      otherCalls: params.recipientCallsForRequesterTradeDate,
      actorLabel: "Recipient",
    }),
  ];

  return buildResult(
    results.flatMap((result) => result.errors),
    results.flatMap((result) => result.warnings)
  );
}

export function validateCanRespondToSwapRequest(params: {
  request: Pick<ShiftSwapRequest, "status"> | null;
}) {
  const errors: string[] = [];

  if (!params.request) {
    errors.push("Swap request could not be found.");
  } else if (params.request.status !== "pending_recipient") {
    errors.push("Only pending recipient requests can be answered.");
  }

  return buildResult(errors);
}

export function validateCanAdminApproveSwapRequest(params: {
  request: Pick<ShiftSwapRequest, "status"> | null;
}) {
  const errors: string[] = [];

  if (!params.request) {
    errors.push("Swap request could not be found.");
  } else if (params.request.status !== "accepted_pending_admin") {
    errors.push("Only requests awaiting admin approval can be approved or rejected.");
  }

  return buildResult(errors);
}
