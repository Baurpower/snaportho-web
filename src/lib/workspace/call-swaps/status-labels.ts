import type { SwapRequestStatus, SwapRequestType } from "./types";

export const SWAP_REQUEST_STATUS_LABELS: Record<SwapRequestStatus, string> = {
  pending_recipient: "Pending recipient",
  declined: "Declined",
  accepted_pending_admin: "Accepted, pending admin",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const SWAP_REQUEST_TYPE_LABELS: Record<SwapRequestType, string> = {
  coverage_only: "Coverage only",
  trade: "Trade",
};

export function getSwapRequestStatusLabel(status: SwapRequestStatus) {
  return SWAP_REQUEST_STATUS_LABELS[status] ?? status;
}

export function getSwapRequestTypeLabel(type: SwapRequestType) {
  return SWAP_REQUEST_TYPE_LABELS[type] ?? type;
}
