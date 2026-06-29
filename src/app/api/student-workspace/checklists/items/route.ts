import { NextRequest, NextResponse } from "next/server";
import { createStudentWorkspaceChecklistItem } from "@/lib/student-workspace/checklists";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";
import { requireStudentWorkspaceEligibleApiUser } from "@/lib/student-workspace/request-user";
import type { StudentWorkspaceChecklistItemInsert } from "@/lib/student-workspace/types";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const bodyResult = await parseStudentWorkspaceJsonBody<
      Partial<Omit<StudentWorkspaceChecklistItemInsert, "user_id">>
    >(request);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    const item = await createStudentWorkspaceChecklistItem(auth.user.id, body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create checklist item" },
      { status: 500 }
    );
  }
}
