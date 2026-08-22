import { createClient } from "@/utils/supabase/server";
import { requireWorkspacePermission } from "@/lib/workspace/access-control";

export async function requireProgramCalendarAdmin(
  permission:
    | "canManageProgramCalendarSource"
    | "canReviewProgramCalendarImports" = "canManageProgramCalendarSource",
) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const access = await requireWorkspacePermission({
    userId: user.id,
    permission,
  });
  return { user, access };
}
