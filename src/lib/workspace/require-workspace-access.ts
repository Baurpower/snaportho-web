import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type RequireWorkspaceAccessOptions = {
  updateLastEnteredAt?: boolean;
};

export async function requireWorkspaceAccess(
  options: RequireWorkspaceAccessOptions = {}
) {
  const { updateLastEnteredAt = false } = options;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/work/welcome");
  }

  const { data: state, error } = await supabase
    .from("workspace_user_state")
    .select("user_id, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!state) {
    const now = new Date().toISOString();

    const { error: insertError } = await supabase
      .from("workspace_user_state")
      .insert({
        user_id: user.id,
        onboarding_completed: false,
        first_entered_at: now,
        last_entered_at: now,
      });

    if (insertError) {
      throw new Error(insertError.message);
    }

    redirect("/work/onboarding");
  }

  if (!state.onboarding_completed) {
    redirect("/work/onboarding");
  }

  if (updateLastEnteredAt) {
    const { error: updateError } = await supabase
      .from("workspace_user_state")
      .update({
        last_entered_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return { supabase, user, state };
}