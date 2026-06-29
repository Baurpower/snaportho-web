import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function requireStudentWorkspaceUser(
  returnTo = "/student-workspace"
) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(returnTo)}`);
  }

  return { supabase, user };
}
