import type { ShiftSwapAuditLog } from "./types";

export function getSwapAuditTitle(entry: ShiftSwapAuditLog) {
  switch (entry.action) {
    case "created":
      return "Requested";
    case "recipient_accepted":
      return "Accepted";
    case "recipient_declined":
      return "Declined";
    case "admin_approved":
      return "Approved";
    case "admin_rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    default:
      return entry.action
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

export function getSwapAuditSubtitle(entry: ShiftSwapAuditLog) {
  switch (entry.action) {
    case "created":
      return "Coverage request sent to recipient.";
    case "recipient_accepted":
      return "This request is now waiting for admin approval.";
    case "recipient_declined":
      return "No schedule change will occur.";
    case "admin_approved":
      return "The official call schedule was reassigned.";
    case "admin_rejected":
      return "The official call schedule was not changed.";
    case "cancelled":
      return "The request was withdrawn before completion.";
    case "expired":
      return "The request timed out before a final decision.";
    default:
      return null;
  }
}

export function getSwapAuditNote(entry: ShiftSwapAuditLog) {
  const metadata = entry.metadata ?? null;
  if (!metadata) return null;

  const possibleNotes = [
    metadata.requesterNote,
    metadata.recipientNote,
    metadata.adminNote,
    metadata.cancelReason,
  ];

  for (const value of possibleNotes) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}
