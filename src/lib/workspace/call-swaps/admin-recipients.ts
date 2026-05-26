import { createAdminClient } from "@/lib/supabase/admin";
import { canApproveSwapRequest } from "./permissions";

type ProgramRosterApproverRow = {
  id: string;
  role: string | null;
  isAdmin: boolean | null;
  claimed_by_user_id: string | null;
  program_membership_id: string | null;
};

type ProgramMembershipRoleRow = {
  id: string;
  role: string | null;
};

export type SwapAdminRecipient = {
  rosterId: string;
  userId: string;
};

export async function getSwapAdminRecipientsForProgram(programId: string) {
  const supabase = createAdminClient();

  const [{ data: rosterRows, error: rosterError }, { data: membershipRows, error: membershipError }] =
    await Promise.all([
      supabase
        .from("program_roster")
        .select("id, role, isAdmin, claimed_by_user_id, program_membership_id")
        .eq("program_id", programId)
        .not("claimed_by_user_id", "is", null),
      supabase
        .from("program_memberships")
        .select("id, role")
        .eq("program_id", programId)
        .eq("is_active", true),
    ]);

  if (rosterError) {
    throw new Error(`Failed to load swap admin roster recipients: ${rosterError.message}`);
  }

  if (membershipError) {
    throw new Error(`Failed to load swap admin membership recipients: ${membershipError.message}`);
  }

  const membershipRoleById = new Map(
    ((membershipRows ?? []) as ProgramMembershipRoleRow[]).map((row) => [row.id, row.role])
  );

  const recipients = new Map<string, SwapAdminRecipient>();

  for (const roster of (rosterRows ?? []) as ProgramRosterApproverRow[]) {
    const userId = roster.claimed_by_user_id;
    if (!userId) continue;

    const canApprove = canApproveSwapRequest({
      programId,
      rosterId: roster.id,
      rosterRole: roster.role,
      membershipRole: roster.program_membership_id
        ? membershipRoleById.get(roster.program_membership_id) ?? null
        : null,
      isRosterAdmin: roster.isAdmin ?? false,
    }).canApprove;

    if (!canApprove || recipients.has(userId)) continue;

    recipients.set(userId, {
      rosterId: roster.id,
      userId,
    });
  }

  return Array.from(recipients.values());
}
