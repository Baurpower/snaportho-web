import { NextRequest, NextResponse } from "next/server";
import {
  deleteStudentWorkspaceChecklistItem,
  updateStudentWorkspaceChecklistItem,
} from "@/lib/student-workspace/checklists";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";
import { requireStudentWorkspaceEligibleApiUser } from "@/lib/student-workspace/request-user";
import type { StudentWorkspaceChecklistItemUpdate } from "@/lib/student-workspace/types";

type RouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const bodyResult = await parseStudentWorkspaceJsonBody<StudentWorkspaceChecklistItemUpdate>(
      request
    );
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    const { itemId } = await context.params;
    const item = await updateStudentWorkspaceChecklistItem(
      auth.user.id,
      itemId,
      body
    );
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message === "Checklist item not found." ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Failed to update checklist item" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const { itemId } = await context.params;
    await deleteStudentWorkspaceChecklistItem(auth.user.id, itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message === "Checklist item not found." ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Failed to delete checklist item" },
      { status: 500 }
    );
  }
}
