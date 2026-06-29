import { NextRequest, NextResponse } from "next/server";
import {
  createStudentWorkspaceChecklistTemplate,
  getStudentWorkspaceChecklistItems,
  getStudentWorkspaceChecklistTemplates,
} from "@/lib/student-workspace/checklists";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";
import { requireStudentWorkspaceEligibleApiUser } from "@/lib/student-workspace/request-user";
import type { StudentWorkspaceChecklistTemplateInsert } from "@/lib/student-workspace/types";

export async function GET() {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const [templates, items] = await Promise.all([
      getStudentWorkspaceChecklistTemplates(auth.user.id),
      getStudentWorkspaceChecklistItems(auth.user.id),
    ]);

    return NextResponse.json({ templates, items });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load checklist templates",
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
      Partial<Omit<StudentWorkspaceChecklistTemplateInsert, "user_id">>
    >(request);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    const template = await createStudentWorkspaceChecklistTemplate(
      auth.user.id,
      body
    );
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create checklist template" },
      { status: 500 }
    );
  }
}
