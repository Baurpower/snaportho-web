import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RequireWorkspaceAccessOptions = {
  updateLastEnteredAt?: boolean;
};

export async function requireWorkspaceAccess(
  options: RequireWorkspaceAccessOptions = {}
) {
  const { updateLastEnteredAt = false } = options;

  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/work/welcome");
  }

  const { data: membership, error: membershipError } = await adminSupabase
    .from("program_memberships")
    .select("id, program_id, user_id, role, grad_year, display_name, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    redirect("/work/onboarding");
  }

  const { data: roster, error: rosterError } = await adminSupabase
    .from("program_roster")
    .select(
      "id, program_id, program_membership_id, claimed_by_user_id, claimed_at, full_name, role, grad_year"
    )
    .eq("program_membership_id", membership.id)
    .eq("program_id", membership.program_id)
    .eq("claimed_by_user_id", user.id)
    .maybeSingle();

  if (rosterError) {
    throw new Error(rosterError.message);
  }

  if (!roster) {
    redirect("/work/onboarding");
  }

  const now = new Date().toISOString();

  const { data: existingState, error: stateLookupError } = await adminSupabase
    .from("workspace_user_state")
    .select("user_id, first_entered_at, last_entered_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (stateLookupError) {
    throw new Error(stateLookupError.message);
  }

  const { error: stateUpsertError } = await adminSupabase
    .from("workspace_user_state")
    .upsert(
      {
        user_id: user.id,
        onboarding_completed: true,
        first_entered_at: existingState?.first_entered_at ?? now,
        last_entered_at: updateLastEnteredAt
          ? now
          : existingState?.last_entered_at ?? now,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

  if (stateUpsertError) {
    throw new Error(stateUpsertError.message);
  }

  return {
    supabase,
    user,
    state: {
      user_id: user.id,
      onboarding_completed: true,
    },
    membership,
    roster,
  };
}