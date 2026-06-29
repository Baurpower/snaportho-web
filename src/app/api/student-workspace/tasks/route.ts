import { NextRequest, NextResponse } from "next/server";
import {
  createStudentWorkspaceTask,
  getStudentWorkspaceTasks,
} from "@/lib/student-workspace/tasks";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";
import { requireStudentWorkspaceEligibleApiUser } from "@/lib/student-workspace/request-user";
import type { StudentWorkspaceTaskInsert } from "@/lib/student-workspace/types";

export async function GET() {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const tasks = await getStudentWorkspaceTasks(auth.user.id);
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load tasks",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const bodyResult = await parseStudentWorkspaceJsonBody<
      Partial<Omit<StudentWorkspaceTaskInsert, "user_id">>
    >(request);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    const task = await createStudentWorkspaceTask(auth.user.id, body);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
