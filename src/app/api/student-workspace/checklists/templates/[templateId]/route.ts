import { NextRequest, NextResponse } from "next/server";
import {
  deleteStudentWorkspaceChecklistTemplate,
  updateStudentWorkspaceChecklistTemplate,
} from "@/lib/student-workspace/checklists";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";
import { requireStudentWorkspaceEligibleApiUser } from "@/lib/student-workspace/request-user";
import type { StudentWorkspaceChecklistTemplateUpdate } from "@/lib/student-workspace/types";

type RouteContext = {
  params: Promise<{
    templateId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const bodyResult = await parseStudentWorkspaceJsonBody<StudentWorkspaceChecklistTemplateUpdate>(
      request
    );
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    const { templateId } = await context.params;
    const template = await updateStudentWorkspaceChecklistTemplate(
      auth.user.id,
      templateId,
      body
    );
    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof Error) {
      const status =
        error.message === "Checklist template not found." ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Failed to update checklist template" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const { templateId } = await context.params;
    await deleteStudentWorkspaceChecklistTemplate(auth.user.id, templateId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      const status =
        error.message === "Checklist template not found." ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Failed to delete checklist template" },
      { status: 500 }
    );
  }
}
