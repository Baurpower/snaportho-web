import { NextRequest, NextResponse } from "next/server";
import {
  deleteStudentWorkspaceScheduleEntry,
  updateStudentWorkspaceScheduleEntry,
} from "@/lib/student-workspace/schedule";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";
import { requireStudentWorkspaceEligibleApiUser } from "@/lib/student-workspace/request-user";
import type { StudentWorkspaceScheduleEntryUpdate } from "@/lib/student-workspace/types";

type RouteContext = {
  params: Promise<{
    entryId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const bodyResult = await parseStudentWorkspaceJsonBody<StudentWorkspaceScheduleEntryUpdate>(
      request
    );
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    const { entryId } = await context.params;
    const entry = await updateStudentWorkspaceScheduleEntry(
      auth.user.id,
      entryId,
      body
    );
    return NextResponse.json({ entry });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message === "Schedule entry not found." ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Failed to update schedule entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const { entryId } = await context.params;
    await deleteStudentWorkspaceScheduleEntry(auth.user.id, entryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message === "Schedule entry not found." ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Failed to delete schedule entry" },
      { status: 500 }
    );
  }
}
