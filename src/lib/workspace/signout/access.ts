import type { User } from "@supabase/supabase-js";

import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { WorkspacePermissionError } from "@/lib/workspace/access-control";

/**
 * Sign-out access model (decided): ANY active member of a program may create and
 * edit that program's sign-out lists. There is no per-role gate in Phase 1.
 *
 * These helpers resolve the caller's active program and assert membership in a
 * specific program before the repository (which runs on the service-role admin
 * client and bypasses RLS) touches any row.
 */

/** The authenticated user, or a 401 if the request is unauthenticated. */
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new WorkspacePermissionError("Not authenticated", 401);
  }
  return user;
}

/** The caller's active program id, or a 403 if they have no active membership. */
export async function requireActiveProgramId(userId: string): Promise<string> {
  const membership = await getActiveMembershipForUser(userId);
  if (!membership?.program_id) {
    throw new WorkspacePermissionError(
      "You need an active program membership to use sign-out.",
      403
    );
  }
  return membership.program_id;
}

/** Assert the caller is an active member of `programId`; 403 otherwise. */
export async function requireProgramMembership(
  userId: string,
  programId: string
): Promise<void> {
  const activeProgramId = await requireActiveProgramId(userId);
  if (activeProgramId !== programId) {
    throw new WorkspacePermissionError(
      "You do not have access to this program's sign-out list.",
      403
    );
  }
}
