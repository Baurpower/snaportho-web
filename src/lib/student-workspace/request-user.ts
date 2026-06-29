import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getStudentWorkspaceProfileByUserId } from "@/lib/student-workspace/profile";
import { isStudentWorkspaceEligibleYear } from "@/lib/student-workspace/journey";

export async function requireStudentWorkspaceApiUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return {
      error: NextResponse.json({ error: error.message }, { status: 401 }),
    };
  }

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  return { user };
}

export async function requireStudentWorkspaceEligibleApiUser() {
  const auth = await requireStudentWorkspaceApiUser();
  if ("error" in auth) {
    return auth;
  }

  const profile = await getStudentWorkspaceProfileByUserId(auth.user.id);
  if (!isStudentWorkspaceEligibleYear(profile?.expected_graduation_year)) {
    return {
      error: NextResponse.json(
        { error: "Student Workspace is currently limited to early-access users." },
        { status: 403 }
      ),
    };
  }

  return auth;
}
