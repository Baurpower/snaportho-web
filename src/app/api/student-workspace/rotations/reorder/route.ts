import { NextRequest, NextResponse } from "next/server";
import { reorderStudentWorkspaceRotations } from "@/lib/student-workspace/rotations";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";
import { requireStudentWorkspaceEligibleApiUser } from "@/lib/student-workspace/request-user";

type ReorderBody = {
  rotation_ids?: string[];
};

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) {
      return auth.error;
    }

    const bodyResult = await parseStudentWorkspaceJsonBody<ReorderBody>(request);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    if (!Array.isArray(body.rotation_ids)) {
      return NextResponse.json(
        { error: "rotation_ids must be an array of rotation ids." },
        { status: 400 }
      );
    }

    const rotations = await reorderStudentWorkspaceRotations(
      auth.user.id,
      body.rotation_ids
    );

    return NextResponse.json({ rotations });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to reorder rotations" },
      { status: 500 }
    );
  }
}
