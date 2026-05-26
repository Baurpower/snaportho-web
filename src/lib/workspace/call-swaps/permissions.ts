import { normalizeProgramRole } from "@/lib/workspace/pgy";
import type {
  ShiftSwapRequest,
  SwapPermissionContext,
} from "./types";

export const SHIFT_SWAP_ADMIN_ROLES = new Set([
  "admin",
  "program_admin",
  "coordinator",
  "chief",
  "chief_resident",
  "faculty",
  "faculty_lead",
]);

export function canApproveSwapRequest(context: SwapPermissionContext) {
  const rosterRole = normalizeProgramRole(context.rosterRole);
  const membershipRole = normalizeProgramRole(context.membershipRole);
  const effectiveRole = rosterRole ?? membershipRole ?? null;
  const canApprove = Boolean(context.isRosterAdmin);

  return {
    rosterRole,
    membershipRole,
    effectiveRole,
    canApprove,
  };
}

export function canCreateSwapRequest(
  context: SwapPermissionContext,
  params: {
    requesterRosterId: string;
    programId: string;
  }
) {
  return Boolean(
    context.programId &&
      context.programId === params.programId &&
      context.rosterId &&
      context.rosterId === params.requesterRosterId
  );
}

export function canRespondToSwapRequest(
  context: SwapPermissionContext,
  request: ShiftSwapRequest
) {
  return (
    context.programId === request.program_id &&
    context.rosterId === request.recipient_roster_id &&
    request.status === "pending_recipient"
  );
}

export function canCancelSwapRequest(
  context: SwapPermissionContext,
  request: ShiftSwapRequest
) {
  if (context.programId !== request.program_id) return false;

  const isRequester = context.rosterId === request.requester_roster_id;
  const isApprover = canApproveSwapRequest(context).canApprove;

  if (!isRequester && !isApprover) return false;

  return (
    request.status === "pending_recipient" ||
    request.status === "accepted_pending_admin"
  );
}

export function canViewSwapRequest(
  context: SwapPermissionContext,
  request: ShiftSwapRequest
) {
  if (context.programId !== request.program_id) return false;

  if (
    context.rosterId === request.requester_roster_id ||
    context.rosterId === request.recipient_roster_id
  ) {
    return true;
  }

  return canApproveSwapRequest(context).canApprove;
}
