import { NextRequest, NextResponse } from "next/server";
import {
  deleteStudentWorkspaceTask,
  updateStudentWorkspaceTask,
} from "@/lib/student-workspace/tasks";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";
import { requireStudentWorkspaceEligibleApiUser } from "@/lib/student-workspace/request-user";
import type { StudentWorkspaceTaskUpdate } from "@/lib/student-workspace/types";

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const bodyResult = await parseStudentWorkspaceJsonBody<StudentWorkspaceTaskUpdate>(
      request
    );
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    const { taskId } = await context.params;
    const task = await updateStudentWorkspaceTask(auth.user.id, taskId, body);
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message === "Task not found." ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const { taskId } = await context.params;
    await deleteStudentWorkspaceTask(auth.user.id, taskId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message === "Task not found." ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
