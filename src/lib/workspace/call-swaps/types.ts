export const SWAP_REQUEST_TYPES = ["coverage_only", "trade"] as const;
export const SWAP_REQUEST_STATUSES = [
  "pending_recipient",
  "declined",
  "accepted_pending_admin",
  "approved",
  "rejected",
  "cancelled",
  "expired",
] as const;
export const SWAP_DECISIONS = ["accept", "decline"] as const;
export const ADMIN_SWAP_DECISIONS = ["approve", "reject"] as const;

export type SwapRequestType = (typeof SWAP_REQUEST_TYPES)[number];
export type SwapRequestStatus = (typeof SWAP_REQUEST_STATUSES)[number];
export type SwapDecision = (typeof SWAP_DECISIONS)[number];
export type AdminSwapDecision = (typeof ADMIN_SWAP_DECISIONS)[number];

export type ShiftSwapRequest = {
  id: string;
  program_id: string;
  requester_roster_id: string;
  recipient_roster_id: string;
  requester_call_id: string;
  recipient_call_id: string | null;
  request_type: SwapRequestType;
  status: SwapRequestStatus;
  requester_note: string | null;
  recipient_note: string | null;
  admin_note: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SwapRosterSummary = {
  id: string;
  fullName: string;
  role: string | null;
  gradYear: number | null;
  programMembershipId: string | null;
  claimedByUserId: string | null;
  isAdmin: boolean;
};

export type ShiftSwapAuditLog = {
  id: string;
  request_id: string;
  program_id: string;
  actor_roster_id: string | null;
  action: string;
  previous_status: SwapRequestStatus | null;
  new_status: SwapRequestStatus | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: SwapRosterSummary | null;
};

export type SwapCallSummary = {
  id: string;
  programId: string;
  rosterId: string | null;
  programMembershipId: string | null;
  callType: string | null;
  callDate: string | null;
  startDatetime: string | null;
  endDatetime: string | null;
  site: string | null;
  isHomeCall: boolean | null;
  notes: string | null;
};

export type SwapRequestListItem = ShiftSwapRequest & {
  requester: SwapRosterSummary | null;
  recipient: SwapRosterSummary | null;
  requesterCall: SwapCallSummary | null;
  recipientCall: SwapCallSummary | null;
};

export type CreateSwapRequestInput = {
  programId: string;
  requesterRosterId: string;
  recipientRosterId: string;
  requesterCallId: string;
  recipientCallId?: string | null;
  requestType?: SwapRequestType;
  requesterNote?: string | null;
  expiresAt?: string | null;
};

export type RespondToSwapRequestInput = {
  requestId: string;
  decision: SwapDecision;
  recipientNote?: string | null;
};

export type AdminSwapDecisionInput = {
  requestId: string;
  decision: AdminSwapDecision;
  adminNote?: string | null;
};

export type CancelSwapRequestInput = {
  requestId: string;
  cancelReason?: string | null;
};

export type SwapRequestQueryFilters = {
  statuses?: SwapRequestStatus[] | null;
  requestType?: SwapRequestType | null;
  includeExpired?: boolean;
  limit?: number;
};

export type SwapPermissionContext = {
  userId?: string | null;
  programId?: string | null;
  membershipId?: string | null;
  membershipRole?: string | null;
  rosterId?: string | null;
  rosterRole?: string | null;
  isRosterAdmin?: boolean | null;
};

export type SwapRuleResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type SwapRequestActorSnapshot = {
  requesterRosterId: string;
  recipientRosterId: string;
  requesterCallId: string;
  status: SwapRequestStatus;
  requestType: SwapRequestType;
};

export type SwapRosterEligibility = {
  rosterId: string;
  programId: string | null;
  gradYear: number | null;
  role: string | null;
  isActive?: boolean | null;
};

export type SwapCallOwnershipSnapshot = {
  callId: string;
  rosterId: string | null;
  programId: string | null;
  callDate: string | null;
  startDatetime: string | null;
  endDatetime: string | null;
};
